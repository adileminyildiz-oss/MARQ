'use strict';
/*
 * smoke.js — Test à blanc de bout en bout (aucune dépendance).
 * Démarre le serveur sur un port/dossier temporaires, puis :
 *   1) /admin/sync pousse un client + code + 1 document partagé + le fichier ;
 *   2) /portal/login valide le code et renvoie un jeton ;
 *   3) /portal/docs liste le document ;
 *   4) /portal/file/:id renvoie bien les octets ;
 *   5) contrôles négatifs : mauvais code, mauvais secret cabinet, fichier d'un autre client.
 * Sort en code 0 si tout passe, 1 sinon.
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 8799;
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'marq-portal-'));
process.env.PORT = String(PORT);
process.env.DATA_DIR = DIR;
process.env.CABINET_TOKEN = 'secret-cabinet-test';
process.env.JWT_SECRET = 'secret-jwt-test';
process.env.ALLOWED_ORIGIN = '*';

const { demarrer, serveur } = require('../server');

function req(method, chemin, body, headers) {
  return new Promise(function (resolve, reject) {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request({ host: '127.0.0.1', port: PORT, method: method, path: chemin,
      headers: Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': data.length } : {}, headers || {}) },
      function (res) {
        const chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          const buf = Buffer.concat(chunks);
          const ct = res.headers['content-type'] || '';
          resolve({ status: res.statusCode, buf: buf, json: ct.indexOf('json') >= 0 ? JSON.parse(buf.toString() || '{}') : null });
        });
      });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

let echecs = 0;
function assert(cond, msg) {
  if (cond) console.log('  ✓ ' + msg);
  else { console.error('  ✗ ' + msg); echecs++; }
}

(async function () {
  demarrer();
  await new Promise(function (r) { setTimeout(r, 300); });

  const contenu = Buffer.from('%PDF-1.4 contenu de test').toString('base64');

  // 1) sync (mauvais secret d'abord)
  let s = await req('POST', '/admin/sync', { clients: [] }, { 'X-Cabinet-Token': 'mauvais' });
  assert(s.status === 401, 'sync refusé avec un mauvais secret cabinet');

  // sync correct : 2 clients, 2 docs (dont un pour l'autre client)
  s = await req('POST', '/admin/sync', {
    cabinet: 'AEM CONSEIL',
    clients: [{ name: 'Dupont SARL', code: 'ABC123' }, { name: 'Autre SA', code: 'ZZZ999' }],
    docs: [
      { id: 'cf1', client: 'Dupont SARL', nom: 'Bilan 2024.pdf', cat: 'Bilans', date: '2025-04-01', type: 'application/pdf', size: 24, shared: true },
      { id: 'cf2', client: 'Autre SA', nom: 'Secret.pdf', cat: 'Divers', date: '2025-01-01', type: 'application/pdf', size: 10, shared: true },
      { id: 'cf3', client: 'Dupont SARL', nom: 'Non partagé.pdf', cat: 'Divers', shared: false }
    ],
    files: { cf1: { name: 'Bilan 2024.pdf', type: 'application/pdf', data: 'data:application/pdf;base64,' + contenu }, cf2: { data: contenu } }
  }, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(s.status === 200 && s.json.bilan.clients === 2, 'sync OK (2 clients)');
  assert(s.json.bilan.docs === 2, 'sync : seuls les 2 docs partagés sont conservés (le non-partagé ignoré)');

  // 2) login mauvais code
  let l = await req('POST', '/portal/login', { client: 'Dupont SARL', code: 'WRONG9' });
  assert(l.status === 401, 'login refusé avec un mauvais code');

  // login OK (code insensible à la casse via le front, ici en clair majuscules)
  l = await req('POST', '/portal/login', { client: 'dupont sarl', code: 'ABC123' });
  assert(l.status === 200 && l.json.token, 'login OK -> jeton renvoyé');
  assert(l.json.cabinet === 'AEM CONSEIL', 'login renvoie le nom du cabinet');
  const token = l.json.token;
  const auth = { Authorization: 'Bearer ' + token };

  // 3) docs sans jeton -> 401
  let d = await req('GET', '/portal/docs', null, {});
  assert(d.status === 401, 'docs refusé sans jeton');

  d = await req('GET', '/portal/docs', null, auth);
  assert(d.status === 200 && d.json.docs.length === 1 && d.json.docs[0].id === 'cf1', 'docs : le client ne voit QUE son document (cf1)');

  // 4) fichier autorisé
  let f = await req('GET', '/portal/file/cf1', null, auth);
  assert(f.status === 200 && f.buf.length > 0, 'file cf1 servi (octets renvoyés)');
  assert((f.buf.toString().indexOf('%PDF') === 0), 'file cf1 : contenu correct');

  // 5) fichier d'un AUTRE client -> 403
  f = await req('GET', '/portal/file/cf2', null, auth);
  assert(f.status === 403, 'file cf2 (autre client) refusé -> cloisonnement OK');

  /* 6) sauvegardes hors machine (v714) — le serveur conserve un bloc opaque */
  const NIR = '185067812345642';
  let b = await req('POST', '/admin/backup', { blob: 'peu importe' }, { 'X-Cabinet-Token': 'mauvais' });
  assert(b.status === 401, 'dépôt de sauvegarde refusé avec un mauvais secret cabinet');

  b = await req('POST', '/admin/backup', {}, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(b.status === 400, 'dépôt sans bloc refusé');

  /* une sauvegarde chiffrée côté cabinet : le serveur n'en voit qu'une enveloppe */
  const enveloppe = 'MQS1.aXZpdmlpdml2aXY=.Y2hpZmZyZW1lbnRvcGFxdWU=';
  b = await req('POST', '/admin/backup', { ts: Date.now(), ver: 714, chiffre: true, poste: 'poste-test', blob: enveloppe },
    { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(b.status === 200 && b.json.id, 'sauvegarde déposée -> identifiant renvoyé');
  const idSauv = b.json.id;

  let ls = await req('GET', '/admin/backups', null, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(ls.status === 200 && ls.json.sauvegardes.length === 1, 'la sauvegarde est listée');
  assert(ls.json.sauvegardes[0].chiffre === true && ls.json.sauvegardes[0].ver === 714
    && ls.json.sauvegardes[0].poste === 'poste-test', 'métadonnées conservées (chiffrée, version, poste)');
  assert(ls.json.sauvegardes[0].blob === undefined, "la liste ne renvoie pas le contenu, seulement les métadonnées");

  let g = await req('GET', '/admin/backup?id=' + encodeURIComponent(idSauv), null, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(g.status === 200 && g.json.blob === enveloppe, 'la sauvegarde est rendue à l\u2019identique');
  g = await req('GET', '/admin/backup?id=inconnue', null, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(g.status === 404, 'sauvegarde inconnue -> 404');

  /* le serveur ne peut pas lire : rien de sensible n'atterrit en clair sur son disque */
  b = await req('POST', '/admin/backup', { ts: Date.now(), chiffre: true, blob: 'MQS1.aXY=.' + Buffer.from('bloc-chiffre').toString('base64') },
    { 'X-Cabinet-Token': 'secret-cabinet-test' });
  const surDisque = fs.readdirSync(path.join(DIR, 'backups')).map(function (f) {
    return fs.readFileSync(path.join(DIR, 'backups', f), 'utf8'); }).join('\n');
  assert(surDisque.indexOf(NIR) < 0, 'aucun numéro de sécurité sociale lisible dans les fichiers du serveur');
  assert(surDisque.indexOf('MQS1.') === 0 || /MQS1\./.test(surDisque), 'les fichiers conservés sont des enveloppes');

  /* rotation : au-delà du plafond, les plus anciennes partent */
  process.env.BACKUPS_MAX = '30';
  ls = await req('GET', '/admin/backups', null, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(ls.json.sauvegardes.length === 2, 'deux sauvegardes conservées');
  assert(ls.json.sauvegardes[0].ts >= ls.json.sauvegardes[1].ts, 'la plus récente vient en premier');

  let sup = await req('POST', '/admin/backup-delete', { id: idSauv }, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(sup.status === 200, 'suppression d\u2019une sauvegarde');
  ls = await req('GET', '/admin/backups', null, { 'X-Cabinet-Token': 'secret-cabinet-test' });
  assert(ls.json.sauvegardes.length === 1 && ls.json.sauvegardes[0].id !== idSauv, 'la sauvegarde supprimée a disparu de l\u2019index');
  assert(!fs.existsSync(path.join(DIR, 'backups', idSauv + '.blob')), 'son fichier a disparu aussi — pas d\u2019orphelin');

  serveur.close();
  console.log(echecs === 0 ? '\nTOUS LES TESTS PASSENT ✓' : '\n' + echecs + ' ÉCHEC(S) ✗');
  process.exit(echecs === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
