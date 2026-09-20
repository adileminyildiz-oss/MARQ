/* v714 — La sauvegarde sort de la machine, et ce qui sort est illisible pour le serveur */
const { chromium, URL_APP } = require('./_socle.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 8802;
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'marq-sauv-'));
const JETON = 'secret-cabinet-sauvt';
const NIR = '185067812345642';
const PHRASE = 'phrase-de-coffre-sauvt';

process.on('unhandledRejection', e => { console.error('ÉCHEC — ' + (e && e.message ? e.message : e)); process.exit(1); });

const ko = [];
const dit = (c, m) => { if (!c) ko.push(m); };

/* le vrai serveur portail, sur un port et un dossier temporaires */
process.env.PORT = String(PORT);
process.env.DATA_DIR = DIR;
process.env.CABINET_TOKEN = JETON;
process.env.JWT_SECRET = 'secret-jwt-sauvt';
process.env.ALLOWED_ORIGIN = '*';
const { demarrer, serveur } = require(path.resolve(__dirname, '..', '..', 'server', 'portal', 'server.js'));

function fichiersServeur() {
  try {
    return fs.readdirSync(path.join(DIR, 'backups'))
      .map(f => fs.readFileSync(path.join(DIR, 'backups', f), 'utf8'));
  } catch (e) { return []; }
}

