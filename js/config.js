/**
 * @module config
 * Lädt die App-Konfiguration aus config.json und stellt Standardwerte bereit.
 * Muss einmalig ganz am Anfang der App-Initialisierung aufgerufen werden.
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} googleClientId   - OAuth 2.0 Client-ID aus der Google Cloud Console
 * @property {string} locale           - BCP-47 Locale für Zahlenformatierung (z.B. "de-DE")
 * @property {string} currency         - ISO 4217 Währungscode (z.B. "EUR")
 * @property {number} historyMonths    - Anzahl der Monate im Verlauf-Diagramm
 * @property {number} syncDebounceMs   - Debounce-Delay vor jedem Drive-Schreibvorgang (ms)
 * @property {string} driveFolderName  - Ordnername in Google Drive; leer = Ablage im Root
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} googleClientId   - OAuth 2.0 Client-ID aus der Google Cloud Console
 * @property {string} locale           - BCP-47 Locale für Zahlenformatierung (z.B. "de-DE")
 * @property {string} currency         - ISO 4217 Währungscode (z.B. "EUR")
 * @property {number} historyMonths    - Anzahl der Monate im Verlauf-Diagramm
 * @property {number} syncDebounceMs   - Debounce-Delay vor jedem Drive-Schreibvorgang (ms)
 * @property {string} driveFolderName  - Ordnername in Google Drive (ohne Slashes); leer = Root
 * @property {string} dataFileName     - Dateiname der JSON-Datendatei in Drive
 * @property {number} sharedPersonCount - Anzahl der Personen bei geteilten Ausgaben (Standard: 2)
 */

/** @type {AppConfig} */
export const config = {
  googleClientId:   '',
  locale:           'de-DE',
  currency:         'EUR',
  historyMonths:    6,
  syncDebounceMs:   1500,
  driveFolderName:  'Haushaltsplan',
  dataFileName:     'haushaltsplan.json',
  sharedPersonCount: 2,
};

/**
 * Lädt `config.json` und überschreibt die Standardwerte mit den darin enthaltenen Werten.
 * Unbekannte Schlüssel werden ignoriert; fehlende Schlüssel behalten ihren Standardwert.
 * Schlägt das Laden fehl (Datei nicht vorhanden, ungültiges JSON), bleiben die Defaults erhalten.
 *
 * @returns {Promise<void>}
 */
export async function loadConfig() {
  try {
    const res = await fetch('./config.json');
    if (!res.ok) return;
    const cfg = await res.json();
    if (cfg.googleClientId  !== undefined) config.googleClientId  = cfg.googleClientId;
    if (cfg.locale          !== undefined) config.locale          = cfg.locale;
    if (cfg.currency        !== undefined) config.currency        = cfg.currency;
    if (cfg.historyMonths   !== undefined) config.historyMonths   = cfg.historyMonths;
    if (cfg.syncDebounceMs  !== undefined) config.syncDebounceMs  = cfg.syncDebounceMs;
    // Führende/abschließende Slashes entfernen, damit "/Haushaltsplan/" → "Haushaltsplan"
    if (cfg.driveFolderName !== undefined) config.driveFolderName = cfg.driveFolderName.replace(/^\/+|\/+$/g, '');
    if (cfg.data                !== undefined) config.dataFileName      = cfg.data;
    if (cfg.sharedPersonCount   !== undefined) config.sharedPersonCount = cfg.sharedPersonCount;
  } catch {
    /* Defaults bleiben erhalten – App startet im Offline-Modus */
  }
}
