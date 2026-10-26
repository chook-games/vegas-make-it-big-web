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
  await page.waitForSelector('#catalog img', { timeout: 30000 });
  assert.equal(await page.locator('#catalog img').count(), 12);
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
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/desktop.png' });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.screenshot({ path: 'test-results/compact.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, 'Compact layout has no horizontal page overflow');
  assert.deepEqual(errors, [], 'No page exceptions or failed HTTP resources');
  console.log('Browser checks passed: nested Pages path, 12 TGA images, rotated placement, demo, visitors, save/load, help and compact layout.');
} finally {
  await browser?.close();
  server?.kill();
}
