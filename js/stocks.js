/**
 * @module stocks
 * Aktien-Vergleich: Watchlist mit KPI-Scoring nach Value-Investing-Kriterien
 * (Buffett/Graham/Lynch). Rohdaten kommen von Financial Modeling Prep (FMP).
 *
 * ## Architektur
 * - Datenpipeline: FMP-Rohdaten → {@link _normalize} in ein eigenes Schema
 *   (FMP-Feldnamen sind je nach Endpoint uneinheitlich → Fallback-Ketten).
 * - Scoring-Layer: pro Kategorie ein normalisierter Score 0–100 statt
 *   Rohzahlen ({@link _computeScores}); Gewichtung in {@link WEIGHTS}.
 * - Caching: Fundamentaldaten ändern sich quartalsweise → Daten werden max.
 *   1× täglich geholt (Free-Tier: 250 Calls/Tag, 4 Calls pro Ticker).
 * - Persistenz: alles unter appData.stocks → synct via Firestore wie der
 *   Rest der App (Watchlist ist damit für beide Partner identisch).
 *
 * v1-Umfang: Kategorien Bewertung, Rentabilität, Stabilität, Wachstum.
 * Später geplant: Qualität/Moat (Margen-Konstanz, Buybacks) + Makro (FRED).
 */

import { t }                 from './i18n.js';
import { appData, saveData } from './store.js';
import { toast }             from './utils.js';

// ── Konstanten ────────────────────────────────────────────────────────────────

const FMP_BASE = 'https://financialmodelingprep.com';

/** Cache-Lebensdauer: 20 h → höchstens 1 Aktualisierung pro Tag und Ticker. */
const CACHE_TTL_MS = 20 * 60 * 60 * 1000;

/** Kategorie-Gewichtung für den Gesamtscore (Summe = 100). */
const WEIGHTS = { valuation: 30, profitability: 25, stability: 20, growth: 25 };

/** Kennzahlen pro Kategorie: [KPI-Key, i18n-Key, Format, worst, best].
 *  worst/best spannen die lineare 0–100-Skala auf (worst > best = "weniger ist besser"). */
const KPI_DEFS = {
  valuation: [
    ['pe',           'kpiPe',           'num', 35,    8   ],
    ['pb',           'kpiPb',           'num', 6,     1   ],
    ['evEbitda',     'kpiEvEbitda',     'num', 22,    6   ],
    ['fcfYield',     'kpiFcfYield',     'pct', 0,     0.08],
    ['peg',          'kpiPeg',          'num', 3,     1   ],
  ],
  profitability: [
    ['roe',          'kpiRoe',          'pct', 0,     0.20],
    ['roic',         'kpiRoic',         'pct', 0,     0.15],
    ['opMargin',     'kpiOpMargin',     'pct', 0,     0.25],
    ['netMargin',    'kpiNetMargin',    'pct', 0,     0.20],
  ],
  stability: [
    ['debtEquity',   'kpiDebtEquity',   'num', 2.5,   0.3 ],
    ['interestCov',  'kpiInterestCov',  'num', 1,     10  ],
    ['currentRatio', 'kpiCurrentRatio', 'num', null,  null], // Sonderfall, siehe _scoreKpi
  ],
  growth: [
    ['revGrowth',    'kpiRevGrowth',    'pct', 0,     0.15],
    ['epsGrowth',    'kpiEpsGrowth',    'pct', 0,     0.15],
    ['fcfGrowth',    'kpiFcfGrowth',    'pct', 0,     0.15],
  ],
};

// ── Modulzustand ──────────────────────────────────────────────────────────────

/** Ticker, deren Fetch gerade läuft (verhindert Doppel-Calls). */
const _loading = new Set();

/** Aktuell aufgeklappter Ticker in der Detail-Ansicht. */
let _detailTicker = null;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/** Registriert alle Event-Listener. Einmalig von initTools() aufgerufen. */
export function initStocks() {
  document.getElementById('btnSaveStocksKey')
    ?.addEventListener('click', _saveApiKey);

  document.getElementById('btnAddStock')
    ?.addEventListener('click', _addTicker);

  document.getElementById('stocksTickerInput')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') _addTicker(); });
}

/** Beim Öffnen des Tabs: rendern + veraltete Ticker aktualisieren. */
export function onStocksTabOpen() {
  renderStocks();
  _refreshStale();
}

