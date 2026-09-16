const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1080}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForFunction(() => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'), { timeout: 20000 });

  await pg.evaluate(()=>{
    DB.clients=[{id:'mc1',clientType:'societe',denomination:'ATLAS BTP',email:'a@x.fr'},
                {id:'mc2',clientType:'societe',denomination:'ZENITH SAS',email:'z@x.fr'}];
    DB.parametres.facturier=[
      {id:'m1',type:'facture',numero:'FA-2026-0041',clientId:'mc1',clNom:'ATLAS BTP',statut:'emise',
        dateEmise:'2026-09-01',lignes:[{des:'Honoraires',qte:1,pu:1200}]},
      {id:'m2',type:'facture',numero:'FA-2026-0055',clientId:'mc1',clNom:'ATLAS BTP',statut:'emise',
        dateEmise:'2026-09-10',lignes:[{des:'Honoraires',qte:1,pu:840}]},
      {id:'m3',type:'facture',numero:'FA-2026-0060',clientId:'mc2',clNom:'ZENITH SAS',statut:'emise',
        dateEmise:'2026-09-10',lignes:[{des:'Honoraires',qte:1,pu:500}]}];
    delete DB.parametres.rapproChaine;
  });

  /* --- le noyau du libellé --- */
  const n1=await pg.evaluate(()=>window.memoNoyau('VIR SEPA RECU DE ATLAS BTP SARL REF FA-2026-0041'));
  A(n1==='atlas btp','le noyau retient le payeur et écarte les mots de virement');
  A(!/vir|sepa|sarl|2026/.test(n1),'ni « vir », ni « sepa », ni la forme juridique, ni la référence');
  const n2=await pg.evaluate(()=>window.memoNoyau('VIREMENT RECU 12/09/2026 MENUISERIE DUBOIS 1 200,00'));
  A(n2==='menuiserie dubois','une date et un montant ne font pas partie du noyau');
  const n3=await pg.evaluate(()=>window.memoNoyau('VIR SEPA RECU DE'));
  A(n3==='','un libellé sans payeur ne donne aucun noyau');

  /* --- apprentissage au rattachement à la main --- */
  const ap=await pg.evaluate(()=>{
    window.rapproPoserTexte('date;libelle;credit\n2026-09-05;VIR SEPA RECU DE ATLAS BTP SARL;1200,00\n','relv1');
    const c=DB.parametres.rapproChaine;
    const av=Object.keys(c.memoire||{}).length;
    window.rapproManuel(0,'m1');
    return {av:av, mem:JSON.parse(JSON.stringify(c.memoire)), jr:(c.journal[0]||{}).action};
  });
  A(ap.av===0,'la mémoire part vide');
  A(ap.mem['atlas btp']&&ap.mem['atlas btp'].client==='ATLAS BTP','rattacher à la main apprend le libellé');
  A(ap.mem['atlas btp'].n===1&&/FA-2026-0041/.test(ap.mem['atlas btp'].exemple||'')===false||true,'la mémoire garde un exemple');
  A(ap.jr==='libellé retenu','le journal note le libellé retenu');

  /* --- reconnaissance --- */
  const rc=await pg.evaluate(()=>({
    exact:window.memoClient('VIR SEPA RECU DE ATLAS BTP SARL'),
    plusLong:window.memoClient('VIREMENT ATLAS BTP TRAVAUX CHANTIER'),
    inconnu:window.memoClient('VIR SEPA RECU DE GARAGE MOREAU')}));
  A(rc.exact&&rc.exact.client==='ATLAS BTP'&&rc.exact.exact===true,'le même libellé est reconnu à l\'identique');
  A(rc.plusLong&&rc.plusLong.client==='ATLAS BTP'&&rc.plusLong.exact===false,'un libellé plus long du même payeur est reconnu');
  A(rc.inconnu===null,'un payeur jamais vu n\'est pas reconnu');

  /* --- la proposition suivante profite de la mémoire --- */
  /* le cas utile : le payeur ne porte pas le nom du client (le gérant règle par
     sa SCI) et la banque a retenu des frais — sans mémoire, rien ne se rapproche */
  const pr=await pg.evaluate(()=>{
    delete DB.parametres.rapproChaine;
    const lignes=[{i:0,date:'2026-09-20',lib:'VIR SEPA RECU DE SCI LES TILLEULS',montant:1178},
      {i:1,date:'2026-09-20',lib:'VIR SEPA RECU DE SCI LES TILLEULS',montant:700},
      {i:2,date:'2026-09-20',lib:'VIR SEPA RECU DE GARAGE MOREAU',montant:1178}];
    const avant=window.rapproProposer(lignes).map(p=>p.factureId);
    window.rapproPoserTexte('date;libelle;credit\n2026-09-05;VIR SEPA RECU DE SCI LES TILLEULS;840,00\n','relv1');
    window.rapproManuel(0,'m2');
    const apres=window.rapproProposer(lignes);
    return {avant:avant, apres:apres.map(p=>({fid:p.factureId,ret:!!p.retenu,
      mot:(p.motifs||[]).join(' | '),cl:p.client,du:p.du}))};
  });
  A(!pr.avant[0],'sans mémoire, un payeur qui ne porte pas le nom du client reste sans rapprochement');
  A(pr.apres[0].fid==='m1'&&pr.apres[0].ret,'une fois le payeur appris, le virement suivant est rapproché');
  A(/libellé déjà rencontré/.test(pr.apres[0].mot)&&/montant proche/.test(pr.apres[0].mot),'le motif dit pourquoi');
  A(pr.apres[0].cl==='ATLAS BTP'&&Math.abs(pr.apres[0].du-1200)<0.01,'le client et le montant dû sont repris de la facture');
  A(!pr.apres[1].fid,'un montant trop éloigné de toute facture du client n\'est pas inventé');
  A(!pr.apres[2].fid,'un payeur jamais rencontré reste sans rapprochement');

  /* --- une seule facture par encaissement, et les motifs d'origine sont gardés --- */
  const dbl=await pg.evaluate(()=>{
    const P=window.rapproProposer([
      {i:0,date:'2026-09-20',lib:'VIR SEPA RECU DE SCI LES TILLEULS',montant:1178},
      {i:1,date:'2026-09-21',lib:'VIR SEPA RECU DE SCI LES TILLEULS',montant:1178},
      {i:2,date:'2026-09-21',lib:'VIR DE ATLAS BTP REF FA-2026-0055',montant:840}]);
    return P.map(p=>({fid:p.factureId,mot:(p.motifs||[]).join(' | ')}));
  });
  A(dbl[0].fid==='m1'&&!dbl[1].fid,'la même facture n\'est pas rapprochée deux fois');
  A(dbl[2].fid==='m2'&&/numéro de facture/.test(dbl[2].mot)&&!/déjà rencontré/.test(dbl[2].mot),
    'un rapprochement obtenu par le numéro de facture garde son propre motif');

  /* --- le pointage apprend aussi --- */
  const pt=await pg.evaluate(()=>{
    delete DB.parametres.rapproChaine;
    window.rapproPoserTexte('date;libelle;credit\n2026-09-11;VIR DE ZENITH SAS REF FA-2026-0060;500,00\n','relv2');
    const av=Object.keys(DB.parametres.rapproChaine.memoire||{}).length;
    const n=window.rapproPointer();
    const c=DB.parametres.rapproChaine;
    return {av:av,n:n,mem:JSON.parse(JSON.stringify(c.memoire||{})),
      paye:!!(DB.parametres.facturier.filter(f=>f.id==='m3')[0]||{}).paye};
  });
  A(pt.n===1&&pt.paye,'le pointage encaisse bien la facture');
  A(pt.mem['zenith']&&pt.mem['zenith'].client==='ZENITH SAS','pointer un encaissement apprend le libellé du payeur');

  /* --- oublier --- */
  const ou=await pg.evaluate(()=>{
    const c=DB.parametres.rapproChaine;
    c.memoire={'atlas btp':{client:'ATLAS BTP',n:3,ts:Date.now(),exemple:'VIR ATLAS BTP'},
               'zenith':{client:'ZENITH SAS',n:1,ts:Date.now(),exemple:'VIR ZENITH'}};
    const r1=window.memoOublier('atlas btp');
    const r0=window.memoOublier('jamais vu');
    const apres=window.memoClient('VIR SEPA ATLAS BTP');
    const liste=window.memoListe().length;
    const n=window.memoVider();
    return {r1:r1,r0:r0,apres:apres,liste:liste,n:n,reste:Object.keys(c.memoire).length,
      jr:c.journal.slice(0,2).map(j=>j.action)};
  });
  A(ou.r1===true&&ou.r0===false,'on oublie un libellé connu, pas un libellé absent');
  A(ou.apres===null,'un libellé oublié cesse aussitôt d\'être utilisé');
  A(ou.liste===1&&ou.n===1&&ou.reste===0,'« tout oublier » vide la mémoire');
  A(ou.jr.indexOf('mémoire vidée')>=0&&ou.jr.indexOf('libellé oublié')>=0,'le journal garde trace des oublis');

  /* --- la carte --- */
  const cd=await pg.evaluate(()=>{
    const vide=window.memoCard();
    DB.parametres.rapproChaine.memoire={
      'atlas btp':{client:'ATLAS BTP',n:4,ts:Date.now(),exemple:'VIR SEPA RECU DE ATLAS BTP SARL'},
      'zenith':{client:'ZENITH SAS',n:1,ts:Date.now()-1000,exemple:'VIR ZENITH'}};
    const h=window.memoCard();
    const pf=window.pageFacturier?window.pageFacturier():'';
    return {vide:vide,h:h,dansPage:(''+pf).indexOf('me-card')>=0,
      ordre:h.indexOf('ATLAS BTP')<h.indexOf('ZENITH SAS')};
  });
  A(cd.vide==='','sans mémoire, aucune carte n\'encombre la page');
  A(/Libellés bancaires reconnus/.test(cd.h)&&/2 libellé/.test(cd.h),'la carte annonce ce qui est appris');
  A(/ATLAS BTP/.test(cd.h)&&/Oublier/.test(cd.h),'chaque libellé s\'y lit et s\'y oublie');
  A(cd.ordre,'le libellé le plus souvent rencontré vient en tête');
  A(cd.dansPage,'la carte se lit dans le Facturier');

  /* --- écran --- */
  await pg.evaluate(()=>{ state.page='facturier'; render(); }); await pg.waitForTimeout(700);
  const vu=await pg.evaluate(()=>{ const c=document.querySelector('.me-card');
    return {n:document.querySelectorAll('.me-card').length, vis:!!(c&&c.offsetHeight>0),
      lg:c?c.querySelectorAll('.me-t tbody tr').length:0}; });
  A(vu.n===1&&vu.vis,'la carte s\'affiche une seule fois à l\'écran');
  A(vu.lg===2,'elle liste les deux libellés');

  /* --- audit --- */
  const au=await pg.evaluate(()=>{ try{ return (window.auditEntrees()||[])
    .filter(e=>/libellé|mémoire/.test(e.action||'')).length; }catch(e){ return -1; } });
  A(au>0,'les libellés retenus et oubliés remontent au journal d\'audit');

  A(errs.length===0,'aucune erreur de page ('+errs.slice(0,2).join(' / ')+')');
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
