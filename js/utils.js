/**
 * @module utils
 * Reine Hilfsfunktionen für Formatierung, Datumsberechnung und DOM-Utilities.
 * Keine Seiteneffekte außer {@link toast} (DOM-Zugriff).
 */

import { config }         from './config.js';
import { appData }        from './store.js';
import { getUiLocale }    from './i18n.js';

// ── Formatierung ──────────────────────────────────────────────────────────────

/**
 * Formatiert einen Betrag als lokalisierten Währungsstring.
 * Verwendet die in config.json eingestellte Locale und Währung.
 *
 * @param {number} v - Betrag in Euro
 * @returns {string} z.B. "1.234,56 €"
 */
export function fmt(v) {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
  }).format(v);
}

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) als lokales Datum-String.
 * Richtet sich nach der aktuellen UI-Sprache (de-DE / es-ES).
 *
 * @param {string} s - ISO-Datum, z.B. "2026-04-01"
 * @returns {string} z.B. "01.04.2026" (de) / "1/4/2026" (es)
 */
export function fmtDate(s) {
  return new Date(s + 'T00:00:00').toLocaleDateString(getUiLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── Datums-Hilfsmittel ────────────────────────────────────────────────────────

/**
 * Extrahiert den Monatschlüssel (YYYY-MM) aus einem ISO-Datum.
 *
 * @param {string} d - ISO-Datum (YYYY-MM-DD)
 * @returns {string} z.B. "2026-04"
 */
export function monthKey(d) {
  return d.substring(0, 7);
}

/**
 * Gibt den Monatschlüssel des aktuellen Monats zurück.
 *
 * @returns {string} z.B. "2026-04"
 */
export function getCurrentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Gibt einen kurzen lokalisierten Monatslabel zurück.
 * Richtet sich nach der aktuellen UI-Sprache.
 *
 * @param {string} ym - Monatschlüssel (YYYY-MM)
 * @returns {string} z.B. "Apr 26" (de) / "abr 26" (es)
 */
export function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString(getUiLocale(), {
    month: 'short',
    year: '2-digit',
  });
}

// ── Daten-Hilfsmittel ─────────────────────────────────────────────────────────

/**
 * Sucht eine Kategorie anhand ihrer ID im aktuellen appData.
 *
 * @param {string} id
 * @returns {import('./store.js').Category|undefined}
 */
export function getCat(id) {
  return appData.categories.find(c => c.id === id);
}

/**
 * Gibt zurück, ob eine Transaktion eine Einnahme ist.
 *
 * @param {import('./store.js').Transaction} t
 * @returns {boolean}
 */
export function isIncome(t) {
  return getCat(t.categoryId)?.type === 'income';
}

/**
 * Gibt alle Transaktionen eines bestimmten Monats zurück.
 *
 * @param {string} m - Monatschlüssel (YYYY-MM)
 * @returns {import('./store.js').Transaction[]}
 */
export function txsForMonth(m) {
  return appData.transactions.filter(t => t.date.startsWith(m));
}

// ── DOM-Hilfsmittel ───────────────────────────────────────────────────────────

/**
 * Escaped HTML-Sonderzeichen in einem String, um XSS-Angriffe zu verhindern.
 *
 * @param {string} s
 * @returns {string}
 */
export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Zeigt eine kurze Toast-Benachrichtigung am unteren Bildschirmrand an.
 *
 * @param {string} msg
 */
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}
