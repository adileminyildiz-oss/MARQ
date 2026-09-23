/**
 * Mar'q — Circuit de la formalité (v721)
 *
 * Trois pièces manquaient au circuit décrit par le cabinet ; ce test les fige.
 *  1. La qualification : cas simple → formulaire, cas complexe (plusieurs
 *     associés, holding, activité réglementée, apports en nature) → rendez-vous.
 *     Rien ne part vers le client sans un clic humain.
 *  2. Le contrôle humain en cinq points, signé, caduc dès que les actes changent.
 *  3. Le tableau des dix statuts, lu dans l'état réel du dossier.
 * La fabrique de dossiers est celle de la suite Traitement (traudit).
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  p.on('dialog',d=>d.accept());
  await p.goto(URL_APP);
  await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'test'; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.open=()=>({close(){},focus(){},document:{write(){},close(){}}}); try{ ['demandes','agenda','fiscal','formulaire','espace'].forEach(id=>modPauseSet(id,false)); }catch(e){}
  DB.demandes=[]; DB.dossiers=[]; DB.clients=[]; DB.factures=DB.factures||[]; DB.parametres.formDrafts=[];
  // fabrique de dossiers complets via le Formulaire
  window.__mk=function(type,extra){ formReset(); formNature('creation'); formType(type); const o=window.__formData; const den=(extra&&extra.den)||('SOC '+type.toUpperCase());
    Object.assign(o,{societe:{denomination:den,capital:'5000',objet:'Location de logements meublés',debut:'2026-10-01',regime:'IS'},titres:{nominal:'10',nbTitres:'500'},apports:{numeraire:'5000',nature:'0'},siege:{rue:'14 rue des Jacobins',cp:'80000',ville:'Amiens',type:'domiciliation'},direction:{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'14 rue des Jacobins 80000 Amiens',fonction:''},dirx:{pereNom:'Jean LAMBERT',mereNom:'Marie DURAND',secu:'288038002104512',typePiece:'cni'},contact:{email:'s.lambert@logis.fr',tel:'0612345678'},dates:{dateActe:'2026-09-14',villeSignature:'Amiens'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'5000',date:'2026-09-10'},
      associes:(type==='sasu'||type==='eurl')?[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'500',apport:'5000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'}]:[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'300',apport:'3000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'},{civilite:'M.',prenom:'Marc',nom:'LAMBERT',parts:'200',apport:'2000',naissance:'1985-07-02',lieuNaissance:'Lille',pays:'France',nationalite:'Française',adresse:'Lille'}]});
    const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id,ref:d&&(d.numeroDossier||d.ref)}; };
  window.__mkModif=function(kind){ formReset(); formNature('modification'); formModifKind(kind); const o=window.__formData; o.contact={email:'eric@garage-dupont.fr',tel:'0611223344'}; o.modif={kind,societe:{denomination:'GARAGE DUPONT',forme:'sarl',siren:'812345678',rcsVille:'Amiens',siege:'5 rue Neuve',cp:'80000',ville:'Amiens'},dates:{acte:'2026-09-14',effet:'2026-10-01',ville:'Amiens'},signataire:{prenom:'Éric',nom:'DUPONT'},nouveau:{siege:'3 quai du Canal',cp:'80000',ville:'Amiens',prenom:'Paul',nom:'DUPONT',naissance:'1990-01-01',adresse:'Amiens',denomination:'GARAGE DUPONT & FILS',objet:'Réparation automobile',capital:'20000',formeNouvelle:'sas',cedant:'Éric DUPONT',cessionnaire:'Paul DUPONT',nbTitres:'100',prix:'10000',liquidateur:'Éric DUPONT',siegeLiquidation:'Amiens',dateClotureLiq:'2026-12-31',ancienneCloture:'31/12',nouvelleCloture:'30/06'}}; const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id}; };
});

  // ---------- 1. qualification ----------
  let r=await ev(()=>{
    const q=(o)=>qualifDemande(Object.assign({id:'x'},o));
    return {
      simple:q({subject:'Création SASU',body:'Je souhaite créer une SASU de conseil en informatique, je serai associé unique.'}),
      trois:q({subject:'Création SAS',body:'Nous sommes trois associés et voulons créer une SAS.'}),
      holding:q({subject:'Holding',body:'Création d\'une holding pour détenir mes parts.'}),
      immo:q({subject:'Création',body:'Je lance une agence immobilière.'}),
      btp:q({subject:'Création SARL',body:'Entreprise de maçonnerie générale.'}),
      apport:q({subject:'Création SAS',body:'Je ferai un apport en nature d\'un véhicule utilitaire.'}),
      unique:q({subject:'SASU',body:'Associé unique, activité de formation.'})
    }; });
  A(r.simple.niveau==='simple','une SASU de conseil sans associé est un cas simple',JSON.stringify(r.simple));
  A(r.trois.niveau==='complexe'&&/associés/.test(r.trois.raisons.join()),'trois associés : cas complexe, et il le dit',JSON.stringify(r.trois));
  A(r.holding.raisons.indexOf('Holding')>=0,'une holding est reconnue',JSON.stringify(r.holding));
  A(/immobilier/.test(r.immo.raisons.join()),'une agence immobilière est une activité réglementée',JSON.stringify(r.immo));
  A(/bâtiment/.test(r.btp.raisons.join()),'la maçonnerie appelle qualification et décennale',JSON.stringify(r.btp));
  A(r.apport.raisons.indexOf('Apports en nature')>=0,'un apport en nature est reconnu',JSON.stringify(r.apport));
  A(r.unique.niveau==='simple','« associé unique » ne déclenche pas « plusieurs associés »',JSON.stringify(r.unique));

  // la carte dans la vue d'une demande, et ses deux actions
  r=await ev(()=>{
    DB.demandes.push({id:'qx',clientNom:'ALPHA',clientEmail:'a@alpha.fr',subject:'Création SAS',
      body:'Nous sommes deux associés pour une SAS de restauration.',serviceSouhaite:'Création SAS',date:'2026-09-20',ts:Date.now(),statut:'Nouveau'});
    const h=demVueDetail('qx');
    let fq=null; const _q=window.demQuestionnaire; window.demQuestionnaire=id=>{ fq=id; };
    qualifFormulaire('qx'); window.demQuestionnaire=_q;
    const d=DB.demandes.find(x=>x.id==='qx'); const apresForm=JSON.parse(JSON.stringify(d.qualif));
    qualifRdv('qx');
    const m=document.getElementById('modal')||document.body;
    const val=i=>{ const el=document.getElementById(i); return el?el.value:null; };
    const out={carte:h.indexOf('mq-q-card')>=0, complexe:/Cas complexe/.test(h), rdvPrim:/btn btn-pri" onclick="qualifRdv/.test(h),
      fq, apresForm, mail:val('agw-mail'), obj:val('agw-obj'), qualif:d.qualif};
    try{ closeModal(); }catch(e){}
    return out; });
  A(r.carte&&r.complexe,'la vue de la demande porte la qualification',JSON.stringify(r));
  A(r.rdvPrim,'pour un cas complexe, l’action recommandée est le rendez-vous');
  A(r.fq==='qx'&&r.apresForm.action==='formulaire'&&r.apresForm.suivi===false,
    'le formulaire reste possible, et Mar’q retient que la recommandation n’a pas été suivie',JSON.stringify(r.apresForm));
  A(r.mail==='a@alpha.fr'&&/qualification/.test(r.obj||''),'le rendez-vous s’ouvre pré-rempli : l’envoi reste un clic humain',JSON.stringify({m:r.mail,o:r.obj}));
  A(r.qualif.action==='rdv'&&r.qualif.suivi===true,'la décision est tracée',JSON.stringify(r.qualif));

  // ---------- 2. contrôle humain ----------
  r=await ev(()=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); window.__sid=d.id;
    docGenAll(d.id);
    const e0=controleHumainEtat(d);
    window.__toasts=[]; chVerdict(d.id,'conforme'); const refus=controleHumainEtat(d).etat;
    window.__toasts=[]; chVerdict(d.id,'a_corriger'); const sansNote=controleHumainEtat(d).etat;
    ['juridique','orthographe','fiscal','activite'].forEach(k=>chPoint(d.id,k,true));
    chVerdict(d.id,'conforme'); const quatre=controleHumainEtat(d).etat;
    chPoint(d.id,'capital',true); chVerdict(d.id,'conforme'); const e1=controleHumainEtat(d);
    const trace=(DB.audit||[]).some(a=>a.action==='Contrôle humain');
    return {e0:e0.etat,total:e0.total,refus,sansNote,quatre,e1}; });
  A(r.e0==='afaire'&&r.total===5,'un dossier neuf : contrôle à faire, cinq points pour une SAS',JSON.stringify(r));
  A(r.refus==='afaire','« Conforme » est refusé tant que les points ne sont pas cochés',JSON.stringify(r));
  A(r.sansNote==='afaire','« À corriger » exige de dire quoi corriger',JSON.stringify(r));
  A(r.quatre==='afaire','quatre points sur cinq ne suffisent pas',JSON.stringify(r));
  A(r.e1.etat==='conforme'&&r.e1.ts>0,'cinq sur cinq : conforme, daté',JSON.stringify(r.e1));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__sid);
    const avant=controleHumainEtat(d).etat;
    d.docs.statuts={genere:true,date:'2026-09-24',v:2}; const apres=controleHumainEtat(d).etat;
    const ligne=dossierStatuts(d).lignes.find(x=>x.k==='controle');
    chRevoir(d.id); ['juridique','orthographe','fiscal','activite','capital'].forEach(k=>chPoint(d.id,k,true));
    const el=document.createElement('textarea'); el.id='mq-ch-note-'+d.id; el.value='Adresse du siège erronée'; document.body.appendChild(el);
    chVerdict(d.id,'a_corriger'); el.remove();
    const cor=controleHumainEtat(d); const ligne2=dossierStatuts(d).lignes.find(x=>x.k==='controle');
    return {avant,apres,ligne,cor,ligne2}; });
  A(r.avant==='conforme'&&r.apres==='caduc','un acte régénéré rend le contrôle caduc',JSON.stringify(r));
  A(r.ligne.etat==='non'&&/chang/.test(r.ligne.detail),'le tableau le dit : les actes ont changé',JSON.stringify(r.ligne));
  A(r.cor.etat==='a_corriger'&&r.ligne2.etat==='corriger'&&/siège/.test(r.ligne2.detail),
    '« À corriger » porte la note jusque dans le tableau',JSON.stringify(r.ligne2));

  // le point « capital » est sans objet quand il n'y a pas de capital en jeu
  r=await ev(()=>{ const m=window.__mkModif('siege'); const d=DB.dossiers.find(x=>x.id===m.id);
    return {total:controleHumainEtat(d).total}; });
  A(r.total===4,'un transfert de siège : quatre points, pas de vérification du capital',JSON.stringify(r));

  // ---------- 3. les dix statuts ----------
  r=await ev(()=>{ const m=window.__mk('sarl'); const d=DB.dossiers.find(x=>x.id===m.id); window.__tid=d.id;
    const R=dossierStatuts(d); return {n:R.lignes.length,k:R.lignes.map(x=>x.k),
      e:Object.fromEntries(R.lignes.map(x=>[x.k,x.etat])),faits:R.faits,total:R.total}; });
  A(r.n===10,'dix lignes, dans l’ordre du circuit',JSON.stringify(r.k));
  A(r.k.join()==='formulaire,pieces,actes,controle,signature,capital,inpi,depot,kbis,cloture','l’ordre est celui du cabinet',r.k.join());
  A(r.e.formulaire==='oui','un dossier saisi dans le Formulaire a son formulaire',JSON.stringify(r.e));
  /* Les actes sont générés dès la création du dossier (phase 5, production automatique) :
     « Oui » est la vérité, pas une faveur. Le reste n'a aucune preuve. */
  A(r.e.actes==='oui','les actes générés à la création du dossier comptent',JSON.stringify(r.e));
  A(r.e.controle==='non'&&r.e.signature==='non'&&r.e.inpi==='non'&&r.e.kbis==='non'&&r.e.cloture==='non',
    'rien d’autre n’est déclaré sans preuve',JSON.stringify(r.e));
  A(r.e.capital==='non','une SARL doit déposer son capital',JSON.stringify(r.e));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__tid);
    docGenAll(d.id); ['juridique','orthographe','fiscal','activite','capital'].forEach(k=>chPoint(d.id,k,true)); chVerdict(d.id,'conforme');
    a3ToutSigner(d.id);
    const R1=dossierStatuts(d), e1=Object.fromEntries(R1.lignes.map(x=>[x.k,x.etat])), inpi1=R1.lignes.find(x=>x.k==='inpi').detail;
    d.attest=d.attest||{}; ['capital','annonce'].forEach(t=>{ d.attest[t]=d.attest[t]||{}; d.attest[t].fichier={name:t+'.pdf',ts:Date.now()}; at4Valider(d.id,t); });
    const R2=dossierStatuts(d), e2=Object.fromEntries(R2.lignes.map(x=>[x.k,x.etat]));
    return {e1,inpi1,e2}; });
  A(r.e1.actes==='oui'&&r.e1.controle==='oui'&&r.e1.signature==='oui','actes générés, contrôlés et signés passent à « Oui »',JSON.stringify(r.e1));
  A(r.e1.inpi==='non'&&/capital/.test(r.inpi1),'sans attestation de capital, le dossier INPI n’est pas prêt, et il dit pourquoi',r.inpi1);
  A(r.e2.capital==='oui','l’attestation vérifiée fait passer le capital à « Oui »',JSON.stringify(r.e2));

  r=await ev(()=>{
    const micro=Object.fromEntries(dossierStatuts(Object.assign({id:'mz',formaliteType:'creation_micro',docs:{},pieces:{},wf:{}})).lignes.map(x=>[x.k,x.etat]));
    DB.dossiers.push({id:'mk',ref:'AEM-2026-000199',clientIds:[],formalite:'Dépôt de marque INPI',pieces:{},docs:{},wf:{}});
    const marque=Object.fromEntries(dossierStatuts('mk').lignes.map(x=>[x.k,x.etat]));
    return {micro,marque}; });
  A(r.micro.capital==='na','une micro-entreprise n’a pas de capital à déposer',JSON.stringify(r.micro));
  A(r.marque.inpi==='na'&&r.marque.depot==='na'&&r.marque.kbis==='na','un dépôt de marque n’a ni dépôt au greffe ni Kbis',JSON.stringify(r.marque));

  // ---------- 4. l'écran ----------
  r=await ev(()=>{ const out={};
    state.page='espace'; state.espaceDossier=window.__tid;
    state.espTab='actes'; render(); out.actes=!!document.querySelector('#view .mq-ch-card');
    { const d=DB.dossiers.find(x=>x.id===window.__tid); chRevoir(d.id); chPoint(d.id,'juridique',false); render();
      const bt=[...document.querySelectorAll('#view .mq-ch-acts .btn')].find(x=>/Conforme/.test(x.textContent));
      out.attente=bt?parseFloat(getComputedStyle(bt).opacity):null; }
    state.espTab='demande'; render(); out.dem=!!document.querySelector('#view .mq-st-card');
    out.lignes=document.querySelectorAll('#view .mq-st-row').length;
    state.espTab='cloture'; render(); out.clo=!!document.querySelector('#view .mq-st-card');
    state.espTab='pieces'; render(); out.piecesSans=!document.querySelector('#view .mq-st-card')&&!document.querySelector('#view .mq-ch-card');
    return out; });
  A(r.actes,'l’onglet Actes porte le contrôle humain',JSON.stringify(r));
  A(r.attente!==null&&r.attente<0.6,'« Conforme » se voit en attente tant que la relecture n’est pas complète',JSON.stringify(r.attente));
  A(r.dem&&r.lignes===10,'l’onglet Demande porte le tableau des dix statuts',JSON.stringify(r));
  A(r.clo,'l’onglet Clôture le reprend, pour vérifier la complétude',JSON.stringify(r));
  A(r.piecesSans,'les autres onglets restent tels quels',JSON.stringify(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
