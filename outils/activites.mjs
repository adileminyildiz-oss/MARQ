/**
 * Mar'q — Liste des activités réglementées : une seule source.
 *
 * La liste (familles, motifs de reconnaissance, pièces exigées) est tenue
 * dans index.html (bloc « var FAMILLES=[ … ]; »). Les pages publiques
 * autonomes (diagnostic.html, infos.html) en portent une copie, car elles
 * doivent fonctionner seules, sans le logiciel.
 *
 *   node outils/activites.mjs          → recopie la liste d'index.html dans les pages publiques
 *   node outils/activites.mjs --verif  → vérifie seulement (code de sortie 1 si une copie diverge)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = 'index.html';
export const COPIES = ['diagnostic.html', 'infos.html'];

/* Bloc « var FAMILLES=[ … ]; » : début, fin (exclue) et texte. */
export function bloc(texte) {
  const debut = texte.indexOf('var FAMILLES=[');
  if (debut < 0) return null;
  let prof = 0;
  for (let k = debut + 'var FAMILLES='.length; k < texte.length; k++) {
    const c = texte[k];
    if (c === '[') prof++;
    else if (c === ']' && --prof === 0) {
      const fin = texte[k + 1] === ';' ? k + 2 : k + 1;
      return { debut, fin, texte: texte.slice(debut, fin) };
    }
  }
  return null;
}

export function etat() {
  const src = bloc(fs.readFileSync(path.join(RACINE, SOURCE), 'utf8'));
  if (!src) throw new Error('liste des activités introuvable dans ' + SOURCE);
  return COPIES.map(f => {
    const t = fs.readFileSync(path.join(RACINE, f), 'utf8'), b = bloc(t);
    return { fichier: f, texte: t, b, identique: !!b && b.texte === src.texte, src };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verif = process.argv.includes('--verif');
  let ecart = 0;
  for (const e of etat()) {
    if (!e.b) { console.log('  ÉCHEC : liste absente de ' + e.fichier); ecart++; continue; }
    if (e.identique) { console.log('  ok  ' + e.fichier + ' : identique à ' + SOURCE); continue; }
    if (verif) { console.log('  ÉCHEC : ' + e.fichier + ' diverge de ' + SOURCE + ' — lancer « node outils/activites.mjs »'); ecart++; continue; }
    fs.writeFileSync(path.join(RACINE, e.fichier), e.texte.slice(0, e.b.debut) + e.src.texte + e.texte.slice(e.b.fin));
    console.log('  recopiée dans ' + e.fichier);
  }
  process.exit(ecart ? 1 : 0);
}
