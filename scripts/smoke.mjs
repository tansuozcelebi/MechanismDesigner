/**
 * Browser smoke test — drives the running dev server and checks that the app
 * actually works, not just that it compiles.
 *
 *   npm run dev            (in one shell)
 *   node scripts/smoke.mjs (in another)
 *
 * Checks: renders without errors, crank dragging maps the pointer to the motor
 * angle, screen<->world round-trips, playback advances, the angle slider is
 * bound to the same state, gravity affects the torque estimate, the debug
 * overlay populates, and nothing is clipped at the canvas edges.
 */
import { chromium } from 'playwright';

const URL = process.env.APP_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });

// Pin the UI language so the selectors below are stable regardless of the
// browser locale. The bilingual behaviour itself is checked at the end.
await page.addInitScript(() => window.localStorage.setItem('kreamet.lang', 'en'));

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`CONSOLE ${m.text()}`));

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const metric = (label) =>
  page.evaluate((l) => {
    const dt = [...document.querySelectorAll('.metrics dt')].find((d) => d.textContent.trim() === l);
    return dt ? dt.nextElementSibling.textContent.trim() : null;
  }, label);
const theta = async () => parseFloat(await metric('Motor angle'));
const toScreen = (wx, wy) =>
  page.evaluate(([x, y]) => {
    const s = window.__viewer.scene;
    const r = s.canvas.getBoundingClientRect();
    const c = s.camera;
    return [
      r.left + ((x - c.left) / (c.right - c.left)) * r.width,
      r.top + ((c.top - y) / (c.top - c.bottom)) * r.height,
    ];
  }, [wx, wy]);

check('renders with no page errors', errors.length === 0, errors.join('; '));
const badges = await page.locator('.badge').allTextContents();
check(
  'full rotation passes',
  badges.some((b) => b.trim() === 'FULL ROTATION PASS'),
  badges.filter((b) => /ROTATION|JUMPS|CLOSURE|PATH/.test(b)).join(' | '),
);
check(
  'no assembly jumps and path closed',
  badges.some((b) => b.trim() === 'JUMPS 0') && badges.some((b) => b.includes('PATH CLOSED')),
);

// Crank drag: pull the pin to straight above O2 -> motor angle must read 90 deg.
const O2 = await page.evaluate(() => [window.__viewer.geometry.O2.x, window.__viewer.geometry.O2.y]);
const pin = await page.evaluate(() => {
  const p = window.__viewer.currentPose;
  return [p.joints.A.x, p.joints.A.y];
});
const from = await toScreen(pin[0], pin[1]);
const to = await toScreen(O2[0], O2[1] + 120);
await page.mouse.move(from[0], from[1]);
await page.mouse.down();
await page.mouse.move(to[0], to[1], { steps: 25 });
await page.mouse.up();
await page.waitForTimeout(300);
const dragged = ((((await theta()) % 360) + 360) % 360);
check('crank drag sets the motor angle', Math.abs(dragged - 90) < 3, `${dragged.toFixed(2)}° (expect 90°)`);

const rt = await page.evaluate(() => {
  const s = window.__viewer.scene;
  const r = s.canvas.getBoundingClientRect();
  const c = s.camera;
  const wx = 137.5;
  const wy = -42.25;
  const sx = r.left + ((wx - c.left) / (c.right - c.left)) * r.width;
  const sy = r.top + ((c.top - wy) / (c.top - c.bottom)) * r.height;
  const w = s.toWorld(sx, sy);
  return Math.hypot(w.x - wx, w.y - wy);
});
check('screen <-> world round trip', rt < 1e-6, `${rt.toExponential(2)} mm`);

await page.click('button:has-text("▶")');
await page.waitForTimeout(1000);
const t1 = await theta();
await page.waitForTimeout(1500);
const t2 = await theta();
await page.click('button:has-text("⏸")');
check('playback advances the motor', t1 !== t2, `${t1}° -> ${t2}°`);

// Regression: publishing viewer state from inside the motor-angle effect made
// React treat every animation frame as a nested update.
const nested = errors.filter((e) => e.includes('Maximum update depth'));
check('sustained playback triggers no React update loop', nested.length === 0, `${nested.length} warning(s)`);

