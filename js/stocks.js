/**
 * @module stocks
 * Aktien-Vergleich: Watchlist mit KPI-Scoring nach Value-Investing-Kriterien
 * (Buffett/Graham/Lynch). Rohdaten kommen von Finnhub (finnhub.io).
 *
 * ## Wechsel von FMP zu Finnhub
 * FMPs Free-Tier hat die Kennzahlen-Endpunkte für manche Symbole (z.B.
 * Synopsys/SNPS) komplett mit 401/403 gesperrt, obwohl derselbe Key für
 * andere Symbole (z.B. AAPL) funktionierte – eine Symbol-Beschränkung des
 * Plans, kein Bug in dieser App. Ein kurzer Test mit Yahoo Finance als
 * Fallback scheiterte an CORS (anonyme Browser-Anfragen werden blockiert).
 * Finnhub bietet ein großzügigeres Free-Tier-Limit (60 Calls/Minute statt
 * FMPs 250/Tag), ist offiziell für Client-Zugriffe dokumentiert und deckt
 * laut Dokumentation die breite Masse US-gelisteter Aktien ab.
 *
 * ACHTUNG: Finnhubs genaue Feldnamen in /stock/metric sind aus Erfahrungs-
 * werten übernommen, NICHT live gegen die echte API verifiziert (aus der
 * Entwicklungsumgebung heraus nicht erreichbar – gleiche Sandbox-Firewall,
 * die schon FMP/OpenFIGI/Yahoo blockiert hat). Einzelne KPIs können beim
 * ersten echten Test leer bleiben, falls der tatsächliche Feldname abweicht
 * – der Score rechnet dann einfach nur mit den verfügbaren Werten weiter.
 *
 * ## Architektur
 * - Datenpipeline: Finnhub-Rohdaten → {@link _normalize} in ein eigenes
 *   Schema (Feldnamen-Fallback-Ketten wie zuvor bei FMP).
 * - Scoring-Layer: pro Kategorie ein normalisierter Score 0–100 statt
 *   Rohzahlen ({@link _computeScores}); Gewichtung in {@link WEIGHTS}.
 * - Caching: Fundamentaldaten ändern sich quartalsweise → Daten werden nur
 *   auf Nutzeraktion geholt (Ticker hinzufügen, ↻ pro Zeile, "Alle
 *   aktualisieren"), nie automatisch.
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

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

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

  document.getElementById('btnStocksInfo')
    ?.addEventListener('click', _toggleInfo);

  document.getElementById('btnRefreshAllStocks')
    ?.addEventListener('click', _refreshAll);
}

/**
 * Beim Öffnen des Tabs: nur rendern.
 * Bewusst KEIN automatischer Datenabruf – Daten werden ausschließlich
 * auf Nutzeraktion geholt (Ticker hinzufügen oder ↻ pro Zeile).
 */
