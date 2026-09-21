/**
 * Mar'q — Le serveur portail en marche locale (v715).
 * Prouve qu'il n'écoute que ce poste, et qu'une seule commande l'installe.
 *   node tests/serveurlocal.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const require0 = createRequire(import.meta.url);
const RACINE = path.resolve('server/portal');
let ok = 0, ko = 0;
const A = (c, m, d) => { if (c) { ok++; console.log('  ✓ ' + m); } else { ko++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };

/* 1. l'interface d'écoute par défaut ne sort pas de la machine */
const { config } = require0(path.join(RACINE, 'lib/config.js'));
A(config.HOST === '127.0.0.1', 'par défaut le serveur n’écoute que ce poste (127.0.0.1)', JSON.stringify(config.HOST));

const { serveur } = require0(path.join(RACINE, 'server.js'));
const adresse = await new Promise((res) => {
  serveur.listen(0, config.HOST, () => { const a = serveur.address(); serveur.close(() => res(a)); });
});
A(adresse.address === '127.0.0.1', 'la socket est réellement liée à la boucle locale', JSON.stringify(adresse));

/* 2. une seule commande installe et démarre */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marq-local-'));
fs.cpSync(RACINE, tmp, { recursive: true });
fs.rmSync(path.join(tmp, '.env'), { force: true });
fs.rmSync(path.join(tmp, 'data'), { recursive: true, force: true });

const sortie = execFileSync(process.execPath, ['-e', `
  process.env.PORT='8971';
  const fs=require('fs'),path=require('path');
  const s=fs.readFileSync(path.join(${JSON.stringify(tmp)},'scripts/local.js'),'utf8')
    .replace("require(path.join(RACINE, 'server.js')).demarrer();","");
  const m=new module.constructor();
  m._compile(s, path.join(${JSON.stringify(tmp)},'scripts/local.js'));
`], { encoding: 'utf8' });

A(/Adresse à coller dans Mar'q : http:\/\/localhost:8971/.test(sortie),
  'le lancement affiche l’adresse à coller dans Mar’q', sortie.split('\n').slice(0, 3).join(' / '));
const jeton = (/Jeton du cabinet\s+: ([0-9a-f]{24,})/.exec(sortie) || [])[1] || '';
A(jeton.length >= 32, 'il affiche un jeton de cabinet tiré au hasard', jeton.slice(0, 12) + '…');

const env = fs.readFileSync(path.join(tmp, '.env'), 'utf8');
A(/^HOST=127\.0\.0\.1$/m.test(env), 'le fichier de configuration verrouille l’écoute sur ce poste');
A(env.indexOf('CABINET_TOKEN=' + jeton) >= 0, 'le jeton affiché est bien celui du fichier');
A(/^JWT_SECRET=[0-9a-f]{64}$/m.test(env), 'le secret de session est tiré au hasard lui aussi');
A((fs.statSync(path.join(tmp, '.env')).mode & 0o077) === 0, 'le fichier de secrets n’est lisible que par son propriétaire');

/* 3. relancer ne change pas le jeton : les sessions survivent */
const sortie2 = execFileSync(process.execPath, ['-e', `
  process.env.PORT='8971';
  const fs=require('fs'),path=require('path');
  const s=fs.readFileSync(path.join(${JSON.stringify(tmp)},'scripts/local.js'),'utf8')
    .replace("require(path.join(RACINE, 'server.js')).demarrer();","");
  const m=new module.constructor();
  m._compile(s, path.join(${JSON.stringify(tmp)},'scripts/local.js'));
`], { encoding: 'utf8' });
A(/Configuration existante réutilisée/.test(sortie2), 'un second lancement réutilise la configuration');
A(sortie2.indexOf(jeton) >= 0, 'le jeton ne change pas d’un lancement à l’autre');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nServeur local : ${ok}/${ok + ko} ` + (ko ? '— ÉCHEC' : '— tout vert'));
process.exit(ko ? 1 : 0);
