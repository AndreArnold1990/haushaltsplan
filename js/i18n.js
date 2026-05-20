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
    appTitle:              '💸 Casaflow',
    langToggleTitle:       'Auf Español wechseln',

    // Navigation
    navDashboard:          'Dashboard',
    navTransactions:       'Transaktionen',
    navSettings:           'Einstellungen',
    subTabCategories:      'Kategorien',
    subTabRecurring:       'Wiederkehrend',
    subTabSystem:          'Systemeinstellungen',

    // Dashboard – Kacheln
    labelIncome:           'Einnahmen (Monat)',
    labelExpense:          'Ausgaben (Monat)',
    labelBalance:          'Saldo (Monat)',

    // Dashboard – Charts
    chartCategoryTitle:    '🌞 Ausgaben nach Kategorie',
    chartCategoryEmpty:    'Keine Ausgaben diesen Monat',
    chartHistoryTitle:     '📈 Verlauf letzte Monate',
    datasetIncome:         'Einnahmen',
    datasetExpense:        'Ausgaben',

    // Transaktionen – Formular
    modalEditTxTitle:      '✎ Transaktion bearbeiten',
    toastTxUpdated:        'Transaktion aktualisiert ✓',
    sectionNewTx:          '+ Neue Transaktion',
    labelDate:             'Datum',
    labelAmount:           'Betrag (€)',
    labelCategory:         'Kategorie',
    labelDescription:      'Beschreibung',
    descPlaceholder:       'z.B. Gehalt April',
    btnAddTx:              '✓ Transaktion hinzufügen',

    // Transaktionen – Liste
    btnDelete:             '🗑 Löschen',
    emptyTx:               'Keine Transaktionen für diesen Monat.',

    // Optgroup-Labels im Kategorie-Dropdown
    groupIncome:           '↑ Einnahmen',
    groupExpense:          '↓ Ausgaben',

    // Wiederkehrende Ausgaben
    sectionRecurring:      '↻ Neue wiederkehrende Ausgabe',
    sectionRecurringList:  'Aktive Regeln',
    labelStartDate:        'Startdatum',
    labelInterval:         'Wiederholung',
    intervalMonthly:       'Monatlich',
    intervalQuarterly:     'Vierteljährlich',
    intervalBiannual:      'Halbjährlich',
    btnAddRecurring:       '↻ Hinzufügen',
    recurringEmpty:        'Keine aktiven Regeln.',
    recurringFrom:         'ab',
    toastRecurringAdded:   'Wiederkehrende Ausgabe hinzugefügt ✓',
    toastRecurringUpdated: 'Wiederkehrende Ausgabe aktualisiert ✓',
    toastRecurringDeleted: 'Wiederkehrende Ausgabe gelöscht.',
    confirmDeleteRecurring:'Regel und alle generierten Transaktionen löschen?',
    modalEditRecurringTitle: '✎ Wiederkehrende Ausgabe bearbeiten',

    // Systemeinstellungen
    sectionSystem:              '⚙ Systemeinstellungen',
    resetTxLabel:               'Alles zurücksetzen',
    resetTxDesc:                'Löscht alle Transaktionen und wiederkehrenden Regeln. Kategorien bleiben erhalten.',
    btnResetTx:                 '🗑 Zurücksetzen',
    confirmResetTx:             'Wirklich alle Transaktionen und wiederkehrenden Regeln löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.',
    toastTxReset:               'Alle Transaktionen und Regeln gelöscht.',
    labelTranslationApiKey:     'MyMemory API-Schlüssel (optional)',
    translationApiKeyDesc:      'Für automatische Kategorie-Übersetzungen. Ohne Schlüssel ist die Nutzung auf ~1000 Wörter/Tag begrenzt.',
    apiKeyPlaceholder:          'API-Schlüssel eingeben…',
    btnSaveApiKey:              '✓ Speichern',
    toastApiKeySaved:           'API-Schlüssel gespeichert ✓',
    toastTranslateError:        'Übersetzung fehlgeschlagen.',

    // Kategorien – Formular
    sectionNewCat:         '+ Neue Kategorie',
    labelName:             'Name',
    labelNameDe:           'Name (Deutsch)',
    labelNameEs:           'Name (Español)',
    catNameDePlaceholder:  'z.B. Urlaub',
    catNameEsPlaceholder:  'p.ej. Vacaciones',
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

    // Kategorie bearbeiten
    btnEdit:               '✏ Bearbeiten',
    modalEditTitle:        '✏ Kategorie bearbeiten',
    btnSave:               '✓ Speichern',
    toastCatUpdated:       name => `Kategorie "${name}" aktualisiert ✓`,

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
    toastSignedOut:        'Abgemeldet. Deine Daten bleiben in der Cloud erhalten.',

    // Template-Strings (Funktionen)
    signInHintTitle:       'Bitte mit Google anmelden',
    signInHintSub:         'Deine Daten werden aus der Cloud geladen.',
    toastEnterName:        'Bitte einen Namen eingeben.',
    toastNameExists:       'Name bereits vorhanden.',
    toastCatAdded:         name  => `Kategorie "${name}" hinzugefügt \u2713`,
    confirmDeleteTx:       ()    => 'Transaktion wirklich löschen?',
    confirmDeleteCat:      name  => `Kategorie "${name}" löschen?`,
    modalDesc:             (name, n) => `Die Kategorie "${name}" wird von ${n} Transaktion(en) verwendet. Was soll damit passieren?`,
    fileNotFoundMsg:       'Kein Haushalt in der Datenbank gefunden.\nNeuen Haushalt erstellen?',
    ownExpenses:           '💰 Eigene Ausgaben',
    sharedExpenses:        '🤝 Gemeinsame Ausgaben',
    labelSharedExpense:    'Ausgaben (Monat)',
    sharedPerPerson:       n => `÷ ${n} Personen = je `,
    toastNotYourTx:        'Nur eigene Transaktionen können gelöscht werden.',
    sectionTxList:         'Meine Transaktionen',

    // Geteilte Transaktionen
    labelSplitType:        'Wie wird gezahlt?',
    splitPersonal:         'Du hast bezahlt, deine Ausgaben',
    splitEqualMe:          'Du hast bezahlt, gleichmäßig aufteilen',
    splitFullMe:           'Du bekommst den gesamten Betrag',
    splitEqualOther:       name => `${name} hat bezahlt, gleichmäßig aufteilen`,
    splitFullOther:        name => `${name} bekommt den gesamten Betrag`,
    partnerFallback:       'Partner',
    sectionSharedTxList:   '🤝 Gemeinsame Transaktionen',
    emptySharedTx:         'Keine gemeinsamen Transaktionen für diesen Monat.',
    thPaidBy:              'Bezahlt von',
    splitLabelTotal:       'gesamt',
    splitLabelEach:        'p.P.',
    splitLabelFull:        'voller Betrag',

    // Geheimmenü / Tools
    secretToolsTitle:      '🔧 Tools',
    secretCurrencyTab:     '💲 Währung',
    currencyMxnLabel:      'Mexikanische Pesos (MXN)',
    currencyEurLabel:      'Euro (EUR)',
    currencyRateLoading:   'Kurs wird geladen…',
    currencyRateError:     'Kurs konnte nicht geladen werden.',
    currencyRateInfo:      (rate, date) => `1 € = ${rate} MXN  ·  ${date}`,

    // OCR Test
    ocrTab:              '📷 OCR Test',
    ocrStatusReady:      'Bereit – Foto aufnehmen',
    ocrStatusLoading:    'OCR-Engine wird geladen…',
    ocrStatusProcessing: 'Text wird erkannt…',
    ocrStatusDone:       'Erkennung abgeschlossen ✓',
    ocrStatusError:      'Fehler – bitte erneut versuchen',
    ocrCaptureBtn:       'Foto aufnehmen',
    ocrSectionResult:    'Ergebnis',
    ocrResultAmount:     'Betrag',
    ocrResultDate:       'Datum',
    ocrAllAmounts:       'Alle Beträge',
    ocrRawLabel:         'Rohtext anzeigen',
    ocrToastNotReady:    'OCR-Engine noch nicht bereit.',

    // Katzen füttern
    catFeedTab:          '🐱 Katzen füttern',
    catFeedTodayLabel:   date => `Heute · ${date}`,
    catFeedAvgTitle:     '⌀ Durchschnitt',
    catFeedSave:         '✓ Eintragen',
    catFeedEmpty:        'Noch keine Einträge. 🐾',
    catFeedToastSaved:   'Eintrag gespeichert ✓',
    catFeedToastDeleted: 'Eintrag gelöscht.',
    catFeedErrPeach:     'Bitte Gramm für Peach eingeben.',
    catFeedErrJuna:      'Bitte Gramm für Juna eingeben.',
    catFeedColDate:      'Datum',
    catFeedColTotal:     'Gesamt',
    catFeedDelTooltip:   'Eintrag löschen',

    // Ausgleich / Balance
    btnSettle:             'Ausgleichen',
    modalSettleTitle:      '💸 Ausgleich erfassen',
    btnConfirmSettle:      '✓ Ausgleich bestätigen',
    toastSettlementSaved:  'Ausgleich gespeichert ✓',
    balanceOwesMe:         (name, amt) => `${name} schuldet dir ${amt}`,
    balanceIOwe:           amt => `Du schuldest ${amt}`,
    balanceSettled:        '✓ Alles ausgeglichen',
  },

  es: {
    appTitle:              '💸 Casaflow',
    langToggleTitle:       'Cambiar a Deutsch',

    navDashboard:          'Panel',
    navTransactions:       'Transacciones',
    navSettings:           'Ajustes',
    subTabCategories:      'Categorías',
    subTabRecurring:       'Recurrente',
    subTabSystem:          'Ajustes del sistema',

    labelIncome:           'Ingresos (Mes)',
    labelExpense:          'Gastos (Mes)',
    labelBalance:          'Saldo (Mes)',

    chartCategoryTitle:    '🌞 Gastos por categoría',
    chartCategoryEmpty:    'Sin gastos este mes',
    chartHistoryTitle:     '📈 Historial últimos meses',
    datasetIncome:         'Ingresos',
    datasetExpense:        'Gastos',

    modalEditTxTitle:      '✎ Editar transacción',
    toastTxUpdated:        'Transacción actualizada ✓',
    sectionNewTx:          '+ Nueva transacción',
    labelDate:             'Fecha',
    labelAmount:           'Importe (€)',
    labelCategory:         'Categoría',
    labelDescription:      'Descripción',
    descPlaceholder:       'p.ej. Sueldo abril',
    btnAddTx:              '✓ Añadir transacción',

    btnDelete:             '🗑 Eliminar',
    emptyTx:               'No hay transacciones este mes.',

    groupIncome:           '↑ Ingresos',
    groupExpense:          '↓ Gastos',

    sectionRecurring:      '↻ Nuevo gasto recurrente',
    sectionRecurringList:  'Reglas activas',
    labelStartDate:        'Fecha de inicio',
    labelInterval:         'Frecuencia',
    intervalMonthly:       'Mensual',
    intervalQuarterly:     'Trimestral',
    intervalBiannual:      'Semestral',
    btnAddRecurring:       '↻ Añadir',
    recurringEmpty:        'No hay reglas activas.',
    recurringFrom:         'desde',
    toastRecurringAdded:   'Gasto recurrente añadido ✓',
    toastRecurringUpdated: 'Gasto recurrente actualizado ✓',
    toastRecurringDeleted: 'Gasto recurrente eliminado.',
    confirmDeleteRecurring:'¿Eliminar regla y todas las transacciones generadas?',
    modalEditRecurringTitle: '✎ Editar gasto recurrente',

    // Ajustes del sistema
    sectionSystem:              '⚙ Ajustes del sistema',
    resetTxLabel:               'Restablecer todo',
    resetTxDesc:                'Elimina todas las transacciones y reglas recurrentes. Las categorías se conservan.',
    btnResetTx:                 '🗑 Restablecer',
    confirmResetTx:             '¿Eliminar realmente todas las transacciones y reglas recurrentes?\n\nEsta acción no se puede deshacer.',
    toastTxReset:               'Todas las transacciones y reglas eliminadas.',
    labelTranslationApiKey:     'Clave API MyMemory (opcional)',
    translationApiKeyDesc:      'Para traducción automática de categorías. Sin clave, el uso está limitado a ~1000 palabras/día.',
    apiKeyPlaceholder:          'Introduce la clave API…',
    btnSaveApiKey:              '✓ Guardar',
    toastApiKeySaved:           'Clave API guardada ✓',
    toastTranslateError:        'Error al traducir.',

    sectionNewCat:         '+ Nueva categoría',
    labelName:             'Nombre',
    labelNameDe:           'Nombre (Deutsch)',
    labelNameEs:           'Nombre (Español)',
    catNameDePlaceholder:  'p.ej. Urlaub',
    catNameEsPlaceholder:  'p.ej. Vacaciones',
    labelType:             'Tipo',
    labelColor:            'Color',
    namePlaceholder:       'p.ej. Vacaciones',
    typeIncome:            '↑ Ingreso',
    typeExpense:           '↓ Gasto',
    btnAddCat:             '✓ Añadir categoría',

    sectionIncomeCats:     '↑ Categorías de ingresos',
    sectionExpenseCats:    '↓ Categorías de gastos',
    emptyCats:             'No hay categorías.',

    // Editar categoría
    btnEdit:               '✏ Editar',
    modalEditTitle:        '✏ Editar categoría',
    btnSave:               '✓ Guardar',
    toastCatUpdated:       name => `Categoría "${name}" actualizada ✓`,

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
    toastSignedOut:        'Sesión cerrada. Tus datos permanecen en la nube.',

    signInHintTitle:       'Inicia sesión con Google',
    signInHintSub:         'Tus datos se cargarán desde la nube.',
    toastEnterName:        'Por favor introduce un nombre.',
    toastNameExists:       'El nombre ya existe.',
    toastCatAdded:         name  => `Categoría "${name}" añadida \u2713`,
    confirmDeleteTx:       ()    => '¿Eliminar la transacción?',
    confirmDeleteCat:      name  => `¿Eliminar la categoría "${name}"?`,
    modalDesc:             (name, n) => `La categoría "${name}" es usada por ${n} transacción/es. ¿Qué deseas hacer?`,
    fileNotFoundMsg:       'No se encontró el hogar en la base de datos.\n¿Crear un nuevo hogar?',
    ownExpenses:           '💰 Mis gastos',
    sharedExpenses:        '🤝 Gastos compartidos',
    labelSharedExpense:    'Gastos (Mes)',
    sharedPerPerson:       n => `÷ ${n} personas = `,
    toastNotYourTx:        'Solo puedes eliminar tus propias transacciones.',
    sectionTxList:         'Mis transacciones',

    // Transacciones compartidas
    labelSplitType:        '¿Cómo se paga?',
    splitPersonal:         'Tú pagas, solo para ti',
    splitEqualMe:          'Tú pagas, a partes iguales',
    splitFullMe:           'Recibes el importe completo',
    splitEqualOther:       name => `${name} paga, a partes iguales`,
    splitFullOther:        name => `${name} recibe el importe completo`,
    partnerFallback:       'Pareja',
    sectionSharedTxList:   '🤝 Gastos compartidos',
    emptySharedTx:         'No hay gastos compartidos este mes.',
    thPaidBy:              'Pagado por',
    splitLabelTotal:       'total',
    splitLabelEach:        'p.p.',
    splitLabelFull:        'importe completo',

    // Menú secreto / Herramientas
    secretToolsTitle:      '🔧 Herramientas',
    secretCurrencyTab:     '💲 Moneda',
    currencyMxnLabel:      'Pesos mexicanos (MXN)',
    currencyEurLabel:      'Euro (EUR)',
    currencyRateLoading:   'Cargando tipo de cambio…',
    currencyRateError:     'No se pudo cargar el tipo de cambio.',
    currencyRateInfo:      (rate, date) => `1 € = ${rate} MXN  ·  ${date}`,

    // OCR Test
    ocrTab:              '📷 OCR Test',
    ocrStatusReady:      'Listo – toma una foto',
    ocrStatusLoading:    'Cargando motor OCR…',
    ocrStatusProcessing: 'Reconociendo texto…',
    ocrStatusDone:       'Reconocimiento completado ✓',
    ocrStatusError:      'Error – inténtalo de nuevo',
    ocrCaptureBtn:       'Tomar foto',
    ocrSectionResult:    'Resultado',
    ocrResultAmount:     'Importe',
    ocrResultDate:       'Fecha',
    ocrAllAmounts:       'Todos los importes',
    ocrRawLabel:         'Ver texto sin procesar',
    ocrToastNotReady:    'Motor OCR aún no listo.',

    // Alimentar gatos
    catFeedTab:          '🐱 Alimentar gatos',
    catFeedTodayLabel:   date => `Hoy · ${date}`,
    catFeedAvgTitle:     '⌀ Promedio',
    catFeedSave:         '✓ Registrar',
    catFeedEmpty:        'Sin registros todavía. 🐾',
    catFeedToastSaved:   'Registro guardado ✓',
    catFeedToastDeleted: 'Registro eliminado.',
    catFeedErrPeach:     'Introduce los gramos de Peach.',
    catFeedErrJuna:      'Introduce los gramos de Juna.',
    catFeedColDate:      'Fecha',
    catFeedColTotal:     'Total',
    catFeedDelTooltip:   'Eliminar registro',

    // Liquidación / Balance
    btnSettle:             'Liquidar',
    modalSettleTitle:      '💸 Registrar liquidación',
    btnConfirmSettle:      '✓ Confirmar liquidación',
    toastSettlementSaved:  'Liquidación guardada ✓',
    balanceOwesMe:         (name, amt) => `${name} te debe ${amt}`,
    balanceIOwe:           amt => `Debes ${amt}`,
    balanceSettled:        '✓ Todo saldado',
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
  // Texte – nur setzen wenn der Key wirklich existiert (kein Key-Namen als Fallback)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const raw = translations[currentLang]?.[key] ?? translations.de?.[key];
    if (raw === undefined) return; // Key unbekannt → hardcodierten HTML-Text behalten
    const val = typeof raw === 'function' ? raw() : raw;
    if (val) el.textContent = val;
  });
  // Platzhalter
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const raw = translations[currentLang]?.[key] ?? translations.de?.[key];
    if (raw === undefined) return;
    const val = typeof raw === 'function' ? raw() : raw;
    if (val) el.placeholder = val;
  });
  // title-Attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const raw = translations[currentLang]?.[key] ?? translations.de?.[key];
    if (raw === undefined) return;
    const val = typeof raw === 'function' ? raw() : raw;
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
