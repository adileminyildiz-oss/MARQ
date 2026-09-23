/**
 * Mar'q — Contrôle zéro défaut et double validation avant dépôt (v722)
 *
 * Avant v722, un dépôt se constatait même avec des pièces manquantes. Ce test
 * fige le verrou : aucun des quatre chemins de dépôt ne passe tant que le
 * dossier a une anomalie ou qu'il manque l'une des deux validations.
 *
 * Mar'q n'ayant pas d'identité par utilisateur, le niveau 2 repose sur le code
 * personnel du responsable conformité : le test vérifie qu'il n'est jamais
 * conservé en clair, et qu'on ne peut pas prendre la place du responsable.
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

  // ---------- 1. un dossier neuf ne part pas ----------
  let r=await ev(()=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); window.__id=d.id;
    const Z=zeroDefaut(d);
    im5Depose(d.id); const modal=(document.getElementById('ov')||{}).textContent||'';
    try{ closeModal(); }catch(e){}
    return {ok:Z.ok,n:Z.anomalies.length,k:Z.anomalies.map(a=>a.k),depose:!!(d.immat&&d.immat.depose),modal:/Dépôt impossible/.test(modal)}; });
  A(r.ok===false&&r.n>=4,'un dossier neuf : dépôt impossible, anomalies nommées ('+r.n+')',JSON.stringify(r.k));
  A(r.k.indexOf('niveau1')>=0&&r.k.indexOf('niveau2')>=0,'les deux validations manquent',JSON.stringify(r.k));
  A(r.depose===false&&r.modal,'le constat de dépôt est refusé, et la fenêtre dit pourquoi',JSON.stringify(r));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    inpiSetStatut(d.id,'depose'); const s=(d.inpiSuivi&&d.inpiSuivi.statut)||'afaire';
    try{ closeModal(); }catch(e){}
    let envoi=false; const _f=window.fetch; window.fetch=function(){ envoi=true; return Promise.reject(new Error('x')); };
    inpiDeposer(d.id); window.fetch=_f; try{ closeModal(); }catch(e){}
    let fen=''; espDepotInpi(d.id); fen=(document.getElementById('ov')||{}).textContent||''; try{ closeModal(); }catch(e){}
    return {s,envoi,fen:/Dépôt impossible/.test(fen)}; });
  A(r.s==='afaire','le statut manuel « déposé » est refusé',JSON.stringify(r));
  A(r.envoi===false,'l’envoi par le proxy du Guichet unique n’est même pas tenté',JSON.stringify(r));
  A(r.fen,'la fenêtre de dépôt Guichet unique affiche « Dépôt impossible »');

  // ---------- 2. le dossier mené jusqu'au seuil du dépôt ----------
  // le parcours complet jusqu'au seuil du dépôt, réutilisé plus bas
  await ev(()=>{ window.__mener=function(id){ const d=DB.dossiers.find(x=>x.id===id);
    trwValider(id,'demande');
    d.attachments=[{name:'cni-lambert.jpg',msgId:'x'},{name:'edf-domicile.pdf',msgId:'x'},{name:'rib.pdf',msgId:'x'}];
    enregPieces(d).forEach(pc=>{ if(pc.origine==='client') enregPieceToggle(id,pc.k,true); });
    [...new Set(e2Pieces(d).map(a=>demAttCat(a).key))].forEach(k=>e3Certifier(id,k)); trwValider(id,'pieces');
    docGenAll(id); docApproveAll(id);
    ['juridique','orthographe','fiscal','activite','capital'].forEach(k=>chPoint(id,k,true)); chVerdict(id,'conforme');
    a3ToutSigner(id); trwValider(id,'actes');
    d.attest=d.attest||{}; ['capital','annonce'].forEach(t=>{ d.attest[t]=d.attest[t]||{}; d.attest[t].fichier={name:t+'.pdf',ts:Date.now()}; at4Valider(id,t); });
    trwValider(id,'attestations'); return d; }; });
  r=await ev(()=>{ const d=window.__mener(window.__id);
    const Z=zeroDefaut(d);
    return {ok:Z.ok,pret:Z.pretN2,reste:Z.anomalies.map(a=>a.k+(a.detail?(' ('+a.detail+')'):''))}; });
  A(r.pret===true,'toutes les anomalies levées : le niveau 2 devient possible',JSON.stringify(r.reste));
  A(r.ok===false&&r.reste.length===1&&/^niveau2/.test(r.reste[0]),'seule la validation du responsable manque encore',JSON.stringify(r.reste));

  // ---------- 3. le responsable conformité ----------
  r=await ev(async()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    const sans=await conformiteValider(d.id,'123456');
    const court=await conformiteDesigner('Léa M.','1234','1234');
    const diff=await conformiteDesigner('Léa M.','482913','482914');
    const bon=await conformiteDesigner('Léa M.','482913','482913');
    const clair=JSON.stringify(DB).indexOf('482913')>=0;
    const vol=await conformiteDesigner('Karim D.','111111','111111','000000');
    const nom=DB.parametres.conformite.nom;
    const faux=await conformiteValider(d.id,'999999');
    const zf=zeroDefaut(d).ok;
    const vrai=await conformiteValider(d.id,'482913');
    const Z=zeroDefaut(d);
    return {sans,court,diff,bon,clair,vol,nom,faux,zf,vrai,ok:Z.ok,n2:Z.n2}; });
  A(r.sans.ok===false,'sans responsable désigné, aucun niveau 2',JSON.stringify(r.sans));
  A(r.court.ok===false&&r.diff.ok===false&&r.bon.ok===true,'le code fait six chiffres et se saisit deux fois à l’identique',JSON.stringify([r.court,r.diff,r.bon]));
  A(r.clair===false,'le code n’est conservé nulle part en clair');
  A(r.vol.ok===false&&r.nom==='Léa M.','sans l’ancien code, personne ne prend la place du responsable',JSON.stringify(r.vol));
  A(r.faux.ok===false&&r.zf===false,'un mauvais code ne valide rien',JSON.stringify(r.faux));
  A(r.vrai.ok===true&&r.ok===true&&r.n2.nom==='Léa M.','le bon code : niveau 2 validé, dépôt autorisé',JSON.stringify(r.n2));

  // ---------- 4. une validation ne couvre que ce qui a été validé ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    const s0=d.sign.statuts; delete d.sign.statuts; const apresRetrait=zeroDefaut(d);
    d.sign.statuts=s0; const retour=zeroDefaut(d);
    return {cad:apresRetrait.ok===false&&apresRetrait.n2.caduc, retour:retour.ok}; });
  A(r.cad,'une signature retirée rend le niveau 2 caduc',JSON.stringify(r));
  A(r.retour,'l’état validé retrouvé, la validation redevient valable',JSON.stringify(r));

  // ---------- 5. le dépôt passe ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    im5Depose(d.id); try{ closeModal(); }catch(e){}
    const L=Object.fromEntries(dossierStatuts(d).lignes.map(x=>[x.k,x.etat]));
    const audit=(DB.audit||[]).filter(a=>a.action==='Conformité'||a.action==='Dépôt refusé').map(a=>a.action);
    return {depose:!!(d.immat&&d.immat.depose),L,audit}; });
  A(r.depose,'zéro défaut et double validation : le dépôt est constaté',JSON.stringify(r));
  A(r.L.depot==='oui'&&r.L.inpi==='oui','le tableau des statuts le reconnaît : dépôt effectué, dossier INPI complet',JSON.stringify(r.L));
  A(r.audit.indexOf('Dépôt refusé')>=0&&r.audit.indexOf('Conformité')>=0,'refus et validations sont au journal d’audit',JSON.stringify(r.audit));

  // ---------- 6. le tableau suit le zéro défaut avant dépôt ----------
  r=await ev(()=>{ const m=window.__mk('sarl'); const d=DB.dossiers.find(x=>x.id===m.id);
    const x=dossierStatuts(d).lignes.find(l=>l.k==='inpi'); return x; });
  A(r.etat==='non'&&/anomalie/.test(r.detail),'« Dossier INPI » compte les anomalies du zéro défaut',JSON.stringify(r));

  // ---------- 7. l'écran ----------
  // un dossier arrivé à l'étape Immatriculation, sans validation de niveau 2
  r=await ev(()=>{ const m=window.__mk('sas'); const d=window.__mener(m.id);
    state.page='espace'; state.espaceDossier=d.id; state.espTab='immatriculation'; render();
    const v=document.getElementById('view');
    const panel=v.querySelector('.esp-tabpanel[data-tab="immatriculation"]');
    const c=panel&&panel.querySelector('.mq-zd-card'), im=panel&&panel.querySelector('.im5-card');
    const avant=!!(c&&im&&(c.compareDocumentPosition(im)&Node.DOCUMENT_POSITION_FOLLOWING));
    const h=c?c.getBoundingClientRect().height:0;
    const ailleurs=[...v.querySelectorAll('.mq-zd-card')].filter(x=>!x.closest('.esp-tabpanel[data-tab="immatriculation"]')).length;
    return {etape:state.espTab,carte:!!c,avant,visible:h>0,ailleurs,
      rouge:!!(c&&/Dépôt impossible/.test(c.textContent)),niv:c?c.querySelectorAll('.mq-zd-niv').length:0,
      seule:zeroDefaut(d).anomalies.map(a=>a.k)}; });
  A(r.etape==='immatriculation'&&r.carte&&r.visible,'la carte est dans le panneau de l’étape Immatriculation, et visible',JSON.stringify(r));
  A(r.avant&&r.ailleurs===0,'elle précède le constat de dépôt, et n’apparaît nulle part ailleurs',JSON.stringify(r));
  A(r.rouge&&r.niv===2&&r.seule.join()==='niveau2','« Dépôt impossible », les deux niveaux, et la seule raison : le niveau 2',JSON.stringify(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
