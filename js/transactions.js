/**
 * @module transactions
 * Rendert die Transaktions-Listen (persönlich + geteilt) und verwaltet
 * das Hinzufügen/Löschen von Transaktionen.
 */

import { appData, saveData, currentUser } from './store.js';
import { config }                         from './config.js';
import { t }                              from './i18n.js';
import { fmt, fmtDate, monthKey, getCurrentMonth, monthLabel,
         txsForMonth, getCat, isIncome, escHtml, toast } from './utils.js';
import { renderDashboard }                from './dashboard.js';

// ── Hilfsmittel ───────────────────────────────────────────────────────────────

/** Gibt nur die persönlichen Transaktionen des aktuellen Nutzers zurück. */
function _ownTxs() {
  const sub = currentUser?.sub;
  return appData.transactions.filter(tx => {
    const isPersonal = !tx.splitType || tx.splitType === 'personal';
    if (!isPersonal) return false;
    return !sub || tx.createdBy?.sub === sub;
  });
}

/** Gibt alle geteilten Transaktionen zurück (für alle Nutzer sichtbar). */
function _sharedTxs() {
  return appData.transactions.filter(tx => tx.splitType === 'shared');
}

// ── Modul-öffentliche Funktionen ──────────────────────────────────────────────

/**
 * Initialisiert das Transaktions-Tab (Monatsfilter + beide Tabellen).
 */
