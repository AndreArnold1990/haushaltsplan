/**
 * @module dashboard
 * Rendert das Dashboard: Monats-Zusammenfassung, Kategorie-Donut-Chart,
 * Verlauf-Balkendiagramm und Gemeinsame-Ausgaben-Bilanz.
 */

import { config }                        from './config.js';
import { appData, saveData, currentUser } from './store.js';
import { t }                              from './i18n.js';
import { fmt, getCurrentMonth, monthLabel, txsForMonth, isIncome, isPendingTx,
         getCat, catName, getPersonName, getOtherUser, toast, safeColor, escHtml } from './utils.js';

/** @type {import('chart.js').Chart|null} */
let chartCategory = null;
/** @type {import('chart.js').Chart|null} */
let chartHistory  = null;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Rendert das gesamte Dashboard.
 */
export function renderDashboard() {
  const m      = getCurrentMonth();
  const txs    = txsForMonth(m).filter(tx => !isPendingTx(tx));
  const shares = _myShareTxs(txs);

  let inc = 0, exp = 0;
  shares.forEach(tx => {
    if (isIncome(tx)) inc += tx.amount; else exp += tx.amount;
  });
  const bal = inc - exp;

  document.getElementById('monthIncome').textContent  = fmt(inc);
  document.getElementById('monthExpense').textContent = fmt(exp);

  const balEl = document.getElementById('monthBalance');
  balEl.textContent = fmt(bal);
  balEl.style.color = bal >= 0 ? 'var(--income)' : 'var(--expense)';

  _renderCategoryChart(shares);
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
    // Kein createdBy-Fallback bei 'full': paidBySub MUSS explizit gesetzt sein.
    const paidBySub = splitType === 'full'
      ? tx.paidBySub
      : (tx.paidBySub || tx.createdBy?.sub);

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
 * Gibt den Betrag zurück, der dem aktuellen Nutzer aus einer Transaktion
 * als Kosten/Einnahmen zuzurechnen ist (Kostenaufteilungs-Modell):
 *
 *   settlement        → null  (reine Verrechnung, nie in Totals)
 *   personal          → voller Betrag, aber nur für den Ersteller
 *   equal / shared    → immer amount/2 für BEIDE Nutzer
 *   full (ich zahlte) → 0 € für mich (anderer trägt die Kosten)
 *   full (anderer z.) → voller Betrag für mich (ich trage die Kosten)
 *
 * Beispiel: A zahlt 100 € equal-split
 *   → A sieht 50 € Ausgaben, B sieht 50 € Ausgaben
 *   → Bilanz: B schuldet A 50 € (separat in calculateSharedBalance)
 *
 * @param {import('./store.js').Transaction} tx
 * @returns {number|null}
 */
function _myShare(tx) {
  const sub = currentUser?.sub;

  if (tx.splitType === 'settlement') return null;

  if (tx.splitType === 'equal' || tx.splitType === 'shared') {
    return Math.round((tx.amount / 2) * 100) / 100;
  }

  if (tx.splitType === 'full') {
    // Kein createdBy-Fallback: bei 'full' MUSS paidBySub explizit gesetzt sein.
    // Der createdBy-Fallback wäre nur für 'full_me' korrekt, aber falsch für 'full_other'.
    const paidBySub = tx.paidBySub;
    if (!paidBySub) return null;         // Zahler unbekannt → aus Totals ausschließen
    if (paidBySub === sub) return 0;     // Ich habe gezahlt → Erstattung steht aus → 0 Ausgabe
    return tx.amount;                    // Anderer hat gezahlt → ich trage den vollen Betrag
  }

  // Personal: nur eigene Transaktionen zählen
  if (sub && tx.createdBy?.sub !== sub) return null;
  return tx.amount;
}

/**
 * Gibt eine modifizierte Transaktionsliste zurück, bei der jedes
 * `amount`-Feld den Anteil des aktuellen Nutzers enthält.
 * Transaktionen mit null-Anteil (Settlement, fremde Personal-Tx) werden entfernt.
 *
 * @param {import('./store.js').Transaction[]} txs
 * @returns {Array<import('./store.js').Transaction & { amount: number }>}
 */
function _myShareTxs(txs) {
  return txs
    .map(tx => {
      const share = _myShare(tx);
      if (share === null) return null;
      return { ...tx, amount: share };
    })
    .filter(Boolean)
    .filter(tx => tx.amount > 0);
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
    if (c) { labels.push(catName(c)); values.push(v); colors.push(safeColor(c.color)); }
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
    _myShareTxs(txsForMonth(m).filter(tx => !isPendingTx(tx))).forEach(tx => {
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