/**
 * Rendert API-Key-Bereich, Vergleichstabelle und Detail-Ansicht.
 * Öffentlich, damit app.js nach Firestore-Datenladen aktualisieren kann.
 */
export function renderStocks() {
  const s = _store();

  // Key-Bereich: eingeklappt sobald ein Key gespeichert ist
  const details = document.getElementById('stocksKeyDetails');
  if (details && !details.dataset.touched) details.open = !s.apiKey;

  _renderTable();
  _renderDetail();
}

// ── Persistenz-Helfer ─────────────────────────────────────────────────────────

/** Liefert appData.stocks und legt die Struktur bei Bedarf an. */
function _store() {
  if (!appData.stocks)           appData.stocks           = {};
  if (!appData.stocks.apiKey)    appData.stocks.apiKey    = appData.stocks.apiKey ?? '';
  if (!appData.stocks.watchlist) appData.stocks.watchlist = [];
  if (!appData.stocks.cache)     appData.stocks.cache     = {};
  return appData.stocks;
}

// ── API-Key ───────────────────────────────────────────────────────────────────

function _saveApiKey() {
  const input = document.getElementById('stocksApiKey');
  const key   = input.value.trim();
  if (!key) { toast(t('stocksErrNoKey')); return; }

  _store().apiKey = key;
  saveData();
  input.value = '';

  const details = document.getElementById('stocksKeyDetails');
  if (details) { details.open = false; details.dataset.touched = '1'; }

  toast(t('stocksToastKeySaved'));
  _refreshStale();
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

function _addTicker() {
  const input  = document.getElementById('stocksTickerInput');
  const ticker = input.value.trim().toUpperCase();
  if (!ticker || !/^[A-Z0-9.\-]{1,10}$/.test(ticker)) { toast(t('stocksErrTicker')); return; }

  const s = _store();
  if (s.watchlist.includes(ticker)) { toast(t('stocksToastExists')); return; }
  if (!s.apiKey)                    { toast(t('stocksErrNoKey'));    return; }

  s.watchlist.push(ticker);
  saveData();
  input.value = '';

  _renderTable();
  _fetchTicker(ticker, true);
}

function _removeTicker(ticker) {
  const s = _store();
  s.watchlist = s.watchlist.filter(x => x !== ticker);
  delete s.cache[ticker];
  if (_detailTicker === ticker) _detailTicker = null;
  saveData();
  renderStocks();
  toast(t('stocksToastRemoved'));
}

/** Holt alle Ticker neu, deren Cache älter als {@link CACHE_TTL_MS} ist. */
function _refreshStale() {
  const s = _store();
  if (!s.apiKey) return;
  const now = Date.now();
  for (const ticker of s.watchlist) {
    const cached = s.cache[ticker];
    if (!cached || now - (cached.fetchedAt ?? 0) > CACHE_TTL_MS) {
      _fetchTicker(ticker, false);
    }
  }
}

// ── Datenpipeline (FMP) ───────────────────────────────────────────────────────

/**
 * Holt Profil, TTM-Ratios, TTM-Key-Metrics und Wachstumsdaten (4 Calls),
 * normalisiert sie, berechnet Scores und schreibt das Ergebnis in den Cache.
 *
 * @param {string}  ticker
 * @param {boolean} force - true: Cache-Alter ignorieren (manueller Refresh)
 */
async function _fetchTicker(ticker, force) {
  const s = _store();
  if (!s.apiKey || _loading.has(ticker)) return;
  if (!force) {
    const cached = s.cache[ticker];
    if (cached && Date.now() - (cached.fetchedAt ?? 0) <= CACHE_TTL_MS) return;
  }

  _loading.add(ticker);
  _renderTable();

  // Jeder Endpoint einzeln (allSettled): Teilausfälle (z.B. Endpoint nicht im
  // Free-Tier) kosten nur die betroffene Kategorie, nicht die ganze Aktie.
  const results = await Promise.allSettled([
    _fmp(`stable/profile?symbol=${ticker}`,
         `api/v3/profile/${ticker}`),
    _fmp(`stable/ratios-ttm?symbol=${ticker}`,
         `api/v3/ratios-ttm/${ticker}`),
    _fmp(`stable/key-metrics-ttm?symbol=${ticker}`,
         `api/v3/key-metrics-ttm/${ticker}`),
    _fmp(`stable/financial-growth?symbol=${ticker}&period=annual&limit=5`,
         `api/v3/financial-growth/${ticker}?period=annual&limit=5`),
  ]);

  const [profile, ratios, metrics, growth] =
    results.map(r => (r.status === 'fulfilled' ? r.value : null));
  const failures = results.filter(r => r.status === 'rejected').map(r => r.reason);
  failures.forEach(err => console.error(`[Stocks] ${ticker}:`, err));

  const kpis = _normalize(profile?.[0], ratios?.[0], metrics?.[0], growth);
  const hasAnyValue = Object.values(kpis.values).some(v => v !== null);

  if (!hasAnyValue) {
    // Kompletter Fehlschlag → Fehler in der Zeile anzeigen (kein TTL-Cache)
    s.cache[ticker] = { error: _errorLabel(failures[0]) };
    saveData();
    toast(t('stocksErrLoad', ticker));
  } else {
    s.cache[ticker] = {
      fetchedAt: Date.now(),
      name:      kpis.name,
      sector:    kpis.sector,
      price:     kpis.price,
      currency:  kpis.currency,
      kpis:      kpis.values,
      scores:    _computeScores(kpis.values),
    };
    saveData();
  }

  _loading.delete(ticker);
  renderStocks();
}

/**
 * Ein FMP-Call mit Fallback: erst der neue /stable/-Endpoint, bei einem
 * Fehler der Legacy-Endpoint /api/v3/ (ältere Keys/Pläne decken teils nur
 * die eine oder die andere API ab).
 */
async function _fmp(stablePath, v3Path) {
  try {
    return await _fmpGet(stablePath);
  } catch (err) {
    try {
      return await _fmpGet(v3Path);
    } catch (err2) {
      // Aussagekräftigeren Fehler weiterreichen (Status vor Netzwerkfehler)
      throw (err2.status ?? 0) >= (err.status ?? 0) ? err2 : err;
    }
  }
}

/** GET gegen FMP; wirft mit err.status bei HTTP- oder API-Fehlern. */
async function _fmpGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${FMP_BASE}/${path}${sep}apikey=${encodeURIComponent(_store().apiKey)}`);
  if (!res.ok) {
    const err = new Error(`FMP /${path.split('?')[0]}: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  // FMP liefert Fehler teils als 200 mit {"Error Message": "..."}
  if (json && !Array.isArray(json) && json['Error Message']) {
    const err = new Error(json['Error Message']);
    err.status = 401;
    throw err;
  }
  return json;
}

