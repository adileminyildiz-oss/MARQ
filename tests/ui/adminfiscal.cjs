/**
 * Mar'q — MARQ FISCAL : TVA (CA3), calendrier fiscal, IS, CFE & CVAE (v739)
 *
 * Fige les calculs : lignes principales de la CA3 et report du crédit d'un
 * mois sur l'autre, calendrier construit selon le régime de TVA et la date
 * de clôture (acomptes et solde d'IS, liasse, CFE, 1330-CVAE au-delà de
 * 152 500 €), IS 15 % / 25 % et acomptes, alertes et score Fiscal.
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
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',regime:'IS',president:'Karim Benali'},{id:'c2',clientType:'entreprise',denomination:'ZEN IR',forme:'sarl',regime:'IR',clotureExercice:'30/06'}]; DB.admin={}; DB.parametres.adminInscrits=DB.clients.map(c=>c.id); DB.parametres.adminEnt='c1'; save(); });
  const errs2=()=>errs.filter(e=>!/ServiceWorker/.test(e));
  let r;
  const y=new Date().getFullYear();

  // 1. inscription
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent),dom:document.querySelector('.adm-dom').innerText}; });
  A(r.b.includes('Fiscal')&&r.on.includes('MARQ FISCAL')&&/Fiscal\s*\n?\s*\d+/.test(r.dom),'module inscrit : barre, tuile, domaine Fiscal noté',JSON.stringify(r.on));

  // 2. CA3 : lignes et report de crédit
  r=await ev(y=>{ go('mfiscal'); admTab('mfiscal','tva'); const k1=y+'-02', k2=y+'-03';
    admFisMois(k1); [['b20',10000],['b10',2000],['b55',1000],['al',500],['dbs',1500],['dim',400]].forEach(([c,v])=>admFisSaisie(k1,c,String(v))); const t1=document.getElementById('view').innerText;
    admFisMois(k2); [['b20',1000],['dbs',3000]].forEach(([c,v])=>admFisSaisie(k2,c,String(v))); const t2=document.getElementById('view').innerText;
    const k3=y+'-04'; admFisMois(k3); admFisSaisie(k3,'b20','10000'); const t3=document.getElementById('view').innerText; return {t1,t2,t3}; },y);
  const nb=t=>String(t||'').replace(/[\u00a0\u202f]/g,' ');
  const lig=(t,l)=>{ const m=nb(t).split('\n').find(x=>x.trim().startsWith(l+'\t')||x.trim().startsWith(l+' ')); return m||''; };
  A(/2 000,00\s€/.test(lig(r.r1||r.t1,'08'))&&/200,00\s€/.test(lig(r.t1,'9B'))&&/55,00\s€/.test(lig(r.t1,'09'))&&/2 355,00\s€/.test(lig(r.t1,'16'))&&/2 000,00\s€/.test(lig(r.t1,'23'))&&/355,00\s€/.test(lig(r.t1,'28')),'CA3 : lignes 08, 9B, 09, 16, 23 et 28 calculées (autoliquidation due et déductible)',[lig(r.t1,'08'),lig(r.t1,'16'),lig(r.t1,'23'),lig(r.t1,'28')].join(' | '));
  A(/2 800,00\s€/.test(lig(r.t2,'25 / 27'))&&/2 800,00\s€/.test(lig(r.t3,'22'))&&/2 800,00\s€/.test(lig(r.t3,'23'))&&/[\t ]800,00\s€/.test(lig(r.t3,'25 / 27')),'crédit de TVA reporté à la ligne 22 du mois suivant',[lig(r.t2,'25 / 27'),lig(r.t3,'22'),lig(r.t3,'23'),lig(r.t3,'25 / 27')].join(' | '));

  // 3. calendrier : mensuel, IS, liasse, CFE ; dépôt marqué
  r=await ev(()=>{ const L=admFiscalBilan('c1').L; const ids=L.map(o=>o.id); return {tva:ids.filter(i=>/^tva-/.test(i)).length,isa:ids.filter(i=>/^isa-/.test(i)).length,iss:ids.some(i=>/^iss-/.test(i)),lia:ids.some(i=>/^lia-/.test(i)),cfe:ids.some(i=>/^cfe-/.test(i)),cvae:ids.some(i=>/^cvae-/.test(i)),cfeDate:(L.find(o=>/^cfe-/.test(o.id))||{}).date}; });
  A(r.tva>=20&&r.isa>=6&&r.iss&&r.lia&&r.cfe&&!r.cvae&&new Date(r.cfeDate).getDate()===15,'calendrier : TVA mensuelle, acomptes et solde d’IS, liasse, CFE au 15/12 ; pas de 1330 sans chiffre d’affaires',JSON.stringify(r));
  r=await ev(y=>{ admFisCa(y-1,'300000'); const a=admFiscalBilan('c1').L.some(o=>o.id==='cvae-'+(y-1)); admFisCa(y-1,'100000'); const b=admFiscalBilan('c1').L.some(o=>o.id==='cvae-'+(y-1)); return {a,b}; },y);
  A(r.a&&!r.b,'1330-CVAE ajoutée au calendrier au-delà de 152 500 € de chiffre d’affaires',JSON.stringify(r));
  r=await ev(()=>{ const b0=admFiscalBilan('c1'); const s0=b0.domaines[0][1]; const retard=b0.alertes.filter(a=>/retard/.test(a.detail)); retard.forEach(a=>{ const o=b0.L.find(x=>x.lbl===a.titre); admFisFait(o.id); }); const b1=admFiscalBilan('c1'); return {n:retard.length,s0,s1:b1.domaines[0][1],reste:b1.alertes.filter(a=>/retard/.test(a.detail)).length}; });
  A(r.n>0&&r.s0<100&&r.s1===100&&r.reste===0,'obligations en retard signalées ; une fois marquées faites, score Fiscal 100',JSON.stringify(r));

  // 4. régimes : trimestriel, réel simplifié, franchise ; société à l'IR sans IS, clôture 30/06
  r=await ev(()=>{ admFisTva('regime','rnt'); const t=admFiscalBilan('c1').L.filter(o=>/^tva-/.test(o.id)).map(o=>o.id); admFisTva('regime','rs'); const s=admFiscalBilan('c1').L.map(o=>o.id); admFisTva('regime','fr'); const f=admFiscalBilan('c1').L.map(o=>o.id); admFisTva('regime','rnm');
    admEntChoisir('c2'); const ir=admFiscalBilan('c2').L.map(o=>o.id); const lia=admFiscalBilan('c2').L.find(o=>/^lia-/.test(o.id)); admEntChoisir('c1'); return {t:t.every(i=>/-T\d$/.test(i))&&t.length>=6,s:s.some(i=>/^ca12-/.test(i))&&s.some(i=>/^rsj-/.test(i))&&s.some(i=>/^rsd-/.test(i)),f:!f.some(i=>/^(tva|ca12|rs)/.test(i)),ir:!ir.some(i=>/^is/.test(i)),liaM:lia&&new Date(lia.date).getMonth()}; });
  A(r.t&&r.s&&r.f&&r.ir&&r.liaM===8,'régimes : trimestriel, réel simplifié (CA12 + acomptes), franchise sans TVA ; IR sans IS ; clôture 30/06 → liasse fin septembre',JSON.stringify(r));

  // 5. IS : 15 % / 25 %, acomptes
  r=await ev(()=>{ admTab('mfiscal','is'); admFisIs('resultat','100000'); admFisIs('reference','20000'); const a=document.querySelector('.adm-kpis').innerText; admFisIs('pme',false); const b=document.querySelector('.adm-kpis').innerText; admFisIs('reference','2000'); const c=document.querySelector('.adm-kpis').innerText; return {a:a.replace(/[\u00a0\u202f]/g,' '),b:b.replace(/[\u00a0\u202f]/g,' '),c}; });
  A(/20 750,00\s€/.test(r.a)&&/5 000,00\s€/.test(r.a)&&/25 000,00\s€/.test(r.b)&&/aucun/.test(r.c),'IS : 20 750 € (15 % puis 25 %), 25 000 € sans taux PME, acomptes au quart, aucun sous 3 000 €',[r.a,r.b].join(' || ').replace(/\s+/g,' '));

  // 6. Page Entreprise et téléphone
  r=await ev(()=>{ admFisTva('jour','24'); go('entreprise'); return [...document.querySelectorAll('.adm-row')].some(x=>/mfiscal/.test(x.getAttribute('onclick'))); });
  A(r,'échéances fiscales proches cliquables depuis la Page Entreprise');
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['tva','cal','is','loc']){ r=await ev(t=>{ go('mfiscal'); admTab('mfiscal',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  A(errs2().length===0,'aucune erreur JavaScript',errs2().join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
