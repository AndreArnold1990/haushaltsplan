/**
 * @module firebase
 * Firebase Integration: Google Authentication + Firestore Datenbank.
 * Firebase Integration: Google Auth + Firestore Echtzeit-Sync.
 *
 * ## Ablauf
 * 1. {@link init} – initialisiert Firebase App, Auth und Firestore.
 * 2. {@link signIn}  – öffnet den Google-Popup zur Anmeldung.
 * 3. onAuthStateChanged (intern) – reagiert auf Login/Logout.
 * 4. _subscribeToData (intern) – Echtzeit-Listener auf das Haushalt-Dokument.
 * 5. {@link scheduleSave} – debounced Schreibvorgang in Firestore.
 *
 * ## Kein Polling
 * onSnapshot liefert Änderungen in Echtzeit – kein manuelles Polling nötig.
 *
 * ## Keine zirkulären Abhängigkeiten
 * Dieses Modul importiert kein anderes App-Modul.
 */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult,
         signOut as _fbSignOut, onAuthStateChanged, GoogleAuthProvider }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Inline Google-Logo (SVG) für Auth-Buttons ─────────────────────────────────
export const GOOGLE_LOGO = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>`;

// ── Modulzustand ──────────────────────────────────────────────────────────────

/** @type {object|null} Firebase Auth */
let _auth   = null;
/** @type {object|null} Firestore */
let _db     = null;
/** @type {object|null} Aktuell angemeldeter Nutzer */
let _user   = null;
/** @type {ReturnType<typeof setTimeout>|null} Debounce-Timer für Schreibvorgänge */
let _timer  = null;
/** @type {Function|null} Firestore onSnapshot Unsubscribe-Funktion */
let _unsub  = null;
/** @type {object} Initialisierungsoptionen */
let _opts   = {};
/** @type {boolean} true sobald Daten mindestens einmal erfolgreich geladen wurden */
let _dataWasLoaded = false;

/**
 * @typedef {Object} FirebaseInitOptions
 * @property {object}   firebaseConfig          - Firebase Web-App Konfigurationsobjekt
 * @property {string}   householdId             - Haushalt-ID (= Firestore-Dokument-ID)
 * @property {number}   [debounceMs=1500]       - Debounce-Delay vor Schreibvorgängen (ms)
 * @property {function(string, object=): void} [onAuthUI]
 * @property {function(string): void}           [onSyncUI]
 * @property {function(object): void}           [onDataLoaded]
 * @property {function(): void}                 [onFileNotFound]
 * @property {function({overwrite, reload}): void} [onConflict] - nicht verwendet (Firestore = konfliktfrei)
 */

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Initialisiert Firebase und beobachtet den Auth-Status.
 * Bei fehlendem firebaseConfig wird der Offline-Modus aktiviert.
 *
 * @param {FirebaseInitOptions} options
 */
export function init(options) {
  _opts = { debounceMs: 1500, ...options };

  if (!_opts.firebaseConfig?.projectId) {
    _opts.onAuthUI?.('no-config');
    return;
  }

  const app = initializeApp(_opts.firebaseConfig);
  _auth     = getAuth(app);
  _db       = getFirestore(app);

  // Redirect-Ergebnis verarbeiten – nur als Fallback wenn Popup geblockt war.
  // Fehler hier still loggen, nie Error-State setzen (kein Redirect = kein Ergebnis = kein Fehler).
  getRedirectResult(_auth).then(result => {
    if (result) console.log('[Auth] Redirect result OK:', result.user?.email);
  }).catch(e => {
    console.warn('[Auth] getRedirectResult (ignoriert):', e.code);
  });

  onAuthStateChanged(_auth, user => {
    if (user) {
      _user = {
        sub:        user.uid,
        name:       user.displayName,
        given_name: user.displayName?.split(' ')[0],
        email:      user.email,
        picture:    user.photoURL,
      };
      _opts.onAuthUI?.('signed-in', _user);
      _subscribeToData();
    } else {
      _user = null;
      _unsubscribe();
      _opts.onAuthUI?.('signed-out');
      _opts.onSyncUI?.('offline');
    }
  });
}

/**
 * Meldet den Nutzer an.
 * Primär via Popup (postMessage, ITP-sicher).
 * Fallback via Redirect wenn Popup geblockt wird (z.B. manche Browser-Konfigurationen).
 */
export async function signIn() {
  if (!_auth) return;
  try {
    await signInWithPopup(_auth, new GoogleAuthProvider());
  } catch (e) {
    if (e.code === 'auth/popup-blocked') {
      // Popup-Blocker aktiv → Redirect-Fallback
      try {
        await signInWithRedirect(_auth, new GoogleAuthProvider());
      } catch (re) {
        console.error('[Auth] Redirect fallback error:', re.code, re.message);
        _opts.onAuthUI?.('error');
      }
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.error('[Auth] Sign-in error:', e.code, e.message);
      _opts.onAuthUI?.('error');
    }
  }
}

/** Meldet den Nutzer ab und beendet den Echtzeit-Listener. */
export async function signOut() {
  if (!_auth) return;
  _unsubscribe();
  await _fbSignOut(_auth);
}

/**
 * Plant einen debounced Schreibvorgang in Firestore.
 * Mehrere schnelle Aufrufe werden zu einem einzigen zusammengefasst.
 *
 * @param {object} data - Aktueller AppData-Zustand
 */
export function scheduleSave(data) {
  clearTimeout(_timer);
  _timer = setTimeout(() => _saveToFirestore(data), _opts.debounceMs ?? 1500);
}

/**
 * Legt das Haushalt-Dokument in Firestore an (wird aufgerufen wenn es noch nicht existiert).
 *
 * @param {object} data
 */
export async function createNewFile(data) {
  await _saveToFirestore(data);
}

/** Gibt das aktuelle Nutzerobjekt zurück (null wenn nicht angemeldet). */
export const getUser = () => _user;

// ── Intern ────────────────────────────────────────────────────────────────────

/** Kündigt den aktiven Firestore-Listener, falls vorhanden. */
function _unsubscribe() {
  if (_unsub) { _unsub(); _unsub = null; }
}

/**
 * Abonniert das Haushalt-Dokument in Echtzeit.
 * Jede Änderung (auch durch die Partnerin) wird sofort an onDataLoaded gemeldet.
 */
function _subscribeToData() {
  if (!_db || !_opts.householdId) return;
  _unsubscribe();
  _opts.onSyncUI?.('syncing');

  const ref = doc(_db, 'households', _opts.householdId);
  _unsub = onSnapshot(
    ref,
    snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.categories && data?.transactions) {
          _dataWasLoaded = true;
          _opts.onDataLoaded?.(data);
          _opts.onSyncUI?.('synced');
          return;
        }
        // Dokument vorhanden, aber Struktur unvollständig → nur melden, NICHT überschreiben
        if (_dataWasLoaded) {
          console.warn('[Firestore] Snapshot ohne categories/transactions empfangen – ignoriert.');
          return;
        }
      }
      // Dokument existiert wirklich nicht → onFileNotFound aufrufen
      if (!_dataWasLoaded) {
        _opts.onSyncUI?.('offline');
        _opts.onFileNotFound?.();
      }
    },
    err => {
      console.error('Firestore snapshot error:', err);
      _opts.onSyncUI?.('error');
    },
  );
}

/** Schreibt data in das Haushalt-Dokument (legt es an falls nicht vorhanden). */
async function _saveToFirestore(data) {
  if (!_db || !_opts.householdId || !_user) return;

  // Sicherheitssperre: niemals leere Daten schreiben wenn bereits Daten existieren.
  // Verhindert versehentliches Löschen aller Einträge durch Race-Condition beim Start.
  const hasContent = (data?.categories?.length > 0) || (data?.transactions?.length > 0);
  if (!hasContent && _dataWasLoaded) {
    console.warn('[Firestore] Schreib-Sperre: Leere Daten werden nicht gespeichert (Daten wurden bereits geladen).');
    return;
  }

  _opts.onSyncUI?.('syncing');
  try {
    await setDoc(doc(_db, 'households', _opts.householdId), data);
    _opts.onSyncUI?.('synced');
  } catch (e) {
    console.error('Firestore save error:', e);
    _opts.onSyncUI?.('error');
  }
}
