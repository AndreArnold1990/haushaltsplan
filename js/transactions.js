/**
 * @module transactions
 * Rendert die Transaktions-Listen (persönlich + geteilt) und verwaltet
 * das Hinzufügen/Löschen von Transaktionen.
 *
 * splitType-Werte:
 *   'personal'   – nur für den Ersteller, kein Bilanz-Effekt
 *   'equal'      – 50/50 aufgeteilt; paidBySub sagt wer gezahlt hat
 *   'full'       – voller Betrag; paidBySub sagt wer gezahlt hat
 *   'shared'     – legacy (= 'equal', paidBySub = createdBy.sub)
 *   'settlement' – Ausgleichszahlung
 */

import { appData, saveData, currentUser } from './store.js';
import { t }                              from './i18n.js';
import { fmt, fmtDate, monthKey, getCurrentMonth, monthLabel,
         txsForMonth, getCat, isIncome, isPendingTx, escHtml, toast, safeColor,
         getPersonName, getOtherUser }    from './utils.js';
import { renderDashboard }                from './dashboard.js';

// ── Interne Hilfsmittel ───────────────────────────────────────────────────────

/** Persönliche Transaktionen des aktuellen Nutzers. */
function _ownTxs() {
  const sub = currentUser?.sub;
  return appData.transactions.filter(tx => {
    const isPersonal = !tx.splitType || tx.splitType === 'personal';
    if (!isPersonal) return false;
    return !sub || tx.createdBy?.sub === sub;
  });
}

/** Alle geteilten Transaktionen (equal / full / legacy shared). */
function _sharedTxs() {
  return appData.transactions.filter(tx =>
    tx.splitType === 'equal' || tx.splitType === 'full' || tx.splitType === 'shared'
  );
}

/** sub der anderen Person (immer genau eine). */
function _getOtherSub() {
  return getOtherUser()?.sub || null;
}

/** Vorname der anderen Person, oder Fallback. */
function _getOtherFirstName() {
  return getOtherUser()?.firstName || t('partnerFallback');
}

/**
 * Befüllt das Split-Typ-Dropdown dynamisch mit dem Namen der anderen Person.
 * Muss bei jedem Öffnen des Modals aufgerufen werden, da der Name erst nach
 * dem ersten Login der anderen Person bekannt ist.
 */
function _populateSplitSelect() {
  const sel       = document.getElementById('txSplitType');
  const otherName = _getOtherFirstName();
  sel.innerHTML = [
    `<option value="personal">${t('splitPersonal')}</option>`,
    `<option value="equal_me">${t('splitEqualMe')}</option>`,
    `<option value="full_me">${t('splitFullMe')}</option>`,
    `<option value="equal_other">${t('splitEqualOther', otherName)}</option>`,
    `<option value="full_other">${t('splitFullOther', otherName)}</option>`,
  ].join('');
}

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Initialisiert das Transaktions-Tab (Monatsfilter + beide Tabellen).
 */
export function renderTransactions() {
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

  // Split-Feld direkt nach dem Befüllen aktualisieren
  _updateSplitVisibility();
}

/**
 * Zeigt oder versteckt die Split-Auswahl je nach Kategorie-Typ.
 * Einnahmen sind immer persönlich – Split ergibt hier keinen Sinn.
 */
function _updateSplitVisibility() {
  const catId    = document.getElementById('txCategory').value;
  const cat      = appData.categories.find(c => c.id === catId);
  const isIncome = cat?.type === 'income';
  const group    = document.getElementById('txSplitGroup');
  if (!group) return;
  group.classList.toggle('is-hidden', isIncome);
  if (isIncome) {
    document.getElementById('txSplitType').value = 'personal';
  }
}

/**
 * Rendert die persönliche Transaktions-Tabelle für den gewählten Monat.
 * Zeigt eigene persönliche UND alle geteilten Transaktionen (mit Badge).
 */
