/*
 * verifier-deploiement.mjs — Contrôle qu'un portail DÉPLOYÉ fonctionne vraiment.
 *
 * Un déploiement qui « réussit » ne prouve rien : le service peut répondre
 * /health et refuser malgré tout chaque appel du cabinet parce que l'origine
 * autorisée ne correspond pas au site, ou parce que le secret cabinet n'a pas
 * été posé. Ce script exerce la chaîne réelle, depuis l'extérieur.
 *
 * Usage :
 *   CABINET_TOKEN=... node scripts/verifier-deploiement.mjs https://mon-portail --origine https://marq.aemconseil.eu
 *
 * Sort 0 si tout passe, 1 sinon. Aucune dépendance.
 */
const args = process.argv.slice(2);
const url = (args.find(a => /^https?:\/\//.test(a)) || '').replace(/\/+$/, '');
const iOrig = args.indexOf('--origine');
const origine = (iOrig >= 0 ? args[iOrig + 1] : 'https://marq.aemconseil.eu').replace(/\/+$/, '');
const jeton = process.env.CABINET_TOKEN || '';

if (!url) {
  console.error("Usage : CABINET_TOKEN=... node scripts/verifier-deploiement.mjs <url> [--origine https://…]");
  process.exit(1);
}

let ko = 0;
const dit = (c, m, detail) => {
  if (c) console.log('  ✓ ' + m);
  else { console.error('  ✗ ' + m + (detail ? ' — ' + detail : '')); ko++; }
};

async function appel(chemin, opts) {
  const o = Object.assign({ headers: {} }, opts || {});
  try {
    const r = await fetch(url + chemin, o);
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch (e) {}
    return { status: r.status, texte: t, json: j, entetes: r.headers };
  } catch (e) {
    return { status: 0, texte: '', json: null, entetes: new Map(), err: e.message };
  }
}

console.log('Portail vérifié : ' + url);
console.log('Origine attendue : ' + origine + '\n');

/* 1. le service répond */
let r = await appel('/health');
dit(r.status === 200 && r.json && r.json.ok === true, 'le service répond sur /health',
  r.err || ('HTTP ' + r.status));
if (r.status === 0) { console.error('\nService injoignable — rien d’autre ne peut être vérifié.'); process.exit(1); }

/* 2. CORS : l'origine du site doit être acceptée TELLE QUELLE.
   C'est le piège le plus coûteux : le serveur démarre, /health est vert, et le
   navigateur refuse chaque appel parce que ALLOWED_ORIGIN nomme un autre
   domaine. Le serveur renvoie alors sa PREMIÈRE origine autorisée au lieu de
   celle demandée — ce que l'on détecte ici. */
r = await appel('/health', { method: 'GET', headers: { Origin: origine } });
const aco = r.entetes.get ? r.entetes.get('access-control-allow-origin') : null;
dit(aco === origine || aco === '*',
  'l’origine du site est autorisée (CORS)',
  'Access-Control-Allow-Origin = ' + JSON.stringify(aco) + ' au lieu de ' + JSON.stringify(origine)
  + ' → corrigez ALLOWED_ORIGIN sur le service');

/* 3. les routes d'administration sont fermées sans le secret */
r = await appel('/admin/backups');
dit(r.status === 401 || r.status === 503, 'les routes d’administration refusent sans secret cabinet', 'HTTP ' + r.status);
r = await appel('/admin/backups', { headers: { 'X-Cabinet-Token': 'mauvais-secret' } });
dit(r.status === 401 || r.status === 503, 'un mauvais secret cabinet est refusé', 'HTTP ' + r.status);

if (!jeton) {
  console.log('\n  … CABINET_TOKEN non fourni : le dépôt de sauvegarde n’est pas vérifié.');
  console.log(ko === 0 ? '\nContrôles effectués : OK ✓' : '\n' + ko + ' ÉCHEC(S) ✗');
  process.exit(ko === 0 ? 0 : 1);
}

/* 4. le dépôt de sauvegarde hors machine, de bout en bout */
const marque = 'MQS1.verif' + Date.now() + '.' + Buffer.from('bloc-de-verification').toString('base64');
r = await appel('/admin/backup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Cabinet-Token': jeton },
  body: JSON.stringify({ ts: Date.now(), ver: 0, chiffre: true, poste: 'verification', blob: marque })
});
dit(r.status === 200 && r.json && r.json.id, 'une sauvegarde peut être déposée', 'HTTP ' + r.status + ' ' + r.texte.slice(0, 120));
const id = r.json && r.json.id;

if (id) {
  r = await appel('/admin/backups', { headers: { 'X-Cabinet-Token': jeton } });
  const trouvee = r.json && r.json.sauvegardes && r.json.sauvegardes.some(s => s.id === id);
  dit(trouvee, 'la sauvegarde déposée est listée');

  r = await appel('/admin/backup?id=' + encodeURIComponent(id), { headers: { 'X-Cabinet-Token': jeton } });
  dit(r.json && r.json.blob === marque, 'elle est rendue à l’identique');

  r = await appel('/admin/backup-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Cabinet-Token': jeton },
    body: JSON.stringify({ id: id })
  });
  dit(r.status === 200, 'elle peut être supprimée — le contrôle ne laisse rien derrière lui');
}

/* 5. persistance : sans disque monté, tout disparaît au redéploiement */
r = await appel('/admin/backups', { headers: { 'X-Cabinet-Token': jeton } });
if (r.json && Array.isArray(r.json.sauvegardes)) {
  console.log('\n  … ' + r.json.sauvegardes.length + ' sauvegarde(s) conservée(s) sur le serveur.');
  if (r.json.sauvegardes.length === 0)
    console.log('  … Vérifiez qu’un disque persistant est monté sur DATA_DIR : sans lui, les');
  console.log('  … sauvegardes repartent à zéro à chaque redéploiement.');
}

console.log(ko === 0 ? '\nDéploiement vérifié : tout passe ✓' : '\n' + ko + ' ÉCHEC(S) ✗');
process.exit(ko === 0 ? 0 : 1);
