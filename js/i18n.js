/**
 * @module i18n
 * Internationalisierung: Deutsch (de) und Spanisch (es).
 *
 * Verwendung:
 *   import { t } from './i18n.js';
 *   t('btnAddTransaction')          → "Transaktion hinzufügen" / "Añadir transacción"
 *   t('toastCategoryAdded', 'Miete') → "Kategorie "Miete" hinzugefügt ✓" / "Categoría …"
 *
 * Sprachauswahl wird in localStorage ('hp_lang') gespeichert.
 */

// ── Übersetzungstabelle ───────────────────────────────────────────────────────

const translations = {
  de: {
    // Header / Titel
    appTitle:              '🏠 Haushaltsplan',
    langToggleTitle:       'Auf Español wechseln',
    btnRefreshTitle:       'Auf Änderungen prüfen',

    // Navigation
    navDashboard:          '📈 Dashboard',
    navTransactions:       '💳 Transaktionen',
    navCategories:         '🏷 Kategorien',

    // Dashboard – Kacheln
    labelIncome:           'Einnahmen (Monat)',
    labelExpense:          'Ausgaben (Monat)',
    labelBalance:          'Saldo (Monat)',

    // Dashboard – Charts
    chartCategoryTitle:    '🌞 Ausgaben nach Kategorie',
    chartHistoryTitle:     '📈 Verlauf letzte Monate',
    datasetIncome:         'Einnahmen',
    datasetExpense:        'Ausgaben',

    // Transaktionen – Formular
    sectionNewTx:          '+ Neue Transaktion',
    labelDate:             'Datum',
    labelAmount:           'Betrag (€)',
    labelCategory:         'Kategorie',
    labelDescription:      'Beschreibung',
    descPlaceholder:       'z.B. Gehalt April',
    btnAddTx:              '✓ Transaktion hinzufügen',

    // Transaktionen – Tabelle
    sectionTxList:         'Transaktionen',
    thDate:                'Datum',
    thDescription:         'Beschreibung',
    thCategory:            'Kategorie',
    thAmount:              'Betrag',
    thAction:              'Aktion',
    btnDelete:             '🗑 Löschen',
    emptyTx:               'Keine Transaktionen für diesen Monat.',

    // Optgroup-Labels im Kategorie-Dropdown
    groupIncome:           '↑ Einnahmen',
    groupExpense:          '↓ Ausgaben',

    // Kategorien – Formular
    sectionNewCat:         '+ Neue Kategorie',
    labelName:             'Name',
    labelType:             'Typ',
    labelColor:            'Farbe',
    namePlaceholder:       'z.B. Urlaub',
    typeIncome:            '↑ Einnahme',
    typeExpense:           '↓ Ausgabe',
    btnAddCat:             '✓ Kategorie hinzufügen',

    // Kategorien – Liste
    sectionIncomeCats:     '↑ Einnahmen-Kategorien',
    sectionExpenseCats:    '↓ Ausgaben-Kategorien',
    emptyCats:             'Keine Kategorien vorhanden.',
    catEntries:            'Einträge',

    // Modal
    modalTitle:            '🗑 Kategorie löschen',
    modalMoveLabel:        'Transaktionen verschieben nach:',
    btnDeleteTx:           'Transaktionen löschen',
    btnMoveTx:             'Verschieben & löschen',
    btnCancel:             'Abbrechen',

    // Auth-UI
    offlineMode:           'Offline-Modus',
    btnSignIn:             'Mit Google anmelden',
    btnRetrySignIn:        '↻ Erneut anmelden',
    titleSignOut:          'Abmelden',

    // Sync-Status
    syncOffline:           '◯ Offline',
    syncSyncing:           '↻ Sync\u2026',
    syncSynced:            '✓ Synchronisiert',
    syncError:             '⚠ Sync-Fehler',

    // Toast-Nachrichten
    toastSelectDate:       'Bitte ein Datum wählen.',
    toastInvalidAmount:    'Bitte einen gültigen Betrag eingeben.',
    toastSelectCategory:   'Bitte eine Kategorie wählen.',
    toastTxSaved:          'Transaktion gespeichert \u2713',
    toastTxDeleted:        'Transaktion gelöscht.',
    toastTxsMoved:         'Transaktionen verschoben \u2713',
    toastTxsDeleted:       'Transaktionen gelöscht.',
    toastCatDeleted:       'Kategorie gelöscht.',
    toastSignedOut:        'Abgemeldet. Daten werden lokal gespeichert.',

    // Template-Strings (Funktionen)
    signInHintTitle:       'Bitte mit Google anmelden',
    signInHintSub:         'Deine Daten werden aus Google Drive geladen.',
    toastEnterName:        'Bitte einen Namen eingeben.',
    toastNameExists:       'Name bereits vorhanden.',
    toastCatAdded:         name  => `Kategorie "${name}" hinzugefügt \u2713`,
    confirmDeleteTx:       ()    => 'Transaktion wirklich löschen?',
    confirmDeleteCat:      name  => `Kategorie "${name}" löschen?`,
    modalDesc:             (name, n) => `Die Kategorie "${name}" wird von ${n} Transaktion(en) verwendet. Was soll damit passieren?`,
    fileNotFoundMsg:       'Keine Datendatei in Google Drive gefunden.\nNeue Datei anlegen?',
    conflictMsg:           'Die Datei in Drive wurde von jemand anderem geändert.\n\nOK = Meine Version speichern\nAbbrechen = Drive-Version laden',
    ownExpenses:           '💰 Eigene Ausgaben',
    toastNotYourTx:        'Nur eigene Transaktionen können gelöscht werden.',
    sectionTxList:         'Meine Transaktionen',

    // Geteilte Transaktionen
    labelSplitType:        'Wer zahlt?',
    splitPersonal:         'Ich zahle – nur für mich',
    splitShared:           'Ich habe gezahlt – geteilt durch alle',
    sectionSharedTxList:   '🤝 Gemeinsame Transaktionen',
    emptySharedTx:         'Keine gemeinsamen Transaktionen für diesen Monat.',
    thPaidBy:              'Bezahlt von',
    labelMe:               'Du',
    badgeShared:           '🤝 Geteilt',
  },

  es: {
    appTitle:              '🏠 Plan de Gastos',
    langToggleTitle:       'Cambiar a Deutsch',
    btnRefreshTitle:       'Buscar cambios',

    navDashboard:          '📈 Panel',
    navTransactions:       '💳 Transacciones',
    navCategories:         '🏷 Categorías',

    labelIncome:           'Ingresos (Mes)',
    labelExpense:          'Gastos (Mes)',
    labelBalance:          'Saldo (Mes)',

    chartCategoryTitle:    '🌞 Gastos por categoría',
    chartHistoryTitle:     '📈 Historial últimos meses',
    datasetIncome:         'Ingresos',
    datasetExpense:        'Gastos',

    sectionNewTx:          '+ Nueva transacción',
    labelDate:             'Fecha',
    labelAmount:           'Importe (€)',
    labelCategory:         'Categoría',
    labelDescription:      'Descripción',
    descPlaceholder:       'p.ej. Sueldo abril',
    btnAddTx:              '✓ Añadir transacción',

    sectionTxList:         'Transacciones',
    thDate:                'Fecha',
    thDescription:         'Descripción',
    thCategory:            'Categoría',
    thAmount:              'Importe',
    thAction:              'Acción',
    btnDelete:             '🗑 Eliminar',
    emptyTx:               'No hay transacciones este mes.',

    groupIncome:           '↑ Ingresos',
    groupExpense:          '↓ Gastos',

    sectionNewCat:         '+ Nueva categoría',
    labelName:             'Nombre',
    labelType:             'Tipo',
    labelColor:            'Color',
    namePlaceholder:       'p.ej. Vacaciones',
    typeIncome:            '↑ Ingreso',
    typeExpense:           '↓ Gasto',
    btnAddCat:             '✓ Añadir categoría',

    sectionIncomeCats:     '↑ Categorías de ingresos',
    sectionExpenseCats:    '↓ Categorías de gastos',
    emptyCats:             'No hay categorías.',
    catEntries:            'entradas',

    modalTitle:            '🗑 Eliminar categoría',
    modalMoveLabel:        'Mover transacciones a:',
    btnDeleteTx:           'Eliminar transacciones',
    btnMoveTx:             'Mover y eliminar',
    btnCancel:             'Cancelar',

    offlineMode:           'Modo sin conexión',
    btnSignIn:             'Iniciar sesión con Google',
    btnRetrySignIn:        '↻ Volver a iniciar sesión',
    titleSignOut:          'Cerrar sesión',

    syncOffline:           '◯ Sin conexión',
    syncSyncing:           '↻ Sincronizando\u2026',
    syncSynced:            '✓ Sincronizado',
    syncError:             '⚠ Error de sincronización',

    toastSelectDate:       'Por favor selecciona una fecha.',
    toastInvalidAmount:    'Por favor introduce un importe válido.',
    toastSelectCategory:   'Por favor selecciona una categoría.',
    toastTxSaved:          'Transacción guardada \u2713',
    toastTxDeleted:        'Transacción eliminada.',
    toastTxsMoved:         'Transacciones movidas \u2713',
    toastTxsDeleted:       'Transacciones eliminadas.',
    toastCatDeleted:       'Categoría eliminada.',
    toastSignedOut:        'Sesión cerrada. Los datos se guardan localmente.',

    signInHintTitle:       'Inicia sesión con Google',
    signInHintSub:         'Tus datos se cargarán desde Google Drive.',
    toastEnterName:        'Por favor introduce un nombre.',
    toastNameExists:       'El nombre ya existe.',
    toastCatAdded:         name  => `Categoría "${name}" añadida \u2713`,
    confirmDeleteTx:       ()    => '¿Eliminar la transacción?',
    confirmDeleteCat:      name  => `¿Eliminar la categoría "${name}"?`,
    modalDesc:             (name, n) => `La categoría "${name}" es usada por ${n} transacción/es. ¿Qué deseas hacer?`,
    fileNotFoundMsg:       'No se encontró archivo de datos en Google Drive.\n¿Crear un nuevo archivo?',
    conflictMsg:           'El archivo en Drive fue modificado por otra persona.\n\nAceptar = Guardar mi versión\nCancelar = Cargar versión de Drive',
    ownExpenses:           '💰 Mis gastos',
    toastNotYourTx:        'Solo puedes eliminar tus propias transacciones.',
    sectionTxList:         'Mis transacciones',

    // Transacciones compartidas
    labelSplitType:        '¿Quién paga?',
    splitPersonal:         'Solo yo pago',
    splitShared:           'Pago yo – dividido entre todos',
    sectionSharedTxList:   '🤝 Gastos compartidos',
    emptySharedTx:         'No hay gastos compartidos este mes.',
    thPaidBy:              'Pagado por',
    labelMe:               'Tú',
    badgeShared:           '🤝 Compartido',
  },
};