export function onStocksTabOpen() {
  renderStocks();
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
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

/**
 * Eingabe akzeptiert Ticker oder ISIN; ISIN wird über Finnhubs Suche zum
 * Ticker aufgelöst. WKN wird bewusst NICHT unterstützt: die einzige
 * kostenlose WKN-Auflösung (OpenFIGI) blockt anonyme Browser-Anfragen per
 * CORS – ohne eigenes Backend lässt sich das nicht umgehen.
 */
async function _addTicker() {
  const input = document.getElementById('stocksTickerInput');
  let raw = input.value.trim().toUpperCase();

  // Copy-Paste-Härtung: Finanzseiten zeigen die ISIN oft mit Label oder
  // zusammen mit der WKN ("ISIN: US8716071076", "US8716071076 | WKN 883703").
  // Passt die Rohtext-Eingabe nicht direkt, aber eine ISIN steckt darin,
  // wird sie extrahiert statt die Eingabe pauschal abzulehnen.
  if (!/^[A-Z0-9.\-]{1,12}$/.test(raw)) {
    const embedded = raw.match(/\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b/);
    if (embedded) raw = embedded[0];
  }

  if (!raw || !/^[A-Z0-9.\-]{1,12}$/.test(raw)) { toast(t('stocksErrTicker')); return; }

  const s = _store();
  if (!s.apiKey) { toast(t('stocksErrNoKey')); return; }

  let ticker = raw;
  if (_looksLikeIsin(raw)) {
    toast(t('stocksResolving', raw));
    const result = await _resolveIsinToTicker(raw);
    if (!result.ticker) {
      console.error('[Stocks] ISIN-Auflösung fehlgeschlagen:', raw, result.detail);
      toast(`${t('stocksErrResolve', raw)}${result.detail ? ' – ' + result.detail : ''}`, 6000);
      return;
    }
    ticker = result.ticker;
    if (ticker !== raw) toast(`${raw} → ${ticker}`);
  }

  if (s.watchlist.includes(ticker)) {
    // Erneutes Eintragen ist eine bewusste Aktion → als "jetzt aktualisieren"
    // verstehen, statt nur "bereits vorhanden" zu melden und nichts zu tun.
    toast(t('stocksToastExists'));
    input.value = '';
    _fetchTicker(ticker, true);
    return;
  }

  s.watchlist.push(ticker);
  saveData();
  input.value = '';

  _renderTable();
  _fetchTicker(ticker, true);
}

/** ISIN: 2 Länderbuchstaben + 9 Zeichen + Prüfziffer (z.B. US0378331005). */
const _looksLikeIsin = v => /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(v);

/**
 * Löst eine ISIN über Finnhubs Symbol-Suche (/search?q=) zum Ticker auf.
 * UNVERIFIZIERT, ob Finnhubs Suche direkt nach ISIN sucht (aus der
 * Entwicklungsumgebung heraus nicht testbar) – erster Praxistest steht aus.
 *
 * @returns {Promise<{ticker: string|null, detail: string}>}
 */
async function _resolveIsinToTicker(isin) {
  try {
    const r = await _finnhubGet(`search?q=${isin}`);
    const hit = r?.result?.find(x => x.symbol && !x.symbol.includes('.'));
    if (hit) return { ticker: hit.symbol, detail: '' };
    return { ticker: null, detail: 'Finnhub: kein Treffer' };
  } catch (e) {
    return { ticker: null, detail: `Finnhub: ${_errorLabel(e)}` };
  }
}

/** Manuell ausgelöst: holt alle Watchlist-Ticker frisch. */
function _refreshAll() {
  const s = _store();
  if (!s.apiKey)            { toast(t('stocksErrNoKey')); return; }
  if (!s.watchlist.length)  { toast(t('stocksEmpty'));    return; }
  s.watchlist.forEach(ticker => _fetchTicker(ticker, true));
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

// ── Datenpipeline (Finnhub) ───────────────────────────────────────────────────

/**
 * Holt Profil, aktuellen Kurs und alle Kennzahlen (3 Calls statt vormals 4
 * bei FMP – Finnhub bündelt die meisten Ratios/Wachstumsraten in einem
 * einzigen "metric=all"-Call), normalisiert sie, berechnet Scores und
 * schreibt das Ergebnis in den Cache.
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

  // Jeder Endpoint einzeln (allSettled): Teilausfälle kosten nur die
  // betroffene Kategorie, nicht die ganze Aktie.
  const results = await Promise.allSettled([
    _finnhubGet(`stock/profile2?symbol=${ticker}`),
    _finnhubGet(`quote?symbol=${ticker}`),
    _finnhubGet(`stock/metric?symbol=${ticker}&metric=all`),
  ]);

  const [profile, quote, metricResp] =
    results.map(r => (r.status === 'fulfilled' ? r.value : null));

  // Diagnose pro Endpoint statt nur des ersten Fehlers.
  const endpointLabels = ['profile', 'quote', 'metric'];
  const perEndpoint = results
    .map((r, i) => (r.status === 'rejected' ? `${endpointLabels[i]}: ${_errorLabel(r.reason)}` : null))
    .filter(Boolean);
  results.filter(r => r.status === 'rejected')
    .forEach(r => console.error(`[Stocks] ${ticker}:`, r.reason));

  const kpis        = _normalize(profile, quote, metricResp?.metric);
  const hasAnyValue = Object.values(kpis.values).some(v => v !== null);

  if (!hasAnyValue) {
    // Kompletter Fehlschlag → Fehler in der Zeile anzeigen (kein TTL-Cache)
    s.cache[ticker] = { error: perEndpoint.join(' · ') || t('stocksErrNet') };
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
 * GET gegen Finnhub; wirft mit err.status bei HTTP-Fehlern bzw.
 * err.finnhubMessage, falls die Antwort ein {"error": "..."} enthält.
 */
async function _finnhubGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${FINNHUB_BASE}/${path}${sep}token=${encodeURIComponent(_store().apiKey)}`);
  if (!res.ok) {
    const err = new Error(`Finnhub /${path.split('?')[0]}: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  if (json && typeof json.error === 'string') {
    const err = new Error(json.error);
    err.finnhubMessage = json.error;
    throw err;
  }
  return json;
}

/** Menschlich lesbare Fehlerbeschreibung für die Tabellenzeile. */
function _errorLabel(err) {
  if (err?.finnhubMessage) return err.finnhubMessage; // Finnhubs eigener Text, unverfälscht
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
 * Finnhub benennt Kennzahlen mit Suffixen (TTM/Annual/Quarterly/5Y) leicht
 * uneinheitlich – nicht jedes Feld existiert für jedes Symbol.
 */
function _pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'number' && isFinite(v)) return v;
  }
  return null;
}

