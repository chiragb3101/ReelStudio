import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE = 'http://localhost:3000';
const results = [];

function log(section, status, detail = '') {
  const entry = { section, status, detail };
  results.push(entry);
  console.log(`[${status}] ${section}: ${detail}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/ss-${name}.png`, fullPage: true });
}

const browser = await chromium.launch({
  executablePath: '/tmp/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Collect all console errors
const consoleErrors = [];
const networkErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => networkErrors.push(err.message));
page.on('response', resp => {
  if (resp.status() >= 400) networkErrors.push(`${resp.status()} ${resp.url()}`);
});

// === LANDING PAGE ===
try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await screenshot(page, '01-landing');
  const title = await page.title();
  log('Landing Page', 'PASS', `Title: "${title}"`);
  
  const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null);
  log('Landing H1', h1 ? 'PASS' : 'FAIL', h1 || 'No H1 found');
  
  // Check for broken images
  const imgs = await page.$$eval('img', els => els.map(i => ({ src: i.src, naturalWidth: i.naturalWidth })));
  const brokenImgs = imgs.filter(i => i.src && !i.src.startsWith('data:') && i.naturalWidth === 0);
  log('Landing Images', brokenImgs.length === 0 ? 'PASS' : 'WARN', 
    brokenImgs.length > 0 ? `Broken: ${brokenImgs.map(i=>i.src).join(', ')}` : `${imgs.length} images OK`);
  
  // Check nav links
  const navLinks = await page.$$eval('a', els => els.map(a => a.textContent?.trim()).filter(Boolean));
  log('Landing Nav Links', 'INFO', navLinks.slice(0,10).join(', '));
} catch(e) {
  log('Landing Page', 'FAIL', e.message);
}

// === AUTH REDIRECT (pipeline requires auth) ===
try {
  const resp = await page.goto(`${BASE}/pipeline`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  const finalUrl = page.url();
  await screenshot(page, '02-pipeline-auth');
  if (finalUrl.includes('sign-in') || finalUrl.includes('clerk') || finalUrl.includes('accounts.')) {
    log('Auth Redirect', 'PASS', `Redirected to: ${finalUrl}`);
  } else {
    log('Auth Redirect', 'WARN', `Stayed at: ${finalUrl} - No auth redirect`);
  }
} catch(e) {
  log('Auth Redirect', 'FAIL', e.message);
}

// === SIGN-IN PAGE ===
try {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle', timeout: 15000 });
  await screenshot(page, '03-sign-in');
  const clerkForm = await page.$('[data-clerk-sign-in], .cl-rootBox, form[data-localization-key]').catch(() => null);
  const anyForm = await page.$('form, input[type="email"], input[type="text"]').catch(() => null);
  log('Sign-in Page', (clerkForm || anyForm) ? 'PASS' : 'WARN', 
    clerkForm ? 'Clerk component loaded' : (anyForm ? 'Generic form found' : 'No form found'));
} catch(e) {
  log('Sign-in Page', 'FAIL', e.message);
}

// === DASHBOARD (without auth) ===
try {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  const url = page.url();
  await screenshot(page, '04-dashboard');
  if (url.includes('sign-in') || url.includes('clerk')) {
    log('Dashboard Auth', 'PASS', 'Correctly redirected to sign-in');
  } else {
    log('Dashboard Auth', 'WARN', `Accessible without auth at: ${url}`);
  }
} catch(e) {
  log('Dashboard Auth', 'FAIL', e.message);
}

// === API ROUTES (should be protected) ===
const apiRoutes = [
  '/api/ai/script',
  '/api/ai/research', 
  '/api/ai/shot-list',
  '/api/ai/edit-spec',
  '/api/ai/caption',
  '/api/ai/thumbnail',
];

for (const route of apiRoutes) {
  try {
    const resp = await page.request.post(`${BASE}${route}`, {
      data: { topic: 'test', apiKey: 'fake-key-123' },
      headers: { 'Content-Type': 'application/json' }
    });
    const status = resp.status();
    if (status === 401 || status === 403) {
      log(`API Auth ${route}`, 'PASS', `Protected (${status})`);
    } else {
      log(`API Auth ${route}`, 'FAIL', `Unprotected - returned ${status}`);
    }
  } catch(e) {
    log(`API Auth ${route}`, 'ERROR', e.message);
  }
}

// === STATIC PIPELINE PAGES (no auth bypass, just check render) ===
const pipelineStages = ['idea', 'research', 'script', 'shot-list', 'shoot', 'edit', 'thumbnail', 'caption', 'schedule'];
for (const stage of pipelineStages) {
  try {
    const r = await page.goto(`${BASE}/pipeline/${stage}`, { waitUntil: 'networkidle', timeout: 10000 });
    const url = page.url();
    if (url.includes('sign-in') || url.includes('clerk')) {
      log(`Pipeline/${stage}`, 'PASS', 'Auth protected');
    } else {
      log(`Pipeline/${stage}`, 'WARN', `Accessible at ${url}`);
    }
  } catch(e) {
    log(`Pipeline/${stage}`, 'ERROR', e.message);
  }
}

// === CHECK FOR JS ERRORS ON LANDING ===
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
log('Console Errors (Landing)', consoleErrors.length === 0 ? 'PASS' : 'FAIL', 
  consoleErrors.length > 0 ? consoleErrors.slice(0,5).join(' | ') : 'No errors');

// === CHECK MOBILE VIEWPORT ===
await context.close();
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileCtx.newPage();
try {
  await mobilePage.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.screenshot({ path: '/tmp/ss-05-mobile.png', fullPage: true });
  const overflow = await mobilePage.evaluate(() => document.body.scrollWidth > window.innerWidth);
  log('Mobile Layout', overflow ? 'WARN' : 'PASS', overflow ? 'Horizontal overflow detected' : 'No horizontal overflow');
} catch(e) {
  log('Mobile Layout', 'FAIL', e.message);
}
await mobileCtx.close();

await browser.close();

// === FINAL REPORT ===
console.log('\n' + '='.repeat(60));
console.log('END-TO-END TEST RESULTS SUMMARY');
console.log('='.repeat(60));
const passes = results.filter(r => r.status === 'PASS').length;
const fails = results.filter(r => r.status === 'FAIL').length;
const warns = results.filter(r => r.status === 'WARN').length;
console.log(`PASS: ${passes} | FAIL: ${fails} | WARN: ${warns} | INFO: ${results.filter(r=>r.status==='INFO').length}`);
console.log('\nFAILURES & WARNINGS:');
results.filter(r => r.status === 'FAIL' || r.status === 'WARN').forEach(r => {
  console.log(`  [${r.status}] ${r.section}: ${r.detail}`);
});
