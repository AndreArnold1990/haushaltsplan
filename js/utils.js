/**
 * @module utils
 * Reine Hilfsfunktionen für Formatierung, Datumsberechnung und DOM-Utilities.
 * Keine Seiteneffekte außer {@link toast} (DOM-Zugriff).
 */

import { config }         from './config.js';
import { appData, currentUser } from './store.js';
import { getUiLocale, t, currentLang } from './i18n.js';

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
 * Gibt den Anzeigenamen einer Kategorie in der aktuellen UI-Sprache zurück.
 * Unterstützt sowohl das neue Objekt-Format { de, es } als auch veraltete String-Namen.
 *
 * @param {import('./store.js').Category|null|undefined} cat
 * @returns {string}
 */
export function catName(cat) {
  if (!cat) return '';
  const n = cat.name;
  if (typeof n === 'string') return n;
  return n[currentLang] || n.de || n.es || '';
}

/**
 * Übersetzt einen Text über die MyMemory-API.
 * Benötigt keine Registrierung (Freinutzung bis 1000 Wörter/Tag).
 * Höheres Limit mit optionalem API-Schlüssel in appData.settings.translationApiKey.
 *
 * @param {string} text     - Zu übersetzender Text
 * @param {'de'|'es'} fromLang - Quellsprache
 * @param {'de'|'es'} toLang   - Zielsprache
 * @returns {Promise<string>} Übersetzter Text
 */
export async function translateText(text, fromLang, toLang) {
  if (!text?.trim()) return '';
  const from = fromLang === 'es' ? 'es-MX' : fromLang;
  const to   = toLang   === 'es' ? 'es-MX' : toLang;
  const key  = appData.settings?.translationApiKey?.trim() || '';
  const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}${key ? `&key=${encodeURIComponent(key)}` : ''}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.responseData?.translatedText || '';
}

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
 * @param {import('./store.js').Transaction} tx
 * @returns {boolean}
 */
export function isIncome(tx) {
  return getCat(tx.categoryId)?.type === 'income';
}

/**
 * Gibt zurück, ob eine wiederkehrende Transaktion noch nicht fällig ist
 * (Datum liegt nach heute). Solche Transaktionen werden angezeigt,
 * aber nicht in Berechnungen einbezogen.
 *
 * @param {import('./store.js').Transaction} tx
 * @returns {boolean}
 */
export function isPendingTx(tx) {
  if (!tx.recurringRuleId) return false;
  const today = new Date().toISOString().split('T')[0];
  return tx.date > today;
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

/**
 * Gibt den Vornamen einer Person anhand ihrer Google-sub zurück.
 * Fallback: übersetztes 'partnerFallback'.
 *
 * @param {string|null} sub
 * @returns {string}
 */
export function getPersonName(sub) {
  if (!sub) return t('partnerFallback');
  return appData.users?.[sub]?.firstName || t('partnerFallback');
}

/**
 * Gibt den anderen Nutzer (nicht der aktuell eingeloggte) zurück.
 * Da immer genau zwei Personen an der App arbeiten, ist das eindeutig.
 *
 * @returns {{ sub: string, firstName: string, picture: string|null }|null}
 */
export function getOtherUser() {
  const sub = currentUser?.sub;
  if (!appData.users) return null;
  const entry = Object.entries(appData.users).find(([s]) => s !== sub);
  return entry ? { sub: entry[0], ...entry[1] } : null;
}

// ── DOM-Hilfsmittel ───────────────────────────────────────────────────────────

/**
 * Gibt eine CSS-Farbe zurück, wenn sie exakt dem #rrggbb-Format entspricht.
 * Verhindert CSS-Injection in dynamisch gesetzten style-Attributen (Kategoriefarben).
 *
 * @param {string} color
 * @returns {string} Die Farbe oder ein sicherer Fallback ('#cccccc')
 */
export function safeColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#cccccc';
}

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
