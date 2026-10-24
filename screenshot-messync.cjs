const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\mt\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://messync.com', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'messync.png', fullPage: false });
  const html = await page.content();
  console.log('HTML_LEN', html.length);
  await browser.close();
})();
