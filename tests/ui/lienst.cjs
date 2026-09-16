const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.uiConfirm=(m,fn)=>fn&&fn(); window.__sent=[]; window.demEnvoiDirect=function(to,s,b){ window.__sent.push({to,s,b}); return true; }; window.open=()=>({close(){}});
  DB.parametres=DB.parametres||{}; DB.parametres.partagesLien=[]; DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',email:'amelie@outlook.fr',tel:'06 12 34 56 78'}]; DB.demandes=[];
  DB.dossiers=[{id:'do-t',ref:'DOS-2026-000777',clientIds:['c1'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[],pieces:{},docs:{},piecesRecues:{}}];
  state.page='params'; render(); });
await p.waitForTimeout(400);
let w=await ev(()=>({card:!!document.querySelector('.le-card'),empty:!!document.querySelector('.le-card .le-empty'),h2:(document.querySelector('.le-card h2')||{}).textContent}));
T('Paramètres : carte « Liens envoyés » présente, état vide explicite', w.card&&w.empty&&w.h2==='Liens envoyés', JSON.stringify(w));
// alimenter par 3 envois réels via la fenêtre de partage
await ev(()=>{ lienDepotPartager(DB.dossiers[0]); lienEnvoyerMail(); closeModal(); lienDepotPartager(DB.dossiers[0]); lienWhatsApp(); closeModal(); lienPublicPartager(); document.getElementById('pl-to').value='prospect@mail.fr'; lienEnvoyerMail(); closeModal(); render(); });
await p.waitForTimeout(400);
w=await ev(()=>{ const rows=[...document.querySelectorAll('.le-tbl tbody tr')].map(tr=>[...tr.querySelectorAll('td')].slice(0,5).map(td=>td.textContent.trim())); return {n:rows.length,rows,sub:(document.querySelector('.le-card .sub')||{}).textContent}; });
T('3 envois journalisés → 3 lignes (Dépôt de pièces / E-mail / amelie, Dépôt / WhatsApp / 0612345678, Questionnaire public / E-mail / prospect), compteur « 3 envois »', w.n===3&&w.rows.some(r=>r[1]==='Dépôt de pièces'&&r[2]==='E-mail'&&r[3]==='amelie@outlook.fr'&&r[4]==='DOS-2026-000777')&&w.rows.some(r=>r[1]==='Dépôt de pièces'&&r[2]==='WhatsApp'&&r[3]==='0612345678')&&w.rows.some(r=>r[1]==='Questionnaire public'&&r[3]==='prospect@mail.fr')&&/3 envois/.test(w.sub), JSON.stringify(w));
// filtre canal + recherche
await ev(()=>liensFiltre('canal','WhatsApp')); w=await ev(()=>document.querySelectorAll('.le-tbl tbody tr').length);
T('Filtre canal WhatsApp → 1 ligne', w===1, 'n='+w);
await ev(()=>{ liensFiltre('canal',''); liensFiltre('q','prospect'); }); w=await ev(()=>document.querySelectorAll('.le-tbl tbody tr').length);
T('Recherche « prospect » → 1 ligne', w===1, 'n='+w);
await ev(()=>liensFiltre('q',''));
// renvoyer : rouvre la fenêtre avec le même lien + destinataire
await ev(()=>{ const i=DB.parametres.partagesLien.findIndex(r=>r.canal==='e-mail'&&/depot/.test(r.url)); liensRenvoyer(i); }); await p.waitForTimeout(300);
w=await ev(()=>({title:document.getElementById('ov-t').textContent,url:(document.getElementById('pl-url')||{}).value,to:(document.getElementById('pl-to')||{}).value,tel:(document.getElementById('pl-tel')||{}).value}));
T('Renvoyer (dépôt) → fenêtre de dépôt avec lien du dossier, e-mail et téléphone', /dépôt/i.test(w.title)&&/depot\.html\?d=DOS-2026-000777/.test(w.url)&&w.to==='amelie@outlook.fr'&&w.tel==='06 12 34 56 78', JSON.stringify(w));
await ev(()=>{ closeModal(); const i=DB.parametres.partagesLien.findIndex(r=>/questionnaire\.html/.test(r.url)); liensRenvoyer(i); }); await p.waitForTimeout(300);
w=await ev(()=>({url:(document.getElementById('pl-url')||{}).value,to:(document.getElementById('pl-to')||{}).value}));
T('Renvoyer (questionnaire public) → même lien, destinataire repris', /questionnaire\.html$/.test(w.url)&&w.to==='prospect@mail.fr', JSON.stringify(w));
await ev(()=>closeModal());
// lien dossier → Traitement
await ev(()=>liensOuvrirDossier('DOS-2026-000777')); await p.waitForTimeout(300);
w=await ev(()=>({page:state.page,d:state.espaceDossier}));
T('Clic sur le numéro de dossier → ouvre le Traitement du dossier', w.page==='espace'&&w.d==='do-t', JSON.stringify(w));
// export CSV (contenu) + vider
w=await ev(()=>{ state.page='params'; render(); let out=null; const _c=URL.createObjectURL; URL.createObjectURL=function(bl){ out=bl; return 'blob:x'; }; liensExport(); URL.createObjectURL=_c; return out?out.size:0; });
T('Export CSV : fichier généré (taille > 100 octets)', w>100, 'size='+w);
await ev(()=>liensVider()); await p.waitForTimeout(200);
w=await ev(()=>({n:DB.parametres.partagesLien.length,empty:!!document.querySelector('.le-card .le-empty')}));
T('Vider (après confirmation) → journal vide, carte revenue à l\'état vide', w.n===0&&w.empty, JSON.stringify(w));
await ev(()=>{ lienDepotPartager(DB.dossiers[0]); lienEnvoyerMail(); closeModal(); lienDepotPartager(DB.dossiers[0]); lienWhatsApp(); closeModal(); render(); window.scrollTo(0,document.body.scrollHeight); }); await p.waitForTimeout(300);
await p.evaluate(()=>{ const el=document.querySelector('.le-card'); el&&el.scrollIntoView(); }); await p.waitForTimeout(200); await p.screenshot({path:'v682-liens.png'});
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
