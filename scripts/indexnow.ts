/**
 * Tell IndexNow that the site changed.
 *
 * IndexNow is a push protocol: instead of waiting to be crawled, the site
 * announces which URLs changed and the participating engines — Bing, Yandex,
 * Seznam, Naver — fetch them. One submission reaches all of them.
 *
 * Google does not participate. It retired its sitemap ping endpoint in 2023
 * and accepts submissions only through Search Console, which needs an account
 * and a verified property, so it cannot be automated from here.
 *
 * Ownership is proved by serving the key at `/<key>.txt`, which `seo.ts`
 * writes into the build from the same constant this script sends. The key is
 * public by design; there is nothing here to keep secret.
 *
 *   SITE_URL=https://example.com npx tsx scripts/indexnow.ts
 */

import { INDEXNOW_KEY, SITE_URL, allUrls, abs } from '../src/seo/config';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Documented IndexNow responses, and whether each is ours to fix. */
const MEANING: Record<number, { text: string; fatal: boolean }> = {
  200: { text: 'accepted', fatal: false },
  202: { text: 'accepted, key validation pending', fatal: false },
  400: { text: 'bad request — malformed submission', fatal: true },
  403: { text: `key not valid — is ${abs(`/${INDEXNOW_KEY}.txt`)} reachable?`, fatal: true },
  422: { text: 'URLs do not belong to the host, or the key does not match', fatal: true },
  429: { text: 'rate limited — too many submissions', fatal: false },
};

async function main(): Promise<void> {
  const host = new URL(SITE_URL).host;
  const urlList = [...allUrls().map((u) => u.url), abs('/'), abs('/llms.txt')];

  console.log(`IndexNow: ${urlList.length} URLs for ${host}`);
  for (const u of urlList) console.log(`  ${u}`);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: abs(`/${INDEXNOW_KEY}.txt`), urlList }),
    });
  } catch (err) {
    // The site is already deployed and serving; a submission that could not be
    // sent costs some crawl latency and nothing else, so it must not fail the
    // deploy. The engines will find the change from the sitemap regardless.
    console.warn(`\nIndexNow unreachable: ${(err as Error).message}`);
    console.warn('The deploy stands; the engines will pick the change up by crawling.');
    return;
  }

  const meaning = MEANING[res.status];
  const label = meaning?.text ?? 'unexpected status';
  console.log(`\n${res.status} — ${label}`);

  if (meaning?.fatal) {
    // These say the submission itself is misconfigured, which stays broken
    // until someone changes something. Worth failing on.
    console.error('\nThis is a configuration error, not a transient one.');
    process.exit(1);
  }

  if (!meaning && res.status >= 500) {
    console.warn('Server-side error at the endpoint; nothing to fix here.');
  }
}

main().catch((err) => {
  console.error(`indexnow failed: ${err.message}`);
  process.exit(1);
});
