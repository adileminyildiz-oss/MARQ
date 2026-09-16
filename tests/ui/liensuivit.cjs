const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.uiConfirm=(m,fn)=>fn&&fn(); window.__sent=[]; window.demEnvoiDirect=function(to,s,b){ window.__sent.push({to,s,b}); return true; }; window.open=()=>({close(){}});
  const D=86400000, now=Date.now();
  DB.parametres=DB.parametres||{}; DB.parametres.liensSuivi=null; DB.parametres.prevoyance=null; DB.parametres.mailSync={url:'https://script.google.com/macros/s/X/exec',key:'k'};
  DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',email:'amelie@outlook.fr',tel:'06 12 34 56 78'},{id:'c2',nom:'Martin',prenom:'Paul',email:'paul@mail.fr'}];
  DB.demandes=[{id:'dq1',clientNom:'Paul Martin',clientEmail:'paul@mail.fr',serviceSouhaite:'Création SAS',date:'2026-09-01',statut:'Nouveau',dossierId:'',numeroDossier:'DOS-2026-000888',intake:{version:'LASTv1',type:'sas',societe:{denomination:'PM CONSEIL'},siege:{},direction:{},contact:{email:'paul@mail.fr'},associes:[]}}];
  DB.dossiers=[{id:'do-t',ref:'DOS-2026-000777',clientIds:['c1'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[],pieces:{},docs:{},piecesRecues:{}},
               {id:'do-r',ref:'DOS-2026-000999',clientIds:['c2'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[],pieces:{},docs:{},piecesRecues:{},depotPortail:{statut:'reçu',ts:now-1*D}}];
  DB.parametres.partagesLien=[
    {ts:now-6*D,canal:'e-mail',dest:'amelie@outlook.fr',url:'https://marq.aemconseil.eu/depot.html?d=DOS-2026-000777&k=abc',numero:'DOS-2026-000777'},
    {ts:now-5*D,canal:'e-mail',dest:'paul@mail.fr',url:'https://marq.aemconseil.eu/infos.html?d=DOS-2026-000888&k=abc&f=denomination',numero:'DOS-2026-000888'},
    {ts:now-3*D,canal:'e-mail',dest:'paul@mail.fr',url:'https://marq.aemconseil.eu/depot.html?d=DOS-2026-000999&k=abc',numero:'DOS-2026-000999'},
    {ts:now-1*D,canal:'WhatsApp',dest:'0600000000',url:'https://marq.aemconseil.eu/depot.html?d=DOS-2026-000777&k=abc',numero:'DOS-2026-000777'},
    {ts:now-9*D,canal:'e-mail',dest:'x@y.fr',url:'https://marq.aemconseil.eu/questionnaire.html',numero:''}
  ]; });
