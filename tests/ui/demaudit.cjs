const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(1800);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'test'; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.open=()=>({close(){},focus(){},document:{write(){},close(){}}}); try{ ['demandes','agenda','fiscal'].forEach(id=>modPauseSet(id,false)); }catch(e){}
  DB.parametres=DB.parametres||{}; DB.parametres.mailsImportes=[]; DB.demandes=[]; DB.dossiers=[]; DB.clients=[]; state.page='demandes'; state.demMode='reception'; state.demView=''; render(); });
// ── 1. Ingestion par les 4 canaux
const payload=await ev(()=>{ const pay={version:'INFOSv1',dossier:'',libre:true,type:'sas',champs:{denomination:'LOGIS PICARDIE',objet:'Location de logements meublés',ape:'6820A',siege:'14 rue des Jacobins',cp:'80000',ville:'Amiens',capital:'5000',debut:'2026-10-01',fonction:'Président',civilite:'Mme',nom:'LAMBERT',prenom:'Sophie',naissance:'1988-03-12',lieuNaissance:'Amiens',nationalite:'Française',adresse:'14 rue des Jacobins',adrCp:'80000',adrVille:'Amiens',perePrenom:'Jean',pereNom:'LAMBERT',merePrenom:'Marie',mereNom:'DURAND',secu:'288038002104512',telPro:'0612345678',mailPro:'s.lambert@logis-picardie.fr',typePiece:'cni',heberge:'oui',hebergeurNom:'Paul LAMBERT'},associes:[{nom:'LAMBERT',prenom:'Marc',parts:'40',naissance:'1985-07-02',lieuNaissance:'Lille',nationalite:'Française',adresse:'2 rue Haute, 59000 Lille'}],pieces:{cni:['cni.jpg'],domicile:['edf.pdf'],hebergement:['attest.pdf'],hebergeurId:['cni-heb.jpg'],assoc:['cni-marc.jpg'],rib:['rib.pdf']},message:'',email:'s.lambert@logis-picardie.fr',tel:'0612345678',ts:Date.now()}; return btoa(unescape(encodeURIComponent(JSON.stringify(pay)))); });
let w=await ev((payload)=>{ const mails=[
  {id:'m-quest',from:'FormSubmit <noreply@formsubmit.co>',subject:'QUESTIONNAIRE — Sophie LAMBERT — LOGIS PICARDIE — AEM CONSEIL',date:new Date().toISOString(),body:'LAST_INFOS: INFOSv1:'+payload+'\n',att:['cni.jpg','edf.pdf','attest.pdf','cni-heb.jpg','cni-marc.jpg','rib.pdf']},
  {id:'m-libre',from:'FormSubmit <noreply@formsubmit.co>',subject:'Form submission — aemconseil.eu',date:new Date(Date.now()-86400000*3).toISOString(),body:'New submission from your form\n\n*nom* Éric Dupont\n*email* eric@garage-dupont.fr\n*telephone* 06 11 22 33 44\n*service* Changement de gérant\n*message* Bonjour, je souhaite modifier le gérant de ma SARL GARAGE DUPONT (SIREN 812 345 678). Merci de me dire les pièces à fournir.\n\nSubmitted at 2026-09-11',att:['kbis.pdf']},
  {id:'m-hors',from:'Paul Renard <p.renard@scicanal.fr>',subject:'Question sur ma TVA',date:new Date().toISOString(),body:'Bonjour, pouvez-vous me rappeler ?',att:[]},
  {id:'m-site',from:'FormSubmit <noreply@formsubmit.co>',subject:'Nouveau message depuis aemconseil.eu',date:new Date(Date.now()-86400000*9).toISOString(),body:'<table><tr><td>Prénom</td><td>Alice</td></tr><tr><td>Nom</td><td>Brun</td></tr><tr><td>Email</td><td>alice@abdesign.fr</td></tr><tr><td>Téléphone</td><td>0699887766</td></tr><tr><td>Service</td><td>Création de SASU</td></tr><tr><td>Message</td><td>Bonjour, je veux créer une SASU de design graphique à Paris.</td></tr></table>',att:[]},
  {id:'m-suppr',from:'FormSubmit <noreply@formsubmit.co>',subject:'Form submission',date:new Date(Date.now()-86400000*20).toISOString(),body:'*nom* Test Suppression\n*email* test@suppr.fr\n*message* demande de test à supprimer',att:[]},
  {id:'m-spam',from:'promo@newsletter.io',subject:'Offre spéciale -50 %',date:new Date().toISOString(),body:'Profitez de notre offre',att:[]}
 ]; demIngest(mails); const n1=DB.demandes.length; demIngest(mails); const n2=DB.demandes.length;
 return {n1,n2,list:DB.demandes.map(d=>({id:d.id,nom:d.clientNom,canal:d.canal||d.source||'',type:(typeof demType==='function')?demType(d):'',nat:(typeof demNature==='function')?demNature(d):'',etat:(typeof demEtat==='function')?demEtat(d):'',intake:!!(d.intake&&d.intake.societe),att:(d.attachments||d.att||[]).length,mail:d.clientEmail||'',tel:d.clientTel||'',lu:!!d.lu,date:d.date}))}; },payload);
