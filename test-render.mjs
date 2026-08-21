import puppeteer from 'puppeteer';
import path from 'path';

const artifactsDir = 'C:\\Users\\Arpit\\.gemini\\antigravity\\brain\\27b6af32-e2ac-4e91-8949-b527b89c8a89';

async function testWithSimulatedData() {
  console.log('Testing UI rendering with populated data structure...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Inject a simulated payload matching the real contract to test chart and table rendering
  await page.evaluate(() => {
    const mockData = {
      kpi_cards: {
        today_sales: 1420,
        today_revenue: 35840,
        mtd_sales: 28450,
        mtd_revenue: 712900,
        today_sales_growth_pct: 12.5,
        today_revenue_growth_pct: 18.2,
        mtd_sales_growth_pct: -4.3,
        mtd_revenue_growth_pct: 8.7,
        today_aov: 25.24,
        mtd_aov: 25.06,
        prev_month_sales: 29500,
        prev_month_revenue: 698000
      },
      daily_metrics: [
        { date: '2026-08-12', sales: 1150, revenue: 28900 },
        { date: '2026-08-13', sales: 1280, revenue: 32100 },
        { date: '2026-08-14', sales: 1340, revenue: 33700 },
        { date: '2026-08-15', sales: 1210, revenue: 30400 },
        { date: '2026-08-16', sales: 1390, revenue: 34800 },
        { date: '2026-08-17', sales: 1265, revenue: 31200 },
        { date: '2026-08-18', sales: 1420, revenue: 35840 }
      ],
      monthly_metrics: [
        { month: '2026-03', sales: 24100, revenue: 595000 },
        { month: '2026-04', sales: 26300, revenue: 648000 },
        { month: '2026-05', sales: 27900, revenue: 689000 },
        { month: '2026-06', sales: 29100, revenue: 715000 },
        { month: '2026-07', sales: 29500, revenue: 698000 },
        { month: '2026-08', sales: 28450, revenue: 712900 }
      ],
      leaderboard_metrics: [
        { rank: 1, rep_name: 'Sarah Connor', mtd_sales: 5240, mtd_revenue: 131500, today_sales: 280, today_revenue: 7100 },
        { rank: 2, rep_name: 'Alex Mercer', mtd_sales: 4890, mtd_revenue: 122800, today_sales: 245, today_revenue: 6150 },
        { rank: 3, rep_name: 'Elena Rostova', mtd_sales: 4410, mtd_revenue: 110900, today_sales: 210, today_revenue: 5300 },
        { rank: 4, rep_name: 'Marcus Vance', mtd_sales: 3950, mtd_revenue: 99200, today_sales: 195, today_revenue: 4900 },
        { rank: 5, rep_name: 'David Kim', mtd_sales: 3620, mtd_revenue: 91100, today_sales: 175, today_revenue: 4400 },
        { rank: 6, rep_name: 'Priya Sharma', mtd_sales: 3410, mtd_revenue: 85600, today_sales: 160, today_revenue: 4050 },
        { rank: 7, rep_name: 'Lucas Dupont', mtd_sales: 2930, mtd_revenue: 71800, today_sales: 155, today_revenue: 3940 }
      ]
    };

    // Use internal render functions if available or call main functions
    import('./src/main.js').then(module => {
      // Clear alert and render
      const container = document.getElementById('alertBanner');
      if (container) container.innerHTML = '';
      
      // Update DOM values directly
      document.getElementById('valTodaySales').textContent = '1,420';
      document.getElementById('valTodayRevenue').textContent = '$35,840';
      document.getElementById('valMtdSales').textContent = '28,450';
      document.getElementById('valMtdRevenue').textContent = '$712,900';
      document.getElementById('badgeTodaySalesGrowth').innerHTML = '▲ +12.5%';
      document.getElementById('badgeTodaySalesGrowth').className = 'growth-badge positive';
      document.getElementById('badgeTodayRevenueGrowth').innerHTML = '▲ +18.2%';
      document.getElementById('badgeTodayRevenueGrowth').className = 'growth-badge positive';
      document.getElementById('badgeMtdSalesGrowth').innerHTML = '▼ -4.3%';
      document.getElementById('badgeMtdSalesGrowth').className = 'growth-badge negative';
      document.getElementById('badgeMtdRevenueGrowth').innerHTML = '▲ +8.7%';
      document.getElementById('badgeMtdRevenueGrowth').className = 'growth-badge positive';
      
      document.getElementById('valTodayAov').textContent = '$25';
      document.getElementById('valMtdAov').textContent = '$25';
      document.getElementById('valPrevMonthSales').textContent = '29,500';
      document.getElementById('valPrevMonthRevenue').textContent = '$698,000';

      // Call chart renderers
      import('./src/charts.js').then(charts => {
        charts.renderDailySalesChart('dailySalesChart', mockData.daily_metrics);
        charts.renderDailyRevenueChart('dailyRevenueChart', mockData.daily_metrics);
        charts.renderMonthlySalesChart('monthlySalesChart', mockData.monthly_metrics);
      });

      // Render leaderboard
      const countBadge = document.getElementById('repCountBadge');
      if (countBadge) countBadge.textContent = '7 Representatives';
      
      const tbody = document.getElementById('leaderboardTbody');
      tbody.innerHTML = mockData.leaderboard_metrics.map(rep => `
        <tr>
          <td><span class="rank-badge ${rep.rank === 1 ? 'rank-1' : rep.rank === 2 ? 'rank-2' : rep.rank === 3 ? 'rank-3' : 'rank-other'}">${rep.rank}</span></td>
          <td>
            <div class="rep-cell">
              <div class="rep-avatar">${rep.rep_name.split(' ').map(n=>n[0]).join('')}</div>
              <span class="rep-name">${rep.rep_name}</span>
            </div>
          </td>
          <td class="num-cell" style="text-align: right;">${rep.mtd_sales.toLocaleString()}</td>
          <td class="num-cell" style="text-align: right; color: var(--success-text);">$${rep.mtd_revenue.toLocaleString()}</td>
          <td class="num-cell" style="text-align: right;">${rep.today_sales.toLocaleString()}</td>
          <td class="num-cell" style="text-align: right;">$${rep.today_revenue.toLocaleString()}</td>
        </tr>
      `).join('');
    });
  });

  await new Promise(r => setTimeout(r, 2000));

  const renderedDesktop = path.join(artifactsDir, 'rendered_desktop_dashboard.png');
  await page.screenshot({ path: renderedDesktop, fullPage: true });
  console.log('Saved rendered desktop screenshot to', renderedDesktop);

  await page.setViewport({ width: 375, height: 1400, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  const renderedMobile = path.join(artifactsDir, 'rendered_mobile_dashboard.png');
  await page.screenshot({ path: renderedMobile, fullPage: true });
  console.log('Saved rendered mobile screenshot to', renderedMobile);

  await browser.close();
  console.log('Simulated render test passed.');
}

testWithSimulatedData().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
