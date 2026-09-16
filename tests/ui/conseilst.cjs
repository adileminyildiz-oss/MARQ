const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(2000);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.__sent=[]; window.demEnvoiDirect=function(to,s,b){ window.__sent.push({to,s,b}); return true; };
  window.__popups=[]; window.open=function(){ const doc={html:'',write(s){ this.html+=s; },close(){}}; const w={document:doc,print(){}}; window.__popups.push(w); return w; };
  const D=86400000, now=Date.now(), plus=(n)=>new Date(now+n*D).toISOString().slice(0,10);
  DB.parametres=DB.parametres||{}; DB.parametres.cabinet={nom:'AEM CONSEIL',email:'aemconseil.sas@gmail.com',tel:'01 00 00 00 00'}; DB.parametres.conseilsSeuils=null; DB.parametres.hebdoEnvoyes={};
  DB.clients=[{id:'c1',nom:'Bernard',prenom:'Amélie',denomination:'AB DESIGN',forme:'SAS',siren:'123456789',capital:'500',adresse:'10 rue Haute',cp:'75011',ville:'Paris',ape:'7410Z',email:'amelie@outlook.fr',tel:'06 12 34 56 78',regime:'IS',salaries:[{nom:'X'}],gerant:{prenom:'Amélie',nom:'Bernard',fonction:'Présidente'}},
             {id:'c2',nom:'Martin',prenom:'Paul',denomination:'PM IMMO',forme:'SCI',email:'paul@mail.fr',regime:'IR'}];
  DB.demandes=[];
  DB.dossiers=[{id:'do-t',ref:'DOS-2026-000777',clientIds:['c1'],serviceIds:[],statut:'Pièces attendues',createdAt:'2026-09-01',historique:[{d:plus(-1),t:'Statuts signés reçus'}],wf:{__v6:1,demande:{done:1}},pieces:{},docs:{},piecesRecues:{},notesList:[{id:'n1',ts:now-D,type:'afaire',txt:'Relancer la banque',qui:'Karim',echeance:plus(2)}],signEnv:{statut:'en attente'},annonceLegale:{commande:true},formalite:'Création SAS'},
               {id:'do-p',ref:'DOS-2026-000888',clientIds:['c2'],serviceIds:[],statut:'Nouveau',createdAt:'2026-09-01',historique:[]}];
  DB.parametres.facturier=[{id:'f1',numero:'F-2026-001',type:'facture',statut:'emise',ttc:1200,date:plus(-20),echeance:plus(-5),paye:false,clientId:'c1',dossierId:'do-t'}];
  DB.parametres.rdv=[{id:'r1',clientId:'c1',clientNom:'Amélie Bernard',date:plus(3),heure:'10:00',objet:'Signature des statuts',statut:'confirmé'}];
  DB.abonnes=[{id:'a1',nom:'AB DESIGN',email:'amelie@outlook.fr',offre:'Accompagnement fiscal',prix:120,freq:'mois',statut:'actif',tva:'Franchise en base',obligations:[{lbl:'Déclaration de TVA',date:plus(12)}]}];
  DB.parametres.cfChaine={journal:[{ts:now-2*D,step:'Mensualités',ok:true,detail:'AB DESIGN · 1 mensualité générée',mode:'automatique'}]};
  state.page='clients'; state.cliSel='c1'; render(); });
