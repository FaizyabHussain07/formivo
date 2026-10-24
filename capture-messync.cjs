const { chromium } = require('playwright');
const path = require('path');

const exe = 'C:\\Users\\mt\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe';

(async () => {
  const b = await chromium.launch({
    executablePath: exe,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto('https://messync.com', { waitUntil: 'networkidle', timeout: 45000 });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: 'messync.png', fullPage: false });
  console.log('DONE');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
