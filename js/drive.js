/**
 * @module drive
 * Google Drive Backup-Integration für Casaflow.
 *
 * Kein Google Picker API nötig – Ordner- und Dateiauswahl über eigene Modal-UI.
 *
 * Ablauf:
 * 1. setupDrive()  – OAuth + Ordner-Auswahl aus eigenem Modal (einmalig)
 * 2. backup(data)  – JSON-Datei in den konfigurierten Ordner hochladen
 * 3. restore()     – Backup-Datei aus eigenem Modal auswählen und laden
 */

import { appData, saveData }    from './store.js';
import { getGoogleAccessToken } from './firebase.js';
import { t }                    from './i18n.js';

// ── Konstanten ────────────────────────────────────────────────────────────────

const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_API    = 'https://www.googleapis.com/drive/v3';
/** Minimaler Scope: nur App-eigene Dateien lesen/schreiben */
const SCOPE_FILE   = 'https://www.googleapis.com/auth/drive.file';
/** Metadaten aller Dateien lesen (für Ordner-Browser beim Setup) */
const SCOPE_META   = 'https://www.googleapis.com/auth/drive.metadata.readonly';

// ── Modulzustand ──────────────────────────────────────────────────────────────

/** @type {string|null} */
let _token    = null;
/** @type {number} */
let _tokenExp = 0;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * @returns {boolean}
 */
export function isConfigured() {
  return !!appData.settings?.driveBackup?.folderId;
}

/**
 * @returns {{ folderId: string|null, folderName: string|null, lastBackup: string|null }}
 */
export function getDriveSettings() {
  return appData.settings?.driveBackup
    ?? { folderId: null, folderName: null, lastBackup: null };
}

/**
 * Einmalige Einrichtung: OAuth + eigene Ordner-Auswahl.
 * @returns {Promise<boolean>} true bei Erfolg
 */
export async function setupDrive() {
  // SCOPE_META zum Auflisten aller Ordner + SCOPE_FILE für Backup-Operationen
  const token = await getGoogleAccessToken([SCOPE_META, SCOPE_FILE]);
  if (!token) return false;
  _token    = token;
  _tokenExp = Date.now() + 55 * 60 * 1000;

  const folder = await _showFolderModal();
  if (!folder) return false;

  if (!appData.settings)             appData.settings             = {};
  if (!appData.settings.driveBackup) appData.settings.driveBackup = {};
  appData.settings.driveBackup.folderId   = folder.id;
  appData.settings.driveBackup.folderName = folder.name;
  saveData();
  return true;
}

/**
 * Lädt einen JSON-Snapshot in den konfigurierten Ordner hoch.
 * @param {object} data
 */
