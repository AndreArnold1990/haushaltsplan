/**
 * @module app
 * Einstiegspunkt der Haushaltsplan-App.
 *
 * Aufgaben:
 * 1. Konfiguration aus config.json laden.
 * 2. Sprache aus localStorage wiederherstellen.
 * 3. Lokale Daten laden und alle Module initialisieren.
 * 4. Google Drive Sync starten.
 * 5. Service Worker registrieren.
 * 6. Globale Funktionen für HTML-onclick-Handler auf window exponieren.
 */

import { loadConfig, config }                           from './config.js';
import { loadData, saveData, setOnSaveCallback,
         setAppData, appData, setCurrentUser }          from './store.js';
import { renderDashboard, openSettlementModal,
         closeSettlementModal, saveSettlement }         from './dashboard.js';
import { renderTransactions, populateCategorySelect,
         renderTransactionTable, renderSharedTransactionTable,
         addTransaction, deleteTransaction }            from './transactions.js';
import { renderCategories, addCategory, deleteCategory,
         confirmDeleteCategory, closeModal, modalOverlayClick,
         openEditCatModal, saveEditCat,
         closeEditCatModal }                            from './categories.js';
import { openAddTxModal, closeAddTxModal }               from './transactions.js';
import { setAuthUI, setSyncUI, showTab }                from './ui.js';
import { t, setLanguage, setLangChangeCallback,
         applyTranslations, currentLang }               from './i18n.js';
import * as Drive                                       from './drive.js';

// ── Initialisierung ───────────────────────────────────────────────────────────

(async () => {
  await loadConfig();

  // Online-Only: leere Daten initialisieren (räumt auch alten localStorage-Cache auf)
  loadData();

  // Sync-Callback: nach jedem saveData() per Drive-Debounce schreiben
  setOnSaveCallback(() => Drive.scheduleSave(appData));

  // Sprach-Callback: dynamischen Inhalt nach Sprachumschaltung neu rendern
  setLangChangeCallback(() => {
    _updateLangButton();
    _renderAll();
    const authState = document.getElementById('authArea')?.querySelector('.user-pill')
      ? 'signed-in' : document.getElementById('authArea')?.querySelector('.btn-google')
        ? 'signed-out' : null;
    if (authState) setAuthUI(authState);
    setSyncUI('offline');
  });

  // Initiales Rendering: App-Shell ohne Daten — zeigt Anmelde-Hinweis
  applyTranslations();
  _updateLangButton();
  _showSignInHint(true);
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

  // Google Drive Sync
  Drive.init({
    clientId:        config.googleClientId,
    driveFolderName: config.driveFolderName,
    dataFileName:    config.dataFileName,
    debounceMs:      config.syncDebounceMs,
    onAuthUI:        setAuthUI,
    onSyncUI:        setSyncUI,
    onDataLoaded:    _onDataLoadedFromDrive,
    onFileNotFound:  _onFileNotFound,
    onConflict:      _onConflict,
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW:', e));
  }
})();

// ── Interne Hilfsmittel ───────────────────────────────────────────────────────

function _renderAll() {
  renderDashboard();
  renderCategories();
  populateCategorySelect();
  if (document.getElementById('tab-transactions').classList.contains('active')) {
    renderTransactionTable();
    renderSharedTransactionTable();
  }
}

function _onDataLoadedFromDrive(data) {
  setAppData(data);
  const user = Drive.getUser();
  if (user) {
    setCurrentUser(user);
    _migrateUnknownTransactions(user);
  }
  _showSignInHint(false);
  _renderAll();
}

/**
 * Weist Transaktionen ohne `createdBy` dem aktuellen Nutzer zu (einmalige Migration).
 * @param {{ sub: string }} user
 */
function _migrateUnknownTransactions(user) {
  let changed = false;
  appData.transactions.forEach(tx => {
    if (!tx.createdBy) {
      tx.createdBy = { sub: user.sub };
      changed = true;
    }
  });
  if (changed) saveData();
}

function _onFileNotFound() {
  if (confirm(t('fileNotFoundMsg'))) {
    Drive.createNewFile(appData);
  }
}

function _onConflict({ overwrite, reload }) {
  if (confirm(t('conflictMsg'))) {
    overwrite();
  } else {
    reload();
  }
}

/**
 * Zeigt oder versteckt den Anmelde-Hinweis im Dashboard.
 * @param {boolean} visible
 */
function _showSignInHint(visible) {
  document.getElementById('signInHint').style.display = visible ? 'flex' : 'none';
  // Dashboard-Karten ausblenden bis Daten geladen
  document.getElementById('dashboardContent').style.display = visible ? 'none' : 'block';
}

/**
 * Aktualisiert den Sprach-Toggle-Button im Header.
 */
function _updateLangButton() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  if (currentLang === 'es') {
    btn.textContent = '🇪🇸';
    btn.title       = t('langToggleTitle'); // "Cambiar a Deutsch"
  } else {
    btn.textContent = '🇩🇪';
    btn.title       = t('langToggleTitle'); // "Auf Español wechseln"
  }
}

// ── Globale Funktionen ────────────────────────────────────────────────────────

window.showTab = (name, btn) => showTab(name, btn, {
  renderDashboard,
  renderTransactions,
  renderCategories,
});

/** Schaltet zwischen Deutsch und Spanisch um. */
window.switchLanguage = () => {
  setLanguage(currentLang === 'de' ? 'es' : 'de');
};

window.DriveSync = {
  signIn:          () => Drive.signIn(),
  signOut:         () => Drive.signOut(),
  createNewFile:   (data) => Drive.createNewFile(data),
  checkForUpdates: () => {
    const btn = document.getElementById('refreshBtn');
    btn?.classList.add('spinning');
    btn?.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    Drive.checkForUpdates();
  },
};

window.addTransaction               = addTransaction;
window.deleteTransaction            = deleteTransaction;
window.renderTransactionTable       = renderTransactionTable;
window.renderSharedTransactionTable = renderSharedTransactionTable;
window.openAddTxModal               = openAddTxModal;
window.closeAddTxModal              = closeAddTxModal;

window.addCategory            = addCategory;
window.deleteCategory         = deleteCategory;
window.confirmDeleteCategory  = confirmDeleteCategory;
window.closeModal             = closeModal;
window.modalOverlayClick      = modalOverlayClick;
window.openEditCatModal       = openEditCatModal;
window.saveEditCat            = saveEditCat;
window.closeEditCatModal      = closeEditCatModal;
window.openSettlementModal    = openSettlementModal;
window.closeSettlementModal   = closeSettlementModal;
window.saveSettlement         = saveSettlement;
