/* v711 — Intelligence documentaire : détection, champs manquants, conformité bloquante */
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

    /* 1. Une phrase, le bon modèle */
    const cas = [
      ['il me faut un CDI pour un cuisinier', 'cdi'],
      ['contrat à durée déterminée de 6 mois', 'cdd'],
      ['bulletin de salaire de mars', 'fichepaie'],
      ['attestation de chiffre d’affaires pour la banque', 'attca'],
      ['un contrat de sous-traitance BTP', 'soustrait'],
      ['PV de dissolution anticipée', 'dissol'],
      ['cession de parts sociales', 'cesparts'],
      ['lettre de mission', 'lettremission'],
      ['mise en demeure de payer', 'miseendemeure'],
      ['solde de tout compte', 'stc'],
      ['attestation de parution au journal', 'attparution'],
      ['bilan prévisionnel sur 3 ans', 'bilanprev']
    ];
    out.det = {}; out.detKo = 0;
    cas.forEach(([p, attendu]) => {
      const d = window.mqDocDetecte(p);
      const top = (d.candidats[0] || {}).k || null;
      const ok = top === attendu;
      if (!ok) out.detKo++;
      out.det[p] = { attendu, obtenu: top, ok, sur: d.sur };
    });

    /* 2. Un paquet quand la phrase nomme une formalité */
    const crea = window.mqDocDetecte('je veux créer une SASU');
    out.paquetCrea = crea.paquet ? { label: crea.paquet.label, forme: crea.paquet.forme, n: crea.paquet.docs.length, docs: crea.paquet.docs } : null;
    const tr = window.mqDocDetecte('transfert de siège social');
    out.paquetModif = tr.paquet ? { key: tr.paquet.key, n: tr.paquet.docs.length } : null;

    /* 3. Un modèle absent du catalogue est nommé, pas remplacé */
    out.absents = ['un NDA avec un prestataire', 'rédiger nos CGV', 'un pacte d’associés']
      .map(p => { const d = window.mqDocDetecte(p); return d.absent ? d.absent.k : null; });

    /* 4. Champs : ce qui manque est calculé depuis le schéma du modèle */
    const ch = window.mqDocChamps('cdi');
    out.champs = { total: ch.total, manques: ch.manques.length, groupes: [...new Set(ch.manques.map(m => m.groupe))].length };
    out.champsCoherent = ch.total > 0 && ch.total === ch.connus.length + ch.manques.length;

    /* 5. Conformité : une donnée fausse est repérée, une donnée juste passe */
    const faux = window.mqDocControles('statuts', { siren: '123456789', denomination: 'X' });
    const vrai = window.mqDocControles('statuts', { siren: '552100554', denomination: 'X' });
    out.siren = { faux: faux.bloquants.some(b => b.regle === 'siren'), vrai: vrai.bloquants.length };

    const ib = window.mqDocControles('mandatsepa', { iban: 'FR7630006000011234567890189' });
    const ibKo = window.mqDocControles('mandatsepa', { iban: 'FR7630006000011234567890188' });
    out.iban = { bon: ib.bloquants.filter(b => b.regle === 'iban').length, mauvais: ibKo.bloquants.filter(b => b.regle === 'iban').length };

    /* date de naissance dans le futur → bloquant */
    const futur = new Date(Date.now() + 86400000 * 400).toISOString().slice(0, 10);
    const nais = window.mqDocControles('cdi', { salnaiss: futur });
    out.naissanceFuture = nais.bloquants.some(b => b.regle === 'naissance');

    /* le vide n'est pas une faute : c'est un manque */
    out.videNonBloquant = window.mqDocControles('statuts', { siren: '' }).bloquants.length === 0;

    /* 6. La barrière : on ne finalise pas un document au SIREN faux */
    DB.editionsLibres = [];
    window.edLibNew('statuts', 'SAS');
    const id = state.edLibId;
    const d = DB.editionsLibres.filter(x => x.id === id)[0];
    d.data = d.data || {}; d.data.siren = '123456789';
    out.refus = window.edLibSaveDoc(id) === false && !(d.data && d.data._finalise);
    d.data.siren = '552100554';
    window.edLibSaveDoc(id);
    out.acceptApresCorrection = !!(d.data && d.data._finalise);

    /* 6 bis. La variante nommée dans la phrase est reprise sur le document */
    DB.editionsLibres = [];
    window.__intelQ = 'il me faut un contrat de sous-traitance BTP';
    window.mqIntelCreer('soustrait');
    const st = DB.editionsLibres[0];
    out.variante = st ? (st.data || {}).sttype : null;
    DB.editionsLibres = [];
    window.__intelQ = 'contrat de sous-traitance classique';
    window.mqIntelCreer('soustrait');
    out.varianteNormal = (DB.editionsLibres[0] || {}).data.sttype;
    out.varianteForme = window.mqDocVariante('statuts', 'créer une SARL').forme;

    /* 7. La carte se rend */
    out.carte = typeof window.mqIntelCard() === 'string' && window.mqIntelCard().indexOf('intel-q') > 0;
    return out;
  });

  /* 8. Rendu réel dans le Tableau de bord */
  const vu = await page.evaluate(() => {
    state.page = 'pilotage'; render();
    const c = document.querySelector('.intel-card');
    return { carte: !!c, champ: !!document.getElementById('intel-q') };
  });

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  dit(r.detKo === 0, 'détection : ' + JSON.stringify(
    Object.entries(r.det).filter(([, v]) => !v.ok).map(([p, v]) => p + ' → ' + v.obtenu)));
  dit(r.paquetCrea && r.paquetCrea.n >= 4 && r.paquetCrea.forme === 'SASU',
      'paquet création : ' + JSON.stringify(r.paquetCrea));
  dit(r.paquetModif && r.paquetModif.key === 'transfert_siege',
      'paquet modification : ' + JSON.stringify(r.paquetModif));
  dit(JSON.stringify(r.absents) === '["nda","cgv","pacte"]', 'modèles absents : ' + JSON.stringify(r.absents));
  dit(r.champs.total > 10 && r.champs.manques > 0, 'champs du CDI : ' + JSON.stringify(r.champs));
  dit(r.champsCoherent, 'connus + manques ≠ total');
  dit(r.siren.faux && r.siren.vrai === 0, 'SIREN : ' + JSON.stringify(r.siren));
  dit(r.iban.bon === 0 && r.iban.mauvais === 1, 'IBAN : ' + JSON.stringify(r.iban));
  dit(r.naissanceFuture, 'une naissance dans le futur ne bloque pas');
  dit(r.videNonBloquant, 'un champ vide est traité comme une faute');
  dit(r.refus, 'la finalisation accepte un SIREN faux');
  dit(r.acceptApresCorrection, 'la finalisation refuse encore après correction');
  dit(r.variante === 'BTP simplifié', 'variante BTP non reprise : ' + r.variante);
  dit(r.varianteNormal === 'Normal', 'variante Normal non reprise : ' + r.varianteNormal);
  dit(r.varianteForme === 'SARL', 'forme non reprise : ' + r.varianteForme);
  dit(r.carte, 'la carte ne se construit pas');
  dit(vu.carte && vu.champ, 'la carte ne s’affiche pas dans le Tableau de bord : ' + JSON.stringify(vu));
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); process.exit(1); }
  console.log('intelt ok — 12 phrases reconnues, paquet création ' + r.paquetCrea.n
    + ' documents, 3 modèles absents nommés, CDI ' + r.champs.total + ' champs dont '
    + r.champs.manques + ' à demander, variante « ' + r.variante + ' » reprise de la phrase, '
    + 'SIREN/IBAN/naissance bloquants, finalisation refusée puis acceptée');
  /* on sort explicitement : un descripteur laissé ouvert par le navigateur
     retiendrait le processus et bloquerait le lanceur de suites. */
  process.exit(0);
})();
