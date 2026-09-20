/* v713 — Le chiffrement au repos : les octets stockés sont illisibles, et rien n'est perdu */
const { chromium, URL_APP } = require('./_socle.cjs');

const PHRASE = 'phrase-de-coffre-2026';
const NIR = '185067812345642';               /* le numéro qu'on ne doit plus trouver en clair */
const SCAN = 'CNI-RECTO-CONTENU-SECRET';     /* marqueur du contenu d'une pièce d'identité */
const COFFRE = 'PIECE-COFFRE-CONTENU-SECRET';

process.on('unhandledRejection', e => {
  console.error('ÉCHEC [étape '+ETAPE+'] — ' + (e && e.message ? e.message : e));
  process.exit(1);
});

const ko = [];
let ETAPE='0';
const jalon=n=>{ETAPE=n; if(process.env.CHIFFRET_TRACE) console.log('  .. '+n);};
const dit = (c, m) => { if (!c) ko.push(m); };

async function ouvrir(nav) {
  const page = await nav.newPage();
  page.on('pageerror', e => { if (!/ServiceWorker/.test(e.message)) ko.push('pageerror : ' + e.message); });
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  return page;
}
async function debloquerPortail(page) {
  await page.evaluate(() => { try { window._authGranted && window._authGranted(); } catch (e) {} });
  await page.waitForFunction(
    () => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'),
    { timeout: 20000 });
}

