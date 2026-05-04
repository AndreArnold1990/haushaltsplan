/**
 * @module ui
 * DOM-Hilfsmittel für den Auth-Bereich und den Sync-Status-Indikator im Header.
 *
 * Auth-Buttons nutzen CSS-Klassen (.js-sign-in / .js-sign-out) statt onclick-Attributen.
 * Der zugehörige Event-Listener sitzt in app.js (_initEventListeners → Delegation).
 */

import { config }        from './config.js';
import { escHtml }       from './utils.js';
import { GOOGLE_LOGO }   from './firebase.js';
import { t }             from './i18n.js';

/**
 * Aktualisiert den Auth-Bereich (#authArea) im Header.
 *
 * @param {'no-config'|'signed-out'|'signed-in'|'error'} state
 * @param {object} [user]
 */
export function setAuthUI(state, user) {
  const el = document.getElementById('authArea');
  if (!el) return;

  switch (state) {
    case 'no-config':
      document.getElementById('setupBanner').classList.add('is-visible');
      el.innerHTML = `<span class="auth-offline">${t('offlineMode')}</span>`;
      break;

    case 'signed-out':
      el.innerHTML = `<button class="btn-google js-sign-in">
        ${GOOGLE_LOGO} ${t('btnSignIn')}
      </button>`;
      break;

    case 'signed-in': {
      const name = escHtml(user?.name || user?.email || t('btnSignIn'));
      const pic  = user?.picture
        ? `<img class="user-avatar" src="${escHtml(user.picture)}" alt="">`
        : '';
      el.innerHTML = `<div class="user-pill">
        ${pic}
        <span class="user-name">${name}</span>
        <button class="btn-signout js-sign-out" title="${t('titleSignOut')}">&#10005;</button>
      </div>`;
      break;
    }

    case 'error':
      el.innerHTML = `<button class="btn-google js-sign-in" title="${t('btnRetrySignIn')}">
        ${t('btnRetrySignIn')}
      </button>`;
      break;
  }
}

/**
 * Aktualisiert den Sync-Status-Indikator (#syncStatus).
 *
 * @param {'offline'|'syncing'|'synced'|'error'} status
 */
export function setSyncUI(status) {
  const el = document.getElementById('syncStatus');
  if (!el) return;

  // Kein Firebase-Projekt → Indikator nicht zeigen (display: none via CSS-Default)
  if (!config.firebaseConfig?.projectId) return;

  const map = {
    offline: { cls: 'sync-offline', html: t('syncOffline') },
    syncing: { cls: 'sync-syncing', html: `<span class="spin">&#8635;</span> ${t('syncSyncing')}` },
    synced:  { cls: 'sync-synced',  html: t('syncSynced') },
    error:   { cls: 'sync-error',   html: t('syncError') },
  };
  const s = map[status] ?? map.offline;
  el.className = `sync-indicator visible ${s.cls}`;
  el.innerHTML = s.html;
}

/**
 * Wechselt zwischen den drei Tab-Panels.
 *
 * @param {string}      name      - 'dashboard' | 'transactions' | 'categories'
 * @param {HTMLElement} btn       - Angeklickter Nav-Button
 * @param {Object}      renderFns - { renderDashboard, renderTransactions, renderCategories }
 */
export function showTab(name, btn, renderFns) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');

  if (name === 'dashboard')    renderFns.renderDashboard();
  if (name === 'transactions') renderFns.renderTransactions();
  if (name === 'categories')   renderFns.renderCategories();
}
