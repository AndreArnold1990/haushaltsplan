/**
 * @module categories
 * Rendert die Kategorie-Verwaltung und behandelt Hinzufügen/Löschen mit Modal-Dialog.
 */

import { appData, saveData }                            from './store.js';
import { t }                                            from './i18n.js';
import { getCat, catName, escHtml, toast, safeColor }     from './utils.js';
import { populateCategorySelect, renderTransactionTable } from './transactions.js';
import { renderDashboard }                              from './dashboard.js';

/**
 * Rendert beide Kategorie-Listen (Einnahmen und Ausgaben).
 */
export function renderCategories() {
  _renderCategoryList('income',  document.getElementById('incomeCategoryList'));
  _renderCategoryList('expense', document.getElementById('expenseCategoryList'));
}

/**
 * @param {'income'|'expense'} type
 * @param {HTMLElement}        container
 * @package
 */
function _renderCategoryList(type, container) {
  const cats = appData.categories.filter(c => c.type === type);
  if (!cats.length) {
    container.innerHTML = `<div style="color:var(--text-secondary);font-size:0.85rem;padding:0.5rem">${t('emptyCats')}</div>`;
    return;
  }
  container.innerHTML = cats.map(c => {
    return `<div class="category-item category-item--clickable" data-cat-id="${c.id}">
      <div class="category-item-left">
        <div class="color-swatch" style="background:${safeColor(c.color)}"></div>
        <span class="cat-name">${escHtml(catName(c))}</span>
      </div>
      <span class="category-item-chevron">›</span>
    </div>`;
  }).join('');
}

/**
 * Liest das Kategorie-Formular aus und fügt eine neue Kategorie hinzu.
 */
export function addCategory() {
  const nameDe = document.getElementById('catNameDe').value.trim();
  const nameEs = document.getElementById('catNameEs').value.trim();
  const type   = document.getElementById('catType').value;
  const color  = document.getElementById('catColor').value;

  if (!nameDe) { toast(t('toastEnterName')); return; }

  const lowerDe = nameDe.toLowerCase();
  const lowerEs = nameEs.toLowerCase();
  if (appData.categories.some(c => {
    const existing = catName(c).toLowerCase();
    const existEs  = (typeof c.name === 'object' ? c.name.es : '') || '';
    return existing === lowerDe || existing === lowerEs ||
           (lowerEs && (existEs.toLowerCase() === lowerDe || existEs.toLowerCase() === lowerEs));
  })) {
    toast(t('toastNameExists'));
    return;
  }

  appData.categories.push({ id: 'cat_' + Date.now(), name: { de: nameDe, es: nameEs }, type, color });
  saveData();
  document.getElementById('catNameDe').value = '';
  document.getElementById('catNameEs').value = '';
  renderCategories();
  populateCategorySelect();
  toast(t('toastCatAdded', escHtml(nameDe)));
}

// ── Kategorie bearbeiten ──────────────────────────────────────────────────────

/** ID der Kategorie, die gerade bearbeitet wird */
let _editCatId = null;

/**
 * Öffnet das Edit-Modal vorausgefüllt mit den aktuellen Werten der Kategorie.
 * @param {string} id
 */
export function openEditCatModal(id) {
  const cat = getCat(id);
  if (!cat) return;
  _editCatId = id;
  const n = cat.name;
  document.getElementById('editCatNameDe').value = typeof n === 'string' ? n : (n.de || '');
  document.getElementById('editCatNameEs').value = typeof n === 'string' ? '' : (n.es || '');
  document.getElementById('editCatType').value   = cat.type;
  document.getElementById('editCatColor').value  = cat.color;
  document.getElementById('editCatModal').classList.add('is-open');
}

/**
 * Speichert die Änderungen an der Kategorie.
 */
