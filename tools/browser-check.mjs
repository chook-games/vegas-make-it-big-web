import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const external = process.argv[2];
const prefix = '/vegas-make-it-big-web/';
const url = external ?? `http://127.0.0.1:4175${prefix}`;
const server = external ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort', '--base', prefix], { stdio: 'inherit' });
let browser;
try {
  for (let i = 0; i < 50; i++) {
    try { const response = await fetch(url); if (response.ok) break; } catch {}
    if (i === 49) throw new Error('Preview server did not start. Run npm run build first.');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(url);
  await page.waitForSelector('#menu-sandbox');
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/main-menu.png' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('#main-menu h1').textContent(), 'Main Menu');
  const visibleEnglish = await page.locator('#main-menu').innerText();
  assert.doesNotMatch(visibleEnglish.replace('Ελληνικά', ''), /[Α-Ωα-ω]/);
  await page.selectOption('#language-select', 'el');
  assert.equal(await page.locator('#main-menu h1').textContent(), 'Κεντρικό μενού');
  await page.reload();
  await page.waitForSelector('#menu-sandbox');
  assert.equal(await page.locator('html').getAttribute('lang'), 'el');
  await page.selectOption('#language-select', 'en');
  await page.click('#menu-campaign');
  assert.equal(await page.locator('.campaign-item').count(), 10);
  await page.click('[data-scenario="Welcome to The Strip"]');
  await page.click('#campaign-accept');
  assert.match(await page.locator('#campaign-description').textContent(), /not playable yet/);
  await page.click('#campaign-cancel');
  await page.click('#menu-sandbox');
  await page.waitForSelector('[data-item="slot"]', { timeout: 30000 });
  assert.ok(await page.locator('[data-item]').count() >= 1);
  assert.equal(await page.locator('.major-group').count(), 4);
  assert.ok(await page.locator('.minor-tab').count() >= 1);
  assert.equal(await page.locator('.classic-build').count(), 1);
  await page.click('#build-context');
  assert.equal(await page.locator('.major-group').count(), 4, 'Exterior lot has the four original major groups');
  await page.click('#build-context');
  assert.ok(await page.locator('[data-item="slot"]').count(), 'Casino-interior catalogue returns after switching context');
  await page.click('#first-slot');
  await page.keyboard.press('r');
  const canvas = page.locator('#viewport canvas');
  const rect = await canvas.boundingBox();
  await page.mouse.move(rect.x + rect.width * .5, rect.y + rect.height * .6);
  await page.mouse.click(rect.x + rect.width * .5, rect.y + rect.height * .6);
  await page.click('#save');
  const placed = await page.evaluate(() => JSON.parse(localStorage.getItem('vegas-web-save-v1')));
  if (!placed.buildings.length) {
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/placement-failure.png' });
    console.log('Placement diagnostics:', await page.locator('#placement').textContent(), await page.locator('#toast').textContent(), errors);
  }
  assert.equal(placed.buildings.length, 1, 'Floor click places a slot');
  assert.equal(placed.buildings[0].rotation, 1, 'R rotates the footprint');
  assert.equal(placed.cash, 49880);
  await page.click('#new-game'); await page.click('#confirm-new');
  await page.click('#demo');
  await page.click('[data-speed="3"]');
  await page.waitForFunction(() => Number(document.querySelector('#visitors').textContent) > 0, { timeout: 15000 });
  await page.waitForTimeout(7000);
  await page.click('[data-speed="0"]');
  await page.click('#save');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vegas-web-save-v1')));
  assert.equal(saved.buildings.length, 19, 'Example floorplan builds every object');
  assert.ok(saved.totalVisitors > 0);
  await page.click('#load');
  await page.click('#save');
  const loaded = await page.evaluate(() => JSON.parse(localStorage.getItem('vegas-web-save-v1')));
  assert.deepEqual(loaded.buildings, saved.buildings);
  assert.equal(loaded.cash, saved.cash);
  await page.click('#help');
  assert.ok(await page.locator('#help-dialog').evaluate(el => el.open));
  await page.click('#play');
  assert.doesNotMatch(await page.locator('body').innerText(), /ID_[A-Z_]{4,}/, 'No unresolved localization keys');
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/desktop.png' });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.screenshot({ path: 'test-results/compact.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, 'Compact layout has no horizontal page overflow');
  assert.deepEqual(errors, [], 'No page exceptions or failed HTTP resources');
  console.log('Browser checks passed: nested Pages path, original TGA thumbnails/UI sprites, original-style build groups, rotated placement, visitors, save/load, help and compact layout.');
} finally {
  await browser?.close();
  server?.kill();
}
