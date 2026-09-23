/**
 * Mar'q — Relances des clients J+1, J+3, J+7, J+14 (v724)
 *
 * Quatre attentes (formulaire, pièces, signature, capital) suivent le même
 * calendrier à partir du jour de la demande. Le test fige : le calendrier,
 * l'absence de rattrapage, l'envoi automatique réservé à la passerelle, un
 * seul e-mail par dossier, la prise en compte des autres relances, l'arrêt à
 * la réception, la suspension, et la place des écrans.
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
  const JOUR=864e5;
  await ev(()=>{ window.__att=(id,now)=>{ const o={}; (relancesAttentes(id,now)||[]).forEach(a=>{ o[a.k]=a; }); return o; };
    window.__gw=function(on){ if(!window.__sync0) window.__sync0=window.demSyncCfg; window.__sent=[];
      window.demSyncCfg=on?function(){ const c=window.__sync0(); return Object.assign({},c,{url:'https://passerelle.test'}); }:window.__sync0;
      window.__sil0=window.__sil0||window.demEnvoiSilencieux;
      window.demEnvoiSilencieux=on?function(to,s,c){ window.__sent.push({to,s,c}); return true; }:window.__sil0; }; });

  // ---------- 1. un dossier neuf : rien n'est en attente ----------
  let r=await ev(()=>{ const m=window.__mk('sas'); window.__id=m.id; const A=__att(m.id); const M=relancesMail(m.id);
    return {f:A.formulaire.etat,p:A.pieces.etat,s:A.signature.etat,c:A.capital.etat,n:M.n}; });
  A(r.f==='recu','le formulaire saisi avec le client ne se relance pas',JSON.stringify(r));
  A(r.p==='jamais'&&r.s==='jamais'&&r.c==='jamais'&&r.n===0,'rien n’a été demandé au client : aucune relance',JSON.stringify(r));

  // ---------- 2. le calendrier ----------
  r=await ev((J)=>{ const d=DB.dossiers.find(x=>x.id===window.__id); const T0=Date.now()-5*6e4; d.docsMailSent=T0; window.__T0=T0;
    const a0=__att(d.id,T0+J/2).pieces, a1=__att(d.id,T0+1.2*J).pieces, a3=__att(d.id,T0+3.5*J).pieces;
    const M=relancesMail(d.id,T0+1.2*J);
    return {e0:a0.paliers.map(p=>p.etat).join(),du0:a0.du,e1:a1.paliers.map(p=>p.etat).join(),j1:a1.du&&a1.du.j,j3:a3.du&&a3.du.j,e3:a3.paliers.map(p=>p.etat).join(),
      M:{n:M.n,to:M.to,sujet:M.sujet,lien:/depot\.html/.test(M.corps),ton:M.ton}}; },JOUR);
  A(r.e0==='avenir,avenir,avenir,avenir'&&r.du0===null,'avant J+1 : quatre paliers à venir, rien de dû',r.e0);
  A(r.j1===1&&r.e1==='du,avenir,avenir,avenir','à J+1 : la première relance est due',r.e1);
  A(r.j3===3&&r.e3==='passe,du,avenir,avenir','à J+3, si J+1 n’est pas parti : on ne rattrape pas, seule J+3 est due',r.e3);
  A(r.M.n===1&&r.M.to==='s.lambert@logis.fr'&&/^Rappel — dossier/.test(r.M.sujet)&&r.M.lien,'le message cite les pièces et le lien de dépôt',JSON.stringify(r.M));

  // ---------- 3. envoi automatique : seulement par la passerelle ----------
  r=await ev((J)=>{ const d=DB.dossiers.find(x=>x.id===window.__id), T0=window.__T0; __gw(false);
    const n0=relancesExecuter(T0+1.2*J); const sans=((d.relancesJ||{}).pieces||{envois:[]}).envois.length;
    __gw(true); const n1=relancesExecuter(T0+1.2*J); const n2=relancesExecuter(T0+1.2*J);
    const apres=__att(d.id,T0+1.2*J).pieces.paliers[0].etat;
    const n3=relancesExecuter(T0+3.5*J); const s=window.__sent.slice(); __gw(false);
    return {n0,sans,n1,n2,apres,n3,sent:s.length,sujets:s.map(x=>x.s),hist:(d.historique||[]).filter(h=>/Relance au client/.test(h.t)).length,
      audit:(DB.audit||[]).filter(a=>a.action==='Relances des clients').length}; },JOUR);
  A(r.n0===0&&r.sans===0,'sans passerelle, rien ne part et aucun palier n’avance',JSON.stringify(r));
  A(r.n1===1&&r.n2===0&&r.apres==='fait','avec la passerelle : J+1 part une fois, pas deux',JSON.stringify(r));
  A(r.n3===1&&r.sent===2&&/^Nouveau rappel/.test(r.sujets[1]),'J+3 part ensuite, sur un ton de nouveau rappel',JSON.stringify(r.sujets));
  A(r.hist===2&&r.audit>=2,'chaque envoi est à l’historique du dossier et au journal d’audit',JSON.stringify(r));

  r=await ev((J)=>{ const d=DB.dossiers.find(x=>x.id===window.__id), T0=window.__T0; __gw(true);
    relancesExecuter(T0+7.2*J); relancesExecuter(T0+14.2*J); const s=window.__sent.slice(); __gw(false);
    const a=__att(d.id,T0+15*J).pieces;
    return {sujet:s.length&&s[s.length-1].s,dernier:s.length&&/restera en attente/.test(s[s.length-1].c),epuise:a.epuise,du:a.du}; },JOUR);
  A(/^Dernier rappel/.test(r.sujet)&&r.dernier,'à J+14 : « Dernier rappel », le dossier restera en attente',JSON.stringify(r));
  A(r.epuise&&!r.du,'après J+14 Mar’q n’écrit plus : relances épuisées',JSON.stringify(r));

  // ---------- 4. un seul message pour plusieurs attentes ; les autres relances comptent ----------
  r=await ev((J)=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); window.__id2=m.id; const T0=Date.now()-5*6e4; window.__T2=T0;
    d.docsMailSent=T0; d.signEnv={envoye:T0,lien:'https://sign.test/abc',statut:'envoye'};
    const M=relancesMail(d.id,T0+1.2*J); __gw(true); const n=relancesExecuter(T0+1.2*J); const s=window.__sent.slice(); __gw(false);
    return {n:M.n,envois:n,mails:s.length,deux:/pièces demandées/i.test(s[0]&&s[0].c)&&/sign\.test\/abc/.test(s[0]&&s[0].c)}; },JOUR);
  A(r.n===2&&r.envois===1&&r.mails===1&&r.deux,'pièces et signature dues le même jour : un seul e-mail, avec les deux demandes et le lien de signature',JSON.stringify(r));

  r=await ev((J)=>{ const d=DB.dossiers.find(x=>x.id===window.__id2), T0=window.__T2;
    d.relances=[{ts:T0+3.1*J,niveau:1,envoye:true}];
    const a=__att(d.id,T0+3.5*J).pieces; const p=a.paliers[1];
    const s=__att(d.id,T0+3.5*J).signature;
    return {etat:p.etat,via:p.autre&&p.autre.via,du:a.du,sig:s.du&&s.du.j}; },JOUR);
  A(r.etat==='couvert'&&/relance des pièces/.test(r.via)&&!r.du,'une relance des pièces déjà partie par une autre chaîne couvre le palier J+3',JSON.stringify(r));
  A(r.sig===3,'la signature, elle, reste due à J+3',JSON.stringify(r));

  // ---------- 5. capital, réception, suspension ----------
  r=await ev((J)=>{ const m=window.__mk('sas'); const id=m.id, d=DB.dossiers.find(x=>x.id===id);
    trwValider(id,'demande');
    d.attachments=[{name:'cni-lambert.jpg',msgId:'x'},{name:'edf-domicile.pdf',msgId:'x'},{name:'rib.pdf',msgId:'x'}];
    d.docsMailSent=Date.now()-2*J;
    const avant=__att(id).pieces.etat;
    enregPieces(d).forEach(pc=>{ if(pc.origine==='client') enregPieceToggle(id,pc.k,true); });
    [...new Set(e2Pieces(d).map(a=>demAttCat(a).key))].forEach(k=>e3Certifier(id,k)); trwValider(id,'pieces');
    const apres=__att(id).pieces.etat;
    docGenAll(id); docApproveAll(id);
    ['juridique','orthographe','fiscal','activite','capital'].forEach(k=>chPoint(id,k,true)); chVerdict(id,'conforme');
    a3ToutSigner(id); trwValider(id,'actes');
    const A0=__att(id), wa=d.wf.actes;
    const cap=__att(id,wa+1.2*J).capital, M=relancesMail(id,wa+1.2*J);
    window.__id3=id;
    return {avant,apres,sig:A0.signature.etat,cap:cap.etat,capAncre:cap.ancre===wa,capDu:cap.du&&cap.du.j,mail:/attestation de dépôt/.test(M.corps)}; },JOUR);
  A(r.avant==='attente'&&r.apres==='recu','les pièces reçues arrêtent leurs relances',JSON.stringify(r));
  A(r.sig==='recu','les actes signés arrêtent les relances de signature',JSON.stringify(r));
  A(r.cap==='attente'&&r.capAncre&&r.capDu===1&&r.mail,'capital non déposé : relancé à partir de la validation des actes, avec la marche à suivre',JSON.stringify(r));

  r=await ev((J)=>{ const id=window.__id3, d=DB.dossiers.find(x=>x.id===id), wa=d.wf.actes;
    relancesSuspendre(id,true); const s=__att(id,wa+1.2*J).capital.du; const B=relancesBilan(wa+1.2*J).dus.some(x=>x.d.id===id);
    relancesSuspendre(id,false); const r2=__att(id,wa+1.2*J).capital.du;
    d.attest=d.attest||{}; d.attest.capital={fichier:{name:'capital.pdf',ts:Date.now()}}; at4Valider(id,'capital');
    const fin=__att(id,wa+1.2*J).capital.etat;
    return {s,B,r2:!!r2,fin,hist:(d.historique||[]).some(h=>/suspendues/.test(h.t))}; },JOUR);
  A(r.s===null&&!r.B&&r.hist,'« Suspendre les relances » : plus rien n’est dû pour ce dossier, et c’est tracé',JSON.stringify(r));
  A(r.r2,'reprise : la relance redevient due',JSON.stringify(r));
  A(r.fin==='recu','attestation de dépôt vérifiée : fin des relances du capital',JSON.stringify(r));

  // ---------- 6. relance à la main, sans passerelle ----------
  r=await ev(()=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); d.docsMailSent=Date.now()-1.2*864e5; window.__id4=m.id;
    __gw(false); const _d=window.demEnvoiDirect; let ouvert=0; window.demEnvoiDirect=function(){ ouvert++; return false; };
    document.getElementById('ov-b').innerHTML=''; relancesOuvrir(m.id); const vu=!!document.getElementById('rj-corps');
    document.getElementById('rj-to').value='x'; const refus=relancesEnvoyerGo(m.id);
    document.getElementById('rj-to').value='s.lambert@logis.fr'; const ok=relancesEnvoyerGo(m.id); window.demEnvoiDirect=_d;
    const p=__att(m.id).pieces.paliers[0];
    return {vu,refus,ok,ouvert,etat:p.etat,hist:(d.historique||[]).some(h=>/préparée dans la messagerie/.test(h.t))}; });
  A(r.vu&&r.refus===false,'« Relancer maintenant » ouvre le message à relire ; une adresse invalide est refusée',JSON.stringify(r));
  A(r.ok&&r.ouvert===1&&r.etat==='prepare'&&r.hist,'sans passerelle, la relance est préparée dans la messagerie et marquée comme telle',JSON.stringify(r));

  // ---------- 7. réglages ----------
  r=await ev((J)=>{ relancesReglage('paliers','2, 5 , 10'); const p1=DB.parametres.relancesJ.paliers.join();
    relancesReglage('paliers','abc'); const p2=DB.parametres.relancesJ.paliers.join();
    const d=DB.dossiers.find(x=>x.id===window.__id2), T0=window.__T2; const a=__att(d.id,T0+2.2*J).signature;
    relancesReglage('att:signature',false); const b=__att(d.id,T0+2.2*J).signature;
    relancesReglage('att:signature',true); relancesReglage('paliers','1,3,7,14');
    return {p1,p2,j:a.paliers.map(x=>x.j).join(),du:a.du&&a.du.j,off:b.du,actif:b.actif}; },JOUR);
  A(r.p1==='2,5,10'&&r.p2==='2,5,10','le calendrier se règle (2, 5, 10 jours) ; une saisie invalide est ignorée',JSON.stringify(r));
  A(r.j==='2,5,10'&&r.du===2,'le nouveau calendrier s’applique aux dossiers',JSON.stringify(r));
  A(r.off===null&&r.actif===false,'une attente désactivée ne se relance plus',JSON.stringify(r));

  // ---------- 8. Prévoyance, centre d'exécution, écrans ----------
  r=await ev((J)=>{ const d2=DB.dossiers.find(x=>x.id===window.__id2); d2.docsMailSent=Date.now()-1.2*J; d2.relances=[]; delete d2.relancesJ; const it=prevItems(); const L=cxChaineLignes(); const l=L.filter(x=>x.key==='rj')[0];
    __gw(true); const l2=cxChaineLignes().filter(x=>x.key==='rj')[0]; __gw(false);
    return {due:it.some(o=>/^rj:/.test(o.key)),appel:it.some(o=>/^rje:/.test(o.key)),ligne:!!l,exec:l&&l.exec,exec2:!!(l2&&l2.exec)}; },JOUR);
  A(r.due,'la Prévoyance signale les relances dues aujourd’hui',JSON.stringify(r));
  A(r.ligne&&r.exec===null&&r.exec2,'centre d’exécution : une ligne, exécutable seulement si la passerelle est configurée',JSON.stringify(r));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id); d.docsMailSent=Date.now()-16*864e5; delete d.relancesJ;
    d.relancesJ={pieces:{ancre:d.docsMailSent,envois:[1,3,7,14].map(j=>({ts:d.docsMailSent+j*864e5,palier:j,to:'x',direct:true}))}};
    const it=prevItems(); return {appel:it.some(o=>o.key==='rje:'+d.id&&o.niveau==='crit')}; });
  A(r.appel,'relances épuisées : la Prévoyance demande d’appeler le client',JSON.stringify(r));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id4); state.page='espace'; state.espaceDossier=d.id; state.espTab='demande'; render();
    const v=document.getElementById('view'), p=v.querySelector('.esp-tabpanel[data-tab="demande"]'), c=p&&p.querySelector('.mq-rj-card');
    const foot=p&&p.querySelector(':scope > .trw-foot');
    const out={carte:!!c,h:c?c.getBoundingClientRect().height:0,rows:c?c.querySelectorAll('.mq-rj-row').length:0,avantPied:!!(c&&foot&&c.nextElementSibling===foot),
      pts:c?c.querySelectorAll('.mq-rj-pt').length:0};
    state.espTab='actes'; render(); out.ailleurs=!!document.querySelector('#view .mq-rj-card');
    state.page='pilotage'; render(); out.pilotage=!!document.querySelector('#view .mq-rj-glob'); out.nGlob=document.querySelectorAll('#view .mq-rj-glob').length;
    return out; });
  A(r.carte&&r.h>0&&r.rows===4&&r.avantPied,'onglet Demande : « Relances du client », quatre attentes, juste avant la barre de validation',JSON.stringify(r));
  A(r.pts===4&&!r.ailleurs,'le calendrier J+1 → J+14 de l’attente en cours ; la carte n’apparaît pas ailleurs',JSON.stringify(r));
  A(r.pilotage&&r.nGlob===1,'Pilotage : la vue d’ensemble et le réglage, une seule fois',JSON.stringify(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
