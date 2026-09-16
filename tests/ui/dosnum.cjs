/* v704 — Un seul numéro par dossier : même générateur partout, ref et numeroDossier alignés */
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
    const Y = String(new Date().getFullYear());
    const P = () => (DB.parametres = DB.parametres || {});
    delete P().numeros;
    const c = window.numCfg();
    c.prefix = 'DOS'; c.annee = true; c.sep = '-'; c.taille = 3; c.compteurs = {};

    /* Un seul générateur : le formulaire tire au format configuré, plus DOS00001 */
    out.form = window.formTakeDossierNum();
    out.apercu = window.formNextDossierNum();
    out.formFormat = new RegExp('^DOS-' + Y + '-\\d{3}$').test(out.form);
    out.apercuFormat = new RegExp('^DOS-' + Y + '-\\d{3}$').test(out.apercu);
    out.apercuSuivant = out.apercu !== out.form;   // l'aperçu ne redonne pas le numéro déjà pris

    /* Création depuis une demande : la fiche ne porte qu'un numéro */
    const dd = {
      id: 'dd-704', clientNom: 'Numéro Unique', clientEmail: 'n@u.fr', statut: 'Qualification',
      serviceSouhaite: 'Création de SAS',
      intake: { version: 'LASTv1', type: 'sas',
        societe: { denomination: 'UNIQ', capital: '1000', objet: 'X', regime: 'IS' },
        siege: { rue: 'r', cp: '75001', ville: 'Paris' },
        direction: { nom: 'N', prenom: 'U' },
        associes: [{ nom: 'N', prenom: 'U', parts: '1000' }],
        contact: { nom: 'N', prenom: 'U', email: 'n@u.fr' } }
    };
    DB.demandes.unshift(dd);
    const d1 = window.creerDossierDepuis(dd.id, true);
    out.ref = d1 && d1.ref; out.num = d1 && d1.numeroDossier;
    out.unSeulNumero = !!(d1 && d1.ref && d1.ref === d1.numeroDossier);

    /* Et ce numéro unique est bien au registre, une seule fois */
    const att = window.MQNum.registre().attribues;
    out.auRegistre = !!att[out.ref];
    out.tires = Object.keys(att).filter(k => /^DOS-/.test(k)).length;

    /* Numéro fourni par le questionnaire : repris tel quel, sans tirer de second numéro */
    const avantC = window.numCfg().compteurs[Y];
    const dd2 = JSON.parse(JSON.stringify(dd));
    dd2.id = 'dd-704b'; dd2.intake.numeroDossier = 'DOS-2099-777';
    DB.demandes.unshift(dd2);
    const d2 = window.creerDossierDepuis(dd2.id, true);
    out.fourni = d2 && d2.ref;
    out.fourniRepris = !!(d2 && d2.ref === 'DOS-2099-777' && d2.numeroDossier === 'DOS-2099-777');
    out.compteurIntact = window.numCfg().compteurs[Y] === avantC;
    out.fourniAuRegistre = !!window.MQNum.registre().attribues['DOS-2099-777'];

    /* Alignement des dossiers déjà en base (deux numéros différents) */
    const d0 = DB.dossiers.filter(x => x.id !== (d1 || {}).id)[0];
    d0.ref = 'DOS-2601'; d0.numeroDossier = 'DOS-' + Y + '-900';
    out.avant = { ref: d0.ref, num: d0.numeroDossier };
    window.uiConfirm = (m, ok) => ok();        // on valide l'avertissement
    window.numAligner();
    out.apres = { ref: d0.ref, num: d0.numeroDossier };
    out.aligne = d0.ref === d0.numeroDossier && d0.ref === 'DOS-' + Y + '-900';
    out.restants = window.numControle().dossiers.length;
    return out;
  });

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  dit(r.formFormat, 'le formulaire ne suit pas le format configuré : ' + r.form);
  dit(r.apercuFormat, 'aperçu au mauvais format : ' + r.apercu);
  dit(r.apercuSuivant, 'l’aperçu redonne un numéro déjà tiré : ' + r.apercu);
  dit(r.unSeulNumero, 'le dossier porte deux numéros : ' + r.ref + ' / ' + r.num);
  dit(r.auRegistre, 'le numéro du dossier n’est pas au registre : ' + r.ref);
  dit(r.fourniRepris, 'numéro fourni non repris : ' + r.fourni);
  dit(r.compteurIntact, 'un numéro fourni a quand même consommé le compteur');
  dit(r.fourniAuRegistre, 'le numéro fourni n’entre pas au registre');
  dit(r.aligne, 'alignement raté : ' + JSON.stringify(r.apres));
  dit(r.restants === 0, r.restants + ' dossier(s) encore signalés après alignement');
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); console.error(JSON.stringify(r)); process.exit(1); }
  console.log('dosnum ok — ' + r.form + ', dossier ' + r.ref + ' (ref = numéro), alignement ' + r.avant.ref + ' → ' + r.apres.ref);
})();
