/**
 * Mar'q — Seuils : une seule source, revus chaque année (v730)
 *
 * Les seuils de franchise en base de TVA et de micro étaient écrits en dur à
 * plusieurs endroits, dont un resté aux valeurs 2024. Ce test fige la règle :
 * tout se lit dans le barème du millésime, et le barème de l'année doit être
 * vérifié puis confirmé ; tant qu'il ne l'est pas, la Prévoyance le rappelle.
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
  const SRC=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
  const AN=new Date().getFullYear();
  let r;

  // ---------- 1. une seule source : le barème ----------
  const horsBareme=SRC.split('\n').filter(l=>!/^\s*20\d\d:\{'paie\.smic'/.test(l));
  const figes=horsBareme.filter(l=>/36 ?800 €|91 ?900 €|37 ?500 €[^'"]|85 ?000 € ?\)|85000:37500|P\.caPrev>(85000|37500)|v<77700/.test(l));
  A(figes.length===0,'plus aucun seuil de franchise ou de micro écrit en dur hors du barème',figes.map(l=>l.trim().slice(0,90)).join(' | '));
  r=await ev(()=>({s:seuilEur('franchiseServices'),v:seuilEur('franchiseVentes'),sm:seuilEur('franchiseServicesMaj'),vm:seuilEur('franchiseVentesMaj'),
    lbl:!!(baremesCard().match(/seuil majoré/g)||[]).length}));
  A(r.s==='37 500 €'&&r.v==='85 000 €'&&r.sm==='41 250 €'&&r.vm==='93 500 €'&&r.lbl,'le barème porte aussi les seuils majorés, modifiables comme les autres',JSON.stringify(r));

  // ---------- 2. une valeur changée se propage partout ----------
  r=await ev(()=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); window.__s=d.id;
    d.fiscal=Object.assign({},d.fiscal,{tva:'franchise'}); d.intake.profil=Object.assign({},d.intake.profil,{caPrev:'39000',activiteType:'liberale'});
    const pt=()=>{ const c=controle360(d.id); return c.blocs.find(b=>b.k==='fiscal').points.find(p=>p.k==='franchise'); };
    const avant=pt(); const cs0=conseilsSeuils().tvaServices;
    barSet('seuil.franchiseServices','40000');
    const apres=pt(); const cs1=conseilsSeuils(); const txt=(conseilsSociete({identite:{forme:'SAS'},fiscal:{tva:'franchise'},dossiers:[]}).find(c=>/Franchise/.test(c.titre))||{}).txt||'';
    barSet('seuil.franchiseServices','');
    return {avant:avant.etat,apres:apres.etat,det:avant.detail,cs0,cs1:cs1.tvaServices,maj:cs1.maj,txt:/40 000/.test(txt.replace(/\s/g,' '))}; });
  A(r.avant==='ko'&&/37 500/.test(r.det.replace(/\s/g,' ')),'contrôle 360° : 39 000 € de CA en services dépasse le seuil du barème (37 500 €)',JSON.stringify(r));
  A(r.apres==='ok','le seuil relevé à 40 000 € dans le barème : le même dossier passe',JSON.stringify(r));
  A(r.cs0===37500&&r.cs1===40000&&r.maj===String(AN)&&r.txt,'les conseils aux clients lisent le même barème (plus de copie figée à 2025)',JSON.stringify(r));

  // ---------- 3. revue annuelle ----------
  r=await ev(()=>{ baremeSetYear(new Date().getFullYear()); const E=baremeEtat(); const it=prevItems().find(o=>/^sys:bareme:/.test(o.key));
    return {decale:E.decale,revu:!!E.revu,it:it&&{k:it.key,t:it.titre,n:it.niveau,c:it.cat},card:/non vérifiées/.test(baremesCard())&&/J’ai vérifié les valeurs/.test(baremesCard())}; });
  A(!r.decale&&!r.revu&&r.it&&r.it.k==='sys:bareme:'+AN&&r.it.c==='systeme'&&r.it.n==='warn'&&r.card,'barème de l’année non vérifié : rappel dans la Prévoyance et bouton de confirmation',JSON.stringify(r));
  await ev(()=>{ state.page='params'; render(); spGo('cab/bar'); });
  r=await ev(()=>{ const c=document.querySelector('.bar-card'); const b=c&&c.querySelector('.bsr-todo button'); return {vis:!!(c&&c.offsetParent),btn:b&&b.textContent}; });
  A(r.vis&&/J’ai vérifié/.test(r.btn||''),'Paramètres › Barèmes & règles : le bandeau de revue apparaît au-dessus des valeurs',JSON.stringify(r));
  await p.click('.bar-card .bsr-todo button'); await p.waitForTimeout(200);
  r=await ev(()=>{ const E=baremeEtat(); const c=document.querySelector('.bar-card'); return {revu:!!E.revu,ajour:E.aJour,par:E.revu&&typeof E.revu.ts==='number',
    ok:!!(c&&c.querySelector('.bsr-ok'))&&/vérifiées le/.test(c.innerText),it:prevItems().some(o=>/^sys:bareme:/.test(o.key)),
    audit:(DB.audit||[]).some(a=>a.action==='Barème vérifié'&&new RegExp(''+new Date().getFullYear()).test(a.detail))}; });
  A(r.revu&&r.ajour&&r.par&&r.ok,'après confirmation : « Valeurs vérifiées le … » avec la date',JSON.stringify(r));
  A(!r.it&&r.audit,'le rappel quitte la Prévoyance et la vérification est inscrite au journal d’audit',JSON.stringify(r));

  // ---------- 4. millésime en retard sur l'année ----------
  r=await ev(()=>{ baremeSetYear(new Date().getFullYear()-1); const E=baremeEtat(); const it=prevItems().find(o=>/^sys:bareme:/.test(o.key));
    return {decale:E.decale,it:it&&it.detail,card:/Appliquer \d{4}/.test(baremesCard())}; });
  A(r.decale&&r.it&&new RegExp('valeurs '+(AN-1)).test(r.it)&&r.card,'millésime resté sur l’an passé : la Prévoyance le signale et le bandeau propose d’appliquer l’année en cours',JSON.stringify(r));
  r=await ev(()=>{ baremeAligner(); const E=baremeEtat(); return {m:E.millesime,ajour:E.aJour,it:prevItems().some(o=>/^sys:bareme:/.test(o.key))}; });
  A(r.m===AN&&r.ajour&&!r.it,'« Appliquer » remet le millésime de l’année ; la vérification déjà faite est conservée',JSON.stringify(r));
  r=await ev(()=>{ baremeAnnulerRevu(new Date().getFullYear()); const it=prevItems().find(o=>/^sys:bareme:/.test(o.key)); if(!it) return {it:false};
    state.page='espace'; render(); it.open(); return {it:true,page:state.page,vis:!!(document.querySelector('.bar-card')||{}).offsetParent}; });
  A(r.it&&r.page==='params'&&r.vis,'vérification retirée : le rappel revient et ouvre directement les barèmes',JSON.stringify(r));
  r=await ev(()=>{ DB.parametres.prevoyance=DB.parametres.prevoyance||{}; DB.parametres.prevoyance.sources=Object.assign({},DB.parametres.prevoyance.sources,{sys:false});
    const off=prevItems().some(o=>/^sys:bareme:/.test(o.key)); DB.parametres.prevoyance.sources.sys=true; return off; });
  A(!r,'les avertissements système coupés : pas de rappel du barème',String(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