// ── Zustand ───────────────────────────────────────────────────────────────────

/** Aktuell aktive Sprache ('de' | 'es') */
export let currentLang = localStorage.getItem('hp_lang') || 'de';

/** Callback, der nach jeder Sprachumschaltung aufgerufen wird (gesetzt von app.js) */
let _onLangChange = null;

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Gibt den übersetzten String für einen Schlüssel zurück.
 * Falls der Wert eine Funktion ist (Template-String), wird sie mit den übergebenen
 * Argumenten aufgerufen. Fallback: Deutsch → Schlüssel selbst.
 *
 * @param {string}    key  - Übersetzungsschlüssel
 * @param {...*}      args - Argumente für Template-Funktionen
 * @returns {string}
 */
export function t(key, ...args) {
  const val = translations[currentLang]?.[key] ?? translations.de[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/**
 * Schaltet die App-Sprache um und aktualisiert alle statischen Texte im DOM.
 *
 * @param {'de'|'es'} lang
 */
export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('hp_lang', lang);
  document.documentElement.lang = lang;
  document.title = t('appTitle').replace(/^\S+\s/, ''); // Emoji entfernen für Tab-Titel
  applyTranslations();
  _onLangChange?.();
}

/**
 * Registriert einen Callback, der nach jeder Sprachumschaltung aufgerufen wird.
 * Typischer Anwendungsfall: dynamischen Inhalt neu rendern.
 *
 * @param {() => void} fn
 */
export function setLangChangeCallback(fn) {
  _onLangChange = fn;
}

/**
 * Aktualisiert alle DOM-Elemente mit `data-i18n`-Attributen.
 * Muss nach dem ersten DOM-Ready-Event und nach jeder Sprachumschaltung aufgerufen werden.
 */
export function applyTranslations() {
  // Texte
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  // Platzhalter
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if (val) el.placeholder = val;
  });
  // title-Attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.title = val;
  });
}

/**
 * Gibt die BCP-47-Locale der aktuellen Sprache zurück (für Datums- und Zahlenformatierung).
 *
 * @returns {'de-DE'|'es-ES'}
 */
export function getUiLocale() {
  return currentLang === 'es' ? 'es-ES' : 'de-DE';
}
