/* v705 — Supprimer une pièce émise : l'avoir d'abord */
const { chromium, URL_APP } = require('./_socle.cjs');

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', e => { if (!/ServiceWorker/.test(e.message)) erreurs.push(e.message); });
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { window._authGranted && window._authGranted(); } catch (e) {} });
  await page.waitForFunction(() => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'), { timeout: 20000 });

  const r = await page.evaluate(() => {
    const out = {};
    const P = () => (DB.parametres = DB.parametres || {});
    P().facturier = []; delete P().numeros;
    const store = () => P().facturier;

    const emettre = (type, nom) => {
      window.__invDraft = {
        id: '', statut: 'brouillon', type: type, modele: 'qonto', clNom: nom,
        devise: 'EUR', tva: 20, numero: window.invNumPourType(type),
        dateEmise: '2026-09-16', dateEch: '2026-10-16',
        lignes: [{ des: 'Honoraires', qte: 1, pu: 300 }]
      };
      window.invEmettre();
      return store().filter(f => f.numero === window.__invDraft.numero)[0];
    };

    /* 1. Une facture émise : suppression interceptée, l'avoir proposé */
    const fac = emettre('facture', 'SARL Émise');
    window.invDel(fac.id);
    const ov = document.getElementById('ov');
    out.modale = !!(ov && ov.classList.contains('show'));
    const txt = (document.getElementById('ov-b') || {}).innerHTML || '';
    const pied = (document.getElementById('ov-f') || {}).innerHTML || '';
    out.explique = /avoir/i.test(txt) && /242 nonies A/.test(txt);
    out.boutonAvoir = /numAvoirPuis/.test(pied);
    out.boutonQuandMeme = /numSupprimerQuandMeme/.test(pied);
    out.toujoursLa = store().some(f => f.id === fac.id);

    /* 2. « Créer l'avoir » prépare bien un avoir qui référence la facture */
    window.numAvoirPuis(fac.id);
    const d = window.__invDraft || {};
    out.avoirType = d.type;
    out.avoirRef = d.refFacture;
    out.avoirNum = d.numero;
    out.factureIntacte = store().some(f => f.id === fac.id);

    /* 3. Un devis émis reste librement supprimable */
    const dev = emettre('devis', 'SAS Devis');
    window.uiConfirm = (m, ok) => ok();
    window.invDel(dev.id);
    out.devisSupprime = !store().some(f => f.id === dev.id);

    /* 4. Un brouillon aussi */
    store().push({ id: 'br-1', statut: 'brouillon', type: 'facture', numero: 'FAC-2026-9999', lignes: [] });
    window.invDel('br-1');
    out.brouillonSupprime = !store().some(f => f.id === 'br-1');

    /* 5. « Supprimer quand même » : la pièce part, le numéro reste consommé */
    const fac2 = emettre('facture', 'EURL Forcée');
    const no2 = fac2.numero;
    window.invDel(fac2.id);
    window.numSupprimerQuandMeme(fac2.id);
    out.forcee = !store().some(f => f.id === fac2.id);
    out.numeroRetenu = !!window.MQNum.registre().attribues[no2];
    out.journal = (window.MQNum.registre().journal || []).some(e => e.action === 'suppression' && e.numero === no2);
    out.ruptureSignalee = window.numControle().sequences.length > 0;
    return out;
  });

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  dit(r.modale, 'aucune fenêtre à la suppression d’une facture émise');
  dit(r.explique, 'la fenêtre n’explique pas l’avoir ni la règle de continuité');
  dit(r.boutonAvoir && r.boutonQuandMeme, 'les deux issues ne sont pas proposées');
  dit(r.toujoursLa, 'la facture émise a été supprimée malgré l’interception');
  dit(r.avoirType === 'avoir', 'l’avoir n’est pas préparé : type ' + r.avoirType);
  dit(/^AV-\d{4}-\d{4}$/.test(r.avoirNum || ''), 'l’avoir n’a pas de numéro de sa série : ' + r.avoirNum);
  dit(!!r.avoirRef, 'l’avoir ne référence pas la facture annulée');
  dit(r.factureIntacte, 'la facture a disparu en préparant l’avoir');
  dit(r.devisSupprime, 'un devis émis n’est plus supprimable');
  dit(r.brouillonSupprime, 'un brouillon n’est plus supprimable');
  dit(r.forcee, '« Supprimer quand même » n’a pas supprimé');
  dit(r.numeroRetenu, 'le numéro a été relâché après suppression forcée');
  dit(r.journal, 'la suppression forcée n’est pas journalisée');
  dit(r.ruptureSignalee, 'la rupture de séquence n’est pas signalée');
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); console.error(JSON.stringify(r)); process.exit(1); }
  console.log('avoirt ok — facture émise → avoir ' + r.avoirNum + ' ; devis et brouillon libres ; suppression forcée tracée');
})();
