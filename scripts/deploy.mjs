/**
 * Deploy dist/ to SiteGround over FTPS.
 *
 * One script, used by both `npm run deploy` and the GitHub Actions workflow,
 * so a deploy from a laptop and a deploy from CI do exactly the same thing.
 * That is also why there is no third-party deploy action in the workflow:
 * an action with the FTP password in its environment is a supply-chain
 * dependency on whoever can push a tag to it.
 *
 * Incremental by content hash. A manifest of sha256 digests lives on the
 * server next to the site; each run uploads only what changed, deletes what
 * the build dropped, and leaves everything it does not know about alone. That
 * last property matters: the remote directory may hold files this project did
 * not put there, and a deploy must never be the reason they disappear.
 *
 * Env (the five names match the repository secrets):
 *   SITEGROUND_FTP_HOST       hostname or IP
 *   SITEGROUND_FTP_USER       FTP account user
 *   SITEGROUND_FTP_PASSWORD   FTP account password
 *   SITEGROUND_FTP_PORT       21 for FTPS explicit (SiteGround's default)
 *   SITEGROUND_REMOTE_DIR     e.g. /public_html
 *
 * Optional:
 *   FTP_PROTOCOL=ftps|ftp     default ftps
 *   FTP_TLS_INSECURE=1        encrypt but do not verify the certificate
 *   DEPLOY_SOURCEMAPS=1       also upload *.map (off: ~5 MB smaller)
 *   DEPLOY_DIR=dist           what to upload
 *   DEPLOY_FORCE=1            ignore the remote manifest and upload everything
 *   DRY_RUN=1                 connect, compare, report, change nothing
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { Client } from 'basic-ftp';

const MANIFEST = '.deploy-manifest.json';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`\nMissing ${name}.`);
    console.error(
      'In CI these come from repository secrets; locally, export them or use a .env you do not commit.\n',
    );
    process.exit(1);
  }
  return v;
};

const flag = (name) => /^(1|true|yes)$/i.test(process.env[name] ?? '');

const config = {
  host: need('SITEGROUND_FTP_HOST'),
  user: need('SITEGROUND_FTP_USER'),
  password: need('SITEGROUND_FTP_PASSWORD'),
  port: Number(need('SITEGROUND_FTP_PORT')),
  remoteDir: need('SITEGROUND_REMOTE_DIR').replace(/\/+$/, '') || '/',
  protocol: (process.env.FTP_PROTOCOL ?? 'ftps').toLowerCase(),
  localDir: process.env.DEPLOY_DIR ?? 'dist',
  sourcemaps: flag('DEPLOY_SOURCEMAPS'),
  insecureTls: flag('FTP_TLS_INSECURE'),
  force: flag('DEPLOY_FORCE'),
  dryRun: flag('DRY_RUN'),
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  console.error(`SITEGROUND_FTP_PORT is not a port number: ${process.env.SITEGROUND_FTP_PORT}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Local inventory                                                     */
/* ------------------------------------------------------------------ */

const walk = (dir, acc = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile()) acc.push(full);
  }
  return acc;
};

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Build the manifest of what should be on the server after this deploy. */
function inventory() {
  if (!existsSync(config.localDir)) {
    console.error(`\n${config.localDir}/ does not exist. Run \`npm run build\` first.\n`);
    process.exit(1);
  }

  const files = new Map();
  for (const abs of walk(config.localDir)) {
    // Posix separators: the manifest is compared against a remote path, and a
    // deploy from Windows must produce the same keys as one from Linux.
    const rel = relative(config.localDir, abs).split(sep).join('/');
    if (rel === MANIFEST) continue;
    if (!config.sourcemaps && rel.endsWith('.map')) continue;
    files.set(rel, { hash: sha256(abs), size: statSync(abs).size, abs });
  }
  return files;
}

/* ------------------------------------------------------------------ */
/* Remote manifest                                                     */
/* ------------------------------------------------------------------ */

