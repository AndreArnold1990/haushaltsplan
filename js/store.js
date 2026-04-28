/**
 * @module store
 * Datenhaltung: hält den Anwendungszustand (appData) und persistiert ihn in localStorage.
 *
 * Abhängigkeiten: keine (damit andere Module store.js gefahrlos importieren können)
 */

/** localStorage-Schlüssel für Persistierung */
export const STORAGE_KEY = 'haushaltsplan_v1';

/**
 * @typedef {Object} Category
 * @property {string}              id    - Eindeutige ID (z.B. "cat_1234567890")
 * @property {string}              name  - Anzeigename der Kategorie
 * @property {'income'|'expense'}  type  - Typ: Einnahme oder Ausgabe
 * @property {string}              color - CSS-Farbe (Hex-Code, z.B. "#10b981")
 */

/**
 * @typedef {{ sub: string }} TxOwner
 */

/**
 * @typedef {Object} Transaction
 * @property {string}               id          - Eindeutige ID (z.B. "tx_1234567890")
 * @property {string}               date        - ISO-Datum (YYYY-MM-DD)
 * @property {number}               amount      - Betrag in Euro (positiv, ohne Vorzeichen)
 * @property {string}               categoryId  - Referenz auf {@link Category.id}
 * @property {string}               description - Freitext-Beschreibung
 * @property {TxOwner}              [createdBy]   - Google-sub des Erstellers (fehlt bei Altdaten)
 * @property {'personal'|'shared'|'settlement'} [splitType] - Zahlungstyp: persönlich, geteilt oder Ausgleich
 * @property {string}               [paidByName]  - Anzeigename des Zahlers (nur bei splitType 'shared')
 */

/**
 * @typedef {Object} AppData
 * @property {Category[]}    categories   - Alle definierten Kategorien
 * @property {Transaction[]} transactions - Alle eingetragenen Transaktionen
 */

/**
 * Vordefinierte Demo-Daten, die beim ersten Start geladen werden.
 * @type {AppData}
 */
export const DEFAULT_DATA = {
  categories: [
    { id: 'c1',  name: 'Gehalt',             type: 'income',  color: '#10b981' },
    { id: 'c2',  name: 'Nebeneinkommen',      type: 'income',  color: '#34d399' },
    { id: 'c3',  name: 'Zinsen & Dividenden', type: 'income',  color: '#6ee7b7' },
    { id: 'c4',  name: 'Miete',               type: 'expense', color: '#ef4444' },
    { id: 'c5',  name: 'Lebensmittel',        type: 'expense', color: '#f97316' },
    { id: 'c6',  name: 'Transport',           type: 'expense', color: '#f59e0b' },
    { id: 'c7',  name: 'Entertainment',       type: 'expense', color: '#8b5cf6' },
    { id: 'c8',  name: 'Versicherung',        type: 'expense', color: '#6366f1' },
    { id: 'c9',  name: 'Gesundheit',          type: 'expense', color: '#ec4899' },
    { id: 'c10', name: 'Kleidung',            type: 'expense', color: '#14b8a6' },
  ],
  transactions: [
    { id: 't1',  date: '2025-11-01', amount: 3200, categoryId: 'c1',  description: 'Gehalt November' },
    { id: 't2',  date: '2025-11-05', amount: 850,  categoryId: 'c4',  description: 'Miete November' },
    { id: 't3',  date: '2025-11-08', amount: 320,  categoryId: 'c5',  description: 'Supermarkt' },
    { id: 't4',  date: '2025-11-12', amount: 89,   categoryId: 'c6',  description: 'Monatsticket' },
    { id: 't5',  date: '2025-11-15', amount: 250,  categoryId: 'c2',  description: 'Freelance Arbeit' },
    { id: 't6',  date: '2025-11-18', amount: 45,   categoryId: 'c7',  description: 'Netflix & Spotify' },
    { id: 't7',  date: '2025-11-22', amount: 120,  categoryId: 'c8',  description: 'KFZ Versicherung' },
    { id: 't8',  date: '2025-11-28', amount: 65,   categoryId: 'c9',  description: 'Zahnarzt' },
    { id: 't9',  date: '2025-12-01', amount: 3200, categoryId: 'c1',  description: 'Gehalt Dezember' },
    { id: 't10', date: '2025-12-01', amount: 800,  categoryId: 'c1',  description: 'Weihnachtsgeld' },
    { id: 't11', date: '2025-12-05', amount: 850,  categoryId: 'c4',  description: 'Miete Dezember' },
    { id: 't12', date: '2025-12-10', amount: 450,  categoryId: 'c5',  description: 'Weihnachtseink\u00e4ufe' },
    { id: 't13', date: '2025-12-12', amount: 89,   categoryId: 'c6',  description: 'Monatsticket' },
    { id: 't14', date: '2025-12-15', amount: 280,  categoryId: 'c10', description: 'Winterjacke' },
    { id: 't15', date: '2025-12-18', amount: 45,   categoryId: 'c7',  description: 'Netflix & Spotify' },
    { id: 't16', date: '2025-12-22', amount: 120,  categoryId: 'c8',  description: 'KFZ Versicherung' },
    { id: 't17', date: '2026-01-01', amount: 3200, categoryId: 'c1',  description: 'Gehalt Januar' },
    { id: 't18', date: '2026-01-05', amount: 850,  categoryId: 'c4',  description: 'Miete Januar' },
    { id: 't19', date: '2026-01-08', amount: 290,  categoryId: 'c5',  description: 'Supermarkt' },
    { id: 't20', date: '2026-01-12', amount: 89,   categoryId: 'c6',  description: 'Monatsticket' },
    { id: 't21', date: '2026-01-15', amount: 150,  categoryId: 'c3',  description: 'Dividenden Q4' },
    { id: 't22', date: '2026-01-18', amount: 45,   categoryId: 'c7',  description: 'Netflix & Spotify' },
    { id: 't23', date: '2026-01-22', amount: 120,  categoryId: 'c8',  description: 'KFZ Versicherung' },
    { id: 't24', date: '2026-01-25', amount: 95,   categoryId: 'c9',  description: 'Apotheke' },
    { id: 't25', date: '2026-02-01', amount: 3200, categoryId: 'c1',  description: 'Gehalt Februar' },
    { id: 't26', date: '2026-02-05', amount: 850,  categoryId: 'c4',  description: 'Miete Februar' },
    { id: 't27', date: '2026-02-08', amount: 310,  categoryId: 'c5',  description: 'Supermarkt' },
    { id: 't28', date: '2026-02-12', amount: 89,   categoryId: 'c6',  description: 'Monatsticket' },
    { id: 't29', date: '2026-02-14', amount: 75,   categoryId: 'c7',  description: 'Restaurant Valentinstag' },
    { id: 't30', date: '2026-02-18', amount: 300,  categoryId: 'c2',  description: 'Freelance Arbeit' },
    { id: 't31', date: '2026-02-20', amount: 45,   categoryId: 'c7',  description: 'Netflix & Spotify' },
    { id: 't32', date: '2026-02-22', amount: 120,  categoryId: 'c8',  description: 'KFZ Versicherung' },
    { id: 't33', date: '2026-03-01', amount: 3200, categoryId: 'c1',  description: 'Gehalt M\u00e4rz' },
    { id: 't34', date: '2026-03-05', amount: 850,  categoryId: 'c4',  description: 'Miete M\u00e4rz' },
    { id: 't35', date: '2026-03-08', amount: 275,  categoryId: 'c5',  description: 'Supermarkt' },
    { id: 't36', date: '2026-03-12', amount: 89,   categoryId: 'c6',  description: 'Monatsticket' },
    { id: 't37', date: '2026-03-18', amount: 45,   categoryId: 'c7',  description: 'Netflix & Spotify' },
    { id: 't38', date: '2026-03-22', amount: 120,  categoryId: 'c8',  description: 'KFZ Versicherung' },
    { id: 't39', date: '2026-03-25', amount: 150,  categoryId: 'c10', description: 'Fr\u00fchlingskollektions' },
    { id: 't40', date: '2026-03-28', amount: 200,  categoryId: 'c3',  description: 'Zinsen Sparkonto' },
    { id: 't41', date: '2026-04-01', amount: 3200, categoryId: 'c1',  description: 'Gehalt April' },
    { id: 't42', date: '2026-04-02', amount: 850,  categoryId: 'c4',  description: 'Miete April' },
    { id: 't43', date: '2026-04-05', amount: 180,  categoryId: 'c5',  description: 'Supermarkt' },
    { id: 't44', date: '2026-04-07', amount: 89,   categoryId: 'c6',  description: 'Monatsticket' },
    { id: 't45', date: '2026-04-09', amount: 400,  categoryId: 'c2',  description: 'Freelance Projekt' },
    { id: 't46', date: '2026-04-10', amount: 45,   categoryId: 'c7',  description: 'Netflix & Spotify' },
  ],
};

