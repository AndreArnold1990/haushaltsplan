/**
 * Generiert data/rezepte/index.json aus den vorhandenen Rezept-Ordnern.
 *
 * Jeder Unterordner von data/rezepte/ mit einer gültigen rezept.json wird
 * aufgenommen. Ungültige JSON-Dateien brechen den Build ab, damit fehlerhafte
 * Rezepte nicht unbemerkt aus der App verschwinden.
 *
 * Aufruf: node scripts/build-recipe-index.mjs
 * Läuft in der CI vor jedem Deploy – die index.json muss nie manuell
 * gepflegt werden.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root      = join(dirname(fileURLToPath(import.meta.url)), '..');
const recipeDir = join(root, 'data', 'rezepte');

const ids = [];
for (const entry of readdirSync(recipeDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(recipeDir, entry.name, 'rezept.json');
  if (!existsSync(file)) {
    console.warn(`⚠ ${entry.name}: keine rezept.json – übersprungen`);
    continue;
  }
  try {
    const recipe = JSON.parse(readFileSync(file, 'utf8'));
    // steps: Array (einsprachig) oder Objekt mit Arrays pro Sprache ({ de, es })
    const stepsOk = Array.isArray(recipe.steps)
      || (recipe.steps && typeof recipe.steps === 'object'
          && Object.values(recipe.steps).length > 0
          && Object.values(recipe.steps).every(Array.isArray));
    if (!recipe.title || !Array.isArray(recipe.ingredients) || !stepsOk) {
      throw new Error('title, ingredients oder steps fehlen/ungültig');
    }
    ids.push(entry.name);
  } catch (e) {
    console.error(`✗ ${entry.name}/rezept.json ungültig: ${e.message}`);
    process.exit(1);
  }
}

ids.sort();
writeFileSync(join(recipeDir, 'index.json'), JSON.stringify(ids, null, 2) + '\n');
console.log(`✓ index.json: ${ids.length} Rezept(e) – ${ids.join(', ')}`);
