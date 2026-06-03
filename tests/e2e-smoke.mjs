import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';
const browserCandidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

if (!executablePath) {
  throw new Error('未找到可用于 Playwright 的 Chrome/Edge/Chromium，请设置 BROWSER_PATH');
}

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '登录平台' }).click();
  await page.getByRole('heading', { name: '首页驾驶舱', exact: true }).waitFor();

  const globalSearch = page.getByPlaceholder('搜索企业、设备、房间、告警');
  await globalSearch.fill('云启智能科技');
  await page.getByRole('button', { name: /^云启智能科技 企业/ }).click();
  await page.getByRole('heading', { name: '企业服务', exact: true }).waitFor();

  await globalSearch.fill('A1 创新研发楼');
  await page.getByRole('button', { name: /^A1 创新研发楼 楼栋/ }).click();
  await page.getByRole('heading', { name: '数字孪生一张图', exact: true }).waitFor();
  await page.locator('.object-panel h2').filter({ hasText: 'A1 创新研发楼' }).waitFor();

  await page.getByRole('button', { name: '搜索定位' }).click();
  await page.locator('.scene-search-panel input').fill('B2');
  await page.locator('.scene-search-panel button').filter({ hasText: 'B2 智造厂房' }).click();
  await page.locator('.object-panel h2').filter({ hasText: 'B2 智造厂房' }).waitFor();

  await page.getByRole('button', { name: '图层控制' }).click();
  await page.locator('.layer-panel').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '图层控制' }).click();
  await page.locator('.layer-panel').waitFor({ state: 'visible' });

  await page.getByRole('button', { name: '日间模式' }).click();
  await page.getByRole('button', { name: '夜间模式' }).waitFor();

  const canvasSignal = await page.locator('.three-host canvas').evaluate((canvas) => {
    const probe = document.createElement('canvas');
    probe.width = 96;
    probe.height = 64;
    const context2d = probe.getContext('2d');
    context2d.drawImage(canvas, 0, 0, probe.width, probe.height);
    const data = context2d.getImageData(0, 0, probe.width, probe.height).data;
    let variedPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]) > 8) {
        variedPixels += 1;
      }
    }
    return variedPixels;
  });
  assert.ok(canvasSignal > 300, `三维 Canvas 像素信号不足：${canvasSignal}`);

  await page.getByRole('button', { name: '安防管控', exact: true }).click();
  await page.locator('.video-layout-control button').filter({ hasText: '16' }).click();
  assert.equal(await page.locator('.video-cell').count(), 16, '视频监控未切换为 16 分屏');

  await page.getByRole('button', { name: '物业工单', exact: true }).click();
  await page.locator('.ticket-card').first().click();
  await page.locator('.workorder-detail-dialog').waitFor();
  await page.getByText('流程时间轴').waitFor();
  await page.getByRole('button', { name: '关闭工单详情' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `移动端页面存在横向溢出：${overflow}px`);
  assert.deepEqual(errors, [], `浏览器错误：\n${errors.join('\n')}`);

  console.log(JSON.stringify({
    status: 'ok',
    browser: executablePath,
    canvasSignal,
    mobileOverflow: overflow,
    checked: ['login', 'global-search', 'twin-tools', 'video-layout', 'workorder-detail', 'mobile-layout']
  }, null, 2));
} finally {
  await browser.close();
}
