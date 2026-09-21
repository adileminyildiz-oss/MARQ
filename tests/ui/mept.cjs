/**
 * Mar'q — Mise en marche (v715)
 * Prouve les trois promesses : un répertoire par dossier qui ne fuit pas,
 * un suivi de bout en bout de la demande à la livraison, et un contrôle
 * qui trouve réellement les défauts au lieu de les déclarer absents.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:960}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await pg.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=f=>pg.evaluate(f);

  // ---------- jeu d'essai : deux dossiers, deux clients, des pièces distinctes ----------
  await ev(()=>{
    window.toast=()=>{}; window.uiConfirm=(m,f)=>f&&f();
    DB.clients=[
      {id:'cA',denomination:'ALPHA SAS',email:'a@alpha.fr',tel:'01'},
      {id:'cB',denomination:'BETA SARL',email:'b@beta.fr',tel:'02'}
    ];
    DB.dossiers=[
      {id:'dA',ref:'AEM-2026-000101',numeroDossier:'AEM-2026-000101',clientIds:['cA'],
       formalite:'Création SAS',statut:'En cours',createdAt:'2026-09-01',
       pieces:{cni:{recu:true,nom:'cni-alpha.pdf',data:'data:application/pdf;base64,QUxQSEE='}},
       piecesRecues:{},docs:{},historique:[{d:'2026-09-02',t:'Pièces reçues'}],wf:{demande:Date.parse('2026-09-01')}},
      {id:'dB',ref:'AEM-2026-000102',numeroDossier:'AEM-2026-000102',clientIds:['cB'],
       formalite:'Transfert de siège',statut:'En cours',createdAt:'2026-09-05',
       pieces:{bail:{recu:true,nom:'bail-beta.pdf',data:'data:application/pdf;base64,QkVUQQ=='}},
       piecesRecues:{},docs:{},historique:[],wf:{}}
    ];
    DB.demandes=[
      {id:'qA',clientNom:'ALPHA SAS',clientEmail:'a@alpha.fr',canal:'Site AEM',serviceSouhaite:'Création SAS',
       date:'2026-09-01',ts:Date.parse('2026-09-01'),statut:'Qualification',assigneA:'u-sofia',dossierId:'dA'},
      {id:'qB',clientNom:'BETA SARL',clientEmail:'b@beta.fr',canal:'Mail',serviceSouhaite:'Transfert de siège',
       date:'2026-09-05',ts:Date.parse('2026-09-05'),statut:'Nouveau',assigneA:'',dossierId:'dB'},
      {id:'qC',clientNom:'GAMMA',clientEmail:'g@gamma.fr',canal:'Mail',serviceSouhaite:'Création SARL',
       date:'2026-08-01',ts:Date.parse('2026-08-01'),statut:'Nouveau',assigneA:'',dossierId:''}
    ];
    DB.parametres=DB.parametres||{}; DB.parametres.facturier=[];
    save();
  });

  // ---------- 1. le répertoire ----------
  let r=await ev(()=>{
    const RA=repContenu('dA'), RB=repContenu('dB');
    const nomsA=RA.sections.filter(s=>s.k==='pieces')[0].items.map(x=>x.nom);
    const nomsB=RB.sections.filter(s=>s.k==='pieces')[0].items.map(x=>x.nom);
    return {codeA:RA.code,codeB:RB.code,cheminA:RA.chemin,secs:RA.sections.length,
      nomsA,nomsB,cliA:RA.client.nom,
      stable:repCode(DB.dossiers[0])===RA.code};
  });
  A(r.secs===9,'le répertoire a ses neuf sections',JSON.stringify(r.secs));
  A(/AEM-2026-000101/.test(r.codeA)&&/ALPHA/.test(r.codeA),'le code du répertoire vient du numéro du dossier et du nom de la société',r.codeA);
  A(r.cheminA==='Dossiers/2026/'+r.codeA,'le chemin range par année',r.cheminA);
  A(r.codeA!==r.codeB,'deux dossiers, deux répertoires distincts');
  A(r.nomsA.join()==='cni-alpha.pdf'&&r.nomsB.join()==='bail-beta.pdf',
    'chaque répertoire ne contient que ses propres pièces',JSON.stringify(r));

  // le code ne bouge pas si la société est renommée
  r=await ev(()=>{ const av=repCode(DB.dossiers[0]);
    DB.clients[0].denomination='ALPHA SAS (nouveau nom)';
    const ap=repCode(DB.dossiers[0]);
    DB.clients[0].denomination='ALPHA SAS';
    return {av,ap,memeNumero:av.split('_')[0]===ap.split('_')[0]}; });
  A(r.memeNumero,'renommer la société ne change pas l’adresse du répertoire',JSON.stringify(r));

  // export : une vraie arborescence, avec les octets de la pièce
  r=await ev(()=>{ let taille=0,nom='';
    const _c=URL.createObjectURL; URL.createObjectURL=x=>{ taille=(x&&x.size)||0; return 'blob:x'; };
    const _k=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ nom=this.download; };
    const res=repExporter('dA');
    URL.createObjectURL=_c; HTMLAnchorElement.prototype.click=_k;
    return {res,taille,nom}; });
  A(r.res===true&&r.taille>400,'le répertoire s’exporte en une archive non vide',JSON.stringify(r));
  A(/^AEM-2026-000101/.test(r.nom)&&/\.zip$/.test(r.nom),'l’archive porte le code du répertoire',r.nom);

  // ---------- 2. l'étanchéité ----------
  r=await ev(()=>{ const E=repEtancheite(); return {ok:E.ok,graves:E.graves,rep:E.repertoires}; });
  A(r.ok===true&&r.graves===0,'base saine : aucune fuite possible',JSON.stringify(r));

  r=await ev(()=>{
    window.__sv=JSON.parse(JSON.stringify({c:DB.clients,d:DB.dossiers}));
    DB.clients.push({id:'cC',denomination:'ALPHA SAS',email:'autre@alpha.fr'});   // homonyme
    DB.dossiers.push({id:'dC',ref:'',numeroDossier:'',clientIds:['cA'],pieces:{},docs:{}}); // sans numéro
    DB.dossiers.push({id:'dD',ref:'AEM-2026-000104',numeroDossier:'AEM-2026-000104',clientIds:[],pieces:{},docs:{}}); // sans client
    const E=repEtancheite();
    return {graves:E.graves,quoi:E.alertes.map(a=>a.quoi)}; });
  A(r.quoi.indexOf('Deux clients portent le même nom')>=0,'l’homonymie de deux sociétés est détectée',JSON.stringify(r.quoi));
  A(r.quoi.indexOf('Dossier sans numéro')>=0,'un dossier sans numéro est détecté');
  A(r.quoi.indexOf('Dossier sans client')>=0,'un dossier sans client est détecté');

  // le portail refuse le nom ambigu — c'est là que la fuite se produirait
  r=await ev(()=>{ let ouvert=false;
    const _o=window.openPortail;
    window.__portailTest=()=>{ ouvert=true; };
    const amb=repPortailAmbigu('ALPHA SAS'), net=repPortailAmbigu('BETA SARL');
    openPortail('ALPHA SAS','000000');
    const apres=!!document.getElementById('portail-ov');
    return {amb,net,apres}; });
  A(r.amb===true&&r.net===false,'le nom qui désigne deux sociétés est reconnu comme ambigu',JSON.stringify(r));
  A(r.apres===false,'le portail refuse de s’ouvrir sur ce nom : aucune fuite',JSON.stringify(r));

  r=await ev(()=>{ let ouvert=false;
    DB.clients=DB.clients.filter(c=>c.id!=='cC');
    openPortail('ALPHA SAS','000000');
    const o=!!document.getElementById('portail-ov');
    try{ closePortail(); }catch(e){}
    DB.dossiers=DB.dossiers.filter(d=>d.id!=='dC'&&d.id!=='dD');
    return o; });
  A(r===true,'l’ambiguïté levée, le portail s’ouvre de nouveau');

  // ---------- 3. le parcours de bout en bout ----------
  r=await ev(()=>{ const p=parcours('qA');
    return {n:p.jalons.length,pos:p.pos,cur:p.courant&&p.courant.k,nom:p.nom,
      faits:p.jalons.filter(j=>j.etat==='fait').map(j=>j.k),avance:p.avance,
      depasses:p.jalons.filter(j=>j.etat==='depasse').map(j=>j.k),
      bloque:p.courant&&p.courant.bloque}; });
  A(r.n===15,'le parcours compte quinze jalons',JSON.stringify(r.n));
  A(r.faits.indexOf('recue')>=0&&r.faits.indexOf('qualifiee')>=0&&r.faits.indexOf('dossier')>=0,
    'demande reçue, qualifiée et dossier ouvert sont franchis',JSON.stringify(r.faits));
  A(r.cur==='pieces','le jalon courant est celui qui retient vraiment : les pièces',JSON.stringify(r.cur));
  A(r.depasses.indexOf('devis')>=0,
    'le devis jamais émis est dit « passé outre », il ne bloque pas un dossier déjà ouvert',JSON.stringify(r.depasses));
  A(r.nom==='ALPHA SAS','le parcours nomme la société du dossier',r.nom);

  // une demande sans dossier s'arrête tôt et dit pourquoi
  r=await ev(()=>{ const p=parcours('qC');
    return {cur:p.courant&&p.courant.k,bloque:p.jalons.filter(j=>j.k==='pieces')[0].bloque,av:p.avance}; });
  A(/dossier/i.test(r.bloque||''),'sans dossier ouvert, la suite du parcours dit ce qui manque',JSON.stringify(r));

  // on avance le dossier jusqu'à la livraison et au-delà
  r=await ev(()=>{
    const d=DB.dossiers.filter(x=>x.id==='dA')[0];
    d.wf={demande:Date.parse('2026-09-01'),pieces:Date.parse('2026-09-03'),actes:Date.parse('2026-09-05'),
          attestations:Date.parse('2026-09-08'),immatriculation:Date.parse('2026-09-12'),cloture:Date.parse('2026-09-15')};
    d.signEnv={statut:'signé',signeLe:'2026-09-06'};
    d.annonceLegale={commande:true,fichier:{name:'parution.pdf',dataUrl:'data:application/pdf;base64,QQ=='}};
    d.inpiSuivi={statut:'immatricule',reference:'INPI-9',dateDepot:'2026-09-09'};
    d.cloture={remis:'2026-09-14',remisA:'a@alpha.fr',factureId:'f1',factureNum:'FAC-1',factureLe:'2026-09-14',regle:Date.parse('2026-09-16')};
    d.statut='Clôturé';
    DB.parametres.facturier=[{id:'v1',type:'devis',statut:'emise',numero:'DEV-1',dossierId:'dA',dateEmise:'2026-09-01',accepte:'2026-09-02',ttc:390},
                             {id:'f1',type:'facture',statut:'emise',numero:'FAC-1',dossierId:'dA',dateEmise:'2026-09-14',ttc:390,paye:{ts:Date.parse('2026-09-16')}}];
    const p=parcours('qA');
    return {fini:p.fini,avance:p.avance,livre:!!p.livreLe,
      manquants:p.jalons.filter(j=>j.etat!=='fait'&&j.etat!=='sansobjet').map(j=>j.k)}; });
  A(r.fini===true&&r.avance===100,'dossier mené à son terme : parcours complet',JSON.stringify(r));
  A(r.livre===true,'la remise au client est datée et retenue');
  A(r.manquants.length===0,'aucun jalon laissé en arrière',JSON.stringify(r.manquants));

  // les jalons sans objet n'exigent rien
  r=await ev(()=>{
    DB.dossiers.push({id:'dE',ref:'AEM-2026-000105',numeroDossier:'AEM-2026-000105',clientIds:['cB'],
      formalite:'Dépôt de marque INPI',pieces:{},docs:{},wf:{}});
    DB.demandes.push({id:'qE',clientNom:'BETA SARL',serviceSouhaite:'Dépôt de marque INPI',date:'2026-09-10',
      ts:Date.parse('2026-09-10'),statut:'Nouveau',dossierId:'dE'});
    const p=parcours('qE');
    return {so:p.jalons.filter(j=>j.sansobjet).map(j=>j.k)}; });
  A(r.so.indexOf('annonce')>=0&&r.so.indexOf('depot')>=0,
    'une prestation sans formalité au greffe n’attend ni annonce ni dépôt',JSON.stringify(r.so));

  // la page de suivi
  r=await ev(()=>{ state.page='suivi'; render();
    const v=document.getElementById('view');
    return {h:v.innerHTML.length,lignes:v.querySelectorAll('.pc-row').length-1,
      pastilles:v.querySelectorAll('.pc-row:not(.pc-head) .pc-p').length,
      titre:document.getElementById('ptitle').textContent,
      kpi:[...v.querySelectorAll('.pc-kpis b')].map(x=>x.textContent)}; });
  A(/Suivi/.test(r.titre),'la page Suivi porte son titre',r.titre);
  A(r.lignes>=4,'toutes les demandes sont dans la file',JSON.stringify(r.lignes));
  A(r.pastilles===r.lignes*15,'chaque demande montre ses quinze jalons',JSON.stringify(r));

  r=await ev(()=>{ const B=parcoursBilan(); return B; });
  A(r.total>=4&&r.livres>=1,'le bilan compte les demandes suivies et celles qui sont closes',JSON.stringify(r));

  // un jalon sauté ne retient pas éternellement un dossier que la suite a dépassé
  r=await ev(()=>{
    DB.parametres.facturier=DB.parametres.facturier.filter(f=>f.type!=='devis');
    const p=parcours('qA');
    return {fini:p.fini,passes:p.passes,
      devis:p.jalons.filter(j=>j.k==='devis')[0].etat,
      cur:p.courant&&p.courant.k,av:p.avance}; });
  A(r.devis==='depasse','un jalon resté ouvert que la suite a dépassé est dit « passé outre »',JSON.stringify(r));
  A(r.fini===true&&r.cur==null,'il ne devient pas le jalon courant d’un dossier livré et clos',JSON.stringify(r));
  A(r.passes.indexOf('Devis établi')>=0&&r.av<100,'le parcours le nomme, et l’avancement reste honnête',JSON.stringify(r));

  // ---------- 4. le contrôle de mise en marche ----------
  r=await ev(()=>{ const R=mepControle();
    return {sections:R.sections.length,graves:R.graves,pret:R.pret,
      quoi:R.sections.reduce((a,s)=>a.concat(s.constats.map(c=>c.quoi)),[])}; });
  A(r.sections===10,'le contrôle passe dix examens',JSON.stringify(r.sections));
  A(r.quoi.indexOf('Fiche du cabinet incomplète')>=0,'il voit que la fiche du cabinet est incomplète',JSON.stringify(r.quoi));

  // un défaut posé exprès doit être trouvé
  r=await ev(()=>{
    DB.dossiers.push({id:'dF',ref:'AEM-2026-000101',numeroDossier:'AEM-2026-000101',clientIds:['cB'],pieces:{},docs:{}});
    const R=mepControle();
    const q=R.sections.reduce((a,s)=>a.concat(s.constats.map(c=>c.quoi)),[]);
    DB.dossiers=DB.dossiers.filter(d=>d.id!=='dF');
    return {q,graves:R.graves}; });
  A(r.q.indexOf('Numéro attribué deux fois')>=0,'un numéro attribué deux fois est trouvé',JSON.stringify(r.q));
  A(r.graves>0,'le contrôle refuse de déclarer prêt un logiciel qui ne l’est pas');

  // le remplissage des documents est réellement relu
  r=await ev(()=>{
    const d=DB.dossiers.filter(x=>x.id==='dB')[0];
    window.espDocsRequis=()=>[{k:'t1',l:'Acte de test'}];
    window.espDocHTML=()=>'<p>Le gérant undefined demeurant à NaN.</p>';
    d.docs={t1:{genere:true}};
    const D=mepDocsDefauts();
    return {n:D.defauts.length,ex:D.examines,quoi:D.defauts.map(x=>x.quoi)}; });
  A(r.ex>0&&r.n>=2,'les documents générés sont relus, pas supposés corrects',JSON.stringify(r));
  A(r.quoi.some(x=>/undefined/.test(x))&&r.quoi.some(x=>/NaN/.test(x)),
    'un champ non rempli et un calcul impossible sont nommés',JSON.stringify(r.quoi));

  r=await ev(()=>{ window.espDocHTML=()=>'<p>Le gérant Jean Dupont demeurant à Paris.</p>';
    const D=mepDocsDefauts(); return D.defauts.length; });
  A(r===0,'un document correctement rempli ne déclenche rien');

  // l'affichage de chaque écran est mesuré
  r=await ev(()=>{ const R=mepAffichage();
    return {ecrans:R.ecrans,anos:R.anomalies.length,
      d:R.anomalies.slice(0,4).map(a=>a.page+':'+a.quoi+':'+a.detail)}; });
  A(r.ecrans>=6,'tous les écrans sont réellement rendus et mesurés',JSON.stringify(r.ecrans));
  A(r.anos===0,'aucun débordement, aucun élément hors cadre, aucun texte illisible',JSON.stringify(r.d));

  // le contrôle s'ouvre et se conduit depuis son bouton, sans se perdre
  await ev(()=>{ state.page='params'; render(); mepOuvrir(); });
  await pg.waitForTimeout(700);
  r=await ev(()=>({ouverte:!!document.querySelector('#ov.show'),
    bouton:!!document.querySelector('#ov-b button[onclick*="mepLancerAffichage"]')}));
  A(r.ouverte&&r.bouton,'le contrôle s’ouvre en fenêtre, avec le bouton de mesure de l’affichage',JSON.stringify(r));
  await pg.click('#ov-b button[onclick*="mepLancerAffichage"]');
  await pg.waitForTimeout(3500);
  r=await ev(()=>{ const b=document.getElementById('ov-b');
    return {ouverte:!!document.querySelector('#ov.show'),
      res:((b?b.innerText:'').match(/\d+ écran\(s\) mesurés[^\n]*/)||[''])[0]}; });
  A(r.ouverte&&/mesurés/.test(r.res),
    'mesurer l’affichage relance chaque écran puis revient au contrôle, sans le perdre',JSON.stringify(r));
  A(/aucun débordement/.test(r.res),'et il annonce le résultat de la mesure',r.res);
  await ev(()=>{ try{closeModal();}catch(e){} });

  // ---------- 5. le point hebdomadaire se prépare pour la semaine achevée ----------
  r=await ev(()=>{ const j=new Date().getDay();
    const s=hebdoDefautSem();
    const L=new Date(); const dec=(L.getDay()+6)%7; L.setHours(0,0,0,0); L.setDate(L.getDate()-dec);
    const lundiCourant=L.toISOString().slice(0,10);
    return {jour:j,sem:s,lundiCourant,
      attendu:(j===1||j===2)?'semaine achevée':'semaine en cours'}; });
  A((r.jour===1||r.jour===2)?(r.sem&&r.sem<r.lundiCourant):(r.sem===null),
    'le lundi et le mardi, le point porte sur la semaine achevée ; sinon sur la semaine en cours',JSON.stringify(r));

  // ---------- 6. rien n'a cassé ----------
  await ev(()=>{ state.page='demandes'; render(); });
  A(errs.length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));

  await pg.screenshot({path:'v715-suivi.png'});
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
