/**
 * @module recipes
 * Rezepte-Tab im Geheimmenü.
 *
 * Datenquelle: data/rezepte/index.json (von der CI generiert) verweist auf
 * einen Ordner pro Rezept mit rezept.json und optionalem Bild.
 *
 * Features:
 * - Tagesempfehlung: deterministisch aus dem Datum gewürfelt, dadurch den
 *   ganzen Tag stabil und auf allen Geräten identisch. Der 🎲-Button würfelt
 *   lokal neu (Offset nur im Speicher, kein Sync).
 * - Tag-Filter: Tags werden aus allen Rezepten eingesammelt (kleingeschrieben
 *   und getrimmt), Chips entstehen automatisch.
 * - Detailansicht mit Portionsrechner: Zutatenmengen skalieren live.
 */

import { t, getUiLocale } from './i18n.js';
import { escHtml }        from './utils.js';

const BASE = './data/rezepte';

// ── Modulzustand ──────────────────────────────────────────────────────────────

/** @type {Array<object>|null} Geladene Rezepte (null = noch nicht geladen) */
let _recipes    = null;
/** @type {boolean} Verhindert parallele Ladevorgänge */
let _loading    = false;
/** @type {string} Aktiver Tag-Filter ('' = alle) */
let _activeTag  = '';
/** @type {number} Würfel-Offset für die Tagesempfehlung (nur lokal) */
let _diceOffset = 0;
/** @type {number} Portionsanzahl in der offenen Detailansicht */
let _servings   = 2;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/** Wird beim Öffnen des Rezepte-Tabs aufgerufen (lazy load beim ersten Mal). */
export async function onRecipesTabOpen() {
  _showList();
  if (_recipes) { _renderList(); return; }
  if (_loading) return;
  _loading = true;

  const grid = document.getElementById('recipeGrid');
  if (grid) grid.innerHTML = `<p class="recipe-empty">…</p>`;

  try {
    const idxRes = await fetch(`${BASE}/index.json`);
    if (!idxRes.ok) throw new Error(`HTTP ${idxRes.status}`);
    const ids = await idxRes.json();

    const loaded = await Promise.all(ids.map(async id => {
      try {
        const res = await fetch(`${BASE}/${id}/rezept.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = await res.json();
        r.id   = id;
        r.tags = (r.tags || []).map(tag => String(tag).trim().toLowerCase()).filter(Boolean);
        return r;
      } catch (e) {
        console.warn(`[Rezepte] ${id} konnte nicht geladen werden:`, e);
        return null;
      }
    }));

    _recipes = loaded.filter(Boolean);
    _renderList();
  } catch (e) {
    console.error('[Rezepte] Laden fehlgeschlagen:', e);
    if (grid) grid.innerHTML = `<p class="recipe-empty">${t('recipeLoadError')}</p>`;
  } finally {
    _loading = false;
  }
}

// ── Tagesempfehlung ───────────────────────────────────────────────────────────

/** Deterministischer Hash des heutigen Datums (stabil pro Tag und Gerät). */
function _dateHash() {
  const s = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** @returns {object|null} Das heutige Empfehlungs-Rezept */
function _dailyRecipe() {
  if (!_recipes?.length) return null;
  return _recipes[(_dateHash() + _diceOffset) % _recipes.length];
}

// ── Listenansicht ─────────────────────────────────────────────────────────────

function _showList() {
  document.getElementById('recipeListView')?.classList.remove('is-hidden');
  document.getElementById('recipeDetailView')?.classList.add('is-hidden');
}

function _renderList() {
  _renderDaily();
  _renderChips();
  _renderGrid();
}

/** Bild-Kachel oder Emoji-Platzhalter für ein Rezept. */
function _thumbHtml(r, cls) {
  if (r.image) {
    return `<img class="${cls}" src="${BASE}/${escHtml(r.id)}/${escHtml(r.image)}" alt="" loading="lazy">`;
  }
  return `<div class="${cls} recipe-thumb--emoji">${escHtml(r.emoji || '🍽️')}</div>`;
}

function _metaHtml(r) {
  return `⏱ ${r.timeMinutes} ${t('recipeMinutes')} · 👥 ${r.servings} ${t('recipeServings')}`;
}

function _renderDaily() {
  const box = document.getElementById('recipeDaily');
  if (!box) return;
  const r = _dailyRecipe();
  if (!r) { box.innerHTML = ''; return; }

  box.innerHTML = `
    <div class="recipe-daily-card" data-recipe-id="${escHtml(r.id)}">
      ${_thumbHtml(r, 'recipe-daily-img')}
      <div class="recipe-daily-info">
        <span class="recipe-daily-badge">${t('recipeDailyBadge')}</span>
        <span class="recipe-daily-title">${escHtml(r.title)}</span>
        <span class="recipe-daily-meta">${_metaHtml(r)}</span>
      </div>
    </div>
    <button class="btn btn-secondary btn-sm recipe-dice" id="btnRecipeDice">${t('recipeNewDaily')}</button>`;

  box.querySelector('.recipe-daily-card')
    .addEventListener('click', () => _openDetail(r.id));
  box.querySelector('#btnRecipeDice')
    .addEventListener('click', () => { _diceOffset++; _renderDaily(); });
}

function _renderChips() {
  const box = document.getElementById('recipeChips');
  if (!box) return;

  const tags = [...new Set(_recipes.flatMap(r => r.tags))].sort();
  if (_activeTag && !tags.includes(_activeTag)) _activeTag = '';

  const chip = (label, value) =>
    `<button class="recipe-chip${_activeTag === value ? ' active' : ''}" data-tag="${escHtml(value)}">${escHtml(label)}</button>`;

  box.innerHTML = chip(t('recipeAllTag'), '') + tags.map(tag => chip(tag, tag)).join('');

  box.querySelectorAll('.recipe-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTag = btn.dataset.tag;
      _renderChips();
      _renderGrid();
    });
  });
}

function _renderGrid() {
  const box = document.getElementById('recipeGrid');
  if (!box) return;

  const list = _recipes.filter(r => !_activeTag || r.tags.includes(_activeTag));
  if (!list.length) {
    box.innerHTML = `<p class="recipe-empty">${t('recipeEmpty')}</p>`;
    return;
  }

  box.innerHTML = list.map(r => `
    <div class="recipe-card" data-recipe-id="${escHtml(r.id)}">
      ${_thumbHtml(r, 'recipe-card-img')}
      <div class="recipe-card-body">
        <span class="recipe-card-title">${escHtml(r.title)}</span>
        <span class="recipe-card-meta">⏱ ${r.timeMinutes} ${t('recipeMinutes')}</span>
      </div>
    </div>`).join('');

  box.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => _openDetail(card.dataset.recipeId));
  });
}

// ── Detailansicht ─────────────────────────────────────────────────────────────

function _openDetail(id) {
  const r = _recipes?.find(x => x.id === id);
  if (!r) return;
  _servings = r.servings || 2;
  _renderDetail(r);
  document.getElementById('recipeListView')?.classList.add('is-hidden');
  document.getElementById('recipeDetailView')?.classList.remove('is-hidden');
}

function _renderDetail(r) {
  const box = document.getElementById('recipeDetailView');
  if (!box) return;

  box.innerHTML = `
    <button class="btn btn-secondary btn-sm recipe-back" id="btnRecipeBack">${t('recipeBack')}</button>
    ${_thumbHtml(r, 'recipe-detail-img')}
    <div class="recipe-detail-head">
      <span class="recipe-detail-title">${escHtml(r.title)}</span>
      <span class="recipe-detail-meta">⏱ ${r.timeMinutes} ${t('recipeMinutes')} · ${r.tags.map(escHtml).join(' · ')}</span>
    </div>
    <div class="recipe-servings">
      <button class="recipe-servings-btn" id="btnServingsMinus">−</button>
      <span class="recipe-servings-val" id="recipeServingsVal">${_servings} ${t('recipeServings')}</span>
      <button class="recipe-servings-btn" id="btnServingsPlus">+</button>
    </div>
    <div class="recipe-section-title">${t('recipeIngredientsTitle')}</div>
    <ul class="recipe-ingredients" id="recipeIngredients"></ul>
    <div class="recipe-section-title">${t('recipeStepsTitle')}</div>
    <ol class="recipe-steps">
      ${r.steps.map(s => `<li>${escHtml(s)}</li>`).join('')}
    </ol>
    ${r.notes ? `<div class="recipe-notes">💡 ${escHtml(r.notes)}</div>` : ''}`;

  box.querySelector('#btnRecipeBack').addEventListener('click', _showList);
  box.querySelector('#btnServingsMinus').addEventListener('click', () => _changeServings(r, -1));
  box.querySelector('#btnServingsPlus').addEventListener('click', () => _changeServings(r, +1));
  _renderIngredients(r);
}

function _changeServings(r, delta) {
  _servings = Math.min(12, Math.max(1, _servings + delta));
  const el = document.getElementById('recipeServingsVal');
  if (el) el.textContent = `${_servings} ${t('recipeServings')}`;
  _renderIngredients(r);
}

function _renderIngredients(r) {
  const ul = document.getElementById('recipeIngredients');
  if (!ul) return;
  const factor = _servings / (r.servings || _servings);

  ul.innerHTML = r.ingredients.map(ing => {
    const qty = ing.amount != null
      ? `<span class="recipe-ing-qty">${_fmtAmount(ing.amount * factor)}${ing.unit ? '&nbsp;' + escHtml(ing.unit) : ''}</span> `
      : '';
    return `<li>${qty}${escHtml(ing.name)}</li>`;
  }).join('');
}

/** Formatiert eine skalierte Menge ohne unnötige Nachkommastellen. */
function _fmtAmount(v) {
  const rounded = Math.round(v * 100) / 100;
  return rounded.toLocaleString(getUiLocale(), { maximumFractionDigits: 2 });
}
