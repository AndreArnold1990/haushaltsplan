/**
 * @module recurring
 * Verwaltung wiederkehrender Transaktionsregeln.
 * Regeln werden in appData.recurringRules gespeichert.
 * applyRecurringRules() generiert beim App-Start fehlende Transaktionen.
 *
 * @typedef {Object} RecurringRule
 * @property {string}   id          - Eindeutige ID (z.B. "rec_1234567890")
 * @property {string}   categoryId  - Referenz auf Category.id
 * @property {number}   amount      - Betrag in Euro
 * @property {string}   description - Freitext-Beschreibung
 * @property {string}   startDate   - ISO-Datum des ersten Vorkommens (YYYY-MM-DD)
 * @property {'monthly'|'quarterly'|'biannual'} interval - Wiederholungsrate
 * @property {string}   splitType   - Wie transactions.splitType
 * @property {string}   [paidBySub] - UID des Zahlers (für geteilte Ausgaben)
 * @property {{ sub: string }} [createdBy]
 */

import { appData, currentUser, saveData } from './store.js';
import { t }                               from './i18n.js';
import { getCat, catName, fmt, fmtDate, safeColor, escHtml, toast } from './utils.js';

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Generiert fehlende Transaktionen für alle Regeln bis zum aktuellen Monat.
 * Idempotent: bereits vorhandene Einträge werden übersprungen.
 * @returns {boolean} true wenn neue Transaktionen generiert wurden
 */
export function applyRecurringRules() {
  const rules = appData.recurringRules;
  if (!rules?.length) return false;

  const now = new Date();
  let changed = false;

  for (const rule of rules) {
    const start = new Date(rule.startDate + 'T00:00:00');
    if (start > now) continue; // Zukünftige Regel → noch nicht generieren

    const step = rule.interval === 'monthly' ? 1
               : rule.interval === 'quarterly' ? 3 : 6;

    let cursor   = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMon = new Date(now.getFullYear(), now.getMonth(), 1);

    while (cursor <= endMon) {
      const y  = cursor.getFullYear();
      const m  = String(cursor.getMonth() + 1).padStart(2, '0');
      const mk = `${y}-${m}`;
      const d  = String(start.getDate()).padStart(2, '0');

      const exists = appData.transactions.some(
        tx => tx.recurringRuleId === rule.id && tx.date.startsWith(mk),
      );

      if (!exists) {
        const tx = {
          id:              `rec_${rule.id}_${mk}`,
          date:            `${mk}-${d}`,
          amount:          rule.amount,
          categoryId:      rule.categoryId,
          description:     rule.description,
          splitType:       rule.splitType || 'personal',
          recurringRuleId: rule.id,
        };
        if (rule.paidBySub) tx.paidBySub = rule.paidBySub;
        if (rule.createdBy) tx.createdBy  = rule.createdBy;
        appData.transactions.push(tx);
        changed = true;
      }

      cursor.setMonth(cursor.getMonth() + step);
    }
  }

  return changed;
}

/**
 * Liest das Formular, legt eine neue Regel an und generiert sofort Transaktionen.
 */
export function addRecurringRule() {
  const catId     = document.getElementById('recCategory').value;
  const raw       = document.getElementById('recAmount').value;
  const desc      = document.getElementById('recDescription').value.trim();
  const startDate = document.getElementById('recStartDate').value;
  const interval  = document.getElementById('recInterval').value;
  const splitVal  = document.getElementById('recSplitType').value;
  const amount    = parseFloat(raw);

  if (!catId)                               { toast(t('toastSelectCategory')); return; }
  if (!raw || amount <= 0 || isNaN(amount)) { toast(t('toastInvalidAmount'));  return; }
  if (!startDate)                           { toast(t('toastSelectDate'));      return; }

  if (!appData.recurringRules) appData.recurringRules = [];

  let splitType = 'personal';
  let paidBySub = null;
  const otherSub = _getOtherSub();

  if      (splitVal === 'equal_me')    { splitType = 'equal'; paidBySub = currentUser?.sub || null; }
  else if (splitVal === 'full_me')     { splitType = 'full';  paidBySub = currentUser?.sub || null; }
  else if (splitVal === 'equal_other') { splitType = 'equal'; paidBySub = otherSub; }
  else if (splitVal === 'full_other')  { splitType = 'full';  paidBySub = otherSub; }

  const rule = {
    id:          'rec_' + Date.now(),
    categoryId:  catId,
    amount:      Math.round(amount * 100) / 100,
    description: desc || '-',
    startDate,
    interval,
    splitType,
    createdBy:   currentUser?.sub ? { sub: currentUser.sub } : undefined,
  };
  if (paidBySub) rule.paidBySub = paidBySub;

  appData.recurringRules.push(rule);
  applyRecurringRules();
  saveData();
  renderRecurringRules();

  document.getElementById('recAmount').value      = '';
  document.getElementById('recDescription').value = '';
  toast(t('toastRecurringAdded'));
}

