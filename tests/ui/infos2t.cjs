const { chromium, URL_APP } = require('./_socle.cjs');
const RACINE = URL_APP.replace(/index\.html$/, '');   /* les pages publiques sont à côté d'index.html */
/* Pièces jointes d'essai : le test ne vérifie que leur NOM, pas leur contenu.
   On les fabrique au vol plutôt que de verser des binaires au dépôt. */
const fs = require('fs'), os = require('os'), chemin = require('path');
const FIX = fs.mkdtempSync(chemin.join(os.tmpdir(), 'marq-pieces-'));
const piece = n => { const f = chemin.join(FIX, n); fs.writeFileSync(f, 'essai'); return f; };
['_cni.pdf', '_edf.jpg', '_heb.pdf'].forEach(piece);
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch();
// ---- A. page publique — mode libre (lien partagé)
const q=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const qerr=[]; q.on('pageerror',e=>qerr.push(e.message.slice(0,140)));
await q.goto(RACINE + 'infos.html'); await q.waitForTimeout(700);
let w=await q.evaluate(()=>({libre:window.__infosDebug.libre,sel:!!document.getElementById('l-type'),h1:document.querySelector('h1').textContent,err:getComputedStyle(document.getElementById('cardErr')).display,keys:window.__infosDebug.keys.slice(),docs:window.__infosDebug.docsVisibles().map(d=>d.k),f:['f-ape','f-pereNom','f-merePrenom','f-secu','f-telPro','f-mailPro','f-typePiece','f-heberge','f-hebergeurNom'].map(id=>!!document.getElementById(id)),pieces:getComputedStyle(document.getElementById('pieces')).display,vp:document.documentElement.scrollWidth<=window.innerWidth+1}));
T('Mode libre (sans dossier) : questionnaire public affiché, choix du projet, titre adapté', w.libre&&w.sel&&/Questionnaire de création/.test(w.h1)&&w.err==='none', JSON.stringify(w));
T('Champs demandés : APE, père/mère, n° sécu, tél/mail pro, pièce d\'identité, hébergement', w.f.every(Boolean)&&w.keys.indexOf('documents')>=0, JSON.stringify(w.f));
T('Documents visibles : pièce d\'identité + justificatif de domicile + RIB facultatif (hébergement masqué tant que non hébergé)', JSON.stringify(w.docs)==='["cni","domicile","rib"]', JSON.stringify(w.docs));
T('Mobile 390 px : aucun débordement horizontal, lien dépôt masqué', w.vp&&w.pieces==='none', JSON.stringify({vp:w.vp,pieces:w.pieces}));
await q.selectOption('#f-heberge','Oui'); await q.waitForTimeout(200);
w=await q.evaluate(()=>window.__infosDebug.docsVisibles().map(d=>d.k));
T('Hébergé = Oui → attestation d\'hébergement + pièce de l\'hébergeur demandées', w.indexOf('hebergement')>=0&&w.indexOf('hebergeurId')>=0, JSON.stringify(w));
await q.selectOption('#l-type','sas'); await q.waitForTimeout(300);
w=await q.evaluate(()=>({keys:window.__infosDebug.keys.slice(),asso:!!document.getElementById('assoList'),docs:window.__infosDebug.docsVisibles().map(d=>d.k),assoFields:document.querySelectorAll('#assoList [data-k="naissance"],#assoList [data-k="adresse"]').length}));
T('Projet SAS → bloc associés (identité détaillée : naissance, adresse) + pièce d\'identité des associés', w.asso&&w.docs.indexOf('assoc')>=0&&w.assoFields>=4, JSON.stringify(w));
// remplir
const fill={denomination:'AB DESIGN',objet:'Conseil en design',ape:'7410Z',siege:'10 rue Haute',cp:'75011',ville:'Paris',capital:'1000',lieuNaissance:'Lyon',pays:'France',nationalite:'Française',adressePerso:'5 rue Basse 69001 Lyon',perePrenom:'Jean',pereNom:'BERNARD',merePrenom:'Marie',mereNom:'DURAND',secu:'285057512345678',telPro:'0601020304',mailPro:'contact@abdesign.fr',hebergeurNom:'Paul Martin',nom:'BERNARD',prenom:'Amélie'};
for(const [k,v] of Object.entries(fill)){ await q.fill('#f-'+k,v); }
await q.fill('#f-debut','2026-10-01'); await q.fill('#f-naissance','1990-05-12'); await q.selectOption('#f-fonction','Président'); await q.selectOption('#f-civilite','Mme'); await q.selectOption('#f-situation','Célibataire'); await q.selectOption('#f-typePiece','Passeport'); await q.selectOption('#f-heberge','Oui'); await q.waitForTimeout(200);
await q.fill('#assoList [data-a="0"][data-k="nom"]','BERNARD'); await q.fill('#assoList [data-a="0"][data-k="prenom"]','Amélie'); await q.fill('#assoList [data-a="1"][data-k="nom"]','MARTIN'); await q.fill('#assoList [data-a="1"][data-k="prenom"]','Paul'); await q.fill('#assoList [data-a="1"][data-k="naissance"]','1988-01-02'); await q.fill('#assoList [data-a="1"][data-k="adresse"]','1 rue X 75001 Paris');
await q.fill('#email','amelie@outlook.fr'); await q.fill('#tel','0611223344');
w=await q.evaluate(()=>{ const v=window.__infosDebug.validate(); return {v,bad:[...document.querySelectorAll('.doc.bad')].map(x=>x.id)}; });
T('Sans documents : envoi refusé, les 4 documents requis signalés (identité, domicile, hébergement, hébergeur)', w.v===false&&w.bad.length===4, JSON.stringify(w));
await q.setInputFiles('input[data-doc="cni"]',[chemin.join(FIX,'_cni.pdf')]); await q.setInputFiles('input[data-doc="domicile"]',[chemin.join(FIX,'_edf.jpg')]); await q.setInputFiles('input[data-doc="hebergement"]',[chemin.join(FIX,'_heb.pdf')]); await q.setInputFiles('input[data-doc="hebergeurId"]',[chemin.join(FIX,'_cni.pdf')]); await q.waitForTimeout(300);
w=await q.evaluate(()=>({v:window.__infosDebug.validate(),files:[...document.querySelectorAll('.doc .file b')].map(x=>x.textContent),prog:document.getElementById('progtxt').textContent}));
T('Documents ajoutés (photo/PDF) : listés, validation OK, progression complète', w.v===true&&w.files.length===4&&/^(\d+) \/ \1$/.test(w.prog), JSON.stringify(w));
await q.evaluate(()=>{ HTMLFormElement.prototype.submit=function(){ const fd=new FormData(this); const o={}; const files=[]; for(const [k,v] of fd.entries()){ if(v instanceof File) files.push(k+'='+v.name); else o[k]=v; } window.__posted={o,files,enctype:this.enctype}; }; });
await q.click('#send'); await q.waitForTimeout(300);
w=await q.evaluate(()=>{ const p=window.__posted; if(!p) return null; const raw=p.o.LAST_INFOS||''; const j=JSON.parse(decodeURIComponent(escape(atob(raw.slice(8))))); return {enctype:p.enctype,subject:p.o._subject,files:p.files,libre:j.libre,dossier:j.dossier,type:j.type,pieces:j.pieces,ch:{ape:j.champs.ape,pereNom:j.champs.pereNom,secu:j.champs.secu,heberge:j.champs.heberge},asso:j.associes.length,assoAdr:j.associes[1].adresse,projet:p.o.Projet,societe:j.societe}; });
T('Envoi : formulaire multipart, 4 fichiers joints nommés « Pièce <clé> n », charge INFOSv1 libre avec pièces, associés détaillés, objet « QUESTIONNAIRE - Amélie BERNARD - AB DESIGN »', w&&w.enctype==='multipart/form-data'&&w.files.length===4&&w.libre===true&&w.dossier===''&&w.type==='sas'&&w.pieces.cni[0]==='_cni.pdf'&&w.pieces.hebergement&&w.ch.pereNom==='BERNARD'&&w.ch.secu==='285057512345678'&&w.asso===2&&w.assoAdr==='1 rue X 75001 Paris'&&/^QUESTIONNAIRE [—-] Amélie BERNARD [—-] AB DESIGN/.test(w.subject), JSON.stringify(w));
const payloadLibre=await q.evaluate(()=>window.__posted.o.LAST_INFOS);
const attNames=await q.evaluate(()=>window.__posted.files.map(x=>x.split('=')[1]));
await q.screenshot({path:'q-libre-mobile.png',fullPage:false});
await q.goto('about:blank'); await q.goto(RACINE + 'infos.html#ok'); await q.waitForTimeout(400);
w=await q.evaluate(()=>({ok:getComputedStyle(document.getElementById('cardOk')).display,h2:document.querySelector('#cardOk h2').textContent}));
T('Confirmation en mode libre : « votre questionnaire a bien été envoyé »', w.ok==='block'&&/questionnaire (est|a) bien (été )?envoy/.test(w.h2), JSON.stringify(w));
T('Page publique : aucune erreur', qerr.length===0, qerr.join('|'));
// questionnaire.html (lien court) redirige vers infos.html
const r=await b.newPage(); await r.goto(RACINE + 'questionnaire.html'); await r.waitForTimeout(600);
T('questionnaire.html (lien court pour story / SMS) → redirige vers le questionnaire libre', /infos\.html$/.test(r.url()), r.url());
await r.close();
// ---- B. page avec dossier : documents demandés via f=
const q2=await b.newPage({viewport:{width:1200,height:900}});
await q2.goto(RACINE + 'infos.html?d=DOS-2026-000123&k=abc&s=AB%20DESIGN&c=Am%C3%A9lie&t=sasu&f=secu,pereNom,documents'); await q2.waitForTimeout(600);
w=await q2.evaluate(()=>({libre:window.__infosDebug.libre,keys:window.__infosDebug.keys.slice(),docs:window.__infosDebug.docsVisibles().map(d=>d.k),pieces:getComputedStyle(document.getElementById('pieces')).display,dosno:document.getElementById('dosno').textContent}));
T('Lien rattaché à un dossier : seules les clés demandées (n° sécu, nom du père, documents) — documents intégrés, plus de renvoi vers le portail de dépôt', !w.libre&&w.keys.join()==='secu,pereNom,documents'&&w.docs.join()==='cni,domicile,rib'&&w.pieces==='none'&&/DOS-2026-000123/.test(w.dosno), JSON.stringify(w));
await q2.close();
// ---- C. Mar'q : ingestion
const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,160)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof DB==='undefined'||!DB){ if(typeof _authGranted==='function')_authGranted(); } }); await p.waitForTimeout(1800);
const ev=(f,...a)=>p.evaluate(f,...a);
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); DB.parametres=DB.parametres||{}; DB.parametres.mailsImportes=[]; DB.clients=[]; DB.dossiers=[]; DB.demandes=[]; });
w=await ev(({payload,att})=>{ const body='Origine: Formulaire\nLAST_INFOS: '+payload+'\n'; const mail={id:'msg-q1',from:'FormSubmit <noreply@formsubmit.co>',subject:'QUESTIONNAIRE — Amélie BERNARD — AB DESIGN — AEM CONSEIL',date:new Date().toISOString(),body:body,att:att};
  const r=demIngest([mail,Object.assign({},mail)]); const d=DB.demandes[0]; const o=d&&d.intake||{};
  return {n:DB.demandes.length,nom:d&&d.clientNom,email:d&&d.clientEmail,tel:d&&d.clientTel,canal:d&&d.canal,svc:d&&d.serviceSouhaite,type:o.type,den:o.societe&&o.societe.denomination,ape:o.societe&&o.societe.ape,dir:o.direction&&(o.direction.prenom+' '+o.direction.nom),pere:o.dirx&&o.dirx.pereNom,mere:o.dirx&&o.dirx.mereNom,secu:o.dirx&&o.dirx.secu,typePiece:o.dirx&&o.dirx.typePiece,heb:o.dirx&&o.dirx.heberge,hebN:o.dirx&&o.dirx.hebergeurNom,ctel:o.contact&&o.contact.telPro,cmail:o.contact&&o.contact.emailPro,assoc:(o.associes||[]).length,assocAdr:(o.associes||[])[1]&&o.associes[1].adresse,pr:d&&d.piecesRecues,docs:d&&Object.keys(d.docs||{}),atts:d&&(d.attachments||[]).length,docsRecus:d&&d.docsRecus,libre:d&&d.infosRecues[0].libre,seen:DB.parametres.mailsImportes.length}; },{payload:payloadLibre,att:attNames});
