const API_BASE_URL = '/api';

const timeRangeSelect = document.getElementById("timeRange");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
const timeRangeControls = document.getElementById("timeRangeControls");
const monthSelectorControls = document.getElementById("monthSelectorControls");
const chartTypeSelect = document.getElementById("chartType");
const totalIncomeDisplay = document.getElementById("totalIncome");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const netLabelDisplay = document.getElementById("netLabel");
const netAmountDisplay = document.getElementById("netAmount");
const startingBalanceDisplay = document.getElementById("startingBalance");
const balanceLabelDisplay = document.getElementById("balanceLabel");
const currentBalanceDisplay = document.getElementById("currentBalance");
const refreshDataBtn = document.getElementById("refreshDataBtn");

let chart = null;
let accounts = [];
let activeAccountId = null;
let transactions = [];
let viewMode = "timeRange";

async function loadAccountsFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to load accounts (${response.status})`);
    }
    const loadedAccounts = await response.json();
    return loadedAccounts.map((account) => ({
      ...account,
      transactions: (account.transactions || []).filter((txn) => !txn.isRecurringInstance),
    }));
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
}

async function loadActiveAccountIdFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/active-account`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to load active account (${response.status})`);
    }
    const data = await response.json();
    return data.activeAccountId;
  } catch (error) {
    console.error('Error loading active account:', error);
    return null;
  }
}

function selectActiveAccountTransactions() {
  const activeAccount = accounts.find(acc => acc.id === activeAccountId) || accounts[0];
  if (!activeAccount || !Array.isArray(activeAccount.transactions)) {
    return [];
  }
  return activeAccount.transactions;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function atStartOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getRangeDates(days) {
  const endDate = atStartOfDay(new Date());
  const startDate = new Date(endDate);

  if (days === 365) {
    startDate.setFullYear(startDate.getFullYear() - 1);
    return { startDate, endDate };
  }

  startDate.setDate(startDate.getDate() - (days - 1));
  return { startDate, endDate };
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(baseDate, monthsToAdd, preferredDay) {
  const result = new Date(baseDate);
  const targetMonth = result.getMonth() + monthsToAdd;
  const targetYear = result.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const maxDay = getDaysInMonth(targetYear, normalizedMonth);
  result.setFullYear(targetYear, normalizedMonth, Math.min(preferredDay, maxDay));
  return result;
}

function navigateToCalendarDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return;
  }

  window.location.href = `index.html?date=${encodeURIComponent(dateKey)}`;
}

function getNextRecurrenceDate(dateStr, recurrence, preferredDay = null) {
  const date = new Date(dateStr + 'T00:00:00');
  const anchorDay = preferredDay !== null ? preferredDay : date.getDate();

  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'bi-weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setTime(addMonthsClamped(date, 1, anchorDay).getTime());
      break;
    case 'quarterly':
      date.setTime(addMonthsClamped(date, 3, anchorDay).getTime());
      break;
    case 'yearly': {
      const year = date.getFullYear() + 1;
      const month = date.getMonth();
      date.setFullYear(year, month, Math.min(anchorDay, getDaysInMonth(year, month)));
      break;
    }
    default:
      return null;
  }

  return toDateKey(date);
}

function expandRecurringTransactions(startDate, endDate) {
  const expanded = [];
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);

  for (const txn of transactions) {
    const excludedDates = new Set(Array.isArray(txn.excludedDates) ? txn.excludedDates : []);
    const recurrenceEndDate = typeof txn.recurrenceEndDate === 'string' ? txn.recurrenceEndDate : null;

    if (txn.date >= startKey && txn.date <= endKey && !excludedDates.has(txn.date)) {
      expanded.push(txn);
    }

    if (txn.recurrence && txn.recurrence !== 'one-time') {
      const anchorDay = new Date(txn.date + 'T00:00:00').getDate();
      let currentDate = txn.date;

      while (true) {
        const nextDate = getNextRecurrenceDate(currentDate, txn.recurrence, anchorDay);
        if (!nextDate || nextDate > endKey) break;
        if (recurrenceEndDate && nextDate > recurrenceEndDate) break;

        if (nextDate >= startKey && !excludedDates.has(nextDate)) {
          expanded.push({
            ...txn,
            id: `${txn.id}-recur-${nextDate}`,
            date: nextDate,
            isRecurring: true,
            originalId: txn.id,
          });
        }

        currentDate = nextDate;
      }
    }
  }

  return expanded;
}

function getBalanceBefore(dateKey) {
  const targetDate = new Date(dateKey + 'T00:00:00');
  const expandStart = new Date(targetDate);
  expandStart.setFullYear(expandStart.getFullYear() - 10);

  const allTransactions = expandRecurringTransactions(expandStart, targetDate);

  return allTransactions
    .filter((item) => item.date < dateKey)
    .reduce((sum, item) => sum + item.amount, 0);
}

function prepareChartDataForRange(startDate, endDate) {
  const allTransactions = expandRecurringTransactions(startDate, endDate);
  const dailyData = new Map();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = toDateKey(d);
    dailyData.set(dateKey, { income: 0, expenses: 0, net: 0 });
  }

  for (const txn of allTransactions) {
    if (dailyData.has(txn.date)) {
      const data = dailyData.get(txn.date);
      if (txn.amount > 0) {
        data.income += txn.amount;
      } else {
        data.expenses += Math.abs(txn.amount);
      }
      data.net += txn.amount;
    }
  }

  const startKey = toDateKey(startDate);
  const labels = [];
  const incomeData = [];
  const expensesData = [];
  const balanceData = [];
  let runningBalance = getBalanceBefore(startKey);
  const startingBalance = runningBalance;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const [date, data] of dailyData) {
    runningBalance += data.net;
    labels.push(date);
    incomeData.push(data.income);
    expensesData.push(data.expenses);
    balanceData.push(runningBalance);
    totalIncome += data.income;
    totalExpenses += data.expenses;
  }

  return {
    labels,
    incomeData,
    expensesData,
    balanceData,
    startingBalance,
    endingBalance: balanceData.at(-1) ?? startingBalance,
    totalIncome,
    totalExpenses,
  };
}

function prepareChartData(days) {
  const { startDate, endDate } = getRangeDates(days);
  return prepareChartDataForRange(startDate, endDate);
}

function prepareMonthChartData(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  return prepareChartDataForRange(startDate, endDate);
}

function populateYearSelect() {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  
  // Add current year and nearby years
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.add(i);
  }
  
  // Add years from existing transactions
  for (const txn of transactions) {
    const year = parseInt(txn.date.substring(0, 4));
    years.add(year);
  }
  
  const sortedYears = Array.from(years).sort();
  yearSelect.innerHTML = sortedYears.map(year => 
    `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
  ).join('');
}