/** Aktuell im Edit-Modal geladene Regel-ID. @type {string|null} */
let _editingRuleId = null;

/**
 * Öffnet das Edit-Modal und befüllt es mit den Werten der Regel.
 * @param {string} id
 */
export function openEditRecurringModal(id) {
  const rule = (appData.recurringRules || []).find(r => r.id === id);
  if (!rule) return;
  _editingRuleId = id;

  // Kategorie-Dropdown befüllen (wie im Add-Formular)
  const catSel = document.getElementById('editRecCategory');
  _fillCategorySelect(catSel);
  catSel.value = rule.categoryId;

  // Split-Dropdown befüllen
  const splitSel  = document.getElementById('editRecSplitType');
  const otherName = escHtml(_getOtherFirstName());
  splitSel.innerHTML = [
    `<option value="personal">${t('splitPersonal')}</option>`,
    `<option value="equal_me">${t('splitEqualMe')}</option>`,
    `<option value="full_me">${t('splitFullMe')}</option>`,
    `<option value="equal_other">${t('splitEqualOther', otherName)}</option>`,
    `<option value="full_other">${t('splitFullOther', otherName)}</option>`,
  ].join('');

  // Gespeichertes splitType + paidBySub → UI-Wert umrechnen
  const sub = currentUser?.sub;
  const otherSub = _getOtherSub();
  let splitVal = 'personal';
  if (rule.splitType === 'equal') {
    splitVal = rule.paidBySub === sub ? 'equal_me' : 'equal_other';
  } else if (rule.splitType === 'full') {
    splitVal = rule.paidBySub === sub ? 'full_me' : 'full_other';
  }
  splitSel.value = splitVal;

  document.getElementById('editRecAmount').value      = rule.amount;
  document.getElementById('editRecStartDate').value   = rule.startDate;
  document.getElementById('editRecInterval').value    = rule.interval;
  document.getElementById('editRecDescription').value = rule.description !== '-' ? rule.description : '';

  // Split-Sichtbarkeit initial setzen + bei Kategorie-Wechsel aktualisieren
  _updateEditRecSplitVisibility();
  catSel.removeEventListener('change', _updateEditRecSplitVisibility);
  catSel.addEventListener('change', _updateEditRecSplitVisibility);

  document.getElementById('editRecurringModal').classList.add('is-open');
}

/**
 * Schließt das Edit-Modal für wiederkehrende Ausgaben.
 */
export function closeEditRecurringModal() {
  _editingRuleId = null;
  document.getElementById('editRecurringModal').classList.remove('is-open');
}

/**
 * Speichert die geänderte Regel, löscht alte generierte Transaktionen und regeneriert sie.
 */
export function saveEditRecurringRule() {
  if (!_editingRuleId) return;

  const catId     = document.getElementById('editRecCategory').value;
  const raw       = document.getElementById('editRecAmount').value;
  const splitVal  = document.getElementById('editRecSplitType').value;
  const startDate = document.getElementById('editRecStartDate').value;
  const interval  = document.getElementById('editRecInterval').value;
  const desc      = document.getElementById('editRecDescription').value.trim();
  const amount    = parseFloat(raw);

  if (!catId)                               { toast(t('toastSelectCategory')); return; }
  if (!raw || amount <= 0 || isNaN(amount)) { toast(t('toastInvalidAmount'));  return; }
  if (!startDate)                           { toast(t('toastSelectDate'));      return; }

  let splitType = 'personal';
  let paidBySub = null;
  const otherSub = _getOtherSub();
  if      (splitVal === 'equal_me')    { splitType = 'equal'; paidBySub = currentUser?.sub || null; }
  else if (splitVal === 'full_me')     { splitType = 'full';  paidBySub = currentUser?.sub || null; }
  else if (splitVal === 'equal_other') { splitType = 'equal'; paidBySub = otherSub; }
  else if (splitVal === 'full_other')  { splitType = 'full';  paidBySub = otherSub; }

  const idx = (appData.recurringRules || []).findIndex(r => r.id === _editingRuleId);
  if (idx === -1) return;

  // Regel aktualisieren
  const updatedRule = {
    ...appData.recurringRules[idx],
    categoryId:  catId,
    amount:      Math.round(amount * 100) / 100,
    description: desc || '-',
    startDate,
    interval,
    splitType,
    paidBySub:   paidBySub || undefined,
  };
  if (!paidBySub) delete updatedRule.paidBySub;
  appData.recurringRules[idx] = updatedRule;

  // Alle bisher generierten Transaktionen für diese Regel löschen und neu erzeugen
  appData.transactions = appData.transactions.filter(tx => tx.recurringRuleId !== _editingRuleId);
  applyRecurringRules();
  saveData();
  closeEditRecurringModal();
  renderRecurringRules();
  toast(t('toastRecurringUpdated'));
}

/**
 * Löscht eine Regel und alle daraus generierten Transaktionen.
 * @param {string} id
 */