async function readRemoteManifest(client) {
  const chunks = [];
  const sink = new (await import('node:stream')).Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk);
      cb();
    },
  });
  try {
    await client.downloadTo(sink, posix.join(config.remoteDir, MANIFEST));
  } catch {
    // No manifest: either the first deploy, or someone removed it. Treated as
    // "nothing known to be there", which uploads everything and deletes
    // nothing — the safe direction to be wrong in.
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return parsed && typeof parsed.files === 'object' ? parsed.files : null;
  } catch {
    console.warn('  remote manifest is not readable JSON — treating this as a full upload');
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Deploy                                                              */
/* ------------------------------------------------------------------ */

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

async function main() {
  const local = inventory();
  const totalBytes = [...local.values()].reduce((s, f) => s + f.size, 0);

  console.log(`\nKREAMET deploy`);
  console.log(`  source     ${config.localDir}/ — ${local.size} files, ${kb(totalBytes)}`);
  console.log(`  target     ${config.protocol}://${config.host}:${config.port}${config.remoteDir}`);
  console.log(`  user       ${config.user}`);
  if (!config.sourcemaps) console.log(`  sourcemaps excluded (DEPLOY_SOURCEMAPS=1 to include)`);
  if (config.dryRun) console.log(`  DRY RUN — nothing will be written`);

  const client = new Client(30_000);
  // Logs every FTP command. Harmless for the rest, but it would print the
  // argument of PASS, so it stays off.
  client.ftp.verbose = false;

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.protocol === 'ftps',
      secureOptions: config.insecureTls ? { rejectUnauthorized: false } : undefined,
    });
    console.log(`\n  connected (${(await client.send('FEAT')).message ? 'FEAT ok' : 'FEAT n/a'})`);
  } catch (err) {
    console.error(`\n  connection failed: ${err.message}`);
    if (/certificate|self.signed|altname|CERT_/i.test(err.message)) {
      console.error(
        [
          '',
          '  This is a TLS certificate problem, not a password problem. Shared',
          '  hosting often presents a certificate that does not name the FTP',
          '  host you connect to. Two ways forward, in order of preference:',
          '',
          '    1. Point SITEGROUND_FTP_HOST at the hostname the certificate',
          '       actually covers (Site Tools shows it).',
          '    2. Set FTP_TLS_INSECURE=1. The transfer stays encrypted but the',
          '       server is no longer authenticated, so it is open to a',
          '       man-in-the-middle — and the password goes over that channel.',
          '',
          '  Do not reach for FTP_PROTOCOL=ftp: that sends the password in the',
          '  clear, which is strictly worse than either option above.',
          '',
        ].join('\n'),
      );
    }
    process.exit(1);
  }

  // The manifest records what this project last *intended* to be on the
  // server, which is not the same as what is there now: a file deleted by hand
  // over FTP still appears in it, and would then never be restored. DEPLOY_FORCE
  // is the way out of that, and the reason it is a flag rather than the default
  // is that the default deploy runs on every commit and should stay cheap.
  const remote = config.force ? null : await readRemoteManifest(client);
  if (config.force) console.log('  DEPLOY_FORCE — ignoring the remote manifest');
  else if (remote === null) console.log('  no remote manifest — first full upload');

  /* Work out the three sets. */
  const changed = [];
  const unchanged = [];
  for (const [rel, file] of local) {
    if (remote?.[rel] === file.hash) unchanged.push(rel);
    else changed.push(rel);
  }
  const removed = remote ? Object.keys(remote).filter((rel) => !local.has(rel)) : [];

  console.log(
    `\n  ${changed.length} to upload, ${unchanged.length} unchanged, ${removed.length} to remove`,
  );

  if (config.dryRun) {
    for (const rel of changed.slice(0, 40)) console.log(`    + ${rel}`);
    if (changed.length > 40) console.log(`    … ${changed.length - 40} more`);
    for (const rel of removed) console.log(`    - ${rel}`);
    client.close();
    console.log('\n  dry run complete — nothing was written\n');
    return;
  }

  if (!changed.length && !removed.length) {
    client.close();
    console.log('\n  already up to date\n');
    return;
  }

  /* Assets before HTML. An HTML file uploaded first would reference chunks
     that are not there yet, so a visitor mid-deploy would get a broken page
     rather than the previous one. */
  const isEntry = (rel) => rel.endsWith('.html') || rel === '.htaccess';
  changed.sort((a, b) => Number(isEntry(a)) - Number(isEntry(b)));

  /* Group by directory so each one is created and entered once. */
  const byDir = new Map();
  for (const rel of changed) {
    const dir = posix.dirname(rel);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(rel);
  }

  let uploaded = 0;
  let bytes = 0;
  for (const [dir, rels] of byDir) {
    const remotePath = dir === '.' ? config.remoteDir : posix.join(config.remoteDir, dir);
    await client.ensureDir(remotePath);
    for (const rel of rels) {
      const file = local.get(rel);
      await client.uploadFrom(file.abs, posix.basename(rel));
      uploaded += 1;
      bytes += file.size;
      console.log(`    + ${rel}  (${kb(file.size)})`);
    }
  }

  /* Deletes are best-effort and must stay idempotent: if a previous run died
     between deleting and writing the manifest, this run tries again and the
     file is already gone. 550 is "no such file", which is success here. */
  let deleted = 0;
  for (const rel of removed) {
    try {
      await client.remove(posix.join(config.remoteDir, rel), true);
      deleted += 1;
      console.log(`    - ${rel}`);
    } catch (err) {
      console.warn(`    ! could not remove ${rel}: ${err.message}`);
    }
  }

  /* The manifest is the commit point, so it goes last. Interrupt this deploy
     anywhere earlier and the server still describes the previous state, which
     makes the next run redo the missing work instead of skipping it. */
  const manifest = {
    generated: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    siteUrl: process.env.SITE_URL ?? null,
    files: Object.fromEntries([...local].map(([rel, f]) => [rel, f.hash])),
  };
  await client.ensureDir(config.remoteDir);
  await client.uploadFrom(
    (await import('node:stream')).Readable.from([JSON.stringify(manifest, null, 2)]),
    MANIFEST,
  );

  client.close();
  console.log(
    `\n  done — ${uploaded} uploaded (${kb(bytes)}), ${deleted} removed, ${unchanged.length} untouched\n`,
  );
}

main().catch((err) => {
  console.error(`\ndeploy failed: ${err.message}\n`);
  process.exit(1);
});