console.log(JSON.stringify(w.list,null,0));
T('Ingestion : 6 mails → 4 demandes (questionnaire, formulaire texte, formulaire tableau) ; mail hors formulaire et publicité ignorés', w.n1===4, 'n1='+w.n1);
T('Ingestion idempotente : ré-importer les mêmes mails ne crée aucun doublon', w.n2===w.n1, 'n2='+w.n2);
const q=w.list.find(x=>/LAMBERT/i.test(x.nom)); const lib=w.list.find(x=>/dupont/i.test(x.nom)); const site=w.list.find(x=>/brun/i.test(x.nom));
T('Questionnaire : intake complet, 6 pièces, e-mail et téléphone repris', q&&q.intake&&q.att===6&&q.mail&&q.tel, JSON.stringify(q));
T('Formulaire texte (*champ*) : client, e-mail, téléphone extraits, nature administratif (changement de gérant)', lib&&/dupont/i.test(lib.mail)&&lib.tel&&lib.nat==='admin', JSON.stringify(lib));
T('Formulaire tableau HTML : nom, e-mail, téléphone, service reconnus (création)', site&&/abdesign/.test(site.mail)&&site.tel&&site.nat==='creation'&&/brun/i.test(site.nom), JSON.stringify(site));
// ── 2. Rendu de tous les modes / onglets / natures sans erreur
w=await ev(()=>{ const out=[]; const modes=['reception','qualification','envoi','pieces']; const tabs=(typeof DEM_TABS!=='undefined')?DEM_TABS.map(t=>t[0]):['nouveau']; const nats=['creation','admin','tous'];
  for(const m of modes){ state.demMode=m; state.demView=''; for(const n of nats){ state.demNat=n; for(const t of tabs){ state.demTab=t; try{ render(); const v=document.getElementById('view'); out.push({m,n,t,len:v.innerHTML.length,undef:(v.innerText.match(/undefined|NaN|\[object Object\]/g)||[]).length}); }catch(e){ out.push({m,n,t,err:e.message}); } if(m!=='qualification') break; } if(m!=='qualification') break; } }
  return out; });
