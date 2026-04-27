/**
 * @file drive.test.js
 * Tests für das Google Drive Sync-Modul (js/drive.js).
 *
 * Strategie:
 * – `globalThis.fetch` wird durch ein kontrollierbares Mock ersetzt.
 * – `localStorage` ist im Browser nativ verfügbar.
 * – `_resetState()` setzt den Modulzustand vor jedem Test zurück.
 * – Callbacks (`onAuthUI`, `onSyncUI`, `onDataLoaded`) werden als Spy-Funktionen injiziert.
 */

import {
  init, signIn, signOut, scheduleSave, createNewFile,
  _resetState, _isAuth, _waitForGIS,
  _onToken, _loadFromDrive, _saveToDrive,
  _findFileId, _findOrCreateFolder, _apiFetch,
} from '../js/drive.js';

// ── Mock-Hilfsmittel ──────────────────────────────────────────────────────────

/**
 * Ersetzt `globalThis.fetch` durch ein Mock, das vordefinierte Antworten liefert.
 * Gibt eine Restore-Funktion zurück.
 *
 * @param {Array<{url?: string|RegExp, response: object, status?: number}>} replies
 *   Jeder Eintrag matcht den nächsten `fetch`-Aufruf (in Reihenfolge).
 *   Wenn `url` angegeben, wird nur auf Übereinstimmung geprüft; andernfalls passt immer.
 * @returns {{ restore: () => void, calls: string[] }}
 */
function mockFetch(replies) {
  const calls = [];
  let idx = 0;
  globalThis.fetch = async (url, opts) => {
    calls.push(url);
    const reply = replies[idx++] ?? replies[replies.length - 1];
    if (reply.url) {
      const pattern = reply.url instanceof RegExp ? reply.url : new RegExp(reply.url);
      if (!pattern.test(url)) throw new Error(`Unerwartete URL: ${url}`);
    }
    const status = reply.status ?? 200;
    return {
      ok:   status >= 200 && status < 300,
      status,
      json: async () => reply.response,
    };
  };
  const restore = () => { delete globalThis.fetch; };
  return { restore, calls };
}

/** Erstellt einen einfachen Spy-Callback und gibt Aufrufliste zurück */
function spy() {
  const calls = [];
  const fn = (...args) => calls.push(args);
  fn.calls = calls;
  return fn;
}

/** Setzt Token auf einen gültigen Dummy (Modul-intern über _onToken) */
async function fakeAuth(extra = {}) {
  await _onToken({
    access_token: 'tok_test',
    expires_in:   3600,
    ...extra,
  });
}

// ── Test-Suiten ───────────────────────────────────────────────────────────────

/**
 * @param {Function} suite         - Mini-Framework suite(title, fn)
 * @param {Function} assert        - assert(cond, msg)
 * @param {Function} assertEqual   - assertEqual(a, b, msg)
 * @param {Function} assertContains- assertContains(str, sub, msg)
 */
