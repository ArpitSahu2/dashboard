import Chart from 'chart.js/auto';

let dailySalesChartInstance = null;
let dailyRevenueChartInstance = null;
let monthlySalesChartInstance = null;

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatNumber = (val) => {
  return new Intl.NumberFormat('en-US').format(val || 0);
};

/**
 * Format a date string YYYY-MM-DD to "MMM D" e.g. "Aug 15"
 */
const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateStr;
};

/**
 * Format month string YYYY-MM to "MMM YYYY" e.g. "Aug 2026"
 */
const formatMonthLabel = (monthStr) => {
  if (!monthStr) return '';
  const parts = String(monthStr).split('-');
  if (parts.length >= 2) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return monthStr;
};

const getChartTheme = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    textColor: isDark ? '#94a3b8' : '#64748b',
    gridColor: isDark ? '#243144' : '#f1f5f9',
    tooltipBg: isDark ? '#1e293b' : '#0f172a',
  };
};

export function renderDailySalesChart(canvasId, dailyMetrics) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (dailySalesChartInstance) {
    dailySalesChartInstance.destroy();
    dailySalesChartInstance = null;
  }

  if (!dailyMetrics || !Array.isArray(dailyMetrics) || dailyMetrics.length === 0) {
    return;
  }

  const labels = dailyMetrics.map((item) => formatDateLabel(item.order_date || item.date || item.day || item.report_date));
  const data = dailyMetrics.map((item) => Number(item.no_of_sales ?? item.sales ?? item.order_count ?? item.orders ?? item.count ?? 0));

  const theme = getChartTheme();

  dailySalesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Sales (Units)',
          data,
          borderColor: '#2563eb', // Indigo-Blue
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 6,
          boxPadding: 4,
          callbacks: {
            label: (context) => ` Sales: ${formatNumber(context.parsed.y)} units`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: theme.textColor,
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: theme.gridColor,
            drawBorder: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: theme.textColor,
            precision: 0,
          },
        },
      },
    },
  });
}

export function renderDailyRevenueChart(canvasId, dailyMetrics) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (dailyRevenueChartInstance) {
    dailyRevenueChartInstance.destroy();
    dailyRevenueChartInstance = null;
  }

  if (!dailyMetrics || !Array.isArray(dailyMetrics) || dailyMetrics.length === 0) {
    return;
  }

  const labels = dailyMetrics.map((item) => formatDateLabel(item.order_date || item.date || item.day || item.report_date));
  const data = dailyMetrics.map((item) => Number(item.total_revenue ?? item.revenue ?? item.amount ?? 0));

  const theme = getChartTheme();

  dailyRevenueChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Revenue ($)',
          data,
          backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
          hoverBackgroundColor: '#059669',
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (context) => ` Revenue: ${formatCurrency(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: theme.textColor,
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: theme.gridColor,
            drawBorder: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: theme.textColor,
            callback: (val) => '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val),
          },
        },
      },
    },
  });
}

export function renderMonthlySalesChart(canvasId, monthlyMetrics) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (monthlySalesChartInstance) {
    monthlySalesChartInstance.destroy();
    monthlySalesChartInstance = null;
  }

  if (!monthlyMetrics || !Array.isArray(monthlyMetrics) || monthlyMetrics.length === 0) {
    return;
  }

  const labels = monthlyMetrics.map((item) => formatMonthLabel(item.month || item.date || item.period));
  const salesData = monthlyMetrics.map((item) => Number(item.no_of_sales ?? item.sales ?? item.total_sales ?? item.orders ?? 0));
  const revenueData = monthlyMetrics.map((item) => Number(item.total_revenue ?? item.revenue ?? item.amount ?? 0));

  const theme = getChartTheme();

  monthlySalesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Sales (Units)',
          data: salesData,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          yAxisID: 'ySales',
          order: 2,
        },
        {
          type: 'line',
          label: 'Revenue ($)',
          data: revenueData,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          pointRadius: 4,
          borderWidth: 2.5,
          yAxisID: 'yRevenue',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter, sans-serif', size: 11 },
            color: theme.textColor,
          },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              if (context.dataset.yAxisID === 'yRevenue') {
                return ` Revenue: ${formatCurrency(context.parsed.y)}`;
              }
              return ` Sales: ${formatNumber(context.parsed.y)} units`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: theme.textColor,
          },
        },
        ySales: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          grid: {
            color: theme.gridColor,
            drawBorder: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: '#3b82f6',
            precision: 0,
          },
        },
        yRevenue: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: {
            display: false,
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: '#10b981',
            callback: (val) => '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val),
          },
        },
      },
    },
  });
}