export function saveEditCat() {
  if (!_editCatId) return;
  const nameDe = document.getElementById('editCatNameDe').value.trim();
  const nameEs = document.getElementById('editCatNameEs').value.trim();
  const type   = document.getElementById('editCatType').value;
  const color  = document.getElementById('editCatColor').value;

  if (!nameDe) { toast(t('toastEnterName')); return; }

  // Namens-Duplikat prüfen (andere Kategorien, nicht sich selbst)
  const lowerDe = nameDe.toLowerCase();
  const lowerEs = nameEs.toLowerCase();
  const duplicate = appData.categories.some(c => {
    if (c.id === _editCatId) return false;
    const existing = catName(c).toLowerCase();
    const existEs  = (typeof c.name === 'object' ? c.name.es : '') || '';
    return existing === lowerDe || existing === lowerEs ||
           (lowerEs && (existEs.toLowerCase() === lowerDe || existEs.toLowerCase() === lowerEs));
  });
  if (duplicate) { toast(t('toastNameExists')); return; }

  const cat = appData.categories.find(c => c.id === _editCatId);
  cat.name  = { de: nameDe, es: nameEs };
  cat.type  = type;
  cat.color = color;

  saveData();
  closeEditCatModal();
  renderCategories();
  populateCategorySelect();
  toast(t('toastCatUpdated', escHtml(nameDe)));
}

/** Schließt das Edit-Modal und setzt den Zustand zurück. */
export function closeEditCatModal() {
  document.getElementById('editCatModal').classList.remove('is-open');
  _editCatId = null;
}

/**
 * Löschen aus dem Edit-Modal heraus:
 * Modal schließen, dann normalen Lösch-Flow starten.
 */
export function deleteFromEditModal() {
  const id = _editCatId;
  closeEditCatModal();
  deleteCategory(id);
}

// ── Kategorie löschen ─────────────────────────────────────────────────────────

/** ID der Kategorie, die zum Löschen markiert ist */
let _deleteCatId = null;

/**
 * Initiiert das Löschen einer Kategorie.
 * Bei vorhandenen Transaktionen wird das Modal geöffnet.
 *
 * @param {string} id
 */
export function deleteCategory(id) {
  const cat   = getCat(id);
  const usage = appData.transactions.filter(tx => tx.categoryId === id).length;

  if (usage === 0) {
    if (!confirm(t('confirmDeleteCat', catName(cat)))) return;
    appData.categories = appData.categories.filter(c => c.id !== id);
    saveData(); renderCategories(); populateCategorySelect();
    toast(t('toastCatDeleted'));
    return;
  }

  // Modal öffnen
  _deleteCatId = id;
  document.getElementById('modalDesc').textContent       = t('modalDesc', catName(cat), usage);
  document.getElementById('modalMoveLabel').textContent  = t('modalMoveLabel');
  document.getElementById('btnDeleteTx').textContent     = t('btnDeleteTx');
  document.getElementById('btnMove').textContent         = t('btnMoveTx');
  document.getElementById('btnCancelModal').textContent  = t('btnCancel');

  const others = appData.categories.filter(c => c.id !== id && c.type === cat.type);
  const sel    = document.getElementById('modalMoveTarget');
  const sec    = document.getElementById('modalMoveSection');
  const btn    = document.getElementById('btnMove');

  if (others.length) {
    sel.innerHTML = others.map(c => `<option value="${c.id}">${escHtml(catName(c))}</option>`).join('');
    sec.classList.add('is-visible');
    btn.classList.add('is-visible');
  } else {
    sec.classList.remove('is-visible');
    btn.classList.remove('is-visible');
  }

  document.getElementById('deleteCatModal').classList.add('is-open');
}

/**
 * Führt die gewählte Modal-Aktion aus.
 *
 * @param {'move'|'delete'} action
 */
export function confirmDeleteCategory(action) {
  if (!_deleteCatId) return;
  const id = _deleteCatId;

  if (action === 'move') {
    const target = document.getElementById('modalMoveTarget').value;
    appData.transactions.forEach(tx => { if (tx.categoryId === id) tx.categoryId = target; });
    toast(t('toastTxsMoved'));
  } else {
    appData.transactions = appData.transactions.filter(tx => tx.categoryId !== id);
    toast(t('toastTxsDeleted'));
  }

  appData.categories = appData.categories.filter(c => c.id !== id);
  saveData(); closeModal(); renderCategories(); populateCategorySelect();
  if (document.getElementById('tab-dashboard').classList.contains('active'))    renderDashboard();
  if (document.getElementById('tab-transactions').classList.contains('active')) renderTransactionTable();
}

/** Schließt das Lösch-Modal und setzt den Zustand zurück. */
export function closeModal() {
  document.getElementById('deleteCatModal').classList.remove('is-open');
  _deleteCatId = null;
}