T('Questionnaire public reçu → NOUVELLE DEMANDE créée (une seule malgré le doublon) : nom, e-mail, téléphone, canal « Questionnaire en ligne », service SAS', w.n===1&&w.nom==='Amélie BERNARD'&&w.email==='amelie@outlook.fr'&&w.tel==='0611223344'&&w.canal==='Questionnaire en ligne'&&/SAS/.test(w.svc)&&w.type==='sas', JSON.stringify(w));
T('Report dans le questionnaire du dossier : société + APE, dirigeant, filiation (père/mère), n° sécu, pièce présentée, hébergement, coordonnées pro, 2 associés détaillés', w.den==='AB DESIGN'&&w.ape==='7410Z'&&w.dir==='Amélie BERNARD'&&w.pere==='BERNARD'&&w.mere==='DURAND'&&w.secu==='285057512345678'&&w.typePiece==='Passeport'&&w.heb==='Oui'&&w.hebN==='Paul Martin'&&w.ctel==='0601020304'&&w.cmail==='contact@abdesign.fr'&&w.assoc===2&&w.assocAdr==='1 rue X 75001 Paris', JSON.stringify(w));
T('Documents déposés → pièces reçues sur la demande (cni + alias identite, domicile + alias domiciliation, hébergement, hébergeur), fichiers joints mémorisés pour récupération', w.pr&&w.pr.cni&&w.pr.identite&&w.pr.domicile&&w.pr.domiciliation&&w.pr.hebergement&&w.pr.hebergeurId&&w.atts===4&&w.docsRecus===true&&w.libre===true&&w.seen===1, JSON.stringify({pr:w.pr,atts:w.atts,docsRecus:w.docsRecus}));
// carte + modale + manquants
w=await ev(()=>{ const d=DB.demandes[0]; const h=window.infosRecuesCard(d); const m=window.__infosFormDebug.manquants(d,'sas'); const qk=window.__infosFormDebugExtra.qKeys('sas'); return {card:/Questionnaire public/.test(h)&&/Documents déposés/.test(h)&&/_cni\.pdf/.test(h)&&/BERNARD/.test(h),manqDocs:m.indexOf('documents')>=0,manqSecu:m.indexOf('secu')>=0,qk:['ape','secu','pereNom','documents','telPro'].every(k=>qk.indexOf(k)>=0),pub:window.infosLienPublic()}; });
T('Carte « Informations reçues » : questionnaire public, documents listés ; manquants : ni documents ni n° sécu (déjà reçus) ; questionnaire complet inclut les nouvelles clés ; lien public = questionnaire.html', w.card&&!w.manqDocs&&!w.manqSecu&&w.qk&&/questionnaire\.html$/.test(w.pub), JSON.stringify(w));
await ev(()=>{ state.page='demandes'; state.demMode='traitement'; demOuvrirVue(DB.demandes[0].id); }); await p.waitForTimeout(500);
await ev(()=>infosDemander(DB.demandes[0].id)); await p.waitForTimeout(400);
w=await ev(()=>({secu:!!document.querySelector('.if-grid input[data-k="secu"]'),docs:!!document.querySelector('.if-grid input[data-k="documents"]'),secDocs:[...document.querySelectorAll('.if-sec-t')].some(x=>/Documents à déposer/.test(x.textContent))}));
T('Modale « Demander des informations » : nouvelles cases (n° sécu, documents) et section « Documents à déposer »', w.secu&&w.docs&&w.secDocs, JSON.stringify(w));
await p.screenshot({path:'q-modale.png'});
// dossier rattaché : pièces attendues cochées (cni/domicile) via un questionnaire par lien (avec dossier)
await ev(()=>{ closeModal&&closeModal(); const d=DB.demandes[0]; DB.dossiers=[{id:'do1',ref:'DOS-2026-000123',numeroDossier:'DOS-2026-000123',clientIds:[],statut:'Qualification',docs:{},historique:[],createdAt:'2026-09-01',intake:JSON.parse(JSON.stringify(d.intake))}]; d.dossierId='do1'; d.numeroDossier='DOS-2026-000123'; });
w=await ev(()=>{ const pay={version:'INFOSv1',dossier:'DOS-2026-000123',token:window.infosToken('DOS-2026-000123'),type:'sas',champs:{secu:'285057512345678'},associes:[],pieces:{cni:['id.jpg'],domicile:['edf.pdf']},message:'',email:'amelie@outlook.fr',tel:'',ts:new Date().toISOString()};
  const b64=btoa(unescape(encodeURIComponent(JSON.stringify(pay)))); const r=demIngest([{id:'msg-q2',from:'FormSubmit <noreply@formsubmit.co>',subject:'INFORMATIONS DOSSIER — DOS-2026-000123 — AEM CONSEIL',date:new Date().toISOString(),body:'LAST_INFOS: INFOSv1:'+b64+'\n',att:['id.jpg','edf.pdf']}]);
  const dos=DB.dossiers[0]; const st=(typeof espPieceState==='function')?espPieceState(dos,'cni'):null; return {n:DB.demandes.length,dosPr:dos.piecesRecues,st:st,list:(typeof enregPieces==='function')?enregPieces(dos).filter(p=>p.origine==='client').map(p=>p.k+':'+(espPieceState(dos,p.k).recu?1:0)):null}; });
T('Questionnaire rattaché à un dossier existant : pas de nouvelle demande ; pièces reportées sur le DOSSIER → « Pièces attendues » cni & domicile cochées dans le Traitement', w.n===1&&w.dosPr&&w.dosPr.cni&&w.dosPr.domicile&&w.st&&w.st.recu===true&&w.list&&w.list.indexOf('cni:1')>=0&&w.list.indexOf('domicile:1')>=0, JSON.stringify(w));
await ev(()=>{ state.page='espace'; state.espaceDossier='do1'; render(); }); await p.waitForTimeout(600);
await ev(()=>{ const b=document.querySelector('.trw-step[data-k="pieces"]'); if(b) b.click(); }); await p.waitForTimeout(500);
await p.screenshot({path:'q-traitement-pieces.png'});
T('Application : aucune erreur de page', errs.length===0, errs.join(' | '));
await b.close(); console.log('\n'+ok+' OK / '+ko+' KO'); })();
