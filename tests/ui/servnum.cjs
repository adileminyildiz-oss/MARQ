/* v707 — Le numéro de traitement suit le format réglé pour les dossiers */
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
    delete P().numeros; delete P().numService;
    const c = window.numCfg();
    c.prefix = 'DOS'; c.sep = '-'; c.annee = true; c.taille = 3; c.compteurs = {};

    /* Format par défaut : plus de CR00001 */
    out.cr1 = window.formTakeServiceNum('creation');
    out.cr2 = window.formTakeServiceNum('creation');
    out.md1 = window.formTakeServiceNum('modification');
    out.apercu = window.formNextServiceNum('creation');
    out.formatCR = new RegExp('^CR-' + Y + '-\\d{3}$').test(out.cr1);
    out.formatMD = new RegExp('^MD-' + Y + '-\\d{3}$').test(out.md1);
    out.suite = out.cr2 !== out.cr1;
    out.seriesSeparees = out.md1.slice(-3) === '001';   // MD a son propre compteur
    out.apercuSuivant = out.apercu !== out.cr1 && out.apercu !== out.cr2;

    /* Au registre, comme tous les autres numéros */
    const att = window.MQNum.registre().attribues;
    out.auRegistre = !!att[out.cr1] && !!att[out.md1];
    out.type = (att[out.cr1] || {}).type;

    /* Le format suit le réglage des dossiers : on change, il change */
    c.sep = '/'; c.taille = 5; c.annee = false;
    out.autreFormat = window.formTakeServiceNum('creation');
    out.suitLeReglage = /^CR\/\d{5}$/.test(out.autreFormat);

    /* Un numéro déjà pris n'est jamais redonné, même compteur remis à zéro */
    c.sep = '-'; c.annee = true; c.taille = 3;
    P().numService.compteurs.CR = {};
    out.apresReset = window.formTakeServiceNum('creation');
    out.pasDeReprise = out.apresReset !== out.cr1 && out.apresReset !== out.cr2;

    /* La carte annonce la règle */
    out.carte = window.numCarte().indexOf('même format que le numéro de dossier') >= 0;
    return out;
  });

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  dit(r.formatCR, 'création au mauvais format : ' + r.cr1);
  dit(r.formatMD, 'modification au mauvais format : ' + r.md1);
  dit(r.suite, 'deux créations au même numéro : ' + r.cr1);
  dit(r.seriesSeparees, 'CR et MD partagent le même compteur : ' + r.md1);
  dit(r.apercuSuivant, 'l’aperçu redonne un numéro déjà pris : ' + r.apercu);
  dit(r.auRegistre, 'les numéros de traitement n’entrent pas au registre');
  dit(r.type === 'service', 'mauvais type au registre : ' + r.type);
  dit(r.suitLeReglage, 'le format ne suit pas le réglage des dossiers : ' + r.autreFormat);
  dit(r.pasDeReprise, 'compteur remis à zéro → numéro redonné : ' + r.apresReset);
  dit(r.carte, 'la carte n’explique pas la règle de format');
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); console.error(JSON.stringify(r)); process.exit(1); }
  console.log('servnum ok — ' + r.cr1 + ' / ' + r.md1 + ', suit le réglage (' + r.autreFormat + '), pas de reprise après remise à zéro');
})();
