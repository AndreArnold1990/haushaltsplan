/**
 * @module dashboard
 * Rendert das Dashboard: Monats-Zusammenfassung, Kategorie-Donut-Chart und Verlauf-Balkendiagramm.
 */

import { config }                    from './config.js';
import { appData, currentUser }      from './store.js';
import { t }                         from './i18n.js';
import { fmt, getCurrentMonth, monthLabel, txsForMonth, isIncome, getCat } from './utils.js';

/** @type {import('chart.js').Chart|null} */
let chartCategory = null;
/** @type {import('chart.js').Chart|null} */
let chartHistory  = null;

/**
 * Rendert das gesamte Dashboard.
 */
export function renderDashboard() {
  const m   = getCurrentMonth();
  const txs = txsForMonth(m);

  let inc = 0, exp = 0;
  txs.forEach(t => { if (isIncome(t)) inc += t.amount; else exp += t.amount; });
  const bal = inc - exp;

  document.getElementById('monthIncome').textContent  = fmt(inc);
  document.getElementById('monthExpense').textContent = fmt(exp);

  const balEl = document.getElementById('monthBalance');
  balEl.textContent = fmt(bal);
  balEl.style.color = bal >= 0 ? 'var(--income)' : 'var(--expense)';

  _renderCategoryChart(txs);
  _renderHistoryChart();
  _renderPersonalSummary(txs);
}

/**
 * Rendert die "Eigene Ausgaben"-Sektion gefiltert nach currentUser.sub.
 * @param {Array} allTxs - Alle Transaktionen des aktuellen Monats
 * @package
 */
function _renderPersonalSummary(allTxs) {
  const card = document.getElementById('personalSummaryCard');
  if (!card) return;

  const sub = currentUser?.sub;
  if (!sub) { card.style.display = 'none'; return; }

  const myTxs = allTxs.filter(tx => tx.createdBy?.sub === sub);
  let inc = 0, exp = 0;
  myTxs.forEach(tx => { if (isIncome(tx)) inc += tx.amount; else exp += tx.amount; });
  const bal = inc - exp;

  document.getElementById('myIncome').textContent  = fmt(inc);
  document.getElementById('myExpense').textContent = fmt(exp);

  const balEl = document.getElementById('myBalance');
  balEl.textContent = fmt(bal);
  balEl.style.color = bal >= 0 ? 'var(--income)' : 'var(--expense)';

  card.style.display = 'block';
}

/**
 * @param {import('./store.js').Transaction[]} txs
 * @package
 */
function _renderCategoryChart(txs) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  if (chartCategory) { chartCategory.destroy(); chartCategory = null; }

  const totals = {};
  txs.filter(tx => !isIncome(tx))
     .forEach(tx => { totals[tx.categoryId] = (totals[tx.categoryId] || 0) + tx.amount; });

  const labels = [], values = [], colors = [];
  Object.entries(totals).forEach(([id, v]) => {
    const c = getCat(id);
    if (c) { labels.push(c.name); values.push(v); colors.push(c.color); }
  });
  if (!values.length) return;

  chartCategory = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 8 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend:  { position: 'bottom', labels: { font: { size: 11 }, padding: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.raw)}` } },
      },
    },
  });
}

/** @package */
function _renderHistoryChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  if (chartHistory) { chartHistory.destroy(); chartHistory = null; }

  const months = [];
  const now    = new Date();
  for (let i = config.historyMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const incData = [], expData = [];
  months.forEach(m => {
    let inc = 0, exp = 0;
    txsForMonth(m).forEach(tx => { if (isIncome(tx)) inc += tx.amount; else exp += tx.amount; });
    incData.push(inc);
    expData.push(exp);
  });

  chartHistory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   months.map(monthLabel),
      datasets: [
        { label: t('datasetIncome'), data: incData, backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', borderWidth: 2, borderRadius: 6, borderSkipped: false },
        { label: t('datasetExpense'), data: expData, backgroundColor: 'rgba(239,68,68,0.2)',  borderColor: '#ef4444', borderWidth: 2, borderRadius: 6, borderSkipped: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index' },
      plugins: {
        legend:  { position: 'top', labels: { font: { size: 12 }, usePointStyle: true } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.raw)}` } },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => `€${v.toLocaleString('de-DE')}`, font: { size: 11 } } },
        x: { grid: { display: false } },
      },
    },
  });
}
