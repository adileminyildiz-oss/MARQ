/**
 * Mar'q — MARQ PAYE : bulletins du mois et DSN (v743)
 *
 * Fige : salariés repris de MARQ RH, fiche de paie (NIR et sa clé, PCS-ESE,
 * taux), bulletin calculé par le moteur de paie 2026 (brut, heures sup.,
 * net, coût), validation du mois (absences RH marquées intégrées),
 * contrôles DSN puis fichier NEODeS (S10, S20, S21 individus / contrats /
 * versements / rémunérations / bases, S90), dépôt, échéance le 5 ou le 15,
 * alertes et option « paie hors de Mar'q ».
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
  const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); const M=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const debM=M+'-01';
  await ev(M=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',president:'Karim Benali',siret:'91234567800015',ape:'4399C',siege:'14 rue des Forges',cp:'59000',ville:'Lille'}];
    DB.admin={c1:{rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',poste:'Chef de chantier',contrat:'CDI',entree:'2022-04-01',actif:true},{id:'s2',prenom:'Lina',nom:'Moreau',poste:'Maçonne',contrat:'CDD',entree:'2025-01-06',fin:'2099-12-31',actif:true},{id:'s3',prenom:'Tom',nom:'Interim',contrat:'Intérim',entree:'2025-01-01',actif:true}],absences:[{id:'a1',salarieId:'s1',type:'Congés payés',debut:M+'-10',fin:M+'-12',paie:''}],notes:[]}}};
    DB.parametres.adminInscrits=['c1']; save(); window.__admPayeMois=M; },M);
  const nb=t=>String(t||'').replace(/[\u00a0\u202f]/g,' ');
  let r;

  // 1. inscription
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent)}; });
  A(r.b.includes('Paye')&&r.on.includes('MARQ PAYE'),'module inscrit : barre latérale et tuile',JSON.stringify(r.on));

  // 2. fiche de paie : contrôles NIR / PCS / taux
  r=await ev(()=>{ go('mpaye'); admTab('mpaye','sal'); admPayeSal('s1'); const set=(i,v)=>document.getElementById(i).value=v;
    set('adm-ps-n','185057800608490'); set('adm-ps-t','14.50'); admPayeSalOk('s1'); const a=!!DB.admin.c1.rh.salaries[0].paie.nir;
    set('adm-ps-n','1 85 05 78 006 084 91'); set('adm-ps-c','62'); admPayeSalOk('s1'); const b2=!!DB.admin.c1.rh.salaries[0].paie.pcs;
    set('adm-ps-c','621a'); set('adm-ps-d','1985-05-12'); set('adm-ps-l','Lille'); admPayeSalOk('s1'); const pi=DB.admin.c1.rh.salaries[0].paie;
    admPayeSal('s2'); set('adm-ps-n','292027511803311'); set('adm-ps-t','12.50'); set('adm-ps-c','622a'); set('adm-ps-d','1992-02-03'); set('adm-ps-h','121.33'); admPayeSalOk('s2');
    return {a,b2,nir:pi.nir,pcs:pi.pcs,t:document.getElementById('view').innerText,ok:[admPayeNir('185057800608491'),admPayeNir('185057800608490'),admPayeNir('2920275118033')]}; });
  A(!r.a&&!r.b2&&r.nir==='185057800608491'&&r.pcs==='621a'&&r.ok.join()==='true,false,false','fiche de paie : clé du NIR contrôlée (espaces retirés), PCS-ESE contrôlé',JSON.stringify(r));

  // 3. bulletins : calcul, éléments variables, total
  r=await ev(()=>{ admTab('mpaye','bul'); const t0=document.getElementById('view').innerText; admPayeSaisie('s1'); ['hs25','absH','prime'].forEach((k,i)=>document.getElementById('adm-pe-'+k).value=['4','14','150'][i]); admPayeSaisieOk('s1');
    const t=document.getElementById('view').innerText; const c1=DB.clients[0], r1=null; return {t0,t,interim:/Interim/.test(t)}; });
  A(!r.interim,'intérimaire exclu des bulletins (déclaré par l’entreprise de travail temporaire)');
  A(/Paul Durand[\s\S]*4 h sup\.[\s\S]*14 h d’absence/.test(r.t)&&/Lina Moreau/.test(r.t)&&/Total/.test(r.t),'bulletins calculés avec éléments variables ; ligne de total',nb(r.t).slice(0,400));
  r=await ev(()=>{ const pl=[...document.querySelectorAll('.adm-t .adm-p')]; return pl.length>0&&pl.every(x=>getComputedStyle(x).position==='static'&&x.closest('td')); });
  A(r,'étiquettes d’état à leur place dans le tableau (pas de conflit avec les pastilles des tuiles)');
  r=await ev(()=>{ admPayeBulletin('s1'); const t=document.getElementById('ov').innerText; closeModal(); return t; });
  const brut=2218.74; /* 151,67 h × 14,50 = 2 199,22 − 14 h d’absence 203,00 + 4 HS × 18,13 = 72,52 + prime 150 */
  A(/2 218,74/.test(nb(r))&&/Net à payer/.test(r)&&/Coût employeur/.test(r)&&/Réduction générale|Sécurité sociale/.test(r),'bulletin : brut exact ('+brut+' €), cotisations, net à payer, coût employeur',nb(r).slice(0,300));

  // 4. DSN : contrôles bloquants
  r=await ev(M=>{ admTab('mpaye','dsn'); const C=admPayeControles('c1',M); return {bad:C.filter(c=>!c.ok).map(c=>c.t),btn:[...document.querySelectorAll('#view button')].some(b=>/Générer le fichier DSN/.test(b.textContent))}; },M);
  A(r.bad.includes('SIRET de l’URSSAF destinataire des cotisations')&&r.bad.includes('Bulletins du mois validés')&&!r.btn,'DSN : URSSAF et validation manquants signalés, génération impossible',JSON.stringify(r.bad));

  // 5. validation du mois → absences RH intégrées ; rouvrir
  r=await ev(()=>{ admTab('mpaye','bul'); admPayeValider(); const a=DB.admin.c1.rh.absences[0].paie; admPayeSaisie('s1'); document.getElementById('adm-pe-prime').value='999'; admPayeSaisieOk('s1'); closeModal(); const prime=DB.admin.c1.paye.mois[window.__admPayeMois].el.s1.prime; return {a,prime}; });
  A(!!r.a&&r.prime==='150','mois validé : absence RH marquée intégrée à la paie ; saisie verrouillée',JSON.stringify(r));

  // 6. génération NEODeS
  r=await ev(M=>{ admTab('mpaye','par'); document.getElementById('adm-pp-u').value='123'; admPayeConf(); const a=DB.admin.c1.paye.conf.urssaf; document.getElementById('adm-pp-u').value='788 617 793 00058'; admPayeConf();
    admTab('mpaye','dsn'); const bad=admPayeControles('c1',M).filter(c=>!c.ok).map(c=>c.t); admPayeDsn(); const txt=document.getElementById('adm-doc').value; closeModal(); return {a,bad,txt,gen:!!DB.admin.c1.paye.mois[M].dsn.genere}; },M);
  const L=r.txt.split('\n'), has=(c,v)=>L.some(l=>l.startsWith(c+",'"+(v==null?'':v)));
  A(r.a===''&&!r.bad.length&&r.gen,'SIRET URSSAF contrôlé ; tous les contrôles au vert ; fichier généré',JSON.stringify(r.bad));
  A(L.every(l=>/^S\d{2}\.G\d{2}\.\d{2}\.\d{3},'[^']*'$/.test(l))&&has('S10.G00.00.005','01')&&has('S10.G00.00.006','P26V01')&&has('S20.G00.05.001','01')&&has('S20.G00.05.005','01'+M.slice(5)+M.slice(0,4))&&has('S21.G00.06.001','912345678')&&has('S21.G00.06.002','00015')&&has('S21.G00.06.003','4399C'),'NEODeS : syntaxe « rubrique,’valeur’ », envoi d’essai, norme P26V01, mois déclaré, SIREN / NIC / APE',L.slice(0,12).join(' | '));
  A(has('S21.G00.30.001','185057800608491')&&has('S21.G00.30.005','02')&&has('S21.G00.30.006','12051985')&&has('S21.G00.40.007','02')&&has('S21.G00.40.004','622a')&&has('S21.G00.51.013',brut.toFixed(2))&&has('S21.G00.20.001','78861779300058')&&L.filter(l=>l.startsWith('S21.G00.30.001')).length===2,'NEODeS : individus (NIR, sexe, naissance), contrats (nature, PCS), brut exact, organisme URSSAF ; 2 salariés',L.filter(l=>/S21\.G00\.(30\.00[156]|40\.00[47]|51\.013|20\.001)/.test(l)).join(' | '));
  A(/^S90\.G00\.90\.001,'(\d+)'$/.test(L[L.length-2])&&+L[L.length-2].match(/'(\d+)'/)[1]===L.length,'S90 : nombre total de rubriques exact',L.slice(-2).join(' | '));

  // 7. échéance, alertes, dépôt ; paie externe
  r=await ev(M=>{ const al=admPayeBilan('c1').alertes.map(a=>a.titre+' | '+a.detail+' | '+a.date.getDate()); admPayeDepose(); document.getElementById('adm-pd-r').value='DSN-4471'; admPayeDeposeOk(); const al2=admPayeBilan('c1').alertes.filter(a=>/DSN de/.test(a.titre)&&a.titre.indexOf(document.getElementById('adm-py-m')?'':'')>=0).map(a=>a.titre);
    admTab('mpaye','bul'); const rouvrir=[...document.querySelectorAll('#view button')].some(b=>/Rouvrir/.test(b.textContent)); return {al,al2,dep:DB.admin.c1.paye.mois[M].dsn,rouvrir}; },M);
  const libM=new Date(M+'-01T12:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  A(r.al.some(x=>x.indexOf('DSN de '+libM)===0&&/\| 15$/.test(x)),'échéance de la DSN : le 15 du mois suivant (moins de 50 salariés)',JSON.stringify(r.al));
  A(r.dep.deposee&&r.dep.ref==='DSN-4471'&&!r.al2.some(x=>x.indexOf(libM)>=0)&&!r.rouvrir,'DSN déposée : plus d’alerte pour le mois, mois non rouvrable',JSON.stringify(r));
  r=await ev(()=>{ DB.admin.c1.paye.conf.eff='>=50'; const m=Object.keys(DB.admin.c1.paye.mois)[0]; delete DB.admin.c1.paye.mois[m].dsn.deposee; const a=admPayeBilan('c1').alertes.filter(x=>/DSN de/.test(x.titre)).map(x=>x.date.getDate());
    DB.admin.c1.rh.salaries[1].paie.taux=''; const f=admPayeBilan('c1').alertes.some(x=>/fiche à compléter : Lina Moreau/.test(x.titre));
    admTab('mpaye','par'); document.getElementById('adm-pp-x').checked=true; admPayeConf(); const n=admPayeBilan('c1').alertes.length; return {a,f,n}; });
  A(r.a.includes(5)&&r.f&&r.n===0,'50 salariés et plus : échéance le 5 ; fiche incomplète signalée ; paie hors de Mar’q : aucune alerte',JSON.stringify(r));

  // 8. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['bul','sal','dsn','par']){ r=await ev(t=>{ go('mpaye'); admTab('mpaye',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
