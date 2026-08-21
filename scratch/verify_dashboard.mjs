import puppeteer from 'puppeteer';
import path from 'path';

const artifactsDir = 'C:\\Users\\Arpit\\.gemini\\antigravity-ide\\brain\\91c6baf6-ef17-436e-997e-1415b1cba73b';

async function runVerification() {
  console.log('Starting Puppeteer verification against http://localhost:5173/ ...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for data load
  await new Promise(r => setTimeout(r, 2000));

  // 1. Screenshot Light Theme
  const lightScreenshotPath = path.join(artifactsDir, 'dashboard_light_theme.png');
  await page.screenshot({ path: lightScreenshotPath, fullPage: true });
  console.log('Saved Light Theme screenshot to:', lightScreenshotPath);

  // Check date badge text for DD/MM/YYYY format
  const dateBadge = await page.$eval('#reportDateBadge', el => el.textContent.trim());
  console.log('Report Date Badge Text:', dateBadge);

  // 2. Click Theme Toggle to switch to Dark Theme
  console.log('Clicking Theme Toggle button...');
  await page.click('#btnThemeToggle');
  await new Promise(r => setTimeout(r, 1000));

  const darkThemeAttr = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log('HTML data-theme attribute after toggle:', darkThemeAttr);

  // Screenshot Dark Theme
  const darkScreenshotPath = path.join(artifactsDir, 'dashboard_dark_theme.png');
  await page.screenshot({ path: darkScreenshotPath, fullPage: true });
  console.log('Saved Dark Theme screenshot to:', darkScreenshotPath);

  await browser.close();

  // Assertions
  const success = (
    dateBadge === 'Date: 10/02/2026' &&
    darkThemeAttr === 'dark'
  );

  if (!success) {
    console.error('VERIFICATION FAILED!');
    process.exit(1);
  } else {
    console.log('\nALL THEME & DATE FORMAT VERIFICATIONS PASSED SUCCESSFULLY!');
  }
}

runVerification().catch(err => {
  console.error('Script Error:', err);
  process.exit(1);
});
