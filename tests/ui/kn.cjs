/**
 * Mar'q — Moteur de connaissances (v726)
 *
 * Une base de règles par organisme (INPI, greffe, BODACC, TVA, impôts,
 * URSSAF, banque, activités réglementées), appliquée au dossier. Le test
 * fige : les règles retenues selon le profil, les échéances calculées, le
 * suivi point par point, la fiche envoyée au client, le lien avec le module
 * Fiscal (jamais sans validation), la base consultable et les écrans.
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
  await ev(()=>{ window.__ids=K=>K.items.map(i=>i.id); window.__it=(K,id)=>K.items.filter(i=>i.id===id)[0]; });
  // ---------- 1. une SAS à l'IS, sans salarié ----------
  let r=await ev(()=>{ const m=window.__mk('sas'); window.__id=m.id; const K=connaissancesPour(m.id); const ids=__ids(K);
    const ago=__it(K,'greffe-ago'), is=__it(K,'imp-is'), dep=__it(K,'greffe-depot');
    return {ids,forme:K.ctx.forme,regime:K.ctx.regime,orgs:[...new Set(K.items.map(i=>i.org))],
      ago:ago&&ago.ech&&[ago.ech.getDate(),ago.ech.getMonth()+1],is:is&&is.ech&&[is.ech.getDate(),is.ech.getMonth()+1],dep:dep&&dep.ech&&[dep.ech.getDate(),dep.ech.getMonth()+1]}; });
  const has=(l,x)=>l.indexOf(x)>=0;
  A(r.forme==='SAS'&&r.regime==='IS','le dossier est lu : SAS à l’IS',JSON.stringify(r));
  A(['inpi-creation','greffe-dbe','greffe-ago','greffe-depot','imp-is','imp-cfe','urs-assimile','tva-choix','bq-compte','bq-capital'].every(x=>has(r.ids,x)),'SAS : guichet unique, bénéficiaires effectifs, comptes annuels, IS, CFE, régime général, choix de la TVA, banque',JSON.stringify(r.ids));
  A(!has(r.ids,'urs-tns')&&!has(r.ids,'urs-dsn')&&!has(r.ids,'imp-2072')&&!has(r.ids,'tva-rs'),'rien d’hors sujet : ni TNS, ni DSN sans salarié, ni 2072, ni CA12',JSON.stringify(r.ids));
  A(r.orgs.length>=6,'plusieurs organismes concernés',JSON.stringify(r.orgs));
  A(JSON.stringify(r.ago)==='[30,6]'&&JSON.stringify(r.dep)==='[31,7]'&&JSON.stringify(r.is)==='[15,5]','échéances d’une clôture au 31 décembre : comptes le 30 juin, dépôt le 31 juillet, solde d’IS le 15 mai',JSON.stringify([r.ago,r.dep,r.is]));

  // ---------- 2. d'autres profils ----------
  r=await ev(()=>{ const m=window.__mk('sarl'); const d=DB.dossiers.find(x=>x.id===m.id); d.fiscal={regimeSocial:'tns',tva:'rs'}; d.intake.societe.effectif='2';
    const a=__ids(connaissancesPour(d));
    const s=window.__mk('sci'); const sd=DB.dossiers.find(x=>x.id===s.id); const sciIS=__ids(connaissancesPour(sd)); sd.intake.societe.regime='IR'; const sci=__ids(connaissancesPour(sd));
    const mi=__ids(connaissancesPour({intake:{type:'micro',societe:{objet:'Conseil en informatique'}}}));
    d.intake.societe.objet='Travaux de maçonnerie et gros œuvre'; const btp=__ids(connaissancesPour(d));
    return {a,sci,sciIS,mi,btp}; });
  A(['urs-tns','urs-dpae','urs-dsn','urs-registres','tva-rs','tva-intracom'].every(x=>has(r.a,x))&&!has(r.a,'urs-assimile'),'SARL, gérant TNS, deux salariés, TVA au réel simplifié : SSI, DPAE, DSN, registres, CA12, n° intracommunautaire',JSON.stringify(r.a));
  A(has(r.sci,'imp-2072')&&!has(r.sci,'greffe-depot')&&!has(r.sci,'imp-is'),'SCI à l’IR : déclaration 2072, pas de dépôt des comptes ni d’IS',JSON.stringify(r.sci));
  A(has(r.sciIS,'imp-is')&&!has(r.sciIS,'imp-2072'),'SCI ayant opté pour l’IS : IS, et plus de 2072',JSON.stringify(r.sciIS));
  A(has(r.mi,'urs-micro')&&has(r.mi,'imp-micro')&&!has(r.mi,'greffe-dbe')&&!has(r.mi,'imp-is'),'micro-entreprise : URSSAF et déclaration personnelle, sans obligations de société',JSON.stringify(r.mi));
  A(['act-btp-mentions','act-btp-vigilance','act-btp-carte'].every(x=>has(r.btp,x)),'bâtiment avec salariés : décennale sur les devis, attestation de vigilance, carte BTP',JSON.stringify(r.btp.filter(x=>/^act/.test(x))));

  // ---------- 3. suivi du dossier ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    connaissancesMarquer(d.id,'imp-espace','fait'); connaissancesMarquer(d.id,'inpi-marque','na');
    const K=connaissancesPour(d); const t=connaissancesTexte(d.id);
    connaissancesMarquer(d.id,'inpi-marque','afaire'); const K2=connaissancesPour(d);
    return {c:K.compte,e1:__it(K,'imp-espace').etat,e2:__it(K,'inpi-marque').etat,marqueTexte:/dépôt de marque/i.test(t),espaceFait:/Créer l’espace professionnel impots\.gouv\.fr \(fait\)/.test(t),
      rouvert:__it(K2,'inpi-marque').etat,hist:(d.historique||[]).filter(h=>/impots\.gouv\.fr|marque/.test(h.t)).length,audit:(DB.audit||[]).filter(a=>a.action==='Obligations et formalités').length}; });
  A(r.e1==='fait'&&r.e2==='na'&&r.c.fait===1&&r.c.na===1,'« Fait » et « Sans objet » se notent point par point',JSON.stringify(r));
  A(!r.marqueTexte&&r.espaceFait,'la fiche du client omet les points sans objet et signale ceux déjà faits',JSON.stringify(r));
  A(r.rouvert==='afaire'&&r.hist>=3&&r.audit>=3,'« Rouvrir » remet à faire ; tout est tracé',JSON.stringify(r));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id); const sent=[]; const _s=window.demEnvoiSilencieux; window.demEnvoiSilencieux=(to,s,c)=>{ sent.push({to,s,c}); return true; };
    document.getElementById('ov-b').innerHTML=''; connaissancesEnvoyer(d.id); const vu=!!document.getElementById('kn-corps');
    document.getElementById('kn-to').value='x'; const refus=connaissancesEnvoyerGo(d.id);
    document.getElementById('kn-to').value='s.lambert@logis.fr'; const ok=connaissancesEnvoyerGo(d.id); window.demEnvoiSilencieux=_s;
    let html=''; const _o=window.open; window.open=()=>({document:{write(h){ html+=h; },close(){}}}); connaissancesImprimer(d.id); window.open=_o;
    return {vu,refus,ok,n:sent.length,urssaf:sent[0]&&/URSSAF/.test(sent[0].c)&&/Greffe/.test(sent[0].c),env:((d.kn726||{}).envois||[]).length,imp:/Obligations et formalités/.test(html)&&/Greffe du tribunal de commerce/.test(html)}; });
  A(r.vu&&r.refus===false,'« Envoyer la fiche au client » ouvre d’abord le message ; une adresse invalide est refusée',JSON.stringify(r));
  A(r.ok&&r.n===1&&r.urssaf&&r.env===1,'la fiche part au client, organisme par organisme, et l’envoi est noté',JSON.stringify(r));
  A(r.imp,'la fiche s’imprime',JSON.stringify(r));

  // ---------- 4. le suivi fiscal ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id); d.fiscal={tva:'rn'}; const n0=(DB.abonnes||[]).length;
    connaissancesSuiviFiscal(d.id); const v=k=>(document.getElementById(k)||{}).value;
    const f={raison:v('cf-raison'),forme:v('cf-forme'),fiscal:v('cf-fiscal'),tva:v('cf-tva'),sal:v('cf-sal'),dir:v('cf-dir')};
    const avant=(DB.abonnes||[]).length;
    cfSaveNew(); const apres=(DB.abonnes||[]).length; const a=connaissancesAbonne(d.id);
    return {f,creeSansClic:avant!==n0,apres:apres-n0,lie:!!a,obl:a&&(a.obligations||[]).length}; });
  A(r.f.raison==='SOC SAS'&&r.f.forme==='SAS'&&r.f.fiscal==='IS'&&r.f.tva==='ca3-mensuel'&&r.f.sal==='non'&&r.f.dir==='assimile','« Préparer le suivi fiscal » ouvre le formulaire du module Fiscal pré-rempli depuis le dossier',JSON.stringify(r.f));
  A(!r.creeSansClic&&r.apres===1&&r.lie&&r.obl>0,'le carnet d’obligations n’est créé qu’après validation du gestionnaire, puis rattaché au dossier',JSON.stringify(r));

  // ---------- 5. la base de connaissances ----------
  r=await ev(()=>{ document.getElementById('ov-b').innerHTML=''; connaissancesBase(); const b=document.getElementById('ov-b');
    return {orgs:b.querySelectorAll('.mq-kn-oh').length,regles:b.querySelectorAll('li').length,total:CONNAISSANCES.regles.length,
      noms:[...b.querySelectorAll('.mq-kn-oh b')].map(x=>x.textContent)}; });
  A(r.orgs===8&&r.regles===r.total&&r.total>=40,'la base : '+r.total+' règles, huit rubriques (INPI, greffe, BODACC, TVA, impôts, URSSAF, banque, activités)',JSON.stringify(r.noms));

  // ---------- 6. écrans ----------
  r=await ev(()=>{ try{ closeModal(); }catch(e){} const d=DB.dossiers.find(x=>x.id===window.__id); d.wf=d.wf||{}; ['demande','pieces','actes','attestations','immatriculation'].forEach(k=>{ d.wf[k]=d.wf[k]||Date.now(); });
    state.page='espace'; state.espaceDossier=d.id; state.espTab='cloture'; render();
    const v=document.getElementById('view'), p=v.querySelector('.esp-tabpanel[data-tab="cloture"]'), c=p&&p.querySelector('.mq-kn-card'), st=p&&p.querySelector('.mq-st-card');
    const out={onglet:state.espTab,carte:!!c,avant:!!(c&&st&&c.nextElementSibling===st),h:c?c.getBoundingClientRect().height:0,n:c?c.querySelectorAll('.mq-kn-org li').length:0};
    connaissancesFiltre('formalite'); const c2=document.querySelector('#view .mq-kn-card'); out.form=c2?[...c2.querySelectorAll('.mq-kn-org li .mq-kn-ty')].every(x=>/Formalité/.test(x.textContent)):false; out.nf=c2?c2.querySelectorAll('.mq-kn-org li').length:0;
    connaissancesFiltre('tout');
    state.espTab='demande'; render(); out.ailleurs=!!document.querySelector('#view .mq-kn-card');
    return out; });
  A(r.onglet==='cloture'&&r.carte&&r.avant&&r.h>0&&r.n>10,'onglet Clôture : la carte « Obligations et formalités », avant le tableau des statuts',JSON.stringify(r));
  A(r.form&&r.nf>0&&r.nf<r.n&&!r.ailleurs,'le filtre par type fonctionne ; la carte n’est pas ailleurs',JSON.stringify(r));

  r=await ev(()=>{ state.page='formulaire'; render(); formType('sarl'); render(); formSet('societe.objet','Restaurant traditionnel'); render();
    const b=document.querySelector('#view .mq-kn-apercu'); const t=b?b.textContent:'';
    document.getElementById('ov-b').innerHTML=''; connaissancesFormulaireDetail(); const m=document.getElementById('ov-b').textContent;
    return {vu:!!b&&b.style.display!=='none',t,resto:/DDPP/.test(m),greffe:/Déposer les comptes/.test(m)}; });
  A(r.vu&&/À prévoir/.test(r.t)&&/obligation/.test(r.t),'Formulaire : « À prévoir » dès que la forme et l’activité sont saisies',r.t);
  A(r.resto&&r.greffe,'le détail suit l’activité saisie (restaurant : déclaration DDPP) et la forme (SARL : dépôt des comptes)',JSON.stringify(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
