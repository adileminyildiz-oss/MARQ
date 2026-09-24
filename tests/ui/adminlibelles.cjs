/**
 * Mar'q — Administration : libellés des alertes (v752)
 *
 * Fige : élision devant voyelle (« TVA d’août », « DSN d’avril »,
 * « Chiffres d’octobre ») ; fiches de paie incomplètes regroupées en une
 * ligne qui nomme les salariés ; NIR présent mais invalide distingué du
 * NIR absent.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const r=await p.evaluate(()=>{ const y=new Date().getFullYear();
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',regime:'Réel normal'}];
    DB.admin={c1:{rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',contrat:'CDI',entree:'2019-01-01',actif:true,paie:{taux:15,nir:'1850575123456'}},{id:'s2',prenom:'Lina',nom:'Morel',contrat:'CDI',entree:'2019-01-01',actif:true,paie:{taux:14}}],absences:[],notes:[]},paye:{conf:{},mois:{}}}};
    DB.parametres.adminInscrits=['c1']; save(); admBilanCacheVider();
    const fis=admFiscalBilan('c1').L.map(o=>o.lbl), g=admAlertesGroupees('c1'), pay=admPayeBilan('c1').alertes;
    return {aout:fis.filter(x=>/août/.test(x)), avril:fis.filter(x=>/avril|octobre/.test(x)), deAout:fis.some(x=>/de août|de avril|de octobre/.test(x)),
      mars:fis.filter(x=>/mars/.test(x)), grp:g.filter(a=>/fiches de paie à compléter/.test(a.titre)), paie:pay.filter(a=>/fiche à compléter/.test(a.titre)).map(a=>a.titre+' | '+a.detail),
      de:[admDeM('août 2026'),admDeM('mars 2026'),admDeM('octobre 2026')]}; });
  A(r.aout.length&&r.aout.every(x=>/^TVA d’août /.test(x))&&r.avril.every(x=>/^TVA d’(avril|octobre) /.test(x))&&!r.deAout,'calendrier fiscal : « TVA d’août », « TVA d’avril », « TVA d’octobre »',JSON.stringify(r.aout.concat(r.avril)));
  A(r.mars.every(x=>/^TVA de mars /.test(x))&&r.de.join('|')==='d’août 2026|de mars 2026|d’octobre 2026','« de » conservé devant consonne',JSON.stringify(r.de));
  A(r.paie.some(x=>/Paul Durand \| NIR incomplet ou clé invalide$/.test(x))&&r.paie.some(x=>/Lina Morel \| NIR manquant$/.test(x)),'NIR présent mais invalide distingué du NIR absent',JSON.stringify(r.paie));
  A(r.grp.length===1&&r.grp[0].titre==='2 fiches de paie à compléter'&&/Paul Durand \(NIR incomplet ou clé invalide\) · Lina Morel \(NIR manquant\)/.test(r.grp[0].detail),'Page Entreprise : fiches de paie incomplètes regroupées, salariés nommés',JSON.stringify(r.grp));
  const r2=await p.evaluate(()=>{ go('entreprise'); admEntChoisir('c1'); go('entreprise'); const t=document.getElementById('view').innerText; return {g:/2 fiches de paie à compléter/.test(t),seul:/fiche à compléter : Paul/.test(t)}; });
  A(r2.g&&!r2.seul,'Page Entreprise : une seule ligne affichée',JSON.stringify(r2));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
