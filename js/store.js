/**
 * @module store
 * Datenhaltung: hält den Anwendungszustand (appData) im Arbeitsspeicher.
 * Persistierung erfolgt ausschließlich über Firebase/Firestore – kein localStorage.
 *
 * Abhängigkeiten: keine (damit andere Module store.js gefahrlos importieren können)
 */

/** localStorage-Schlüssel – nur zum Löschen veralteter Cache-Daten aus früheren Versionen */
export const STORAGE_KEY = 'haushaltsplan_v1';

/**
 * @typedef {Object} Category
 * @property {string}                        id    - Eindeutige ID (z.B. "cat_1234567890")
 * @property {{ de: string, es?: string }|string} name  - Mehrsprachiger Name oder Legacy-String
 * @property {'income'|'expense'}            type  - Typ: Einnahme oder Ausgabe
 * @property {string}                        color - Hex-Farbe (z.B. "#10b981")
 */

/**
 * @typedef {Object} Transaction
 * @property {string}  id          - Eindeutige ID (z.B. "tx_1234567890")
 * @property {string}  date        - ISO-Datum (YYYY-MM-DD)
 * @property {number}  amount      - Betrag in Euro (positiv, ohne Vorzeichen)
 * @property {string}  categoryId  - Referenz auf {@link Category.id}
 * @property {string}  description - Freitext-Beschreibung
 * @property {{ sub: string }} [createdBy] - Google UID des Erstellers
 * @property {'personal'|'equal'|'full'|'shared'|'settlement'} [splitType]
 * @property {string}  [paidBySub] - UID desjenigen, der gezahlt hat
 */

/**
 * @typedef {Object} AppData
 * @property {Category[]}                    categories   - Alle Kategorien
 * @property {Transaction[]}                 transactions - Alle Transaktionen
 * @property {Object.<string, { firstName: string, picture: string|null }>} users
 * @property {RecurringRule[]}               recurringRules
 * @property {{ translationApiKey: string }} settings     - App-Einstellungen (via Firestore synchronisiert)
 */

/**
 * Aktueller Anwendungszustand.
 * Andere Module importieren diese Variable als **Live-Binding**.
 * @type {AppData}
 */
export let appData = { categories: [], transactions: [], users: {}, recurringRules: [], settings: { translationApiKey: '' } };

/**
 * Aktuell angemeldeter Nutzer (wird von app.js nach dem Login gesetzt).
 * @type {{ sub: string, name?: string, given_name?: string, email?: string, picture?: string }|null}
 */
export let currentUser = null;

/** @param {typeof currentUser} user */
export function setCurrentUser(user) { currentUser = user; }

/** @type {(() => void)|null} */
let _onSaveCallback = null;

/**
 * Registriert den Firestore-Sync-Callback, der nach jedem {@link saveData}-Aufruf
 * aufgerufen wird.
 * @param {() => void} fn
 */
export function setOnSaveCallback(fn) { _onSaveCallback = fn; }

/**
 * Ersetzt appData komplett (z.B. nach dem Laden aus Firestore).
 * @param {AppData} data
 */
export function setAppData(data) { appData = data; }

/**
 * Initialisiert appData mit leeren Daten und löscht veraltete localStorage-Einträge.
 * Alle echten Daten kommen via Firestore onSnapshot.
 */
export function loadData() {
  appData = { categories: [], transactions: [], users: {}, recurringRules: [], settings: { translationApiKey: '' } };
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignorieren */ }
}

/**
 * Triggert den Firestore-Sync-Callback (debounced Write via scheduleSave). */
export function saveData() { _onSaveCallback?.(); }