function updateChart() {
  let chartData;
  
  if (viewMode === "timeRange") {
    const days = parseInt(timeRangeSelect.value);
    chartData = prepareChartData(days);
  } else {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    chartData = prepareMonthChartData(year, month);
  }
  
  // Update summary stats
  totalIncomeDisplay.textContent = formatCurrency(chartData.totalIncome);
  totalExpensesDisplay.textContent = formatCurrency(chartData.totalExpenses);
  const net = chartData.totalIncome - chartData.totalExpenses;
  if (netLabelDisplay) {
    netLabelDisplay.textContent = 'Balance Change';
  }
  netAmountDisplay.textContent = formatCurrency(net);
  netAmountDisplay.className = net === 0 ? "" : net > 0 ? "positive" : "negative";
  if (startingBalanceDisplay) {
    startingBalanceDisplay.textContent = formatCurrency(chartData.startingBalance);
    startingBalanceDisplay.className = chartData.startingBalance === 0 ? "" : chartData.startingBalance > 0 ? "positive" : "negative";
  }
  if (balanceLabelDisplay) {
    balanceLabelDisplay.textContent = viewMode === 'timeRange' ? 'Current Balance' : 'Ending Balance';
  }
  if (currentBalanceDisplay) {
    currentBalanceDisplay.textContent = formatCurrency(chartData.endingBalance);
    currentBalanceDisplay.className = chartData.endingBalance === 0 ? "" : chartData.endingBalance > 0 ? "positive" : "negative";
  }
  
  if (chart) {
    chart.destroy();
  }
  
  const chartType = chartTypeSelect?.value || 'line';
  const chartCanvas = document.getElementById('incomeExpensesChart');
  const ctx = chartCanvas?.getContext('2d');
  if (!ctx) {
    console.error('Graph canvas is unavailable.');
    return;
  }

  const css = getComputedStyle(document.documentElement);
  const accentStrong = css.getPropertyValue('--accent-strong').trim() || '#c79031';
  const good = css.getPropertyValue('--good').trim() || '#3d876b';
  const bad = css.getPropertyValue('--bad').trim() || '#a63e36';
  const text = css.getPropertyValue('--text').trim() || '#183038';
  const border = css.getPropertyValue('--border').trim() || '#d9c7a4';
  const isPie = chartType === 'pie';
  const balanceColor = accentStrong;
  const incomeImpactData = chartData.incomeData;
  const expenseImpactData = chartData.expensesData.map((value) => -value);
  const baselineData = chartData.labels.map(() => chartData.startingBalance);
  const datasets = isPie
    ? [{
        data: [chartData.totalIncome, chartData.totalExpenses],
        backgroundColor: [good, bad],
        borderColor: [accentStrong, bad],
        borderWidth: 1,
      }]
    : [
        {
          label: 'Income Impact',
          data: incomeImpactData,
          type: chartType === 'bar' ? 'bar' : 'line',
          borderColor: good,
          backgroundColor: chartType === 'line' ? 'rgba(61, 135, 107, 0.1)' : 'rgba(61, 135, 107, 0.5)',
          borderWidth: 1.5,
          tension: 0.35,
          fill: chartType === 'line',
          pointRadius: chartType === 'bar' ? 1 : 0,
          pointHoverRadius: 3,
          yAxisID: 'yBalance',
        },
        {
          label: 'Expense Impact',
          data: expenseImpactData,
          type: chartType === 'bar' ? 'bar' : 'line',
          borderColor: bad,
          backgroundColor: chartType === 'line' ? 'rgba(166, 62, 54, 0.1)' : 'rgba(166, 62, 54, 0.48)',
          borderWidth: 1.5,
          tension: 0.35,
          fill: chartType === 'line',
          pointRadius: chartType === 'bar' ? 1 : 0,
          pointHoverRadius: 3,
          yAxisID: 'yBalance',
        },
        {
          label: 'Starting Balance (Baseline)',
          data: baselineData,
          type: 'line',
          borderColor: 'rgba(199, 144, 49, 0.32)',
          borderDash: [6, 6],
          borderWidth: 1,
          tension: 0,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          yAxisID: 'yBalance',
        },
        {
          label: 'Balance',
          data: chartData.balanceData,
          type: 'line',
          borderColor: balanceColor,
          backgroundColor: 'rgba(199, 144, 49, 0.16)',
          borderWidth: 4,
          tension: 0.2,
          fill: false,
          pointRadius: chartType === 'bar' ? 2 : 1,
          pointHoverRadius: 5,
          pointBackgroundColor: balanceColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          yAxisID: 'yBalance',
        },
      ];

  const todayKey = toDateKey(new Date());
  const todayIndex = isPie ? -1 : chartData.labels.indexOf(todayKey);

  const todayLinePlugin = {
    id: 'todayLine',
    afterDraw(chartInstance) {
      if (todayIndex < 0) return;
      const meta = chartInstance.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data[todayIndex]) return;
      const x = meta.data[todayIndex].x;
      const { top, bottom } = chartInstance.chartArea;
      const ctx2 = chartInstance.ctx;
      ctx2.save();
      ctx2.beginPath();
      ctx2.moveTo(x, top);
      ctx2.lineTo(x, bottom);
      ctx2.strokeStyle = 'rgba(222, 169, 74, 0.85)';
      ctx2.lineWidth = 2;
      ctx2.setLineDash([5, 4]);
      ctx2.stroke();
      ctx2.setLineDash([]);
      // Label
      ctx2.font = '11px sans-serif';
      ctx2.fillStyle = 'rgba(222, 169, 74, 0.95)';
      ctx2.textAlign = 'center';
      ctx2.fillText('Today', x, top - 4);
      ctx2.restore();
    }
  };

  chart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: isPie ? ['Income', 'Expenses'] : chartData.labels,
      datasets
    },
    plugins: isPie ? [] : [todayLinePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, _elements, chartInstance) => {
        if (isPie) {
          return;
        }

        const points = chartInstance.getElementsAtEventForMode(
          event,
          'nearest',
          { intersect: false },
          true,
        );

        if (!points.length) {
          return;
        }

        const pointIndex = points[0].index;
        const selectedDate = chartData.labels[pointIndex];
        navigateToCalendarDate(selectedDate);
      },
      interaction: isPie ? undefined : {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: text,
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || context.label || '';
              const value = isPie ? context.parsed : context.parsed.y;
              return `${label}: ${formatCurrency(value)}`;
            }
          }
        }
      },
      scales: isPie ? undefined : {
        yBalance: {
          type: 'linear',
          position: 'left',
          beginAtZero: false,
          grid: {
            color: border,
          },
          ticks: {
            color: text,
            callback: function(value) {
              return formatCurrency(Number(value));
            }
          }
        },
        x: {
          grid: {
            color: 'rgba(217, 199, 164, 0.45)',
          },
          ticks: {
            color: text,
            maxTicksLimit: 12,
            autoSkip: true,
          }
        }
      }
    }
  });
}

