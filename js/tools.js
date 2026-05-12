/**
 * @module tools
 * Geheimmenü – versteckte Hilfstools.
 * Öffnen: Doppelklick auf den App-Titel in der Header-Leiste.
 */

import { t } from './i18n.js';

// ── Kurs-Cache ────────────────────────────────────────────────────────────────

/** Aktueller MXN-pro-EUR-Kurs (z.B. 21.5 → 1 EUR = 21.5 MXN) */
let _mxnPerEur = null;
/** ISO-Datum des gecachten Kurses */
let _rateDate  = null;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/** Öffnet das Geheimmenü und lädt ggf. den Kurs. */
export function openSecretMenu() {
  document.getElementById('secretMenuModal').classList.add('is-open');
  if (!_mxnPerEur) _loadRate();
}

/** Schließt das Geheimmenü. */
export function closeSecretMenu() {
  document.getElementById('secretMenuModal').classList.remove('is-open');
}

/**
 * Initialisiert alle Event-Listener des Geheimmenüs.
 * Wird einmalig beim App-Start aufgerufen.
 */
export function initTools() {
  // Schließen
  document.getElementById('btnCloseSecret')
    .addEventListener('click', closeSecretMenu);

  // Klick auf Overlay schließt
  document.getElementById('secretMenuModal')
    .addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSecretMenu();
    });

  // Sub-Tab-Wechsel (für spätere weitere Tools)
  document.querySelectorAll('.secret-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.secret-tab, .secret-panel')
        .forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.secretTab;
      document.getElementById(`secret-${target}`)?.classList.add('active');
    });
  });

  // Kurs aktualisieren
  document.getElementById('btnRefreshRate')
    .addEventListener('click', _loadRate);

  // Bidirektionale Eingabe
  document.getElementById('inputMxn')
    .addEventListener('input', _onMxnInput);
  document.getElementById('inputEur')
    .addEventListener('input', _onEurInput);
}

// ── Intern ────────────────────────────────────────────────────────────────────

/** Lädt den aktuellen MXN/EUR-Kurs von der Frankfurter-API. */
async function _loadRate() {
  const btn    = document.getElementById('btnRefreshRate');
  const info   = document.getElementById('currencyRateText');

  btn.classList.add('loading');
  info.textContent = t('currencyRateLoading');

  try {
    const res  = await fetch('https://api.frankfurter.app/latest?from=EUR&to=MXN');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    _mxnPerEur = data.rates.MXN;
    _rateDate  = data.date;

    info.textContent = t('currencyRateInfo', _mxnPerEur.toFixed(4), _rateDate);
    _recalcFromActive();
  } catch (err) {
    info.textContent = t('currencyRateError');
    console.error('[tools] Kurs-Fehler:', err);
  } finally {
    btn.classList.remove('loading');
  }
}

/** Aktives Eingabefeld bestimmen und das andere neu berechnen. */
function _recalcFromActive() {
  const mxnEl = document.getElementById('inputMxn');
  const eurEl = document.getElementById('inputEur');
  if (document.activeElement === mxnEl && mxnEl.value !== '') {
    _onMxnInput();
  } else if (eurEl.value !== '') {
    _onEurInput();
  }
}

function _onMxnInput() {
  if (!_mxnPerEur) return;
  const mxn = parseFloat(document.getElementById('inputMxn').value);
  const eurEl = document.getElementById('inputEur');
  if (isNaN(mxn) || document.getElementById('inputMxn').value === '') {
    eurEl.value = '';
    return;
  }
  eurEl.value = (mxn / _mxnPerEur).toFixed(2);
}

function _onEurInput() {
  if (!_mxnPerEur) return;
  const eur = parseFloat(document.getElementById('inputEur').value);
  const mxnEl = document.getElementById('inputMxn');
  if (isNaN(eur) || document.getElementById('inputEur').value === '') {
    mxnEl.value = '';
    return;
  }
  mxnEl.value = (eur * _mxnPerEur).toFixed(2);
}
