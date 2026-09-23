/**
 * Mar'q — Pré-diagnostic de création (v727)
 *
 * Quinze questions avant le formulaire complet : forme conseillée, régimes,
 * risques, documents, délai et prix du dossier. Le test fige le calcul, le
 * barème du cabinet, la reprise dans le Formulaire, la carte de la demande,
 * l'envoi au client, la page publique diagnostic.html (même moteur, mêmes
 * activités réglementées, barème du lien contrôlé) et le retour des réponses
 * reçues en ligne dans la demande.
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

  const fs=require('fs'), path=require('path');
  const racine=path.resolve(__dirname,'..','..');
  const H=fs.readFileSync(path.join(racine,'index.html'),'utf8'), D=fs.readFileSync(path.join(racine,'diagnostic.html'),'utf8');
  const bloc=(s)=>{ const a=s.indexOf('/* MQDIAG-ENGINE-START'), z=s.indexOf('/* MQDIAG-ENGINE-END */'); return (a>=0&&z>a)?s.slice(a,z):''; };
  let r;

  // ---------- 1. un seul moteur ----------
  A(bloc(H)&&bloc(H)===bloc(D),'le moteur du pré-diagnostic est le même code dans Mar’q et dans la page publique',bloc(H).length+' / '+bloc(D).length);

  // ---------- 2. le calcul ----------
  r=await ev(()=>{ const T=MQDIAG.TARIF, F=window.ACTIVITES_REGLEMENTEES, c=(R)=>MQDIAG.calc(R,{familles:F,tarif:T,aujourdhui:'2026-09-23'});
    const solo=c({activite:'Conseil en informatique',associes:'1',objectif:'protection',capital:'1000',local:'domicile',ca:'faible',clientele:'part',tva:'franchise'});
    const btp=c({activite:'Maçonnerie et gros œuvre',associes:'2',objectif:'cout',capital:'5000',local:'bail',ca:'moyen',clientele:'part',embauche:'1'});
    const sci=c({activite:'Location nue d’un appartement',associes:'1',objectif:'immobilier'});
    const hold=c({activite:'Prise de participations',associes:'1',holding:'holding',objectif:'dividendes',capital:'10000'});
    const resto=c({activite:'Restaurant traditionnel et bar licence IV',associes:'2',objectif:'protection'});
    return {
      solo:{f:solo.reco.forme,fi:solo.reco.fiscal,so:solo.reco.social,tv:solo.reco.tva,cx:solo.complexe,total:solo.prix.total,hon:solo.prix.honHT,lignes:solo.prix.lignes.length,risques:solo.risques.map(x=>x.titre),docs:solo.documents.length,d:solo.delai.min+'-'+solo.delai.max},
      btp:{f:btp.reco.forme,so:btp.reco.social,cx:btp.complexe,act:btp.activites.map(x=>x.k),niv:btp.risques.filter(x=>/BTP/.test(x.titre)).map(x=>x.niv),deca:btp.documents.some(x=>/décennale/.test(x.label)),statuts:btp.prix.lignes.some(x=>/sur mesure/.test(x.lbl)),pacte:btp.prix.options.length,emp:btp.risques.some(x=>/employeur/.test(x.titre)),d:btp.delai.min+'-'+btp.delai.max},
      sci:{f:sci.reco.forme,fi:sci.reco.fiscal,tv:sci.reco.tva,crit:sci.risques.filter(x=>x.niv==='critique').map(x=>x.titre),capdoc:sci.documents.some(x=>/dépôt des fonds/.test(x.label)),alt:sci.reco.alt.pourquoi},
      hold:{f:hold.reco.forme,fi:hold.reco.fiscal,mf:hold.conseils.some(x=>/mère-fille/.test(x.txt))},
      resto:{act:resto.activites.map(x=>x.k),expl:resto.documents.filter(x=>/formation d’exploitant/.test(x.label)).length,hyg:resto.documents.some(x=>/hygiène/.test(x.label))}
    }; });
  A(r.solo.f==='sasu'&&r.solo.fi==='IS'&&/Assimilé/.test(r.solo.so)&&r.solo.tv==='franchise'&&!r.solo.cx,'seul, protection sociale : SASU à l’IS, président assimilé salarié, franchise de TVA, dossier simple',JSON.stringify(r.solo));
  A(r.solo.hon===390&&r.solo.lignes===3&&r.solo.total===671.05,'prix d’un dossier simple : 390 € HT d’honoraires + annonce 138 € + greffe 37,45 € + TVA = 671,05 € TTC',JSON.stringify(r.solo));
  A(r.solo.docs===5&&r.solo.d==='10-27','documents et délai d’un dossier simple (5 pièces, 10 à 27 jours ouvrés)',JSON.stringify(r.solo));
  A(r.btp.f==='sarl'&&/non salarié/.test(r.btp.so)&&r.btp.cx&&r.btp.act.includes('btp')&&r.btp.niv[0]==='majeure'&&r.btp.deca,'à deux, cotisations basses, maçonnerie : SARL, gérant non salarié, BTP repéré, décennale demandée',JSON.stringify(r.btp));
  A(r.btp.statuts&&r.btp.pacte===1&&r.btp.emp,'dossier complexe : statuts sur mesure facturés, pacte d’associés en option, obligations d’employeur signalées',JSON.stringify(r.btp));
  A(r.sci.f==='sci'&&r.sci.fi==='IR'&&r.sci.tv==='exoneree'&&r.sci.crit.some(x=>/deux associés/.test(x))&&!r.sci.capdoc,'location nue : SCI à l’IR, sans TVA ; seul, le risque critique « deux associés » ; pas d’attestation de dépôt',JSON.stringify(r.sci));
  A(r.hold.f==='sasu'&&r.hold.fi==='IS'&&r.hold.mf,'holding : SASU à l’IS, conseil sur le régime mère-fille',JSON.stringify(r.hold));
  A(r.resto.act.includes('restauration')&&r.resto.act.includes('boissons')&&r.resto.expl===1&&r.resto.hyg,'restaurant avec bar : deux activités, la formation d’exploitant demandée une seule fois',JSON.stringify(r.resto));

  r=await ev(()=>{ const c=(R)=>MQDIAG.calc(Object.assign({activite:'Conseil',associes:'1',objectif:'protection'},R),{familles:window.ACTIVITES_REGLEMENTEES,aujourdhui:'2026-09-23'});
    const imp=c({debut:'2026-09-30'}), ser=c({debut:'2026-10-15'}), okd=c({debut:'2027-01-15'});
    const nat=c({nature:'oui'}), fr=c({tva:'franchise',ca:'eleve'}), hors=c({nationalite:'hors'}), sal=c({situation:'salarie'}), dem=c({situation:'demandeur'}), manq=MQDIAG.calc({},{});
    return {imp:[imp.delai.statut,imp.risques[0].niv,imp.risques[0].titre],ser:[ser.delai.statut,ser.risques.some(x=>x.niv==='majeure'&&/serré/.test(x.titre))],okd:okd.delai.statut,
      nat:[nat.risques.some(x=>/commissaire/.test(x.titre)),nat.documents.some(x=>/commissaire/.test(x.label)),nat.delai.max,nat.prix.enSus.length,nat.complexe],
      fr:[fr.reco.tva,fr.risques.some(x=>/Franchise de TVA/.test(x.titre))],hors:[hors.risques[0].niv,hors.documents.some(x=>/séjour/.test(x.label))],
      sal:sal.risques.some(x=>/non-concurrence/.test(x.txt)),dem:dem.conseils.some(x=>/ACRE/.test(x.txt)),manq:manq.manquantes}; });
  A(r.imp[0]==='impossible'&&r.imp[1]==='critique'&&/trop proche/.test(r.imp[2]),'démarrage dans une semaine : impossible, signalé en risque critique',JSON.stringify(r.imp));
  A(r.ser[0]==='serre'&&r.ser[1]&&r.okd==='ok','démarrage dans trois semaines : calendrier serré ; dans quatre mois : tenable',JSON.stringify([r.ser,r.okd]));
  A(r.nat[0]&&r.nat[1]&&r.nat[2]>30&&r.nat[3]===1&&r.nat[4],'apports de biens : commissaire aux apports (risque, document, délai allongé, honoraires en sus)',JSON.stringify(r.nat));
  A(r.fr[0]==='rs'&&r.fr[1],'franchise souhaitée mais chiffre d’affaires élevé : réel simplifié, et l’écart est signalé',JSON.stringify(r.fr));
  A(r.hors[0]==='critique'&&r.hors[1]&&r.sal&&r.dem,'hors UE : titre de séjour (critique + pièce) ; salarié : clause de non-concurrence ; demandeur d’emploi : ACRE',JSON.stringify(r));
  A(r.manq.join()==='activite,associes,objectif','sans réponse, les trois questions indispensables sont demandées',JSON.stringify(r.manq));
  r=await ev(()=>{ const x=MQDIAG.calc({activite:'Conseil',associes:'1',objectif:'protection',debut:'15/01/2027'},{aujourdhui:'2026-09-23'}); return [x.delai.souhaite,x.delai.statut,MQDIAG.isoDate('2/3/2027'),MQDIAG.isoDate('n’importe')]; });
  A(r[0]==='2027-01-15'&&r[1]==='ok'&&r[2]==='2027-03-02'&&r[3]==='','la date de démarrage est comprise en jj/mm/aaaa (saisie de Mar’q) comme en ISO',JSON.stringify(r));

  // ---------- 3. le barème du cabinet ----------
  r=await ev(()=>{ const s=DB.services.find(x=>/Formalité de création/.test(x.nom)); const p0=s.prix; s.prix=450;
    const T=prediagTarif(), res=prediagCalc({activite:'Conseil',associes:'1',objectif:'protection'}); s.prix=p0;
    return {c:T.creation,h:res.prix.honHT,fr:T.frais.SASU.annonce,cab:T.cab}; });
  A(r.c===450&&r.h===450&&r.fr===138,'le prix suit les prestations du cabinet (forfait porté à 450 €) et le barème des frais de création',JSON.stringify(r));

  // ---------- 4. depuis le Formulaire ----------
  r=await ev(()=>{ formReset(); state.page='formulaire'; render(); const b=document.querySelector('#view .mq-pd-band');
    return {band:!!b,txt:b?b.textContent:'',apres:!!(b&&b.previousElementSibling&&b.previousElementSibling.classList.contains('fi-nature'))}; });
  A(r.band&&/Pré-diagnostic/.test(r.txt)&&r.apres,'Formulaire (création) : l’entrée « Pré-diagnostic » sous le choix création / modification',JSON.stringify(r));
  await p.click('#view .mq-pd-band .btn-pri'); await p.waitForTimeout(150);
  r=await ev(()=>({q:document.querySelectorAll('#ov .mq-pd-qi').length,res:!!document.querySelector('#pd-res'),xl:document.querySelector('#ov .modal').classList.contains('mp-xl'),f0:(document.querySelector('#pd-res .mq-pd-rh b')||{}).textContent}));
  A(r.q===15&&r.res&&r.xl,'la fenêtre du pré-diagnostic : quinze questions et le résultat à côté',JSON.stringify(r));
  await p.fill('#pd-activite','Maçonnerie générale'); await p.fill('#pd-nom','Paul Martin'); await p.fill('#pd-email','paul@martin.fr');
  await p.click('.mq-pd-qi[data-k="associes"] button[data-v="2"]'); await p.click('.mq-pd-qi[data-k="objectif"] button[data-v="cout"]');
  await p.click('#pd-debut'); await p.keyboard.type('15012027');
  await p.fill('#pd-capital','3000'); await p.click('.mq-pd-qi[data-k="local"] button[data-v="bail"]'); await p.click('.mq-pd-qi[data-k="situation"] button[data-v="demandeur"]');
  r=await ev(()=>({f:document.querySelector('#pd-res .mq-pd-rh b').textContent,cx:document.querySelector('#pd-res .mq-pd-cx').textContent,rq:document.querySelector('#pd-res .mq-pd-rq').textContent,on:document.querySelectorAll('.mq-pd-qi[data-k="associes"] button.on').length,obl:(document.querySelector('#pd-res .mq-pd-obl')||{}).textContent||''}));
  A(r.f==='Création SARL'&&/complexe/.test(r.cx)&&/BTP/.test(r.rq)&&r.on===1,'le résultat se met à jour à chaque réponse (SARL, dossier complexe, BTP)',JSON.stringify(r));
  A(/obligations et formalités à suivre/.test(r.obl),'le résultat annonce les obligations qui suivront la création (moteur de connaissances)',r.obl);
  await p.click('#ov .modal-f .btn:has-text("Enregistrer")'); await p.waitForTimeout(100);
  r=await ev(()=>{ const L=DB.parametres.prediags; return {n:L.length,nom:L[0].contact.nom,res:L[0].resume,src:L[0].source,audit:(DB.audit||[]).some(a=>a.action==='Pré-diagnostic'&&/Créé/.test(a.detail))}; });
  A(r.n===1&&r.nom==='Paul Martin'&&r.res.forme==='SARL'&&r.src==='cabinet'&&r.audit,'Enregistrer : le pré-diagnostic est conservé et tracé au journal',JSON.stringify(r));
  await p.click('#ov .modal-f .btn-pri'); await p.waitForTimeout(200);
  r=await ev(()=>{ const f=window.__formData; return {page:state.page,type:f.type,objet:f.societe.objet,cap:f.societe.capital,reg:f.societe.regime,siege:f.siege.type,soc:f.apports.regimeSocial,acre:f.apports.acre,nb:(f.associes||[]).length,mail:f.contact.email,deb:f.societe.debut,pid:f.prediagId,band:(document.querySelector('#view .mq-pd-band')||{}).textContent||''}; });
  A(r.page==='formulaire'&&r.type==='sarl'&&r.objet==='Maçonnerie générale'&&r.cap==='3000'&&r.reg==='IS'&&r.siege==='Local commercial'&&r.soc==='TNS'&&r.acre==='Oui'&&r.nb===2&&r.mail==='paul@martin.fr'&&r.deb==='2027-01-15','« Remplir le Formulaire » : forme, objet, capital, régimes, siège, date de début, ACRE, associés et contact repris',JSON.stringify(r));
  A(!!r.pid&&/Pré-diagnostic repris/.test(r.band),'le Formulaire rappelle le pré-diagnostic dont il vient',r.band);

  // ---------- 5. depuis une demande ----------
  r=await ev(()=>{ DB.demandes.push({id:'pdx',clientNom:'Léa Durand',clientEmail:'lea@durand.fr',clientTel:'0611111111',subject:'Création',
      body:'Nous sommes deux associés et voulons créer une holding.',serviceSouhaite:'Création SAS',date:'2026-09-20',ts:Date.now(),statut:'Nouveau'});
    const h=demVueDetail('pdx'); const t=document.createElement('div'); t.innerHTML=h; const c=t.querySelector('.mq-pd-card');
    const avant=c&&c.nextElementSibling&&c.nextElementSibling.classList.contains('dem-bottom-acts');
    prediagOuvrir({demandeId:'pdx'}); const st=JSON.parse(JSON.stringify(window.__pd));
    return {carte:!!c,txt:c?c.textContent:'',avant,R:st.R,c:st.contact}; });
  A(r.carte&&/Faire le pré-diagnostic/.test(r.txt)&&/questionnaire en ligne/.test(r.txt)&&r.avant,'Demande : carte « Pré-diagnostic » avant les décisions (faire, ou envoyer le questionnaire en ligne)',JSON.stringify(r).slice(0,300));
  A(r.R.associes==='2'&&r.R.holding==='holding'&&r.c.email==='lea@durand.fr','ouvert depuis la demande : associés, holding et contact déjà repris',JSON.stringify(r));
  r=await ev(()=>{ prediagSet('activite','Holding animatrice'); prediagChoix('objectif',{getAttribute:()=> 'levee',parentNode:{querySelectorAll:()=>[]}}); prediagEnregistrer();
    const d=DB.demandes.find(x=>x.id==='pdx'); const h=demVueDetail('pdx'); const t=document.createElement('div'); t.innerHTML=h; const c=t.querySelector('.mq-pd-card');
    return {lie:!!d.prediagId,txt:c?c.textContent:''}; });
  A(r.lie&&/Création SAS/.test(r.txt)&&/TTC/.test(r.txt)&&/Remplir le Formulaire/.test(r.txt),'enregistré, il se résume dans la demande (formalité, délai, prix, points d’attention)',r.txt);

  // ---------- 6. envoi au client ----------
  r=await ev(()=>{ const d=DB.demandes.find(x=>x.id==='pdx'); let sent=null; window.demEnvoiSilencieux=(to,s,c)=>{ sent={to,s,c}; return true; };
    prediagEnvoyer(d.prediagId); const corps=document.getElementById('pd-corps').value, to=document.getElementById('pd-to').value;
    document.getElementById('pd-to').value='mauvais'; const ko=prediagEnvoyerGo(d.prediagId);
    document.getElementById('pd-to').value=to; const okk=prediagEnvoyerGo(d.prediagId); const p=DB.parametres.prediags.find(x=>x.id===d.prediagId);
    return {to,corps,ko,okk,sent,env:(p.envois||[]).length,hist:(d.historique||[]).some(h=>/envoyé au client/.test(h.t))}; });
  A(r.to==='lea@durand.fr'&&/Forme conseillée : SAS/.test(r.corps)&&/DOCUMENTS À PRÉPARER/.test(r.corps)&&/PRIX DU DOSSIER/.test(r.corps),'le message au client reprend recommandation, documents, délai et prix, à relire',r.corps.slice(0,200));
  A(r.ko===false&&r.okk===true&&r.sent&&r.sent.to==='lea@durand.fr'&&r.env===1&&r.hist,'adresse invalide refusée ; envoi tracé sur le pré-diagnostic et la demande',JSON.stringify({ko:r.ko,okk:r.okk,env:r.env}));

  // ---------- 7. le questionnaire en ligne ----------
  r=await ev(()=>{ let o=null; const _l=window.lienPartager; window.lienPartager=(u,x)=>{ o={u,x}; }; const u=prediagEnvoyerLien('pdx'); window.lienPartager=_l;
    const q=new URL(u); const T=JSON.parse(decodeURIComponent(escape(atob(q.searchParams.get('t')))));
    return {u:q.pathname.split('/').pop(),r:q.searchParams.get('r'),cr:T.creation,to:o&&o.x.to,lien:!!DB.demandes.find(x=>x.id==='pdx').prediagLien}; });
  A(r.u==='diagnostic.html'&&r.r==='pdx'&&r.cr===390&&r.to==='lea@durand.fr'&&r.lien,'le lien du questionnaire en ligne porte le barème du cabinet et la référence de la demande',JSON.stringify(r));

  const base=URL_APP.replace(/index\.html.*$/,'diagnostic.html');
  const q=await b.newPage(); const errq=[]; q.on('pageerror',e=>errq.push(''+e));
  const T64=encodeURIComponent(Buffer.from(JSON.stringify({cab:'CABINET TEST',creation:500,statuts:300,pacte:350,domiciliation:240,frais:{SASU:{annonce:138,greffe:37.45}}}),'utf8').toString('base64'));
  await q.goto(base+'?t='+T64+'&r=DOS-77');
  await q.evaluate(()=>{ HTMLFormElement.prototype.submit=function(){ window.__posted=Object.fromEntries(new FormData(this)); }; });
  await q.fill('textarea[data-k="activite"]','Développement de logiciels');
  await q.click('.pd-ch[data-k="associes"] button[data-v="1"]'); await q.click('.pd-ch[data-k="objectif"] button[data-v="protection"]');
  r=await q.evaluate(()=>({cab:document.getElementById('cabName').textContent,f:document.querySelector('#res .pd-f b').textContent,tot:document.querySelector('#res .pd-px .tot').textContent,nq:document.querySelectorAll('.pd-q').length,delai:document.querySelector('#res .pd-delai').offsetHeight}));
  A(r.cab==='CABINET TEST'&&r.f==='Création SASU'&&/803,05/.test(r.tot)&&r.nq===15&&r.delai>0,'page publique : quinze questions, résultat immédiat au barème du cabinet (500 € → 803,05 € TTC)',JSON.stringify(r));
  await q.setViewportSize({width:390,height:844});
  r=await q.evaluate(()=>{ const m=document.getElementById('mini'); return {vu:getComputedStyle(m).display!=='none',f:document.getElementById('mini-f').textContent,p:document.getElementById('mini-p').textContent}; });
  A(r.vu&&r.f==='Création SASU'&&/803,05/.test(r.p),'sur téléphone, un bandeau garde la formalité et le prix en vue pendant les questions',JSON.stringify(r));
  await q.setViewportSize({width:1280,height:1000});
  await q.click('#send'); r=await q.evaluate(()=>({err:document.getElementById('err').textContent,posted:!!window.__posted}));
  A(/nom/.test(r.err)&&!r.posted,'page publique : sans nom ni e-mail, rien ne part',JSON.stringify(r));
  await q.fill('#c-nom','Inès Robert'); await q.fill('#c-email','ines@robert.fr'); await q.click('#send');
  r=await q.evaluate(()=>window.__posted||{});
  A(/^MQDIAGv1:/.test(r.MQDIAG_DATA||'')&&/Création SASU/.test(r._subject||'')&&/DOCUMENTS À PRÉPARER/.test(r['Pré-diagnostic']||''),'envoi : les réponses partent au cabinet, lisibles et en données structurées',JSON.stringify(Object.keys(r)));
  const posted=r;
  const pirate=encodeURIComponent(Buffer.from(JSON.stringify({creation:1e9,cab:'X'.repeat(300)}),'utf8').toString('base64'));
  await q.goto(base+'?t='+pirate); await q.fill('textarea[data-k="activite"]','Conseil'); await q.click('.pd-ch[data-k="associes"] button[data-v="1"]'); await q.click('.pd-ch[data-k="objectif"] button[data-v="protection"]');
  r=await q.evaluate(()=>({tot:document.querySelector('#res .pd-px .tot').textContent,cab:document.getElementById('cabName').textContent.length}));
  A(/671,05/.test(r.tot)&&r.cab===80,'un barème trafiqué dans le lien est écarté (prix aberrant ignoré, nom tronqué)',JSON.stringify(r));
  r=await q.evaluate(()=>{ const F=window.__FAM; return F.map(f=>[f.k,f.lbl,f.rx.source,f.pieces.map(p=>p.label).join('|')]); });
  const fm=await ev(()=>window.ACTIVITES_REGLEMENTEES.map(f=>[f.k,f.lbl,f.rx.source,f.pieces.map(p=>p.label).join('|')]));
  A(JSON.stringify(r)===JSON.stringify(fm),'les activités réglementées de la page publique sont celles de Mar’q',r.length+' / '+fm.length);

  // ---------- 8. la réponse revient dans Mar'q ----------
  r=await ev((data)=>{ const n0=DB.parametres.prediags.length;
    DB.demandes.push({id:'pdy',subject:'PRÉ-DIAGNOSTIC - Inès Robert',body:'Nom: Inès Robert\nMQDIAG_DATA: '+data,date:'2026-09-23',ts:Date.now(),statut:'Nouveau'});
    DB.demandes.push({id:'pdz',subject:'Faux',body:'MQDIAGv1:bm9uIGpzb24=',date:'2026-09-23',ts:Date.now(),statut:'Nouveau'});
    const h=demVueDetail('pdy'); demVueDetail('pdz');
    const d=DB.demandes.find(x=>x.id==='pdy'), z=DB.demandes.find(x=>x.id==='pdz'), p=DB.parametres.prediags.find(x=>x.id===d.prediagId);
    const t=document.createElement('div'); t.innerHTML=h;
    return {n:DB.parametres.prediags.length-n0,src:p&&p.source,nom:p&&p.contact.nom,act:p&&p.R.activite,dnom:d.clientNom,mail:d.clientEmail,svc:d.serviceSouhaite,faux:!!z.prediagId,carte:(t.querySelector('.mq-pd-card')||{}).textContent||''}; },posted.MQDIAG_DATA);
  A(r.n===1&&r.src==='en ligne'&&r.nom==='Inès Robert'&&r.act==='Développement de logiciels'&&r.mail==='ines@robert.fr'&&r.svc==='Création SASU','le mail reçu devient un pré-diagnostic rattaché à la demande (contact et formalité repris)',JSON.stringify(r));
  A(!r.faux&&/Reçu en ligne/.test(r.carte),'la carte de la demande indique « Reçu en ligne » ; un contenu illisible est ignoré',JSON.stringify({faux:r.faux}));

  // ---------- 9. liste et parité ----------
  r=await ev(()=>{ prediagListe(); return {l:document.querySelectorAll('#ov .mq-pd-list tbody tr').length,n:DB.parametres.prediags.length}; });
  A(r.l===r.n&&r.n===3,'la liste des pré-diagnostics enregistrés',JSON.stringify(r));
  const profils=[{activite:'Conseil',associes:'1',objectif:'protection'},{activite:'Maçonnerie',associes:'3',objectif:'cout',nature:'oui',local:'aucun',tva:'franchise',ca:'eleve'},{activite:'Location nue',associes:'2',objectif:'immobilier',debut:'2026-10-02'}];
  const cote=async(pg)=>pg.evaluate((P)=>P.map(R=>JSON.stringify(MQDIAG.calc(R,{familles:window.__FAM||window.ACTIVITES_REGLEMENTEES,aujourdhui:'2026-09-23'}))),profils);
  const x1=await cote(p), x2=await cote(q);
  A(JSON.stringify(x1)===JSON.stringify(x2),'mêmes réponses, même résultat dans Mar’q et sur la page publique');
  A(errq.length===0,'page publique : aucune erreur JavaScript',errq.join(' | '));
  await ev(()=>{ try{ closeModal(); }catch(e){} });

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
