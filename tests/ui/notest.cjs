const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.uiConfirm=(m,fn)=>fn&&fn();
  DB.parametres=DB.parametres||{}; DB.parametres.prevoyance=null; DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',email:'amelie@outlook.fr'}]; DB.demandes=[];
  DB.dossiers=[{id:'do-t',ref:'DOS-2026-000777',clientIds:['c1'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[],notes:'Mémo existant'}];
  state.page='espace'; state.espaceDossier='do-t'; state.espTab='notes'; render(); try{ trwGo('notes'); }catch(e){} });
await p.waitForTimeout(500);
let w=await ev(()=>{ const panel=document.querySelector('.esp-tabpanel[data-tab="notes"]'); const wrap=panel&&panel.querySelector('.nj-wrap'); return {panel:!!panel,vis:!!(panel&&panel.offsetParent),wrap:!!wrap,memo:(panel&&panel.querySelector('textarea')||{}).value,form:!!(wrap&&wrap.querySelector('.nj-form')),empty:!!(wrap&&wrap.querySelector('.nj-empty')),types:wrap?[...wrap.querySelectorAll('.nj-form select option')].map(o=>o.textContent):[]}; });
T('Onglet Notes : mémo existant conservé + journal de notes (formulaire Note / Appel / Rendez-vous / À faire, état vide)', w.panel&&w.vis&&w.wrap&&w.memo==='Mémo existant'&&w.form&&w.empty&&JSON.stringify(w.types)==='["Note","Appel","Rendez-vous","À faire"]', JSON.stringify(w));
// ajout via le formulaire (Entrée)
await p.fill('#nj-txt-do-t','Appel du client : demande un délai'); await p.selectOption('#nj-type-do-t','appel'); await p.press('#nj-txt-do-t','Enter'); await p.waitForTimeout(300);
w=await ev(()=>{ const it=document.querySelector('.nj-it'); return {n:DB.dossiers[0].notesList.length,type:DB.dossiers[0].notesList[0].type,qui:DB.dossiers[0].notesList[0].qui,dom:it?it.innerText:'',input:(document.getElementById('nj-txt-do-t')||{}).value}; });
T('Entrée dans le champ → note « Appel » enregistrée, signée, affichée, champ vidé', w.n===1&&w.type==='appel'&&/APPEL/.test(w.dom)&&/demande un délai/.test(w.dom)&&w.qui&&w.input==='', JSON.stringify(w));
// à faire avec échéance dans 2 jours → Prévoyance
w=await ev(()=>{ const d=new Date(Date.now()+2*86400000).toISOString().slice(0,10); const n=noteAjouter('do-t',{type:'afaire',txt:'Relancer la banque pour le dépôt de capital',echeance:d}); const items=prevItems().filter(o=>/^note:/.test(o.key)); const dom=document.querySelector('.nj-it .nj-ech'); return {n:!!n,items:items.map(o=>({cat:o.cat,niv:o.niveau,titre:o.titre,det:o.detail,quand:o.quand})),ech:dom?dom.textContent:'',d}; });
T('Note « À faire » avec échéance J+2 → point de Prévoyance (sous 7 j, info) « Amélie Bernard · DOS-… · à faire », badge d\'échéance « dans 2 j »', w.n&&w.items.length===1&&w.items[0].cat==='semaine'&&w.items[0].niv==='info'&&/Amélie Bernard · DOS-2026-000777 · à faire/.test(w.items[0].titre)&&/Relancer la banque/.test(w.items[0].det)&&w.items[0].quand===w.d&&/dans 2 j/.test(w.ech), JSON.stringify(w));
// en retard → critique ; fait → disparaît
w=await ev(()=>{ const d=new Date(Date.now()-3*86400000).toISOString().slice(0,10); const n=noteAjouter('do-t',{type:'afaire',txt:'Envoyer le devis',echeance:d}); const it=prevItems().filter(o=>o.key==='note:do-t:'+n.id)[0]; noteFait('do-t',n.id); const gone=!prevItems().some(o=>o.key==='note:do-t:'+n.id); const done=!!document.querySelector('.nj-it.done'); return {cat:it&&it.cat,niv:it&&it.niveau,gone,done,fait:DB.dossiers[0].notesList.find(x=>x.id===n.id).fait}; });
T('À faire en retard → critique « en retard » ; marquée faite → disparaît de la Prévoyance, barrée dans la liste', w.cat==='retard'&&w.niv==='crit'&&w.gone&&w.done&&w.fait===true, JSON.stringify(w));
// épingle : passe en tête
w=await ev(()=>{ const n=DB.dossiers[0].notesList.find(x=>x.type==='appel'); noteEpingler('do-t',n.id); const first=document.querySelector('.nj-it'); return {pin:first.classList.contains('pin'),id:first.getAttribute('data-n')===n.id,lbl:first.querySelector('.nj-acts').innerText}; });
T('Épingler → la note passe en tête, bouton « Désépingler »', w.pin&&w.id&&/Désépingler/.test(w.lbl), JSON.stringify(w));
// recherche
await ev(()=>noteRecherche('do-t','banque')); w=await ev(()=>({n:document.querySelectorAll('.nj-it').length,txt:(document.querySelector('.nj-it .nj-txt')||{}).textContent}));
T('Recherche « banque » → 1 note', w.n===1&&/banque/.test(w.txt), JSON.stringify(w)); await ev(()=>noteRecherche('do-t',''));
// suppression + mémo toujours fonctionnel + audit
w=await ev(()=>{ const n=DB.dossiers[0].notesList.find(x=>x.type==='appel'); noteSupprimer('do-t',n.id); const ta=document.querySelector('.esp-tabpanel[data-tab="notes"] textarea'); ta.value='Mémo modifié'; espNotesSave('do-t'); const au=auditEntrees().filter(o=>o.src==='notes'); return {n:DB.dossiers[0].notesList.length,memo:DB.dossiers[0].notes,au:au.map(o=>o.action),ref:au[0]&&au[0].ref}; });
T('Suppression (après confirmation) → 2 notes restantes ; mémo général toujours enregistré ; notes reprises dans le journal d\'audit (« À faire · fait », « À faire · à faire »)', w.n===2&&w.memo==='Mémo modifié'&&w.au.length===2&&w.au.indexOf('À faire · fait')>=0&&w.au.indexOf('À faire · à faire')>=0&&/DOS-2026-000777 · Amélie Bernard/.test(w.ref||''), JSON.stringify(w));
// ouverture depuis la Prévoyance
w=await ev(()=>{ state.page='cockpit'; render(); const it=prevItems().filter(o=>/^note:/.test(o.key))[0]; it.open(); return {page:state.page,d:state.espaceDossier,tab:state.espTab,vis:!!(document.querySelector('.esp-tabpanel[data-tab="notes"]')||{}).offsetParent}; });
T('Ouvrir depuis la Prévoyance → Traitement du dossier, onglet Notes affiché', w.page==='espace'&&w.d==='do-t'&&w.tab==='notes'&&w.vis, JSON.stringify(w));
await p.waitForTimeout(300); await p.evaluate(()=>{ const el=document.querySelector('.nj-wrap'); el&&el.scrollIntoView({block:'center'}); }); await p.waitForTimeout(200); await p.screenshot({path:'v687-notes.png'});
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
