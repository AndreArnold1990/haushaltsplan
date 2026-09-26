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
    navDashboard:          '🏠 Dashboard',
    navTransactions:       '💳 Haushaltsbuch',
    navSettings:           'Einstellungen',
    drawerToolsLabel:      'Werkzeuge',
    drawerSettingsLabel:   'Einstellungen',
    screenBackTitle:       'Zurück',
    stocksGotoSettingsHint: 'Finnhub-Key in den Einstellungen konfigurieren.',
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
    labelEndDate:          'Enddatum (optional)',
    labelInterval:         'Wiederholung',
    intervalMonthly:       'Monatlich',
    intervalQuarterly:     'Vierteljährlich',
    intervalBiannual:      'Halbjährlich',
    btnAddRecurring:       '↻ Hinzufügen',
    recurringEmpty:        'Keine aktiven Regeln.',
    recurringFrom:         'ab',
    recurringUntil:        'bis',
    toastEndBeforeStart:   'Das Enddatum darf nicht vor dem Startdatum liegen.',
    editTxRecurringHint:   '↻ Diese Transaktion stammt aus einer wiederkehrenden Regel. Änderungen bitte unter Einstellungen → Wiederkehrend vornehmen.',
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

    // Google Drive Backup
    sectionDriveBackup:         '☁️ Google Drive Backup',
    driveNotConfigured:         'Kein Backup-Ordner konfiguriert.',
    driveLastBackupLabel:       'Letztes Backup:',
    driveNoBackupYet:           'Noch kein Backup erstellt.',
    btnDriveSetup:              '☁️ Backup einrichten',
    btnDriveBackup:             '☁️ Jetzt sichern',
    btnDriveRestore:            '↩ Wiederherstellen',
    drivePickerFileTitle:       'Backup-Datei auswählen',
    toastDriveSetupDone:        'Drive-Ordner „backups" eingerichtet ✓',
    toastDriveBackupDone:       'Backup in Google Drive gespeichert ✓',
    toastDriveRestoreDone:      'Daten erfolgreich wiederhergestellt ✓',
    toastDriveError:            'Google Drive Fehler – bitte erneut versuchen.',
    toastDriveInvalidFile:      'Ungültige Backup-Datei.',
    driveNoBackups:             'Keine Backups vorhanden.',
    confirmDriveRestore:        'Wirklich alle aktuellen Daten mit diesem Backup überschreiben?\n\nDiese Aktion kann nicht rückgängig gemacht werden.',
    toastBackupReminder:        '☁️ Wöchentliches Backup fällig – tippe auf Einstellungen.',

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

    // Aktien
    stocksTab:                    '📈 Aktien',
    stocksApiKeySummary:          '🔑 Finnhub API-Key',
    stocksApiKeyPlaceholder:      'API-Key eingeben',
    stocksApiKeyHint:             'Kostenlosen Key auf finnhub.io erstellen (Free-Tier: 60 Calls/Minute).',
    stocksToastKeySaved:          'API-Key gespeichert ✓',
    stocksAddPlaceholder:         'Ticker oder ISIN',
    stocksResolving:              id => `${id} wird gesucht…`,
    stocksErrResolve:             id => `${id} konnte nicht aufgelöst werden.`,
    stocksAdd:                    '+ Hinzufügen',
    stocksEmpty:                  'Noch keine Aktien auf der Watchlist.',
    stocksNeedKey:                'Zuerst Finnhub API-Key in den Einstellungen eintragen, dann Ticker hinzufügen.',
    stocksLoading:                'Lade Daten…',
    stocksErrNoKey:               'Bitte zuerst einen FMP API-Key speichern.',
    stocksErrTicker:              'Ungültiger Ticker.',
    stocksErrLoad:                ticker => `Daten für ${ticker} konnten nicht geladen werden.`,
    stocksErrAuth:                'Key ungültig oder nicht freigeschaltet (401/403)',
    stocksErrPlan:                'Endpoint nicht im Free-Tier enthalten (402)',
    stocksErrLimit:               'Tageslimit erreicht (429)',
    stocksErrNotFound:            'Ticker nicht gefunden (404)',
    stocksErrNet:                 'Netzwerkfehler – bitte erneut versuchen',
    stocksToastExists:            'Ticker ist bereits auf der Watchlist.',
    stocksToastRemoved:           'Aktie entfernt.',
    stocksRefreshTooltip:         'Daten aktualisieren',
    stocksRefreshAll:             '↻ Alle aktualisieren',
    stocksDelTooltip:             'Von Watchlist entfernen',
    stocksUpdatedAt:              when => `Stand: ${when}`,
    stocksColTicker:              'Ticker',
    stocksColTotal:               'Gesamtscore',
    stocksColValuation:           'Bewertung',
    stocksColValuationShort:      'Bew.',
    stocksColProfitability:       'Rentabilität',
    stocksColProfitabilityShort:  'Rent.',
    stocksColStability:           'Stabilität',
    stocksColStabilityShort:      'Stab.',
    stocksColGrowth:              'Wachstum',
    stocksColGrowthShort:         'Wach.',
    kpiPe:                        'KGV (P/E)',
    kpiPb:                        'KBV (P/B)',
    kpiEvEbitda:                  'EV/EBITDA',
    kpiFcfYield:                  'FCF-Rendite',
    kpiPeg:                       'PEG-Ratio',
    kpiRoe:                       'ROE',
    kpiRoic:                      'ROIC',
    kpiOpMargin:                  'Operative Marge',
    kpiNetMargin:                 'Nettomarge',
    kpiDebtEquity:                'Debt/Equity',
    kpiInterestCov:               'Zinsdeckungsgrad',
    kpiCurrentRatio:              'Current Ratio',
    kpiRevGrowth:                 'Umsatzwachstum (Ø 5J)',
    kpiEpsGrowth:                 'EPS-Wachstum (Ø 5J)',
    kpiFcfGrowth:                 'FCF-Wachstum (Ø 5J)',
    stocksInfoTitle:              'ℹ️ So werden die Scores berechnet',
    stocksInfoIntro:              'Jede Kennzahl wird linear auf 0–100 Punkte skaliert. Der Kategorie-Score ist der Durchschnitt der verfügbaren Kennzahlen, der Gesamtscore Σ die gewichtete Summe der Kategorien. Grün ≥ 67 · Rot < 34.',
    stocksInfoWeight:             w => `Gewichtung ${w} %`,
    kpiScaleRange:                (best, worst) => `100 Punkte bei ${best} · 0 Punkte bei ${worst}`,
    kpiScaleIdeal:                '100 Punkte im Idealbereich ca. 1,5–3; zu niedrig und zu hoch geben Abzug',
    kpiInfo_pe:                   'Aktienkurs ÷ Gewinn je Aktie (letzte 12 Monate). Wie viele Jahresgewinne kostet die Aktie?',
    kpiInfo_pb:                   'Aktienkurs ÷ Buchwert je Aktie. Klassische Graham-Kennzahl.',
    kpiInfo_evEbitda:             'Unternehmenswert (inkl. Schulden) ÷ EBITDA. Bewertung unabhängig von der Kapitalstruktur.',
    kpiInfo_fcfYield:             'Freier Cashflow ÷ Marktkapitalisierung. Wie viel echten Cash wirft der Kaufpreis ab?',
    kpiInfo_peg:                  'KGV ÷ EPS-Wachstumsrate in % (Ø 5J, selbst berechnet). Lynch: unter 1 = günstig fürs Wachstum.',
    kpiInfo_roe:                  'Nettogewinn ÷ Eigenkapital. Buffetts Lieblingsmaß für Kapitalrendite.',
    kpiInfo_roic:                 'Gewinn ÷ gesamtes investiertes Kapital. Aussagekräftiger als ROE, da Schulden einbezogen werden.',
    kpiInfo_opMargin:             'Operatives Ergebnis ÷ Umsatz. Preissetzungsmacht im Kerngeschäft.',
    kpiInfo_netMargin:            'Nettogewinn ÷ Umsatz. Was vom Umsatz unterm Strich bleibt.',
    kpiInfo_debtEquity:           'Verbindlichkeiten ÷ Eigenkapital. Je niedriger, desto krisenfester.',
    kpiInfo_interestCov:          'EBIT ÷ Zinsaufwand. Wie oft kann der Gewinn die Zinsen zahlen?',
    kpiInfo_currentRatio:         'Umlaufvermögen ÷ kurzfristige Verbindlichkeiten. Liquiditätspuffer.',
    kpiInfo_revGrowth:            'Durchschnittliches jährliches Umsatzwachstum der letzten 5 Jahre.',
    kpiInfo_epsGrowth:            'Durchschnittliches jährliches Wachstum des Gewinns je Aktie (5 Jahre).',
    kpiInfo_fcfGrowth:            'Durchschnittliches jährliches Wachstum des freien Cashflows (5 Jahre).',
    kpiExample_pe:                'Beispiel: Firma A hat ein KGV von 12, Firma B liegt bei 30 – gleiche Branche. B befindet sich aber in einer Wachstumsphase und investiert stark, weshalb ihr hohes KGV gerechtfertigt sein könnte. Das KGV allein reicht also nicht zur Bewertung aus.',
    kpiExample_pb:                'Beispiel: Eine Bank mit KBV 0,8 wird unter ihrem Eigenkapital gehandelt – das kann ein Schnäppchen sein, oder der Markt erwartet faule Kredite. Bei Software-Firmen mit wenig Sachanlagen ist ein hohes KBV dagegen normal, weil der Wert in Patenten/Marken steckt, die nicht in der Bilanz stehen.',
    kpiExample_evEbitda:          'Beispiel: Firma A (wenig Schulden) und Firma B (viele Schulden) haben dasselbe KGV. Beim EV/EBITDA zeigt sich, dass B eigentlich teurer ist, weil ihr Unternehmenswert auch die Schuldenlast trägt.',
    kpiExample_fcfYield:          'Beispiel: Eine Aktie mit 6 % FCF-Rendite wirft mehr echten Cash ab als eine Anleihe mit 4 % Zins – ein Hinweis auf attraktive Bewertung. Ein Unternehmen mitten in einer teuren Wachstumsphase hat aber oft eine niedrige FCF-Rendite, obwohl das Geschäft gesund ist.',
    kpiExample_peg:               'Beispiel: Firma A hat ein KGV von 25 bei 25 % Gewinnwachstum (PEG = 1, fair). Firma B hat ein niedrigeres KGV von 15, wächst aber nur 5 % (PEG = 3, eigentlich teuer). Das niedrigere KGV allein macht B nicht automatisch günstiger.',
    kpiExample_roe:               'Beispiel: Zwei Firmen erwirtschaften beide 15 % ROE. Firma A mit wenig Fremdkapital, Firma B mit hohen Schulden, die den ROE künstlich aufblähen. Gleicher ROE, unterschiedliches Risiko – deshalb lohnt sich ein Blick auf Debt/Equity dazu.',
    kpiExample_roic:              'Beispiel: Ein Einzelhändler und eine Software-Firma haben beide 20 % ROE. Der Einzelhändler braucht dafür viel Fremdkapital für Läger und Filialen, die Software-Firma kaum Kapital. ROIC bezieht das gesamte Kapital ein und zeigt, wer wirklich effizienter wirtschaftet.',
    kpiExample_opMargin:          'Beispiel: Ein Discounter mit 4 % operativer Marge und ein Softwareunternehmen mit 30 % sind nicht direkt vergleichbar – niedrige Margen sind im Lebensmitteleinzelhandel normal. Aussagekräftiger ist der Vergleich mit Wettbewerbern derselben Branche.',
    kpiExample_netMargin:         'Beispiel: Ein einmaliger Immobilienverkauf kann die Nettomarge eines Quartals stark nach oben verzerren, ohne dass sich am eigentlichen Geschäft etwas verbessert hat. Der Trend über mehrere Jahre ist aussagekräftiger als ein einzelner Wert.',
    kpiExample_debtEquity:        'Beispiel: Ein Versorger mit Debt/Equity von 1,5 ist meist unproblematisch, weil die Einnahmen planbar sind (Strom wird immer bezahlt). Ein Start-up mit demselben Wert wäre ein Warnsignal, weil seine Einnahmen viel unsicherer sind.',
    kpiExample_interestCov:       'Beispiel: Ein Zinsdeckungsgrad von 2 reicht gerade so, aber ohne Puffer bei sinkendem Gewinn. Ein Wert von 10 bedeutet: selbst ein deutlicher Gewinnrückgang würde die Zinszahlungen nicht gefährden.',
    kpiExample_currentRatio:      'Beispiel: Ein Wert von 0,8 kann bedeuten, dass eine Firma kurzfristig knapp bei Kasse ist. Ein sehr hoher Wert von 8 ist aber auch kein reines Qualitätsmerkmal – das Geld könnte ungenutzt herumliegen statt investiert zu werden.',
    kpiExample_revGrowth:         'Beispiel: Ein Ölkonzern mit 40 % Umsatzwachstum in einem Jahr verdankt das oft einem hohen Ölpreis, nicht einer besseren Geschäftsentwicklung. Bei zyklischen Branchen zählt der Durchschnitt mehrerer Jahre mehr als ein einzelnes starkes Jahr.',
    kpiExample_epsGrowth:         'Beispiel: Ein Unternehmen kann sein EPS-Wachstum durch Aktienrückkäufe aufpolieren, ohne dass der Gewinn insgesamt gestiegen ist (weniger Aktien teilen sich denselben Gewinn). Ein Blick aufs Umsatzwachstum zeigt, ob es auch operativ trägt.',
    kpiExample_fcfGrowth:         'Beispiel: Ein Unternehmen kann sein EPS steigern, während der freie Cashflow stagniert – etwa weil Investitionen aufgeschoben oder Forderungen später bezahlt werden. Wachsen Gewinn und FCF nicht gemeinsam, lohnt sich ein genauerer Blick.',

    // Rezepte
    recipesTab:              '🍳 Rezepte',
    recipeDailyBadge:        'Empfehlung des Tages',
    recipeNewDaily:          '🎲 Neues Tagesgericht',
    recipeAllTag:            'Alle',
    recipeMinutes:           'Min',
    recipeServings:          'Portionen',
    recipeIngredientsTitle:  'Zutaten',
    recipeStepsTitle:        'Zubereitung',
    recipeBack:              '← Zurück',
    recipeEmpty:             'Keine Rezepte gefunden.',
    recipeLoadError:         'Rezepte konnten nicht geladen werden.',

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

    navDashboard:          '🏠 Panel',
    navTransactions:       '💳 Cuentas del hogar',
    navSettings:           'Ajustes',
    drawerToolsLabel:      'Herramientas',
    drawerSettingsLabel:   'Ajustes',
    screenBackTitle:       'Atrás',
    stocksGotoSettingsHint: 'Configura la clave de Finnhub en los ajustes.',
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
    labelEndDate:          'Fecha de fin (opcional)',
    labelInterval:         'Frecuencia',
    intervalMonthly:       'Mensual',
    intervalQuarterly:     'Trimestral',
    intervalBiannual:      'Semestral',
    btnAddRecurring:       '↻ Añadir',
    recurringEmpty:        'No hay reglas activas.',
    recurringFrom:         'desde',
    recurringUntil:        'hasta',
    toastEndBeforeStart:   'La fecha de fin no puede ser anterior a la fecha de inicio.',
    editTxRecurringHint:   '↻ Esta transacción proviene de una regla recurrente. Realiza los cambios en Ajustes → Recurrente.',
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

    // Google Drive Backup
    sectionDriveBackup:         '☁️ Copia de seguridad en Google Drive',
    driveNotConfigured:         'No hay carpeta de copia configurada.',
    driveLastBackupLabel:       'Última copia:',
    driveNoBackupYet:           'Aún no se ha creado ninguna copia.',
    btnDriveSetup:              '☁️ Configurar copia',
    btnDriveBackup:             '☁️ Guardar ahora',
    btnDriveRestore:            '↩ Restaurar',
    drivePickerFileTitle:       'Seleccionar archivo de copia',
    toastDriveSetupDone:        'Carpeta «backups» de Drive configurada ✓',
    toastDriveBackupDone:       'Copia guardada en Google Drive ✓',
    toastDriveRestoreDone:      'Datos restaurados correctamente ✓',
    toastDriveError:            'Error de Google Drive – inténtalo de nuevo.',
    toastDriveInvalidFile:      'Archivo de copia inválido.',
    driveNoBackups:             'No hay copias todavía.',
    confirmDriveRestore:        '¿Sobrescribir todos los datos actuales con esta copia?\n\nEsta acción no se puede deshacer.',
    toastBackupReminder:        '☁️ Copia semanal pendiente – toca Ajustes.',

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

    // Acciones
    stocksTab:                    '📈 Acciones',
    stocksApiKeySummary:          '🔑 Clave API de Finnhub',
    stocksApiKeyPlaceholder:      'Introducir clave API',
    stocksApiKeyHint:             'Crea una clave gratuita en finnhub.io (plan gratis: 60 llamadas/minuto).',
    stocksToastKeySaved:          'Clave API guardada ✓',
    stocksAddPlaceholder:         'Ticker o ISIN',
    stocksResolving:              id => `Buscando ${id}…`,
    stocksErrResolve:             id => `No se pudo resolver ${id}.`,
    stocksAdd:                    '+ Añadir',
    stocksEmpty:                  'Aún no hay acciones en la lista.',
    stocksNeedKey:                'Primero introduce la clave API de Finnhub en los ajustes y luego añade tickers.',
    stocksLoading:                'Cargando datos…',
    stocksErrNoKey:               'Guarda primero una clave API de FMP.',
    stocksErrTicker:              'Ticker no válido.',
    stocksErrLoad:                ticker => `No se pudieron cargar los datos de ${ticker}.`,
    stocksErrAuth:                'Clave no válida o sin permisos (401/403)',
    stocksErrPlan:                'Endpoint no incluido en el plan gratis (402)',
    stocksErrLimit:               'Límite diario alcanzado (429)',
    stocksErrNotFound:            'Ticker no encontrado (404)',
    stocksErrNet:                 'Error de red – inténtalo de nuevo',
    stocksToastExists:            'El ticker ya está en la lista.',
    stocksToastRemoved:           'Acción eliminada.',
    stocksRefreshTooltip:         'Actualizar datos',
    stocksRefreshAll:             '↻ Actualizar todo',
    stocksDelTooltip:             'Quitar de la lista',
    stocksUpdatedAt:              when => `Actualizado: ${when}`,
    stocksColTicker:              'Ticker',
    stocksColTotal:               'Puntuación total',
    stocksColValuation:           'Valoración',
    stocksColValuationShort:      'Val.',
    stocksColProfitability:       'Rentabilidad',
    stocksColProfitabilityShort:  'Rent.',
    stocksColStability:           'Estabilidad',
    stocksColStabilityShort:      'Est.',
    stocksColGrowth:              'Crecimiento',
    stocksColGrowthShort:         'Crec.',
    kpiPe:                        'PER (P/E)',
    kpiPb:                        'P/VC (P/B)',
    kpiEvEbitda:                  'EV/EBITDA',
    kpiFcfYield:                  'Rendimiento FCF',
    kpiPeg:                       'Ratio PEG',
    kpiRoe:                       'ROE',
    kpiRoic:                      'ROIC',
    kpiOpMargin:                  'Margen operativo',
    kpiNetMargin:                 'Margen neto',
    kpiDebtEquity:                'Deuda/Capital',
    kpiInterestCov:               'Cobertura de intereses',
    kpiCurrentRatio:              'Ratio corriente',
    kpiRevGrowth:                 'Crec. de ingresos (Ø 5A)',
    kpiEpsGrowth:                 'Crec. de BPA (Ø 5A)',
    kpiFcfGrowth:                 'Crec. de FCF (Ø 5A)',
    stocksInfoTitle:              'ℹ️ Así se calculan las puntuaciones',
    stocksInfoIntro:              'Cada indicador se escala linealmente a 0–100 puntos. La puntuación de categoría es la media de los indicadores disponibles; la total Σ, la suma ponderada de las categorías. Verde ≥ 67 · Rojo < 34.',
    stocksInfoWeight:             w => `Ponderación ${w} %`,
    kpiScaleRange:                (best, worst) => `100 puntos con ${best} · 0 puntos con ${worst}`,
    kpiScaleIdeal:                '100 puntos en el rango ideal aprox. 1,5–3; demasiado bajo o alto resta puntos',
    kpiInfo_pe:                   'Precio ÷ beneficio por acción (últimos 12 meses). ¿Cuántos beneficios anuales cuesta la acción?',
    kpiInfo_pb:                   'Precio ÷ valor contable por acción. Indicador clásico de Graham.',
    kpiInfo_evEbitda:             'Valor de empresa (incl. deuda) ÷ EBITDA. Valoración independiente de la estructura de capital.',
    kpiInfo_fcfYield:             'Flujo de caja libre ÷ capitalización bursátil. ¿Cuánto efectivo real genera el precio pagado?',
    kpiInfo_peg:                  'PER ÷ crecimiento del BPA en % (Ø 5A, calculado). Lynch: menos de 1 = barato para su crecimiento.',
    kpiInfo_roe:                  'Beneficio neto ÷ patrimonio. La medida favorita de Buffett para la rentabilidad del capital.',
    kpiInfo_roic:                 'Beneficio ÷ capital total invertido. Más significativo que el ROE porque incluye la deuda.',
    kpiInfo_opMargin:             'Resultado operativo ÷ ingresos. Poder de fijación de precios del negocio principal.',
    kpiInfo_netMargin:            'Beneficio neto ÷ ingresos. Lo que queda al final.',
    kpiInfo_debtEquity:           'Pasivos ÷ patrimonio. Cuanto más bajo, más resistente a crisis.',
    kpiInfo_interestCov:          'EBIT ÷ gastos por intereses. ¿Cuántas veces cubre el beneficio los intereses?',
    kpiInfo_currentRatio:         'Activo corriente ÷ pasivo corriente. Colchón de liquidez.',
    kpiInfo_revGrowth:            'Crecimiento anual medio de los ingresos en los últimos 5 años.',
    kpiInfo_epsGrowth:            'Crecimiento anual medio del beneficio por acción (5 años).',
    kpiInfo_fcfGrowth:            'Crecimiento anual medio del flujo de caja libre (5 años).',
    kpiExample_pe:                'Ejemplo: la Empresa A tiene un PER de 12, la Empresa B de 30 — mismo sector. B está en fase de crecimiento e invierte fuertemente, lo que podría justificar su PER más alto. El PER por sí solo no basta para valorar una acción.',
    kpiExample_pb:                'Ejemplo: un banco con P/VC de 0,8 cotiza por debajo de su patrimonio — puede ser una ganga, o el mercado espera préstamos fallidos. En empresas de software con pocos activos físicos, un P/VC alto es normal porque el valor está en patentes/marcas que no figuran en el balance.',
    kpiExample_evEbitda:          'Ejemplo: la Empresa A (poca deuda) y la Empresa B (mucha deuda) tienen el mismo PER. El EV/EBITDA revela que B es en realidad más cara, porque su valor de empresa también carga con la deuda.',
    kpiExample_fcfYield:          'Ejemplo: una acción con un 6 % de rendimiento FCF genera más efectivo real que un bono al 4 % — señal de valoración atractiva. Una empresa en plena fase de inversión suele tener un rendimiento FCF bajo aunque el negocio sea saludable.',
    kpiExample_peg:               'Ejemplo: la Empresa A tiene un PER de 25 con un 25 % de crecimiento (PEG = 1, justo). La Empresa B tiene un PER más bajo de 15, pero solo crece un 5 % (PEG = 3, en realidad cara). Un PER más bajo no hace automáticamente más barata a B.',
    kpiExample_roe:               'Ejemplo: dos empresas generan ambas un 15 % de ROE. La Empresa A con poca deuda, la Empresa B con mucha deuda que infla artificialmente el ROE. Mismo ROE, riesgo distinto — por eso conviene mirar también el Deuda/Capital.',
    kpiExample_roic:              'Ejemplo: un minorista y una empresa de software tienen ambos un 20 % de ROE. El minorista necesita mucho capital para tiendas y almacenes, la de software casi ninguno. El ROIC incluye todo el capital empleado y muestra quién opera de forma más eficiente.',
    kpiExample_opMargin:          'Ejemplo: un supermercado de descuento con un 4 % de margen operativo y una empresa de software con un 30 % no son directamente comparables — los márgenes bajos son normales en alimentación. Es más útil comparar con competidores del mismo sector.',
    kpiExample_netMargin:         'Ejemplo: la venta puntual de un inmueble puede inflar el margen neto de un trimestre sin que el negocio haya mejorado. La tendencia de varios años dice más que un solo dato.',
    kpiExample_debtEquity:        'Ejemplo: una eléctrica con Deuda/Capital de 1,5 suele ser normal porque sus ingresos son predecibles (la luz siempre se paga). Una startup con el mismo valor sería una señal de alarma, porque sus ingresos son mucho más inciertos.',
    kpiExample_interestCov:       'Ejemplo: una cobertura de intereses de 2 alcanza por los pelos, sin margen si el beneficio cae. Un valor de 10 significa que incluso una caída notable del beneficio no pondría en riesgo el pago de intereses.',
    kpiExample_currentRatio:      'Ejemplo: un valor de 0,8 puede indicar que una empresa anda justa de liquidez. Pero un valor muy alto de 8 tampoco es positivo — el dinero podría estar parado en la cuenta en vez de invertido.',
    kpiExample_revGrowth:         'Ejemplo: una petrolera con un 40 % de crecimiento de ingresos en un año suele deberlo a un precio del petróleo alto, no a una mejora del negocio. En sectores cíclicos, la media de varios años cuenta más que un año excepcional.',
    kpiExample_epsGrowth:         'Ejemplo: una empresa puede maquillar el crecimiento de su BPA con recompras de acciones, sin que el beneficio total haya aumentado. Comparar con el crecimiento de ingresos revela si el crecimiento también es operativo.',
    kpiExample_fcfGrowth:         'Ejemplo: una empresa puede aumentar su BPA mientras el flujo de caja libre se estanca, por ejemplo si posterga inversiones. Si beneficio y FCF no crecen juntos, conviene mirar más de cerca.',

    // Recetas
    recipesTab:              '🍳 Recetas',
    recipeDailyBadge:        'Recomendación del día',
    recipeNewDaily:          '🎲 Nuevo plato del día',
    recipeAllTag:            'Todas',
    recipeMinutes:           'min',
    recipeServings:          'raciones',
    recipeIngredientsTitle:  'Ingredientes',
    recipeStepsTitle:        'Preparación',
    recipeBack:              '← Atrás',
    recipeEmpty:             'No se encontraron recetas.',
    recipeLoadError:         'No se pudieron cargar las recetas.',

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