(async () => {
  const nav = await chromium.launch();
  let page = await ouvrir(nav);
  jalon('0 portail');
  await debloquerPortail(page);

  jalon('1 pose');
  /* ---- 1. on pose des données sensibles, comme le fait l'application ---- */
  await page.evaluate(([nir, scan, coffre]) => {
    DB.dossiers = DB.dossiers || [];
    DB.dossiers.push({
      id: 'do-sec', ref: 'DOS-SEC', clientIds: [], serviceIds: [], statut: 'En cours',
      createdAt: new Date().toISOString().slice(0, 10), historique: [],
      intake: { dirNom: 'MARTIN', dirNir: nir, dirNaissance: '1985-06-14' },
      pieces: { cni: { recu: true, nom: 'cni.jpg', data: 'data:image/jpeg;base64,' + btoa(scan) } }
    });
    save();
    window.cofFilesSet({ 'cf-sec': { name: 'passeport.pdf', type: 'application/pdf', data: 'data:application/pdf;base64,' + btoa(coffre) } });
  }, [NIR, SCAN, COFFRE]);

  /* état de départ : tout est lisible — c'est le défaut qu'on corrige */
  const avant = await page.evaluate(([nir, coffre]) => ({
    base: (localStorage.getItem('last-db-v1') || '').indexOf(nir) >= 0,
    cof: (localStorage.getItem('last-coffre-files') || '').indexOf(btoa(coffre)) >= 0,
    chiffre: !!(window.mqSec && window.mqSec.actif())
  }), [NIR, COFFRE]);
  dit(avant.base, 'départ : le NIR devrait être lisible en clair (sinon le test ne prouve rien)');
  dit(avant.cof, 'départ : le fichier du coffre devrait être lisible en clair');
  dit(!avant.chiffre, 'départ : le chiffrement ne devrait pas être actif');

  /* un instantané de sauvegarde automatique, pris AVANT l'activation : il porte
     les mêmes données en clair et doit être chiffré par l'activation */
  await page.evaluate(() => window.LBackup._snapshot('manuel'));

  jalon('2 activation');
  /* ---- 2. activation ---- */
  const secours = await page.evaluate(p => window.mqSec.activer(p), PHRASE);
  dit(typeof secours === 'string' && secours.replace(/-/g, '').length === 24,
    'clé de secours attendue de 24 caractères, obtenu : ' + secours);

  /* l'écriture est chiffrée en arrière-plan : on attend l'enveloppe */
  await page.waitForFunction(
    () => (localStorage.getItem('last-db-v1') || '').slice(0, 5) === 'MQS1.', { timeout: 10000 });
  await page.waitForFunction(
    () => (localStorage.getItem('last-coffre-files') || '').slice(0, 5) === 'MQS1.', { timeout: 10000 });

  jalon('3 depots');
  /* ---- 3. les cinq dépôts ne contiennent plus rien de lisible ---- */
  const apres = await page.evaluate(([nir, scan, coffre]) => {
    function lire(nom, magasin, cle) {
      return new Promise(res => {
        try {
          const rq = indexedDB.open(nom, 1);
          rq.onsuccess = () => {
            try {
              const tx = rq.result.transaction(magasin, 'readonly');
              const g = tx.objectStore(magasin).get(cle);
              g.onsuccess = () => res(g.result);
              g.onerror = () => res(null);
            } catch (e) { res(null); }
          };
          rq.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    }
    function instantanes() {
      return new Promise(res => {
        const rq = indexedDB.open('last-backups', 1);
        rq.onsuccess = () => {
          const out = [];
          try {
            const tx = rq.result.transaction('snap', 'readonly');
            const q = tx.objectStore('snap').openCursor();
            q.onsuccess = e => { const c = e.target.result; if (c) { out.push(c.value.data || ''); c.continue(); } else res(out); };
            q.onerror = () => res(out);
          } catch (e) { res(out); }
        };
        rq.onerror = () => res([]);
      });
    }
    const brutBase = localStorage.getItem('last-db-v1') || '';
    const brutCof = localStorage.getItem('last-coffre-files') || '';
    const aiguilles = [nir, btoa(scan), btoa(coffre), 'MARTIN'];
    const fuite = s => aiguilles.filter(a => (s || '').indexOf(a) >= 0);

    return Promise.all([lire('last-store', 'kv', 'db'), lire('marq-coffre', 'kv', 'files'), instantanes()])
      .then(([mir, cofIdb, snaps]) => ({
        baseEnv: brutBase.slice(0, 5) === 'MQS1.',
        baseFuite: fuite(brutBase),
        cofEnv: brutCof.slice(0, 5) === 'MQS1.',
        cofFuite: fuite(brutCof),
        mirEnv: !!(mir && typeof mir.data === 'string' && mir.data.slice(0, 5) === 'MQS1.'),
        mirFuite: fuite(mir && mir.data),
        cofIdbEnv: typeof cofIdb === 'string' && cofIdb.slice(0, 5) === 'MQS1.',
        cofIdbFuite: fuite(typeof cofIdb === 'string' ? cofIdb : JSON.stringify(cofIdb || '')),
        snapsNb: snaps.length,
        snapsClairs: snaps.filter(s => s.slice(0, 5) !== 'MQS1.').length,
        snapsFuite: snaps.map(fuite).reduce((a, b) => a.concat(b), [])
      }));
  }, [NIR, SCAN, COFFRE]);

  dit(apres.baseEnv, 'base : enveloppe attendue');
  dit(apres.baseFuite.length === 0, 'base : fuite en clair → ' + apres.baseFuite.join(', '));
  dit(apres.mirEnv, 'miroir IndexedDB : enveloppe attendue');
  dit(apres.mirFuite.length === 0, 'miroir : fuite en clair → ' + apres.mirFuite.join(', '));
  dit(apres.cofEnv, 'coffre (stockage local) : enveloppe attendue');
  dit(apres.cofFuite.length === 0, 'coffre local : fuite en clair → ' + apres.cofFuite.join(', '));
  dit(apres.cofIdbEnv, 'coffre (IndexedDB) : enveloppe attendue');
  dit(apres.cofIdbFuite.length === 0, 'coffre IndexedDB : fuite en clair → ' + apres.cofIdbFuite.join(', '));
  dit(apres.snapsNb > 0, 'aucun instantané de sauvegarde à contrôler');
  dit(apres.snapsClairs === 0, 'instantanés restés en clair : ' + apres.snapsClairs + '/' + apres.snapsNb);
  dit(apres.snapsFuite.length === 0, 'instantanés : fuite en clair → ' + apres.snapsFuite.join(', '));

  jalon('4 verrou');
  /* ---- 4. après rechargement, la base est verrouillée ---- */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#mqsec-lock', { timeout: 15000 });
  /* Ce qui compte n'est pas que l'écran soit vide — la liste des modules est posée
     par un autre module, et ne nomme que des rubriques — mais qu'AUCUNE donnée
     sensible ne paraisse et que la base ne soit pas chargée. */
  const verrou = await page.evaluate(([nir, scan]) => {
    const texte = document.body.innerText || '';
    const html = document.body.innerHTML || '';
    return {
      lock: !!document.getElementById('mqsec-lock'),
      z: parseInt((function(){ const e=document.getElementById('mqsec-lock'); return e?getComputedStyle(e).zIndex:'0'; })(), 10) || 0,
      chargee: !!(window.DB && window.DB.dossiers),
      fuiteNir: texte.indexOf(nir) >= 0 || html.indexOf(nir) >= 0,
      fuiteScan: html.indexOf(btoa(scan)) >= 0,
      fuiteNom: texte.indexOf('MARTIN') >= 0
    };
  }, [NIR, SCAN]);
  dit(verrou.lock, 'écran de déverrouillage attendu après rechargement');
  dit(verrou.z >= 100000, "le verrou doit recouvrir l'interface (z-index " + verrou.z + ')');
  dit(!verrou.chargee, 'la base ne doit pas être chargée tant que la clé n\u2019est pas en main');
  dit(!verrou.fuiteNir, 'verrouillé : le NIR paraît dans la page');
  dit(!verrou.fuiteScan, 'verrouillé : le contenu de la pièce paraît dans la page');
  dit(!verrou.fuiteNom, 'verrouillé : le nom du dirigeant paraît dans la page');

  /* Verrouillé, un enregistrement ne doit RIEN écrire : ni en clair (ce serait
     trahir les données), ni par-dessus l'enveloppe (ce serait l'écraser par un
     état incomplet — la base n'est pas chargée). */
  const ecrVerrou = await page.evaluate(nir => {
    const avant = localStorage.getItem('last-db-v1') || '';
    DB = { parametres: {}, clients: [], dossiers: [{ id: 'bidon', intake: { dirNir: nir } }] };
    save();
    return { avant: avant, apres: localStorage.getItem('last-db-v1') || '' };
  }, NIR);
  dit(ecrVerrou.apres === ecrVerrou.avant, "verrouillé : l'enveloppe ne doit pas être touchée par un enregistrement");
  dit(ecrVerrou.apres.slice(0, 5) === 'MQS1.', 'verrouillé : le stockage doit rester une enveloppe');
  dit(ecrVerrou.apres.indexOf(NIR) < 0, 'verrouillé : un enregistrement a écrit le NIR en clair');

  /* mauvaise phrase : refusée, et toujours verrouillé */
  await page.fill('#ms-in', 'mauvaise-phrase-entierement');
  await page.click('#ms-go');
  await page.waitForFunction(() => {
    const e = document.getElementById('ms-err');
    return e && e.style.display === 'block';
  }, { timeout: 15000 });
  const refus = await page.evaluate(() => ({
    msg: (document.getElementById('ms-err') || {}).textContent || '',
    lock: !!document.getElementById('mqsec-lock'),
    pret: !!(window.mqSec && window.mqSec.pret())
  }));
  dit(/incorrecte/i.test(refus.msg), 'phrase fausse : message attendu, obtenu « ' + refus.msg + ' »');
  dit(refus.lock, 'phrase fausse : doit rester verrouillé');
  dit(!refus.pret, 'phrase fausse : la clé de données ne doit pas être en main');

  /* bonne phrase : tout revient */
  await page.fill('#ms-in', PHRASE);
  await page.click('#ms-go');
  await page.waitForFunction(
    () => !document.getElementById('mqsec-lock') && document.querySelector('#nav .nav-btn'),
    { timeout: 20000 });
  const rendu = await page.evaluate(([nir, scan, coffre]) => {
    const d = (DB.dossiers || []).filter(x => x.id === 'do-sec')[0] || null;
    const f = (window.cofFilesGet ? window.cofFilesGet() : {})['cf-sec'] || null;
    return {
      dossier: !!d,
      nir: d ? (d.intake || {}).dirNir : '',
      scan: d && d.pieces && d.pieces.cni ? (d.pieces.cni.data || '').indexOf(btoa(scan)) >= 0 : false,
      coffre: f ? (f.data || '').indexOf(btoa(coffre)) >= 0 : false,
      actif: !!(window.mqSec && window.mqSec.actif() && window.mqSec.pret())
    };
  }, [NIR, SCAN, COFFRE]);
  dit(rendu.dossier, 'après déverrouillage : dossier absent');
  dit(rendu.nir === NIR, 'après déverrouillage : NIR non rétabli (' + rendu.nir + ')');
  dit(rendu.scan, 'après déverrouillage : contenu de la pièce d’identité non rétabli');
  dit(rendu.coffre, 'après déverrouillage : fichier du coffre non rétabli');
  dit(rendu.actif, 'après déverrouillage : le chiffrement devrait rester actif');

  jalon('5 secours');
  /* ---- 5. la clé de secours ouvre aussi ---- */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#mqsec-lock', { timeout: 15000 });
  await page.click('#ms-sw');                       /* basculer vers la clé de secours */
  await page.fill('#ms-in', secours);
  await page.click('#ms-go');
  await page.waitForFunction(
    () => !document.getElementById('mqsec-lock') && document.querySelector('#nav .nav-btn'),
    { timeout: 20000 });
  const parSecours = await page.evaluate(nir => {
    const d = (DB.dossiers || []).filter(x => x.id === 'do-sec')[0] || null;
    return d ? (d.intake || {}).dirNir : '';
  }, NIR);
  dit(parSecours === NIR, 'clé de secours : NIR non rétabli (' + parSecours + ')');

  jalon('6 changement');
  /* ---- 6. changement de phrase : la nouvelle ouvre, l'ancienne non ---- */
  const chg = await page.evaluate(p => window.mqSec.changerPhrase(p, 'autre-phrase-de-coffre'), PHRASE);
  dit(chg === true, 'changement de phrase refusé');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#mqsec-lock', { timeout: 15000 });
  const ancienne = await page.evaluate(p => window.mqSec.deverrouiller(p), PHRASE);
  dit(ancienne === false, "l'ancienne phrase ne doit plus ouvrir");
  const nouvelle = await page.evaluate(() => window.mqSec.deverrouiller('autre-phrase-de-coffre'));
  dit(nouvelle === true, 'la nouvelle phrase doit ouvrir');

  jalon('7 desactivation');
  /* ---- 7. désactivation : les données redeviennent lisibles, et complètes ---- */
  await page.evaluate(() => { try { window.lastBoot(); } catch (e) {} });
  await page.waitForFunction(() => document.querySelector('#nav .nav-btn'), { timeout: 20000 });
  const off = await page.evaluate(nir => window.mqSec.desactiver().then(() => ({
    actif: !!window.mqSec.actif(),
    clair: (localStorage.getItem('last-db-v1') || '').indexOf(nir) >= 0
  })), NIR);
  dit(off.actif === false, 'désactivation : le chiffrement devrait être inactif');
  dit(off.clair, 'désactivation : la base devrait être relue en clair');

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); process.exit(1); }
  console.log('chiffret ok — base, miroir, ' + apres.snapsNb + ' instantané(s) et coffre chiffrés (aucune fuite du NIR, '
    + 'des scans ni des noms) ; verrou au rechargement, phrase fausse refusée, phrase et clé de secours rétablissent tout ; '
    + 'changement de phrase effectif ; désactivation réversible');
  process.exit(0);
})();
