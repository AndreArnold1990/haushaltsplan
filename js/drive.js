/**
 * @module drive
 * Google Drive Sync mit OAuth 2.0 (Google Identity Services – Token Model).
 *
 * ## Ablauf
 * 1. {@link init} – wartet auf das GIS-Script, initialisiert den TokenClient.
 * 2. {@link signIn}  – öffnet den Google-Popup zur Anmeldung.
 * 3. `onToken` (intern) – empfängt den Access-Token, lädt Daten aus Drive.
 * 4. {@link scheduleSave} – debounced Schreibvorgang; wird von store.js getriggert.
 *
 * ## Testbarkeit
 * - Alle HTTP-Aufrufe laufen über `globalThis.fetch` → im Test durch ein Mock ersetzen.
 * - Callbacks (`onAuthUI`, `onSyncUI`, `onDataLoaded`) sind injizierbar → kein DOM nötig.
 * - {@link _resetState} setzt den Modulzustand zurück (nur für Tests verwenden).
 *
 * ## Keine zirkulären Abhängigkeiten
 * Dieses Modul importiert **kein** anderes App-Modul. Daten werden über den
 * `onDataLoaded`-Callback nach außen gereicht; {@link scheduleSave} empfängt
 * die zu speichernden Daten als Parameter.
 */

// ── Drive API Endpunkte ───────────────────────────────────────────────────────
const DRIVE_API    = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API   = 'https://www.googleapis.com/upload/drive/v3';
const USERINFO_API = 'https://www.googleapis.com/oauth2/v3/userinfo';
// drive-Scope: erlaubt alle Dateien im Drive zu finden (nicht nur App-erstellte)
// profile + email: erforderlich, damit die userinfo-API sub/name/email zurückgibt
const SCOPE        = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

/** localStorage-Schlüssel für gecachte IDs und Sitzungsstatus */
const FILE_ID_KEY    = 'hp_drive_file_id';
const FOLDER_ID_KEY  = 'hp_drive_folder_id';
const SIGNED_IN_KEY  = 'hp_was_signed_in';   // gesetzt nach erstem Login, für Auto-Anmeldung
/** Cache-Version – bei Scope-Änderungen erhöhen, damit alte gecachte IDs verworfen werden */
const CACHE_VER_KEY  = 'hp_cache_ver';
const CACHE_VERSION  = 'v3';

