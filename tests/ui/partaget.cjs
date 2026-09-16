const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.__sent=[]; window.demEnvoiDirect=function(to,s,b){ window.__sent.push({to,s,b}); return true; }; window.__opened=[]; window.open=function(u){ window.__opened.push(u); return {close(){}}; };
  DB.parametres=DB.parametres||{}; DB.parametres.partagesLien=[]; DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',email:'amelie@outlook.fr',tel:'06 12 34 56 78'}];
  DB.demandes=[{id:'dq1',clientNom:'Amélie Bernard',clientEmail:'amelie@outlook.fr',serviceSouhaite:'Création SASU',date:'2026-09-01',statut:'Nouveau',dossierId:'',numeroDossier:'DOS-2026-000123',intake:{version:'LASTv1',type:'sasu',societe:{denomination:'AB DESIGN'},siege:{rue:'10 rue Haute',cp:'75011',ville:'Paris'},direction:{},contact:{email:'amelie@outlook.fr'},associes:[]}}]; });
// 1. modale Demander des informations → bouton Envoyer le lien
await ev(()=>infosDemander('dq1')); await p.waitForTimeout(500);
let w=await ev(()=>({share:!!document.getElementById('if-share'),lbl:(document.getElementById('if-share')||{}).textContent,lien:(document.getElementById('if-lien')||{}).value}));
T('Demande d\'informations : bouton « Envoyer le lien » à côté de Copier / Ouvrir', w.share&&w.lbl==='Envoyer le lien'&&/infos\.html\?d=DOS-2026-000123/.test(w.lien), JSON.stringify(w));
await p.click('#if-share'); await p.waitForTimeout(400);
w=await ev(()=>({title:document.getElementById('ov-t').textContent,url:(document.getElementById('pl-url')||{}).value,to:(document.getElementById('pl-to')||{}).value,tel:(document.getElementById('pl-tel')||{}).value,sujet:(document.getElementById('pl-sujet')||{}).value,corps:(document.getElementById('pl-corps')||{}).value,qr:!!document.querySelector('.pl-qr')&&(document.querySelector('.pl-qr').src||'').startsWith('data:image/png'),btns:[...document.querySelectorAll('.pl-acts .btn')].map(b=>b.textContent)}));
T('Fenêtre « Envoyer le lien du questionnaire » : lien, destinataire, téléphone du client, objet, message avec le lien', /questionnaire/i.test(w.title)&&/infos\.html/.test(w.url)&&w.to==='amelie@outlook.fr'&&w.tel==='06 12 34 56 78'&&/DOS-2026-000123/.test(w.sujet)&&w.corps.indexOf(w.url)>=0, JSON.stringify({title:w.title,to:w.to,tel:w.tel,sujet:w.sujet}));
T('QR code généré (image PNG) + boutons E-mail / Messagerie / WhatsApp / SMS', w.qr&&w.btns.indexOf('Envoyer par e-mail')>=0&&w.btns.indexOf('Ma messagerie')>=0&&w.btns.indexOf('WhatsApp')>=0&&w.btns.indexOf('SMS')>=0, JSON.stringify({qr:w.qr,btns:w.btns}));
// 2. envoi e-mail direct (passerelle) + journal
await p.click('.pl-acts .btn-pri'); await p.waitForTimeout(300);
w=await ev(()=>({sent:window.__sent,j:DB.parametres.partagesLien}));
T('« Envoyer par e-mail » → envoi direct (passerelle) au destinataire avec objet + message contenant le lien', w.sent.length===1&&w.sent[0].to==='amelie@outlook.fr'&&/infos\.html/.test(w.sent[0].b)&&/DOS-2026-000123/.test(w.sent[0].s), JSON.stringify(w.sent));
T('Journal des partages : 1 entrée canal e-mail, numéro de dossier', w.j.length===1&&w.j[0].canal==='e-mail'&&w.j[0].numero==='DOS-2026-000123'&&w.j[0].dest==='amelie@outlook.fr', JSON.stringify(w.j));
// 3. WhatsApp : lien wa.me avec numéro international + message
await ev(()=>lienWhatsApp()); await p.waitForTimeout(200);
w=await ev(()=>window.__opened);
T('WhatsApp : ouvre wa.me/33612345678 avec le message prérempli (lien inclus)', w.length===1&&/^https:\/\/wa\.me\/33612345678\?text=/.test(w[0])&&decodeURIComponent(w[0]).indexOf('infos.html')>=0, JSON.stringify(w));
// 4. destinataire vide → avertissement, pas d'envoi
await ev(()=>{ document.getElementById('pl-to').value=''; window.__toasts=[]; lienEnvoyerMail(); });
w=await ev(()=>({t:window.__toasts,n:window.__sent.length}));
T('Sans destinataire : avertissement, aucun envoi', w.n===1&&w.t.some(x=>/destinataire/i.test(x)), JSON.stringify(w));
// 5. lien de dépôt de pièces + lien public
await ev(()=>{ closeModal(); lienDepotPartager(DB.demandes[0]); }); await p.waitForTimeout(300);
w=await ev(()=>({title:document.getElementById('ov-t').textContent,url:(document.getElementById('pl-url')||{}).value,to:(document.getElementById('pl-to')||{}).value,corps:(document.getElementById('pl-corps')||{}).value}));
T('Lien de dépôt des pièces : depot.html?d=…&k=… prérempli, destinataire du dossier, message adapté', /dépôt/i.test(w.title)&&/depot\.html\?d=DOS-2026-000123&k=/.test(w.url)&&w.to==='amelie@outlook.fr'&&/pièces justificatives/.test(w.corps), JSON.stringify({title:w.title,url:w.url,to:w.to}));
await ev(()=>{ closeModal(); lienPublicPartager(); }); await p.waitForTimeout(300);
w=await ev(()=>({title:document.getElementById('ov-t').textContent,url:(document.getElementById('pl-url')||{}).value,sujet:(document.getElementById('pl-sujet')||{}).value}));
T('Questionnaire public : lien questionnaire.html, objet « Questionnaire de création d\'entreprise »', /public/i.test(w.title)&&/questionnaire\.html$/.test(w.url)&&/Questionnaire de création/.test(w.sujet), JSON.stringify(w));
// 6. copie
await ev(()=>{ window.__toasts=[]; navigator.clipboard.writeText=function(t){ window.__clip=t; return Promise.resolve(); }; lienCopier(); }); await p.waitForTimeout(200);
w=await ev(()=>({clip:window.__clip,t:window.__toasts}));
T('Copier : lien placé dans le presse-papiers + confirmation', /questionnaire\.html$/.test(w.clip||'')&&w.t.some(x=>/copié/i.test(x)), JSON.stringify(w));
await p.screenshot({path:'v680-partage.png'});
await ev(()=>{ closeModal(); infosDemander('dq1'); }); await p.waitForTimeout(400); await p.click('#if-share'); await p.waitForTimeout(400); await p.screenshot({path:'v680-partage-questionnaire.png'});
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
