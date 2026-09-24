/**
 * Mar'q — De la création au dossier administratif (v754)
 *
 * Fige : quand le K-bis d'une création est reçu, la société est inscrite
 * à l'Administration sans ressaisie (fiche complétée depuis le dossier,
 * suivi depuis l'immatriculation, K-bis daté, statuts, souscriptions,
 * bénéficiaires effectifs ≥ 25 %, régime de TVA, K-bis au coffre), une
 * seule fois ; une modification n'ouvre rien ; les créations antérieures
 * sont proposées sur la page de choix, pas ouvertes d'office.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  await p.waitForFunction(()=>!!(DB.parametres&&DB.parametres.admCreaDepuis),{timeout:10000});
  const ev=(f,a)=>p.evaluate(f,a);
  const dossier=`(id,cid,nom,immat,type)=>({id,numeroDossier:'CR-2026-0'+id.slice(-1),formaliteType:type||'creation_sas',clientIds:[cid],historique:[],
    intake:{type:'sas',societe:{denomination:nom,capital:'5000',objet:'Maçonnerie générale'},direction:{prenom:'Karim',nom:'Benali',fonction:'Président'},beneficiaires:[{prenom:'Lucie',nom:'Martin'}]},
    fiscal:{tva:'rs'},immat:immat?{kbis:{nom:'kbis.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0=',ts:new Date('2026-09-10T10:00:00').getTime()},verifie:new Date('2026-09-12T10:00:00').getTime(),siren:'552100554'}:{}})`;
  await ev(src=>{ const mk=eval(src); DB.clients=[{id:'c1',denomination:'NOVA BTP',associes:[{nom:'Karim Benali',parts:300},{nom:'Sophie Benali',parts:150},{nom:'Paul Vidal',parts:50}],docVars:{dateActe:'2026-09-01',finExo:'31/12/2027'}},
      {id:'c2',clientType:'entreprise',denomination:'ALPHA',forme:'SARL'}];
    DB.dossiers=[mk('d1','c1','NOVA BTP',false),mk('d2','c2','ALPHA',true,'transfert_siege')]; DB.admin={}; DB.parametres.adminInscrits=[]; save(); render(); },dossier);
  let r=await ev(()=>({ins:DB.parametres.adminInscrits.slice(),a1:!!DB.dossiers[0].admAuto,a2:!!DB.dossiers[1].admAuto}));
  A(!r.ins.length&&!r.a1&&!r.a2,'avant le K-bis, et pour une modification : rien n’est ouvert',JSON.stringify(r));

  // K-bis reçu
  await ev(()=>{ DB.dossiers[0].immat={kbis:{nom:'kbis.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0=',ts:new Date('2026-09-10T10:00:00').getTime()},verifie:new Date('2026-09-12T10:00:00').getTime(),siren:'552100554'}; save(); render(); });
  r=await ev(()=>{ const c=DB.clients.find(x=>x.id==='c1'), a=DB.admin.c1||{}, L=a.legal||{}; return {ins:DB.parametres.adminInscrits.slice(),c:{t:c.clientType,f:c.forme,s:c.siren,di:c.dateImmat,cl:c.clotureExercice,rg:c.regime,act:c.activites,pr:c.president,cap:c.capital},
      sd:a.suiviDepuis,kb:L.kbis,actes:(L.actes||[]).map(x=>x.titre+'|'+x.date),tit:(L.titres||[]).map(x=>x.a+':'+x.nb),be:(L.be||[]).map(x=>x.nom+':'+x.pct),tva:(a.fiscal||{}).tva,doc:((a.doc||{}).docs||[]).map(x=>x.titre+'|'+!!x.fichier),auto:DB.dossiers[0].admAuto,h:DB.dossiers[0].historique[0]}; });
  A(r.ins.includes('c1')&&r.auto&&r.auto.clientId==='c1','K-bis reçu : société inscrite à l’Administration automatiquement',JSON.stringify({ins:r.ins,auto:r.auto}));
  A(r.c.t==='entreprise'&&r.c.f==='SAS'&&r.c.s==='552100554'&&r.c.di==='2026-09-12'&&r.c.cl==='31/12'&&/sociétés/.test(r.c.rg)&&r.c.act[0]==='Maçonnerie générale'&&r.c.pr==='Karim Benali','fiche Entreprise complétée depuis la création (forme, SIREN, immatriculation, clôture, régime, activité, dirigeant)',JSON.stringify(r.c));
  A(r.sd==='2026-09-12','suivi depuis la date d’immatriculation',r.sd);
  A(r.kb.date==='2026-09-10'&&r.actes.includes('Statuts constitutifs|2026-09-01'),'LEGAL : K-bis daté, statuts constitutifs au registre des actes',JSON.stringify({kb:r.kb,actes:r.actes}));
  A(r.tit.join()==='Karim Benali:300,Sophie Benali:150,Paul Vidal:50'&&r.be.includes('Karim Benali:60')&&r.be.includes('Sophie Benali:30')&&!r.be.some(x=>/Paul/.test(x))&&r.be.includes('Lucie Martin:'),'LEGAL : souscriptions au registre des titres, bénéficiaires effectifs ≥ 25 % et déclarés à la création',JSON.stringify({tit:r.tit,be:r.be}));
  A(r.tva.regime==='rs'&&r.doc.some(x=>/^Extrait K-bis/.test(x)&&/true$/.test(x)),'FISCAL : TVA au réel simplifié reprise ; DOC : K-bis versé au coffre',JSON.stringify({tva:r.tva,doc:r.doc}));
  A(/Dossier administratif ouvert/.test(r.h&&r.h.t),'trace sur le dossier de formalité',JSON.stringify(r.h));

  // analysé : premier bilan
  r=await ev(()=>{ const b=admBilanGlobal('c1'); go('entreprise'); admEntChoisir('c1'); const t=document.getElementById('view').innerText; return {n:b.alertes.length,dom:b.dom.map(d=>d[0]),t:/NOVA BTP/.test(t)&&/Suivi depuis/.test(t)&&/12\/09\/2026/.test(t)}; });
  A(r.dom.includes('Juridique')&&r.dom.includes('Fiscal')&&r.t,'premier bilan calculé et société ouverte sur la page Administration',JSON.stringify(r));

  // une seule fois
  r=await ev(()=>{ const n=DB.admin.c1.legal.actes.length, t=DB.admin.c1.legal.titres.length; DB.dossiers[0].historique=[]; save(); render(); admCreaDetecter(); return {n2:DB.admin.c1.legal.actes.length,t2:DB.admin.c1.legal.titres.length,n,t,h:DB.dossiers[0].historique.length}; });
  A(r.n2===r.n&&r.t2===r.t&&r.h===0,'ouverture faite une seule fois',JSON.stringify(r));

  // modification : jamais
  r=await ev(()=>({ins:DB.parametres.adminInscrits.includes('c2'),a:DB.dossiers[1].admAuto}));
  A(!r.ins&&!r.a,'transfert de siège (modification) : aucun dossier administratif ouvert',JSON.stringify(r));

  // créations antérieures : proposées, pas ouvertes
  r=await ev(src=>{ const mk=eval(src); delete DB.parametres.admCreaDepuis; DB.clients.push({id:'c3',denomination:'OMEGA',associes:[]}); DB.dossiers.push(mk('d3','c3','OMEGA',true)); save(); admCreaDetecter();
      const a={ins:DB.parametres.adminInscrits.includes('c3'),anc:DB.dossiers[2].admAuto};
      go('cockpit'); go('entreprise'); const t=document.getElementById('view').innerText; a.carte=/Sociétés créées par le cabinet/.test(t)&&/OMEGA/.test(t);
      admCreaOuvrir('d3'); a.ins2=DB.parametres.adminInscrits.includes('c3'); a.cur=DB.parametres.adminEnt; a.auto=DB.dossiers[2].admAuto; return a; },dossier);
  A(!r.ins&&r.anc&&r.anc.ancien&&r.carte,'création antérieure : proposée sur la page de choix, non ouverte d’office',JSON.stringify(r));
  A(r.ins2&&r.cur==='c3'&&r.auto.clientId==='c3','« Ouvrir le dossier administratif » : inscrite et ouverte',JSON.stringify(r.auto));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
