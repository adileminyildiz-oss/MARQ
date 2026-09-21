/**
 * Lance toutes les suites d'interface de tests/ui/.
 *
 *   node tests/ui/lancer.mjs            toutes les suites
 *   node tests/ui/lancer.mjs kebabt etqt   quelques-unes
 *
 * Les suites sont lancées par vagues : plus d'une dizaine de Chromium à la fois
 * se gênent et font apparaître des échecs de minutage qui n'en sont pas.
 *
 * Deux suites font exception. « sauvt » et « chiffret » montent un serveur,
 * dérivent des clés et écrivent dans IndexedDB : sous huit navigateurs
 * simultanés elles dépassent leurs propres délais et échouent au hasard, une
 * fois sur trois environ. Un filet qui ment de temps en temps ne protège
 * personne — et il a failli masquer un vrai défaut de confidentialité. Elles
 * passent donc en dernier, seules, pour une poignée de secondes de plus.
 */
import { readdirSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LARGEUR = Number(process.env.MARQ_TESTS_PAR_VAGUE || 8);

const LOURDES = new Set(['sauvt', 'chiffret']);

const demandees = process.argv.slice(2);
const suites = readdirSync(ICI)
  .filter(f => f.endsWith('.cjs') && !f.startsWith('_'))
  .map(f => f.replace(/\.cjs$/, ''))
  .filter(n => !demandees.length || demandees.includes(n))
  .sort();

if (!suites.length) { console.error('Aucune suite à lancer.'); process.exit(1); }

function lancer(nom) {
  return new Promise(res => {
    const p = spawn(process.execPath, [path.join(ICI, nom + '.cjs')], { env: process.env });
    let sortie = '';
    p.stdout.on('data', d => { sortie += d; });
    p.stderr.on('data', d => { sortie += d; });
    p.on('close', code => {
      const lignes = sortie.trim().split('\n');
      const bilan = lignes[lignes.length - 1] || '(aucune sortie)';
      res({ nom, code, bilan: bilan.slice(0, 120), sortie });
    });
  });
}

const legeres = suites.filter(n => !LOURDES.has(n));
const lourdes = suites.filter(n => LOURDES.has(n));
const vagues = [];
for (let i = 0; i < legeres.length; i += LARGEUR) vagues.push(legeres.slice(i, i + LARGEUR));
lourdes.forEach(n => vagues.push([n]));      // chacune seule, en fin de course

const resultats = [];
for (const vague of vagues) {
  const r = await Promise.all(vague.map(lancer));
  r.forEach(x => {
    console.log((x.code === 0 ? '  ok  ' : '  ÉCHEC ') + x.nom + ' : ' + x.bilan);
    if (x.code !== 0) console.log(x.sortie.split('\n').filter(l => /✗|KO/.test(l)).slice(0, 6).map(l => '        ' + l.trim()).join('\n'));
  });
  resultats.push(...r);
}

const ko = resultats.filter(x => x.code !== 0);
console.log('\nSuites d\'interface : ' + (resultats.length - ko.length) + '/' + resultats.length +
  (ko.length ? ' — ÉCHEC : ' + ko.map(x => x.nom).join(', ') : ' — tout vert'));
process.exit(ko.length ? 1 : 0);