export async function backup(data) {
  if (!isConfigured()) throw new Error('Drive not configured');
  await _ensureToken([SCOPE_FILE]);

  const now      = new Date();
  const date     = now.toISOString().slice(0, 10);
  const time     = now.toTimeString().slice(0, 5).replace(':', '-');
  const filename = `casaflow-backup-${date}_${time}.json`;
  const folderId = appData.settings.driveBackup.folderId;

  const meta = { name: filename, mimeType: 'application/json', parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)],          { type: 'application/json' }));
  form.append('file',     new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));

  const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${_token}` },
    body:    form,
  });
  if (!res.ok) throw new Error(`Drive upload: ${res.status}`);

  appData.settings.driveBackup.lastBackup = now.toISOString();
  saveData();
}

/**
 * Zeigt eine Liste der Backup-Dateien und gibt den Inhalt der gewählten zurück.
 * @returns {Promise<object|null>}
 */
export async function restore() {
  if (!isConfigured()) throw new Error('Drive not configured');
  await _ensureToken([SCOPE_FILE]);

  const file = await _showFileModal();
  if (!file) return null;

  const res = await fetch(`${DRIVE_API}/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${_token}` },
  });
  if (!res.ok) throw new Error(`Drive read: ${res.status}`);
  return await res.json();
}

// ── Intern ────────────────────────────────────────────────────────────────────

async function _ensureToken(scopes) {
  if (_token && Date.now() < _tokenExp) return;
  const token = await getGoogleAccessToken(scopes);
  if (!token) throw new Error('auth/cancelled');
  _token    = token;
  _tokenExp = Date.now() + 55 * 60 * 1000;
}

/**
 * Lädt alle Ordner aus Google Drive (max. 100, sortiert nach Name).
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function _fetchFolders() {
  const q   = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
  const url = `${DRIVE_API}/files?q=${q}&orderBy=name&pageSize=100&fields=files(id,name)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${_token}` } });
  if (!res.ok) throw new Error(`Drive folders: ${res.status}`);
  return (await res.json()).files ?? [];
}

/**
 * Lädt alle JSON-Backups aus dem konfigurierten Ordner (neueste zuerst).
 * @returns {Promise<Array<{id: string, name: string, modifiedTime: string}>>}
 */
async function _fetchBackupFiles() {
  const folderId = appData.settings.driveBackup.folderId;
  const q   = encodeURIComponent(`'${folderId}' in parents and mimeType='application/json' and trashed=false`);
  const url = `${DRIVE_API}/files?q=${q}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${_token}` } });
  if (!res.ok) throw new Error(`Drive files: ${res.status}`);
  return (await res.json()).files ?? [];
}

/**
 * Zeigt ein modales Fenster mit der Ordnerliste und gibt den gewählten Ordner zurück.
 * @returns {Promise<{id: string, name: string}|null>}
 */
async function _showFolderModal() {
  const folders = await _fetchFolders();
  return _showPickerModal(
    t('drivePickerFolderTitle'),
    folders.length
      ? folders.map(f => ({ id: f.id, label: `📁 ${f.name}`, meta: '' }))
      : [],
    t('driveNoFolders'),
  );
}

/**
 * Zeigt ein modales Fenster mit der Backup-Dateiliste und gibt die gewählte Datei zurück.
 * @returns {Promise<{id: string, name: string}|null>}
 */
async function _showFileModal() {
  const files = await _fetchBackupFiles();
  return _showPickerModal(
    t('drivePickerFileTitle'),
    files.map(f => ({
      id:    f.id,
      label: f.name,
      meta:  new Date(f.modifiedTime).toLocaleString(),
    })),
    t('driveNoBackups'),
  );
}

/**
 * Generische Modal-UI für Ordner- und Dateiauswahl.
 * Erstellt das DOM dynamisch und räumt es nach der Auswahl wieder auf.
 *
 * @param {string} title
 * @param {Array<{id: string, label: string, meta: string}>} items
 * @param {string} emptyText
 * @returns {Promise<{id: string, name: string}|null>}
 */
function _showPickerModal(title, items, emptyText) {
  return new Promise(resolve => {
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay is-open drive-picker-overlay';

    // Box
    const box = document.createElement('div');
    box.className = 'modal-box drive-picker-box';

    // Header
    const header = document.createElement('div');
    header.className = 'drive-picker-header';
    header.innerHTML = `<span class="drive-picker-title">${title}</span>`;

    const btnClose = document.createElement('button');
    btnClose.className = 'btn-icon';
    btnClose.textContent = '✕';
    header.appendChild(btnClose);

    // Liste
    const list = document.createElement('div');
    list.className = 'drive-picker-list';

    if (!items.length) {
      list.innerHTML = `<p class="drive-picker-empty">${emptyText}</p>`;
    } else {
      items.forEach(item => {
        const row = document.createElement('button');
        row.className = 'drive-picker-item';
        row.innerHTML = `
          <span class="drive-picker-item-label">${item.label}</span>
          ${item.meta ? `<span class="drive-picker-item-meta">${item.meta}</span>` : ''}`;
        row.addEventListener('click', () => {
          cleanup();
          // Extrahiere den echten Namen (ohne Emoji-Prefix bei Ordnern)
          const name = item.label.replace(/^📁 /, '');
          resolve({ id: item.id, name });
        });
        list.appendChild(row);
      });
    }

    box.appendChild(header);
    box.appendChild(list);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function cleanup() { document.body.removeChild(overlay); }

    btnClose.addEventListener('click', () => { cleanup(); resolve(null); });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { cleanup(); resolve(null); }
    });
  });
}
