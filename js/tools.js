/**
 * @module tools
 * Geheimmenü – versteckte Hilfstools.
 * Öffnen: Doppelklick auf den App-Titel in der Header-Leiste.
 */

import { t, getUiLocale }  from './i18n.js';
import { appData, saveData } from './store.js';
import { toast }             from './utils.js';

// ── Kurs-Cache ────────────────────────────────────────────────────────────────

/** Aktueller MXN-pro-EUR-Kurs (z.B. 21.5 → 1 EUR = 21.5 MXN) */
let _mxnPerEur = null;
/** ISO-Datum des gecachten Kurses */
let _rateDate  = null;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/** Öffnet das Geheimmenü und lädt ggf. den Kurs. */
export function openSecretMenu() {
  document.getElementById('secretMenuModal').classList.add('is-open');
  const activeTab = document.querySelector('.secret-tab.active');
  const activeKey = activeTab?.dataset.secretTab ?? 'currency';
  if (activeKey === 'currency' && !_mxnPerEur) _loadRate();
  if (activeKey === 'cats') renderCatFeeding();
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

  // Sub-Tab-Wechsel
  document.querySelectorAll('.secret-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.secret-tab, .secret-panel')
        .forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.secretTab;
      document.getElementById(`secret-${target}`)?.classList.add('active');
      if (target === 'cats')     renderCatFeeding();
      if (target === 'currency' && !_mxnPerEur) _loadRate();
    });
  });

  // Katzen füttern initialisieren
  _initCatFeeding();

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
    const res  = await fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=MXN');
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

// ── Katzen füttern ────────────────────────────────────────────────────────────

/** Registriert den Speichern-Button. Wird einmalig von initTools() aufgerufen. */
function _initCatFeeding() {
  document.getElementById('btnSaveCatFeed')?.addEventListener('click', _saveCatFeed);
}

/** Speichert den Eintrag für heute (überschreibt vorhandenen Eintrag desselben Tages). */
function _saveCatFeed() {
  const peach = parseFloat(document.getElementById('catFeedPeach').value);
  const juna  = parseFloat(document.getElementById('catFeedJuna').value);

  if (isNaN(peach) || peach < 0) { toast(t('catFeedErrPeach')); return; }
  if (isNaN(juna)  || juna  < 0) { toast(t('catFeedErrJuna'));  return; }

  const date = new Date().toISOString().split('T')[0];
  if (!appData.catFeeding) appData.catFeeding = [];

  const idx = appData.catFeeding.findIndex(e => e.date === date);
  if (idx >= 0) {
    appData.catFeeding[idx] = { date, peach, juna };
  } else {
    appData.catFeeding.push({ date, peach, juna });
  }

  saveData();
  renderCatFeeding();

  document.getElementById('catFeedPeach').value = '';
  document.getElementById('catFeedJuna').value  = '';
  toast(t('catFeedToastSaved'));
}

/**
 * Rendert Datum-Label, Durchschnitt-Karten und Verlaufstabelle.
 * Öffentlich, damit app.js es nach Datenladen aufrufen kann.
 */
export function renderCatFeeding() {
  // Heutiges Datum lokalisiert anzeigen
  const todayEl = document.getElementById('catFeedTodayText');
  if (todayEl) {
    const dateLabel = new Date().toLocaleDateString(getUiLocale(), {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    todayEl.textContent = t('catFeedTodayLabel', dateLabel);
  }

  const entries = [...(appData.catFeeding || [])].sort((a, b) => b.date.localeCompare(a.date));

  // Durchschnitte berechnen
  const avgP = entries.length
    ? Math.round(entries.reduce((s, e) => s + (e.peach ?? 0), 0) / entries.length)
    : null;
  const avgJ = entries.length
    ? Math.round(entries.reduce((s, e) => s + (e.juna  ?? 0), 0) / entries.length)
    : null;

  const avgPeachEl = document.getElementById('avgPeach');
  const avgJunaEl  = document.getElementById('avgJuna');
  if (avgPeachEl) avgPeachEl.textContent = avgP !== null ? `${avgP} g` : '– g';
  if (avgJunaEl)  avgJunaEl.textContent  = avgJ !== null ? `${avgJ} g` : '– g';

  // Tabelle rendern
  const container = document.getElementById('catFeedTable');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = `<p class="cats-empty">${t('catFeedEmpty')}</p>`;
    return;
  }

  const locale = getUiLocale();
  const rows = entries.map(e => {
    const label = new Date(e.date + 'T00:00:00').toLocaleDateString(locale, {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
    return `<tr>
      <td>${label}</td>
      <td class="cats-amount">${e.peach} g</td>
      <td class="cats-amount">${e.juna} g</td>
      <td class="cats-amount cats-total">${e.peach + e.juna} g</td>
      <td><button class="cats-del-btn" data-cat-date="${e.date}"
            title="${t('catFeedDelTooltip')}">&#128465;</button></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="cats-table">
      <thead><tr>
        <th>${t('catFeedColDate')}</th>
        <th>&#127825; Peach</th>
        <th>&#127992; Juna</th>
        <th>${t('catFeedColTotal')}</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  container.querySelectorAll('.cats-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appData.catFeeding = (appData.catFeeding || []).filter(e => e.date !== btn.dataset.catDate);
      saveData();
      renderCatFeeding();
      toast(t('catFeedToastDeleted'));
    });
  });
}