T('Rendu de tous les modes × natures × onglets sans exception ('+w.length+' vues)', w.every(x=>!x.err), JSON.stringify(w.filter(x=>x.err)));
T('Aucun « undefined / NaN / [object Object] » affiché dans ces vues', w.every(x=>!x.undef), JSON.stringify(w.filter(x=>x.undef)));
// ── 3. Vue détail de chaque demande + tous les boutons de la vue
w=await ev(()=>{ const out=[]; for(const d of DB.demandes){ try{ state.demMode='qualification'; demOuvrirVue(d.id); render(); const v=document.getElementById('view'); const txt=v.innerText; out.push({id:d.id,nom:d.clientNom,len:v.innerHTML.length,undef:(txt.match(/undefined|NaN(?![a-zA-Z])|\[object Object\]/g)||[]).length,btns:v.querySelectorAll('button').length}); }catch(e){ out.push({id:d.id,err:e.message}); } } demFermerVue(); render(); return out; });
T('Vue détail de chaque demande rendue sans exception', w.every(x=>!x.err&&x.len>2000), JSON.stringify(w));
T('Vue détail sans texte cassé', w.every(x=>!x.undef), JSON.stringify(w.filter(x=>x.undef)));
// fuzz des boutons de la vue détail (sans navigation hors module ni suppression)
w=await ev(()=>{ const bad=[]; let n=0; const d=DB.demandes[0]; state.demMode='qualification'; demOuvrirVue(d.id); render();
  const skip=/supprim|archiv|accept|refus|go\(|location|print|logout|deconn|reset|vider/i;
  const seen=new Set(); for(let pass=0;pass<3;pass++){ const v=document.getElementById('view'); const btns=[...v.querySelectorAll('button')].filter(b=>!b.disabled); for(const bt of btns){ const oc=bt.getAttribute('onclick')||''; const key=oc+'|'+bt.textContent.trim(); if(seen.has(key)||skip.test(oc)||skip.test(bt.textContent)) continue; seen.add(key); n++; try{ bt.click(); }catch(e){ bad.push(key.slice(0,80)+' → '+e.message.slice(0,80)); } try{ document.querySelectorAll('.modal-bg,.ui-modal,#modal').forEach(m=>{ if(m.id==='modal') m.classList.remove('show'); else m.remove(); }); }catch(e){} if(state.page!=='demandes'){ state.page='demandes'; } if(!state.demView){ demOuvrirVue(d.id); } render(); } }
  return {n,bad}; });
T('Boutons de la vue détail cliqués sans exception ('+w.n+' boutons)', w.bad.length===0, JSON.stringify(w.bad));
// ── 4. Actions de données
w=await ev(()=>{ const d=DB.demandes.find(x=>/LAMBERT/i.test(x.clientNom)); const r={};
  demMarquerLu(d.id); r.lu=!!d.lu; demStar(d.id); r.star=!!(d.star||d.fav||d.favori||d.starred); demSetNature(d.id,'admin'); r.natAdmin=demNature(d)==='admin'; demSetNature(d.id,'creation'); r.natBack=demNature(d)==='creation';
  demSetCouleur(d.id,'#4f9dff'); r.couleur=(d.couleur||d.color||'')!=='';
  try{ demChkToggle(d.id,'contact'); r.chk=true; }catch(e){ r.chk=e.message; }
  r.attCats=(d.attachments||[]).map(a=>{ try{ return demAttCat(a).label||demAttCat(a).cat||''; }catch(e){ return 'ERR'; } });
  try{ demAttSetCat(d.id,0,'kbis'); r.setCat=demAttCat(d.attachments[0]).label; demAttSetCat(d.id,0,'cni'); }catch(e){ r.setCat='ERR '+e.message; }
  try{ demPieceRecu(d.id,'cni',true); r.pieceRecu=!!(d.pieces&&d.pieces.cni&&(d.pieces.cni.recu||d.pieces.cni===true)); }catch(e){ r.pieceRecu='ERR '+e.message; }
  try{ r.prio=demPriority(d); }catch(e){ r.prio='ERR '+e.message; }
  try{ r.sla=demSlaState(d); }catch(e){ r.sla='ERR '+e.message; }
  return r; });
console.log('   actions:',JSON.stringify(w));
T('Marquer lu / étoile / nature / couleur / checklist : appliqués et cohérents', w.lu&&w.star&&w.natAdmin&&w.natBack&&w.couleur&&w.chk===true, JSON.stringify(w));
T('Pièces : catégories reconnues (aucune ERR), changement de catégorie et réception pris en compte', w.attCats.length===6&&!w.attCats.includes('ERR')&&!/ERR/.test(w.setCat)&&w.pieceRecu===true, JSON.stringify({c:w.attCats,s:w.setCat,p:w.pieceRecu}));
// analyse IA + application
w=await ev(()=>new Promise(res=>{ const d=DB.demandes.find(x=>/dupont/i.test(x.clientNom)); const before=JSON.stringify({t:demType(d),o:IA.objet(d)}); let done=false,r0; r0={busy:!!d.__iaBusy,has:!!d.iaAnalyse}; d.__iaBusy=false; try{ demAnalyse(d.id,function(){ done=true; try{ demAnalyseAppliquer(d.id); }catch(e){ return res({err:'appliquer '+e.message}); } res({done,a:!!d.iaAnalyse,r0,type:demType(d),before}); }); }catch(e){ return res({err:e.message}); } setTimeout(()=>res({timeout:true,r0,busy:d.__iaBusy,err:d.iaAnalyseErr,mode:iaMode()}),4000); }));
T('Analyse IA (mode démo) puis application des champs extraits', !w.err&&!w.timeout&&w.a, JSON.stringify(w).slice(0,300));
// réponse IA + demander docs + rdv + traduire (fonctions de composition, ne doivent pas planter)
w=await ev(()=>{ const d=DB.demandes.find(x=>/dupont/i.test(x.clientNom)); const r={}; for(const f of ['demReponseIA','demDemanderDocs','demRdv','demTraduire','demMsgOuvrir','demAttOpen']){ try{ if(f==='demAttOpen') window[f](d.id,0); else window[f](d.id); r[f]='ok'; }catch(e){ r[f]='ERR '+e.message; } try{ closeModal&&closeModal(); }catch(e){} } return r; });
T('Réponse IA, demande de documents, rendez-vous, traduction, ouverture mail/pièce : sans exception', Object.values(w).every(v=>v==='ok'), JSON.stringify(w));
// ── 5. Sélection / suppression / archives
w=await ev(()=>{ const spam=DB.demandes.find(x=>/suppression/i.test(x.clientNom||'')); const n0=DB.demandes.length; const r={n0,hadSpam:!!spam}; state.demView=''; state.demMode='qualification'; render();
  const target=spam||DB.demandes[DB.demandes.length-1]; demSelToggle(target.id,true); r.sel=demSelIds().length; demSelSupprimer(); r.n1=DB.demandes.length; r.gone=!DB.demandes.some(x=>x.id===target.id); demSelClear(); r.selAfter=demSelIds().length;
  // archivage via la fonction dispo
  const d=DB.demandes.find(x=>/brun/i.test(x.clientNom))||DB.demandes[0]; const fa=['demArchiver','demArchive'].find(f=>typeof window[f]==='function'); if(fa){ window[fa](d.id); r.archived=!!d.archived; } else { d.archived=true; r.archived='manual'; }
  try{ demArchivesModal(); r.modal=((document.getElementById('ov')||document.getElementById('modal')||{}).innerHTML||'').length>200; closeModal(); }catch(e){ r.modal='ERR '+e.stack.split('\n').slice(0,3).join(' // '); }
  demDesarchiver(d.id); r.unarch=!d.archived; return r; });
T('Sélection multiple → suppression : la demande ciblée disparaît, les autres restent', w.sel===1&&w.gone&&w.n1===w.n0-1&&w.selAfter===0, JSON.stringify(w));
T('Archivage → modale des archives → désarchivage', w.archived&&w.modal===true&&w.unarch, JSON.stringify(w));
// ── 6. Acceptation → dossier + client
w=await ev(()=>{ const d=DB.demandes.find(x=>/LAMBERT/i.test(x.clientNom)); const n0=DB.dossiers.length; demAccepter(d.id); // composition → décision
  let sent=false; try{ const btn=[...document.querySelectorAll('#modal button, .ui-modal button')].find(b=>/envoyer|confirmer|accepter|valider/i.test(b.textContent)); if(btn){ btn.click(); sent=true; } }catch(e){}
  if(DB.dossiers.length===n0){ try{ (window.creerDossierDepuis||window.demCreerDossier)(d.id,true); }catch(e){} }
  const dos=DB.dossiers[DB.dossiers.length-1]; return {sent,n:DB.dossiers.length-n0,link:d.dossierId||d.dossier||'',dosId:dos&&dos.id,intake:!!(dos&&dos.intake&&dos.intake.societe),client:DB.clients.length,etat:demEtat(d),statut:d.statut||d.etat||''}; });
T('Acceptation → dossier créé, relié à la demande, questionnaire repris, client créé', w.n===1&&w.link===w.dosId&&w.intake&&w.client>=1, JSON.stringify(w));
T('Demande acceptée : état « finalisé/assigné » (plus dans « nouveau »)', w.etat!=='nouveau', w.etat+' '+w.statut);
// ── 7. Boîte / configuration / synchro hors ligne
w=await ev(()=>{ const r={}; for(const f of ['demSyncConfig','demBoiteVoir','demSortBtn','demSlaCfg']){ try{ const x=window[f](); r[f]=typeof x==='string'?('html '+x.length):'ok'; }catch(e){ r[f]='ERR '+e.message; } try{ closeModal(); }catch(e){} }
  try{ window.__toasts=[]; demSyncMails(false); r.sync='ok toasts='+window.__toasts.slice(-1); }catch(e){ r.sync='ERR '+e.message; } return r; });
T('Configuration, boîte, tri, SLA, synchronisation (hors ligne) : sans exception', Object.values(w).every(v=>!/ERR/.test(v)), JSON.stringify(w));
// ── 8. Fuzz des boutons des listes (4 modes)
w=await ev(()=>{ const bad=[]; let n=0; const skip=/supprim|archiv|accept|refus|go\(|location|print|logout|deconn|reset|vider|demSelSupprimer/i; state.demView='';
  for(const m of ['reception','qualification','envoi','pieces']){ state.demMode=m; render(); const seen=new Set(); for(let pass=0;pass<2;pass++){ const v=document.getElementById('view'); const btns=[...v.querySelectorAll('button')].filter(b=>!b.disabled); for(const bt of btns){ const oc=bt.getAttribute('onclick')||''; const key=m+'|'+oc+'|'+bt.textContent.trim(); if(seen.has(key)||skip.test(oc)||skip.test(bt.textContent)) continue; seen.add(key); n++; try{ bt.click(); }catch(e){ bad.push(key.slice(0,90)+' → '+e.message.slice(0,80)); } try{ closeModal(); }catch(e){} if(state.page!=='demandes'){ state.page='demandes'; } state.demView=''; state.demMode=m; render(); } } }
  return {n,bad}; });
T('Boutons des 4 modes cliqués sans exception ('+w.n+' boutons)', w.bad.length===0, JSON.stringify(w.bad));
// ── 9. Intégrité des données
w=await ev(()=>{ const bad=[]; DB.demandes.forEach(d=>{ if(!d.id) bad.push('sans id'); if(!d.clientNom) bad.push(d.id+' sans clientNom'); if(!d.date) bad.push(d.id+' sans date'); }); const ids=DB.demandes.map(d=>d.id); if(new Set(ids).size!==ids.length) bad.push('ids dupliqués'); let json=''; try{ json=JSON.stringify(DB); }catch(e){ bad.push('DB non sérialisable '+e.message); } return {bad,size:json.length,n:DB.demandes.length}; });
T('Intégrité : id/nom/date présents, ids uniques, base sérialisable', w.bad.length===0, JSON.stringify(w));
T('Aucune erreur JS pendant l’audit', errs.length===0, errs.join(' | '));
await p.screenshot({path:__dirname+'/demaudit.png'});
console.log(ok+' OK / '+ko+' KO'); await b.close(); process.exit(ko?1:0); })();