/**
 * Aktueller Anwendungszustand.
 * Alle anderen Module importieren diese Variable als **Live-Binding** –
 * d.h. sie sehen immer den aktuellen Wert, auch nach einem {@link setAppData}-Aufruf.
 * @type {AppData}
 */
export let appData = { categories: [], transactions: [] };

/**
 * Aktuell angemeldeter Google-Nutzer (wird von app.js nach dem Login gesetzt).
 * @type {{ sub: string, name?: string, given_name?: string, email?: string, picture?: string }|null}
 */
export let currentUser = null;

/** @param {typeof currentUser} user */
export function setCurrentUser(user) { currentUser = user; }

/**
 * Optionaler Callback, der nach jedem {@link saveData}-Aufruf getriggert wird.
 * Wird von app.js gesetzt, um den Google-Drive-Sync zu starten.
 * @type {(() => void)|null}
 */
let _onSaveCallback = null;

/**
 * Registriert einen Callback, der nach jedem Speichervorgang aufgerufen wird.
 * Typischer Anwendungsfall: Drive-Sync starten.
 *
 * @param {() => void} fn - Callback-Funktion
 */
export function setOnSaveCallback(fn) {
  _onSaveCallback = fn;
}

/**
 * Ersetzt appData komplett (z.B. nach dem Laden aus Google Drive).
 * Das Live-Binding in anderen Modulen wird dadurch automatisch aktualisiert.
 *
 * @param {AppData} data
 */
export function setAppData(data) {
  appData = data;
}

/**
 * Initialisiert appData mit leeren Daten.
 * Im Online-Only-Modus kommt die Datenquelle ausschließlich aus Google Drive –
 * localStorage wird weder gelesen noch geschrieben.
 * Löscht zusätzlich eventuell noch vorhandene alte Cache-Daten aus localStorage.
 */
export function loadData() {
  appData = { categories: [], transactions: [] };
  // Alte gecachte Daten aus früheren Versionen entfernen
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignorieren */ }
}

/**
 * Triggert den Drive-Sync-Callback.
 * Daten werden ausschließlich über Google Drive persistiert – kein localStorage.
 */
export function saveData() {
  _onSaveCallback?.();
}
