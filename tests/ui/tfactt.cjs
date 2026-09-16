const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1080}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForFunction(() => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'), { timeout: 20000 });

  await pg.evaluate(()=>{
    DB.clients=[{id:'fc1',clientType:'societe',denomination:'ZENITH SAS',email:'z@x.fr'}];
    DB.dossiers=[
      {id:'fd1',ref:'DOS-801',clientIds:['fc1'],formalite:'Création SAS',wf:{}},
      {id:'fd2',ref:'DOS-802',clientIds:['fc1'],formalite:'Transfert',wf:{}},
      {id:'fd3',ref:'DOS-803',clientIds:['fc1'],formalite:'Dissolution',wf:{cloture:1}}];
    DB.parametres.facturier=[
      {id:'ff1',type:'facture',numero:'FA-1',dossierId:'fd1',statut:'emise',lignes:[{des:'Honoraires',qte:1,pu:900}]},
      {id:'ff3',type:'facture',numero:'FA-3',dossierId:'fd3',statut:'emise',lignes:[{des:'Honoraires',qte:1,pu:200}]}];
    delete DB.parametres.tempsChaine;
    window.tempsAjouter('fd1',120,'Statuts','2026-09-01');
    window.tempsAjouter('fd1',60,'Dépôt','2026-09-03');
    window.tempsAjouter('fd2',300,'Long dossier','2026-09-04');
    window.tempsAjouter('fd3',600,'Ancien','2026-08-01');
  });

  // ce qui reste à facturer
  const af=await pg.evaluate(()=>window.tempsAFacturer('fd1'));
  A(af.min===180&&af.lignes.length===2,'le temps non facturé est réuni');
  A(Math.abs(af.montant-180)<0.01,'son montant suit le taux du cabinet (3 h à 60 €)');

  const lg=await pg.evaluate(()=>window.tempsLigneFacture('fd1'));
  A(lg&&lg.qte===3&&lg.pu===60&&lg.u==='heure','la ligne de facture est en heures au taux du cabinet');
  A(/DOS-801/.test(lg.des)&&/3 h/.test(lg.des),'le libellé dit le dossier et la durée');

  const vide=await pg.evaluate(()=>{ DB.dossiers.push({id:'fd0',ref:'DOS-800',clientIds:[],wf:{}});
    return window.tempsLigneFacture('fd0'); });
  A(vide===null,'sans temps saisi, aucune ligne n\'est produite');

  // report en facture
  const vf=await pg.evaluate(()=>{ window.__ajout=null;
    const _a=window.invAjouterLignes; window.invAjouterLignes=function(L){ window.__ajout=L; };
    const r=window.tempsVersFacture('fd1'); window.invAjouterLignes=_a;
    const c=DB.parametres.tempsChaine;
    return {r:r, ajout:window.__ajout, fait:c.lignes.filter(l=>l.dossierId==='fd1'&&l.facture).length,
      reste:window.tempsAFacturer('fd1').min, jr:c.journal[0]&&c.journal[0].action,
      draft:(window.__invDraft||{}).dossierId}; });
  A(vf.ajout&&vf.ajout.length===1,'la ligne est ajoutée au document en cours');
  A(vf.draft==='fd1','une facture rattachée au dossier est ouverte');
  A(vf.fait===2&&vf.reste===0,'les saisies passent en facturées');
  A(/porté en facture/.test(vf.jr||''),'le report est journalisé');

  // pas de double facturation
  const db=await pg.evaluate(()=>{ window.__n=0;
    const _a=window.invAjouterLignes; window.invAjouterLignes=function(){ window.__n++; };
    const r=window.tempsVersFacture('fd1'); window.invAjouterLignes=_a;
    return {r:r,n:window.__n}; });
  A(db.r===null&&db.n===0,'le même temps ne se facture pas deux fois');

  // remettre à facturer
  const rf=await pg.evaluate(()=>{ const n=window.tempsRendreFacturable('fd1');
    return {n:n, reste:window.tempsAFacturer('fd1').min}; });
  A(rf.n===2&&rf.reste===180,'on peut rendre des saisies de nouveau facturables');

  // une nouvelle saisie après facturation est facturable
  const nv=await pg.evaluate(()=>{ window.tempsVersFacture('fd1');
    window.tempsAjouter('fd1',30,'Suite');
    return window.tempsAFacturer('fd1').min; });
  A(nv===30,'le temps saisi après la facture reste à facturer');

  // dépassements
  const dp=await pg.evaluate(()=>window.tempsDepassements());
  A(dp.length>=1,'des dépassements sont relevés');
  const d2=dp.find(x=>x.ref==='DOS-802');
  A(d2&&d2.facture===0&&/sans aucun honoraire/.test(d2.motif),'un dossier travaillé sans honoraires est signalé');
  A(!dp.some(x=>x.ref==='DOS-803'),'un dossier clôturé n\'est plus signalé');
  const d1=dp.find(x=>x.ref==='DOS-801');
  A(!d1,'un dossier dont les honoraires couvrent le temps n\'est pas signalé');

  const sd=await pg.evaluate(()=>{ window.tempsSeuil(5000); const a=window.tempsDepassements().length;
    window.tempsSeuil(100); return a; });
  A(sd===0,'le seuil de signalement se règle');

  // prévoyance
  const pv=await pg.evaluate(()=>{ const L=window.prevItems()||[];
    const o=L.find(x=>x.key==='tps:depassement'); return o?{t:o.titre,d:o.detail,n:o.niveau}:null; });
  A(pv&&/plus longs que prévu/.test(pv.t),'la Prévoyance signale les dossiers trop longs');
  A(/DOS-802/.test(pv.d||''),'elle nomme le dossier le plus marqué');

  const off=await pg.evaluate(()=>{ DB.parametres.prevoyance=DB.parametres.prevoyance||{};
    (DB.parametres.prevoyance.sources=DB.parametres.prevoyance.sources||{}).sys=false;
    const a=(window.prevItems()||[]).some(x=>x.key==='tps:depassement');
    DB.parametres.prevoyance.sources.sys=true; return a; });
  A(off===false,'le réglage des sources surveillées est respecté');

  // carte
  const cd=await pg.evaluate(()=>{ const h=window.tempsDepassementCard();
    return {ok:/tf-card/.test(h), t:/plus longs que prévu/.test(h), s:/tempsSeuil/.test(h),
      d:/DOS-802/.test(h), note:/ne veut pas dire une erreur/.test(h)}; });
  A(cd.ok&&cd.t&&cd.s,'carte des dépassements avec son seuil');
  A(cd.d&&cd.note,'elle nomme les dossiers et explique ce que l\'écart veut dire');
  const pil=await pg.evaluate(()=>/tf-card/.test(window.pagePilotage()));
  A(pil,'carte greffée dans le Pilotage');

  // audit
  const au=await pg.evaluate(()=>(window.auditEntrees()||[]).filter(x=>x.src==='tempsChaine'&&/facture/.test(x.action)).length);
  A(au>=2,'les reports en facture remontent dans le journal d\'audit');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