/** Normalisiert Finnhubs 3 Antworten in das eigene KPI-Schema. */
function _normalize(profile, quote, m) {
  const pe        = _pick(m, 'peTTM', 'peExclExtraTTM', 'peBasicExclExtraTTM', 'peAnnual');
  const epsGrowth = _pick(m, 'epsGrowth5Y', 'epsGrowthTTMYoy', 'epsGrowthQuarterlyYoy');

  // PEG: von Finnhub übernehmen falls vorhanden, sonst selbst berechnen
  // (KGV / EPS-Wachstumsrate in %, nur bei positivem Wachstum sinnvoll).
  const peg = _pick(m, 'pegTTM', 'pegAnnual')
    ?? ((pe !== null && pe > 0 && epsGrowth !== null && epsGrowth > 0) ? pe / (epsGrowth * 100) : null);

  // FCF-Yield: falls nicht direkt vorhanden, aus FCF/Aktie ÷ Kurs berechnen.
  const fcfPerShare = _pick(m, 'freeCashFlowPerShareTTM', 'focfPerShareTTM');
  const price       = _pick(quote, 'c') ?? _pick(profile, 'price');
  const fcfYield    = _pick(m, 'freeCashFlowYieldTTM')
    ?? ((fcfPerShare !== null && price) ? fcfPerShare / price : null);

  return {
    name:     profile?.name ?? null,
    sector:   profile?.finnhubIndustry ?? null,
    price,
    currency: profile?.currency ?? 'USD',
    values: {
      // Bewertung
      pe,
      pb:           _pick(m, 'pbQuarterly', 'pbAnnual', 'ptbvQuarterly'),
      evEbitda:     _pick(m, 'evEbitdaTTM', 'enterpriseValueOverEBITDATTM', 'currentEv/freeCashFlowTTM'),
      fcfYield,
      peg,
      // Rentabilität
      roe:          _pick(m, 'roeTTM', 'roeRfy', 'roeAnnual'),
      roic:         _pick(m, 'roicTTM', 'roiTTM', 'roicAnnual'),
      opMargin:     _pick(m, 'operatingMarginTTM', 'operatingMarginAnnual'),
      netMargin:    _pick(m, 'netProfitMarginTTM', 'netMarginTTM', 'netProfitMarginAnnual'),
      // Stabilität
      debtEquity:   _pick(m, 'totalDebt/totalEquityAnnual', 'totalDebt/totalEquityQuarterly', 'longTermDebt/equityAnnual'),
      interestCov:  _pick(m, 'netInterestCoverageTTM', 'interestCoverageTTM'),
      currentRatio: _pick(m, 'currentRatioAnnual', 'currentRatioQuarterly'),
      // Wachstum
      revGrowth:    _pick(m, 'revenueGrowth5Y', 'revenueGrowthTTMYoy', 'revenueGrowthQuarterlyYoy'),
      epsGrowth,
      fcfGrowth:    _pick(m, 'focfCagr5Y', 'freeCashFlowGrowth5Y'),
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

// ── Infobox: Berechnung der KPIs ──────────────────────────────────────────────

/** Blendet die Infobox ein/aus; Inhalt wird beim ersten Öffnen erzeugt. */
function _toggleInfo() {
  const box = document.getElementById('stocksInfo');
  if (!box) return;
  if (box.classList.contains('is-hidden')) {
    box.innerHTML = _buildInfoHtml(); // bei jedem Öffnen neu (Sprachwechsel)
    box.classList.remove('is-hidden');
  } else {
    box.classList.add('is-hidden');
  }
}

/** Formatiert eine Skalengrenze passend zum KPI-Format. */
function _fmtBound(v, format) {
  return format === 'pct' ? `${Math.round(v * 100)} %` : String(v);
}

/** Erzeugt den Infobox-Inhalt aus KPI_DEFS – bleibt so automatisch synchron. */
function _buildInfoHtml() {
  const catTitles = {
    valuation:     t('stocksColValuation'),
    profitability: t('stocksColProfitability'),
    stability:     t('stocksColStability'),
    growth:        t('stocksColGrowth'),
  };

  const sections = Object.entries(KPI_DEFS).map(([cat, defs]) => {
    const rows = defs.map(([key, i18nKey, format, worst, best]) => {
      const scale = (worst === null)
        ? t('kpiScaleIdeal')  // Sonderfall Current Ratio
        : t('kpiScaleRange', _fmtBound(best, format), _fmtBound(worst, format));
      return `<li>
        <strong>${t(i18nKey)}</strong> – ${t('kpiInfo_' + key)}<br>
        <span class="stocks-info-scale">${scale}</span>
      </li>`;
    }).join('');
    return `<div class="stocks-info-cat">${catTitles[cat]} · ${t('stocksInfoWeight', WEIGHTS[cat])}</div>
      <ul class="stocks-info-list">${rows}</ul>`;
  }).join('');

  return `
    <div class="stocks-info-title">${t('stocksInfoTitle')}</div>
    <p class="stocks-info-intro">${t('stocksInfoIntro')}</p>
    ${sections}`;
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
      // Wertfarbe nach Einzelscore: grün = gut, rot = schlecht, weiß dazwischen
      const valClass = score === null ? ''
        : score >= 67 ? 'stocks-score-good'
        : score < 34  ? 'stocks-score-bad'
        : 'stocks-val-mid';
      return `<tr>
        <td>${t(i18nKey)}</td>
        <td class="stocks-kpi-val ${valClass}">${_fmtKpi(v, format)}</td>
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
