/**
 * @module dashboard
 * Rendert das Dashboard: Monats-Zusammenfassung, Kategorie-Donut-Chart,
 * Verlauf-Balkendiagramm und Gemeinsame-Ausgaben-Bilanz.
 */

import { config }                        from './config.js';
import { appData, saveData, currentUser } from './store.js';
import { t }                              from './i18n.js';
import { fmt, getCurrentMonth, monthLabel, txsForMonth, isIncome, isPendingTx,
         getCat, getPersonName, getOtherUser, toast, safeColor, escHtml } from './utils.js';

/** @type {import('chart.js').Chart|null} */
let chartCategory = null;
/** @type {import('chart.js').Chart|null} */
let chartHistory  = null;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Rendert das gesamte Dashboard.
 */
export function renderDashboard() {
  const m    = getCurrentMonth();
  const txs  = txsForMonth(m).filter(tx => !isPendingTx(tx));
  const mine = _myTxs(txs);

  let inc = 0, exp = 0;
  mine.forEach(tx => {
    if (isIncome(tx)) inc += tx.amount; else exp += tx.amount;
  });
  const bal = inc - exp;

  document.getElementById('monthIncome').textContent  = fmt(inc);
  document.getElementById('monthExpense').textContent = fmt(exp);

  const balEl = document.getElementById('monthBalance');
  balEl.textContent = fmt(bal);
  balEl.style.color = bal >= 0 ? 'var(--income)' : 'var(--expense)';

  _renderCategoryChart(mine);
  _renderHistoryChart();
  _renderSharedSummary();
}

/**
 * Berechnet die Netto-Bilanz aller geteilten Transaktionen + Ausgleiche
 * über ALLE Monate (Schulden laufen monatsübergreifend).
 *
 * Positiv  → andere schulden mir Geld
 * Negativ  → ich schulde anderen Geld
 *
 * @returns {number}
 */
