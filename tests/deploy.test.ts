import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGS, PAGES } from '../src/seo/config';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

const DEPLOY_WORKFLOW = read('../.github/workflows/deploy.yml');
const HTACCESS = read('../public/.htaccess');
const DEPLOY_SCRIPT = read('../scripts/deploy.mjs');
const PKG = JSON.parse(read('../package.json')) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

/**
 * The five secrets configured on the repository. A name that does not match
 * one of these resolves to an empty string in Actions, which surfaces much
 * later as a confusing connection error rather than as a missing secret.
 */
const SECRETS = [
  'SITEGROUND_FTP_HOST',
  'SITEGROUND_FTP_PASSWORD',
  'SITEGROUND_FTP_PORT',
  'SITEGROUND_FTP_USER',
  'SITEGROUND_REMOTE_DIR',
] as const;

describe('deploy workflow', () => {
  it('reads exactly the secrets the repository defines', () => {
    const used = [...DEPLOY_WORKFLOW.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]);
    expect(new Set(used)).toEqual(new Set(SECRETS));
  });

  it('passes every secret to the deploy step and nowhere else', () => {
    // A secret interpolated into a `run:` line ends up in the command, and a
    // failing command echoes its arguments. They belong in `env:` only.
    for (const line of DEPLOY_WORKFLOW.split('\n')) {
      if (!/secrets\./.test(line)) continue;
      expect(line, `secret used outside an env: mapping — ${line.trim()}`).toMatch(
        /^\s+[A-Z0-9_]+:\s*\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}\s*$/,
      );
    }
  });

  it('waits for CI rather than deploying straight off the push', () => {
    // Deploying on `push` would publish a red build at full speed.
    expect(DEPLOY_WORKFLOW).toMatch(/workflow_run:/);
    expect(DEPLOY_WORKFLOW).toMatch(/workflows: \['CI'\]/);
    expect(DEPLOY_WORKFLOW).toContain("workflow_run.conclusion == 'success'");
    expect(DEPLOY_WORKFLOW).toContain("workflow_run.head_branch == 'main'");
    expect(DEPLOY_WORKFLOW).not.toMatch(/^on:\s*\n\s*push:/m);
  });

  it('deploys the commit CI tested, not the current tip of main', () => {
    expect(DEPLOY_WORKFLOW).toContain('github.event.workflow_run.head_sha');
  });

  it('never cancels a deploy that is already uploading', () => {
    // Killing a half-finished upload leaves new assets beside old HTML.
    const block = /concurrency:\s*\n\s*group: deploy-production\s*\n\s*cancel-in-progress: false/;
    expect(DEPLOY_WORKFLOW).toMatch(block);
  });

  it('refuses to deploy without SITE_URL', () => {
    // The origin is baked into every canonical, hreflang, the sitemap and
    // llms.txt. Unset, it falls back to the GitHub Pages address, so the live
    // site would declare itself a copy of somewhere else.
    expect(DEPLOY_WORKFLOW).toMatch(/if: vars\.SITE_URL == ''/);
    expect(DEPLOY_WORKFLOW).toMatch(/exit 1/);
  });

  it('sets SITE_URL on the build step only, not job-wide', () => {
    // src/seo/config.ts reads SITE_URL at import time, so a job-level value
    // would also reach vitest and move the ground under tests/seo.test.ts.
    const jobEnv = /^jobs:[\s\S]*?^\s{4}env:/m.test(DEPLOY_WORKFLOW);
    expect(jobEnv, 'SITE_URL must not be set at job level').toBe(false);
    expect(DEPLOY_WORKFLOW).toMatch(/Build for production[\s\S]{0,200}SITE_URL:/);
  });

  it('checks every generated page before uploading anything', () => {
    // The drift this catches: adding a page to PAGES without adding it to the
    // workflow's pre-flight list, so a missing page ships unnoticed.
    for (const page of PAGES) {
      for (const lang of LANGS) {
        const expected = `dist${page[lang].path}index.html`;
        expect(DEPLOY_WORKFLOW, `${page.id}/${lang} not verified before deploy`).toContain(
          expected,
        );
      }
    }
    for (const f of ['dist/sitemap.xml', 'dist/robots.txt', 'dist/llms.txt', 'dist/.htaccess']) {
      expect(DEPLOY_WORKFLOW).toContain(f);
    }
  });

  it('confirms the live site is serving the build it just uploaded', () => {
    expect(DEPLOY_WORKFLOW).toMatch(/Check the live site/);
    expect(DEPLOY_WORKFLOW).toMatch(/curl/);
  });
});