export function deleteRecurringRule(id) {
  if (!confirm(t('confirmDeleteRecurring'))) return;
  appData.recurringRules = (appData.recurringRules || []).filter(r  => r.id !== id);
  appData.transactions   = (appData.transactions   || []).filter(tx => tx.recurringRuleId !== id);
  saveData();
  renderRecurringRules();
  toast(t('toastRecurringDeleted'));
}

/**
 * Befüllt das Kategorie-Dropdown im Wiederkehrend-Formular (nur Ausgaben).
 */
export function populateRecurringCategorySelect() {
  const sel = document.getElementById('recCategory');
  if (!sel) return;
  _fillCategorySelect(sel);
  _updateRecurringSplitVisibility();
}

/**
 * Befüllt das Split-Dropdown im Wiederkehrend-Formular.
 */
export function populateRecurringSplitSelect() {
  const sel = document.getElementById('recSplitType');
  if (!sel) return;
  const otherName = escHtml(_getOtherFirstName());
  sel.innerHTML = [
    `<option value="personal">${t('splitPersonal')}</option>`,
    `<option value="equal_me">${t('splitEqualMe')}</option>`,
    `<option value="full_me">${t('splitFullMe')}</option>`,
    `<option value="equal_other">${t('splitEqualOther', otherName)}</option>`,
    `<option value="full_other">${t('splitFullOther', otherName)}</option>`,
  ].join('');
}

/**
 * Rendert die Liste der aktiven Regeln in #recurringList.
 */
export function renderRecurringRules() {
  const list = document.getElementById('recurringList');
  if (!list) return;

  const rules = appData.recurringRules || [];
  if (!rules.length) {
    list.innerHTML = `<p class="empty-hint">${t('recurringEmpty')}</p>`;
    return;
  }

  const intLabel = {
    monthly:   t('intervalMonthly'),
    quarterly: t('intervalQuarterly'),
    biannual:  t('intervalBiannual'),
  };

  list.innerHTML = rules.map(rule => {
    const cat = getCat(rule.categoryId);
    return `<div class="recurring-item">
      <div class="recurring-info">
        <span class="cat-badge" style="background:${safeColor(cat?.color || '#ccc')}22;color:${safeColor(cat?.color || '#ccc')}">
          <span class="cat-dot" style="background:${safeColor(cat?.color || '#ccc')}"></span>${escHtml(catName(cat) || '?')}
        </span>
        <span class="recurring-amount">${fmt(rule.amount)}</span>
        <span class="recurring-desc">${escHtml(rule.description)}</span>
        <span class="recurring-meta">&#x21BB; ${intLabel[rule.interval] ?? rule.interval} &middot; ${t('recurringFrom')} ${fmtDate(rule.startDate)}</span>
      </div>
      <div class="recurring-actions">
        <button class="btn-edit-rec" data-rec-edit-id="${rule.id}" title="${t('btnSave')}">&#9999;</button>
        <button class="btn-delete-rec" data-rec-id="${rule.id}" title="${t('btnDelete')}">&#128465;</button>
      </div>
    </div>`;
  }).join('');
}

// ── Intern ────────────────────────────────────────────────────────────────────

function _getOtherSub() {
  const sub   = currentUser?.sub;
  const entry = Object.entries(appData.users || {}).find(([s]) => s !== sub);
  return entry?.[0] || null;
}

function _getOtherFirstName() {
  const other = _getOtherSub();
  return (other && appData.users?.[other]?.firstName) || t('partnerFallback');
}

/**
 * Befüllt ein <select>-Element mit allen Kategorien gruppiert nach Typ.
 * @param {HTMLSelectElement} sel
 */
function _fillCategorySelect(sel) {
  const inc = appData.categories.filter(c => c.type === 'income');
  const exp = appData.categories.filter(c => c.type === 'expense');
  sel.innerHTML = '';
  if (inc.length) {
    const g = document.createElement('optgroup');
    g.label = t('groupIncome');
    inc.forEach(c => g.appendChild(new Option(catName(c), c.id)));
    sel.appendChild(g);
  }
  if (exp.length) {
    const g = document.createElement('optgroup');
    g.label = t('groupExpense');
    exp.forEach(c => g.appendChild(new Option(catName(c), c.id)));
    sel.appendChild(g);
  }
}

function _updateRecurringSplitVisibility() {
  const catId = document.getElementById('recCategory')?.value;
  const cat   = appData.categories.find(c => c.id === catId);
  const group = document.getElementById('recSplitGroup');
  if (!group) return;
  group.classList.toggle('is-hidden', cat?.type === 'income');
}

function _updateEditRecSplitVisibility() {
  const catId = document.getElementById('editRecCategory')?.value;
  const cat   = appData.categories.find(c => c.id === catId);
  const group = document.getElementById('editRecSplitGroup');
  if (!group) return;
  group.classList.toggle('is-hidden', cat?.type === 'income');
}
