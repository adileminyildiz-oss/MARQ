/**
 * Mar'q — Administration : date de début du suivi par société (v751)
 *
 * Fige : une société inscrite aujourd'hui n'affiche plus les échéances des
 * douze derniers mois comme « En retard » (TVA, acomptes, DSN, chiffres du
 * mois) ; la date se modifie depuis la Page Entreprise ; sans date, tout
 * l'historique reste suivi ; les retards répétés d'une même obligation
 * sont regroupés en une ligne ; sans charges saisies, la marge n'est pas
 * présentée comme de 100 %.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',regime:'Réel normal'},{id:'c2',clientType:'entreprise',denomination:'ANCIEN CLIENT',forme:'sas',regime:'Réel normal'}];
    DB.admin={c2:{rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',contrat:'CDI',entree:'2019-01-01',actif:true,paie:{taux:15,nir:'1850575123456'}}],absences:[],notes:[]},paye:{conf:{},mois:{}}}};
    DB.parametres.adminInscrits=['c2']; save(); });
  const retards=id=>ev(id=>{ admBilanCacheVider(); const f=admFiscalBilan(id).alertes, g=admBilanGlobal(id).alertes;
    return {fisR:f.filter(a=>/en retard depuis/.test(a.detail)).length, dsn:g.filter(a=>/^DSN de/.test(a.titre)&&a.niv==='r').length, tot:g.length, grp:admAlertesGroupees(id)}; },id);
  let r;

  // 1. inscription : suivi depuis aujourd'hui
  r=await ev(()=>{ go('entreprise'); admInscrire('c1',1); return {sd:DB.admin.c1.suiviDepuis,t:document.getElementById('view').innerText}; });
  const today=await ev(()=>{ const d=new Date(),P=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+P(d.getMonth()+1)+'-'+P(d.getDate()); });
  A(r.sd===today&&/Suivi depuis/.test(r.t),'inscription : la société est suivie à compter de ce jour (affiché sur la Page Entreprise)',JSON.stringify({sd:r.sd}));
  r=await retards('c1');
  A(r.fisR===0,'société inscrite aujourd’hui : aucune obligation fiscale antérieure signalée en retard',JSON.stringify(r));
  r=await ev(()=>{ go('mfiscal'); admTab('mfiscal','cal'); const t=document.getElementById('view').innerText; return {avant:(t.match(/Avant le suivi/g)||[]).length,ret:(t.match(/En retard/g)||[]).length}; });
  A(r.avant>0&&r.ret===0,'calendrier fiscal : échéances passées marquées « Avant le suivi », aucune « En retard »',JSON.stringify(r));

  // 2. société ancienne, sans date : historique complet, retards regroupés
  r=await retards('c2');
  const g=r.grp.filter(a=>/déclarations de TVA en retard/.test(a.titre));
  A(r.fisR>=3&&r.dsn>=1,'sans date de suivi : tout l’historique reste suivi (TVA, DSN en retard)',JSON.stringify({fisR:r.fisR,dsn:r.dsn}));
  A(g.length===1&&/^\d+ déclarations de TVA en retard$/.test(g[0].titre)&&/« TVA de .+ » à « TVA de .+ »/.test(g[0].detail)&&r.grp.length<r.tot,'Page Entreprise : les TVA en retard tiennent sur une ligne (première et dernière nommées)',JSON.stringify(g));
  r=await ev(()=>{ admEntChoisir('c2'); go('entreprise'); const t=document.getElementById('view').innerText; return {grp:/déclarations de TVA en retard/.test(t),seul:(t.match(/^TVA de /gm)||[]).length}; });
  A(r.grp,'Page Entreprise : ligne regroupée affichée',JSON.stringify(r));

  // 3. modification de la date
  r=await ev(()=>{ admSuivi(); const v=document.getElementById('adm-sd').value; const d=new Date(); d.setFullYear(d.getFullYear()+1); const P=n=>String(n).padStart(2,'0'); document.getElementById('adm-sd').value=d.getFullYear()+'-'+P(d.getMonth()+1)+'-'+P(d.getDate()); admSuiviOk(); return {v,t:window.__toasts.slice(-1)[0],sd:DB.admin.c2.suiviDepuis}; });
  A(r.v===''&&/futur/.test(r.t)&&!r.sd,'date future refusée',JSON.stringify(r));
  r=await ev(()=>{ document.getElementById('adm-sd').value=today0str(); function today0str(){ const d=new Date(),P=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+P(d.getMonth()+1)+'-'+P(d.getDate()); } admSuiviOk(); return DB.admin.c2.suiviDepuis; });
  const r2=await retards('c2');
  A(r===today&&r2.fisR===0&&r2.dsn===0,'date fixée à aujourd’hui : plus aucun retard de TVA ni de DSN antérieur (cache invalidé)',JSON.stringify({r,r2}));
  r=await ev(()=>{ admSuivi(); document.getElementById('adm-sd').value=''; admSuiviOk(); return {sd:DB.admin.c2.suiviDepuis,t:window.__toasts.slice(-1)[0]}; });
  const r3=await retards('c2');
  A(!r.sd&&/historique/.test(r.t)&&r3.fisR>=3,'date effacée : tout l’historique est de nouveau suivi',JSON.stringify({r,fisR:r3.fisR}));
  r=await ev(()=>{ DB.admin.c1.suiviDepuis='2000-01-01'; save(); admInscrire('c1'); return DB.admin.c1.suiviDepuis; });
  A(r==='2000-01-01','réinscription : la date choisie est conservée',r);

  // 4. marge sans charges
  r=await ev(()=>{ const y=new Date().getFullYear(); admEntChoisir('c1'); DB.admin.c1.reporting.mois[y+'-01']={ca:10000,ch:0,ms:0,enc:0}; save(); go('entreprise'); const t=document.getElementById('view').innerText;
    DB.admin.c1.reporting.mois[y+'-01'].ch=4000; save(); go('entreprise'); const t2=document.getElementById('view').innerText; return {a:/Marge\s*—\s*charges non saisies/.test(t)&&!/100 %/.test(t),b:/Marge\s*60 %/.test(t2)}; });
  A(r.a&&r.b,'marge : « charges non saisies » au lieu de 100 %, calculée dès que les charges sont connues',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