// Event listeners
timeRangeSelect.addEventListener('change', updateChart);

// View mode radio buttons
viewModeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    viewMode = e.target.value;
    
    if (viewMode === 'timeRange') {
      timeRangeControls.classList.remove('hidden');
      monthSelectorControls.classList.add('hidden');
    } else {
      timeRangeControls.classList.add('hidden');
      monthSelectorControls.classList.remove('hidden');
    }
    
    updateChart();
  });
});

// Year and month selects
yearSelect.addEventListener('change', updateChart);
monthSelect.addEventListener('change', updateChart);

if (chartTypeSelect) {
  chartTypeSelect.addEventListener('change', updateChart);
}

// Refresh button
if (refreshDataBtn) {
  refreshDataBtn.addEventListener('click', async () => {
    refreshDataBtn.disabled = true;
    refreshDataBtn.textContent = '🔄 Refreshing...';
    await initialize();
    refreshDataBtn.disabled = false;
    refreshDataBtn.textContent = '🔄 Refresh';
  });
}

// Initialize year selector and render chart
async function initialize() {
  try {
    accounts = await loadAccountsFromAPI();
    activeAccountId = await loadActiveAccountIdFromAPI();
    transactions = selectActiveAccountTransactions();
    populateYearSelect();
    monthSelect.value = new Date().getMonth();
    updateChart();
  } catch (error) {
    console.error('Error initializing graph data:', error);
  }
}

// Reload data when page becomes visible (e.g., when returning from calendar page)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    initialize();
  }
});

initialize();
