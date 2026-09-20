/* v712 — Les six modèles ajoutés à la bibliothèque produisent un document réel */
const { chromium, URL_APP } = require('./_socle.cjs');

const SIX = ['nda', 'prestation', 'pacte', 'cgv', 'cgu', 'rgpd'];

/* Filet : une attente qui expire lève, et sans cela le processus resterait
   suspendu — le lanceur attendrait un enfant qui ne meurt jamais. */
process.on('unhandledRejection', e => {
  console.error('ÉCHEC — ' + (e && e.message ? e.message : e));
  process.exit(1);
});

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

  const r = await page.evaluate(six => {
    const out = { cat: {}, champs: {}, doc: {}, det: {}, total: (window.EDLIB_TYPES || []).length };

    six.forEach(k => {
      /* au catalogue, avec un libellé */
      const t = (window.EDLIB_TYPES || []).filter(x => x.k === k)[0];
      out.cat[k] = t ? t.l : null;

      /* un schéma de champs, en groupes */
      const g = window.edSchema(k) || [];
      out.champs[k] = { groupes: g.length, champs: g.reduce((s, x) => s + (x.f || []).length, 0) };

      /* un document réellement produit, pas un titre seul */
      DB.editionsLibres = [];
      window.edLibNew(k, 'SAS');
      const d = DB.editionsLibres[0];
      const html = (typeof window.edLibDocHTML === 'function')
        ? window.edLibDocHTML(d.id) : null;
      out.doc[k] = { cree: !!d && d.k === k };
    });

    /* le résolveur les reconnaît, et ne les déclare plus absents */
    [['un NDA avec un prestataire', 'nda'],
     ['contrat de prestation de services', 'prestation'],
     ['rédiger un pacte d’associés', 'pacte'],
     ['rédiger nos CGV', 'cgv'],
     ['les CGU du site', 'cgu'],
     ['politique de confidentialité RGPD', 'rgpd']].forEach(([p, att]) => {
      const dd = window.mqDocDetecte(p);
      out.det[p] = { attendu: att, obtenu: (dd.candidats[0] || {}).k || null, absent: dd.absent ? dd.absent.k : null };
    });
    return out;
  }, SIX);

  /* le texte produit : on le lit dans le DOM, à l'écran */
  /* le texte produit : on le lit dans le DOM, à l'écran. L'aperçu est rendu de
     façon différée par le module d'édition : on attend qu'il paraisse. */
  const textes = {};
  for (const k of SIX) {
    await page.evaluate(kk => {
      DB.editionsLibres = [];
      window.edLibNew(kk, 'SAS');
      state.page = 'editions'; state.edLibId = DB.editionsLibres[0].id; render();
    }, k);
    await page.waitForFunction(
      () => { const e = [...document.querySelectorAll('.edoc')];
              return e.some(x => (x.textContent || '').length > 500); },
      { timeout: 10000 });
    textes[k] = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.edoc')];
      const best = els.sort((x, y) => (y.textContent || '').length - (x.textContent || '').length)[0];
      const t = (best && best.textContent) || '';
      const h1 = (best && best.querySelector('h1')) ? best.querySelector('h1').textContent : '';
      return { longueur: t.length, titre: h1.trim(),
               articles: (t.match(/ARTICLE \d+|\b\d{1,2}\. [A-ZÉÈ]/g) || []).length };
    });
  }

  const ko = [];
  const dit = (c, m) => { if (!c) ko.push(m); };
  SIX.forEach(k => {
    dit(r.cat[k], k + ' absent du catalogue');
    dit(r.champs[k].champs >= 10, k + ' : seulement ' + r.champs[k].champs + ' champs déclarés');
    dit(r.doc[k].cree, k + ' : document non créé');
    dit(textes[k].longueur > 1800, k + ' : document trop court (' + textes[k].longueur + ' caractères)');
    dit(textes[k].articles >= 8, k + ' : ' + textes[k].articles + ' articles seulement');
    dit(textes[k].titre.length > 8, k + ' : titre absent (' + textes[k].titre + ')');
  });
  dit(r.total === 71, 'catalogue : ' + r.total + ' modèles au lieu de 71');
  Object.entries(r.det).forEach(([p, v]) => {
    dit(v.obtenu === v.attendu, 'détection « ' + p + ' » → ' + v.obtenu);
    dit(v.absent === null, '« ' + p + ' » encore déclaré absent');
  });
  dit(erreurs.length === 0, 'pageerror : ' + erreurs.join(' | '));

  await nav.close();
  if (ko.length) { console.error('ÉCHEC\n - ' + ko.join('\n - ')); process.exit(1); }
  console.log('modelest ok — catalogue à ' + r.total + ' modèles ; '
    + SIX.map(k => k + ' ' + textes[k].articles + ' art./' + textes[k].longueur + ' car.').join(', ')
    + ' ; six phrases reconnues, aucune déclarée absente');
  process.exit(0);
})();
