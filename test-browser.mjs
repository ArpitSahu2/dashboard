import puppeteer from 'puppeteer';
import path from 'path';

const artifactsDir = 'C:\\Users\\Arpit\\.gemini\\antigravity\\brain\\27b6af32-e2ac-4e91-8949-b527b89c8a89';

async function testDashboard() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Desktop View (1440x1080)
  console.log('Testing Desktop view (1440px)...');
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for initial render
  await new Promise(r => setTimeout(r, 2000));

  const desktopScreenshot = path.join(artifactsDir, 'desktop_dashboard.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  console.log('Saved desktop screenshot to', desktopScreenshot);

  // Check DOM elements
  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  const kpiTodaySales = await page.$eval('#valTodaySales', el => el.textContent);
  console.log('KPI Today Sales element:', kpiTodaySales);

  const dateBadge = await page.$eval('#reportDateBadge', el => el.textContent);
  console.log('Report Date Badge:', dateBadge);

  // Test 2: Changing date picker
  console.log('\nTesting Date Picker change to 2026-08-10...');
  await page.evaluate(() => {
    const input = document.getElementById('reportDatePicker');
    input.value = '2026-08-10';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await new Promise(r => setTimeout(r, 1500));
  const newDateBadge = await page.$eval('#reportDateBadge', el => el.textContent);
  console.log('Updated Date Badge after change:', newDateBadge);

  const dateChangeScreenshot = path.join(artifactsDir, 'date_change_test.png');
  await page.screenshot({ path: dateChangeScreenshot, fullPage: true });
  console.log('Saved date change screenshot to', dateChangeScreenshot);

  // Test 3: Tablet View (768px)
  console.log('\nTesting Tablet view (768px)...');
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  const tabletScreenshot = path.join(artifactsDir, 'tablet_dashboard.png');
  await page.screenshot({ path: tabletScreenshot, fullPage: true });
  console.log('Saved tablet screenshot to', tabletScreenshot);

  // Test 4: Mobile View (375px)
  console.log('\nTesting Mobile view (375px)...');
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  const mobileScreenshot = path.join(artifactsDir, 'mobile_dashboard.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  console.log('Saved mobile screenshot to', mobileScreenshot);

  // Test 5: Quick Date Buttons (Yesterday, Today)
  console.log('\nTesting Quick Date Button "Yesterday"...');
  await page.click('#btnYesterday');
  await new Promise(r => setTimeout(r, 1000));
  const yesterdayBadge = await page.$eval('#reportDateBadge', el => el.textContent);
  console.log('Date badge after clicking Yesterday:', yesterdayBadge);

  await browser.close();
  console.log('\nAll browser verification tests completed successfully!');
}

testDashboard().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
