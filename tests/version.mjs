/**
 * Cohérence de version, avant de lancer quoi que ce soit d'autre.
 *
 *   node tests/version.mjs
 *
 * Deux invariants, et seulement deux :
 *
 *  1. Le badge affiché dans index.html et version.json doivent concorder.
 *     La mise à jour automatique compare l'un à l'autre : s'ils divergent,
 *     les postes ne voient jamais la nouvelle version, ou la rechargent en
 *     boucle.
 *
 *  2. Le service worker ne doit intercepter aucune requête. C'est un
 *     kill-switch : il vide les caches, se désinscrit, et laisse le réseau
 *     faire. Son numéro interne est figé et n'a pas à suivre les versions —
 *     il n'a aucun cache à invalider. En revanche, un worker « cache-first »
 *     réintroduit ici servirait de vieilles versions aux postes, sans que
 *     personne ne s'en aperçoive.
 */
import fs from 'fs';

const ver = (fs.readFileSync('index.html', 'utf8').match(/var LAST_VER=(\d+)/) || [])[1];
const vj = String(JSON.parse(fs.readFileSync('version.json', 'utf8')).version);
const sw = fs.readFileSync('sw.js', 'utf8');
const intercepte = /addEventListener\s*\(\s*['"]fetch['"]/.test(sw);

console.log(`badge=${ver} · version.json=${vj} · le service worker intercepte : ${intercepte ? 'oui' : 'non'}`);

const soucis = [];
if (!ver) soucis.push("le badge de version est introuvable dans index.html (var LAST_VER=…)");
else if (ver !== vj) soucis.push(`le badge (${ver}) et version.json (${vj}) divergent`);
if (intercepte) soucis.push("sw.js intercepte les requêtes : risque de version périmée servie aux postes");

if (soucis.length) { soucis.forEach(s => console.log('  ÉCHEC : ' + s)); process.exit(1); }
console.log('Cohérence de version : tout vert');
