/**
 * @file store.test.js
 * Tests für die Datenhaltungsschicht (js/store.js).
 *
 * – loadData() initialisiert immer mit leeren Daten (kein localStorage-Read)
 * – loadData() löscht veraltete localStorage-Einträge (Cache-Bereinigung)
 * – saveData() schreibt NICHT in localStorage, ruft nur den Firestore-Callback auf
 * – Alle Daten kommen ausschließlich aus Firestore (via onDataLoaded / setAppData)
 */

import {
  STORAGE_KEY,
  appData, loadData, saveData,
  setAppData, setOnSaveCallback,
} from '../js/store.js';

// ── Hilfsmittel ─────────────────────────���─────────────────────────────────────

function seedStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function storedData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Test-Suiten ───────────────────────────────────────────────────────────────

export async function runStoreTests(suite, assert, assertEqual) {

  // ── 1. loadData ───────────────────────────────────────────────────��────────
  suite('store.loadData – initialisiert leer, bereinigt localStorage', test => {
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

  // ── 2. saveData ────────────────────────────────────────────────────────────
  suite('store.saveData – kein localStorage-Write, nur Firestore-Callback', test => {
    test('schreibt nicht in localStorage', async () => {
      localStorage.removeItem(STORAGE_KEY);
      setOnSaveCallback(null);
      setAppData({ categories: [{ id: 'c1', name: 'Test', type: 'income', color: '#000' }], transactions: [] });
      saveData();
      assertEqual(storedData(), null,
        'saveData darf nicht in localStorage schreiben');
    });

    test('ruft den Firestore-Sync-Callback auf', async () => {
      let callCount = 0;
      setOnSaveCallback(() => { callCount++; });
      setAppData({ categories: [], transactions: [] });
      saveData();
      assertEqual(callCount, 1, 'Firestore-Callback muss einmal aufgerufen werden');
      setOnSaveCallback(null);
    });

    test('wirft keinen Fehler wenn kein Callback registriert ist', async () => {
      setOnSaveCallback(null);
      setAppData({ categories: [], transactions: [] });
      saveData();
      assert(true, 'Kein Fehler ohne Callback');
    });
  });

  // ── 3. setAppData ─────────────────────────────��────────────────────────────
  suite('store.setAppData – Daten aus Firestore übernehmen', test => {
    test('ersetzt appData vollständig (simuliert onDataLoaded)', async () => {
      loadData();
      assertEqual(appData.categories.length, 0, 'Ausgangszustand: leer');

      const firestoreData = {
        categories:   [{ id: 'fs_cat', name: 'Firestore-Kategorie', type: 'income', color: '#10b981' }],
        transactions: [{ id: 'fs_tx',  date: '2026-04-01', amount: 100, categoryId: 'fs_cat', description: 'Test' }],
      };
      setAppData(firestoreData);

      assertEqual(appData.categories.length,   1,       'Muss 1 Kategorie aus Firestore haben');
      assertEqual(appData.transactions.length, 1,       'Muss 1 Transaktion aus Firestore haben');
      assertEqual(appData.categories[0].id,    'fs_cat', 'ID muss übereinstimmen');
    });
  });
}
