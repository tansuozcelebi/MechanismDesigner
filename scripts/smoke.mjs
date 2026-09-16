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
import { existsSync } from 'node:fs';

const URL = process.env.APP_URL ?? 'http://localhost:5173/';

/**
 * Browser resolution, in order: an explicit CHROMIUM path, the pre-installed
 * browser this dev image ships, then whatever Playwright installed itself.
 * Without the fallback this only runs on one machine, which is no use in CI.
 */
const PREINSTALLED = '/opt/pw-browsers/chromium';
const launchOptions =
  process.env.CHROMIUM
    ? { executablePath: process.env.CHROMIUM }
    : existsSync(PREINSTALLED)
      ? { executablePath: PREINSTALLED }
      : {};

/** CI runners are slower than a dev box; let the settle time be raised there. */
const SETTLE = Number(process.env.SMOKE_SETTLE ?? 3500);

const browser = await chromium.launch(launchOptions);
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
await page.waitForTimeout(SETTLE);

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
const O2 = await page.evaluate(() => {
  const g = window.__viewer.geometry.ground[0];
  return [g.x, g.y];
});
const pin = await page.evaluate(() => {
  const p = window.__viewer.currentPose;
  return [p.points.A.x, p.points.A.y];
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

// --- design-time features ----------------------------------------------

// 1. Variable link count. Every offered size must stay 1-DOF and must load a
//    mechanism that still sweeps a full revolution.
const linkCountOf = () =>
  page.evaluate(() => window.__viewer.geometry.spec.dyads.length * 2 + 2);
const before = await linkCountOf();
await page.locator('.section:has(h2:text-is("Mechanism")) .row.wrap button:has-text("10")').first().click();
await page.waitForTimeout(1200);
const after = await linkCountOf();
const mobilityBadge = await page.locator('.badge:has-text("Mobility")').first().textContent();
check(
  'link count can be increased',
  after === 10 && before !== after,
  `${before} -> ${after} bars`,
);
check('the larger mechanism is still 1-DOF', mobilityBadge.includes('= 1'), mobilityBadge.trim());
const framesAfterResize = await page.locator('.timeline .note').last().textContent();
check(
  'the larger mechanism completes a revolution',
  /720\s*\/\s*720/.test(framesAfterResize),
  framesAfterResize.trim(),
);

// Back to the shipped 8-bar for the remaining checks.
await page.locator('.section:has(h2:text-is("Mechanism")) .row.wrap button:has-text("8")').first().click();
await page.waitForTimeout(1200);
check('link count can be decreased again', (await linkCountOf()) === 8, `${await linkCountOf()} bars`);

// 2. Clicking a bar on the canvas selects it and the inspector describes it.
const barPoint = await page.evaluate(() => {
  const p = window.__viewer.currentPose;
  const m = window.__viewer.geometry.members.find((mm) => mm.linkId !== 'crank');
  const a = p.points[m.from];
  const b = p.points[m.to];
  return [(a.x + b.x) / 2, (a.y + b.y) / 2];
});
const barScreen = await toScreen(barPoint[0], barPoint[1]);
await page.mouse.click(barScreen[0], barScreen[1]);
await page.waitForTimeout(400);
const inspector = await page
  .locator('.section:has(h2:text-is("Selection")) .body')
  .textContent();
check(
  'clicking a bar opens its details',
  /LINK/.test(inspector) && /Member length/.test(inspector),
  inspector.replace(/\s+/g, ' ').slice(0, 90),
);
const editable = await page.locator('.section:has(h2:text-is("Selection")) input[type=range]').count();
check('the selected bar exposes editable design variables', editable > 0, `${editable} slider(s)`);

// Moving one of those sliders must change the mechanism.
const lenBefore = await page.evaluate(() => window.__viewer.geometry.bars.map((b) => b.length));
const slider = page.locator('.section:has(h2:text-is("Selection")) input[type=range]').first();
await slider.fill(String(Math.round(Number(await slider.getAttribute('min'))) + 60));
await page.waitForTimeout(800);
const lenAfter = await page.evaluate(() => window.__viewer.geometry.bars.map((b) => b.length));
check(
  'editing a selected bar changes the geometry',
  lenBefore.some((v, i) => Math.abs(v - lenAfter[i]) > 1e-6),
  `${lenBefore.map((v) => v.toFixed(1)).join(',')} -> ${lenAfter.map((v) => v.toFixed(1)).join(',')}`,
);

// 2b. Hovering a bar shows the translucent hint at the bottom of the canvas.
// The bar moved when the slider above was dragged, so its position is resolved
// again rather than reusing the pre-edit screen point.
const hoverPoint = await page.evaluate(() => {
  const q = window.__viewer.currentPose;
  const m = window.__viewer.geometry.members.find((mm) => mm.linkId !== 'crank');
  const a = q.points[m.from];
  const b = q.points[m.to];
  return [(a.x + b.x) / 2, (a.y + b.y) / 2];
});
const hoverScreen = await toScreen(hoverPoint[0], hoverPoint[1]);
await page.mouse.move(hoverScreen[0] + 300, hoverScreen[1] + 300);
await page.waitForTimeout(300);
const hintHiddenOffBar = await page.locator('.hoverhint').count();
await page.mouse.move(hoverScreen[0], hoverScreen[1], { steps: 5 });
await page.waitForTimeout(400);
const hintText = (await page.locator('.hoverhint').textContent()) ?? '';
check(
  'hovering a bar shows the hint',
  hintHiddenOffBar === 0 && /length/.test(hintText) && /angle/.test(hintText),
  hintText.replace(/\s+/g, ' ').slice(0, 100),
);
// The hint must never swallow a click meant for the mechanism underneath it.
const hintEvents = await page.evaluate(
  () => getComputedStyle(document.querySelector('.hoverhint')).pointerEvents,
);
check('the hint does not intercept pointer events', hintEvents === 'none', hintEvents);

// Hovering a joint reports the transmission angle rather than a length.
const jointScreen = await toScreen(
  ...(await page.evaluate(() => {
    const q = window.__viewer.currentPose.points.J0;
    return [q.x, q.y];
  })),
);
await page.mouse.move(jointScreen[0], jointScreen[1]);
await page.waitForTimeout(400);
const jointHint = (await page.locator('.hoverhint').textContent()) ?? '';
check(
  'hovering a joint reports its transmission angle',
  /JOINT/i.test(jointHint) && /μ/.test(jointHint),
  jointHint.replace(/\s+/g, ' ').slice(0, 100),
);

// Leaving the canvas clears it.
await page.mouse.move(20, 400);
await page.waitForTimeout(400);
check('leaving the canvas clears the hint', (await page.locator('.hoverhint').count()) === 0);

// 3. Target trajectory: switch to a circle, then edit a control point.
await page.locator('.section:has(h2:text-is("Target Trajectory")) button:has-text("Circle")').click();
await page.waitForTimeout(900);
const targetName = await page
  .locator('.section:has(h2:text-is("Target Trajectory")) .metrics dd')
  .first()
  .textContent();
check('a different target curve can be loaded', targetName.trim() === 'Circle', targetName.trim());

await page.getByText('Edit points on canvas').click();
await page.waitForTimeout(700);
const handles = await page.evaluate(() => {
  let n = 0;
  window.__viewer.target.group.traverse((o) => {
    if (o.type === 'Mesh') n++;
  });
  return n;
});
check('edit mode shows a handle per control point', handles >= 8, `${handles} handles`);

const controlCount = () =>
  page
    .locator('.section:has(h2:text-is("Target Trajectory")) .metrics dd')
    .nth(1)
    .textContent();
const pointsBefore = Number(await controlCount());
const anchor = await page.evaluate(() => {
  const p = window.__viewer.target.controls ?? null;
  return p ? [p[0].x, p[0].y] : null;
});
if (anchor) {
  const hFrom = await toScreen(anchor[0], anchor[1]);
  const hTo = await toScreen(anchor[0] + 45, anchor[1] + 45);
  await page.mouse.move(hFrom[0], hFrom[1]);
  await page.mouse.down();
  await page.mouse.move(hTo[0], hTo[1], { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(800);
}
const movedTo = await page.evaluate(() => {
  const p = window.__viewer.target.controls ?? null;
  return p ? [p[0].x, p[0].y] : null;
});
check(
  'a target control point can be dragged',
  Boolean(anchor && movedTo) && Math.hypot(movedTo[0] - anchor[0], movedTo[1] - anchor[1]) > 20,
  anchor ? `(${anchor[0].toFixed(1)}, ${anchor[1].toFixed(1)}) -> (${movedTo[0].toFixed(1)}, ${movedTo[1].toFixed(1)})` : 'no handles',
);
check('the control count is unchanged by a drag', Number(await controlCount()) === pointsBefore);
await page.getByText('Edit points on canvas').click();

// Back to the heart so the remaining checks see the shipped target.
await page.locator('.section:has(h2:text-is("Target Trajectory")) button:has-text("Heart")').click();
await page.waitForTimeout(900);

// 4. Constraints are editable and take effect.
await page.locator('.section:has(h2:text-is("Constraints & Weights")) > header').click();
await page.waitForTimeout(300);
const linkNote = () => page.locator('.section:has(h2:text-is("Link Table")) .note').textContent();
const noteBefore = await linkNote();
const lminSlider = page
  .locator('.section:has(h2:text-is("Constraints & Weights")) input[type=range]')
  .first();
await lminSlider.fill('30');
await page.waitForTimeout(800);
const noteAfter = await linkNote();
check(
  'changing a constraint propagates through the app',
  noteBefore !== noteAfter && /30/.test(noteAfter),
  `${noteBefore.trim()} -> ${noteAfter.trim()}`,
);
await page.locator('.section:has(h2:text-is("Constraints & Weights")) button:has-text("Restore defaults")').click();
await page.waitForTimeout(800);
check('constraints can be restored to the defaults', (await linkNote()) === noteBefore);
await page.locator('.section:has(h2:text-is("Constraints & Weights")) > header').click();

// --- bilingual UI -------------------------------------------------------
const headerLogos = await page.locator('.header .logo').count();
check(
  'the designer header shows the lockup exactly once',
  headerLogos === 1,
  `${headerLogos} logo(s)`,
);
check(
  'the lockup is labelled with the app name',
  (await page.locator('.header .logo').getAttribute('alt')) === 'KREAMET',
);
// The designer's extras live in the shared bar now, so they must still be there.
check(
  'the designer keeps its subtitle and actions in the shared bar',
  (await page.locator('.header .sub').count()) === 1 &&
    (await page.locator('.header .sitenav-actions .langswitch').count()) === 1 &&
    (await page.locator('.header button:has-text("Export JSON")').count()) === 1,
);

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
await fresh.waitForTimeout(SETTLE);
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

// --- About and reference pages -----------------------------------------
await page.click('.langswitch button:has-text("EN")');
await page.waitForTimeout(300);

await page.click('.sitenav a:has-text("About")');
await page.waitForTimeout(1200);
const aboutText = await page.locator('.page').textContent();
check(
  'the About page names the developer and links out',
  /Tansu/.test(aboutText) && (await page.locator('.links a[href^="https://github.com"]').count()) > 0,
  aboutText.replace(/\s+/g, ' ').slice(0, 80),
);
check(
  'the About page shows measured project figures',
  (await page.locator('.fact').count()) >= 4 && /11\.41/.test(aboutText),
  `${await page.locator('.fact').count()} facts`,
);
// One lockup per page: the designer draws its own as the page heading, so the
// nav must not draw a second one beside it.
const heroLogo = await page.locator('.herologo').getAttribute('src');
check('the About page shows the brand lockup', heroLogo === '/kreamet-logo.svg', String(heroLogo));
const logoOk = await page.evaluate(async () => {
  const res = await fetch('/kreamet-logo.svg');
  return res.ok && (await res.text()).includes('<svg');
});
check('the brand asset is served', logoOk);

// Rendered check, not just a served one: measure the wordmark against the
// drawing surface. A viewBox too narrow for the text clips it silently.
const clip = await page.evaluate(async () => {
  const svg = await (await fetch('/kreamet-logo.svg')).text();
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-9999px;width:1200px';
  host.innerHTML = svg;
  document.body.appendChild(host);
  const el = host.querySelector('svg');
  const vb = el.viewBox.baseVal;
  await document.fonts.ready;
  const t = host.querySelector('text').getBBox();
  const over = Math.round(t.x + t.width - (vb.x + vb.width));
  host.remove();
  return { over, need: Math.round(t.x + t.width), have: Math.round(vb.x + vb.width) };
});
check(
  'the wordmark fits inside the logo viewBox',
  clip.over <= 0,
  `wordmark ends at ${clip.need}, box ends at ${clip.have}`,
);

await page.click('.sitenav a:has-text("Mechanism Theory")');
await page.waitForTimeout(3000);
const tocCount = await page.locator('.toc nav a').count();
const chapterCount = await page.locator('.md h1').count();
check(
  'the reference loads with a full table of contents',
  tocCount > 150 && chapterCount > 40,
  `${tocCount} sections, ${chapterCount} chapters`,
);
check(
  'the reference renders tables and formula blocks',
  (await page.locator('.md table').count()) > 15 && (await page.locator('.md pre').count()) > 30,
  `${await page.locator('.md table').count()} tables, ${await page.locator('.md pre').count()} blocks`,
);

// Filtering the contents narrows it, and clearing restores it.
await page.locator('.toc-head input').fill('singular');
await page.waitForTimeout(300);
const filtered = await page.locator('.toc nav a').count();
check('the contents can be filtered', filtered > 0 && filtered < tocCount, `${filtered} of ${tocCount}`);
await page.locator('.toc-head input').fill('');
await page.waitForTimeout(300);

// A contents entry is a real deep link.
const firstHref = await page.locator('.toc nav a').nth(3).getAttribute('href');
await page.goto(URL + firstHref, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const anchorId = firstHref.split('/').pop();
const landed = await page.evaluate((id) => {
  const el = document.getElementById(id);
  return el ? Math.round(el.getBoundingClientRect().top) : null;
}, anchorId);
check(
  'a contents entry deep-links to its section',
  landed !== null && Math.abs(landed) < 200,
  `#${anchorId} at y=${landed}`,
);

// Both references are full length — neither language is the abridged one.
// The line count is read as a number rather than matched literally, so that
// editing the document does not become a smoke failure at 5001 lines.
const lineCount = (meta) => Number((/([\d\s]+)\s*(?:lines|satır)/.exec(meta) ?? [])[1]?.replace(/\s/g, ''));
const enMeta = (await page.locator('.toc-meta').textContent()).trim();
check('the English reference is full length', lineCount(enMeta) >= 5000, enMeta);

// The reference follows the language switch.
const trFirst = await page.locator('.md h1').first().textContent();
await page.click('.langswitch button:has-text("TR")');
await page.waitForTimeout(3000);
const trAfter = await page.locator('.md h1').first().textContent();
check('the reference is bilingual', trAfter !== trFirst, `${trFirst} -> ${trAfter}`);
const trMeta = (await page.locator('.toc-meta').textContent()).trim();
check('the Turkish reference is full length', lineCount(trMeta) >= 5000, trMeta);

// Back to the designer, and the canvas must come back alive.
await page.click('.langswitch button:has-text("EN")');
await page.waitForTimeout(300);
await page.click('.sitenav a:has-text("Designer")');
await page.waitForTimeout(3000);
check(
  'returning to the designer restores a live mechanism',
  await page.evaluate(() => Boolean(window.__viewer?.currentPose)),
);
const navErrors = errors.filter((e) => !e.includes('favicon'));
check('navigating between pages raises no errors', navErrors.length === 0, navErrors.slice(0, 2).join('; '));

/* ------------------------------------------------------------------ */
/* Phone layout                                                        */
/* ------------------------------------------------------------------ */

// A separate context at phone size. The regression this guards is not subtle:
// with three fixed columns the canvas came out *zero* pixels wide on a 390px
// screen and the page scrolled 588px sideways, so the mechanism — the whole
// point of the app — could not be seen at all.
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const phoneErrors = [];
phone.on('pageerror', (e) => phoneErrors.push(String(e)));
await phone.addInitScript(() => window.localStorage.setItem('kreamet.lang', 'en'));
await phone.goto(URL, { waitUntil: 'networkidle' });
await phone.waitForTimeout(SETTLE + 2000);

const canvasBox = await phone.evaluate(() => {
  const b = document.querySelector('.canvas-wrap canvas').getBoundingClientRect();
  return [Math.round(b.width), Math.round(b.height)];
});
check(
  'the mechanism gets real canvas on a phone',
  canvasBox[0] > 300 && canvasBox[1] > 300,
  `${canvasBox[0]}x${canvasBox[1]}`,
);

const overflow = await phone.evaluate(() => [
  document.documentElement.scrollWidth,
  document.documentElement.clientWidth,
]);
check(
  'the phone layout does not scroll sideways',
  overflow[0] <= overflow[1],
  `scrollWidth ${overflow[0]} vs ${overflow[1]}`,
);

check(
  'the drawer toggles are present on a phone',
  (await phone.locator('.panel-toggles button').count()) === 2,
);

// A closed drawer must be gone from the tab order, not merely out of sight.
let inDrawer = 0;
for (let i = 0; i < 40; i++) {
  await phone.keyboard.press('Tab');
  if (await phone.evaluate(() => Boolean(document.activeElement?.closest('.sidebar')))) inDrawer += 1;
}
check('a closed drawer is out of the tab order', inDrawer === 0, `${inDrawer} tab stops reached it`);

await phone.locator('.panel-toggles button').first().click();
await phone.waitForTimeout(500);
check(
  'the design drawer opens over the canvas',
  (await phone.evaluate(
    () => getComputedStyle(document.querySelector('.sidebar.left')).visibility,
  )) === 'visible',
);

// Collapse-all: the reason it exists is that closing a dozen panels one tap at
// a time is not a thing anyone will do on a phone.
const openBefore = await phone.locator('.sidebar.left .section .body').count();
await phone.locator('.drawer-head button').first().click();
await phone.waitForTimeout(300);
const openAfter = await phone.locator('.sidebar.left .section .body').count();
check(
  'collapse-all closes every panel in the drawer',
  openBefore > 1 && openAfter === 0,
  `${openBefore} open -> ${openAfter}`,
);

// Expand-all opens *every* panel, which is more than were open to begin with —
// several ship collapsed by default.
const totalSections = await phone.locator('.sidebar.left .section').count();
await phone.locator('.drawer-head button').nth(1).click();
await phone.waitForTimeout(300);
const openExpanded = await phone.locator('.sidebar.left .section .body').count();
check(
  'expand-all opens every panel',
  openExpanded === totalSections && totalSections > openBefore,
  `${openExpanded}/${totalSections} open (was ${openBefore})`,
);

await phone.keyboard.press('Escape');
await phone.waitForTimeout(500);
check(
  'Escape closes the drawer',
  (await phone.evaluate(
    () => getComputedStyle(document.querySelector('.sidebar.left')).visibility,
  )) === 'hidden',
);

// Touch, not mouse: the canvas sets `touch-action: none` and the controller
// listens for pointer events, and this is what proves the pair works together.
const phoneScreen = (wx, wy) =>
  phone.evaluate(([x, y]) => {
    const s = window.__viewer.scene;
    const r = s.canvas.getBoundingClientRect();
    const c = s.camera;
    return [
      r.left + ((x - c.left) / (c.right - c.left)) * r.width,
      r.top + ((c.top - y) / (c.top - c.bottom)) * r.height,
    ];
  }, [wx, wy]);
const phoneO2 = await phone.evaluate(() => {
  const g = window.__viewer.geometry.ground[0];
  return [g.x, g.y];
});
const phonePin = await phone.evaluate(() => {
  const q = window.__viewer.currentPose;
  return [q.points.A.x, q.points.A.y];
});
const tFrom = await phoneScreen(phonePin[0], phonePin[1]);
const tTo = await phoneScreen(phoneO2[0], phoneO2[1] + 120);
const touchAt = (type, x, y) =>
  phone.evaluate(
    ([type, x, y]) =>
      document.querySelector('.canvas-wrap canvas').dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
          clientX: x,
          clientY: y,
          buttons: type === 'pointerup' ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      ),
    [type, x, y],
  );
await touchAt('pointerdown', tFrom[0], tFrom[1]);
for (let i = 1; i <= 20; i += 1) {
  await touchAt(
    'pointermove',
    tFrom[0] + ((tTo[0] - tFrom[0]) * i) / 20,
    tFrom[1] + ((tTo[1] - tFrom[1]) * i) / 20,
  );
}
await touchAt('pointerup', tTo[0], tTo[1]);
await phone.waitForTimeout(400);
const touchTheta = await phone.evaluate(
  () => (((((window.__viewer.theta * 180) / Math.PI) % 360) + 360) % 360),
);
check(
  'a touch drag turns the crank',
  Math.abs(touchTheta - 90) < 3,
  `${touchTheta.toFixed(2)}° (expect 90°)`,
);

check('the phone layout raises no errors', phoneErrors.length === 0, phoneErrors.slice(0, 2).join('; '));
await phone.close();

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
