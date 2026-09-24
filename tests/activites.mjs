/**
 * Mar'q — Activités réglementées : les pages publiques portent exactement la
 * liste du logiciel (source unique : index.html). Une copie qui diverge fait
 * échouer la suite ; « node outils/activites.mjs » les réaligne.
 */
import { etat, SOURCE } from '../outils/activites.mjs';
let ko = 0;
const E = etat(), n = (E[0].src.texte.match(/\{k:'/g) || []).length;
if (n < 5) { console.log('  ÉCHEC : liste source suspecte (' + n + ' familles)'); ko++; }
for (const e of E) {
  if (e.identique) console.log('  ok  ' + e.fichier + ' identique à ' + SOURCE);
  else { console.log('  ÉCHEC : ' + e.fichier + (e.b ? ' diverge de ' : ' ne contient pas la liste de ') + SOURCE + ' — lancer « node outils/activites.mjs »'); ko++; }
}
if (ko) process.exit(1);
console.log('Activités réglementées : ' + n + ' familles, ' + E.length + ' copies identiques à la source');