let w=await ev(()=>{ const r=liensSansReponse(); return {due:r.due.map(g=>g.key+':'+g.age),att:r.attente.map(g=>g.key),ep:r.epuises.length,groupes:liensGroupes().length}; });
T('Groupes par (dossier, type) : 3 groupes, lien public ignoré ; DOS-999 répondu (dépôt reçu) exclu ; DOS-777 dépôt renvoyé il y a 1 j → en attente ; questionnaire DOS-888 (5 j) → à rappeler', w.groupes===3&&JSON.stringify(w.due)==='["DOS-2026-000888|infos:5"]'&&JSON.stringify(w.att)==='["DOS-2026-000777|depot"]'&&w.ep===0, JSON.stringify(w));
w=await ev(()=>{ const L=prevItems().filter(o=>/^ls/.test(o.key)); return L.map(o=>({key:o.key,niv:o.niveau,cat:o.cat,titre:o.titre,det:o.detail})); });
T('Prévoyance : 1 point « Paul Martin · Questionnaire » (warn, aujourd\'hui, « sans réponse »)', w.length===1&&w[0].key==='ls:DOS-2026-000888|infos'&&w[0].niv==='warn'&&/Paul Martin/.test(w[0].titre)&&/Questionnaire/.test(w[0].titre)&&/sans réponse/.test(w[0].det), JSON.stringify(w));
// rappel manuel global
w=await ev(()=>{ window.__sent=[]; const n=liensRappelerTout(true); const m=window.__sent[0]||{}; const j=DB.parametres.liensSuivi.journal[0]; const rel=DB.parametres.partagesLien.filter(r=>r.relance); return {n,to:m.to,s:m.s,lien:/infos\.html\?d=DOS-2026-000888/.test(m.b||''),rappel:/pas encore reçu/.test(m.b||''),j:j&&j.ok&&j.mode,rel:rel.length,due:liensSansReponse().due.length}; });
T('Rappeler maintenant → 1 e-mail à paul@mail.fr (objet « Rappel », lien du questionnaire, texte de relance), journal ok, entrée relance dans Liens envoyés, plus rien à rappeler', w.n===1&&w.to==='paul@mail.fr'&&/^Rappel/.test(w.s)&&w.lien&&w.rappel&&w.j==='automatique'&&w.rel===1&&w.due===0, JSON.stringify(w));
// réponse reçue → disparaît
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.parametres.partagesLien=DB.parametres.partagesLien.map(r=>r.relance?Object.assign(r,{ts:now-5*D}):r); const a=liensSansReponse().due.length; DB.demandes[0].infosRecues=[{ts:now,msgId:'m1'}]; const b2=liensSansReponse().due.length; const it=prevItems().some(o=>o.key==='ls:DOS-2026-000888|infos'); return {a,b2,it}; });
T('Réponse du client reçue (infosRecues) → le lien n\'est plus « sans réponse », le point de Prévoyance disparaît', w.a===1&&w.b2===0&&!w.it, JSON.stringify(w));
// plafond de rappels → critique
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.demandes[0].infosRecues=[]; DB.parametres.partagesLien.push({ts:now-5*D,canal:'e-mail',dest:'paul@mail.fr',url:'https://marq.aemconseil.eu/infos.html?d=DOS-2026-000888&k=abc',numero:'DOS-2026-000888',relance:true}); const r=liensSansReponse(); const it=prevItems().filter(o=>o.key==='lse:DOS-2026-000888|infos')[0]; window.__sent=[]; const n=liensRappelerTout(true); return {ep:r.epuises.length,due:r.due.length,it:it&&it.niveau+'|'+it.cat+'|'+it.detail,n}; });
T('2 rappels sans réponse (plafond) → point critique « contacter le client », aucun rappel automatique supplémentaire', w.ep===1&&w.due===0&&/^crit\|retard\|.*contacter le client/.test(w.it||'')&&w.n===0, JSON.stringify(w));
// rappel automatique via prevScan
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.parametres.partagesLien=DB.parametres.partagesLien.filter(r=>!r.relance); DB.parametres.partagesLien=DB.parametres.partagesLien.map(r=>r.numero==='DOS-2026-000777'?Object.assign(r,{ts:now-6*D}):r); window.__sent=[]; prevScan(true); const n0=window.__sent.length; liensSuiviSet('auto',true); window.__sent=[]; prevScan(true); const n1=window.__sent.length; const m=window.__sent.find(x=>/depot\.html\?d=DOS-2026-000777/.test(x.b))||{}; window.__sent=[]; prevScan(true); const n2=window.__sent.length; return {n0,n1,to:m.to,piece:/pièces justificatives/.test(m.b||''),n2}; });
T('Analyse automatique : rien sans l\'option ; option activée → rappels envoyés (dépôt DOS-777 à amelie, texte pièces) ; analyse suivante → aucun doublon', w.n0===0&&w.n1>=1&&w.to==='amelie@outlook.fr'&&w.piece&&w.n2===0, JSON.stringify(w));
// sans adresse → journal en échec, pas de mailto en silencieux
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.clients[0].email=''; DB.parametres.partagesLien=DB.parametres.partagesLien.filter(r=>!r.relance).map(r=>r.numero==='DOS-2026-000777'?Object.assign(r,{ts:now-6*D,dest:'0600000000'}):r); window.__sent=[]; const ok=liensRappeler('DOS-2026-000777|depot',true); const J=DB.parametres.liensSuivi.journal; const jm=J.filter(x=>/aucune adresse/.test(x.detail||''))[0]; return {ok,sent:window.__sent.length,j:jm&&(jm.ok+'|'+jm.detail)}; });
T('Client sans e-mail : pas d\'envoi, journal « aucune adresse e-mail »', w.ok===false&&w.sent===0&&/false\|aucune adresse/.test(w.j||''), JSON.stringify(w));
// carte Paramètres
await ev(()=>{ DB.clients[0].email='amelie@outlook.fr'; state.page='params'; render(); }); await p.waitForTimeout(400);
w=await ev(()=>{ const c=document.querySelector('.le-card .ls-cfg'); return {cfg:!!c,txt:c?c.innerText:'',btn:!!(c&&c.querySelector('button')),inputs:c?c.querySelectorAll('input').length:0}; });
T('Paramètres › Liens envoyés : réglages (délai, maximum, rappel automatique) + bouton « Rappeler maintenant » + état', w.cfg&&w.inputs>=3&&w.btn&&/Rappel si sans réponse après/.test(w.txt)&&/lien.* sans réponse à rappeler/.test(w.txt), JSON.stringify({inputs:w.inputs,txt:w.txt.slice(0,160)}));
await p.evaluate(()=>{ const el=document.querySelector('.le-card'); el&&el.scrollIntoView(); }); await p.waitForTimeout(200); await p.screenshot({path:'v683-liens-suivi.png'});
await ev(()=>{ state.page='cockpit'; render(); }); await p.waitForTimeout(500); await p.evaluate(()=>{ const el=document.querySelector('.pv-card'); el&&el.scrollIntoView(); }); await p.waitForTimeout(200); await p.screenshot({path:'v683-prevoyance.png'});
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
