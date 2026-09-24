/**
 * Mar'q — Tableau de production (v732)
 *
 * Des dossiers aux dates connues : un remis en 39 jours pour 27 annoncés, un
 * bloqué 20 jours sur ses pièces, un récent. Le test vérifie les délais réels
 * par étape, l'étape la plus lente, le passage d'une étape à l'autre depuis le
 * pré-diagnostic, les dépassements, les retards, les silences, la période et la carte.
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
  let r;
  await ev(()=>{ DB.dossiers=[]; DB.demandes=[]; DB.parametres.prediags=[]; DB.parametres.productionPeriode='90'; });

  // ---------- 1. rien à mesurer ----------
  r=await ev(()=>{ parcoursOublier(); state.page='pilotage'; render(); const c=document.querySelector('#view .mq-pr-card'); return {c:!!c,t:c?c.innerText:''}; });
  A(r.c&&/Aucune demande reçue sur cette période/.test(r.t),'sans dossier : la carte l’annonce simplement, sans chiffres vides',JSON.stringify(r).slice(0,200));

  // ---------- 2. trois dossiers datés ----------
  r=await ev(()=>{ const J=86400000, N=Date.now(), iso=t=>new Date(t).toISOString().slice(0,10);
    function mk(type,jAgo){ const m=window.__mk(type); const d=DB.dossiers.find(x=>x.id===m.id); const t=N-jAgo*J; d.createdAt=iso(t); d.wf={__v6:1,demande:t}; return d; }
    const A=mk('sas',40), t0=N-40*J; window.__A=A.id;
    Object.assign(A.wf,{pieces:t0+10*J,actes:t0+12*J,immatriculation:t0+37*J});
    A.signEnv={statut:'signé',signeLe:t0+13*J}; A.annonceLegale={fichier:{dataUrl:'data:x'},parutionLe:t0+20*J};
    A.inpiSuivi={statut:'déposé',dateDepot:t0+22*J}; A.cloture={remis:t0+39*J};
    const B=mk('sarl',20); window.__B=B.id; const C=mk('eurl',5); window.__C=C.id;
    DB.parametres.prediags=[{id:'pd1',ts:N-45*J,resume:{delai:'10–27'},contact:{nom:'A'}},{id:'pd2',ts:N-10*J,resume:{delai:'10–27'},contact:{nom:'X'}}];
    A.intake.prediagId='pd1';
    parcoursOublier(); const R=production({periode:'90'}); const e=k=>R.etapes.find(x=>x.k===k);
    return {total:R.total,bb:R.boutEnBout,pieces:e('pieces'),obt:e('obtention'),annonce:e('annonce'),goulot:R.goulot&&R.goulot.k,exc:R.goulot&&R.goulot.excedent,
      retards:R.retards.map(x=>x.id===__B?'B:'+x.etape+':'+x.jours:x.id),dep:R.depasse.map(x=>(x.id===__A?'A':x.id)+':'+x.jours+'/'+x.annonce+'+'+x.de+':'+x.livre),
      fun:R.entonnoir.map(x=>x.k+'='+x.n+(x.taux!=null?'('+x.taux+'%)':'')).join(' '),note:R.entonnoir[0].note}; });
  A(r.total===3&&r.bb.n===1&&Math.round(r.bb.mediane)===39,'de la demande à la remise : 39 jours (médiane sur le seul dossier remis)',JSON.stringify(r.bb));
  A(r.pieces.n===1&&Math.round(r.pieces.mediane)===10&&r.pieces.norme===10&&r.pieces.hors===0&&r.pieces.enCours===2&&r.pieces.enRetard===1,'étape « Pièces » : 10 j réels pour une norme de 10 j ; deux dossiers y sont, dont un en retard',JSON.stringify(r.pieces));
  A(r.annonce.n===1&&Math.round(r.annonce.mediane)===7&&r.obt.n===1&&Math.round(r.obt.mediane)===15,'chaque étape est mesurée depuis la précédente franchie (annonce 7 j, immatriculation 15 j après le dépôt)',JSON.stringify([r.annonce.mediane,r.obt.mediane]));
  A(r.goulot==='pieces'&&Math.round(r.exc)===10,'l’étape qui ralentit le plus : les pièces (10 jours au-delà de la norme, dossier bloqué compris)',r.goulot+' '+r.exc);
  A(r.retards.length===1&&/^B:Pièces réunies:20$/.test(r.retards[0]),'retards en cours : le dossier attendant ses pièces depuis 20 jours',JSON.stringify(r.retards));
  A(r.dep.length===1&&r.dep[0]==='A:39/27+12:true','délai annoncé au pré-diagnostic (27 j) dépassé de 12 jours pour le dossier remis',JSON.stringify(r.dep));
  A(/^prediag=2 recue=3 devis=0\(0%\) accord=3 dossier=3\(100%\)/.test(r.fun)&&/dossier=3/.test(r.fun)&&/obtention=1\(33%\)/.test(r.fun)&&/livraison=1\(100%\)/.test(r.fun)&&r.note==='1 devenu dossier','passage d’une étape à l’autre : 2 pré-diagnostics dont 1 devenu dossier, aucun devis compté à tort, 3 dossiers, 1 immatriculé (33 %), 1 remis',r.fun+' | '+r.note);

  // ---------- 3. période ----------
  r=await ev(()=>{ parcoursOublier(); const R=production({periode:'30'}); return {t:R.total,dep:R.depasse.length,pd:R.entonnoir[0].n}; });
  A(r.t===2&&r.dep===0&&r.pd===1,'sur 30 jours : le dossier ouvert il y a 40 jours et son pré-diagnostic sortent des mesures',JSON.stringify(r));

  // ---------- 4. clients silencieux (relances épuisées, v724) ----------
  r=await ev(()=>{ const _rb=window.relancesBilan; window.relancesBilan=function(){ return {dus:[],epuises:[{d:DB.dossiers.find(x=>x.id===__B),attentes:[{lbl:'Pièces du client',jours:20}]}],suivis:1}; };
    parcoursOublier(); const R=production({periode:'90'}); window.relancesBilan=_rb; return R.silences.map(x=>(x.id===__B?'B':x.id)+':'+x.attentes.join()+':'+x.jours); });
  A(r.length===1&&r[0]==='B:Pièces du client:20','clients qui ne répondent plus : relances épuisées, avec ce qu’on attend d’eux',JSON.stringify(r));

  // ---------- 5. la carte du Pilotage ----------
  r=await ev(()=>{ parcoursOublier(); state.page='pilotage'; render(); const c=document.querySelector('#view .mq-pr-card'); const t=c.innerText; const nx=c.nextElementSibling;
    return {kpis:c.querySelectorAll('.mq-pr-k').length,warn:c.querySelectorAll('.mq-pr-k.warn').length,goulot:!!c.querySelector('tr.goulot'),lead:/L’étape qui ralentit le plus : Pièces réunies/.test(t),
      fun:c.querySelectorAll('.mq-pr-fr').length,avant:!!(nx&&/Rentabilité des dossiers/.test(nx.textContent)),chips:c.querySelectorAll('.mq-pr-chip').length,on:(c.querySelector('.mq-pr-chip.on')||{}).textContent,
      u:(t.match(/undefined|NaN(?![a-zA-Z])|\[object/g)||[]).length,liens:c.querySelectorAll('.mq-pr-lk').length,
      seule:!c.parentElement.closest('.card'),perte:(t.match(/Plus forte perte entre deux étapes : ([^(]+)/)||[])[1]}; });
  A(r.kpis===4&&r.warn===2&&r.goulot&&r.lead&&r.fun===9,'Pilotage : quatre indicateurs (deux en alerte), étape la plus lente surlignée, parcours en neuf marches',JSON.stringify(r));
  A(r.seule&&/Honoraires encaissés/.test(r.perte||''),'carte autonome (pas imbriquée dans une autre) ; la perte signalée ignore une étape sautée (devis) et pointe l’encaissement',JSON.stringify(r));
  await p.waitForTimeout(300); const r2=await ev(()=>({page:state.page,dos:!!state.espaceDossier,rq:document.querySelectorAll('#view .rq-btn,#view .tf-btn').length}));
  A(r2.page==='pilotage'&&r2.dos&&r2.rq===0,'les boutons propres au dossier ouvert (« Ouvrir un dossier semblable », « Porter en facture ») ne s’ajoutent plus sur le Pilotage',JSON.stringify(r2));
  A(r.avant&&r.chips===4&&r.on==='90 jours'&&r.u===0,'la carte se place avant « Rentabilité des dossiers », période 90 jours par défaut, aucun texte parasite',JSON.stringify(r));
  await p.click('#view .mq-pr-chip:has-text("30 jours")'); await p.waitForTimeout(150);
  r=await ev(()=>({per:DB.parametres.productionPeriode,on:(document.querySelector('#view .mq-pr-card .mq-pr-chip.on')||{}).textContent,dep:document.querySelector('#view .mq-pr-card').innerText.includes('Aucun dossier au-delà du délai annoncé')}));
  A(r.per==='30'&&r.on==='30 jours'&&r.dep,'choisir « 30 jours » recalcule tout et se retient',JSON.stringify(r));
  await ev(()=>{ DB.parametres.productionPeriode='90'; render(); });
  await p.click('#view .mq-pr-card .mq-pr-lk'); await p.waitForTimeout(150);
  r=await ev(()=>({page:state.page,dos:state.espaceDossier===__A||state.espaceDossier===__B}));
  A(r.page==='espace'&&r.dos,'un nom dans les listes ouvre le dossier',JSON.stringify(r));
  r=await ev(()=>{ state.page='pilotage'; render(); const t=productionCSV(); return {h:/Étape;Dossiers;Médiane \(j\)/.test(t),pc:/Pièces réunies;1;10;10;10;0;2;1/.test(t),dep:/Délai annoncé dépassé/.test(t)}; });
  A(r.h&&r.pc&&r.dep,'export CSV : délais par étape, parcours, dépassements, retards et silences',JSON.stringify(r));
  await p.setViewportSize({width:390,height:900}); await p.waitForTimeout(200);
  r=await ev(()=>{ const c=document.querySelector('#view .mq-pr-card'); const vw=document.documentElement.clientWidth; return [...c.querySelectorAll('*')].filter(e=>e.offsetParent&&e.getBoundingClientRect().right>vw+2&&!e.closest('.mq-pr-tw')).length; });
  A(r===0,'sur téléphone : rien ne déborde (le tableau des étapes défile dans son cadre)',String(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
