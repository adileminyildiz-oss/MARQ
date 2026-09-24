/**
 * Mar'q — Fiche technique de création générée en fin de Formulaire (v757)
 *
 * Fige : bouton « Fiche technique » dans la barre d'actions (création
 * seulement) ; tous les moteurs d'analyse alimentent la fiche
 * (recommandation, pré-diagnostic, connaissances, contrôle 360°, services
 * post-création) ; rubriques complètes ; version client sans filiation ni
 * numéro de pièce ni IBAN, version cabinet complète ; échéancier daté
 * (CFE, approbation des comptes) ; contrôle nominal × titres = capital ;
 * activité réglementée reconnue ; fiche conservée sur le dossier créé,
 * présentée à l'enregistrement et reprise dans l'Administration.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  const Y=new Date().getFullYear();
  await ev((Y)=>{ window.toast=()=>{}; window.uiConfirm=(m,fn)=>fn&&fn(); DB.clients=[]; DB.dossiers=[]; DB.demandes=[]; save();
    window.__formData={type:'sas',nature:'creation',numeroDossier:'',
      societe:{denomination:'BATI-SUD CONSTRUCTION',sigle:'BSC',capital:'10000',objet:'Travaux de maçonnerie générale et de gros œuvre de bâtiment',regime:'IS',debut:Y+'-10-01'},
      siege:{rue:'4 avenue du Port',cp:'13002',ville:'Marseille',type:'Local commercial',bailleur:'SCI Les Docks'},
      direction:{civilite:'M.',prenom:'Karim',nom:'Benali',naissance:'1985-04-12',lieuNaissance:'Lyon',pays:'France',nationalite:'Française',adresse:'8 rue Paradis',fonction:'Président'},
      dirx:{cp:'13001',ville:'Marseille',typePiece:'Carte nationale d’identité',numPiece:'X4RT93KL2',pereNom:'Ahmed Benali',mereNom:'Nadia Haddad'},
      titres:{nominal:'10',nbTitres:'1000'},dates:{dateActe:Y+'-09-20',villeSignature:'Marseille',anneeExo:String(Y),finExo:(Y+1)+'-12-31',duree:'99',clotureAnnuelle:'31 décembre',rcsVille:'Marseille'},
      associes:[{civilite:'M.',prenom:'Karim',nom:'Benali',apport:'6000',parts:'600',role:'Président'},{civilite:'Mme',prenom:'Sonia',nom:'Petit',apport:'4000',parts:'400',role:'Associée'}],
      contact:{email:'k.benali@batisud.fr',tel:'0600000000'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'10000',date:Y+'-09-15',iban:'FR7630006000011234567890189'},
      apports:{numeraire:'10000',nature:'',tva:'Réel normal',regimeSocial:'Assimilé salarié',liberation:'Totale'},conjoint:{},cac:{},extra:{notes:'Client recommandé par la banque.'},
      beneficiaires:[{nom:'Karim Benali',detention:'60',vote:'60',controle:'Président'},{nom:'Sonia Petit',detention:'40',vote:'40'}],
      profil:{entourage:'plusieurs',nbAssocies:'2',activiteType:'artisanale',caPrev:'320000',beneficePrev:'40000',objectif:'patrimoine',remun:'mixte',protection:'forte',nbSalaries:'4',autreActivite:'aucune',famille:'marie',matrimonial:'communaute',horizon:'long',patrimoine:'oui',reglementee:'oui',vision:'protéger son patrimoine immobilier, embaucher des compagnons'}};
    state.page='formulaire'; render(); },Y);
  await p.waitForTimeout(500);

  let r=await ev(()=>({btn:!!document.querySelector('.fi-actions-r #fi-ft'),lbl:(document.querySelector('#fi-ft')||{}).textContent}));
  A(r.btn&&r.lbl==='Fiche technique','barre d’actions : bouton « Fiche technique » (création)',JSON.stringify(r));

  r=await ev(()=>{ const X=formFicheCalcul(window.__formData); return {reco:!!(X.reco&&X.reco.forme),pd:!!(X.pd&&X.pd.reco),kn:X.kn&&X.kn.items?X.kn.items.length:-1,c360:X.c360?X.c360.score:null,onb:X.onb&&X.onb.items?X.onb.items.filter(i=>i.pertinent).length:-1,regl:X.regl.map(f=>f.lbl),pct:X.pct,cs:X.cs.length,sv:X.seuils.franchiseServices}; });
  A(r.reco&&r.pd&&r.kn>0&&r.c360!=null&&r.onb>0&&r.cs>0,'tous les moteurs alimentent la fiche : recommandation, pré-diagnostic, connaissances, contrôle 360°, services, conseils',JSON.stringify(r));
  A(r.regl.length>0,'activité réglementée reconnue depuis l’objet social',JSON.stringify(r.regl));
  A(r.pct===100,'complétude du formulaire calculée (100 % sur cette saisie)',''+r.pct);

  r=await ev(()=>{ const X=formFicheCalcul(window.__formData), d=document.createElement('div'); d.innerHTML=formFicheHTML(X,'client'); const c=document.createElement('div'); c.innerHTML=formFicheHTML(X,'cabinet');
    const n=x=>x.replace(/[\u00a0\u202f]/g,' '); return {h:[...d.querySelectorAll('.sy-h')].map(x=>x.textContent),t:n(d.innerText||d.textContent),tc:n(c.textContent)}; });
  const req=['Synthèse','Identité juridique du projet','Dirigeant','Associés, capital et bénéficiaires effectifs','Profil du dirigeant et projet','Analyse approfondie et orientations possibles','Comparatif des structures','Repères fiscaux et sociaux','Activité réglementée','Obligations et formalités par organisme','Échéancier de la première année','Points de vigilance et risques','Conseils','Informations complémentaires à recueillir','Directions d’accompagnement après la création','Checklist de création'];
  const manque=req.filter(k=>!r.h.some(h=>h.indexOf(k)===0));
  A(!manque.length,'rubriques de la fiche : '+req.length+' présentes',JSON.stringify({manque,h:r.h}));
  A(!/X4RT93KL2|Ahmed Benali|FR7630006000011234567890189|Client recommandé/.test(r.t)&&/•••• 93KL2|•••• KL2/.test(r.t.replace(/\s+/g,' '))||(!/X4RT93KL2/.test(r.t)&&/••••/.test(r.t)),'version client : numéro de pièce masqué, ni filiation, ni IBAN, ni notes internes',r.t.match(/Pièce[^\n]*/)+'');
  A(/X4RT93KL2/.test(r.tc)&&/Ahmed Benali/.test(r.tc)&&/FR7630006000011234567890189/.test(r.tc)&&/Client recommandé/.test(r.tc)&&/Éléments internes au cabinet/.test(r.tc),'version cabinet : pièce, filiation, IBAN, notes et éléments internes');
  A(r.t.indexOf('Avant le 31/12/'+Y)>=0&&/1447-C-SD/.test(r.t)&&r.t.indexOf('30/06/'+(Y+2))>=0&&/six mois de la clôture/.test(r.t),'échéancier daté : CFE avant le 31/12 de l’année de création, approbation dans les six mois de la clôture',r.t.slice(r.t.indexOf('Échéancier'),r.t.indexOf('Échéancier')+500));
  A(/Nominal × nombre de titres = capital \(10 000 €\) : cohérent/.test(r.t)&&/Karim BENALI/.test(r.t)&&/60 %/.test(r.t),'associés : répartition en % et contrôle nominal × titres = capital');
  A(/1er septembre 2026/.test(r.t)&&/1er septembre 2027/.test(r.t)&&/Plateforme agréée|plateforme agréée/.test(r.t),'facturation électronique 2026-2027 et informations à recueillir (plateforme agréée)');
  A(/Pacte d’associés/.test(r.t)&&/DPAE/.test(r.t),'à plusieurs associés : pacte proposé ; salariés envisagés : DPAE et DSN');

  r=await ev(()=>{ const o=[]; for(const F of [{},{type:'sci',nature:'creation',societe:{denomination:'SCI LES PINS',capital:'1000',objet:'Acquisition et gestion de biens immobiliers'},dates:{finExo:'2027-12-31'}},{type:'micro',nature:'creation',direction:{prenom:'Léa',nom:'Roux',nationalite:'Marocaine'}}]){ try{ const X=formFicheCalcul(F), h=formFicheHTML(X,'client'); o.push(h.length>2000&&!/undefined|NaN|object Object/.test(h)); }catch(e){ o.push(''+e); } } return o; });
  A(r.every(x=>x===true),'formulaire vide, SCI et micro-entreprise : fiche produite sans valeur manquante ni erreur',JSON.stringify(r));
  /* ouverture depuis le bouton */
  await p.click('#fi-ft'); await p.waitForTimeout(400);
  r=await ev(()=>{ const b=document.getElementById('fi-ft-body'), d=b&&b.querySelector('.sy-doc'); const ob=document.getElementById('ov-b').getBoundingClientRect(), dr=d?d.getBoundingClientRect():null;
    return {t:(document.getElementById('ov-t')||{}).textContent,doc:!!d,in:dr?dr.right<=ob.right+1&&dr.left>=ob.left-1:false,btns:[...document.querySelectorAll('.fi-ft-m')].map(x=>x.textContent)}; });
  A(/Fiche technique de création — BATI-SUD CONSTRUCTION/.test(r.t)&&r.doc&&r.in&&r.btns.join()==='Version client,Version cabinet','fenêtre : document A4 ajusté, versions client et cabinet',JSON.stringify(r));
  await p.screenshot({path:'tests/ui/formfiche.png'});
  await ev(()=>formFicheMode('cabinet')); r=await ev(()=>document.getElementById('fi-ft-body').textContent.indexOf('Éléments internes au cabinet')>=0);
  A(r,'bascule en version cabinet');
  await ev(()=>closeModal());

  /* modification : pas de bouton */
  await ev(()=>{ window.__fsav=window.__formData; window.__formData=Object.assign({},window.__formData,{nature:'modification'}); render(); });
  await p.waitForTimeout(200); r=await ev(()=>!!document.querySelector('#fi-ft')); A(!r,'modification statutaire : pas de fiche de création');
  await ev(()=>{ window.__formData=window.__fsav; state.page='formulaire'; render(); });

  /* enregistrement : fiche conservée, présentée, reprise dans l'Administration */
  await ev(()=>formDoCreate(false)); await p.waitForTimeout(700);
  r=await ev(()=>{ const d=DB.dossiers[0]; return {fc:!!(d&&d.ficheCreation&&d.ficheCreation.data&&d.ficheCreation.data.societe.denomination==='BATI-SUD CONSTRUCTION'),t:(document.getElementById('ov-t')||{}).textContent,open:!!document.querySelector('#fi-ft-body .sy-doc'),h:(d.historique||[]).some(x=>/Fiche technique de création/.test(x.t)),cid:d.clientIds[0],did:d.id}; });
  A(r.fc&&r.h,'fiche conservée sur le dossier créé (saisie figée) et tracée à l’historique',JSON.stringify(r));
  A(r.open&&/Fiche technique de création/.test(r.t),'à l’enregistrement, la fiche est présentée',r.t);
  r=await ev((cid)=>{ closeModal(); const c=DB.clients.filter(x=>x.id===cid)[0]; const h=admEntExtra(c)||''; return /Fiche technique de création/.test(h)&&/formFicheDossier/.test(h); },r.cid);
  A(r,'Administration : carte « Fiche technique de création » réouvrable');
  A(!errs.length,'aucune erreur de page',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
