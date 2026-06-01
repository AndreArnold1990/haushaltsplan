/**
 * @module drive
 * Google Drive Backup-Integration für Casaflow.
 *
 * Ablauf:
 * 1. setupDrive()  – OAuth (drive scope) + Ordner-Picker, einmalig
 * 2. backup(data)  – JSON-Datei in den konfigurierten Ordner hochladen
 * 3. restore()     – Backup-Datei aus dem Ordner auswählen und laden
 */
/* global gapi, google */

import { config }               from './config.js';
import { appData, saveData }    from './store.js';
import { getGoogleAccessToken } from './firebase.js';
import { t }                    from './i18n.js';

// ── Konstanten ────────────────────────────────────────────────────────────────

const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_API    = 'https://www.googleapis.com/drive/v3';
/** Vollzugriff – nur für einmaligen Ordner-Picker beim Setup */
const SCOPE_FULL   = 'https://www.googleapis.com/auth/drive';
/** Minimaler Scope für Backup/Restore – nur App-eigene Dateien */
const SCOPE_FILE   = 'https://www.googleapis.com/auth/drive.file';
const APP_ID       = config.firebaseConfig.messagingSenderId;
const API_KEY      = config.firebaseConfig.apiKey;

// ── Modulzustand ──────────────────────────────────────────────────────────────

/** @type {string|null} Aktuell gültiger OAuth-Token */
let _token       = null;
/** @type {number} Ablaufzeitpunkt des Tokens (ms epoch) */
let _tokenExp    = 0;
/** @type {boolean} Picker-API bereits geladen */
let _pickerReady = false;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Gibt zurück ob ein Drive-Ordner konfiguriert ist.
 * @returns {boolean}
 */
export function isConfigured() {
  return !!appData.settings?.driveBackup?.folderId;
}

/**
 * Gibt die gespeicherten Drive-Einstellungen zurück.
 * @returns {{ folderId: string|null, folderName: string|null, lastBackup: string|null }}
 */
export function getDriveSettings() {
  return appData.settings?.driveBackup
    ?? { folderId: null, folderName: null, lastBackup: null };
}

/**
 * Einmalige Einrichtung: OAuth (drive scope) + Ordner-Picker.
 * Speichert Ordner-ID und Name in appData.settings.driveBackup.
 * @returns {Promise<boolean>} true bei Erfolg, false bei Abbruch
 */
export async function setupDrive() {
  const token = await getGoogleAccessToken([SCOPE_FULL]);
  if (!token) return false;

  _token    = token;
  _tokenExp = Date.now() + 55 * 60 * 1000;

  const folder = await _pickFolder();
  if (!folder) return false;

  if (!appData.settings)             appData.settings             = {};
  if (!appData.settings.driveBackup) appData.settings.driveBackup = {};
  appData.settings.driveBackup.folderId   = folder.id;
  appData.settings.driveBackup.folderName = folder.name;
  saveData();
  return true;
}

/**
 * Lädt einen JSON-Snapshot von appData in den konfigurierten Ordner hoch.
 * Dateiname enthält Datum und Uhrzeit, bestehende Backups werden nie überschrieben.
 * @param {object} data - aktuelles appData-Objekt
 * @returns {Promise<void>}
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
  form.append('metadata', new Blob([JSON.stringify(meta)],           { type: 'application/json' }));
  form.append('file',     new Blob([JSON.stringify(data, null, 2)],  { type: 'application/json' }));

  const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${_token}` },
    body:    form,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);

  appData.settings.driveBackup.lastBackup = now.toISOString();
  saveData();
}

/**
 * Öffnet einen Datei-Picker im konfigurierten Backup-Ordner und gibt
 * den geparsten Inhalt der gewählten Datei zurück.
 * @returns {Promise<object|null>} Geparstes JSON oder null bei Abbruch
 */
export async function restore() {
  if (!isConfigured()) throw new Error('Drive not configured');
  await _ensureToken([SCOPE_FILE]);

  const file = await _pickBackupFile();
  if (!file) return null;

  const res = await fetch(`${DRIVE_API}/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${_token}` },
  });
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return await res.json();
}

// ── Intern ────────────────────────────────────────────────────────────────────

/**
 * Stellt sicher dass ein gültiger Token vorhanden ist.
 * Fordert einen neuen an wenn abgelaufen oder nicht vorhanden.
 * @param {string[]} scopes
 */
async function _ensureToken(scopes) {
  if (_token && Date.now() < _tokenExp) return;
  const token = await getGoogleAccessToken(scopes);
  if (!token) throw new Error('auth/cancelled');
  _token    = token;
  _tokenExp = Date.now() + 55 * 60 * 1000;
}

/**
 * Lädt die Google Picker API einmalig via gapi.
 * @returns {Promise<void>}
 */
function _loadPickerApi() {
  if (_pickerReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    gapi.load('picker', {
      callback: () => { _pickerReady = true; resolve(); },
      onerror:  reject,
    });
  });
}

/**
 * Öffnet den Google Ordner-Picker und gibt { id, name } zurück.
 * @returns {Promise<{id: string, name: string}|null>}
 */
async function _pickFolder() {
  await _loadPickerApi();
  return new Promise(resolve => {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder');

    new google.picker.PickerBuilder()
      .setAppId(APP_ID)
      .setOAuthToken(_token)
      .setDeveloperKey(API_KEY)
      .setTitle(t('drivePickerFolderTitle'))
      .addView(view)
      .setCallback(data => {
        if      (data.action === google.picker.Action.PICKED) resolve({ id: data.docs[0].id, name: data.docs[0].name });
        else if (data.action === google.picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}

/**
 * Öffnet den Google Datei-Picker im Backup-Ordner (nur JSON) und gibt { id, name } zurück.
 * @returns {Promise<{id: string, name: string}|null>}
 */
async function _pickBackupFile() {
  await _loadPickerApi();
  return new Promise(resolve => {
    const view = new google.picker.DocsView()
      .setMimeTypes('application/json')
      .setParent(appData.settings.driveBackup.folderId)
      .setMode(google.picker.DocsViewMode.LIST);

    new google.picker.PickerBuilder()
      .setAppId(APP_ID)
      .setOAuthToken(_token)
      .setDeveloperKey(API_KEY)
      .setTitle(t('drivePickerFileTitle'))
      .addView(view)
      .setCallback(data => {
        if      (data.action === google.picker.Action.PICKED) resolve({ id: data.docs[0].id, name: data.docs[0].name });
        else if (data.action === google.picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
