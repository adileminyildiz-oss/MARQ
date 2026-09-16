/**
 * Socle des suites d'interface.
 *
 * Les suites de tests/ui/ ont été écrites contre un poste de travail où
 * Playwright et le fichier vivaient à un emplacement fixe. Ce socle rend les
 * deux portables, pour qu'elles tournent aussi bien en local qu'en intégration
 * continue :
 *   - Playwright est cherché là où npm l'installe, puis aux emplacements connus,
 *     et enfin à l'endroit indiqué par PLAYWRIGHT_PKG ;
 *   - index.html est résolu depuis la racine du dépôt, ou depuis MARQ_HTML.
 */
const path = require('path');
const { pathToFileURL } = require('url');

function chargerChromium() {
  const pistes = [process.env.PLAYWRIGHT_PKG, 'playwright',
    '/opt/node22/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright'].filter(Boolean);
  const vus = [];
  for (const p of pistes) {
    try { const m = require(p); if (m && m.chromium) return m.chromium; } catch (e) { vus.push(p); }
  }
  throw new Error('Playwright introuvable. Essayé : ' + vus.join(', ') +
    ' — installez-le (npm i -D playwright) ou indiquez PLAYWRIGHT_PKG.');
}

function urlApp() {
  if (process.env.MARQ_HTML) {
    const p = process.env.MARQ_HTML;
    return /^file:/.test(p) ? p : pathToFileURL(path.resolve(p)).href;
  }
  return pathToFileURL(path.resolve(__dirname, '..', '..', 'index.html')).href;
}

module.exports = { chromium: chargerChromium(), URL_APP: urlApp() };
