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
 *  2. Le service worker (hors connexion, v763) doit rester « réseau
 *     d'abord » pour les fichiers du site : le cache ne sert que si le
 *     réseau échoue, et version.json / sw.js ne sont jamais mis en cache.
 *     Un worker « cache-first » réintroduit ici servirait de vieilles
 *     versions aux postes, sans que personne ne s'en aperçoive.
 *     Le comportement réel est vérifié par tests/ui/horsligne.cjs.
 */
import fs from 'fs';

const ver = (fs.readFileSync('index.html', 'utf8').match(/var LAST_VER=(\d+)/) || [])[1];
const vj = String(JSON.parse(fs.readFileSync('version.json', 'utf8')).version);
const sw = fs.readFileSync('sw.js', 'utf8');
const intercepte = /addEventListener\s*\(\s*['"]fetch['"]/.test(sw);
const reseauDabord = /respondWith\(\s*reseauDabord\(/.test(sw)
  && /demande\.then\([\s\S]*?\.catch\(function\(\)\{\s*return secours\(/.test(sw);
const versionHorsCache = /version\\\.json\|sw\\\.js\)\$\/\.test\(url\.pathname\)\)\s*return;/.test(sw);

console.log(`badge=${ver} · version.json=${vj} · service worker : ${!intercepte ? 'sans interception' : (reseauDabord && versionHorsCache ? 'réseau d\'abord' : 'NON CONFORME')}`);

const soucis = [];
if (!ver) soucis.push("le badge de version est introuvable dans index.html (var LAST_VER=…)");
else if (ver !== vj) soucis.push(`le badge (${ver}) et version.json (${vj}) divergent`);
if (intercepte && !reseauDabord) soucis.push("sw.js n'est plus « réseau d'abord » pour les fichiers du site : risque de version périmée servie aux postes");
if (intercepte && !versionHorsCache) soucis.push("sw.js ne laisse plus version.json et sw.js au réseau : la détection des mises à jour serait faussée");

if (soucis.length) { soucis.forEach(s => console.log('  ÉCHEC : ' + s)); process.exit(1); }
console.log('Cohérence de version : tout vert');
