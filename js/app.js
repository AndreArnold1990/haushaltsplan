/**
 * @module app
 * Einstiegspunkt der Haushaltsplan-App.
 *
 * Aufgaben:
 * 1. Konfiguration laden.
 * 2. Sprache aus localStorage wiederherstellen.
 * 3. Lokale Daten initialisieren und alle Module starten.
 * 4. Firebase Auth + Firestore Sync starten.
 * 5. Event-Listener für alle Buttons/Selects setzen (kein inline-onclick mehr).
 * 6. Service Worker registrieren.
 */

import { config }                                        from './config.js';
import { loadData, saveData, setOnSaveCallback,
         setAppData, appData, setCurrentUser }          from './store.js';
import { renderDashboard, openSettlementModal,
         closeSettlementModal, saveSettlement }         from './dashboard.js';
import { renderTransactions, populateCategorySelect,
         renderTransactionTable, renderSharedTransactionTable,
         addTransaction,
         openEditTxModal, closeEditTxModal, saveEditTx, deleteEditTx } from './transactions.js';
import { renderCategories, addCategory,
         confirmDeleteCategory, closeModal,
         openEditCatModal, saveEditCat, closeEditCatModal,
         deleteFromEditModal }                          from './categories.js';
import { openAddTxModal, closeAddTxModal }               from './transactions.js';
import { setAuthUI, setSyncUI, showTab }                from './ui.js';
import { applyRecurringRules, addRecurringRule, deleteRecurringRule,
         openEditRecurringModal, closeEditRecurringModal, saveEditRecurringRule,
         renderRecurringRules, populateRecurringCategorySelect,
         populateRecurringSplitSelect }                 from './recurring.js';
import { t, setLanguage, setLangChangeCallback,
         applyTranslations, currentLang }               from './i18n.js';
import * as Firebase                                    from './firebase.js';

// ── Initialisierung ───────────────────────────────────────────────────────────

(async () => {
  loadData();

  setOnSaveCallback(() => Firebase.scheduleSave(appData));

  setLangChangeCallback(() => {
    _updateLangButton();
    _renderAll();
    const authArea = document.getElementById('authArea');
    const authState = authArea?.querySelector('.user-pill')   ? 'signed-in'
                    : authArea?.querySelector('.btn-google')  ? 'signed-out'
                    : null;
    if (authState) setAuthUI(authState);
    setSyncUI('offline');
  });

  applyTranslations();
  _updateLangButton();
  _showSignInHint(true);
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

  _initEventListeners();

  Firebase.init({
    firebaseConfig: config.firebaseConfig,
    householdId:    config.householdId,
    debounceMs:     config.syncDebounceMs,
    onAuthUI:       setAuthUI,
    onSyncUI:       setSyncUI,
    onDataLoaded:   _onDataLoaded,
    onFileNotFound: _onFileNotFound,
  });

  if ('serviceWorker' in navigator) {
    let _reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloading) return;
      _reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        // Sofort beim Start prüfen
        reg.update();

        // Auch prüfen wenn App aus dem Hintergrund kommt (iOS PWA)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update();
        });
      })
      .catch(e => console.warn('SW:', e));
  }
})();

// ── Event-Listener ────────────────────────────────────────────────────────────

