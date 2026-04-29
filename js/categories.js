/**
 * @module categories
 * Rendert die Kategorie-Verwaltung und behandelt Hinzufügen/Löschen mit Modal-Dialog.
 */

import { appData, saveData }                            from './store.js';
import { t }                                            from './i18n.js';
import { getCat, escHtml, toast }                       from './utils.js';
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
    return `<div class="category-item">
      <div class="category-item-left">
        <div class="color-swatch" style="background:${c.color}"></div>
        <span class="cat-name">${escHtml(c.name)}</span>
      </div>
      <div class="category-item-actions">
        <button class="btn btn-edit btn-sm" onclick="openEditCatModal('${c.id}')">${t('btnEdit')}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">${t('btnDelete')}</button>
      </div>
    </div>`;
  }).join('');
}

/**
 * Liest das Kategorie-Formular aus und fügt eine neue Kategorie hinzu.
 */
export function addCategory() {
  const name  = document.getElementById('catName').value.trim();
  const type  = document.getElementById('catType').value;
  const color = document.getElementById('catColor').value;

  if (!name) { toast(t('toastEnterName')); return; }
  if (appData.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    toast(t('toastNameExists'));
    return;
  }

  appData.categories.push({ id: 'cat_' + Date.now(), name, type, color });
  saveData();
  document.getElementById('catName').value = '';
  renderCategories();
  populateCategorySelect();
  toast(t('toastCatAdded', escHtml(name)));
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
  document.getElementById('editCatName').value  = cat.name;
  document.getElementById('editCatType').value  = cat.type;
  document.getElementById('editCatColor').value = cat.color;
  document.getElementById('editCatModal').style.display = 'flex';
}

/**
 * Speichert die Änderungen an der Kategorie.
 */
export function saveEditCat() {
  if (!_editCatId) return;
  const name  = document.getElementById('editCatName').value.trim();
  const type  = document.getElementById('editCatType').value;
  const color = document.getElementById('editCatColor').value;

  if (!name) { toast(t('toastEnterName')); return; }

  // Namens-Duplikat prüfen (andere Kategorien, nicht sich selbst)
  const duplicate = appData.categories.some(
    c => c.id !== _editCatId && c.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) { toast(t('toastNameExists')); return; }

  const cat = appData.categories.find(c => c.id === _editCatId);
  cat.name  = name;
  cat.type  = type;
  cat.color = color;

  saveData();
  closeEditCatModal();
  renderCategories();
  populateCategorySelect();
  toast(t('toastCatUpdated', escHtml(name)));
}

/** Schließt das Edit-Modal und setzt den Zustand zurück. */
export function closeEditCatModal() {
  document.getElementById('editCatModal').style.display = 'none';
  _editCatId = null;
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
    if (!confirm(t('confirmDeleteCat', cat.name))) return;
    appData.categories = appData.categories.filter(c => c.id !== id);
    saveData(); renderCategories(); populateCategorySelect();
    toast(t('toastCatDeleted'));
    return;
  }

  // Modal öffnen
  _deleteCatId = id;
  document.getElementById('modalDesc').textContent       = t('modalDesc', cat.name, usage);
  document.getElementById('modalMoveLabel').textContent  = t('modalMoveLabel');
  document.getElementById('btnDeleteTx').textContent     = t('btnDeleteTx');
  document.getElementById('btnMove').textContent         = t('btnMoveTx');
  document.getElementById('btnCancelModal').textContent  = t('btnCancel');

  const others = appData.categories.filter(c => c.id !== id && c.type === cat.type);
  const sel    = document.getElementById('modalMoveTarget');
  const sec    = document.getElementById('modalMoveSection');
  const btn    = document.getElementById('btnMove');

  if (others.length) {
    sel.innerHTML     = others.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    sec.style.display = 'block';
    btn.style.display = 'inline-flex';
  } else {
    sec.style.display = 'none';
    btn.style.display = 'none';
  }

  document.getElementById('deleteCatModal').style.display = 'flex';
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
  document.getElementById('deleteCatModal').style.display = 'none';
  _deleteCatId = null;
}

/**
 * Schließt das Modal bei Klick außerhalb der Modal-Box.
 * @param {MouseEvent} e
 */
export function modalOverlayClick(e) {
  if (e.target === document.getElementById('deleteCatModal')) closeModal();
}
