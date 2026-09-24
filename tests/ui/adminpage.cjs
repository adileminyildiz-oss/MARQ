/**
 * Mar'q — Administration sur une seule page (v753)
 *
 * Fige : une seule entrée « Administration » dans la barre latérale (les
 * modules n'y figurent plus) ; la page demande d'abord le client, puis
 * présente tous les modules ; chaque page de l'Administration porte la
 * barre des modules (module en cours marqué, nombre d'alertes) et
 * l'entrée « Administration » reste active ; un module ouvert sans
 * client choisi demande le client puis s'ouvre pour lui.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas'},{id:'c2',clientType:'entreprise',denomination:'ALPHA',forme:'sarl'}];
    DB.admin={c1:{rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',contrat:'CDI',entree:'2019-01-01',actif:true}],absences:[],notes:[]}},c2:{}}; DB.parametres.adminInscrits=['c1','c2']; save(); });
  const MODS=['Legal','CRM','Fiscal','RH','Paye','Doc','Workflow','IA','Control','Reporting','Archive'];
  let r=await ev(()=>{ go('cockpit'); const vis=[...document.querySelectorAll('#nav .nav-btn')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()); return vis; });
  A(r.includes('Administration')&&!['Legal','CRM','Paye','Workflow','Control','Reporting','Archive'].some(x=>r.includes(x)),'barre latérale : une seule entrée « Administration »',JSON.stringify(r));
  r=await ev(()=>{ go('entreprise'); const v=document.getElementById('view'); return {t:v.innerText,mb:v.querySelectorAll('.adm-mb').length,sel:!!document.getElementById('adm-ent'),g:[...v.querySelectorAll('.adm-gm i')].map(x=>x.textContent)}; });
  A(!r.sel&&r.mb===0&&/Choisissez le client/.test(r.t)&&/Choisir le dossier/.test(r.t),'page Administration : le client se choisit d’abord (aucun module ouvert)',JSON.stringify({mb:r.mb,sel:r.sel}));
  A(MODS.every(m=>r.g.includes(m)),'page Administration : tous les modules présentés avant le choix',JSON.stringify(r.g));
  r=await ev(()=>{ admEntChoisir('c1'); const v=document.getElementById('view'); const mb=[...v.querySelectorAll('.adm-mb')]; return {l:mb.map(x=>x.querySelector('span').textContent),on:mb.filter(x=>x.classList.contains('on')).map(x=>x.textContent),rh:(mb.find(x=>/RH/.test(x.textContent))||{}).textContent,nav:(document.querySelector('#nav .nav-btn.on')||{}).textContent}; });
  A(r.l.join()==='Vue d’ensemble,'+MODS.join()&&r.on.join()==='Vue d’ensemble'&&/^RH\d+$/.test(r.rh)&&/Administration/.test(r.nav||''),'client choisi : barre des modules (vue d’ensemble active, alertes par module)',JSON.stringify(r));
  for(const [id,lbl] of [['mfiscal','Fiscal'],['mlegal','Legal'],['marchive','Archive'],['mcrm','CRM']]){
    r=await ev(({id})=>{ const bt=[...document.querySelectorAll('#view .adm-mb')].find(x=>x.getAttribute('onclick').indexOf('"'+id+'"')>=0); bt.click(); const v=document.getElementById('view'); return {p:state.page,on:[...v.querySelectorAll('.adm-mb.on')].map(x=>x.querySelector('span').textContent),cli:(document.getElementById('adm-ent')||{}).value,nav:(document.querySelector('#nav .nav-btn.on')||{}).textContent,pe:[...v.querySelectorAll('button')].some(b=>b.textContent.trim()==='Page Entreprise')}; },{id});
    A(r.p===id&&r.on.join()===lbl&&r.cli==='c1'&&/Administration/.test(r.nav||'')&&!r.pe,lbl+' : ouvert dans la page pour le même client, entrée « Administration » active',JSON.stringify(r));
  }
  r=await ev(()=>{ go('cockpit'); go('mpaye'); const t=document.getElementById('view').innerText; const a={sel:!!document.getElementById('adm-ent'),t:/Le module Paye s’ouvre pour ce client/.test(t)}; admEntChoisir('c2'); return {a,p:state.page,cli:document.getElementById('adm-ent').value}; });
  A(!r.a.sel&&r.a.t&&r.p==='mpaye'&&r.cli==='c2','module demandé sans client : le client se choisit, puis le module s’ouvre pour lui',JSON.stringify(r));
  await p.setViewportSize({width:390,height:844});
  r=await ev(()=>{ go('entreprise'); admEntChoisir('c1'); const m=document.querySelector('.adm-mbar'); return {sw:document.documentElement.scrollWidth,ov:m.scrollWidth>m.clientWidth,ox:getComputedStyle(m).overflowX}; });
  A(r.sw<=390&&r.ox==='auto','téléphone : barre des modules défilante, page sans débordement',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
