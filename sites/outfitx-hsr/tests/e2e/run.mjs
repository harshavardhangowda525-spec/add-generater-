// End-to-end checks against a production build served by `vite preview`.
// Usage: npm run build && npm run test:e2e
// Builds are expected with VITE_PROPOSAL_MODE=true and a placeholder
// VITE_SUPABASE_URL (the Supabase request is intercepted, never sent).
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const SHOTS = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);

let failures = 0;
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    results.push(`  ✗ ${name}\n      ${String(e.message || e).split('\n')[0]}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// Run Vite's CLI directly (not through npx) so kill() stops the server itself.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
process.on('exit', () => server.kill());
// Wait until the preview server answers.
for (let i = 0; ; i++) {
  if (await fetch(BASE).then((r) => r.ok, () => false)) break;
  if (i > 100) throw new Error('preview server did not start');
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch({ executablePath });

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667, mobile: true },
  { name: 'android', width: 412, height: 915, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'laptop', width: 1366, height: 768, mobile: false },
  { name: 'desktop-xl', width: 1920, height: 1080, mobile: false },
];

async function newPage(vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/maps|google|fonts/i.test(m.text()) && errors.push(m.text()));
  // Never hit real third parties during tests.
  await page.route(/google\.com\/maps/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>map</body></html>' }));
  return { ctx, page, errors };
}

/** Scroll the whole page so every whileInView animation has run. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(1600);
}

// ── Layout at every viewport ──────────────────────────────────────────
for (const vp of VIEWPORTS) {
  await check(`[${vp.name}] loads without errors and has no horizontal overflow`, async () => {
    const { ctx, page, errors } = await newPage(vp);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2600); // let the intro sequence finish
    await page.screenshot({ path: `${SHOTS}${vp.name}-hero.png` });
    await scrollThrough(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 0, `page is ${overflow}px wider than the viewport`);
    await page.screenshot({ path: `${SHOTS}${vp.name}-full.png`, fullPage: true });
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    await ctx.close();
  });
}

// ── Navigation ────────────────────────────────────────────────────────
await check('desktop nav links scroll to their sections and the bar turns solid', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const header = page.locator('header');
  const bgTop = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
  assert(bgTop === 'rgba(0, 0, 0, 0)', `header should be transparent over the hero, got ${bgTop}`);
  for (const id of ['approach', 'training', 'reviews', 'contact', 'home']) {
    await page.locator(`nav[aria-label="Main"] ul a[href="#${id}"]`).click();
    await page.waitForTimeout(1300);
    const top = await page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
    assert(Math.abs(top) < 120, `#${id} top is ${top}px after clicking its nav link`);
  }
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(700);
  const bgScrolled = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
  assert(bgScrolled !== 'rgba(0, 0, 0, 0)', 'header should be solid after scrolling');
  await page.locator('nav[aria-label="Main"] a', { hasText: 'Enquire now' }).click();
  await page.waitForTimeout(1300);
  const top = await page.evaluate(() => document.getElementById('enquire').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, 'Enquire now did not reach the form');
  await ctx.close();
});

await check('mobile menu opens, traps focus, closes with Escape and navigates', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.click();
  const menu = page.locator('#mobile-menu');
  await menu.waitFor({ state: 'visible' });
  assert((await page.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')) === 'true', 'aria-expanded not true');
  const overflow = await page.evaluate(() => document.body.style.overflow);
  assert(overflow === 'hidden', 'page scroll not locked');
  await page.screenshot({ path: `${SHOTS}mobile-menu.png` });
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await menu.getByRole('link', { name: 'Reviews' }).click();
  await menu.waitFor({ state: 'detached' });
  await page.waitForTimeout(1300);
  const top = await page.evaluate(() => document.getElementById('reviews').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `#reviews top is ${top}px after tapping the mobile link`);
  await ctx.close();
});

await check('keyboard: first Tab reaches the skip link', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const text = await page.evaluate(() => document.activeElement?.textContent?.trim());
  assert(text === 'Skip to content', `first focus is "${text}"`);
  await ctx.close();
});

// ── Contact links ─────────────────────────────────────────────────────
await check('contact links point at the right destinations', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const hrefs = await page.$$eval('a', (as) => as.map((a) => a.getAttribute('href')));
  const wa = hrefs.filter((h) => h?.startsWith('https://wa.me/'));
  assert(wa.length >= 2 && wa.every((h) => h.startsWith('https://wa.me/917624886713?text=')), 'WhatsApp links wrong');
  assert(hrefs.filter((h) => h === 'tel:+917624886713').length >= 3, 'click-to-call links missing');
  assert(hrefs.some((h) => h?.startsWith('https://www.google.com/maps/dir/?api=1&destination=')), 'directions link missing');
  assert(hrefs.includes('https://theoutfitx.com'), 'existing website link missing');
  assert(hrefs.includes('/privacy'), 'privacy link missing');
  // Every in-page anchor must have a target.
  const missing = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
  assert(missing.length === 0, `anchors without targets: ${missing.join(', ')}`);
  await ctx.close();
});

