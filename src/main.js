import { fetchDashboardData, fetchAvailableReportDates } from './supabase.js';
import {
  renderDailySalesChart,
  renderDailyRevenueChart,
  renderMonthlySalesChart,
} from './charts.js';

// Date Helpers
const getIsoDateStr = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (startIso, endIso) => {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(getIsoDateStr(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// State
let currentReportDate = '2026-02-10';
let currentLeaderboardData = [];
let availableReportDates = [];
let sortColumn = 'rank';
let sortDirection = 'asc'; // 'asc' or 'desc'

// Formatters
const formatDateDMY = (dateStr) => {
  if (!dateStr) return '--';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val) || val === '') return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(val) || val === '') return '--';
  return new Intl.NumberFormat('en-US').format(val);
};

const formatGrowthPct = (val) => {
  if (val === null || val === undefined || isNaN(val) || val === '') return null;
  const num = Number(val);
  const formatted = Math.abs(num).toFixed(1) + '%';
  return {
    text: (num > 0 ? '+' : num < 0 ? '-' : '') + formatted,
    isPositive: num > 0,
    isNegative: num < 0,
    isNeutral: num === 0,
  };
};

/**
 * Update a growth badge element
 */
function updateGrowthBadge(elemId, growthVal) {
  const elem = document.getElementById(elemId);
  if (!elem) return;

  const res = formatGrowthPct(growthVal);
  if (!res) {
    elem.textContent = '--';
    elem.className = 'growth-badge neutral';
    return;
  }

  if (res.isPositive) {
    elem.className = 'growth-badge positive';
    elem.innerHTML = `▲ ${res.text}`;
  } else if (res.isNegative) {
    elem.className = 'growth-badge negative';
    elem.innerHTML = `▼ ${res.text}`;
  } else {
    elem.className = 'growth-badge neutral';
    elem.textContent = res.text;
  }
}

/**
 * Display alert banner (error / warning / info)
 */
function showAlert(type, title, message, details = null, extraActionBtn = null) {
  const container = document.getElementById('alertBanner');
  if (!container) return;

  const iconMap = {
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  };

  container.innerHTML = `
    <div class="alert-banner ${type}">
      <div class="alert-icon">${iconMap[type] || 'ℹ️'}</div>
      <div class="alert-content">
        <strong>${title}</strong>
        <div>${message}</div>
        ${details ? `<div style="margin-top: 6px;"><code>${details}</code></div>` : ''}
        <div class="alert-actions">
          <button type="button" id="btnAlertRetry">↻ Retry Request</button>
          ${extraActionBtn ? `<button type="button" id="${extraActionBtn.id}" class="sample-action-btn">${extraActionBtn.label}</button>` : ''}
        </div>
      </div>
    </div>
  `;

  const retryBtn = document.getElementById('btnAlertRetry');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      loadDashboard(currentReportDate);
    });
  }

  if (extraActionBtn && extraActionBtn.onClick) {
    const extraBtn = document.getElementById(extraActionBtn.id);
    if (extraBtn) {
      extraBtn.addEventListener('click', extraActionBtn.onClick);
    }
  }
}

function clearAlert() {
  const container = document.getElementById('alertBanner');
  if (container) container.innerHTML = '';
}

/**
 * Set loading skeleton state
 */
