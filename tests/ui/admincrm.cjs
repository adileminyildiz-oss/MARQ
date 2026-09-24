/**
 * Mar'q — MARQ CRM : clients, ventes, achats et marchés publics (v742)
 *
 * Fige : fichier des contacts (contrôles SIREN / e-mail, échanges datés,
 * suppression refusée si pièces), devis → accepté → facture, encaissement,
 * relances graduées (rappel, deuxième relance, mise en demeure), indicateurs
 * (devis en cours, transformation, à encaisser dont échus, clients actifs),
 * alertes sur la Page Entreprise, demandes d'achat reprises du Workflow,
 * veille BOAMP (requête, filtre départements, pertinence, suivi conservé,
 * repli hors ligne), import CSV des contacts et reprise des pièces.
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
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',president:'Karim Benali'}]; DB.admin={}; DB.parametres.adminInscrits=['c1']; save(); });
  const iso=d=>d.toISOString().slice(0,10); const J=n=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
  const nb=t=>String(t||'').replace(/[\u00a0\u202f]/g,' ');
  const set=o=>ev(o=>{ for(const k in o){ const e=document.getElementById(k); if(e) e.value=o[k]; } },o);
  let r;

  // 1. inscription du module
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent)}; });
  A(r.b.includes('CRM')&&r.on.includes('MARQ CRM'),'module inscrit : registre et tuile de la page Administration',JSON.stringify(r.on));

  // 2. contacts : contrôles, création, échanges
  r=await ev(()=>{ go('mcrm'); admCrmContact(); document.getElementById('adm-ck-r').value='Nexity Lille'; document.getElementById('adm-ck-s').value='123'; admCrmContactOk(); const k1=DB.admin.c1.crm.contacts.length;
    document.getElementById('adm-ck-s').value='552 049 447'; document.getElementById('adm-ck-e').value='pas-un-mail'; admCrmContactOk(); const k2=DB.admin.c1.crm.contacts.length;
    document.getElementById('adm-ck-e').value='achats@nexity.fr'; document.getElementById('adm-ck-c').value='Mme Roux'; admCrmContactOk(); const k=DB.admin.c1.crm.contacts[0]; return {k1,k2,n:DB.admin.c1.crm.contacts.length,siren:k.siren}; });
  A(r.k1===0&&r.k2===0&&r.n===1&&r.siren==='552049447','contact : SIREN (9 chiffres) et e-mail contrôlés, puis enregistré',JSON.stringify(r));
  r=await ev(()=>{ const k=DB.admin.c1.crm.contacts[0]; admCrmEchange(k.id); document.getElementById('adm-ce-x').value='Relance devis par téléphone'; admCrmEchangeOk(k.id); return document.getElementById('view').innerText; });
  A(/Relance devis par téléphone/.test(r),'échange noté et affiché comme dernier échange');

  // 3. devis → accepté → facture → encaissement ; indicateurs
  r=await ev(({d1,d2})=>{ const c=DB.admin.c1.crm; admTab('mcrm','doc');
    admCrmPiece('Devis'); const n1=document.getElementById('adm-cp-n').value; document.getElementById('adm-cp-h').value='10000'; document.getElementById('adm-cp-d').value=d1; admCrmPieceOk('Devis',null);
    admCrmPiece('Devis'); const n2=document.getElementById('adm-cp-n').value; document.getElementById('adm-cp-h').value='4000'; document.getElementById('adm-cp-d').value=d2; admCrmPieceOk('Devis',null);
    admCrmPiece('Devis'); document.getElementById('adm-cp-n').value=n1; document.getElementById('adm-cp-h').value='1'; admCrmPieceOk('Devis',null); const dup=c.pieces.length; closeModal();
    const D=c.pieces.filter(x=>x.type==='Devis'); admCrmDevis(D[0].id,'Accepté'); admCrmDevis(D[1].id,'Refusé'); admCrmFacturer(D[0].id); admCrmFacturer(D[0].id);
    const F=c.pieces.filter(x=>x.type==='Facture'); return {n1,n2,dup,nf:F.length,fnum:F[0]&&F[0].num,ttc:F[0]&&F[0].ht,lie:D[0].factureId===F[0].id,k:document.querySelector('.crm-k').innerText}; },{d1:J(-40),d2:J(-30)});
  A(/^D-\d{4}-001$/.test(r.n1)&&/^D-\d{4}-002$/.test(r.n2)&&r.dup===2&&r.nf===1&&/^F-\d{4}-001$/.test(r.fnum)&&r.lie,'numéros suivis, doublon refusé ; devis accepté facturé une seule fois',JSON.stringify(r));
  A(/Taux de transformation\s*50 %/.test(r.k)&&/Factures à encaisser\s*12 000,00/.test(nb(r.k)),'indicateurs : transformation 50 %, 12 000 € TTC à encaisser',nb(r.k).replace(/\s+/g,' '));

  // 4. facture échue : alerte, relances graduées, mise en demeure
  r=await ev(e=>{ const c=DB.admin.c1.crm, f=c.pieces.find(x=>x.type==='Facture'); f.echeance=e; save(); const a=admCrmBilan('c1').alertes.map(x=>x.titre+' | '+x.detail);
    const T=[]; for(let i=0;i<3;i++){ admCrmRelance(f.id); T.push(document.getElementById('adm-doc').value); admCrmRelanceOk(f.id); }
    admTab('mcrm','cli'); const k=document.querySelector('.crm-k').innerText; return {a,T,rel:f.relances.length,k}; },J(-45));
  A(r.a.some(x=>/^Facture F-\d{4}-001 échue — Nexity Lille/.test(x)),'facture échue signalée (alerte rouge au-delà de 30 jours)',JSON.stringify(r.a));
  A(/reste impayée/.test(r.T[0])&&/deuxième relance/.test(r.T[1])&&/L441-10/.test(r.T[1])&&/MISE EN DEMEURE/.test(r.T[2])&&/injonction de payer/.test(r.T[2])&&r.rel===3,'relances graduées : rappel, deuxième relance (pénalités, 40 €), mise en demeure',JSON.stringify(r.T.map(t=>t.split('\n')[0])));
  A(/dont 12 000,00\s€ échus/.test(nb(r.k)),'indicateur « dont échus »',nb(r.k).replace(/\s+/g,' '));
  r=await ev(()=>{ go('entreprise'); const R=[...document.querySelectorAll('.adm-row')].filter(x=>/mcrm/.test(x.getAttribute('onclick')||'')).map(x=>x.innerText.replace(/\s+/g,' ')); go('mcrm'); return R; });
  A(r.some(x=>/Facture F-\d{4}-001 échue/.test(x)),'alerte CRM cliquable sur la Page Entreprise',JSON.stringify(r));
  r=await ev(()=>{ const c=DB.admin.c1.crm, f=c.pieces.find(x=>x.type==='Facture'); admCrmPaye(f.id); const a=admCrmBilan('c1').alertes.filter(x=>/échue/.test(x.titre)).length; admCrmPieceSuppr(f.id); return {a,st:f.statut,reste:c.pieces.some(x=>x.id===f.id)}; });
  A(r.a===0&&r.st==='Payée'&&r.reste,'encaissée : plus d’alerte ; une facture payée ne se supprime pas',JSON.stringify(r));
  r=await ev(()=>{ const c=DB.admin.c1.crm; admCrmContactSuppr(c.contacts[0].id); return c.contacts.length; });
  A(r===1,'contact avec pièces : suppression refusée');

  // 5. devis sans réponse depuis 15 jours
  r=await ev(d=>{ admTab('mcrm','doc'); admCrmPiece('Devis'); document.getElementById('adm-cp-h').value='2500'; document.getElementById('adm-cp-d').value=d; admCrmPieceOk('Devis',null); const a=admCrmBilan('c1').alertes.filter(x=>/sans réponse/.test(x.titre)).length;
    const dv=DB.admin.c1.crm.pieces.filter(x=>x.type==='Devis'&&x.statut==='En cours')[0]; admCrmRelance(dv.id); const t=document.getElementById('adm-doc').value; admCrmRelanceOk(dv.id); const b2=admCrmBilan('c1').alertes.filter(x=>/sans réponse/.test(x.titre)).length; return {a,b2,t:/devis/.test(t)}; },J(-20));
  A(r.a===1&&r.b2===0&&r.t,'devis sans réponse depuis 15 jours : alerte, disparaît après relance',JSON.stringify(r));

  // 6. demandes d'achat reprises du Workflow
  r=await ev(()=>{ go('mcrm'); admTab('mcrm','ach'); admWfNouvelle('Achat'); document.getElementById('adm-wc-o').value='Échafaudage Layher'; document.getElementById('adm-wc-m').value='18400'; admWfCreer(); go('mcrm'); admTab('mcrm','ach'); return document.getElementById('view').innerText; }); r=nb(r);
  A(/Échafaudage Layher/.test(r)&&/18 400,00/.test(r)&&/Accord du dirigeant/.test(r),'demandes d’achat : reprises du circuit Workflow avec leur étape');

  // 7. BOAMP : requête, filtre, pertinence, suivi conservé ; hors ligne
  r=await p.evaluate(async()=>{ const orig=window.fetch; let url='';
    window.fetch=function(u){ url=String(u); return Promise.resolve({ok:true,json:()=>Promise.resolve({results:[
      {idweb:'26-100001',objet:'Réhabilitation du gros œuvre du groupe scolaire',nomacheteur:'Ville de Tourcoing',dateparution:'2026-09-20',datelimitereponse:'2026-10-14',code_departement:['59'],url_avis:'https://www.boamp.fr/avis/26-100001'},
      {idweb:'26-100002',objet:'Extension gymnase — réhabilitation',nomacheteur:'CC Pévèle',dateparution:'2026-09-21',datelimitereponse:'2026-10-21',code_departement:['59']},
      {idweb:'26-100003',objet:'Gros œuvre logements',nomacheteur:'Bailleur 75',dateparution:'2026-09-19',datelimitereponse:'2026-11-03',code_departement:['75']}]})}); };
    go('mcrm'); admTab('mcrm','ao'); document.getElementById('adm-bo-m').value='gros œuvre, réhabilitation'; document.getElementById('adm-bo-d').value='59, 62';
    const n1=await admCrmBoamp(); const A_=DB.admin.c1.crm.boamp.avis; admCrmBoSt('26-100002','À étudier'); const n2=await admCrmBoamp();
    window.fetch=()=>Promise.reject(new Error('réseau')); const n3=await admCrmBoamp(); window.fetch=orig;
    return {url:decodeURIComponent(url),n1,n2,n3,ids:A_.map(a=>a.id),pert:A_.map(a=>a.pert),st:A_.find(a=>a.id==='26-100002').statut,lien:A_.find(a=>a.id==='26-100002').url,t:document.getElementById('view').innerText,toast:window.__toasts.slice(-1)[0]}; });
  A(/boamp-datadila\.opendatasoft\.com/.test(r.url)&&/"gros œuvre" OR "réhabilitation"/.test(r.url)&&/datelimitereponse >= date'/.test(r.url),'BOAMP : requête sur l’API ouverte avec les mots-clés et les avis encore ouverts',r.url.slice(0,220));
  A(r.n1===2&&r.ids.join()==='26-100001,26-100002'&&r.pert.join()==='Forte,Forte','filtre par départements (Paris écarté) ; pertinence calculée',JSON.stringify(r));
  A(r.n2===0&&r.st==='À étudier'&&/boamp\.fr\/pages\/avis/.test(r.lien),'nouvelle recherche : pas de doublon, suivi conservé ; lien de l’avis reconstitué',JSON.stringify({n2:r.n2,st:r.st,lien:r.lien}));
  A(r.n3===-1&&/injoignable/.test(r.toast)&&/Réhabilitation du gros œuvre/.test(r.t),'BOAMP injoignable : message clair, avis conservés',r.toast);
  r=await ev(()=>{ admCrmBoAjout(); document.getElementById('adm-ba-o').value='Marché de voirie'; document.getElementById('adm-ba-l').value='2026-10-01'; document.getElementById('adm-ba-u').value='javascript:alert(1)'; admCrmBoAjoutOk(); const a=DB.admin.c1.crm.boamp.avis.length;
    document.getElementById('adm-ba-u').value=''; admCrmBoAjoutOk(); return {a,b:DB.admin.c1.crm.boamp.avis.length}; });
  A(r.a===2&&r.b===3,'avis ajouté à la main ; lien non https refusé',JSON.stringify(r));

  // 8. import CSV
  r=await ev(()=>{ const t='Raison sociale;SIREN;E-mail;Ville;Type\n"Ville de Roubaix";217 505 128;marches@ville-roubaix.fr;Roubaix;client\nNexity Lille;552049447;;Lille;\nSCI Les Forges;;;;prospect\n;;;;'; const a=admCrmImport('contacts',t); const C=DB.admin.c1.crm.contacts;
    const t2='type,numero,client,date,echeance,montant ht,tva,statut\nFacture,F-2026-112,SCI Les Forges,12/03/2026,11/04/2026,"1 250,50",20,payée\nDevis,D-2026-041,Nexity Lille,2026-09-01,,68200,20,en cours\nFacture,F-2026-113,Garage Martin,15/08/2026,15/09/2026,900,10,\nFacture,,X,01/01/2026,,5,,'; const b2=admCrmImport('pieces',t2);
    const P=DB.admin.c1.crm.pieces, f=P.find(x=>x.num==='F-2026-112'); return {a,b2,n:C.length,roux:C.find(x=>/Roubaix/.test(x.raison)).siren,pros:C.find(x=>/Forges/.test(x.raison)).type,garage:C.some(x=>x.raison==='Garage Martin'),f:f&&[f.date,f.ht,f.statut,f.payeLe].join('|')}; });
  A(r.a.cr===2&&r.a.mj===1&&r.a.ig===0&&r.roux==='217505128'&&r.pros==='Prospect','import des contacts : « ; », guillemets, SIREN nettoyé, doublon mis à jour, lignes vides écartées',JSON.stringify(r));
  A(r.b2.cr===3&&r.b2.ig===1&&r.garage&&r.f==='2026-03-12|1250.5|Payée|2026-04-11','reprise des pièces : « , », dates françaises, montants à virgule, client inconnu créé, statut payée',JSON.stringify(r));

  // 9. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['cli','doc','ach','ao','imp']){ r=await ev(t=>{ go('mcrm'); admTab('mcrm',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')&&!e.closest('.adm-mbar')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
