/* v710 — Classement des demandes et ouverture de la chaîne aux modifications */
const { chromium, URL_APP } = require('./_socle.cjs');

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', e => { if (!/ServiceWorker/.test(e.message)) erreurs.push(e.message); });
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { window._authGranted && window._authGranted(); } catch (e) {} });
  await page.waitForFunction(
    () => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'),
    { timeout: 20000 });

  const r = await page.evaluate(() => {
    const out = {};
    const dem = s => ({
      id: 'd-' + Math.random().toString(36).slice(2, 8), clientNom: 'Essai',
      clientEmail: 'e@e.fr', statut: 'Qualification', serviceSouhaite: s,
      intake: { version: 'LASTv1', type: 'sas',
        societe: { denomination: 'ESSAI', capital: '1000', objet: 'o', regime: 'IS' },
        siege: { rue: 'r', cp: '75001', ville: 'Paris' },
        direction: { nom: 'A', prenom: 'B' },
        associes: [{ nom: 'A', prenom: 'B', parts: '1000' }],
        contact: { nom: 'A', prenom: 'B', email: 'e@e.fr' } } });

    /* 1. Classement : trois natures, plus de repli silencieux sur « création » */
    out.classe = {};
    [['Création de SASU', 'creation'], ['Transfert de siège social', 'admin'],
     ['Changement de dirigeant', 'admin'], ['Augmentation de capital', 'admin'],
     ['Dissolution amiable', 'admin'], ['Rédaction de CGV', 'redaction'],
     ['Rédaction de NDA', 'redaction'], ['Pacte d\'associés', 'redaction'],
     ['Contrat de prestation', 'redaction'], ['Politique RGPD', 'redaction']
    ].forEach(([s, attendu]) => {
      const n = window.demNature(dem(s));
      out.classe[s] = { obtenu: n, attendu, ok: n === attendu };
    });
    out.classeKo = Object.values(out.classe).filter(x => !x.ok).length;
    out.libelles = ['creation', 'admin', 'redaction'].map(n => window.demNatLabel(n));

    /* 2. La chaîne : les modifications ouvrent un dossier, la rédaction non */
    out.porte = {};
    [['Création de SASU', true], ['Transfert de siège social', true],
     ['Changement de dirigeant', true], ['Augmentation de capital', true],
     ['Dissolution amiable', true], ['Rédaction de CGV', false]
    ].forEach(([s, attendu]) => {
      const o = window.pmOuvreDossier(dem(s));
      out.porte[s] = { obtenu: o, attendu, ok: o === attendu };
    });
    out.porteKo = Object.values(out.porte).filter(x => !x.ok).length;

    /* 3. Un dossier créé depuis une modification porte son type de formalité */
    const d1 = dem('Transfert de siège social'); DB.demandes.unshift(d1);
    const dos1 = window.creerDossierDepuis(d1.id, true);
    out.dossierOuvert = !!dos1;
    out.typeFormalite = dos1 && dos1.formaliteType;
    out.natureDossier = dos1 && dos1.nature;
    out.numDossier1 = dos1 && dos1.numeroDossier;
    out.numService1 = dos1 && dos1.numeroService;   // série MD pour une modification

    /* Les étapes sont bien celles du transfert, pas celles d'une création */
    const et = (typeof window.etapesEffective === 'function')
      ? window.etapesEffective(out.typeFormalite) : [];
    out.etapes = et;
    out.etapesJustes = et.length === 4 && /modificatif au Guichet unique/i.test(et.join(' '))
                       && !/statuts.*Dépôt du capital/i.test(et.join(' '));

    /* 4. Les pièces demandées suivent le modèle, pas le pack création */
    const req = k => window.espDocReq(dos1, k);
    out.pieces = { statuts: req('statuts'), souscripteurs: req('souscripteurs'),
                   dnc: req('dnc'), pouvoir: req('pouvoir'), pv: req('pv'),
                   lettremission: req('lettremission') };
    out.piecesJustes = !out.pieces.statuts && !out.pieces.souscripteurs && !out.pieces.dnc
                       && out.pieces.pouvoir && out.pieces.pv && out.pieces.lettremission;

    /* Le cabinet peut remettre un document écarté */
    window.espDocToggleReq(dos1.id, 'statuts');
    out.remisPossible = window.espDocReq(dos1, 'statuts');
    window.espDocToggleReq(dos1.id, 'statuts');
    out.reretire = !window.espDocReq(dos1, 'statuts');

    /* 5. Une création n'a rien perdu : ses dix-sept documents restent demandés */
    const d2 = dem('Création de SASU'); DB.demandes.unshift(d2);
    const dos2 = window.creerDossierDepuis(d2.id, true);
    out.typeCreation = dos2 && dos2.formaliteType;
    out.numService2 = dos2 && dos2.numeroService;   // série CR pour une création
    out.docsCreation = (typeof ESP_DOCS !== 'undefined')
      ? ESP_DOCS.filter(dc => window.espDocReq(dos2, dc.k)).length : 0;

    /* 6. Reprise : un dossier ancien sans type en reçoit un */
    DB.dossiers.push({ id: 'do-ancien', ref: 'DOS-ANC', clientIds: [], serviceIds: [],
                       statut: 'En cours', createdAt: '2026-01-01', historique: [],
                       service: 'Transfert de siège social' });
    out.repris = window.chaineReprise();
    out.typeRepris = DB.dossiers.filter(x => x.id === 'do-ancien')[0].formaliteType;
    out.idModif = dos1 && dos1.id; out.idCrea = dos2 && dos2.id;
    return out;
  });

  /* 7. Le rail affiché : ce que l'utilisateur lit vraiment à l'écran */
  const rail = async id => {
    await page.evaluate(i => {
      const d = DB.dossiers.filter(x => x.id === i)[0];
      const t = Date.now();
      d.wf = { demande: t, pieces: t, actes: t, attestations: t };
      state.page = 'espace'; state.espaceDossier = i; state.espTab = 'immatriculation';
      save(); render();
    }, id);
    await page.waitForFunction(() => document.querySelectorAll('.trw-rail .trw-step:not(.util)').length === 6,
      { timeout: 10000 });
    return page.evaluate(() => ({
      rail: [...document.querySelectorAll('.trw-rail .trw-step:not(.util) .trw-l b')].map(e => e.textContent.trim()),
      plan: [...document.querySelectorAll('.xp-steps .xp-l')].map(e => e.textContent.trim()),
      titre: [...document.querySelectorAll('.im5-card .card-h h2')].map(e => e.textContent.trim()),
      courante: (document.querySelector('.xp-cur-h b') || {}).textContent || ''
    }));
  };
  r.vuModif = await rail(r.idModif);
  r.vuCrea = await rail(r.idCrea);

  /* 8. Le dossier de dépôt n'est plus déballé dans le panneau, et son contenu
        suit la formalité : une création garde ses huit pièces. */
  r.depot = await page.evaluate(() => {
    const f = s => {
      const d = { serviceSouhaite: s };
      d.formaliteType = window.formaliteType(d);
      return window.im5Pieces(d).map(x => x.l);
    };
    return { crea: f('Création de SASU'), siege: f('Transfert de siège social'),
             capital: f('Augmentation de capital') };
  });
  r.panneau = await page.evaluate(i => {
    state.espaceDossier = i; render();
    return [...document.querySelectorAll('.xp-card .xp-row')].map(e => e.textContent.trim());
  }, r.idModif);

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  dit(r.classeKo === 0, 'classement : ' + JSON.stringify(
    Object.entries(r.classe).filter(([, v]) => !v.ok).map(([s, v]) => s + ' → ' + v.obtenu)));
  dit(JSON.stringify(r.libelles) === '["Création","Modification","Rédaction"]',
      'libellés : ' + JSON.stringify(r.libelles));
  dit(r.porteKo === 0, 'ouverture de dossier : ' + JSON.stringify(
    Object.entries(r.porte).filter(([, v]) => !v.ok).map(([s, v]) => s + ' → ' + v.obtenu)));
  dit(r.dossierOuvert, 'aucun dossier créé pour un transfert de siège');
  dit(r.typeFormalite === 'transfert_siege', 'type de formalité : ' + r.typeFormalite);
  dit(r.natureDossier === 'admin', 'nature du dossier : ' + r.natureDossier);
  dit(r.etapesJustes, 'étapes du transfert : ' + JSON.stringify(r.etapes));
  dit(/^DOS-\d{4}-\d{3}$/.test(r.numDossier1 || ''), 'numéro de dossier : ' + r.numDossier1);
  dit(/^MD-\d{4}-\d{3}$/.test(r.numService1 || ''), 'la modification n’a pas de numéro MD : ' + r.numService1);
  dit(/^CR-\d{4}-\d{3}$/.test(r.numService2 || ''), 'la création n’a pas de numéro CR : ' + r.numService2);
  dit(r.piecesJustes, 'pièces demandées : ' + JSON.stringify(r.pieces));
  dit(r.remisPossible, 'un document écarté ne peut pas être remis');
  dit(r.reretire, 'le document remis ne peut plus être retiré');
  dit(r.typeCreation === 'creation_sas', 'type de la création : ' + r.typeCreation);
  dit(r.docsCreation === 17, 'la création a perdu des documents : ' + r.docsCreation + '/17');
  dit(r.repris >= 1 && r.typeRepris === 'transfert_siege',
      'reprise : ' + r.repris + ' dossier(s), type ' + r.typeRepris);
  const MODIF = ['Demande', 'Pièces', 'Actes & statuts', 'Annonce légale', 'Dépôt modificatif', 'Clôture'];
  const CREA  = ['Demande', 'Pièces', 'Actes', 'Attestations', 'Immatriculation', 'Clôture'];
  dit(JSON.stringify(r.vuModif.rail) === JSON.stringify(MODIF),
      'rail affiché (modification) : ' + JSON.stringify(r.vuModif.rail));
  dit(JSON.stringify(r.vuModif.plan) === JSON.stringify(MODIF),
      'plan affiché (modification) : ' + JSON.stringify(r.vuModif.plan));
  dit(r.vuModif.titre[0] === 'Dépôt modificatif',
      'titre de l’étape (modification) : ' + JSON.stringify(r.vuModif.titre));
  dit(r.vuModif.courante === 'Dépôt modificatif',
      'étape en cours (modification) : ' + r.vuModif.courante);
  dit(JSON.stringify(r.vuCrea.rail) === JSON.stringify(CREA),
      'rail affiché (création) : ' + JSON.stringify(r.vuCrea.rail));
  dit(r.vuCrea.titre[0] === 'Immatriculation',
      'titre de l’étape (création) : ' + JSON.stringify(r.vuCrea.titre));
  dit(r.depot.crea.length === 8, 'dépôt d’une création : ' + r.depot.crea.length + ' pièces');
  dit(r.depot.siege.length === 3 && !r.depot.siege.some(l => /souscripteurs|non-condamnation|dépôt des fonds/i.test(l)),
      'dépôt d’un transfert : ' + JSON.stringify(r.depot.siege));
  dit(r.depot.capital.some(l => /dépôt des fonds/i.test(l)),
      'dépôt d’une augmentation de capital sans attestation de fonds : ' + JSON.stringify(r.depot.capital));
  dit(r.panneau.filter(t => /^Dossier de dépôt/.test(t)).length <= 1,
      'le dossier de dépôt est encore déballé ligne par ligne : ' + JSON.stringify(r.panneau));
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); process.exit(1); }
  console.log('chainet ok — 10 classements justes, transfert → ' + r.typeFormalite
    + ' ' + r.numService1 + ' (' + r.etapes.length + ' étapes), création '
    + r.numService2 + ' intacte à ' + r.docsCreation + ' documents ; rail affiché : '
    + r.vuModif.rail.slice(3, 5).join(' / ') + ' (modif) vs '
    + r.vuCrea.rail.slice(3, 5).join(' / ') + ' (création)');
  /* on sort explicitement : un descripteur laissé ouvert par le navigateur
     retiendrait le processus et bloquerait le lanceur de suites. */
  process.exit(0);
})();
