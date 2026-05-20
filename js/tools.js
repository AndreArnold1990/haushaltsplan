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

/** Öffnet das Geheimmenü und aktiviert das zugehörige Tool. */
export function openSecretMenu() {
  document.getElementById('secretMenuModal').classList.add('is-open');
  const activeTab = document.querySelector('.secret-tab.active');
  const activeKey = activeTab?.dataset.secretTab ?? 'currency';
  if (activeKey === 'currency' && !_mxnPerEur) _loadRate();
  if (activeKey === 'cats') renderCatFeeding();
  if (activeKey === 'ocr')  _onOcrTabOpen();
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
      if (target === 'cats')                    renderCatFeeding();
      if (target === 'currency' && !_mxnPerEur) _loadRate();
      if (target === 'ocr')                     _onOcrTabOpen();
    });
  });

  // Katzen füttern + OCR initialisieren
  _initCatFeeding();
  _initOcr();

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

// ── OCR Test ──────────────────────────────────────────────────────────────────

/** Tesseract-Worker (lazy, lebt bis Seitenreload). */
let _ocrWorker = null;
/** Verhindert parallele Initialisierungen und Erkennungsläufe. */
let _ocrBusy   = false;

/** Registriert den File-Input. Einmalig von initTools() aufgerufen. */
function _initOcr() {
  document.getElementById('ocrFileInput')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) _processOcrImage(file);
    e.target.value = ''; // Reset → dasselbe Bild kann nochmals gewählt werden
  });
}

/**
 * Lädt Tesseract.js beim ersten Tab-Klick (lazy).
 * Folgeaufrufe sind Noops sobald der Worker steht.
 */
async function _onOcrTabOpen() {
  if (_ocrWorker || _ocrBusy) return;
  _ocrBusy = true;
  _setOcrStatus(t('ocrStatusLoading'), true);

  try {
    const { createWorker } = await import(
      'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js'
    );
    _ocrWorker = await createWorker('deu', 1, {
      workerPath:  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      langPath:    'https://tessdata.projectnaptha.com/4.0.0',
      cacheMethod: 'write',
      logger:      m => {
        if (m.status === 'recognizing text') _setOcrProgress(Math.round(m.progress * 100));
      },
    });
    _setOcrStatus(t('ocrStatusReady'), false);
  } catch (err) {
    console.error('[OCR] Init-Fehler:', err);
    _setOcrStatus(t('ocrStatusError'), false);
  } finally {
    _ocrBusy = false;
  }
}

/** Bild vorschauen → vorverarbeiten → OCR → Ergebnis anzeigen. */
async function _processOcrImage(file) {
  if (!_ocrWorker) { toast(t('ocrToastNotReady')); return; }
  if (_ocrBusy)    return;
  _ocrBusy = true;

  // Vorschau sofort anzeigen
  const objectUrl  = URL.createObjectURL(file);
  const previewImg = document.getElementById('ocrPreviewImg');
  if (previewImg) previewImg.src = objectUrl;
  _ocrShow('ocrPreview');
  _ocrHide('ocrResults');

  // Fortschrittsbalken einblenden
  _setOcrProgress(0);
  _ocrShow('ocrProgress');
  _setOcrStatus(t('ocrStatusProcessing'), false);

  try {
    const canvas = await _ocrPreprocessImage(objectUrl);
    URL.revokeObjectURL(objectUrl);

    const { data: { text } } = await _ocrWorker.recognize(canvas);
    _ocrRenderResults(text);
    _setOcrStatus(t('ocrStatusDone'), false);
  } catch (err) {
    console.error('[OCR] Erkennungs-Fehler:', err);
    _setOcrStatus(t('ocrStatusError'), false);
    URL.revokeObjectURL(objectUrl);
  } finally {
    _ocrBusy = false;
    _ocrHide('ocrProgress');
  }
}