await page.locator('.timeline input[type=range]').fill('270');
await page.waitForTimeout(300);
check('angle slider shares the motor state', Math.abs((await theta()) - 270) < 0.6);

await page.getByText('Debug', { exact: true }).click();
await page.waitForTimeout(700);
const dbg = await page.evaluate(() => {
  let sprites = 0;
  let arrows = 0;
  window.__viewer.scene.scene.traverse((o) => {
    if (o.type === 'Sprite') sprites++;
    if (o.type === 'ArrowHelper') arrows++;
  });
  return { sprites, arrows };
});
check('debug overlay populates', dbg.sprites > 10 && dbg.arrows > 5, JSON.stringify(dbg));
await page.getByText('Debug', { exact: true }).click();

const tq = () => metric('Est. motor torque');
const gOn = await tq();
await page.getByText('Gravity ON').click();
await page.waitForTimeout(400);
const gOff = await tq();
check('gravity toggle changes motor torque', gOn !== gOff, `${gOn} -> ${gOff}`);
await page.getByText('Gravity ON').click();

await page.click('button:has-text("Fit View")');
await page.waitForTimeout(500);
const buf = await page.locator('canvas').screenshot();
const edge = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((r) => {
    img.onload = r;
    img.src = 'data:image/png;base64,' + b64;
  });
  const g = document.createElement('canvas');
  g.width = img.width;
  g.height = img.height;
  const c = g.getContext('2d');
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, g.width, g.height).data;
  const isC = (x, y) => {
    const i = (y * g.width + x) * 4;
    return d[i] > 90 || d[i + 1] > 90 || d[i + 2] > 95;
  };
  const e = { top: 0, bottom: 0, left: 0, right: 0 };
  for (let x = 0; x < g.width; x++) {
    if (isC(x, 0)) e.top++;
    if (isC(x, g.height - 1)) e.bottom++;
  }
  for (let y = 0; y < g.height; y++) {
    if (isC(0, y)) e.left++;
    if (isC(g.width - 1, y)) e.right++;
  }
  return e;
}, buf.toString('base64'));
const clipped = edge.top + edge.bottom + edge.left + edge.right;
check('fit view clips nothing', clipped === 0, JSON.stringify(edge));

// --- bilingual UI -------------------------------------------------------
const heading = await page.locator('.header h1').textContent();
check('app is named KREAMET', heading.trim() === 'KREAMET', heading.trim());

const enTitles = await page.locator('.section > header h2').allTextContents();
await page.click('.langswitch button:has-text("TR")');
await page.waitForTimeout(400);
const trTitles = await page.locator('.section > header h2').allTextContents();

check(
  'switching to Turkish retranslates the panels',
  trTitles.length === enTitles.length && trTitles.every((x, i) => x !== enTitles[i]),
  `${enTitles[0]} -> ${trTitles[0]}`,
);
check(
  'Turkish labels are present',
  trTitles.some((x) => /MOTOR VE F|GÖRÜNÜM|ÇEVR/i.test(x)),
  trTitles.slice(0, 3).join(' | '),
);
check(
  'document language attribute follows the choice',
  (await page.evaluate(() => document.documentElement.lang)) === 'tr',
);

// Persistence has to be checked in a context WITHOUT this script's language
// pin, otherwise the init script simply re-pins English on every navigation.
const fresh = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await fresh.addInitScript(() => window.localStorage.setItem('kreamet.lang', 'tr'));
await fresh.goto(URL, { waitUntil: 'networkidle' });
await fresh.waitForTimeout(2500);
const restored = (await fresh.locator('.langswitch button.active').textContent()).trim();
const restoredLang = await fresh.evaluate(() => document.documentElement.lang);
check(
  'a stored language choice is restored on load',
  restored === 'TR' && restoredLang === 'tr',
  `${restored} / lang=${restoredLang}`,
);
await fresh.close();

// Switch back to English and confirm it round-trips.
await page.click('.langswitch button:has-text("EN")');
await page.waitForTimeout(400);
const backTitles = await page.locator('.section > header h2').allTextContents();
check('switching back to English restores the original labels', backTitles[0] === enTitles[0]);

const late = errors.filter((e) => e.includes('Maximum update depth'));
check('no update loop after language switching', late.length === 0, `${late.length} warning(s)`);

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
