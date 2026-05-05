/**
 * @module config
 * App-Konfiguration. Alle Werte sind direkt hier eingetragen —
 * kein Laden aus einer externen Datei nötig.
 *
 * firebaseConfig ist by Design öffentlich (Google dokumentiert das explizit).
 * Die Sicherheit kommt ausschließlich von den Firestore Security Rules.
 */

/** @type {{ firebaseConfig: object, householdId: string, locale: string, currency: string, historyMonths: number, syncDebounceMs: number, sharedPersonCount: number }} */
export const config = {
  firebaseConfig: {
    apiKey:            'AIzaSyAOv6I5WnjvYkDswg67X9ZoKa6Ue8Y-a2Y',
    authDomain:        'haushaltsplan-16082.firebaseapp.com',
    projectId:         'haushaltsplan-16082',
    storageBucket:     'haushaltsplan-16082.firebasestorage.app',
    messagingSenderId: '803394068548',
    appId:             '1:803394068548:web:8dd7b43ec17de7a31c9c11',
  },

  householdId:       'haushaltsplan-16082',

  locale:            'de-DE',
  currency:          'EUR',
  historyMonths:     6,
  syncDebounceMs:    1500,
  sharedPersonCount: 2,
};
