/**
 * Lance toutes les suites d'interface de tests/ui/.
 *
 *   node tests/ui/lancer.mjs            toutes les suites
 *   node tests/ui/lancer.mjs kebabt etqt   quelques-unes
 *
 * Les suites sont lancées par vagues : plus d'une dizaine de Chromium à la fois
 * se gênent et font apparaître des échecs de minutage qui n'en sont pas.
 */
import { readdirSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LARGEUR = Number(process.env.MARQ_TESTS_PAR_VAGUE || 8);

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

const resultats = [];
for (let i = 0; i < suites.length; i += LARGEUR) {
  const vague = suites.slice(i, i + LARGEUR);
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
