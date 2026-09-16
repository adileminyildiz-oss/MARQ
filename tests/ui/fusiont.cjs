/* v706 — Fusionner deux comptes clients en double */
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
    delete P().numeros;

    /* Deux fiches du même client : l'une complète et sans dossier, l'autre creuse
       mais rattachée partout. La fusion doit rassembler les deux. */
    const plein = { id: 'c-plein', denomination: 'MENUISERIE ROUX', siren: '812345678',
                    email: 'contact@roux.fr', tel: '0102030405', adresse: '3 rue des Ateliers',
                    cp: '59000', ville: 'Lille', createdAt: '2026-01-05' };
    const creux = { id: 'c-creux', denomination: 'Menuiserie Roux', siren: '812345678',
                    email: '', tel: '', createdAt: '2026-02-01', note: 'à rappeler' };
    DB.clients.push(plein, creux);

    /* Références au compte creux, dans des modules variés */
    DB.dossiers.push({ id: 'do-f1', ref: 'DOS-F1', clientIds: ['c-creux'], serviceIds: [],
                       statut: 'En cours', createdAt: '2026-02-02', historique: [] });
    DB.dossiers.push({ id: 'do-f2', ref: 'DOS-F2', clientIds: ['c-1', 'c-creux'], serviceIds: [],
                       statut: 'En cours', createdAt: '2026-02-03', historique: [] });
    P().facturier = [{ id: 'inv-f1', numero: 'FAC-2026-0500', statut: 'emise', type: 'facture',
                       clNom: 'Menuiserie Roux', clientId: 'c-creux', lignes: [] }];
    P().agenda = { rdv: [{ id: 'rv1', clientId: 'c-creux', quand: '2026-03-01' }] };
    P().coffre = { docs: [{ id: 'dc1', idClient: 'c-creux', titre: 'Statuts' }] };

    out.avant = DB.clients.length;
    out.doublonVu = window.numControle().clients.length;

    /* On conserve la fiche complète, elle absorbe la creuse */
    const res = window.cliFusionner('c-plein', 'c-creux');
    out.refs = res && res.refs;

    out.apres = DB.clients.length;
    out.creuxParti = !DB.clients.some(c => c.id === 'c-creux');
    out.dos1 = DB.dossiers.filter(d => d.id === 'do-f1')[0].clientIds;
    out.dos2 = DB.dossiers.filter(d => d.id === 'do-f2')[0].clientIds;
    out.facture = P().facturier[0].clientId;
    out.factureNom = P().facturier[0].clNom;      // la pièce émise garde son libellé
    out.rdv = P().agenda.rdv[0].clientId;
    out.coffre = P().coffre.docs[0].idClient;

    const m = DB.clients.filter(c => c.id === 'c-plein')[0];
    out.champsGardes = m.email === 'contact@roux.fr' && m.ville === 'Lille';
    out.champComble = m.note === 'à rappeler';
    out.journal = (window.MQNum.registre().journal || []).some(e => e.action === 'fusion-client');
    out.plusDeDoublon = window.numControle().clients.length === 0;

    /* Une fusion impossible ne casse rien */
    out.sansEffet = window.cliFusionner('c-plein', 'c-inexistant') === null;
    return out;
  });

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  dit(r.doublonVu >= 1, 'le doublon n’était pas détecté au départ');
  dit(r.apres === r.avant - 1, 'le nombre de comptes n’a pas baissé de un : ' + r.avant + ' → ' + r.apres);
  dit(r.creuxParti, 'le compte absorbé est encore là');
  dit(JSON.stringify(r.dos1) === '["c-plein"]', 'dossier 1 mal rattaché : ' + JSON.stringify(r.dos1));
  dit(JSON.stringify(r.dos2) === '["c-1","c-plein"]', 'dossier 2 mal rattaché : ' + JSON.stringify(r.dos2));
  dit(r.facture === 'c-plein', 'facture mal rattachée : ' + r.facture);
  dit(r.factureNom === 'Menuiserie Roux', 'le libellé de la pièce émise a été réécrit : ' + r.factureNom);
  dit(r.rdv === 'c-plein', 'rendez-vous mal rattaché : ' + r.rdv);
  dit(r.coffre === 'c-plein', 'document du coffre mal rattaché : ' + r.coffre);
  dit(r.refs >= 5, 'trop peu de rattachements reportés : ' + r.refs);
  dit(r.champsGardes, 'le compte conservé a perdu ses informations');
  dit(r.champComble, 'les vides du compte conservé n’ont pas été comblés');
  dit(r.journal, 'la fusion n’est pas journalisée');
  dit(r.plusDeDoublon, 'le doublon est encore signalé après fusion');
  dit(r.sansEffet, 'une fusion vers un compte inexistant n’a pas été refusée');
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); console.error(JSON.stringify(r)); process.exit(1); }
  console.log('fusiont ok — ' + r.refs + ' rattachements reportés, ' + r.avant + ' → ' + r.apres + ' comptes, pièce émise intacte');
})();