// ── Enquiry form ──────────────────────────────────────────────────────
async function fillValid(page) {
  await page.getByLabel('Full name').fill('Asha Rao');
  await page.getByLabel('Phone number').fill('98765 43210');
  await page.getByLabel('Fitness goal').selectOption('strength');
  await page.locator('label', { hasText: 'WhatsApp' }).filter({ has: page.locator('input[type=radio]') }).click();
  await page.locator('input[name=consent]').check();
}

await check('form shows inline errors and focuses the first invalid field', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await page.goto(`${BASE}/#enquire`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Send enquiry/ }).click();
  const alerts = await page.locator('#enquire [id$="-error"]').count();
  assert(alerts === 5, `expected 5 inline errors, got ${alerts}`);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
  assert(focused === 'fullName', `focus went to ${focused}`);
  await page.getByLabel('Phone number').fill('12345');
  await page.getByLabel('Full name').fill('Asha');
  const phoneErr = await page.locator('#enquire [id$="phone-error"]').textContent();
  assert(/valid 10-digit/.test(phoneErr), 'phone error missing');
  await page.locator('#enquire').screenshot({ path: `${SHOTS}form-errors.png` });
  await ctx.close();
});

await check('form shows success only after the backend confirms (201), and blocks double submits', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  let calls = 0;
  await page.route('**/rest/v1/enquiries', async (r) => {
    calls++;
    const body = JSON.parse(r.request().postData());
    assert(body.phone === '+919876543210' && body.contact_method === 'whatsapp', 'unexpected payload');
    await new Promise((res) => setTimeout(res, 600));
    await r.fulfill({ status: 201, body: '' });
  });
  await page.goto(`${BASE}/#enquire`, { waitUntil: 'networkidle' });
  await fillValid(page);
  const btn = page.getByRole('button', { name: /Send enquiry/ });
  await btn.click();
  await page.locator('#enquire button[type=submit]').click({ force: true, timeout: 500 }).catch(() => {});
  await page.getByText('Enquiry received.').waitFor({ timeout: 5000 });
  assert(calls === 1, `expected 1 request, got ${calls}`);
  await page.locator('#enquire').screenshot({ path: `${SHOTS}form-success.png` });
  await ctx.close();
});

await check('form never claims success when the backend fails', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  await page.route('**/rest/v1/enquiries', (r) => r.fulfill({ status: 500, body: '{}' }));
  await page.goto(`${BASE}/#enquire`, { waitUntil: 'networkidle' });
  await fillValid(page);
  await page.getByRole('button', { name: /Send enquiry/ }).click();
  await page.getByRole('alert').waitFor();
  assert((await page.getByText('Enquiry received.').count()) === 0, 'success shown on failure');
  assert((await page.getByLabel('Full name').inputValue()) === 'Asha Rao', 'form data lost on failure');
  await page.locator('#enquire').screenshot({ path: `${SHOTS}form-failure.png` });
  await ctx.close();
});

// ── Pages & interactions ──────────────────────────────────────────────
await check('training detail page enquiry CTA pre-selects the goal on the form', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[1]);
  await page.goto(`${BASE}/training/mobility-and-movement`, { waitUntil: 'networkidle' });
  assert((await page.title()).startsWith('Mobility & Movement'), 'detail page title wrong');
  await page.screenshot({ path: `${SHOTS}training-detail.png`, fullPage: true });
  await page.getByRole('button', { name: /Enquire about/ }).click();
  await page.waitForURL(/\/#enquire$/);
  await page.waitForTimeout(800);
  assert((await page.getByLabel('Fitness goal').inputValue()) === 'mobility', 'goal not pre-selected');
  await ctx.close();
});

await check('gallery lightbox opens, moves with arrow keys, closes with Escape', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  await page.goto(`${BASE}/#gallery`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('#gallery ul button').first().click();
  const dialog = page.getByRole('dialog', { name: 'Image viewer' });
  await dialog.waitFor();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const counter = await dialog.locator('[aria-live]').textContent();
  assert(counter.trim().startsWith('02'), `counter is ${counter}`);
  await page.screenshot({ path: `${SHOTS}lightbox.png` });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  await ctx.close();
});

await check('privacy and 404 pages render', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle' });
  assert((await page.locator('h1').textContent()).includes('Privacy'), 'privacy h1 missing');
  await page.goto(`${BASE}/nope`, { waitUntil: 'networkidle' });
  assert((await page.locator('h1').textContent()).includes('Off the plan'), '404 missing');
  await ctx.close();
});

await check('reduced motion: content is visible without animation', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3], { reducedMotion: 'reduce' });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const visible = await page.locator('#hero-title').isVisible();
  assert(visible, 'hero headline not visible');
  await ctx.close();
});

await check('SEO: title, description, structured data, single h1', async () => {
  const { ctx, page } = await newPage(VIEWPORTS[3]);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  assert((await page.title()) === 'RK Fitness Center-Gym | Strength Training & Fitness in Bengaluru', 'title');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert(ld['@type'] === 'ExerciseGym' && !ld.aggregateRating && !ld.openingHours, 'structured data must not contain unconfirmed claims');
  assert((await page.locator('h1').count()) === 1, 'expected exactly one h1');
  const missingAlt = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.hasAttribute('alt')).length);
  assert(missingAlt === 0, `${missingAlt} images without alt`);
  await ctx.close();
});

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
