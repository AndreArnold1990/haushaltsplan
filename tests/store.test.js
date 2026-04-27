/**
 * @file store.test.js
 * Tests für die Datenhaltungsschicht (js/store.js) im Online-Only-Modus.
 *
 * Online-Only bedeutet:
 * – loadData() initialisiert immer mit leeren Daten (kein localStorage-Read)
 * – loadData() löscht vorhandene localStorage-Einträge (Cache-Bereinigung)
 * – saveData() schreibt NICHT in localStorage, nur Drive-Callback
 * – Alle Daten kommen ausschließlich aus Google Drive (via onDataLoaded)
 */

import {
  STORAGE_KEY, DEFAULT_DATA,
  appData, loadData, saveData,
  setAppData, setOnSaveCallback,
} from '../js/store.js';

// ── Hilfsmittel ───────────────────────────────────────────────────────────────

function seedStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function storedData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Test-Suiten ───────────────────────────────────────────────────────────────

export async function runStoreTests(suite, assert, assertEqual) {

  // ── 1. loadData – Online-Only-Verhalten ────────────────────────────────────
  suite('store.loadData – Online-Only (kein localStorage)', test => {
    test('initialisiert appData als leere Struktur', async () => {
      loadData();
      assert(Array.isArray(appData.categories),   'categories muss ein Array sein');
      assert(Array.isArray(appData.transactions),  'transactions muss ein Array sein');
      assertEqual(appData.categories.length,   0, 'categories muss leer sein');
      assertEqual(appData.transactions.length, 0, 'transactions muss leer sein');
    });

    test('liest NICHT aus localStorage – auch wenn Daten vorhanden sind', async () => {
      seedStorage({ categories: [{ id: 'c99', name: 'Alt', type: 'income', color: '#fff' }], transactions: [] });
      loadData();
      assertEqual(appData.categories.length, 0,
        'loadData darf vorhandene localStorage-Daten nicht laden');
    });

    test('löscht vorhandene localStorage-Einträge (Cache-Bereinigung)', async () => {
      seedStorage({ categories: [], transactions: [] });
      loadData();
      assertEqual(storedData(), null,
        'loadData muss alte localStorage-Daten löschen');
    });

    test('wirft keinen Fehler wenn localStorage leer ist', async () => {
      localStorage.removeItem(STORAGE_KEY);
      loadData();
      assert(true, 'Kein Fehler bei leerem localStorage');
    });
  });

  // ── 2. saveData – kein localStorage-Write ─────────────────────────────────
  suite('store.saveData – schreibt nicht in localStorage', test => {
    test('schreibt nicht in localStorage', async () => {
      localStorage.removeItem(STORAGE_KEY);
      setOnSaveCallback(null);
      setAppData({ categories: [{ id: 'c1', name: 'Test', type: 'income', color: '#000' }], transactions: [] });
      saveData();
      assertEqual(storedData(), null,
        'saveData darf nicht in localStorage schreiben');
    });

    test('ruft den Drive-Sync-Callback auf', async () => {
      let callCount = 0;
      setOnSaveCallback(() => { callCount++; });
      setAppData({ categories: [], transactions: [] });
      saveData();
      assertEqual(callCount, 1, 'Drive-Callback muss einmal aufgerufen werden');
      setOnSaveCallback(null);
    });

    test('wirft keinen Fehler wenn kein Callback registriert ist', async () => {
      setOnSaveCallback(null);
      setAppData({ categories: [], transactions: [] });
      saveData();
      assert(true, 'Kein Fehler ohne Callback');
    });
  });

  // ── 3. setAppData – Drive-Daten übernehmen ─────────────────────────────────
  suite('store.setAppData – Daten aus Drive übernehmen', test => {
    test('ersetzt appData vollständig (simuliert onDataLoaded)', async () => {
      loadData(); // leere Ausgangssituation
      assertEqual(appData.categories.length, 0, 'Ausgangszustand: leer');

      const driveData = {
        categories:   [{ id: 'drive_cat', name: 'Drive-Kategorie', type: 'income', color: '#10b981' }],
        transactions: [{ id: 'drive_tx',  date: '2026-04-01', amount: 100, categoryId: 'drive_cat', description: 'Test' }],
      };
      setAppData(driveData);

      assertEqual(appData.categories.length,   1,          'Muss 1 Kategorie aus Drive haben');
      assertEqual(appData.transactions.length, 1,          'Muss 1 Transaktion aus Drive haben');
      assertEqual(appData.categories[0].id,    'drive_cat','ID muss übereinstimmen');
    });
  });

  // ── 4. DEFAULT_DATA – Integrität der Demo-Daten ────────────────────────────
  suite('store.DEFAULT_DATA – Datenintegrität', test => {
    test('alle Kategorien haben die Pflichtfelder id, name, type, color', async () => {
      DEFAULT_DATA.categories.forEach(c => {
        assert(c.id    && c.id.length > 0,    `Kategorie ohne id: ${JSON.stringify(c)}`);
        assert(c.name  && c.name.length > 0,  `Kategorie ohne name: ${c.id}`);
        assert(c.type === 'income' || c.type === 'expense', `Ungültiger type in: ${c.id}`);
        assert(c.color && c.color.startsWith('#'), `Ungültige color in: ${c.id}`);
      });
    });

    test('alle Transaktionen referenzieren vorhandene Kategorie-IDs', async () => {
      const catIds = new Set(DEFAULT_DATA.categories.map(c => c.id));
      DEFAULT_DATA.transactions.forEach(t => {
        assert(catIds.has(t.categoryId),
          `Transaktion "${t.id}" referenziert unbekannte Kategorie "${t.categoryId}"`);
        assert(t.amount > 0, `Transaktion "${t.id}" hat ungültigen Betrag: ${t.amount}`);
      });
    });

    test('alle Transaktionen haben valides ISO-Datum (YYYY-MM-DD)', async () => {
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      DEFAULT_DATA.transactions.forEach(t => {
        assert(iso.test(t.date),
          `Transaktion "${t.id}" hat ungültiges Datum: "${t.date}"`);
      });
    });
  });
}
