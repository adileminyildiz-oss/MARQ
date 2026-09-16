const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(2200);

  // base propre
  const propre=await pg.evaluate(()=>{ window.__sv={c:DB.clients,d:DB.dossiers,q:DB.demandes,f:DB.parametres.facturier};
    DB.clients=[{id:'s1',denomination:'UNIQUE SAS',email:'u@x.fr',tel:'01'}];
    DB.dossiers=[{id:'sd1',ref:'DOS-1',clientIds:['s1']}];
    DB.demandes=[]; DB.parametres.facturier=[]; delete DB.parametres.depots;
    const R=window.santeBilan(); return {n:R.constats.length,t:R.total,c:R.compte}; });
  A(propre.n===0&&propre.t===0,'base cohérente : aucun constat');
  A(propre.c.clients===1&&propre.c.dossiers===1,'les volumes sont comptés');

  const cardOk=await pg.evaluate(()=>{ const h=window.santeCard(); return /Aucune incohérence relevée/.test(h); });
  A(cardOk,'la carte le dit clairement quand tout va bien');

  // on installe chaque incohérence
  const R=await pg.evaluate(()=>{
    DB.clients=[
      {id:'s1',denomination:'UNIQUE SAS',email:'u@x.fr',tel:'01'},
      {id:'s2',denomination:'RÉSIDENCE PICARDIE',email:'a@x.fr'},
      {id:'s3',denomination:'Résidences de Picardie',email:'b@x.fr'},
      {id:'s4',denomination:'MUETTE SARL'},
      {id:'s5',denomination:''}
    ];
    DB.dossiers=[
      {id:'sd1',ref:'DOS-1',clientIds:['s1']},
      {id:'sd2',ref:'DOS-2',clientIds:[],intake:{societe:{denomination:'ORPHELIN SAS'}}},
      {id:'sd3',ref:'DOS-3',clientIds:['s1','disparu']}
    ];
    DB.demandes=[{id:'q1',code:'CR-1',dossierId:'introuvable',clientNom:'X'}];
    DB.parametres.facturier=[{id:'f1',numero:'FA-1',dossierId:'introuvable',clNom:'Y'}];
    DB.parametres.depots=[{id:'p1',nom:'kbis.pdf',dossierId:'introuvable'}];
    DB.parametres.grosChaine={journal:new Array(700).fill(0).map((_,i)=>({ts:Date.now()-i,action:'a'}))};
    const R=window.santeBilan(); const m={}; R.constats.forEach(x=>m[x.cle]={n:x.n,niv:x.niveau,act:x.action,items:x.items});
    return {total:R.total,n:R.constats.length,m:m}; });
  A(R.m.dosSansClient&&R.m.dosSansClient.n===1,'dossier sans client repéré');
  A(R.m.dosSansClient.niveau!=='' && R.m.dosSansClient.niv==='alerte','dossier sans client signalé en alerte');
  A(R.m.demOrphelines&&R.m.demOrphelines.n===1,'demande vers un dossier disparu repérée');
  A(R.m.factOrphelines&&R.m.factOrphelines.n===1,'facture vers un dossier disparu repérée');
  A(R.m.clientsDoubles&&R.m.clientsDoubles.n===1,'clients en double repérés malgré accents, pluriel et mot de liaison');
  A(R.m.clientsMuets&&R.m.clientsMuets.n>=1,'client sans coordonnées repéré');
  A(R.m.clientsSansNom&&R.m.clientsSansNom.n===1,'fiche sans nom repérée');
  A(R.m.dosClientPartiel&&R.m.dosClientPartiel.n===1,'dossier citant un client supprimé repéré');
  A(R.m.piecesOrphelines&&R.m.piecesOrphelines.n===1,'pièce sans dossier repérée');
  A(R.m.journauxGros&&R.m.journauxGros.n===1,'journal démesuré repéré');
  A(R.n===9,'les neuf constats sont réunis');

  // deux entités au même nom mais SIRET différents ne sont pas confondues
  const sir=await pg.evaluate(()=>{ DB.clients.push({id:'s6',denomination:'DUO SAS',siret:'111',email:'a@a.fr',tel:'1'});
    DB.clients.push({id:'s7',denomination:'DUO SAS',siret:'222',email:'b@b.fr',tel:'2'});
    const R=window.santeBilan(); const d=R.constats.find(x=>x.cle==='clientsDoubles');
    DB.clients=DB.clients.filter(x=>x.id!=='s6'&&x.id!=='s7'); return d?d.n:0; });
  A(sir===1,'deux sociétés homonymes à SIRET différents ne sont pas comptées comme doublon');

  // la carte rend tout
  const cd=await pg.evaluate(()=>{ const h=window.santeCard();
    return {ok:/sn-card/.test(h), t:/point\(s\) à regarder/.test(h),
      act:/santeDetacherDemandes/.test(h)&&/santeRognerJournaux/.test(h),
      quoi:/ne trouvent rien pour ces dossiers/.test(h),
      ref:/DOS-2/.test(h)}; });
  A(cd.ok&&cd.t,'carte du bilan rendue');
  A(cd.quoi,'chaque constat explique ce qu\'il implique');
  A(cd.ref,'les éléments concernés sont nommés');
  A(cd.act,'les corrections sûres sont proposées');

  // corrections
  const cor=await pg.evaluate(()=>{
    const a=window.santeDetacherDemandes();
    const b2=window.santeDetacherFactures();
    const c2=window.santeNettoyerRattachements();
    const d2=window.santeRognerJournaux();
    const R=window.santeBilan(); const m={}; R.constats.forEach(x=>m[x.cle]=x.n);
    return {a:a,b:b2,c:c2,d:d2,
      dem:DB.demandes[0].dossierId, fac:DB.parametres.facturier[0].dossierId,
      dos:DB.dossiers.find(x=>x.id==='sd3').clientIds,
      jr:DB.parametres.grosChaine.journal.length,
      reste:m, ndem:DB.demandes.length, nfac:DB.parametres.facturier.length}; });
  A(cor.a===1&&cor.dem===''&&cor.ndem===1,'demande détachée sans être supprimée');
  A(cor.b===1&&cor.fac===''&&cor.nfac===1,'facture détachée sans être supprimée');
  A(cor.c===1&&cor.dos.length===1&&cor.dos[0]==='s1','référence de client périmée retirée, la bonne est gardée');
  A(cor.d===1&&cor.jr===300,'journal ramené à trois cents lignes');
  A(!cor.reste.demOrphelines&&!cor.reste.factOrphelines&&!cor.reste.dosClientPartiel&&!cor.reste.journauxGros,
    'les quatre constats corrigés ont disparu');
  A(cor.reste.clientsDoubles===1&&cor.reste.dosSansClient===1,'les constats qui demandent un choix humain restent');

  // journal repris par l'audit
  const au=await pg.evaluate(()=>{ const j=(DB.parametres.santeChaine||{}).journal||[];
    const a=(window.auditEntrees()||[]).filter(x=>x.src==='santeChaine'); return {j:j.length,a:a.length}; });
  A(au.j>=4,'les corrections sont journalisées');
  A(au.a>=4,'le journal du bilan remonte dans l\'audit');

  // greffe Paramètres
  const pp=await pg.evaluate(()=>/sn-card/.test(window.pageParams()));
  A(pp,'bilan greffé dans les Paramètres');

  await pg.evaluate(()=>{ DB.clients=window.__sv.c; DB.dossiers=window.__sv.d; DB.demandes=window.__sv.q;
    DB.parametres.facturier=window.__sv.f; delete DB.parametres.grosChaine; delete DB.parametres.depots; });

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