/** Menschlich lesbare Fehlerbeschreibung für die Tabellenzeile. */
function _errorLabel(err) {
  const status = err?.status ?? 0;
  if (status === 401 || status === 403) return t('stocksErrAuth');
  if (status === 402)                   return t('stocksErrPlan');
  if (status === 429)                   return t('stocksErrLimit');
  if (status === 404)                   return t('stocksErrNotFound');
  if (status > 0)                       return `HTTP ${status}`;
  return t('stocksErrNet');
}

/**
 * Erster endlicher Zahlenwert aus einer Liste möglicher Feldnamen.
 * FMP benennt Felder je nach Endpoint/Version unterschiedlich.
 */
function _pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'number' && isFinite(v)) return v;
  }
  return null;
}

/** Durchschnitt eines Feldes über die Wachstums-Jahresliste (Fallback-Namen). */
function _avgGrowth(rows, ...keys) {
  const vals = (rows ?? [])
    .map(r => _pick(r, ...keys))
    .filter(v => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Normalisiert die 4 FMP-Antworten in das eigene KPI-Schema. */
function _normalize(profile, ratios, metrics, growth) {
  const pe        = _pick(ratios,  'priceToEarningsRatioTTM', 'priceEarningsRatioTTM', 'peRatioTTM');
  const epsGrowth = _avgGrowth(growth, 'epsgrowth', 'epsGrowth', 'netIncomeGrowth');

  // PEG selbst berechnen: KGV / EPS-Wachstumsrate in % (nur bei positivem Wachstum sinnvoll)
  const peg = (pe !== null && pe > 0 && epsGrowth !== null && epsGrowth > 0)
    ? pe / (epsGrowth * 100)
    : null;

  return {
    name:     profile?.companyName ?? profile?.name ?? null,
    sector:   profile?.sector ?? null,
    price:    _pick(profile, 'price'),
    currency: profile?.currency ?? 'USD',
    values: {
      // Bewertung
      pe,
      pb:           _pick(ratios,  'priceToBookRatioTTM', 'ptbRatioTTM', 'priceBookValueRatioTTM'),
      evEbitda:     _pick(metrics, 'evToEBITDATTM', 'enterpriseValueOverEBITDATTM')
                 ?? _pick(ratios,  'enterpriseValueMultipleTTM'),
      fcfYield:     _pick(metrics, 'freeCashFlowYieldTTM'),
      peg,
      // Rentabilität
      roe:          _pick(ratios,  'returnOnEquityTTM'),
      roic:         _pick(metrics, 'returnOnInvestedCapitalTTM', 'roicTTM'),
      opMargin:     _pick(ratios,  'operatingProfitMarginTTM'),
      netMargin:    _pick(ratios,  'netProfitMarginTTM'),
      // Stabilität
      debtEquity:   _pick(ratios,  'debtToEquityRatioTTM', 'debtEquityRatioTTM'),
      interestCov:  _pick(ratios,  'interestCoverageRatioTTM', 'interestCoverageTTM'),
      currentRatio: _pick(ratios,  'currentRatioTTM'),
      // Wachstum (Ø der letzten bis zu 5 Jahre)
      revGrowth:    _avgGrowth(growth, 'revenueGrowth'),
      epsGrowth,
      fcfGrowth:    _avgGrowth(growth, 'freeCashFlowGrowth'),
    },
  };
}

// ── Scoring-Layer ─────────────────────────────────────────────────────────────

/** Lineare Skala worst→best auf 0–100, geklemmt. Funktioniert in beide Richtungen. */
function _scale(v, worst, best) {
  const x = (v - worst) / (best - worst);
  return Math.round(Math.max(0, Math.min(1, x)) * 100);
}

/** Score einer einzelnen Kennzahl (null wenn Wert fehlt). */
function _scoreKpi(key, v, worst, best) {
  if (v === null || v === undefined) return null;

  // Negative Bewertungs-Multiples = Verlust → schlechtester Score
  if ((key === 'pe' || key === 'evEbitda') && v <= 0) return 0;

  // Current Ratio: Ideal­bereich ~1.5–3; zu niedrig UND zu hoch ist schlecht
  if (key === 'currentRatio') {
    if (v <= 1.5) return _scale(v, 0.5, 1.5);
    return _scale(v, 6, 3);
  }

  return _scale(v, worst, best);
}

/** Kategorie-Scores (Ø der verfügbaren KPIs) + gewichteter Gesamtscore. */
function _computeScores(values) {
  const scores = {};
  for (const [cat, defs] of Object.entries(KPI_DEFS)) {
    const list = defs
      .map(([key, , , worst, best]) => _scoreKpi(key, values[key], worst, best))
      .filter(x => x !== null);
    scores[cat] = list.length
      ? Math.round(list.reduce((a, b) => a + b, 0) / list.length)
      : null;
  }

  let sum = 0, weightSum = 0;
  for (const [cat, weight] of Object.entries(WEIGHTS)) {
    if (scores[cat] !== null) { sum += scores[cat] * weight; weightSum += weight; }
  }
  scores.total = weightSum ? Math.round(sum / weightSum) : null;
  return scores;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

/** CSS-Klasse für die Score-Färbung. */
function _scoreClass(score) {
  if (score === null) return '';
  if (score >= 67) return 'stocks-score-good';
  if (score >= 34) return 'stocks-score-mid';
  return 'stocks-score-bad';
}

function _scoreCell(score) {
  return score === null
    ? '<td class="stocks-score">–</td>'
    : `<td class="stocks-score ${_scoreClass(score)}">${score}</td>`;
}

function _renderTable() {
  const container = document.getElementById('stocksTable');
  if (!container) return;

  const s = _store();
  if (!s.watchlist.length) {
    container.innerHTML = `<p class="cats-empty">${s.apiKey ? t('stocksEmpty') : t('stocksNeedKey')}</p>`;
    return;
  }

  const rows = s.watchlist.map(ticker => {
    const c = s.cache[ticker];
    if (_loading.has(ticker)) {
      return `<tr><td class="stocks-ticker">${ticker}</td>
        <td colspan="5" class="stocks-loading">${t('stocksLoading')}</td>
        <td></td></tr>`;
    }
    if (!c || c.error) {
      return `<tr><td class="stocks-ticker">${ticker}</td>
        <td colspan="5" class="stocks-loading stocks-error">${c?.error ?? '–'}</td>
        <td class="stocks-actions">
          <button class="cats-del-btn" data-stock-refresh="${ticker}" title="${t('stocksRefreshTooltip')}">&#8635;</button>
          <button class="cats-del-btn" data-stock-del="${ticker}" title="${t('stocksDelTooltip')}">&#128465;</button>
        </td></tr>`;
    }
    const sc = c.scores ?? {};
    return `<tr class="stocks-row ${_detailTicker === ticker ? 'is-selected' : ''}" data-stock-detail="${ticker}">
      <td class="stocks-ticker" title="${c.name ?? ''}">${ticker}</td>
      <td class="stocks-score stocks-total ${_scoreClass(sc.total)}">${sc.total ?? '–'}</td>
      ${_scoreCell(sc.valuation)}
      ${_scoreCell(sc.profitability)}
      ${_scoreCell(sc.stability)}
      ${_scoreCell(sc.growth)}
      <td class="stocks-actions">
        <button class="cats-del-btn" data-stock-refresh="${ticker}" title="${t('stocksRefreshTooltip')}">&#8635;</button>
        <button class="cats-del-btn" data-stock-del="${ticker}" title="${t('stocksDelTooltip')}">&#128465;</button>
      </td></tr>`;
  }).join('');

  container.innerHTML = `
    <table class="cats-table stocks-table">
      <thead><tr>
        <th>${t('stocksColTicker')}</th>
        <th title="${t('stocksColTotal')}">&#931;</th>
        <th title="${t('stocksColValuation')}">${t('stocksColValuationShort')}</th>
        <th title="${t('stocksColProfitability')}">${t('stocksColProfitabilityShort')}</th>
        <th title="${t('stocksColStability')}">${t('stocksColStabilityShort')}</th>
        <th title="${t('stocksColGrowth')}">${t('stocksColGrowthShort')}</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  // Aktionen (Refresh/Löschen) – vor Zeilen-Klick registrieren, stopPropagation
  container.querySelectorAll('[data-stock-refresh]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _fetchTicker(btn.dataset.stockRefresh, true);
    });
  });
  container.querySelectorAll('[data-stock-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _removeTicker(btn.dataset.stockDel);
    });
  });
  container.querySelectorAll('[data-stock-detail]').forEach(row => {
    row.addEventListener('click', () => {
      _detailTicker = _detailTicker === row.dataset.stockDetail ? null : row.dataset.stockDetail;
      _renderTable();
      _renderDetail();
    });
  });
}

/** Formatiert einen KPI-Wert fürs Detail (pct = Dezimal → Prozent). */
function _fmtKpi(v, format) {
  if (v === null || v === undefined) return '–';
  if (format === 'pct') return `${(v * 100).toFixed(1)} %`;
  return v.toFixed(2);
}

function _renderDetail() {
  const container = document.getElementById('stocksDetail');
  if (!container) return;

  const c = _detailTicker ? _store().cache[_detailTicker] : null;
  if (!c) { container.innerHTML = ''; return; }

  const catTitles = {
    valuation:     t('stocksColValuation'),
    profitability: t('stocksColProfitability'),
    stability:     t('stocksColStability'),
    growth:        t('stocksColGrowth'),
  };

  const sections = Object.entries(KPI_DEFS).map(([cat, defs]) => {
    const rows = defs.map(([key, i18nKey, format, worst, best]) => {
      const v     = c.kpis?.[key] ?? null;
      const score = _scoreKpi(key, v, worst, best);
      return `<tr>
        <td>${t(i18nKey)}</td>
        <td class="stocks-kpi-val">${_fmtKpi(v, format)}</td>
        ${_scoreCell(score)}
      </tr>`;
    }).join('');
    const catScore = c.scores?.[cat];
    return `
      <div class="cats-section">${catTitles[cat]}
        <span class="stocks-cat-score ${_scoreClass(catScore)}">${catScore ?? '–'}</span>
      </div>
      <table class="cats-table stocks-kpi-table"><tbody>${rows}</tbody></table>`;
  }).join('');

  const fetched = c.fetchedAt
    ? new Date(c.fetchedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : '–';

  container.innerHTML = `
    <div class="stocks-detail-head">
      <strong>${c.name ?? _detailTicker}</strong>
      <span class="stocks-detail-meta">
        ${c.sector ?? ''} · ${c.price != null ? `${c.price.toFixed(2)} ${c.currency}` : ''}
      </span>
      <span class="stocks-detail-meta">${t('stocksUpdatedAt', fetched)}</span>
    </div>
    ${sections}`;
}