export function renderTransactions() {
  // Monatsfilter: Monate aus eigenen persönlichen UND allen geteilten Transaktionen
  const ownMonths    = _ownTxs().map(tx => monthKey(tx.date));
  const sharedMonths = _sharedTxs().map(tx => monthKey(tx.date));
  const allMonths    = [...new Set([...ownMonths, ...sharedMonths])].sort().reverse();

  const cur = getCurrentMonth();
  if (!allMonths.includes(cur)) allMonths.unshift(cur);

  const sel = document.getElementById('txMonthFilter');
  sel.innerHTML = allMonths
    .map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${monthLabel(m)} (${m})</option>`)
    .join('');

  renderTransactionTable();
  renderSharedTransactionTable();
}

/**
 * Befüllt das Kategorie-Dropdown im Add-Modal.
 */
export function populateCategorySelect() {
  const sel = document.getElementById('txCategory');
  const inc = appData.categories.filter(c => c.type === 'income');
  const exp = appData.categories.filter(c => c.type === 'expense');

  sel.innerHTML = '';
  if (inc.length) {
    const g = document.createElement('optgroup');
    g.label = t('groupIncome');
    inc.forEach(c => g.appendChild(new Option(c.name, c.id)));
    sel.appendChild(g);
  }
  if (exp.length) {
    const g = document.createElement('optgroup');
    g.label = t('groupExpense');
    exp.forEach(c => g.appendChild(new Option(c.name, c.id)));
    sel.appendChild(g);
  }
}

/**
 * Rendert die persönliche Transaktions-Tabelle für den gewählten Monat.
 * Zeigt nur eigene, persönliche Transaktionen (splitType 'personal' oder leer).
 */
export function renderTransactionTable() {
  const m   = document.getElementById('txMonthFilter').value;
  const sub = currentUser?.sub;
  const txs = txsForMonth(m)
    .filter(tx => {
      const isPersonal = !tx.splitType || tx.splitType === 'personal';
      return isPersonal && (!sub || tx.createdBy?.sub === sub);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const box = document.getElementById('transactionTableContainer');

  if (!txs.length) {
    box.innerHTML = `<div class="empty-state">${t('emptyTx')}</div>`;
    return;
  }

  const rows = txs.map(tx => {
    const cat = getCat(tx.categoryId);
    const inc = isIncome(tx);
    const badge = cat
      ? `<span class="cat-badge" style="background:${cat.color}22;color:${cat.color}">
           <span class="cat-dot" style="background:${cat.color}"></span>${escHtml(cat.name)}
         </span>`
      : '&mdash;';
    return `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td>${escHtml(tx.description)}</td>
      <td>${badge}</td>
      <td class="${inc ? 'amount-income' : 'amount-expense'}">${inc ? '+' : '-'}${fmt(tx.amount)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteTransaction('${tx.id}')">${t('btnDelete')}</button></td>
    </tr>`;
  }).join('');

  box.innerHTML = `<table>
    <thead>
      <tr>
        <th>${t('thDate')}</th><th>${t('thDescription')}</th>
        <th>${t('thCategory')}</th><th>${t('thAmount')}</th><th>${t('thAction')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Rendert die geteilten Transaktionen für den gewählten Monat.
 * Sichtbar für alle Nutzer; zeigt Gesamtbetrag + Anteil pro Person.
 */
export function renderSharedTransactionTable() {
  const m          = document.getElementById('txMonthFilter').value;
  const perPerson  = config.sharedPersonCount || 2;
  const txs        = txsForMonth(m)
    .filter(tx => tx.splitType === 'shared')
    .sort((a, b) => b.date.localeCompare(a.date));

  const box = document.getElementById('sharedTransactionTableContainer');

  if (!txs.length) {
    box.innerHTML = `<div class="empty-state">${t('emptySharedTx')}</div>`;
    return;
  }

  const rows = txs.map(tx => {
    const cat     = getCat(tx.categoryId);
    const inc     = isIncome(tx);
    const share   = Math.round((tx.amount / perPerson) * 100) / 100;
    const isOwn   = currentUser?.sub && tx.createdBy?.sub === currentUser.sub;
    const paidBy  = isOwn ? t('labelMe') : escHtml(tx.paidByName || '?');
    const badge   = cat
      ? `<span class="cat-badge" style="background:${cat.color}22;color:${cat.color}">
           <span class="cat-dot" style="background:${cat.color}"></span>${escHtml(cat.name)}
         </span>`
      : '&mdash;';

    return `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td>${escHtml(tx.description)}</td>
      <td>${badge}</td>
      <td>${paidBy}</td>
      <td class="${inc ? 'amount-income' : 'amount-expense'}">
        ${inc ? '+' : '-'}${fmt(tx.amount)}
        <span class="split-label">&divide;${perPerson}&nbsp;=&nbsp;${fmt(share)}&nbsp;/&nbsp;P.</span>
      </td>
      <td>${isOwn
        ? `<button class="btn btn-danger btn-sm" onclick="deleteTransaction('${tx.id}')">${t('btnDelete')}</button>`
        : ''}</td>
    </tr>`;
  }).join('');

  box.innerHTML = `<table>
    <thead>
      <tr>
        <th>${t('thDate')}</th><th>${t('thDescription')}</th>
        <th>${t('thCategory')}</th><th>${t('thPaidBy')}</th>
        <th>${t('thAmount')}</th><th>${t('thAction')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Öffnet das Modal zum Hinzufügen einer Transaktion.
 */
export function openAddTxModal() {
  document.getElementById('txDate').value        = new Date().toISOString().split('T')[0];
  document.getElementById('txAmount').value      = '';
  document.getElementById('txDescription').value = '';
  document.getElementById('txSplitType').value   = 'personal';
  populateCategorySelect();
  document.getElementById('addTxModal').style.display = 'flex';
}

/**
 * Schließt das Add-Transaktion-Modal.
 */
export function closeAddTxModal() {
  document.getElementById('addTxModal').style.display = 'none';
}

/**
 * Liest das Modal-Formular aus, validiert es und fügt eine neue Transaktion hinzu.
 */
export function addTransaction() {
  const date      = document.getElementById('txDate').value;
  const raw       = document.getElementById('txAmount').value;
  const catId     = document.getElementById('txCategory').value;
  const desc      = document.getElementById('txDescription').value.trim();
  const splitType = document.getElementById('txSplitType').value;
  const amount    = parseFloat(raw);

  if (!date)                                { toast(t('toastSelectDate'));     return; }
  if (!raw || amount <= 0 || isNaN(amount)) { toast(t('toastInvalidAmount'));  return; }
  if (!catId)                               { toast(t('toastSelectCategory')); return; }

  const tx = {
    id:          'tx_' + Date.now(),
    date,
    amount:      Math.round(amount * 100) / 100,
    categoryId:  catId,
    description: desc || '-',
    createdBy:   currentUser?.sub ? { sub: currentUser.sub } : undefined,
    splitType:   splitType || 'personal',
  };

  if (splitType === 'shared') {
    tx.paidByName = currentUser?.given_name || currentUser?.name || currentUser?.email || '?';
  }

  appData.transactions.push(tx);
  saveData();

  closeAddTxModal();
  renderTransactionTable();
  renderSharedTransactionTable();
  renderDashboard();
  toast(t('toastTxSaved'));
}

/**
 * Löscht eine Transaktion — nur wenn sie dem aktuellen Nutzer gehört.
 *
 * @param {string} id
 */
export function deleteTransaction(id) {
  const tx = appData.transactions.find(t => t.id === id);
  if (!tx) return;

  if (currentUser?.sub && tx.createdBy?.sub !== currentUser.sub) {
    toast(t('toastNotYourTx'));
    return;
  }

  if (!confirm(t('confirmDeleteTx'))) return;
  appData.transactions = appData.transactions.filter(tx => tx.id !== id);
  saveData();
  renderTransactionTable();
  renderSharedTransactionTable();
  renderDashboard();
  toast(t('toastTxDeleted'));
}