describe('deploy script', () => {
  it('is wired into package.json with a dry run alongside it', () => {
    expect(PKG.scripts.deploy).toBe('node scripts/deploy.mjs');
    expect(PKG.scripts['deploy:dry']).toContain('DRY_RUN=1');
    expect(PKG.devDependencies['basic-ftp']).toBeDefined();
  });

  it('is the only thing the workflow uses to upload', () => {
    // No third-party action gets the FTP password: an action is a dependency
    // on whoever can move its tag.
    expect(DEPLOY_WORKFLOW).toContain('npm run deploy');
    const actions = [...DEPLOY_WORKFLOW.matchAll(/uses:\s*([^\s@]+)@/g)].map((m) => m[1]);
    expect(actions.sort()).toEqual(['actions/checkout', 'actions/setup-node']);
  });

  it('keeps FTP command logging off so PASS is never printed', () => {
    expect(DEPLOY_SCRIPT).toMatch(/client\.ftp\.verbose = false/);
  });

  it('excludes its own manifest from the files it uploads', () => {
    // Including it would make every deploy see a changed file and re-upload
    // the manifest describing the manifest.
    expect(DEPLOY_SCRIPT).toMatch(/if \(rel === MANIFEST\) continue/);
  });

  it('tolerates a remote file that is already gone', () => {
    // Deletes have to be idempotent: a run interrupted between deleting and
    // writing the manifest will try the same delete again.
    expect(DEPLOY_SCRIPT).toMatch(/client\.remove\(.*,\s*true\)/);
  });

  it('normalises paths to posix so Windows and Linux agree', () => {
    // The manifest keys are compared against remote paths. A deploy from a
    // Windows checkout must not produce `assets\index.js`.
    expect(DEPLOY_SCRIPT).toMatch(/\.split\(sep\)\.join\('\/'\)/);
  });
});

describe('server configuration', () => {
  it('ships with the build', () => {
    // Vite copies public/ verbatim, dotfiles included — verified, because the
    // whole deploy depends on it and nothing else would notice its absence.
    expect(existsSync(new URL('../public/.htaccess', import.meta.url))).toBe(true);
  });

  it('declares UTF-8 for the files that carry no charset of their own', () => {
    // llms-full.txt is 373 kB of Turkish. Served as Latin-1 it is mojibake,
    // and unlike the HTML it has no <meta charset> to fall back on.
    expect(HTACCESS).toMatch(/AddDefaultCharset utf-8/);
    expect(HTACCESS).toMatch(/AddCharset utf-8[^\n]*\.txt/);
  });

  it('has no SPA catch-all, which would bury the crawlable pages', () => {
    // A rewrite of everything to /index.html serves the empty app shell in
    // place of /en/theory/ — undoing the entire reason those pages exist.
    expect(HTACCESS).not.toMatch(/RewriteRule\s+.*\bindex\.html\b/);
  });

  it('lets a deploy be seen immediately but caches hashed assets hard', () => {
    expect(HTACCESS).toMatch(/\\\.\(js\|css\)\$[\s\S]{0,120}immutable/);
    expect(HTACCESS).toMatch(/\\\.html\$[\s\S]{0,120}must-revalidate/);
  });

  it('keeps the deploy manifest off the public site', () => {
    expect(HTACCESS).toMatch(/<Files "\.deploy-manifest\.json">[\s\S]*?Require all denied/);
  });
});
