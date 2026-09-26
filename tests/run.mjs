/**
 * @file run.mjs
 * Node-Test-Runner für die CI (kein Build-System, keine neue Abhängigkeit).
 *
 * js/store.js braucht außer `localStorage` keine Browser-API – ein winziger
 * In-Memory-Shim reicht deshalb aus, um die Tests direkt mit `node` statt in
 * einem echten Browser laufen zu lassen. Für Module mit echtem DOM-Bedarf
 * (Dashboard, Transaktionen, Rezepte, …) reicht dieser Ansatz nicht; dafür
 * bräuchte es einen Headless-Browser (Playwright) als eigenen, größeren Schritt.
 *
 * Aufruf: node tests/run.mjs
 * Exit-Code 0 = alle Tests bestanden, 1 = mindestens ein Fehlschlag.
 */

// ── localStorage-Shim ─────────────────────────────────────────────────────────
class MemoryStorage {
  #data = new Map();
  getItem(key)    { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, v) { this.#data.set(key, String(v)); }
  removeItem(key) { this.#data.delete(key); }
  clear()         { this.#data.clear(); }
}
globalThis.localStorage = new MemoryStorage();

// ── Mini-Test-Framework (gleiche API wie runner.html, Ausgabe auf der Konsole) ─
let _passed = 0, _failed = 0;
const _failures = [];

/**
 * Führt die Tests einer Suite nacheinander aus, bevor die nächste Suite
 * beginnt – sonst würden alle Ergebnisse (async, aber ohne echte I/O-
 * Wartezeit) erst nach dem letzten Suite-Titel in der Konsole auftauchen.
 */
async function suite(title, fn) {
  console.log(`\n${title}`);
  let chain = Promise.resolve();
  fn((name, testFn) => {
    chain = chain.then(() => runTest(title, name, testFn));
  });
  await chain;
}

async function runTest(suiteTitle, name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    _failed++;
    _failures.push(`${suiteTitle} › ${name}: ${e.message}`);
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'Assertion fehlgeschlagen');
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg ?? `Erwartet: ${JSON.stringify(b)}\nErhalten: ${JSON.stringify(a)}`);
}

// ── Tests importieren und ausführen ────────────────────────────────────────────
const { runStoreTests } = await import('./store.test.js');
await runStoreTests(suite, assert, assertEqual);

// ── Zusammenfassung ────────────────────────────────────────────────────────────
const total = _passed + _failed;
console.log(`\n${_passed} / ${total} Tests bestanden${_failed ? ` – ${_failed} fehlgeschlagen` : ' ✓'}`);
if (_failed) {
  console.log('\nFehlgeschlagen:');
  _failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
