/**
 * Mar'q — Fiche technique complète de l'entreprise (v756)
 *
 * Fige : onze rubriques (identité juridique, dirigeants et associés,
 * fiscal, social, comptable, juridique, échéancier, conformité du mois,
 * facturation électronique 2026-2027, pilotage, checklist) ; informations
 * reprises des modules ; TVA intracommunautaire calculée depuis le SIREN ;
 * SIREN invalide signalé ; saisie d'une rubrique et complétude ; contrôles
 * périodiques cochés et repris par les autres rubriques ; calendrier de la
 * facture électronique selon la catégorie ; fiche mensuelle et fiche
 * hebdomadaire de présentation qui reprennent la fiche.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); const y=new Date().getFullYear();
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',siren:'552100554',siret:'55210055400013',capital:'10000',siege:'12 rue des Forges',cp:'59000',ville:'Lille',president:'Jean Martin',activites:['Maçonnerie générale'],dateCreation:'2019-03-01',regime:'Impôt sur les sociétés'},
      {id:'c2',clientType:'entreprise',denomination:'ERREUR SA',forme:'sa',siren:'552100555'}];
    DB.admin={c1:{legal:{kbis:{date:new Date().toISOString().slice(0,10)},actes:[{id:'a1',titre:'Statuts',version:'3',date:'2024-06-01',statut:'Déposé'}],titres:[{id:'t1',date:'2019-03-01',type:'Souscription',de:'—',a:'Jean Martin',nb:600},{id:'t2',date:'2019-03-01',type:'Souscription',de:'—',a:'Marie Martin',nb:400}],be:[{id:'b1',nom:'Jean Martin',pct:'60'}],decisions:[{id:'d1',date:'2025-02-01',organe:'AGE',objet:'Transfert du siège social à Lille',statut:'Déposé'}],ag:{},registres:{}},
      control:{assurances:[{id:'as1',type:'Décennale',assureur:'SMABTP',police:'DEC-1',echeance:(y+1)+'-01-01'}],sinistres:[]},
      crm:{contacts:[{id:'k1',raison:'Nexity',type:'Client'}],pieces:[{id:'f1',type:'Facture',num:'F-2026-001',contactId:'k1',date:y+'-01-10',ht:1000,tva:20,statut:'Payée'},{id:'f2',type:'Facture',num:'F-2026-003',contactId:'k1',date:y+'-02-10',echeance:y+'-03-10',ht:500,tva:20,statut:'À encaisser'}]},
      rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',contrat:'CDI',entree:'2020-01-01',dpae:'2019-12-30',visite:'2024-01-10',actif:true}],absences:[],notes:[]},
      reporting:{mois:{}}},c2:{}};
    DB.parametres.adminInscrits=['c1','c2']; save(); });

  let r=await ev(()=>{ go('entreprise'); admEntChoisir('c1'); admGo('mfiche'); const v=document.getElementById('view'); const R=admFtCalcul('c1');
    const g=k=>{ for(const s of R.secs) for(const x of s.rows) if(x.it.k===k) return x.r; };
    return {bar:[...v.querySelectorAll('.adm-mb span')].map(x=>x.textContent).slice(0,2),secs:R.secs.map(s=>s.t),t:v.innerText,siren:g('siren'),tva:g('tvaIntra'),rep:g('repartition'),pct:g('pctDetention'),dec:g('decennale'),age:g('ageSiege'),nume:g('cNumero'),retards:g('retards'),social:g('dirSocial'),pouv:g('dirPouvoirs'),tvs:g('tTva'),peec:g('tConstruction'),total:R.pct}; });
  A(r.bar.join()==='Vue d’ensemble,Fiche technique'&&r.secs.length===11&&/^1\. Identité juridique/.test(r.secs[0])&&r.secs[10]==='Checklist administrative','page « Fiche technique » : onze rubriques, deuxième onglet de la barre',JSON.stringify(r.secs));
  const exp='FR'+String((12+3*(552100554%97))%97).padStart(2,'0')+'552100554';
  A(r.siren.v==='552 100 554'&&r.siren.s==='ok'&&r.tva.v===exp+' (calculé depuis le SIREN)','SIREN contrôlé ; TVA intracommunautaire calculée depuis le SIREN',JSON.stringify([r.siren,r.tva,exp]));
  A(/Jean Martin : 600 titres · Marie Martin : 400 titres/.test(r.rep.v)&&/Jean Martin 60 % · Marie Martin 40 %/.test(r.pct.v),'associés : répartition et pourcentages repris du registre des titres',JSON.stringify([r.rep,r.pct]));
  A(r.dec.s==='ok'&&/SMABTP/.test(r.dec.v)&&r.age.s==='ok'&&/Transfert du siège/.test(r.age.v),'décennale reprise de MARQ CONTROL ; transfert de siège repris du registre des décisions',JSON.stringify([r.dec,r.age]));
  A(r.nume.s==='ko'&&/1 numéro\(s\) manquant/.test(r.nume.v)&&r.retards.s==='ko'&&/1 facture\(s\) échue/.test(r.retards.v),'conformité : rupture de numérotation et retards de paiement détectés',JSON.stringify([r.nume,r.retards]));
  A(/Assimilé salarié/.test(r.social.v)&&/L227-6/.test(r.pouv.v)&&r.tvs.s==='ok'&&r.peec.s==='na','dirigeant de SAS : régime social et pouvoirs ; taxes applicables selon l’effectif',JSON.stringify([r.social,r.pouv,r.peec]));
  r=await ev(()=>{ const R=admFtCalcul('c2'); const g=k=>{ for(const s of R.secs) for(const x of s.rows) if(x.it.k===k) return x.r; }; return [g('siren'),g('tvaIntra')]; });
  A(r[0].s==='ko'&&/clé de contrôle invalide/.test(r[0].v)&&r[1].s!=='ok','SIREN à clé invalide signalé, aucune TVA calculée',JSON.stringify(r));

  // saisie d'une rubrique
  r=await ev(()=>{ const a=admFtCalcul('c1').pct; admFtEditer('identite'); document.getElementById('ft-f-nomCommercial').value='Bati Nord Rénovation'; document.getElementById('ft-f-etab2').value='Aucun'; document.getElementById('ft-f-ape').value='4399C';
    admFtEditerOk('identite'); const R=admFtCalcul('c1'); const s=R.secs[0]; return {a,b:R.pct,nc:s.rows.find(x=>x.it.k==='nomCommercial').r,ape:s.rows.find(x=>x.it.k==='ape').r,t:/Bati Nord Rénovation/.test(document.getElementById('view').innerText)}; });
  A(r.b>r.a&&r.nc.v==='Bati Nord Rénovation'&&r.nc.src==='Saisie'&&r.ape.v==='4399C'&&r.t,'« Compléter la rubrique » : saisie enregistrée, complétude en hausse',JSON.stringify(r));

  // contrôle périodique
  r=await ev(()=>{ const M=admFtCalcul('c1').X.mois; admFtCocher('m:'+M+':rappro'); const R=admFtCalcul('c1'); const g=k=>{ for(const s of R.secs) for(const x of s.rows) if(x.it.k===k) return x.r; }; return {m:M,a:g('mRappro'),b:g('rappro'),c:g('cBanque'),d:g('ckRappro')}; });
  A(r.a.s==='ok'&&r.b.s==='ok'&&r.c.s==='ok'&&r.d.s==='ok','rapprochement bancaire coché : repris par le comptable, la conformité et la checklist',JSON.stringify(r));

  // facture électronique
  r=await ev(()=>{ const g=()=>{ const R=admFtCalcul('c1'); return R.secs[8].rows.find(x=>x.it.k==='emission').r.v; }; const a=g(); admFtEditer('efacture'); document.getElementById('ft-f-categorie').value='ETI'; admFtEditerOk('efacture'); return [a,g()]; });
  A(/01\/09\/2027 \(Micro-entreprise\)/.test(r[0])&&/01\/09\/2026 \(ETI\)/.test(r[1]),'facture électronique : émission au 01/09/2027 (micro/PME), au 01/09/2026 (ETI)',JSON.stringify(r));

  // fiches de présentation
  r=await ev(()=>{ const y=new Date().getFullYear(), m=String(new Date().getMonth()+1).padStart(2,'0'); const d=document.createElement('div');
    d.innerHTML=admFicheHTML(admFiche('c1','mois',y+'-'+m+'-01'),'client'); const tm=d.innerText; d.innerHTML=admFicheHTML(admFiche('c1','semaine'),'client'); const tw=d.innerText; d.innerHTML=admFtHTML('c1'); const tf=d.innerText;
    return {m:/Fiche technique complète — \d+ % renseigné/.test(tm)&&/1\. Identité juridique/.test(tm)&&/Checklist administrative/.test(tm),w:/État du dossier — fiche technique renseignée à \d+ %/.test(tw)&&/À compléter ou régulariser/.test(tw),f:/FICHE TECHNIQUE COMPLÈTE|Fiche technique complète/i.test(tf)&&(tf.match(/\d+\. /g)||[]).length>=10}; });
  A(r.m&&r.w&&r.f,'fiche mensuelle : fiche technique complète ; fiche hebdomadaire : état du dossier ; document imprimable',JSON.stringify(r));

  await p.setViewportSize({width:390,height:844});
  r=await ev(()=>{ admGo('mfiche'); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')&&!e.closest('.adm-mbar')&&!e.closest('table')&&!e.closest('.adm-t')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; });
  A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse de l’écran',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