function _initEventListeners() {
  // ── Header ────────────────────────────────────────────────────────────────

  document.getElementById('btnCloseBanner')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('setupBanner').classList.remove('is-visible');
  });

  document.getElementById('langToggle').addEventListener('click', () =>
    setLanguage(currentLang === 'de' ? 'es' : 'de')
  );

  // ── Navigation ────────────────────────────────────────────────────────────

  document.querySelectorAll('nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () =>
      showTab(btn.dataset.tab, btn, { renderDashboard, renderTransactions, renderCategories, renderRecurringRules })
    );
  });

  // ── Einstellungen Sub-Tabs ────────────────────────────────────────────────
  document.querySelectorAll('.settings-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-subtab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('settings-' + btn.dataset.settingsTab).classList.add('active');
      if (btn.dataset.settingsTab === 'recurring') {
        populateRecurringCategorySelect();
        populateRecurringSplitSelect();
        renderRecurringRules();
      }
    });
  });

  // ── Wiederkehrende Ausgaben ───────────────────────────────────────────────
  document.getElementById('btnAddRecurring').addEventListener('click', addRecurringRule);
  document.getElementById('recCategory').addEventListener('change', () => {
    populateRecurringCategorySelect();
  });

  // ── Modal: Wiederkehrende Ausgabe bearbeiten ──────────────────────────────
  document.getElementById('btnSaveEditRecurring').addEventListener('click',   saveEditRecurringRule);
  document.getElementById('btnCancelEditRecurring').addEventListener('click', closeEditRecurringModal);

  document.querySelector('.nav-add-btn').addEventListener('click', openAddTxModal);

  // ── Transaktionen-Tab ─────────────────────────────────────────────────────

  document.querySelector('.btn-add-tx')?.addEventListener('click', openAddTxModal);

  document.getElementById('txMonthFilter').addEventListener('change', () => {
    renderTransactionTable();
    renderSharedTransactionTable();
  });

  // ── Kategorien-Formular ───────────────────────────────────────────────────

  document.getElementById('btnAddCategory').addEventListener('click', addCategory);

  // ── Modal: Transaktion hinzufügen ─────────────────────────────────────────

  document.getElementById('btnConfirmAddTx').addEventListener('click', addTransaction);
  document.getElementById('btnCancelAddTx').addEventListener('click', closeAddTxModal);

  // ── Modal: Transaktion bearbeiten ─────────────────────────────────────────

  document.getElementById('btnSaveEditTx').addEventListener('click',   saveEditTx);
  document.getElementById('btnDeleteEditTx').addEventListener('click', deleteEditTx);
  document.getElementById('btnCancelEditTx').addEventListener('click', closeEditTxModal);

  // ── Modal: Kategorie bearbeiten ───────────────────────────────────────────

  document.getElementById('btnSaveEditCat').addEventListener('click', saveEditCat);
  document.getElementById('btnDeleteFromEditCat').addEventListener('click', deleteFromEditModal);
  document.getElementById('btnCancelEditCat').addEventListener('click', closeEditCatModal);

  // ── Modal: Kategorie löschen ──────────────────────────────────────────────

  document.getElementById('btnDeleteTx').addEventListener('click',    () => confirmDeleteCategory('delete'));
  document.getElementById('btnMove').addEventListener('click',        () => confirmDeleteCategory('move'));
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);

  // ── Modal: Ausgleich ──────────────────────────────────────────────────────

  document.getElementById('btnSettle').addEventListener('click',        openSettlementModal);
  document.getElementById('btnConfirmSettle').addEventListener('click', saveSettlement);
  document.getElementById('btnCancelSettle').addEventListener('click',  closeSettlementModal);

  // ── Event-Delegation ──────────────────────────────────────────────────────

  document.addEventListener('click', e => {
    // Wiederkehrende Regel bearbeiten (data-rec-edit-id auf dem Button)
    const recEditEl = e.target.closest('[data-rec-edit-id]');
    if (recEditEl) { openEditRecurringModal(recEditEl.dataset.recEditId); return; }

    // Wiederkehrende Regel löschen (data-rec-id auf dem Button)
    const recEl = e.target.closest('[data-rec-id]');
    if (recEl) { deleteRecurringRule(recEl.dataset.recId); return; }

    // Transaktion bearbeiten (data-tx-edit-id auf der Tabellenzeile)
    const txEditEl = e.target.closest('[data-tx-edit-id]');
    if (txEditEl) { openEditTxModal(txEditEl.dataset.txEditId); return; }

    // Kategorie bearbeiten (data-cat-id auf dem Listeneintrag)
    const catEl = e.target.closest('[data-cat-id]');
    if (catEl) { openEditCatModal(catEl.dataset.catId); return; }

    // Klick außerhalb der Modal-Box → Modal schließen
    if (e.target.classList.contains('modal-overlay')) {
      const closeFns = {
        deleteCatModal:      closeModal,
        addTxModal:          closeAddTxModal,
        editTxModal:         closeEditTxModal,
        editCatModal:        closeEditCatModal,
        settlementModal:     closeSettlementModal,
        editRecurringModal:  closeEditRecurringModal,
      };
      closeFns[e.target.id]?.();
      return;
    }

    // Dynamisch injizierte Auth-Buttons (von ui.js via innerHTML)
    if (e.target.closest('.js-sign-in'))  { Firebase.signIn();  return; }
    if (e.target.closest('.js-sign-out')) { Firebase.signOut(); return; }
  });
}

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

function _onDataLoaded(data) {
  if (!data.users)          data.users          = {};
  if (!data.recurringRules) data.recurringRules = [];
  setAppData(data);
  if (applyRecurringRules()) saveData(); // Fehlende Monate automatisch auffüllen
  const user = Firebase.getUser();
  if (user) {
    setCurrentUser(user);
    _migrateUnknownTransactions(user);
    _updateUserProfile(user);
  }
  _showSignInHint(false);
  _renderAll();
}

/**
 * Speichert Vorname + Profilbild des aktuellen Nutzers in appData.users.
 * @param {{ sub: string, given_name?: string, name?: string, email?: string, picture?: string }} user
 */
function _updateUserProfile(user) {
  if (!user?.sub) return;
  const firstName = user.given_name || user.name?.split(' ')[0] || user.email || '?';
  const picture   = user.picture || null;
  const existing  = appData.users[user.sub];
  if (existing?.firstName === firstName && existing?.picture === picture) return;
  appData.users[user.sub] = { firstName, picture };
  saveData();
}

/**
 * Weist Transaktionen ohne `createdBy` dem aktuellen Nutzer zu –
 * aber nur wenn noch kein zweiter Nutzer existiert (einmalige Migration).
 * Verhindert, dass ein Nutzer fremde Einträge in Besitz nimmt.
 * @param {{ sub: string }} user
 */
function _migrateUnknownTransactions(user) {
  const otherUsersExist = Object.keys(appData.users || {}).some(s => s !== user.sub);
  if (otherUsersExist) return; // Zweiter Nutzer bereits registriert → keine Migration
  let changed = false;
  appData.transactions.forEach(tx => {
    if (!tx.createdBy) { tx.createdBy = { sub: user.sub }; changed = true; }
  });
  if (changed) saveData();
}

function _onFileNotFound() {
  if (confirm(t('fileNotFoundMsg'))) {
    Firebase.createNewFile(appData);
  }
}

/**
 * Zeigt oder versteckt den Anmelde-Hinweis im Dashboard via CSS-Klassen.
 * @param {boolean} visible - true = Hinweis sichtbar, false = Dashboard-Inhalt sichtbar
 */
function _showSignInHint(visible) {
  document.getElementById('signInHint').classList.toggle('is-hidden', !visible);
  document.getElementById('dashboardContent').classList.toggle('is-visible', !visible);
}

/** Aktualisiert den Sprach-Toggle-Button im Header. */
function _updateLangButton() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.textContent = currentLang === 'es' ? '🇪🇸' : '🇩🇪';
  btn.title       = t('langToggleTitle');
}
