'use strict';
/*
 * local.js — Démarrage local du portail, en une commande.
 *
 * Le serveur n'a qu'un poste à servir et une personne à qui répondre. Ce
 * script rend ce cas d'usage immédiat : au premier lancement il fabrique le
 * fichier .env avec des secrets tirés au hasard, puis il affiche l'adresse et
 * le jeton du cabinet à recopier dans Mar'q. Les lancements suivants
 * réutilisent le même .env — le jeton ne change pas, les sessions survivent.
 *
 *   npm run local
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE = path.join(__dirname, '..');
const ENV = path.join(RACINE, '.env');
const PORT = process.env.PORT || '8787';

function secret(n) { return crypto.randomBytes(n).toString('hex'); }

function creerEnv() {
  const cabinet = secret(24);
  const jwt = secret(32);
  const contenu = [
    '# Portail Mar\'q — configuration locale, engendrée le ' + new Date().toISOString().slice(0, 10) + '.',
    '# Ce fichier ne quitte pas la machine : il n\'est pas suivi par git.',
    '',
    '# Le serveur n\'écoute que ce poste. Mettre 0.0.0.0 pour l\'ouvrir au réseau.',
    'HOST=127.0.0.1',
    'PORT=' + PORT,
    '',
    '# Jeton du cabinet : à recopier dans Mar\'q (Services › Coffre-fort & portail).',
    'CABINET_TOKEN=' + cabinet,
    '',
    '# Signature des sessions clientes. Le changer déconnecte tout le monde.',
    'JWT_SECRET=' + jwt,
    '',
    '# Origine autorisée à appeler le serveur depuis un navigateur.',
    'ALLOWED_ORIGIN=http://localhost:' + PORT + ',https://marq.aemconseil.eu',
    ''
  ].join('\n');
  fs.writeFileSync(ENV, contenu, { mode: 0o600 });
  return cabinet;
}

function lireJeton() {
  try {
    const m = /^CABINET_TOKEN=(.*)$/m.exec(fs.readFileSync(ENV, 'utf8'));
    return m ? m[1].trim() : '';
  } catch (e) { return ''; }
}

const neuf = !fs.existsSync(ENV);
const jeton = neuf ? creerEnv() : lireJeton();

console.log('');
console.log('  Portail Mar\'q — installation locale');
console.log('  ' + '-'.repeat(52));
if (neuf) {
  console.log('  Configuration créée : ' + ENV);
  console.log('  Secrets tirés au hasard, lisibles par vous seul.');
} else {
  console.log('  Configuration existante réutilisée : ' + ENV);
}
console.log('');
console.log('  Adresse à coller dans Mar\'q : http://localhost:' + PORT);
console.log('  Jeton du cabinet             : ' + (jeton || '(absent du .env — ajoutez CABINET_TOKEN)'));
console.log('');
console.log('  Dans Mar\'q : Services › Coffre-fort & portail › Serveur du portail.');
console.log('  ' + '-'.repeat(52));
console.log('');

require(path.join(RACINE, 'server.js')).demarrer();