await p.waitForTimeout(500);
// 1. moteur de conseils
let w=await ev(()=>{ const S=syntheseSociete('c1'); const L=conseilsSociete(S); return {n:L.length,t:L.map(x=>x.titre),cat:L.map(x=>x.cat+'/'+x.niv),priv:L.filter(x=>!x.pub).map(x=>x.titre)}; });
T('Conseils SAS à l\'IS, franchise en base, 1 salarié, capital 500 €, création en cours : statut du président, IS, franchise de TVA, CFE, obligations salariés, pièces manquantes, actes à signer, annonce, capital faible, conservation', w.n>=10&&w.t.some(x=>/président/i.test(x))&&w.t.indexOf('Impôt sur les sociétés')>=0&&w.t.indexOf('Franchise en base de TVA')>=0&&w.t.indexOf('Cotisation foncière des entreprises')>=0&&w.t.indexOf('Obligations liées aux salariés')>=0&&w.t.indexOf('Pièces manquantes au dossier')>=0&&w.t.indexOf('Actes à signer')>=0&&w.t.indexOf('Annonce légale en cours')>=0&&w.t.indexOf('Montant du capital social')>=0&&w.t.indexOf('Conservation des documents')>=0, JSON.stringify(w.t));
T('Facture en retard : conseil réservé au cabinet (non publié au client)', w.priv.indexOf('Factures en retard de paiement')>=0, JSON.stringify(w.priv));
w=await ev(()=>{ const L=conseilsSociete(syntheseSociete('c2')); return L.map(x=>x.titre); });
T('SCI à l\'IR : conseil « SCI : régime d\'imposition » et « Impôt sur le revenu », pas de conseil SAS ni salariés', w.indexOf('SCI : régime d\'imposition')>=0&&w.indexOf('Impôt sur le revenu')>=0&&!w.some(x=>/président/i.test(x))&&w.indexOf('Obligations liées aux salariés')<0, JSON.stringify(w));
// 2. section dans la synthèse + A4
await p.click('.cli-fiche-head .sy-btn'); await p.waitForTimeout(500);
w=await ev(()=>{ const d=document.querySelector('#sy-body .sy-doc'); const cs2=getComputedStyle(d); const t=d.innerText; return {w:Math.round(parseFloat(cs2.width)),h:Math.round(parseFloat(cs2.minHeight)),cs:/CONSEILS FISCAUX & ADMINISTRATIFS/i.test(t),fisc:/Fiscal/.test(t)&&/Administratif/.test(t),dis:/à titre indicatif/.test(t),retard:/Factures en retard de paiement/.test(t),niv:[...d.querySelectorAll('.cs-it')].length}; });
T('Synthèse en A4 (794 × 1123 px) avec la section « Conseils fiscaux & administratifs » (Fiscal / Administratif, mention indicative, conseil interne visible en vue cabinet)', w.w>=790&&w.w<=800&&w.h>=1120&&w.cs&&w.fisc&&w.dis&&w.retard&&w.niv>=10, JSON.stringify(w));
await p.screenshot({path:'v689-synthese-a4.png'});
await p.click('.sy-mode[data-m="client"]'); await p.waitForTimeout(300);
w=await ev(()=>{ const t=document.querySelector('#sy-body .sy-doc').innerText; return {cs:/CONSEILS FISCAUX & ADMINISTRATIFS/i.test(t),retard:/Factures en retard de paiement/.test(t),pres:/président/i.test(t)}; });
T('Vue client : conseils présents, mais le conseil interne sur les impayés est retiré', w.cs&&!w.retard&&w.pres, JSON.stringify(w));
// 3. point hebdomadaire
w=await ev(()=>({btn:!!document.querySelector('#ov-f button[onclick*="hebdoOuvrir"]')}));
T('Bouton « Point hebdomadaire » dans la synthèse', w.btn, JSON.stringify(w));
await p.click('#ov-f button[onclick*="hebdoOuvrir"]'); await p.waitForTimeout(500);
w=await ev(()=>{ const d=document.querySelector('#hb-body .sy-doc'); const cs2=getComputedStyle(d); const t=d.innerText; return {title:document.getElementById('ov-t').textContent,w:Math.round(parseFloat(cs2.width)),h:Math.round(parseFloat(cs2.minHeight)),secs:[...d.querySelectorAll('.sy-h')].map(x=>x.textContent),fait:/Statuts signés reçus/.test(t),att:/Ce que nous attendons de vous/i.test(t),av:/Signature des statuts/.test(t),cs:/CONSEILS FISCAUX/i.test(t),interne:/Relancer la banque/.test(t),kpi:[...d.querySelectorAll('.sy-kpis>div')].length}; });
T('Point hebdomadaire version client, en A4 : chiffres, « Ce qui a avancé cette semaine », « Où en est votre dossier », « À venir », « Ce que nous attendons de vous », conseils ; note interne exclue', w.w>=790&&w.h>=1120&&/Point hebdomadaire · AB DESIGN/.test(w.title)&&w.fait&&w.att&&w.av&&w.cs&&!w.interne&&w.kpi===3, JSON.stringify(w));
await p.screenshot({path:'v689-hebdo-client.png'});
await p.click('.hb-mode[data-m="cabinet"]'); await p.waitForTimeout(300);
w=await ev(()=>{ const d=document.querySelector('#hb-body .sy-doc'); const t=d.innerText; return {prep:/préparation interne/.test(t),interne:/Relancer la banque/.test(t),bloq:/Blocages/.test(t),att:/À demander au client/i.test(t),kpi:[...d.querySelectorAll('.sy-kpis>div')].length}; });
T('Version cabinet : « préparation interne », blocages de l\'étape, note interne à faire, « À demander au client », 4 chiffres', w.prep&&w.interne&&w.bloq&&w.att&&w.kpi===4, JSON.stringify(w));
await p.screenshot({path:'v689-hebdo-cabinet.png'});
// navigation semaine
w=await ev(()=>{ const a=document.querySelector('#hb-body .sy-sub').textContent; hebdoSemaine(-1); const b=document.querySelector('#hb-body .sy-sub').textContent; hebdoSemaine(1); return {a,b,diff:a!==b}; });
T('Navigation « Semaine précédente / suivante »', w.diff&&/Point de la semaine du/.test(w.a), JSON.stringify(w));
// impression A4
w=await ev(()=>{ window.__popups=[]; hebdoImprimer(); const h=(window.__popups[0]||{document:{html:''}}).document.html; return {n:window.__popups.length,a4:/width:210mm/.test(h)&&/size:A4/.test(h),cs:/cs-obligation/.test(h),doc:/Point de la semaine/.test(h)&&/AB DESIGN/.test(h)}; });
T('Imprimer / PDF du point hebdomadaire : page A4 (210 mm, @page size:A4), styles des conseils inclus', w.n===1&&w.a4&&w.cs&&w.doc, JSON.stringify(w));
// envoi au client
w=await ev(()=>{ window.__sent=[]; hebdoEnvoyer(); return {title:document.getElementById('ov-t').textContent,to:(document.getElementById('hb-to')||{}).value,s:(document.getElementById('hb-sujet')||{}).value,c:(document.getElementById('hb-corps')||{}).value||''}; });
T('Envoyer au client : fenêtre d\'envoi préremplie (destinataire, objet « Point de la semaine », message reprenant avancées, dossier, à venir, attendu, points d\'attention)', /Envoyer le point hebdomadaire/.test(w.title)&&w.to==='amelie@outlook.fr'&&/^Point de la semaine du/.test(w.s)&&/Ce qui a avancé/.test(w.c)&&/Où en est votre dossier/.test(w.c)&&/À venir/.test(w.c)&&/Ce que nous attendons de vous/.test(w.c)&&/Points d.attention/.test(w.c), JSON.stringify({title:w.title,to:w.to,s:w.s}));
w=await ev(()=>{ window.__sent=[]; hebdoEnvoyerNow(); return {sent:window.__sent.length,to:(window.__sent[0]||{}).to,s:(window.__sent[0]||{}).s,marque:Object.keys(DB.parametres.hebdoEnvoyes||{}),j:(DB.parametres.hebdoJournal||[])[0]}; });
T('Envoi effectif par la passerelle, semaine marquée pour la société, journal des envois', w.sent===1&&w.to==='amelie@outlook.fr'&&/Point de la semaine/.test(w.s)&&w.marque.length===1&&w.j&&w.j.ok===true, JSON.stringify(w));
// rappel Prévoyance du lundi
w=await ev(()=>{ DB.parametres.hebdoEnvoyes={}; DB.parametres.prevoyance=null; const j=new Date().getDay(); const items=prevItems().filter(o=>/^hebdo:/.test(o.key)); return {jour:j,n:items.length,it:items[0]&&{niv:items[0].niveau,cat:items[0].cat,titre:items[0].titre,det:items[0].detail}}; });
T('Prévoyance : rappel « Points hebdomadaires à préparer » le lundi ou mardi (2 sociétés en attente), absent les autres jours', (w.jour===1||w.jour===2)?(w.n===1&&/Points hebdomadaires à préparer/.test(w.it.titre)&&/2 société/.test(w.it.det)):(w.n===0), JSON.stringify(w));
T('0 erreur de page', errs.length===0, errs.join(' | '));
console.log('TOTAL', ok, 'ok /', ko, 'ko'); await b.close(); process.exit(ko?1:0); })();