export function renderTransactionTable() {
  const m   = document.getElementById('txMonthFilter').value;
  const sub = currentUser?.sub;

  const txs = txsForMonth(m)
    .filter(tx => {
      if (tx.splitType === 'settlement') return false;
      const isPersonal = !tx.splitType || tx.splitType === 'personal';
      const isShared   = ['equal', 'full', 'shared'].includes(tx.splitType);
      return (isPersonal && (!sub || tx.createdBy?.sub === sub)) || isShared;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const box = document.getElementById('transactionTableContainer');

  if (!txs.length) {
    box.innerHTML = `<div class="empty-state">${t('emptyTx')}</div>`;
    return;
  }

  const rows = txs.map(tx => {
    const cat      = getCat(tx.categoryId);
    const inc      = isIncome(tx);
    const isOwn    = !sub || tx.createdBy?.sub === sub;
    const pending  = isPendingTx(tx);

    // Normalisiere legacy 'shared'
    const splitType = tx.splitType === 'shared' ? 'equal' : (tx.splitType || 'personal');
    const paidBySub = tx.paidBySub || tx.createdBy?.sub;
    const isShared  = splitType === 'equal' || splitType === 'full';

    // Anzeigebetrag: bei equal = Anteil, bei full = voll
    let displayAmt = tx.amount;
    let amtHint    = '';
    if (splitType === 'equal') {
      displayAmt = Math.round((tx.amount / 2) * 100) / 100;
      amtHint    = `<span class="split-label">(${fmt(tx.amount)} ${t('splitLabelTotal')})</span>`;
    }

    const amtCell = `<td class="${inc ? 'amount-income' : 'amount-expense'}">
      ${inc ? '+' : '-'}${fmt(displayAmt)}${amtHint}
    </td>`;

    const catBadge = cat
      ? `<span class="cat-badge" style="background:${safeColor(cat.color)}22;color:${safeColor(cat.color)}">
           <span class="cat-dot" style="background:${safeColor(cat.color)}"></span>${escHtml(cat.name)}
         </span>`
      : '&mdash;';

    const sharedBadge = isShared
      ? `<span class="cat-badge cat-badge--shared">${_splitBadgeText(splitType, paidBySub)}</span>`
      : '';

    const pendingBadge = pending
      ? `<span class="pending-badge">⏳</span>`
      : '';

    const rowClass = [
      'tx-row-clickable',
      isShared ? 'tx-row--shared' : '',
      pending  ? 'tx-pending'     : '',
    ].filter(Boolean).join(' ');

    const editAttr = (!pending && isOwn) ? ` data-tx-edit-id="${tx.id}"` : '';

    return `<tr class="${rowClass}"${editAttr}>
      <td class="td-date">
        <span class="tx-date">${fmtDate(tx.date)}${pendingBadge}</span>
        <span class="tx-cat-below">${catBadge}${sharedBadge}</span>
      </td>
      <td>${escHtml(tx.description)}</td>
      ${amtCell}
    </tr>`;
  }).join('');

  box.innerHTML = `<table>
    <thead>
      <tr>
        <th>${t('thDate')}</th><th>${t('thDescription')}</th>
        <th>${t('thAmount')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Rendert die geteilten Transaktionen für den gewählten Monat.
 */
export function renderSharedTransactionTable() {
  const m   = document.getElementById('txMonthFilter').value;
  const sub = currentUser?.sub;

  const txs = txsForMonth(m)
    .filter(tx => ['equal', 'full', 'shared'].includes(tx.splitType) && !isPendingTx(tx))
    .sort((a, b) => b.date.localeCompare(a.date));

  const box = document.getElementById('sharedTransactionTableContainer');

  if (!txs.length) {
    box.innerHTML = `<div class="empty-state">${t('emptySharedTx')}</div>`;
    return;
  }

  const rows = txs.map(tx => {
    const cat       = getCat(tx.categoryId);
    const inc       = isIncome(tx);
    const splitType = tx.splitType === 'shared' ? 'equal' : tx.splitType;
    const paidBySub = tx.paidBySub || tx.createdBy?.sub;
    const isOwn     = sub && tx.createdBy?.sub === sub;

    const paidByName = paidBySub === sub
      ? getPersonName(sub)
      : getPersonName(paidBySub);

    // Betragsanzeige je nach Aufteilungstyp
    let amtDisplay = '';
    if (splitType === 'equal') {
      const share = Math.round((tx.amount / 2) * 100) / 100;
      amtDisplay = `${inc ? '+' : '-'}${fmt(tx.amount)}
        <span class="split-label">&divide;2&nbsp;=&nbsp;${fmt(share)}&nbsp;${t('splitLabelEach')}</span>`;
    } else {
      amtDisplay = `${inc ? '+' : '-'}${fmt(tx.amount)}
        <span class="split-label">${t('splitLabelFull')}</span>`;
    }

    const badge = cat
      ? `<span class="cat-badge" style="background:${safeColor(cat.color)}22;color:${safeColor(cat.color)}">
           <span class="cat-dot" style="background:${safeColor(cat.color)}"></span>${escHtml(cat.name)}
         </span>`
      : '&mdash;';

    const editAttr = isOwn ? ` data-tx-edit-id="${tx.id}"` : '';
    return `<tr class="tx-row-clickable"${editAttr}>
      <td class="td-date">
        <span class="tx-date">${fmtDate(tx.date)}</span>
        <span class="tx-cat-below">${badge}</span>
      </td>
      <td>${escHtml(tx.description)}</td>
      <td>${escHtml(paidByName)}</td>
      <td class="${inc ? 'amount-income' : 'amount-expense'}">${amtDisplay}</td>
    </tr>`;
  }).join('');

  box.innerHTML = `<table>
    <thead>
      <tr>
        <th>${t('thDate')}</th><th>${t('thDescription')}</th>
        <th>${t('thPaidBy')}</th><th>${t('thAmount')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Aktuell im Edit-Modal geladene Transaktions-ID. @type {string|null} */
let _editingTxId = null;

/**
 * Öffnet das Edit-Modal und befüllt es mit den Werten der Transaktion.
 * @param {string} id
 */
export function openEditTxModal(id) {
  const tx = appData.transactions.find(t => t.id === id);
  if (!tx) return;
  _editingTxId = id;

  // Kategorie-Dropdown befüllen
  const catSel = document.getElementById('editTxCategory');
  const inc    = appData.categories.filter(c => c.type === 'income');
  const exp    = appData.categories.filter(c => c.type === 'expense');
  catSel.innerHTML = '';
  if (inc.length) {
    const g = document.createElement('optgroup');
    g.label = t('groupIncome');
    inc.forEach(c => g.appendChild(new Option(c.name, c.id)));
    catSel.appendChild(g);
  }
  if (exp.length) {
    const g = document.createElement('optgroup');
    g.label = t('groupExpense');
    exp.forEach(c => g.appendChild(new Option(c.name, c.id)));
    catSel.appendChild(g);
  }
  catSel.value = tx.categoryId;

  // Split-Dropdown befüllen
  const splitSel  = document.getElementById('editTxSplitType');
  const otherName = _getOtherFirstName();
  splitSel.innerHTML = [
    `<option value="personal">${t('splitPersonal')}</option>`,
    `<option value="equal_me">${t('splitEqualMe')}</option>`,
    `<option value="full_me">${t('splitFullMe')}</option>`,
    `<option value="equal_other">${t('splitEqualOther', otherName)}</option>`,
    `<option value="full_other">${t('splitFullOther', otherName)}</option>`,
  ].join('');

  // Gespeichertes splitType → UI-Wert
  const sub      = currentUser?.sub;
  const otherSub = _getOtherSub();
  const normType = tx.splitType === 'shared' ? 'equal' : (tx.splitType || 'personal');
  const paidBySub = tx.paidBySub || tx.createdBy?.sub;
  let splitVal = 'personal';
  if (normType === 'equal') splitVal = paidBySub === sub ? 'equal_me' : 'equal_other';
  else if (normType === 'full') splitVal = paidBySub === sub ? 'full_me' : 'full_other';
  splitSel.value = splitVal;

  document.getElementById('editTxDate').value        = tx.date;
  document.getElementById('editTxAmount').value      = tx.amount;
  document.getElementById('editTxDescription').value = tx.description !== '-' ? tx.description : '';

  // Split-Sichtbarkeit + Listener
  _updateEditSplitVisibility();
  catSel.removeEventListener('change', _updateEditSplitVisibility);
  catSel.addEventListener('change', _updateEditSplitVisibility);

  // Löschen-Button nur für eigene Transaktionen
  const isOwn = !sub || tx.createdBy?.sub === sub;
  document.getElementById('btnDeleteEditTx').style.display = isOwn ? '' : 'none';

  document.getElementById('editTxModal').classList.add('is-open');
}

/**
 * Schließt das Edit-Transaktion-Modal.
 */
export function closeEditTxModal() {
  _editingTxId = null;
  document.getElementById('editTxModal').classList.remove('is-open');
}

/**
 * Speichert die geänderte Transaktion.
 */
export function saveEditTx() {
  if (!_editingTxId) return;

  const date     = document.getElementById('editTxDate').value;
  const raw      = document.getElementById('editTxAmount').value;
  const catId    = document.getElementById('editTxCategory').value;
  const desc     = document.getElementById('editTxDescription').value.trim();
  const splitVal = document.getElementById('editTxSplitType').value;
  const amount   = parseFloat(raw);

  if (!date)                                { toast(t('toastSelectDate'));     return; }
  if (!raw || amount <= 0 || isNaN(amount)) { toast(t('toastInvalidAmount'));  return; }
  if (!catId)                               { toast(t('toastSelectCategory')); return; }

  const selectedCat = appData.categories.find(c => c.id === catId);
  let splitType = 'personal';
  let paidBySub = null;

  if (selectedCat?.type !== 'income') {
    if      (splitVal === 'equal_me')    { splitType = 'equal'; paidBySub = currentUser?.sub || null; }
    else if (splitVal === 'full_me')     { splitType = 'full';  paidBySub = currentUser?.sub || null; }
    else if (splitVal === 'equal_other') { splitType = 'equal'; paidBySub = _getOtherSub(); }
    else if (splitVal === 'full_other')  { splitType = 'full';  paidBySub = _getOtherSub(); }
  }

  const idx = appData.transactions.findIndex(t => t.id === _editingTxId);
  if (idx === -1) return;

  appData.transactions[idx] = {
    ...appData.transactions[idx],
    date,
    amount:      Math.round(amount * 100) / 100,
    categoryId:  catId,
    description: desc || '-',
    splitType,
    paidBySub:   paidBySub || undefined,
  };
  if (!paidBySub) delete appData.transactions[idx].paidBySub;

  saveData();
  closeEditTxModal();
  renderTransactionTable();
  renderSharedTransactionTable();
  renderDashboard();
  toast(t('toastTxUpdated'));
}

/**
 * Löscht die aktuell im Modal geladene Transaktion.
 */
export function deleteEditTx() {
  if (!_editingTxId) return;
  if (!confirm(t('confirmDeleteTx'))) return;
  appData.transactions = appData.transactions.filter(t => t.id !== _editingTxId);
  saveData();
  closeEditTxModal();
  renderTransactionTable();
  renderSharedTransactionTable();
  renderDashboard();
  toast(t('toastTxDeleted'));
}

/** Zeigt/versteckt Split-Feld im Edit-Modal je nach Kategorie-Typ. */
function _updateEditSplitVisibility() {
  const catId   = document.getElementById('editTxCategory').value;
  const cat     = appData.categories.find(c => c.id === catId);
  const group   = document.getElementById('editTxSplitGroup');
  if (!group) return;
  const income  = cat?.type === 'income';
  group.classList.toggle('is-hidden', income);
  if (income) document.getElementById('editTxSplitType').value = 'personal';
}

/**
 * Öffnet das Modal zum Hinzufügen einer Transaktion.
 */
export function openAddTxModal() {
  document.getElementById('txDate').value        = new Date().toISOString().split('T')[0];
  document.getElementById('txAmount').value      = '';
  document.getElementById('txDescription').value = '';
  _populateSplitSelect();
  populateCategorySelect();

  // Einmalig registrieren: Split-Sichtbarkeit bei Kategorie-Wechsel aktualisieren
  const catSel = document.getElementById('txCategory');
  catSel.removeEventListener('change', _updateSplitVisibility);
  catSel.addEventListener('change', _updateSplitVisibility);

  document.getElementById('addTxModal').classList.add('is-open');
}

/**
 * Schließt das Add-Transaktion-Modal.
 */
export function closeAddTxModal() {
  document.getElementById('addTxModal').classList.remove('is-open');
}

/**
 * Liest das Modal-Formular aus, validiert es und fügt eine neue Transaktion hinzu.
 */
export function addTransaction() {
  const date     = document.getElementById('txDate').value;
  const raw      = document.getElementById('txAmount').value;
  const catId    = document.getElementById('txCategory').value;
  const desc     = document.getElementById('txDescription').value.trim();
  const splitVal = document.getElementById('txSplitType').value;
  const amount   = parseFloat(raw);

  if (!date)                                { toast(t('toastSelectDate'));     return; }
  if (!raw || amount <= 0 || isNaN(amount)) { toast(t('toastInvalidAmount'));  return; }
  if (!catId)                               { toast(t('toastSelectCategory')); return; }

  // splitVal → internes splitType + paidBySub
  // Einnahmen sind immer persönlich, unabhängig vom Split-Select
  const selectedCat = appData.categories.find(c => c.id === catId);
  let splitType = 'personal';
  let paidBySub = null;

  if (selectedCat?.type === 'income') {
    // Keine weitere Verarbeitung – bleibt personal
  } else if (splitVal === 'equal_me') {
    splitType = 'equal';
    paidBySub = currentUser?.sub || null;
  } else if (splitVal === 'full_me') {
    splitType = 'full';
    paidBySub = currentUser?.sub || null;
  } else if (splitVal === 'equal_other') {
    splitType = 'equal';
    paidBySub = _getOtherSub();
  } else if (splitVal === 'full_other') {
    splitType = 'full';
    paidBySub = _getOtherSub();
  }

  const tx = {
    id:          'tx_' + Date.now(),
    date,
    amount:      Math.round(amount * 100) / 100,
    categoryId:  catId,
    description: desc || '-',
    createdBy:   currentUser?.sub ? { sub: currentUser.sub } : undefined,
    splitType,
  };

  if (splitType !== 'personal') {
    tx.paidBySub = paidBySub;
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
 * Löscht eine Transaktion — nur wenn sie vom aktuellen Nutzer erstellt wurde.
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
  appData.transactions = appData.transactions.filter(t => t.id !== id);
  saveData();
  renderTransactionTable();
  renderSharedTransactionTable();
  renderDashboard();
  toast(t('toastTxDeleted'));
}

// ── Interne Anzeige-Hilfsmittel ───────────────────────────────────────────────

/**
 * Gibt den Badge-Text für geteilt Transaktionen zurück.
 * @param {'equal'|'full'} splitType
 * @param {string|null}    paidBySub
 * @returns {string}
 */
function _splitBadgeText(splitType, paidBySub) {
  const sub      = currentUser?.sub;
  const paidByMe = paidBySub === sub;
  const name     = paidByMe ? null : getPersonName(paidBySub);

  if (splitType === 'equal') {
    return paidByMe
      ? `🤝 50/50`
      : `🤝 50/50 (${escHtml(name)})`;
  }
  return paidByMe
    ? `🤝 ${t('splitLabelFull')}`
    : `🤝 ${escHtml(name)}`;
}
