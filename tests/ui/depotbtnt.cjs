const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.__sent=[]; window.demEnvoiDirect=function(to,s,b){ window.__sent.push({to,s,b}); return true; }; window.open=()=>({close(){}});
  DB.parametres=DB.parametres||{}; DB.parametres.partagesLien=[]; DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',email:'amelie@outlook.fr',tel:'06 12 34 56 78'}]; DB.demandes=[];
  DB.dossiers=[{id:'do-t',ref:'DOS-2026-000777',clientIds:['c1'],serviceIds:[],statut:'Pièces attendues',createdAt:new Date().toISOString().slice(0,10),historique:[],pieces:{},docs:{},piecesRecues:{},wf:{__v6:1,demande:{done:1,ts:Date.now()}}}];
  state.page='espace'; state.espaceDossier='do-t'; state.espTab='pieces'; render(); try{ trwGo('pieces'); }catch(e){} });
await p.waitForTimeout(600);
let w=await ev(()=>{ const b=document.querySelector('.esp-tabpanel[data-tab="pieces"] .card-h .dl-btn'); return {btn:!!b,lbl:b?b.textContent:'',inHead:!!(b&&b.closest('.card-h')),vis:!!(b&&b.offsetParent)}; });
T('Traitement › Pièces : bouton « Envoyer le lien de dépôt » dans l\'en-tête de la carte Pièces du dossier (visible)', w.btn&&w.lbl==='Envoyer le lien de dépôt'&&w.inHead&&w.vis, JSON.stringify(w));
await p.click('.esp-tabpanel[data-tab="pieces"] .card-h .dl-btn'); await p.waitForTimeout(400);
w=await ev(()=>({title:document.getElementById('ov-t').textContent,url:(document.getElementById('pl-url')||{}).value,to:(document.getElementById('pl-to')||{}).value,tel:(document.getElementById('pl-tel')||{}).value,corps:(document.getElementById('pl-corps')||{}).value,qr:!!document.querySelector('.pl-qr')}));
T('Clic → fenêtre « Envoyer le lien de dépôt des pièces » : depot.html?d=DOS-2026-000777&k=…, e-mail + téléphone du client, message pièces, QR', /dépôt/i.test(w.title)&&/depot\.html\?d=DOS-2026-000777&k=[a-z0-9]{8}/.test(w.url)&&w.to==='amelie@outlook.fr'&&w.tel==='06 12 34 56 78'&&/pièces justificatives/.test(w.corps)&&w.qr, JSON.stringify({title:w.title,url:w.url,to:w.to,tel:w.tel}));
await p.click('.pl-acts .btn-pri'); await p.waitForTimeout(300);
w=await ev(()=>({sent:window.__sent,j:DB.parametres.partagesLien}));
T('Envoyer par e-mail → passerelle : destinataire, lien de dépôt dans le message, journal (canal e-mail, DOS-2026-000777)', w.sent.length===1&&w.sent[0].to==='amelie@outlook.fr'&&/depot\.html\?d=DOS-2026-000777/.test(w.sent[0].b)&&w.j[0]&&w.j[0].canal==='e-mail'&&w.j[0].numero==='DOS-2026-000777', JSON.stringify({sent:w.sent.length,j:w.j[0]}));
// cohérence : le lien envoyé est reconnu par l'ingestion de dépôt
w=await ev(()=>{ const url=document.getElementById('pl-url').value; const k=(url.match(/&k=([a-z0-9]+)/)||[])[1]; const tok=depotToken('DOS-2026-000777'); const info=depotDetectEmail({subject:'DÉPÔT PIÈCES - DOS-2026-000777 - AEM CONSEIL',text:'Numéro de dossier: DOS-2026-000777'}); return {k,tok,det:info&&info.dossier}; });
T('Le lien porte la clé attendue par Mar\'q et le retour « DÉPÔT PIÈCES - DOS-… » est reconnu à la réception', w.k===w.tok&&w.det==='DOS-2026-000777', JSON.stringify(w));
// persistance après re-rendu (coche d'une pièce)
await ev(()=>{ closeModal(); render(); }); await p.waitForTimeout(300);
w=await ev(()=>document.querySelectorAll('.esp-tabpanel[data-tab="pieces"] .dl-btn').length);
T('Après re-rendu : un seul bouton (idempotent)', w===1, 'n='+w);
// dossier sans numéro
w=await ev(()=>{ DB.dossiers.push({id:'do-n',clientIds:['c1'],serviceIds:[],statut:'Nouveau',createdAt:'2026-09-01',historique:[]}); lienDepotPartagerId('do-n'); const d=DB.dossiers[1]; return {no:d.numeroDossier,url:(document.getElementById('pl-url')||{}).value}; });
T('Dossier sans numéro : numéro attribué puis lien généré', /^DOS-\d{4}-\d{6}$/.test(w.no||'')&&w.url.indexOf('depot.html?d='+w.no)>=0, JSON.stringify(w));
await ev(()=>{ closeModal(); state.espaceDossier='do-t'; render(); try{ trwGo('pieces'); }catch(e){} }); await p.waitForTimeout(300); await p.screenshot({path:'v681-depot-btn.png'});
await p.click('.esp-tabpanel[data-tab="pieces"] .card-h .dl-btn'); await p.waitForTimeout(400); await p.screenshot({path:'v681-depot-modal.png'});
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
