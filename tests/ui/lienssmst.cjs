const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.__sent=[]; window.demEnvoiDirect=function(to,s,b){ window.__sent.push({to,s,b}); return true; }; window.__sms=[]; window.sendSmsViaScript=function(to,text,cb){ window.__sms.push({to,text}); cb&&cb({ok:true}); }; window.open=()=>({close(){}});
  const D=86400000, now=Date.now();
  DB.parametres=DB.parametres||{}; DB.parametres.liensSuivi=null; DB.parametres.prevoyance=null; DB.parametres.mailSync={url:'https://script.google.com/macros/s/X/exec',key:'k'}; DB.parametres.smsSync={enabled:true,from:'AEM CONSEIL',provider:'twilio'};
  DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',email:'',tel:'06 12 34 56 78'},{id:'c2',nom:'Martin',prenom:'Paul',email:'paul@mail.fr'}];
  DB.demandes=[]; DB.dossiers=[{id:'do-t',ref:'DOS-2026-000777',clientIds:['c1'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[],pieces:{},docs:{},piecesRecues:{}},{id:'do-p',ref:'DOS-2026-000888',clientIds:['c2'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[],pieces:{},docs:{},piecesRecues:{}}];
  DB.parametres.partagesLien=[{ts:now-6*D,canal:'WhatsApp',dest:'0612345678',url:'https://marq.aemconseil.eu/depot.html?d=DOS-2026-000777&k=abc',numero:'DOS-2026-000777'},{ts:now-2*D,canal:'e-mail',dest:'paul@mail.fr',url:'https://marq.aemconseil.eu/depot.html?d=DOS-2026-000888&k=abc',numero:'DOS-2026-000888'}]; });
// 1. client sans e-mail, SMS actif → rappel par SMS
let w=await ev(()=>{ window.__sent=[]; window.__sms=[]; const n=liensRappelerTout(true); const s=window.__sms[0]||{}; const j=DB.parametres.liensSuivi.journal[0]; const rel=DB.parametres.partagesLien.filter(r=>r.relance)[0]; return {n,mails:window.__sent.length,to:s.to,txt:s.text,j:j&&(j.canal+'|'+j.ok+'|'+j.mode),rel:rel&&rel.canal,due:liensSansReponse().due.length}; });
T('Client sans e-mail + passerelle SMS active → rappel par SMS au +33612345678 avec le lien de dépôt, aucun e-mail, journal SMS ok, entrée relance SMS, plus rien à rappeler', w.n===1&&w.mails===0&&w.to==='+33612345678'&&/depot\.html\?d=DOS-2026-000777/.test(w.txt||'')&&/AEM CONSEIL/.test(w.txt||'')&&w.j==='SMS|true|automatique'&&w.rel==='SMS'&&w.due===0, JSON.stringify(w));
// 2. option SMS désactivée → pas de SMS
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.parametres.partagesLien=DB.parametres.partagesLien.filter(r=>!r.relance); DB.parametres.partagesLien[0].ts=now-6*D; liensSuiviSet('sms',false); window.__sms=[]; const n=liensRappelerTout(true); const j=DB.parametres.liensSuivi.journal[0]; liensSuiviSet('sms',true); return {n,sms:window.__sms.length,j:j&&(j.ok+'|'+j.detail)}; });
T('Option « SMS si pas d\'e-mail » décochée → aucun SMS, journal « aucune adresse e-mail »', w.n===0&&w.sms===0&&/false\|aucune adresse/.test(w.j||''), JSON.stringify(w));
// 3. passerelle SMS inactive → journal, pas d'envoi
w=await ev(()=>{ DB.parametres.smsSync.enabled=false; window.__sms=[]; const n=liensRappelerTout(true); const j=DB.parametres.liensSuivi.journal[0]; DB.parametres.smsSync.enabled=true; return {n,sms:window.__sms.length,j:j&&(j.canal+'|'+j.ok+'|'+j.detail)}; });
T('Passerelle SMS inactive → aucun envoi, journal « passerelle SMS inactive »', w.n===0&&w.sms===0&&/SMS\|false\|passerelle SMS inactive/.test(w.j||''), JSON.stringify(w));
// 4. client avec e-mail → e-mail d'abord, jamais de SMS
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.dossiers[0].depotPortail={statut:'reçu',ts:now}; DB.parametres.partagesLien=DB.parametres.partagesLien.map(r=>r.numero==='DOS-2026-000888'?Object.assign(r,{ts:now-6*D}):r); window.__sent=[]; window.__sms=[]; const n=liensRappelerTout(true); return {n,mails:window.__sent.map(x=>x.to),sms:window.__sms.length}; });
T('Client avec e-mail → rappel par e-mail, pas de SMS', w.n===1&&JSON.stringify(w.mails)==='["paul@mail.fr"]'&&w.sms===0, JSON.stringify(w));
// 5. récapitulatif quotidien : section liens en attente
w=await ev(()=>{ const now=Date.now(), D=86400000; DB.parametres.partagesLien=DB.parametres.partagesLien.filter(r=>!r.relance).map(r=>Object.assign(r,{ts:now-(r.numero==='DOS-2026-000777'?6:2)*D})); delete DB.dossiers[0].depotPortail; DB.parametres.liensSuivi.auto=false; window.demSendViaScript=function(to,s,b,cb){ window.__sent.push({to,s,b}); cb&&cb(); }; prevSet('digest',true); DB.parametres.prevoyance.lastDigest=''; window.__sent=[]; prevScan(true); const m=window.__sent.find(x=>/à prévoir aujourd/.test(x.s))||{}; const sec=(m.b||'').split('LIENS EN ATTENTE DE RÉPONSE')[1]||''; return {sent:window.__sent.length,has:/LIENS EN ATTENTE DE RÉPONSE \(2\)/.test(m.b||''),a:/Amélie Bernard · dépôt de pièces · DOS-2026-000777 · envoyé il y a 6 j · À RAPPELER/.test(sec),b:/Paul Martin · dépôt de pièces · DOS-2026-000888 · envoyé il y a 2 j · en attente/.test(sec),ordre:(m.b||'').indexOf('LIENS EN ATTENTE')<(m.b||'').indexOf('Ouvrir le tableau de bord'),restored:typeof window.demSendViaScript==='function'&&!window.demSendViaScript.toString().includes('LIENS EN')}; });
T('Récapitulatif quotidien : section « LIENS EN ATTENTE DE RÉPONSE (2) » (à rappeler / en attente) placée avant le lien du tableau de bord, passerelle restaurée', w.sent>=1&&w.has&&w.a&&w.b&&w.ordre&&w.restored, JSON.stringify(w));
// 6. carte Paramètres
await ev(()=>{ state.page='params'; render(); }); await p.waitForTimeout(400);
w=await ev(()=>{ const c=document.querySelector('.le-card .ls-cfg'); return {txt:c?c.innerText:'',n:c?c.querySelectorAll('input[type=checkbox]').length:0}; });
T('Paramètres › Liens envoyés : case « SMS si le client n\'a pas d\'e-mail »', /SMS si le client n.a pas d.e-mail/.test(w.txt)&&w.n===2, JSON.stringify(w).slice(0,200));
await p.evaluate(()=>{ const el=document.querySelector('.le-card'); el&&el.scrollIntoView(); }); await p.waitForTimeout(200); await p.screenshot({path:'v684-sms.png'});
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
