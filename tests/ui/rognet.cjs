const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(3600);

  // fabrication d'historiques démesurés
  const av=await pg.evaluate(()=>{
    DB.parametres.facturier=DB.parametres.facturier||[];
    DB.parametres.facturier.push({id:'rf1',numero:'FA-9',
      execLog:new Array(400).fill(0).map((_,i)=>({ts:i,step:'etape '+i}))});
    DB.parametres.rdv=DB.parametres.rdv||[];
    DB.parametres.rdv.push({id:'rr1',execLog:new Array(250).fill(0).map((_,i)=>({ts:i,step:'r'+i}))});
    DB.dossiers=DB.dossiers||[];
    DB.dossiers.push({id:'rd1',ref:'DOS-R',clientIds:[],
      historique:new Array(500).fill(0).map((_,i)=>({ts:1000-i,t:'h'+i})),
      execLog:new Array(40).fill(0).map((_,i)=>({ts:i,step:'d'+i}))});
    DB.parametres.testChaine={journal:new Array(900).fill(0).map((_,i)=>({ts:1000-i,action:'j'+i}))};
    const m=window.journauxMesure();
    return {m:m, f:DB.parametres.facturier.find(x=>x.id==='rf1').execLog.length}; });
  A(av.f===400,'historique de facture de quatre cents lignes en place');
  A(av.m.exec>=650,'mesure : les historiques d\'exécution sont comptés ('+av.m.exec+')');
  A(av.m.pire===400&&/FA-9/.test(av.m.ou||''),'la mesure désigne le plus long et où il se trouve');

  // rognage
  const ap=await pg.evaluate(()=>{ const n=window.journauxRogner();
    const f=DB.parametres.facturier.find(x=>x.id==='rf1');
    const r=DB.parametres.rdv.find(x=>x.id==='rr1');
    const d=DB.dossiers.find(x=>x.id==='rd1');
    return {n:n, f:f.execLog.length, fPremier:f.execLog[0].step, fDernier:f.execLog[f.execLog.length-1].step,
      r:r.execLog.length, h:d.historique.length, hPremier:d.historique[0].t,
      dex:d.execLog.length, j:DB.parametres.testChaine.journal.length}; });
  A(ap.n>=4,'plusieurs historiques raccourcis ('+ap.n+')');
  A(ap.f===60,'historique de facture ramené à soixante lignes');
  A(ap.fDernier==='etape 399','les lignes les plus récentes sont gardées');
  A(ap.fPremier==='etape 340','les plus anciennes sont écartées');
  A(ap.r===60,'historique de rendez-vous ramené');
  A(ap.h===120,'historique de dossier ramené à cent vingt lignes');
  A(ap.hPremier==='h0','pour un historique inversé, c\'est la tête qui est gardée');
  A(ap.dex===40,'un historique déjà court n\'est pas touché');
  A(ap.j===300,'journal de module ramené à trois cents lignes');

  // idempotence
  const id=await pg.evaluate(()=>window.journauxRogner());
  A(id===0,'un second passage ne change plus rien');

  // rognage automatique après enregistrement
  const au=await pg.evaluate(async()=>{
    const f=DB.parametres.facturier.find(x=>x.id==='rf1');
    f.execLog=new Array(300).fill(0).map((_,i)=>({ts:i,step:'x'+i}));
    save(); await new Promise(r=>setTimeout(r,1600));
    return DB.parametres.facturier.find(x=>x.id==='rf1').execLog.length; });
  A(au===60,'l\'enregistrement raccourcit tout seul les historiques');

  // pas de boucle d'enregistrement
  const bcl=await pg.evaluate(async()=>{ window.__n=0; const _s=window.save;
    window.save=function(){ window.__n++; return _s.apply(this,arguments); };
    const f=DB.parametres.facturier.find(x=>x.id==='rf1');
    f.execLog=new Array(200).fill(0).map((_,i)=>({ts:i,step:'y'+i}));
    save(); await new Promise(r=>setTimeout(r,2200));
    const n=window.__n; window.save=_s; return n; });
  A(bcl<=2,'aucune boucle d\'enregistrement ('+bcl+' appel(s))');

  // remontée dans le bilan de santé
  const sn=await pg.evaluate(()=>{ const f=DB.parametres.facturier.find(x=>x.id==='rf1');
    f.execLog=new Array(500).fill(0).map((_,i)=>({ts:i,step:'z'+i}));
    const R=window.santeBilan(); const c=R.constats.find(x=>x.cle==='execLongs');
    return {jr:!!R.journaux, c:!!c, lbl:c&&c.lbl, n:R.journaux&&R.journaux.pire}; });
  A(sn.jr,'le bilan de santé porte la mesure des journaux');
  A(sn.c&&/Rogner maintenant/.test(sn.lbl||''),'un historique trop long apparaît dans le bilan avec sa correction');

  const fix=await pg.evaluate(()=>{ window.journauxRognerMain();
    const R=window.santeBilan(); return {l:DB.parametres.facturier.find(x=>x.id==='rf1').execLog.length,
      c:!!R.constats.find(x=>x.cle==='execLongs')}; });
  A(fix.l===60&&fix.c===false,'la correction depuis le bilan raccourcit et fait disparaître le constat');

  await pg.evaluate(()=>{ DB.parametres.facturier=DB.parametres.facturier.filter(x=>x.id!=='rf1');
    DB.parametres.rdv=DB.parametres.rdv.filter(x=>x.id!=='rr1');
    DB.dossiers=DB.dossiers.filter(x=>x.id!=='rd1'); delete DB.parametres.testChaine; });

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