/**
 * Skaliert das Bild auf max. 1 500 px und wandelt es in Graustufen um.
 * Verbessert Tesseract-Genauigkeit und Erkennungsgeschwindigkeit.
 */
function _ocrPreprocessImage(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload  = () => {
      const MAX    = 1500;
      const scale  = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.filter = 'grayscale(1) contrast(1.3)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.src = objectUrl;
  });
}

/** Extrahiert Beträge + Datum aus dem OCR-Text und rendert das Ergebnis-Panel. */
function _ocrRenderResults(text) {
  const rawEl = document.getElementById('ocrRawText');
  if (rawEl) rawEl.textContent = text.trim();

  const amounts = _ocrExtractAmounts(text);
  const date    = _ocrExtractDate(text);
  const fmt     = v => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);

  // Bester Betrag
  const amountEl = document.getElementById('ocrAmount');
  if (amountEl) amountEl.textContent = amounts.best !== null ? fmt(amounts.best) : '–';

  // Datum
  const dateEl = document.getElementById('ocrDate');
  if (dateEl) dateEl.textContent = date || '–';

  // Alle Beträge (Chips) – nur wenn mehr als einer gefunden
  const allEl = document.getElementById('ocrAllAmounts');
  if (allEl) {
    allEl.innerHTML = amounts.all.length > 1
      ? `<div class="ocr-all-amounts">
           <span class="ocr-all-label">${t('ocrAllAmounts')}</span>
           ${amounts.all.map(a => `<span class="ocr-amount-chip">${fmt(a)}</span>`).join('')}
         </div>`
      : '';
  }

  _ocrShow('ocrResults');
}

/**
 * Findet alle Geldbeträge im Text (deutsches Format).
 * Gibt { best, all } zurück – best ist der wahrscheinlichste Gesamtbetrag.
 */
function _ocrExtractAmounts(text) {
  const regex = /\b(\d{1,4}[.,]\d{2})\s*€?\b/g;
  const found = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(',', '.'));
    if (val > 0 && val < 10000) found.push(val);
  }
  if (!found.length) return { best: null, all: [] };

  // Keyword-Strategie: Betrag nach bekannten Summen-Labels suchen
  const lower    = text.toLowerCase();
  const keywords = ['gesamtbetrag', 'gesamt', 'summe', 'total', 'zu zahlen', 'zahlen', 'betrag'];
  let best       = null;

  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    const m = text.substring(idx, idx + 60).match(/\d{1,4}[.,]\d{2}/);
    if (m) { best = parseFloat(m[0].replace(',', '.')); break; }
  }

  // Fallback: größter gefundener Betrag
  if (best === null) best = Math.max(...found);

  // Dedupliziert, absteigend sortiert
  const unique = [...new Set(found)].sort((a, b) => b - a);
  return { best, all: unique };
}

/** Findet das erste Datum im Format DD.MM.YYYY oder DD.MM.YY. */
function _ocrExtractDate(text) {
  const m = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${d.padStart(2, '0')}.${mo.padStart(2, '0')}.${year}`;
}

// ── OCR-Hilfsfunktionen ───────────────────────────────────────────────────────

function _setOcrStatus(text, spinning) {
  const textEl = document.getElementById('ocrStatusText');
  const spinEl = document.getElementById('ocrStatusSpin');
  if (textEl) textEl.textContent = text;
  if (spinEl) {
    if (spinning) {
      spinEl.classList.remove('ocr-hidden');
      spinEl.classList.add('spin');
    } else {
      spinEl.classList.add('ocr-hidden');
      spinEl.classList.remove('spin');
    }
  }
}

function _setOcrProgress(pct) {
  const fill = document.getElementById('ocrProgressFill');
  const text = document.getElementById('ocrProgressText');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${pct} %`;
}

function _ocrShow(id) { document.getElementById(id)?.classList.remove('ocr-hidden'); }
function _ocrHide(id) { document.getElementById(id)?.classList.add('ocr-hidden'); }