function setLoadingState(isLoading) {
  const refreshBtn = document.getElementById('btnRefresh');
  if (refreshBtn) {
    if (isLoading) {
      refreshBtn.classList.add('spinning');
    } else {
      refreshBtn.classList.remove('spinning');
    }
  }

  if (isLoading) {
    const kpiIds = [
      'valTodaySales',
      'valTodayRevenue',
      'valMtdSales',
      'valMtdRevenue',
      'valTodayAov',
      'valMtdAov',
      'valPrevMonthSales',
      'valPrevMonthRevenue',
    ];
    kpiIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '...';
    });

    const tbody = document.getElementById('leaderboardTbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-icon">⏳</div>
            <div class="empty-title">Loading Analytics</div>
            <div class="empty-desc">Querying Supabase RPC get_sales_dashboard('${currentReportDate}')...</div>
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Render KPI Cards and Secondary Callouts
 */
function renderKPIs(kpis) {
  if (!kpis) return;

  // Primary Metrics
  const todaySales = kpis.today_sales;
  const todayRev = kpis.today_revenue;
  const mtdSales = kpis.mtd_sales;
  const mtdRev = kpis.mtd_revenue;

  document.getElementById('valTodaySales').textContent = formatNumber(todaySales);
  document.getElementById('valTodayRevenue').textContent = formatCurrency(todayRev);
  document.getElementById('valMtdSales').textContent = formatNumber(mtdSales);
  document.getElementById('valMtdRevenue').textContent = formatCurrency(mtdRev);

  // Growth Badges (Display "--" if missing/null in RPC)
  const todaySalesGrowth = kpis.today_sales_growth_pct ?? null;
  const todayRevGrowth = kpis.today_revenue_growth_pct ?? null;
  const mtdSalesGrowth = kpis.mtd_sales_growth_pct ?? null;
  const mtdRevGrowth = kpis.mtd_revenue_growth_pct ?? null;

  updateGrowthBadge('badgeTodaySalesGrowth', todaySalesGrowth);
  updateGrowthBadge('badgeTodayRevenueGrowth', todayRevGrowth);
  updateGrowthBadge('badgeMtdSalesGrowth', mtdSalesGrowth);
  updateGrowthBadge('badgeMtdRevenueGrowth', mtdRevGrowth);

  // Secondary Callouts (AOV & Prev Month)
  const todayAov = kpis.today_aov ?? null;
  const mtdAov = kpis.mtd_aov ?? null;
  const prevMonthSales = kpis.pm_sales ?? kpis.prev_month_sales ?? null;
  const prevMonthRev = kpis.pm_revenue ?? kpis.prev_month_revenue ?? null;

  document.getElementById('valTodayAov').textContent = formatCurrency(todayAov);
  document.getElementById('valMtdAov').textContent = formatCurrency(mtdAov);
  document.getElementById('valPrevMonthSales').textContent = formatNumber(prevMonthSales);
  document.getElementById('valPrevMonthRevenue').textContent = formatCurrency(prevMonthRev);
}

/**
 * Render Leaderboard Table
 */
function renderLeaderboard(data) {
  const tbody = document.getElementById('leaderboardTbody');
  const countBadge = document.getElementById('repCountBadge');
  if (!tbody) return;

  if (!data || !Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No Representatives Found</div>
          <div class="empty-desc">No sales activity recorded for ${currentReportDate}.</div>
        </td>
      </tr>
    `;
    if (countBadge) countBadge.textContent = '0 Representatives';
    return;
  }

  if (countBadge) {
    countBadge.textContent = `${data.length} Representative${data.length === 1 ? '' : 's'}`;
  }

  // Helper accessor for sorting
  const getRepField = (rep, col) => {
    if (col === 'rep_name' || col === 'sales_representative') {
      return (rep.sales_representative || rep.rep_name || rep.name || rep.representative || '').trim();
    }
    return rep[col];
  };

  // Sort data
  const sorted = [...data].sort((a, b) => {
    let valA = getRepField(a, sortColumn);
    let valB = getRepField(b, sortColumn);

    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;

    if (typeof valA === 'string') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  tbody.innerHTML = sorted.map((rep, idx) => {
    const rank = rep.rank || (idx + 1);
    const repName = (rep.sales_representative || rep.rep_name || rep.name || rep.representative || `Rep #${rank}`).trim();
    const initials = repName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RP';
    
    let rankBadgeClass = 'rank-other';
    if (rank === 1) rankBadgeClass = 'rank-1';
    else if (rank === 2) rankBadgeClass = 'rank-2';
    else if (rank === 3) rankBadgeClass = 'rank-3';

    const mtdSales = rep.mtd_sales ?? 0;
    const mtdRev = rep.mtd_revenue ?? 0;
    const todaySales = rep.today_sales ?? 0;
    const todayRev = rep.today_revenue ?? 0;

    return `
      <tr>
        <td>
          <span class="rank-badge ${rankBadgeClass}">${rank}</span>
        </td>
        <td>
          <div class="rep-cell">
            <div class="rep-avatar">${initials}</div>
            <span class="rep-name">${repName}</span>
          </div>
        </td>
        <td class="num-cell" style="text-align: right;">${formatNumber(mtdSales)}</td>
        <td class="num-cell" style="text-align: right; color: var(--success-text);">${formatCurrency(mtdRev)}</td>
        <td class="num-cell" style="text-align: right;">${formatNumber(todaySales)}</td>
        <td class="num-cell" style="text-align: right;">${formatCurrency(todayRev)}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Setup table sorting click listeners
 */
function setupTableSorting() {
  const headers = document.querySelectorAll('.leaderboard-table th[data-sort]');
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (sortColumn === col) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDirection = 'desc'; // Default to desc for metrics
      }

      // Update header indicators
      headers.forEach(h => {
        h.classList.remove('sorted');
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.textContent = '';
      });

      th.classList.add('sorted');
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = sortDirection === 'asc' ? '▲' : '▼';
      }

      renderLeaderboard(currentLeaderboardData);
    });
  });
}

/**
 * Main Data Fetch & Render Loop
 */
export async function loadDashboard(reportDate) {
  currentReportDate = reportDate;
  
  const dateSelect = document.getElementById('reportDatePicker');
  if (dateSelect) dateSelect.value = reportDate;

  const dateBadge = document.getElementById('reportDateBadge');
  if (dateBadge) dateBadge.textContent = `Date: ${formatDateDMY(reportDate)}`;

  setLoadingState(true);
  clearAlert();

  try {
    const rawData = await fetchDashboardData(reportDate);
    setLoadingState(false);

    if (!rawData) {
      showAlert('info', 'No Data Available', `No metrics returned from Supabase for date ${reportDate}.`);
      renderKPIs({});
      renderLeaderboard([]);
      return;
    }

    // Handle array or object RPC payload wrapper
    const payload = Array.isArray(rawData) ? rawData[0] : rawData;
    if (!payload) {
      renderKPIs({});
      renderLeaderboard([]);
      return;
    }


    const kpis = payload.kpi_cards || {};
    const dailyMetrics = payload.daily_metrics || [];
    const monthlyMetrics = payload.monthly_metrics || [];
    const leaderboard = payload.leaderboard_metrics || payload.leaderboard || [];

    // Render all components
    renderKPIs(kpis);
    renderDailySalesChart('dailySalesChart', dailyMetrics);
    renderDailyRevenueChart('dailyRevenueChart', dailyMetrics);
    renderMonthlySalesChart('monthlySalesChart', monthlyMetrics);

    currentLeaderboardData = leaderboard;
    renderLeaderboard(currentLeaderboardData);

    const hasNoData = (!kpis.today_sales && !kpis.mtd_sales && (!dailyMetrics || dailyMetrics.length === 0));
    if (hasNoData) {
      showAlert(
        'info',
        'No Sales Recorded For Selected Date',
        `No transaction records were found in Supabase for ${formatDateDMY(reportDate)}. The database sample dataset contains records up to May 2026. Click below to load sample dataset (2026-02-10).`,
        `Date queried: ${reportDate}`,
        {
          id: 'btnLoadSampleData',
          label: '📊 Load Sample Data (2026-02-10)',
          onClick: () => {
            const sampleDate = '2026-02-10';
            const dateInput = document.getElementById('reportDatePicker');
            if (dateInput) dateInput.value = sampleDate;
            loadDashboard(sampleDate);
          }
        }
      );
    }

  } catch (err) {
    setLoadingState(false);
    console.error('Failed to load dashboard:', err);

    showAlert(
      'error',
      'Supabase Database Error',
      `Failed to fetch metrics for ${reportDate}: ${err.message}`,
      err.message
    );

    // Reset KPI displays to error / "--" indicators
    const kpiIds = [
      'valTodaySales',
      'valTodayRevenue',
      'valMtdSales',
      'valMtdRevenue',
      'valTodayAov',
      'valMtdAov',
      'valPrevMonthSales',
      'valPrevMonthRevenue',
    ];
    kpiIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });

    renderLeaderboard([]);
  }
}

// Theme Management
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

/**
 * Initialization
 */
async function getAvailableReportDates() {
  try {
    const dates = await fetchAvailableReportDates();
    if (Array.isArray(dates) && dates.length > 0) {
      return [...new Set(dates)].sort((a, b) => b.localeCompare(a));
    }
  } catch (error) {
    console.warn('get_available_report_dates RPC unavailable, falling back to date-range scan:', error.message);
  }

  const rangeStart = '2026-01-01';
  const rangeEnd = '2026-05-31';
  const dates = getDateRange(rangeStart, rangeEnd);
  const validDates = [];

  for (const date of dates) {
    try {
      const payload = await fetchDashboardData(date);
      const list = Array.isArray(payload) ? payload[0] : payload;
      const hasDailyMetrics = !!(list && Array.isArray(list.daily_metrics) && list.daily_metrics.length > 0);
      const hasLeaderboard = !!(list && Array.isArray(list.leaderboard_metrics) && list.leaderboard_metrics.length > 0);
      const hasKpiValues = !!(list && list.kpi_cards && (
        Number(list.kpi_cards.today_sales) > 0 || Number(list.kpi_cards.mtd_sales) > 0 || Number(list.kpi_cards.today_revenue) > 0 || Number(list.kpi_cards.mtd_revenue) > 0
      ));

      if (hasDailyMetrics || hasLeaderboard || hasKpiValues) {
        validDates.push(date);
      }
    } catch (error) {
      // Ignore dates without data. Some dates in the sample range are empty.
    }
  }

  return [...new Set(validDates)].sort((a, b) => b.localeCompare(a));
}

function renderReportDateOptions(dates) {
  const dateSelect = document.getElementById('reportDatePicker');
  if (!dateSelect) return;

  const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  availableReportDates = sortedDates;

  dateSelect.innerHTML = sortedDates.length
    ? sortedDates.map((date) => `<option value="${date}">${date}</option>`).join('')
    : '<option value="">No dates available</option>';

  if (sortedDates.length > 0) {
    const preferredDate = sortedDates.includes(currentReportDate) ? currentReportDate : sortedDates[0];
    currentReportDate = preferredDate;
    dateSelect.value = preferredDate;
  }
}

async function init() {
  const btnRefresh = document.getElementById('btnRefresh');
  const btnThemeToggle = document.getElementById('btnThemeToggle');

  // Initialize theme (default to light mode)
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      loadDashboard(currentReportDate);
    });
  }

  const dateSelect = document.getElementById('reportDatePicker');
  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        loadDashboard(e.target.value);
      }
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadDashboard(dateSelect?.value || currentReportDate);
    });
  }

  setupTableSorting();

  try {
    const validDates = await getAvailableReportDates();
    renderReportDateOptions(validDates);
    if (!validDates.length) {
      showAlert('warning', 'No Available Dates', 'No valid report dates were found in the Supabase sample dataset.');
      return;
    }
  } catch (error) {
    console.error('Failed to discover available report dates:', error);
    showAlert('error', 'Date Discovery Failed', 'Unable to load the valid report dates from Supabase.', error.message);
    renderReportDateOptions([]);
    return;
  }

  // Initial Load
  loadDashboard(currentReportDate || availableReportDates[0] || '2026-02-10');
}

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
