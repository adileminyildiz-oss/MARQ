/* v703 — Registre des numéros : unicité et non-réemploi */
const { chromium, URL_APP } = require('./_socle.cjs');

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', e => { if (!/ServiceWorker/.test(e.message)) erreurs.push(e.message); });
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { window._authGranted && window._authGranted(); } catch (e) {} });
  await page.waitForTimeout(3400);

  const r = await page.evaluate(() => {
    const out = {};
    const P = () => (DB.parametres = DB.parametres || {});
    const store = () => (P().facturier = P().facturier || []);

    /* Table rase : registre et facturier vides */
    delete P().numeros;
    P().facturier = [];
    window.__invDraft = null;

    const emettre = () => {
      window.__invDraft = {
        id: '', statut: 'brouillon', type: 'facture', modele: 'qonto',
        clNom: 'Client essai', devise: 'EUR', tva: 20,
        numero: window.invNumPourType('facture'),
        dateEmise: '2026-09-16', dateEch: '2026-10-16',
        lignes: [{ des: 'Prestation', qte: 1, pu: 100 }]
      };
      window.invEmettre();
      return window.__invDraft.numero;
    };

    out.n1 = emettre();
    out.n2 = emettre();

    /* On supprime la première : son numéro doit rester consommé */
    const id1 = store().filter(f => f.numero === out.n1)[0].id;
    const arr = store(); arr.splice(arr.findIndex(f => f.id === id1), 1);
    window.MQNum.registre(); /* le registre garde l'entrée */

    out.n3 = emettre();
    out.reutilise = (out.n3 === out.n1 || out.n3 === out.n2);
    out.registreGardeN1 = !!window.MQNum.registre().attribues[out.n1];

    /* Collision frontale : un brouillon qui porte un numéro déjà attribué */
    window.__invDraft = {
      id: '', statut: 'brouillon', type: 'facture', modele: 'qonto',
      clNom: 'Collision', devise: 'EUR', tva: 20, numero: out.n2,
      dateEmise: '2026-09-16', dateEch: '2026-10-16',
      lignes: [{ des: 'Prestation', qte: 1, pu: 50 }]
    };
    window.invEmettre();
    out.apresCollision = window.__invDraft.numero;
    out.collisionEvitee = (out.apresCollision !== out.n2);

    /* Le contrôle de cohérence voit le trou laissé par la suppression */
    const a = window.numControle();
    out.doublons = a.doublons.length;
    out.sequences = a.sequences.length;
    out.trous = (a.sequences[0] || {}).trous || [];

    /* Séries distinctes */
    out.dev = window.invNumPourType('devis');
    out.av = window.invNumPourType('avoir');

    /* Dossiers / demandes / traitements passent par le registre */
    out.dos1 = window.numDossierNext();
    out.dos2 = window.numDossierNext();
    out.dem1 = window.demCodeGen();
    out.dem2 = window.demCodeGen();
    out.svc1 = window.formTakeServiceNum('creation');
    out.svc2 = window.formTakeServiceNum('creation');

    /* La carte est bien rendue dans Paramètres */
    /* Le compteur de dossiers est réglable dans Paramètres : le remettre à zéro
       ne doit plus redonner un numéro qu'un dossier porte déjà. */
    const cfg = window.numCfg();
    cfg.prefix = 'DOS'; cfg.annee = true; cfg.taille = 3; cfg.compteurs = {};
    out.n0 = window.numDossierNext();
    cfg.compteurs = {};
    out.apresReset = window.numDossierNext();
    out.resetEvite = (out.apresReset !== out.n0);

    try { out.carteHtml = window.numCarte().length; } catch (e) { out.carteErr = e.message; }
    out.registreN = Object.keys(window.MQNum.registre().attribues).length;
    return out;
  });

  /* La carte se pose dans le tiroir « Numérotation des dossiers » des Paramètres, après rendu. */
  await page.evaluate(() => go('params'));
  await page.waitForTimeout(900);
  const c = await page.evaluate(() => {
    const el = document.getElementById('numreg-card');
    const tiroir = el && el.closest ? el.closest('.sp-slot') : null;
    return {
      pose: !!el,
      slot: tiroir ? tiroir.getAttribute('data-slot') : null,
      titre: !!(el && /unicité et non-réemploi/.test(el.textContent || '')),
      registre: !!(el && /numéros? au registre/.test(el.textContent || ''))
    };
  });
  r.carte = c.pose && c.slot === 'trt/num';
  r.carteTitre = c.titre && c.registre;
  r.carteOu = c.slot;

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };

  dit(/^FAC-\d{4}-0001$/.test(r.n1), 'première facture : ' + r.n1);
  dit(/^FAC-\d{4}-0002$/.test(r.n2), 'deuxième facture : ' + r.n2);
  dit(r.reutilise === false, 'numéro réemployé après suppression : ' + r.n3);
  dit(/^FAC-\d{4}-0003$/.test(r.n3), 'la séquence continue après suppression : ' + r.n3);
  dit(r.registreGardeN1, 'le registre a relâché ' + r.n1);
  dit(r.collisionEvitee, 'collision non évitée : ' + r.apresCollision + ' == ' + r.n2);
  dit(r.doublons === 0, r.doublons + ' numéro(s) en double après collision');
  dit(r.sequences === 1 && r.trous.length === 1, 'rupture de séquence non signalée (' + JSON.stringify(r.trous) + ')');
  dit(/^DEV-\d{4}-0001$/.test(r.dev), 'série devis : ' + r.dev);
  dit(/^AV-\d{4}-0001$/.test(r.av), 'série avoir : ' + r.av);
  dit(r.dos1 !== r.dos2, 'deux dossiers au même numéro : ' + r.dos1);
  dit(r.dem1 !== r.dem2, 'deux demandes au même code : ' + r.dem1);
  dit(r.svc1 !== r.svc2, 'deux traitements au même numéro : ' + r.svc1);
  dit(r.resetEvite, 'compteur remis à zéro → numéro de dossier redonné : ' + r.apresReset);
  dit(r.carte, 'carte absente du tiroir Paramètres › Numérotation (trouvée dans : ' + r.carteOu + ')');
  dit(r.carteTitre, 'la carte ne porte pas son titre ni le compte du registre');
  dit(r.registreN >= 10, 'registre trop court : ' + r.registreN);
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); console.error(JSON.stringify(r)); process.exit(1); }
  console.log('numt ok — ' + r.n1 + '/' + r.n2 + '/' + r.n3 + ', registre ' + r.registreN + ' numéros, ' + r.sequences + ' rupture signalée');
})();