(async () => {
  demarrer();
  await new Promise(r => setTimeout(r, 300));

  const nav = await chromium.launch();
  const page = await nav.newPage();
  page.on('pageerror', e => { if (!/ServiceWorker/.test(e.message)) ko.push('pageerror : ' + e.message); });
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { window._authGranted && window._authGranted(); } catch (e) {} });
  await page.waitForFunction(
    () => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'), { timeout: 20000 });

  /* ---- 1. des données sensibles, et le serveur portail configuré ---- */
  await page.evaluate(([nir, url, jeton]) => {
    DB.dossiers = DB.dossiers || [];
    DB.dossiers.push({ id: 'do-sv', ref: 'DOS-SV', clientIds: [], serviceIds: [], statut: 'En cours',
      createdAt: '2026-01-01', historique: [],
      intake: { dirNom: 'MARTINSECRET', dirNir: nir } });
    save();
    localStorage.setItem('last-portal-srv', JSON.stringify({ url: url, token: jeton }));
  }, [NIR, 'http://127.0.0.1:' + PORT, JETON]);

  dit(await page.evaluate(() => !!(window.mqSauv && window.mqSauv.serveurPret())), 'serveur portail non reconnu comme configuré');

  /* ---- 2. rappel : rien n'est encore sorti de la machine ---- */
  const r0 = await page.evaluate(() => ({ jours: window.mqSauvJours(), rappels: window.mqSauvRappels() }));
  dit(r0.jours === -1, 'aucun versement attendu au départ, obtenu ' + r0.jours);
  dit(r0.rappels.some(x => /Aucune sauvegarde hors machine/.test(x.titre)),
    'la Prévoyance doit signaler qu’aucune sauvegarde n’est sortie de la machine');

  /* ---- 3. dépôt EN CLAIR (chiffrement inactif) : il part, et il est lisible ---- */
  const ok1 = await page.evaluate(() => window.mqSauvVerserServeur(true));
  dit(ok1 === true, 'dépôt sur le serveur refusé alors que tout est configuré');
  const clair = fichiersServeur();
  dit(clair.length === 1, 'un fichier attendu sur le serveur, obtenu ' + clair.length);
  dit(clair.join('').indexOf(NIR) >= 0,
    'sans chiffrement, le bloc déposé contient le NIR — c’est ce que le chiffrement doit empêcher');

  /* ---- 4. chiffrement actif : ce qui sort devient opaque pour le serveur ---- */
  const secours = await page.evaluate(p => window.mqSec.activer(p), PHRASE);
  dit(typeof secours === 'string' && secours.length > 20, 'chiffrement non activé');
  await page.waitForFunction(
    () => (localStorage.getItem('last-db-v1') || '').slice(0, 5) === 'MQS1.', { timeout: 10000 });

  const ok2 = await page.evaluate(() => window.mqSauvVerserServeur(true));
  dit(ok2 === true, 'dépôt chiffré refusé');
  const tous = fichiersServeur();
  dit(tous.length === 2, 'deux fichiers attendus sur le serveur, obtenu ' + tous.length);
  const dernier = tous.filter(t => t.slice(0, 5) === 'MQS1.');
  dit(dernier.length === 1, 'un bloc chiffré attendu, obtenu ' + dernier.length);
  dit(dernier[0].indexOf(NIR) < 0 && dernier[0].indexOf('MARTINSECRET') < 0,
    'le bloc chiffré laisse fuir le NIR ou le nom');

  /* le serveur voit la métadonnée « chiffrée », et rien du contenu */
  const liste = await page.evaluate(() =>
    fetch((JSON.parse(localStorage.getItem('last-portal-srv')).url) + '/admin/backups',
      { headers: { 'X-Cabinet-Token': JSON.parse(localStorage.getItem('last-portal-srv')).token } })
      .then(r => r.json()));
  dit(liste.sauvegardes && liste.sauvegardes.length === 2, 'le serveur devrait lister deux sauvegardes');
  dit(liste.sauvegardes[0].chiffre === true, 'la plus récente devrait être marquée chiffrée');
  dit(liste.sauvegardes[0].ver > 0, 'la version du logiciel devrait être conservée');

  /* ---- 5. le journal et le rappel suivent ---- */
  const r1 = await page.evaluate(() => ({
    jours: window.mqSauvJours(),
    j: window.mqSauv.journal().slice(0, 2).map(x => ({ dest: x.dest, ok: x.ok, chiffre: !!x.chiffre })),
    rappels: window.mqSauvRappels().map(x => x.titre)
  }));
  dit(r1.jours === 0, 'versement du jour attendu, obtenu ' + r1.jours);
  dit(r1.j.length === 2 && r1.j[0].dest === 'serveur' && r1.j[0].ok && r1.j[0].chiffre,
    'le journal devrait porter les deux versements, le dernier chiffré');
  dit(!r1.rappels.some(x => /Aucune sauvegarde hors machine/.test(x)), 'le rappel « aucune sauvegarde » devrait avoir disparu');
  dit(!r1.rappels.some(x => /en clair sur cet appareil/.test(x)), 'le rappel « données en clair » devrait avoir disparu');

  /* ---- 6. restauration depuis le serveur : la donnée revient ---- */
  await page.evaluate(nir => {
    const d = (DB.dossiers || []).filter(x => x.id === 'do-sv')[0];
    if (d) d.intake.dirNir = 'EFFACE';
    save();
  }, NIR);
  const rendu = await page.evaluate(() => {
    const cfg = JSON.parse(localStorage.getItem('last-portal-srv'));
    return fetch(cfg.url + '/admin/backups', { headers: { 'X-Cabinet-Token': cfg.token } })
      .then(r => r.json())
      .then(j => fetch(cfg.url + '/admin/backup?id=' + encodeURIComponent(j.sauvegardes[0].id),
        { headers: { 'X-Cabinet-Token': cfg.token } }))
      .then(r => r.json())
      .then(j => window.mqSec.ouvrir(j.blob))
      .then(clair => {
        const bk = JSON.parse(clair);
        const d = (bk.db.dossiers || []).filter(x => x.id === 'do-sv')[0];
        return { app: bk.app, nir: d ? d.intake.dirNir : '', ver: bk.ver };
      });
  });
  dit(rendu.app === 'marq', 'le bloc rendu devrait être une sauvegarde Mar’q');
  dit(rendu.nir === NIR, 'le NIR devrait revenir de la sauvegarde du serveur, obtenu ' + rendu.nir);
  dit(rendu.ver > 0, 'la version devrait figurer dans la sauvegarde');

  /* ---- 7. une sauvegarde chiffrée ne se restaure pas sans la clé ---- */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#mqsec-lock', { timeout: 15000 });
  const refus = await page.evaluate(() => {
    const cfg = JSON.parse(localStorage.getItem('last-portal-srv'));
    return fetch(cfg.url + '/admin/backups', { headers: { 'X-Cabinet-Token': cfg.token } })
      .then(r => r.json())
      .then(j => fetch(cfg.url + '/admin/backup?id=' + encodeURIComponent(j.sauvegardes[0].id),
        { headers: { 'X-Cabinet-Token': cfg.token } }))
      .then(r => r.json())
      .then(j => window.mqSec.ouvrir(j.blob));
  });
  dit(refus === null, 'verrouillé, la sauvegarde chiffrée ne doit pas s’ouvrir');

  /* ---- 8. le dossier désigné : l'état est lisible, sans dialogue ---- */
  const dos = await page.evaluate(() => window.mqSauvDossierEtat().then(e => e));
  dit(dos && dos.pose === false, 'aucun dossier ne devrait être désigné au départ');

  await nav.close();
  try { serveur.close(); } catch (e) {}
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}

  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); process.exit(1); }
  console.log('sauvt ok — dépôt hors machine sur le serveur portail (2 sauvegardes, la seconde chiffrée : ni NIR ni nom lisibles '
    + 'dans le fichier du serveur) ; journal et rappels de Prévoyance suivis ; restauration depuis le serveur rétablit le NIR ; '
    + 'verrouillé, le bloc chiffré reste fermé');
  process.exit(0);
})();
