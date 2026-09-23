/**
 * Mar'q — Le questionnaire en ligne demande les pièces de l'activité (v729)
 *
 * infos.html repère l'activité réglementée dès que le client saisit l'objet
 * social (même liste que Mar'q), ajoute les pièces correspondantes aux
 * documents et au lien de dépôt, et accepte celles que Mar'q transmet dans
 * le lien. Côté Mar'q, le lien porte les pièces manquantes, et une pièce
 * reçue avec le questionnaire est reconnue dans le dossier.
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

  const fs=require('fs'), path=require('path'), os=require('os');
  const RACINE=URL_APP.replace(/index\.html.*$/,'');
  const FIX=fs.mkdtempSync(path.join(os.tmpdir(),'marq-act-')); const f1=path.join(FIX,'decennale.pdf'); fs.writeFileSync(f1,'essai');
  const enc=a=>encodeURIComponent(Buffer.from(JSON.stringify(a),'utf8').toString('base64'));
  let r;

  // ---------- 1. une seule liste d'activités ----------
  const q=await b.newPage({viewport:{width:1200,height:900}}); const qerr=[]; q.on('pageerror',e=>qerr.push(''+e));
  await q.goto(RACINE+'infos.html'); await q.waitForTimeout(500);
  const fq=await q.evaluate(()=>window.__FAM.map(f=>[f.k,f.lbl,f.rx.source,f.pieces.map(p=>p.k+':'+p.label).join('|')]));
  const fm=await ev(()=>window.ACTIVITES_REGLEMENTEES.map(f=>[f.k,f.lbl,f.rx.source,f.pieces.map(p=>p.k+':'+p.label).join('|')]));
  A(JSON.stringify(fq)===JSON.stringify(fm)&&fm.length>=10,'le questionnaire en ligne connaît les mêmes activités réglementées que Mar’q',fq.length+' / '+fm.length);

  // ---------- 2. repérage à la saisie de l'objet social (mode libre) ----------
  r=await q.evaluate(()=>({docs:window.__infosDebug.docsVisibles().map(d=>d.k),note:getComputedStyle(document.getElementById('act-note')||document.body).display}));
  A(!r.docs.some(k=>/^act_/.test(k)),'sans objet social : aucune pièce d’activité demandée',JSON.stringify(r));
  await q.fill('#f-objet','Maçonnerie, plâtrerie et gros œuvre');
  r=await q.evaluate(()=>({docs:window.__infosDebug.docsVisibles().filter(d=>d.act).map(d=>d.k),note:(document.getElementById('act-note')||{}).textContent||'',vis:getComputedStyle(document.getElementById('act-note')).display,
    cls:[...document.querySelectorAll('#docList .doc.act')].length,req:window.__infosDebug.docsVisibles().filter(d=>d.act&&d.req).length}));
  A(r.docs.join()==='act_decennale,act_carte_btp,act_qualif_btp'&&/Bâtiment \(BTP\)/.test(r.note)&&r.vis==='block'&&r.cls===3,'objet « maçonnerie » : l’activité BTP est annoncée, ses trois pièces s’ajoutent aux documents',JSON.stringify(r));
  A(r.req===0,'ces pièces sont proposées sans bloquer l’envoi (le cabinet les exige avant le dépôt)',String(r.req));
  await q.fill('#f-objet','Conseil en stratégie');
  r=await q.evaluate(()=>({docs:window.__infosDebug.docsVisibles().filter(d=>d.act).length,vis:getComputedStyle(document.getElementById('act-note')).display}));
  A(r.docs===0&&r.vis==='none','l’objet change : les pièces d’activité disparaissent',JSON.stringify(r));

  // ---------- 3. envoi : la pièce part sous sa clé ----------
  await q.fill('#f-objet','Restaurant traditionnel et bar licence IV');
  r=await q.evaluate(()=>window.__infosDebug.docsVisibles().filter(d=>d.act).map(d=>d.k));
  A(r.join()==='act_form_expl,act_hygiene,act_licence_boissons','restaurant avec bar : la formation d’exploitant n’est demandée qu’une fois',JSON.stringify(r));
  await q.setInputFiles('input[data-doc="act_form_expl"]',[f1]); await q.waitForTimeout(300);
  r=await q.evaluate(()=>{ window.__infosDebug.collect&&window.__infosDebug.collect(); const L=[...document.querySelectorAll('#doc-act_form_expl .file b')].map(x=>x.textContent); return L; });
  A(r.length===1,'la pièce d’activité se joint comme les autres documents',JSON.stringify(r));

  // ---------- 4. pièces transmises par Mar'q dans le lien ----------
  const x=enc([['act_decennale','Attestation d’assurance décennale','Avant le premier chantier.'],['evil','Pièce pirate',''],['act_x"><img','z','']]);
  await q.goto(RACINE+'infos.html?d=DOS-2026-77&k=t&t=sasu&f=denomination,objet,documents&x='+x); await q.waitForTimeout(500);
  r=await q.evaluate(()=>window.__infosDebug.docsVisibles().filter(d=>d.act).map(d=>d.k+':'+d.l));
  A(r.length===1&&/^act_decennale:Attestation d’assurance décennale$/.test(r[0]),'pièces du lien Mar’q affichées sans objet saisi ; une clé étrangère est ignorée',JSON.stringify(r));
  await q.goto(RACINE+'infos.html?d=DOS-2026-77&k=t&t=sasu&f=denomination,objet'); await q.waitForTimeout(500);
  const d0=await q.evaluate(()=>document.getElementById('depotlink').href);
  await q.fill('#f-objet','Agence immobilière, transactions');
  const d1=await q.evaluate(()=>document.getElementById('depotlink').href);
  const px=new URL(d1).searchParams.get('x'); const lx=px?JSON.parse(Buffer.from(px,'base64').toString('utf8')):[];
  A(!/[?&]x=/.test(d0)&&lx.map(p=>p[0]).join()==='act_carte_immo,act_garantie,act_rcp','sans documents dans le questionnaire : le lien de dépôt porte les pièces de l’activité saisie',JSON.stringify(lx.map(p=>p[0])));
  A(qerr.length===0,'questionnaire : aucune erreur JavaScript',qerr.join(' | '));

  // ---------- 5. Mar'q : le lien du questionnaire, puis la réception ----------
  r=await ev(()=>{ const m=window.__mk('sarl'); const d=DB.dossiers.find(x=>x.id===m.id); window.__a=d.id; d.intake.societe.objet='Maçonnerie et gros œuvre';
    const u=infosQuestionnaireLien(d); const xx=new URL(u).searchParams.get('x'); const L=xx?JSON.parse(decodeURIComponent(escape(atob(xx)))):[];
    const m2=window.__mk('sas'); const d2=DB.dossiers.find(x=>x.id===m2.id); const u2=infosQuestionnaireLien(d2);
    return {L:L.map(p=>p[0]),sans:/[?&]x=/.test(u2),base:/infos\.html\?d=/.test(u)}; });
  A(r.base&&r.L.join()==='act_decennale,act_carte_btp,act_qualif_btp'&&!r.sans,'Mar’q : le lien du questionnaire porte les pièces manquantes de l’activité ; aucun ajout sans activité réglementée',JSON.stringify(r));
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===__a); const no=d.numeroDossier||d.ref;
    const avant=activiteAnalyse(d).manquantes.length;
    infosAttacher({version:'INFOSv1',dossier:no,token:infosToken(no),type:'sarl',champs:{},associes:[],pieces:{act_decennale:['decennale.pdf']},email:'s.lambert@logis.fr',ts:new Date().toISOString()},{id:'mia1',subject:'INFORMATIONS DOSSIER'});
    const A2=activiteAnalyse(d); const u=infosQuestionnaireLien(d); const xx=new URL(u).searchParams.get('x'); const L=xx?JSON.parse(decodeURIComponent(escape(atob(xx)))):[];
    return {avant,apres:A2.manquantes.length,dec:A2.pieces.find(p=>p.k==='act_decennale').recu,L:L.map(p=>p[0])}; });
  A(r.avant===3&&r.apres===2&&r.dec,'réponse reçue : la décennale déposée avec le questionnaire est reconnue par la carte « Pièces selon l’activité »',JSON.stringify(r));
  A(r.L.join()==='act_carte_btp,act_qualif_btp','le lien suivant ne redemande que les pièces encore manquantes',JSON.stringify(r.L));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