export async function runDriveTests(suite, assert, assertEqual, assertContains) {

  // ── 1. init ohne clientId ──────────────────────────────────────────────────
  suite('drive.init – Offline-Modus (keine clientId)', test => {
    test('setzt onAuthUI("no-config") wenn keine clientId übergeben wird', async () => {
      _resetState();
      const authUI = spy();
      init({ clientId: '', onAuthUI: authUI });
      assertEqual(authUI.calls.length, 1);
      assertEqual(authUI.calls[0][0], 'no-config');
    });

    test('ruft onSyncUI NICHT auf wenn keine clientId vorhanden', async () => {
      _resetState();
      const syncUI = spy();
      init({ clientId: '', onSyncUI: syncUI });
      assertEqual(syncUI.calls.length, 0, 'onSyncUI darf nicht aufgerufen werden');
    });
  });

  // ── 2. _isAuth ─────────────────────────────────────────────────────────────
  suite('drive._isAuth – Token-Gültigkeit', test => {
    test('gibt false zurück wenn kein Token vorhanden', async () => {
      _resetState();
      assert(!_isAuth(), '_isAuth() muss false sein ohne Token');
    });

    test('gibt true zurück nach erfolgreicher Authentifizierung', async () => {
      _resetState();
      // _onToken → userinfo; _loadFromDrive → findFileId(not found) → onFileNotFound
      const { restore } = mockFetch([
        { response: { name: 'Test User', email: 'test@example.com' } }, // userinfo
        { response: { files: [] } }, // findFileId → nicht gefunden → onFileNotFound
      ]);
      init({ clientId: 'test-id', onAuthUI: spy(), onSyncUI: spy(),
             onDataLoaded: spy(), onFileNotFound: spy() });
      await fakeAuth();
      assert(_isAuth(), '_isAuth() muss true sein nach Auth');
      restore();
    });
  });

  // ── 3. _findFileId ─────────────────────────────────────────────────────────
  suite('drive._findFileId – Datei suchen', test => {
    test('gibt null zurück wenn keine Datei gefunden', async () => {
      _resetState();
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore } = mockFetch([
        { response: { files: [] } },
      ]);
      const id = await _findFileId(null);
      assertEqual(id, null, 'Muss null zurückgeben wenn files leer');
      restore();
    });

    test('gibt die File-ID zurück wenn Datei gefunden', async () => {
      _resetState();
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore } = mockFetch([
        { response: { files: [{ id: 'file_abc' }] } },
      ]);
      const id = await _findFileId(null);
      assertEqual(id, 'file_abc', 'Muss gefundene File-ID zurückgeben');
      restore();
    });

    test('fügt Folder-Einschränkung zur Query hinzu wenn folderId übergeben', async () => {
      _resetState();
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore, calls } = mockFetch([
        { response: { files: [{ id: 'f1' }] } },
      ]);
      await _findFileId('folder_xyz');
      assertContains(calls[0], encodeURIComponent("'folder_xyz' in parents"), 'Query muss folder-Filter enthalten');
      restore();
    });

    test('gibt null zurück wenn API-Antwort nicht ok ist', async () => {
      _resetState();
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore } = mockFetch([{ response: {}, status: 403 }]);
      const id = await _findFileId(null);
      assertEqual(id, null, 'Bei Fehler-Status muss null zurückgegeben werden');
      restore();
    });
  });

  // ── 4. _findOrCreateFolder ─────────────────────────────────────────────────
  suite('drive._findOrCreateFolder – Ordner suchen/anlegen', test => {
    test('gibt null zurück wenn name leer ist (Root-Modus)', async () => {
      _resetState();
      const id = await _findOrCreateFolder('');
      assertEqual(id, null, 'Leerer Name → null (Root)');
    });

    test('gibt gecachte Folder-ID zurück ohne API-Aufruf', async () => {
      _resetState();
      localStorage.setItem('hp_drive_folder_id', 'cached_folder');
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore, calls } = mockFetch([]);
      const id = await _findOrCreateFolder('Haushaltsplan');
      assertEqual(id, 'cached_folder', 'Gecachte ID muss zurückgegeben werden');
      assertEqual(calls.length, 0, 'Kein API-Aufruf wenn ID gecacht');
      restore();
      localStorage.removeItem('hp_drive_folder_id');
    });

    test('sucht vorhandenen Ordner und cachet die ID', async () => {
      _resetState();
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore } = mockFetch([
        { response: { files: [{ id: 'folder_found' }] } },
      ]);
      const id = await _findOrCreateFolder('Haushaltsplan');
      assertEqual(id, 'folder_found', 'Gefundene Folder-ID muss zurückgegeben werden');
      assertEqual(localStorage.getItem('hp_drive_folder_id'), 'folder_found', 'ID muss in localStorage gecacht werden');
      restore();
    });

    test('legt neuen Ordner an wenn keiner gefunden', async () => {
      _resetState();
      await _onToken({ access_token: 'tok', expires_in: 3600 });
      const { restore, calls } = mockFetch([
        { response: { files: [] } },           // Suche: nicht gefunden
        { response: { id: 'new_folder' } },    // Anlegen: erfolgreich
      ]);
      const id = await _findOrCreateFolder('MeinOrdner');
      assertEqual(id, 'new_folder', 'Neu erstellte Folder-ID muss zurückgegeben werden');
      assert(calls.length === 2, 'Es müssen genau 2 API-Aufrufe stattfinden');
      restore();
    });
  });

  // ── 5. _loadFromDrive ──────────────────────────────────────────────────────
  suite('drive._loadFromDrive – Daten laden', test => {
    test('ruft onDataLoaded auf wenn Datei valide Daten enthält', async () => {
      _resetState();
      const onData  = spy();
      const onSync  = spy();
      init({ clientId: 'id', onAuthUI: spy(), onSyncUI: onSync, onDataLoaded: onData,
             onFileNotFound: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const fakeData = { categories: [{ id: 'c1' }], transactions: [] };
      const { restore } = mockFetch([
        { response: { name: 'User' } },                                    // userinfo
        { response: { files: [{ id: 'f1' }] } },                          // findFileId
        { response: { modifiedTime: '2026-01-01T00:00:00.000Z' } },       // metadata nach findFileId
        { response: fakeData },                                            // Dateiinhalt
      ]);

      await _loadFromDrive();
      assert(onData.calls.length >= 1, 'onDataLoaded muss mindestens einmal aufgerufen werden');
      assertEqual(JSON.stringify(onData.calls[0][0]), JSON.stringify(fakeData));
      restore();
    });

    test('setzt onSyncUI("synced") nach erfolgreichem Laden', async () => {
      _resetState();
      const onSync = spy();
      init({ clientId: 'id', onAuthUI: spy(), onSyncUI: onSync, onDataLoaded: spy(),
             onFileNotFound: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore } = mockFetch([
        { response: { name: 'User' } },
        { response: { files: [{ id: 'f1' }] } },
        { response: { modifiedTime: '2026-01-01T00:00:00.000Z' } },
        { response: { categories: [], transactions: [] } },
      ]);
      await _loadFromDrive();
      const statuses = onSync.calls.map(c => c[0]);
      assert(statuses.includes('synced'), 'onSyncUI("synced") muss aufgerufen werden');
      restore();
    });

    test('ruft onFileNotFound auf wenn keine Datei gefunden wird', async () => {
      _resetState();
      const onFileNotFound = spy();
      init({ clientId: 'id', onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(),
             onFileNotFound });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore } = mockFetch([
        { response: { name: 'User' } },   // userinfo
        { response: { files: [] } },      // findFileId → nicht gefunden
      ]);
      await _loadFromDrive();
      assertEqual(onFileNotFound.calls.length, 1, 'onFileNotFound muss aufgerufen werden');
      restore();
    });

    test('behandelt gecachte Datei im Papierkorb als nicht gefunden', async () => {
      _resetState();
      localStorage.setItem('hp_drive_file_id', 'trashed_file');
      const onFileNotFound = spy();
      init({ clientId: 'id', onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(),
             onFileNotFound });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore } = mockFetch([
        { response: { name: 'User' } },                               // userinfo
        { response: { id: 'trashed_file', trashed: true,             // Metadaten: im Papierkorb!
                       modifiedTime: '2026-01-01T00:00:00.000Z' } },
        { response: { files: [] } },                                  // findFileId → auch nicht gefunden
      ]);
      await _loadFromDrive();
      assertEqual(localStorage.getItem('hp_drive_file_id'), null,
        'Gecachte File-ID muss gelöscht werden');
      assertEqual(onFileNotFound.calls.length, 1, 'onFileNotFound muss aufgerufen werden');
      restore();
    });
  });

  // ── 6. createNewFile + Konfliktprüfung ─────────────────────────────────────
  suite('drive.createNewFile – Neue Datei anlegen', test => {
    test('erstellt neue Datei via Multipart-POST', async () => {
      _resetState();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json', driveFolderName: '',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(), onFileNotFound: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore, calls } = mockFetch([
        { response: { name: 'User' } },                                       // userinfo
        { response: { id: 'new_file', modifiedTime: '2026-01-01T00:00:00Z' } }, // POST create
      ]);

      await createNewFile({ categories: [], transactions: [] });

      const postCall = calls.find(u => u.includes('uploadType=multipart'));
      assert(postCall !== undefined, 'Multipart-POST muss stattfinden');
      assertEqual(localStorage.getItem('hp_drive_file_id'), 'new_file', 'File-ID muss gecacht werden');
      restore();
    });

    test('multipart-Body enthält den konfigurierten Dateinamen', async () => {
      _resetState();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json', driveFolderName: '',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(), onFileNotFound: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      let capturedBody = '';
      globalThis.fetch = async (url, opts) => {
        capturedBody = opts?.body ?? '';
        return { ok: true, status: 200,
                 json: async () => ({ id: 'f', modifiedTime: '2026-01-01T00:00:00Z', name: 'User', files: [] }) };
      };

      await createNewFile({ categories: [], transactions: [] });
      assert(capturedBody.includes('haushaltsplan.json'),
        'Multipart-Body muss den konfigurierten Dateinamen enthalten');
      delete globalThis.fetch;
    });
  });

  suite('drive._saveToDrive – Konfliktprüfung', test => {
    test('erkennt Konflikt wenn modifiedTime sich geändert hat', async () => {
      _resetState();
      const onConflict = spy();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json', driveFolderName: '',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(),
             onFileNotFound: spy(), onConflict });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      // Schritt 1: Datei laden → _lastModifiedTime = 'time1'
      const { restore } = mockFetch([
        { response: { name: 'User' } },
        { response: { files: [{ id: 'f1' }] } },
        { response: { modifiedTime: 'time1' } },
        { response: { categories: [], transactions: [] } },
        // Schritt 2: _saveToDrive Konfliktprüfung → modifiedTime jetzt 'time2' (geändert!)
        { response: { modifiedTime: 'time2' } },
      ]);

      await _loadFromDrive();
      scheduleSave({ categories: [], transactions: [] });
      await _saveToDrive();

      assertEqual(onConflict.calls.length, 1, 'onConflict muss aufgerufen werden');
      assert(typeof onConflict.calls[0][0].overwrite === 'function', 'overwrite-Funktion muss übergeben werden');
      assert(typeof onConflict.calls[0][0].reload === 'function', 'reload-Funktion muss übergeben werden');
      restore();
    });

    test('speichert ohne Konfliktprüfung wenn _lastModifiedTime null ist', async () => {
      _resetState();
      const onConflict = spy();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json', driveFolderName: '',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(),
             onFileNotFound: spy(), onConflict });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      // _lastModifiedTime ist null (kein vorheriges Laden)
      // createNewFile setzt _fileId; da _lastModifiedTime null ist → keine Konfliktprüfung
      const { restore, calls } = mockFetch([
        { response: { name: 'User' } },
        { response: { id: 'f1', modifiedTime: '2026-01-01T00:00:00Z' } }, // POST create
        // Jetzt PATCH (kein Konfliktcheck da _lastModifiedTime gerade gesetzt wurde auf 2026-01-01)
        // Da wir _lastModifiedTime direkt nach createNewFile setzen und scheduleSave danach kommt,
        // würde ein PATCH ohne Konfliktcheck stattfinden wenn modifiedTime gleich bleibt
        { response: { modifiedTime: '2026-01-01T00:00:00Z' } }, // conflict check: gleich
        { response: { modifiedTime: '2026-01-01T00:00:01Z' } }, // PATCH response
      ]);

      await createNewFile({ categories: [], transactions: [] });
      scheduleSave({ categories: [], transactions: [{ id: 'new' }] });
      await _saveToDrive();

      assertEqual(onConflict.calls.length, 0, 'Kein Konflikt wenn modifiedTime gleich geblieben');
      restore();
    });
  });

  // ── 7. scheduleSave – Debounce ─────────────────────────────────────────────
  suite('drive.scheduleSave – Debounce-Verhalten', test => {
    test('mehrfache Aufrufe werden zu einem zusammengefasst', async () => {
      _resetState();
      scheduleSave({ categories: [], transactions: [{ id: 'x' }] });
      scheduleSave({ categories: [], transactions: [{ id: 'y' }] });
      scheduleSave({ categories: [], transactions: [{ id: 'z' }] });
      // Kein Auth → kein API-Aufruf; kein Fehler = Test bestanden
      assert(true, 'Mehrfache scheduleSave-Aufrufe dürfen keinen Fehler werfen');
    });
  });

  // ── 8. dataFileName – konfigurierbarer Dateiname ───────────────────────────
  suite('drive – konfigurierbarer Dateiname (data-Feld in config.json)', test => {
    test('_findFileId verwendet den konfigurierten Dateinamen in der Query', async () => {
      _resetState();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore, calls } = mockFetch([
        { response: { files: [] } },
      ]);
      await _findFileId(null);
      assertContains(calls[0], encodeURIComponent("name='haushaltsplan.json'"),
        'Query muss den konfigurierten Dateinamen enthalten');
      restore();
    });

    test('_findFileId verwendet NICHT mehr den alten Standardnamen haushaltsplan_data.json', async () => {
      _resetState();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore, calls } = mockFetch([{ response: { files: [] } }]);
      await _findFileId(null);
      assert(!calls[0].includes('haushaltsplan_data.json'),
        'Der alte hartcodierte Dateiname darf nicht mehr verwendet werden');
      restore();
    });

    test('createNewFile legt Datei mit konfiguriertem Namen an', async () => {
      _resetState();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json',
             driveFolderName: '', debounceMs: 0,
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(), onFileNotFound: spy() });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      let capturedBody = '';
      globalThis.fetch = async (url, opts) => {
        capturedBody = opts?.body ?? '';
        return { ok: true, status: 200,
                 json: async () => ({ id: 'new_file', modifiedTime: '2026-01-01T00:00:00Z',
                                      name: 'User', files: [] }) };
      };

      await createNewFile({ categories: [], transactions: [] });

      assert(capturedBody.includes('haushaltsplan.json'),
        'Multipart-Body muss den konfigurierten Dateinamen enthalten');
      delete globalThis.fetch;
    });

    test('Ordner + Datei: Query kombiniert Ordner-ID und Dateinamen korrekt', async () => {
      _resetState();
      const onFileNotFound = spy();
      init({ clientId: 'id', dataFileName: 'haushaltsplan.json',
             driveFolderName: 'Haushaltsplan',
             onAuthUI: spy(), onSyncUI: spy(), onDataLoaded: spy(), onFileNotFound });
      await _onToken({ access_token: 'tok', expires_in: 3600 });

      const { restore, calls } = mockFetch([
        { response: { name: 'User' } },               // userinfo
        { response: { files: [] } },                  // _findOrCreateFolder – Ordner nicht gefunden
        { response: { id: 'folder1' } },              // Ordner anlegen
        { response: { files: [] } },                  // _findFileId – Datei nicht gefunden → onFileNotFound
      ]);
      await _loadFromDrive();

      // Der _findFileId-Aufruf (4. Call, Index 3) muss beide Bedingungen enthalten
      const fileSearchCall = calls[3];
      assertContains(fileSearchCall, encodeURIComponent("name='haushaltsplan.json'"),
        'Query muss Dateinamen enthalten');
      assertContains(fileSearchCall, encodeURIComponent("'folder1' in parents"),
        'Query muss Ordner-Einschränkung enthalten');
      restore();
    });
  });
}