export function calculateSharedBalance() {
  const sub = currentUser?.sub;
  if (!sub) return 0;
  let balance = 0;

  appData.transactions.filter(tx => !isPendingTx(tx)).forEach(tx => {
    // Normalisiere legacy 'shared' → 'equal' mit paidBySub = createdBy.sub
    const splitType = tx.splitType === 'shared' ? 'equal' : tx.splitType;
    const paidBySub = tx.paidBySub || tx.createdBy?.sub;

    if ((splitType === 'equal' || splitType === 'full') && !isIncome(tx)) {
      const share = splitType === 'equal'
        ? Math.round((tx.amount / 2) * 100) / 100
        : tx.amount;

      if (paidBySub === sub) {
        balance += share;   // Ich habe gezahlt → andere schulden mir
      } else if (paidBySub) {
        balance -= share;   // Andere haben gezahlt → ich schulde
      }
    } else if (splitType === 'settlement') {
      if (tx.createdBy?.sub === sub) {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    }
  });

  return Math.round(balance * 100) / 100;
}

/**
 * Öffnet das Settlement-Modal vorausgefüllt mit dem offenen Betrag.
 */
export function openSettlementModal() {
  const balance = calculateSharedBalance();
  const amount  = Math.abs(balance);
  document.getElementById('settlementDate').value   = new Date().toISOString().split('T')[0];
  document.getElementById('settlementAmount').value = amount.toFixed(2);
  document.getElementById('settlementModal').classList.add('is-open');
}

/**
 * Schließt das Settlement-Modal.
 */
export function closeSettlementModal() {
  document.getElementById('settlementModal').classList.remove('is-open');
}

/**
 * Speichert einen Ausgleich als Settlement-Transaktion.
 */
export function saveSettlement() {
  const date   = document.getElementById('settlementDate').value;
  const amount = parseFloat(document.getElementById('settlementAmount').value);
  const sub    = currentUser?.sub;

  if (!date || !amount || amount <= 0 || !sub) return;

  appData.transactions.push({
    id:          'tx_' + Date.now(),
    date,
    amount:      Math.round(amount * 100) / 100,
    categoryId:  '',
    description: t('btnSettle'),
    createdBy:   { sub },
    splitType:   'settlement',
  });

  saveData();
  closeSettlementModal();
  renderDashboard();
  toast(t('toastSettlementSaved'));
}

// ── Interne Hilfsmittel ───────────────────────────────────────────────────────

/**
 * Filtert eine Transaktionsliste auf die aus Sicht des aktuellen Nutzers
 * relevanten Einträge für Einnahmen/Ausgaben-Berechnungen:
 *
 *   - Settlements:  immer ausgeschlossen (reine Verrechnungen)
 *   - Persönlich:   nur eigene Transaktionen (createdBy === ich)
 *   - Geteilt (equal/full): nur wenn ich der Zahler bin (paidBySub === ich)
 *     → User B zahlt nicht, also fließt die Transaktion nicht in User Bs Monatstotals
 *
 * @param {import('./store.js').Transaction[]} txs
 * @returns {import('./store.js').Transaction[]}
 */
function _myTxs(txs) {
  const sub = currentUser?.sub;
  return txs.filter(tx => {
    if (tx.splitType === 'settlement') return false;
    const isShared = tx.splitType === 'equal' || tx.splitType === 'full' || tx.splitType === 'shared';
    if (isShared) {
      const paidBySub = tx.paidBySub || tx.createdBy?.sub;
      return paidBySub === sub; // Nur zählen wenn ich gezahlt habe
    }
    // Persönlich: nur eigene Transaktionen
    return !sub || tx.createdBy?.sub === sub;
  });
}

/**
 * Gibt den Vornamen der anderen Person zurück (aus appData.users).
 * @returns {string}
 */
function _getOtherPersonName() {
  return getOtherUser()?.firstName || t('partnerFallback');
}

/**
 * Rendert die "Gemeinsame Ausgaben"-Karte mit Netto-Bilanz.
 * @package
 */
function _renderSharedSummary() {
  const card = document.getElementById('sharedSummaryCard');
  if (!card) return;

  const hasShared = appData.transactions.some(
    tx => ['shared', 'equal', 'full', 'settlement'].includes(tx.splitType)
  );
  if (!hasShared) { card.classList.remove('is-visible'); return; }

  const balance     = calculateSharedBalance();
  const absBalance  = Math.abs(balance);
  const settleBtn   = document.getElementById('btnSettle');
  const display     = document.getElementById('sharedBalanceDisplay');

  card.classList.add('is-visible');

  if (Math.abs(balance) < 0.01) {
    // Ausgeglichen
    display.innerHTML = `<div class="balance-settled">${t('balanceSettled')}</div>`;
    settleBtn?.classList.remove('is-visible');
    return;
  }

  if (balance > 0) {
    // Andere schulden mir
    const otherName = escHtml(_getOtherPersonName());
    display.innerHTML = `
      <div class="balance-display balance-positive">
        <span class="balance-label">${t('balanceOwesMe', otherName, fmt(absBalance))}</span>
      </div>`;
    settleBtn?.classList.remove('is-visible');
  } else {
    // Ich schulde
    display.innerHTML = `
      <div class="balance-display balance-negative">
        <span class="balance-label">${t('balanceIOwe', fmt(absBalance))}</span>
      </div>`;
    settleBtn?.classList.add('is-visible');
  }
}

/**
 * @param {import('./store.js').Transaction[]} txs
 * @package
 */
function _renderCategoryChart(txs) {
  const canvas  = document.getElementById('categoryChart');
  const emptyEl = document.getElementById('categoryChartEmpty');
  const ctx     = canvas.getContext('2d');
  if (chartCategory) { chartCategory.destroy(); chartCategory = null; }

  const totals = {};
  txs.filter(tx => !isIncome(tx) && tx.splitType !== 'settlement')
     .forEach(tx => { totals[tx.categoryId] = (totals[tx.categoryId] || 0) + tx.amount; });

  const labels = [], values = [], colors = [];
  Object.entries(totals).forEach(([id, v]) => {
    const c = getCat(id);
    if (c) { labels.push(c.name); values.push(v); colors.push(safeColor(c.color)); }
  });

  // Empty state
  if (!values.length) {
    canvas.style.display  = 'none';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  canvas.style.display  = '';
  if (emptyEl) emptyEl.style.display = 'none';

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
    _myTxs(txsForMonth(m).filter(tx => !isPendingTx(tx))).forEach(tx => {
      if (isIncome(tx)) inc += tx.amount; else exp += tx.amount;
    });
    incData.push(inc);
    expData.push(exp);
  });

  chartHistory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   months.map(monthLabel),
      datasets: [
        { label: t('datasetIncome'),  data: incData, backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', borderWidth: 2, borderRadius: 6, borderSkipped: false },
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