/** Inline Google-Logo (SVG) für Auth-Buttons */
export const GOOGLE_LOGO = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>`;

// ── Modulzustand ──────────────────────────────────────────────────────────────

/** @type {object|null} GIS TokenClient */
let _tc       = null;
/** @type {string|null} Aktueller Access-Token */
let _token    = null;
/** @type {number} Ablaufzeitpunkt des Tokens (ms seit Epoch) */
let _expiry   = 0;
/** @type {string|null} Drive File-ID der Datendatei */
let _fileId   = null;
/** @type {string|null} Drive Folder-ID des Zielordners */
let _folderId = null;
/** @type {object|null} Nutzerinformationen aus der Userinfo-API */
let _user     = null;
/** @type {ReturnType<typeof setTimeout>|null} Timer-Handle für Debounce */
let _timer    = null;
/** @type {boolean} true wenn GIS initialisiert und bereit */
let _ready    = false;
/** @type {object|null} Zuletzt übergebene AppData für saveToDrive */
let _data     = null;
/** @type {string|null} Letzter bekannter modifiedTime-Wert der Drive-Datei (ISO 8601) */
let _lastModifiedTime = null;

/**
 * @typedef {Object} DriveInitOptions
 * @property {string}   clientId                    - Google OAuth 2.0 Client-ID
 * @property {string}   [driveFolderName='']        - Ordnername in Drive; leer = Root
 * @property {string}   [dataFileName='haushaltsplan.json'] - Dateiname der JSON-Datendatei
 * @property {number}   [debounceMs=1500]           - Debounce-Delay in ms
 * @property {function(string, object=): void} [onAuthUI]
 *   Callback für Auth-Status-Änderungen.
 *   Mögliche Werte: 'no-config' | 'signed-out' | 'signed-in' | 'error'.
 *   Bei 'signed-in' wird das Nutzerobjekt als zweites Argument übergeben.
 * @property {function(string): void} [onSyncUI]
 *   Callback für Sync-Status-Änderungen.
 *   Mögliche Werte: 'offline' | 'syncing' | 'synced' | 'error'.
 * @property {function(object): void} [onDataLoaded]
 *   Callback, wenn Daten erfolgreich aus Drive geladen wurden.
 *   Empfängt das rohe AppData-Objekt.
 * @property {function(): void} [onFileNotFound]
 *   Callback, wenn keine Datendatei in Drive gefunden wurde.
 *   Typischer Anwendungsfall: Nutzer fragen, ob eine neue Datei angelegt werden soll.
 * @property {function({overwrite: function, reload: function}): void} [onConflict]
 *   Callback, wenn beim Speichern ein Schreib-Konflikt erkannt wurde
 *   (jemand anderes hat die Datei in Drive geändert).
 *   `overwrite()` speichert die lokale Version trotzdem; `reload()` lädt Drive-Version.
 */

/** @type {DriveInitOptions} */
let _opts = {};

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Initialisiert den Google Drive Sync.
 * Wartet asynchron auf das Laden des GIS-Scripts.
 * Ohne gültige `clientId` wird der Offline-Modus aktiviert.
 *
 * @param {DriveInitOptions} options
 */
export function init(options) {
  _opts = { debounceMs: 1500, driveFolderName: '', dataFileName: 'haushaltsplan.json', ...options };

  // Cache-Version prüfen – veraltete IDs verwerfen (z.B. nach Scope-Änderung)
  if (localStorage.getItem(CACHE_VER_KEY) !== CACHE_VERSION) {
    localStorage.removeItem(FILE_ID_KEY);
    localStorage.removeItem(FOLDER_ID_KEY);
    localStorage.setItem(CACHE_VER_KEY, CACHE_VERSION);
  }

  _fileId   = localStorage.getItem(FILE_ID_KEY)   || null;
  _folderId = localStorage.getItem(FOLDER_ID_KEY) || null;

  if (!_opts.clientId) {
    _opts.onAuthUI?.('no-config');
    return;
  }

  _waitForGIS(() => {
    _tc = google.accounts.oauth2.initTokenClient({
      client_id: _opts.clientId,
      scope:     SCOPE,
      callback:  _onToken,
      error_callback: err => {
        if (err.type === 'popup_closed') return;
        // Auto-Anmeldung fehlgeschlagen → normalen Anmelde-Button zeigen
        _opts.onAuthUI?.('signed-out');
        _opts.onSyncUI?.('offline');
      },
    });
    _ready = true;

    if (localStorage.getItem(SIGNED_IN_KEY)) {
      // Zuvor angemeldet → Token still erneuern (kein Popup wenn Google-Session noch aktiv)
      _opts.onSyncUI?.('syncing');
      _tc.requestAccessToken({ prompt: '' });
    } else {
      _opts.onAuthUI?.('signed-out');
      _opts.onSyncUI?.('offline');
    }
  });
}

/**
 * Öffnet den Google-Anmelde-Popup.
 * Nur aufrufbar, nachdem {@link init} abgeschlossen ist.
 */
export function signIn() {
  if (!_ready) return;
  _tc.requestAccessToken({ prompt: '' });
}

/**
 * Meldet den Nutzer ab und widerruft den Access-Token.
 * Daten bleiben lokal erhalten.
 */
export function signOut() {
  if (_token) google.accounts.oauth2.revoke(_token, () => {});
  _token = null;
  _expiry = 0;
  _user = null;
  localStorage.removeItem(SIGNED_IN_KEY);
  _opts.onAuthUI?.('signed-out');
  _opts.onSyncUI?.('offline');
}

/**
 * Plant einen debounced Schreibvorgang in Google Drive.
 * Mehrere schnelle Aufrufe werden zu einem einzigen zusammengefasst.
 *
 * @param {object} data - Aktueller AppData-Zustand, der gespeichert werden soll
 */
export function scheduleSave(data) {
  _data = data;
  clearTimeout(_timer);
  _timer = setTimeout(_saveToDrive, _opts.debounceMs ?? 1500);
}

/**
 * Prüft ob die Drive-Datei seit dem letzten Laden geändert wurde.
 * Bei Änderung wird die Datei neu geladen.
 * Ohne Änderung wird `onSyncUI('synced')` aufgerufen.
 *
 * @returns {Promise<void>}
 */
export async function checkForUpdates() {
  if (!_isAuth() || !_fileId) return;
  _opts.onSyncUI?.('syncing');
  try {
    const meta = await _apiFetch(`${DRIVE_API}/files/${_fileId}?fields=modifiedTime`);
    if (!meta.ok) throw new Error('Metadaten nicht abrufbar');
    const { modifiedTime } = await meta.json();
    if (modifiedTime !== _lastModifiedTime) {
      await _loadFromDrive();
    } else {
      _opts.onSyncUI?.('synced');
    }
  } catch (e) {
    console.error('checkForUpdates error:', e);
    _opts.onSyncUI?.('error');
  }
}

/**
 * Legt eine neue Datendatei in Drive an.
 * Wird aufgerufen, nachdem der Nutzer auf `onFileNotFound` mit "Ja" geantwortet hat.
 *
 * @param {object} data - AppData, das in die neue Datei geschrieben werden soll
 * @returns {Promise<void>}
 */
export async function createNewFile(data) {
  _data = data;
  await _saveToDrive();
}

// ── Interne Hilfsmittel ───────────────────────────────────────────────────────

/**
 * Gibt zurück, ob ein gültiger, nicht abgelaufener Access-Token vorhanden ist.
 * (30 Sekunden Puffer vor dem tatsächlichen Ablauf)
 *
 * @returns {boolean}
 * @package
 */
export const _isAuth  = () => !!_token && Date.now() < _expiry - 30_000;
/** Gibt das aktuelle Nutzerobjekt zurück (null wenn nicht angemeldet). */
export const getUser  = () => _user;

/**
 * Wartet polling-basiert darauf, dass das GIS-Script (`google.accounts.oauth2`) geladen ist.
 *
 * @param {() => void} cb - Callback, der aufgerufen wird, sobald GIS bereit ist
 * @package
 */
export function _waitForGIS(cb) {
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    cb();
  } else {
    setTimeout(() => _waitForGIS(cb), 200);
  }
}

/**
 * Callback, der vom GIS TokenClient nach erfolgreicher Anmeldung aufgerufen wird.
 *
 * @param {{ error?: string, access_token?: string, expires_in?: number }} res
 * @package
 */
export async function _onToken(res) {
  if (res.error) {
    if (res.error !== 'access_denied') {
      console.error('Token error:', res);
      _opts.onAuthUI?.('error');
    }
    return;
  }

  _token  = res.access_token;
  _expiry = Date.now() + res.expires_in * 1000;
  localStorage.setItem(SIGNED_IN_KEY, '1');

  // Token automatisch 2 Minuten vor Ablauf erneuern
  setTimeout(
    () => { if (_ready && _tc) _tc.requestAccessToken({ prompt: '' }); },
    (res.expires_in - 120) * 1000,
  );

  // Nutzerinformationen laden (optional – kein harter Fehler wenn nicht verfügbar)
  try {
    const r = await _apiFetch(USERINFO_API);
    if (r.ok) _user = await r.json();
  } catch { /* ignorieren */ }

  _opts.onAuthUI?.('signed-in', _user);
  await _loadFromDrive();
}

/**
 * Lädt die Datendatei aus Google Drive.
 * Validiert gecachte File-IDs (prüft auf Trash), fragt per `onFileNotFound`-Callback
 * nach, ob eine neue Datei angelegt werden soll.
 *
 * @returns {Promise<void>}
 * @package
 */
export async function _loadFromDrive() {
  if (!_isAuth()) return;
  _opts.onSyncUI?.('syncing');
  try {
    const folderId = await _findOrCreateFolder(_opts.driveFolderName || '');

    // Gecachte File-ID validieren: existiert die Datei noch und liegt nicht im Papierkorb?
    if (_fileId) {
      const meta = await _apiFetch(`${DRIVE_API}/files/${_fileId}?fields=id,trashed,modifiedTime`);
      if (meta.ok) {
        const m = await meta.json();
        if (m.trashed) {
          // Datei im Papierkorb → als nicht vorhanden behandeln
          _fileId = null;
          _lastModifiedTime = null;
          localStorage.removeItem(FILE_ID_KEY);
        } else {
          _lastModifiedTime = m.modifiedTime ?? null;
        }
      } else {
        // 404 oder anderer Fehler → ID veraltet
        _fileId = null;
        _lastModifiedTime = null;
        localStorage.removeItem(FILE_ID_KEY);
      }
    }

    // File-ID per Drive-Suche auflösen wenn noch keine gültige vorhanden
    if (!_fileId) {
      _fileId = await _findFileId(folderId);
      if (_fileId) {
        localStorage.setItem(FILE_ID_KEY, _fileId);
        const meta = await _apiFetch(`${DRIVE_API}/files/${_fileId}?fields=modifiedTime`);
        if (meta.ok) _lastModifiedTime = (await meta.json()).modifiedTime ?? null;
      }
    }

    if (_fileId) {
      const res = await _apiFetch(`${DRIVE_API}/files/${_fileId}?alt=media`);
      if (res.ok) {
        const data = await res.json();
        if (data?.categories && data?.transactions) {
          _opts.onDataLoaded?.(data);
          _opts.onSyncUI?.('synced');
          return;
        }
      }
      // Dateiinhalt nicht lesbar → zurücksetzen
      _fileId = null;
      _lastModifiedTime = null;
      localStorage.removeItem(FILE_ID_KEY);
    }

    // Keine Datei gefunden → Nutzer fragen
    _opts.onSyncUI?.('offline');
    _opts.onFileNotFound?.();
  } catch (e) {
    console.error('Drive load error:', e);
    _opts.onSyncUI?.('error');
  }
}

/**
 * Schreibt `_data` in die Drive-Datei (Update oder Neuanlage).
 * Vor dem Schreiben wird geprüft, ob die Datei in Drive seit dem letzten Laden
 * geändert wurde (Konfliktprüfung via `modifiedTime`).
 *
 * @returns {Promise<void>}
 * @package
 */
export async function _saveToDrive() {
  if (!_isAuth() || !_data) return;
  _opts.onSyncUI?.('syncing');
  const body = JSON.stringify(_data, null, 2);
  try {
    if (_fileId) {
      // Konfliktprüfung: modifiedTime der Drive-Datei mit zuletzt bekanntem Wert vergleichen
      if (_lastModifiedTime) {
        const meta = await _apiFetch(`${DRIVE_API}/files/${_fileId}?fields=modifiedTime`);
        if (meta.ok) {
          const { modifiedTime } = await meta.json();
          if (modifiedTime !== _lastModifiedTime) {
            _opts.onSyncUI?.('error');
            _opts.onConflict?.({
              overwrite: async () => {
                // Lokale Version trotzdem speichern – Baseline aktualisieren um Loop zu verhindern
                _lastModifiedTime = modifiedTime;
                await _saveToDrive();
              },
              reload: () => _loadFromDrive(),
            });
            return;
          }
        }
      }

      // Bestehende Datei per PATCH aktualisieren; modifiedTime aus Antwort lesen
      const res = await _apiFetch(
        `${UPLOAD_API}/files/${_fileId}?uploadType=media&fields=modifiedTime`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body },
      );
      if (!res.ok) throw new Error(`Update fehlgeschlagen: ${res.status}`);
      const saved = await res.json();
      if (saved?.modifiedTime) _lastModifiedTime = saved.modifiedTime;
    } else {
      // Neue Datei per Multipart-Upload anlegen
      const folderId  = _folderId;
      const boundary  = 'hp_' + Date.now();
      const meta      = JSON.stringify({
        name:     _opts.dataFileName,
        mimeType: 'application/json',
        ...(folderId ? { parents: [folderId] } : {}),
      });
      const multipart = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        meta,
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        body,
        `--${boundary}--`,
      ].join('\r\n');

      const res = await _apiFetch(
        `${UPLOAD_API}/files?uploadType=multipart&fields=id,modifiedTime`,
        {
          method:  'POST',
          headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
          body:    multipart,
        },
      );
      if (!res.ok) throw new Error(`Anlegen fehlgeschlagen: ${res.status}`);
      const json = await res.json();
      _fileId = json.id;
      if (json.modifiedTime) _lastModifiedTime = json.modifiedTime;
      localStorage.setItem(FILE_ID_KEY, _fileId);
    }
    _opts.onSyncUI?.('synced');
  } catch (e) {
    console.error('Drive save error:', e);
    _opts.onSyncUI?.('error');
  }
}

/**
 * Sucht die Datendatei in Drive, optional eingeschränkt auf einen bestimmten Ordner.
 *
 * @param {string|null} folderId - Drive Folder-ID; null = Root
 * @returns {Promise<string|null>} File-ID oder null wenn nicht gefunden
 * @package
 */
export async function _findFileId(folderId) {
  const fileName = _opts.dataFileName ?? 'haushaltsplan.json';
  let q = `name='${fileName}' and mimeType='application/json' and trashed=false`;
  if (folderId) q += ` and '${folderId}' in parents`;
  const res = await _apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Sucht einen Drive-Ordner anhand seines Namens oder legt ihn an.
 * Gibt `null` zurück, wenn `name` leer ist (Root-Verhalten beibehalten).
 * Die gefundene/erstellte Folder-ID wird in `_folderId` gecacht.
 *
 * @param {string} name - Ordnername; leer = Root (kein Ordner)
 * @returns {Promise<string|null>} Folder-ID oder null
 * @package
 */
export async function _findOrCreateFolder(name) {
  if (!name) return null;
  if (_folderId) return _folderId;

  // Vorhandenen Ordner suchen
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await _apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files?.[0]?.id) {
      _folderId = data.files[0].id;
      localStorage.setItem(FOLDER_ID_KEY, _folderId);
      return _folderId;
    }
  }

  // Ordner neu anlegen
  const createRes = await _apiFetch(`${DRIVE_API}/files?fields=id`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!createRes.ok) return null;
  const created = await createRes.json();
  _folderId = created.id;
  localStorage.setItem(FOLDER_ID_KEY, _folderId);
  return _folderId;
}

/**
 * Wraps `globalThis.fetch` und fügt den Authorization-Header hinzu.
 * Die Verwendung von `globalThis.fetch` ermöglicht das Ersetzen durch ein Mock in Tests.
 *
 * @param {string} url
 * @param {RequestInit} [opts={}]
 * @returns {Promise<Response>}
 * @package
 */
export function _apiFetch(url, opts = {}) {
  return globalThis.fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${_token}`,
      ...(opts.headers || {}),
    },
  });
}

/**
 * Setzt den gesamten Modulzustand auf die Ausgangswerte zurück.
 * **Nur für Tests verwenden** – nicht in der App aufrufen.
 *
 * @package
 */
export function _resetState() {
  _tc               = null;
  _token            = null;
  _expiry           = 0;
  _fileId           = null;
  _folderId         = null;
  _user             = null;
  clearTimeout(_timer);
  _timer            = null;
  _ready            = false;
  _data             = null;
  _lastModifiedTime = null;
  _opts             = {};
  localStorage.removeItem(FILE_ID_KEY);
  localStorage.removeItem(FOLDER_ID_KEY);
  localStorage.removeItem(SIGNED_IN_KEY);
  localStorage.removeItem(CACHE_VER_KEY);
}
