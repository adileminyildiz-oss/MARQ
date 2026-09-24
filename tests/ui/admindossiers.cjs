/**
 * Mar'q — Administration : inscription de chaque dossier et choix obligatoire (v741)
 *
 * Fige : aucune société n'entre dans l'Administration sans être inscrite ;
 * à chaque entrée dans le module (depuis une autre page, ou au chargement),
 * le dossier se choisit dans une liste — plus d'ouverture automatique ; la
 * navigation entre pages de l'Administration garde le dossier choisi.
 * Sociétés et dossiers de formalité sont regroupés (dossiers rattachés par
 * le client ou la dénomination) ; un dossier sans fiche société permet de
 * créer la fiche, qui est inscrite ; retirer conserve les données ;
 * recherche ; affichage téléphone.
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
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{};
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',siren:'912345678'},{id:'c2',clientType:'entreprise',denomination:'Axiome Formation',forme:'sarl'},{id:'p1',clientType:'particulier',prenom:'Jean',nom:'DUPONT'}];
    DB.dossiers=[{id:'d1',ref:'DOS-2610',clientIds:['c1'],statut:'En cours',historique:[]},{id:'d4',ref:'DOS-2614',clientIds:['c1'],statut:'Terminé',historique:[]},{id:'d2',ref:'DOS-2611',clientIds:['p1'],denom:'AXIOME FORMATION',statut:'Terminé',historique:[]},{id:'d3',ref:'DOS-2612',clientIds:['p1'],denom:'LES TERRASSES DU PORT',statut:'Pièces attendues',historique:[]}];
    DB.admin={}; delete DB.parametres.adminInscrits; DB.parametres.adminEnt='c1'; save(); });
  const vue=()=>ev(()=>document.getElementById('view').innerText);
  let r;

  // 1. rien d'inscrit : pas d'ouverture automatique, sociétés à inscrire avec leurs dossiers
  r=await ev(()=>{ go('cockpit'); go('entreprise'); const t=document.getElementById('view').innerText; return {t,sel:!!document.getElementById('adm-ent'),tiles:document.querySelectorAll('button.adm-tile').length}; });
  A(!r.sel&&!r.tiles&&/Aucun dossier inscrit/.test(r.t)&&/À inscrire/.test(r.t)&&/BATI-NORD/.test(r.t),'aucun dossier inscrit : pas d’ouverture automatique, liste « À inscrire »',r.t.slice(0,200));
  r=await ev(()=>{ const rows=[...document.querySelectorAll('.adm-ch')].map(x=>x.innerText.replace(/\s+/g,' ')); return rows; });
  A(r.some(x=>/BATI-NORD.*DOS-2610/.test(x))&&r.some(x=>/Axiome Formation.*DOS-2611/.test(x))&&!r.some(x=>/DUPONT/.test(x)),'sociétés et dossiers regroupés (par client et par dénomination) ; particuliers exclus',JSON.stringify(r));
  await p.waitForTimeout(700);
  r=await ev(()=>{ const row=[...document.querySelectorAll('.adm-ch')].find(x=>/BATI-NORD/.test(x.innerText)); return {vis:[...row.querySelectorAll('.adm-dtag')].filter(b=>b.getBoundingClientRect().width>0&&!b.closest('.kb-cache')).length,kb:!!row.querySelector('.kb-dots')}; });
  A(r.vis===2&&!r.kb,'plusieurs dossiers d’une même société affichés en clair (pas regroupés derrière « ⋮ »)',JSON.stringify(r));
  r=await ev(()=>{ const t=document.getElementById('view').innerText; return /Dossiers sans fiche société/.test(t)&&/DOS-2612/.test(t)&&/LES TERRASSES DU PORT/.test(t); });
  A(r,'dossier de formalité sans fiche société proposé à part');
  r=await ev(()=>{ admEntChoisir('c2'); return {sel:DB.parametres.adminEnt,t:document.getElementById('view').innerText}; });
  A(!r.sel&&/À inscrire/.test(r.t),'un dossier non inscrit ne peut pas être ouvert');

  // 2. inscription puis choix obligatoire
  r=await ev(()=>{ admInscrire('c1'); const t1=document.getElementById('view').innerText; const s1=!!document.getElementById('adm-ent'); admInscrire('c2',1); const t2=document.getElementById('view').innerText; return {I:DB.parametres.adminInscrits,s1,ch:/Choisir le dossier/.test(t1)&&/BATI-NORD/.test(t1),t2}; });
  A(r.I.join()==='c1,c2'&&!r.s1&&r.ch&&/Axiome Formation/.test(r.t2)&&/Tableau de bord|Échéances/.test(r.t2),'« Inscrire » ajoute à la liste de choix ; « Inscrire et ouvrir » ouvre la Page Entreprise',JSON.stringify(r.I));
  r=await ev(()=>{ const o=[...document.querySelectorAll('#adm-ent option')].map(x=>x.textContent); admEntChoisir('c1'); go('mlegal'); const a=DB.parametres.adminEnt; go('mfiscal'); const b2=DB.parametres.adminEnt; return {o,a,b2,t:document.getElementById('view').innerText.slice(0,300)}; });
  A(r.o.length===2&&r.a==='c1'&&r.b2==='c1'&&/BATI-NORD/.test(r.t),'le sélecteur ne propose que les dossiers inscrits ; le choix suit d’une page de l’Administration à l’autre',JSON.stringify(r));
  r=await ev(()=>{ go('cockpit'); go('mfiscal'); const t=document.getElementById('view').innerText; return {sel:DB.parametres.adminEnt,t}; });
  A(!r.sel&&/Choisir le dossier/.test(r.t),'revenir dans l’Administration depuis une autre page redemande le dossier');
  r=await ev(()=>{ admEntChoisir('c2'); const a=DB.parametres.adminEnt; admEntChanger(); return {a,b:DB.parametres.adminEnt,t:/Choisir le dossier/.test(document.getElementById('view').innerText)}; });
  A(r.a==='c2'&&!r.b&&r.t,'« Changer de dossier » ramène à la liste',JSON.stringify(r));

  // 3. rechargement : le choix est redemandé
  await p.reload(); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  r=await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); admEntChoisir('c1'); go('cockpit'); go('entreprise'); return {sel:DB.parametres.adminEnt,t:/Choisir le dossier/.test(document.getElementById('view').innerText),I:DB.parametres.adminInscrits}; });
  A(!r.sel&&r.t&&r.I.join()==='c1,c2','après rechargement : inscriptions conservées, dossier à choisir',JSON.stringify(r));

  // 4. dossier sans fiche → fiche créée, rattachée, inscrite
  r=await ev(()=>{ admDossierSociete('d3'); const v=document.getElementById('adm-ds-n').value; document.getElementById('adm-ds-f').value='SARL'; admDossierSocieteOk('d3');
    const c=DB.clients.find(x=>x.denomination==='LES TERRASSES DU PORT'); const d=DB.dossiers.find(x=>x.id==='d3'); return {v,c:!!c&&c.clientType==='entreprise'&&c.forme==='SARL',lie:!!c&&d.clientIds.indexOf(c.id)>=0,ins:!!c&&DB.parametres.adminInscrits.indexOf(c.id)>=0,ouvert:!!c&&DB.parametres.adminEnt===c.id}; });
  A(r.v==='LES TERRASSES DU PORT'&&r.c&&r.lie&&r.ins&&r.ouvert,'dossier sans fiche : fiche société créée (dénomination reprise), rattachée au dossier, inscrite et ouverte',JSON.stringify(r));
  r=await ev(()=>{ admEntChanger(); return /Dossiers sans fiche société/.test(document.getElementById('view').innerText); });
  A(!r,'plus de dossier orphelin une fois la fiche créée');

  // 5. retirer conserve les données ; réinscription les retrouve
  r=await ev(()=>{ admEntChoisir('c1'); go('mlegal'); admKbis('2026-01-15'); const k=DB.admin.c1.legal.kbis.date; admRetirer('c1'); const I=DB.parametres.adminInscrits.slice(); const sel=DB.parametres.adminEnt; const garde=!!(DB.admin.c1&&DB.admin.c1.legal.kbis.date===k); admInscrire('c1',1); go('mlegal'); return {I,sel,garde,k}; });
  A(r.I.indexOf('c1')<0&&!r.sel&&r.garde&&!!r.k,'retirer un dossier le sort de la liste sans effacer ses données ; réinscrit, il les retrouve',JSON.stringify(r));

  // 6. recherche et étiquettes de dossier
  r=await ev(()=>{ admEntChanger(); admChoixQ('2610'); const vis=[...document.querySelectorAll('.adm-ch')].filter(x=>!x.hidden).map(x=>x.innerText.split('\n')[0]); admChoixQ(''); return vis; });
  A(r.length===1&&/BATI-NORD/.test(r[0]),'recherche par n° de dossier',JSON.stringify(r));
  r=await ev(()=>{ const t=[...document.querySelectorAll('button.adm-dtag')].find(x=>/DOS-2610/.test(x.textContent)); t.click(); return {page:state.page,dos:state.espaceDossier}; });
  A(r.page==='espace'&&r.dos==='d1','étiquette de dossier : ouvre le dossier de formalité',JSON.stringify(r));

  // 7. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  r=await ev(()=>{ go('entreprise'); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth,ch:document.querySelectorAll('.adm-ch').length}; });
  A(!r.o.length&&!r.hs&&r.ch>=3,'téléphone : liste de choix sans débordement',JSON.stringify(r));
  r=await ev(()=>{ admEntChoisir('c1'); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; });
  A(!r.o.length&&!r.hs,'téléphone : sélecteur et « Changer de dossier » dans l’écran',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
