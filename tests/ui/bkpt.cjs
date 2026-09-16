const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(2200);

  // état initial : jamais sauvegardé
  const e0=await pg.evaluate(()=>{ delete DB.parametres.sauvegarde; return window.sauvegardeEtat(); });
  A(e0.jamais===true&&e0.retard===true,'aucune sauvegarde : état « jamais »');

  // rappel dans la Prévoyance
  const pv0=await pg.evaluate(()=>{ DB.clients=DB.clients||[]; if(!DB.clients.length) DB.clients.push({id:'x',denomination:'X'});
    const L=window.prevItems()||[]; const o=L.find(x=>x.key==='sys:sauvegarde'); return o?{t:o.titre,n:o.niveau,d:o.detail}:null; });
  A(pv0&&/Aucune sauvegarde/.test(pv0.t),'rappel affiché dans la Prévoyance');
  A(pv0&&pv0.n==='crit','absence de sauvegarde signalée comme critique');
  A(pv0&&/n\u2019est|ne sont enregistrées que sur cet appareil/.test(pv0.d),'le rappel dit où vivent les données');

  // export → enregistrement
  const ap=await pg.evaluate(()=>{ let dl=null;
    const _c=document.createElement.bind(document);
    document.createElement=function(t){ const el=_c(t); if(t==='a'){ el.click=function(){ dl=el.download; }; } return el; };
    window.marqExport(); document.createElement=_c;
    const c=DB.parametres.sauvegarde; return {dl:dl,ts:!!(c.dernier&&c.dernier.ts),oct:c.dernier&&c.dernier.octets,
      cl:c.dernier&&c.dernier.clients, hist:(c.historique||[]).length, jr:(c.journal||[]).length}; });
  A(/^marq-sauvegarde-\d{8}-\d{4}\.json$/.test(ap.dl||''),'le fichier exporté porte la date et l\'heure');
  A(ap.ts,'la sauvegarde est datée');
  A(ap.oct>0,'la taille est mesurée');
  A(ap.hist===1&&ap.jr>=1,'historique et journal alimentés');

  // le rappel disparaît
  const pv1=await pg.evaluate(()=>{ const L=window.prevItems()||[]; return !L.some(x=>x.key==='sys:sauvegarde'); });
  A(pv1,'le rappel disparaît après la sauvegarde');

  // il revient passé le délai
  const pv2=await pg.evaluate(()=>{ const c=DB.parametres.sauvegarde; c.dernier.ts=Date.now()-9*86400000;
    const e=window.sauvegardeEtat(); const L=window.prevItems()||[]; const o=L.find(x=>x.key==='sys:sauvegarde');
    return {retard:e.retard,age:e.ageJ,niv:o&&o.niveau,tit:o&&o.titre}; });
  A(pv2.retard&&pv2.age===9,'sauvegarde vieille de neuf jours détectée');
  A(pv2.niv==='alerte'&&/à refaire/.test(pv2.tit||''),'rappel de renouvellement affiché');

  // délai réglable
  const dl=await pg.evaluate(()=>{ window.sauvegardeRappelJ(30); const e=window.sauvegardeEtat();
    window.sauvegardeRappelJ(7); return {r:DB.parametres.sauvegarde.rappelJ,retard:e.retard}; });
  A(dl.retard===false,'délai porté à trente jours : plus de rappel');

  // carte de suivi
  const cd=await pg.evaluate(()=>{ const h=window.sauvegardeSuiviCard(); return {ok:/bk-card/.test(h),
    t:/Suivi des sauvegardes/.test(h), sav:/Sauvegarder maintenant/.test(h), ver:/Vérifier un fichier/.test(h),
    hist:/bk-h/.test(h)}; });
  A(cd.ok&&cd.t,'carte de suivi présente');
  A(cd.sav&&cd.ver,'boutons sauvegarder et vérifier présents');
  A(cd.hist,'historique affiché');

  // greffe Paramètres
  const pp=await pg.evaluate(()=>/bk-card/.test(window.pageParams()));
  A(pp,'carte greffée dans les Paramètres');

  // vérification d'un fichier
  const vf=await pg.evaluate(async()=>{
    const bk={app:'marq',kind:'backup',ver:1,ts:Date.now()-86400000,
      db:{clients:[{id:'a'},{id:'b'}],dossiers:[{id:'d',docs:{k:[1,2]}}],demandes:[],parametres:{facturier:[{id:'f'}]}}};
    const f=new File([JSON.stringify(bk)],'marq-sauvegarde-20260101-1200.json',{type:'application/json'});
    const dt=new DataTransfer(); dt.items.add(f);
    const inp=document.createElement('input'); inp.type='file'; inp.files=dt.files;
    window.sauvegardeVerifier(inp);
    await new Promise(r=>setTimeout(r,300));
    const m=document.querySelector('.bk-verif');
    return {ok:!!m, txt:m?m.textContent.replace(/[\u202f\u00a0]/g,' '):'',
      cl:(DB.clients||[]).length}; });
  A(vf.ok,'fichier de sauvegarde lisible');
  A(/marq-sauvegarde-20260101-1200\.json/.test(vf.txt),'nom du fichier rappelé');
  A(/Clients/.test(vf.txt)&&/Pièces déposées/.test(vf.txt),'contenu du fichier détaillé');
  A(/Aucune donnée n\u2019a été modifiée/.test(vf.txt),'la vérification ne remplace rien');
  const intact=await pg.evaluate(()=>(DB.clients||[]).length);
  A(intact!==2,'les données de l\'appareil sont intactes après vérification');

  // fichier étranger
  const bad=await pg.evaluate(async()=>{ window.__t=[]; const _t=window.toast; window.toast=(m)=>window.__t.push(m);
    const f=new File(['{"hello":1}'],'autre.json',{type:'application/json'});
    const dt=new DataTransfer(); dt.items.add(f);
    const inp=document.createElement('input'); inp.type='file'; inp.files=dt.files;
    window.sauvegardeVerifier(inp); await new Promise(r=>setTimeout(r,300));
    window.toast=_t; return window.__t.join(' '); });
  A(/n\u2019est pas une sauvegarde/.test(bad),'fichier étranger refusé avec un message clair');

  // le rappel respecte le réglage des sources surveillées
  const src=await pg.evaluate(()=>{ const c=DB.parametres.sauvegarde; c.dernier.ts=Date.now()-40*86400000; c.rappelJ=7;
    DB.parametres.prevoyance=DB.parametres.prevoyance||{};
    DB.parametres.prevoyance.sources=Object.assign({},DB.parametres.prevoyance.sources||{},{sys:false});
    const off=(window.prevItems()||[]).some(x=>x.key==='sys:sauvegarde');
    DB.parametres.prevoyance.sources.sys=true;
    const on=(window.prevItems()||[]).some(x=>x.key==='sys:sauvegarde');
    return {off:off,on:on}; });
  A(src.off===false,'source « système » décochée : le rappel de sauvegarde disparaît');
  A(src.on===true,'source recochée : le rappel revient');

  // un seul rappel, et le bandeau du logiciel suit la même date
  const un=await pg.evaluate(()=>{ const c=DB.parametres.sauvegarde; c.dernier.ts=Date.now()-12*86400000; c.rappelJ=7;
    DB.parametres.prevoyance=DB.parametres.prevoyance||{}; (DB.parametres.prevoyance.sources=DB.parametres.prevoyance.sources||{}).sys=true;
    const L=(window.prevItems()||[]).filter(x=>/sauvegarde/i.test((x.titre||'')+(x.key||'')));
    return {n:L.length, k:L.map(x=>x.key), lb:(DB.params||{}).lastBackup, bj:(typeof backupJours==='function')?backupJours():null}; });
  A(un.n===1&&un.k[0]==='sys:sauvegarde','un seul rappel de sauvegarde, pas deux');
  A(un.lb>0&&un.bj!==null,'le repère de sauvegarde du logiciel suit la même date');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
