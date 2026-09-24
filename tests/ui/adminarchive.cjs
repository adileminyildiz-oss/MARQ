/**
 * Mar'q — MARQ ARCHIVE : durées légales et purge guidée (v746)
 *
 * Fige : inventaire de ce que conservent les autres modules avec la bonne
 * durée et le bon point de départ (facture : 10 ans après la clôture,
 * devis 5 ans, prospect 3 ans après le dernier échange, décisions 5 ans,
 * paie 6 ans après la fin du mois, salarié sorti 5 ans après le départ,
 * notes 3 ans, sinistre clos 2 ans après la clôture, coffre selon la
 * rubrique, FEC 10 ans, veille 1 an), documents juridiques jamais
 * proposés, purge lot par lot avec nom de la personne qui l'autorise,
 * confirmation et journal, gel qui exclut de la purge, alerte et domaine
 * Archivage sur la Page Entreprise, téléphone.
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
  const y=new Date().getFullYear();
  await ev(y=>{ window.uiConfirm=(m,fn)=>{ window.__conf=(window.__conf||0)+1; fn&&fn(); }; window.confirm=()=>true; window.alert=()=>{}; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',president:'Jean Martin',presidentFonction:'Président'}];
    DB.admin={c1:{
      crm:{contacts:[{id:'k1',raison:'Nexity',type:'Client'},{id:'k2',raison:'Prospect ancien',type:'Prospect',echanges:[{date:'2019-05-01',texte:'Appel'}]},{id:'k3',raison:'Prospect récent',type:'Prospect',echanges:[{date:(y-1)+'-05-01',texte:'Appel'}]}],
        pieces:[{id:'f1',type:'Facture',num:'F2010-1',contactId:'k1',date:'2010-03-10',ht:1000,tva:20,statut:'Payée'},
          {id:'f2',type:'Facture',num:'F-REC',contactId:'k1',date:(y-1)+'-03-10',ht:1000,tva:20,statut:'Payée'},
          {id:'d1',type:'Devis',num:'D2015-1',contactId:'k1',date:'2015-01-10',ht:500,tva:20,statut:'Refusé'},
          {id:'d2',type:'Devis',num:'D-REC',contactId:'k1',date:(y-1)+'-01-10',ht:500,tva:20,statut:'Envoyé'}],
        boamp:{mots:'',deps:'',avis:[{id:'v1',objet:'Réfection de voirie',limite:'2020-01-01',statut:'Nouveau'}]}},
      workflow:{queue:[{id:'w1',type:'Achat',statut:'valide',ts:new Date(2012,4,2).getTime(),bc:3,libelle:'Outillage',data:{}},{id:'w2',type:'Congé',statut:'valide',ts:new Date(2018,6,1).getTime(),libelle:'Congé été',data:{}}]},
      paye:{conf:{},mois:{'2015-06':{valide:true,el:{},dsn:{deposee:true}},[(y-1)+'-01']:{valide:true,el:{},dsn:{}}}},
      rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',contrat:'CDD',fin:'2016-02-01',actif:false},{id:'s2',prenom:'Anne',nom:'Roux',contrat:'CDI',fin:'',actif:true}],absences:[],notes:[{id:'n1',date:'2019-01-01',salarieId:'s1',type:'Disciplinaire',texte:'x'}]},
      control:{sinistres:[{id:'si1',date:'2019-06-01',closLe:'2020-01-01',nature:'Dégât des eaux',statut:'Clos'},{id:'si2',date:'2019-06-01',nature:'Vol',statut:'Déclaré'}]},
      doc:{docs:[{id:'x1',titre:'Contrat CDD Paul Durand',cat:'Social',date:'2018-03-01'},{id:'x2',titre:'Statuts à jour',cat:'Juridique',date:'2000-01-01'},{id:'x3',titre:'Liasse',cat:'Fiscal',date:(y-1)+'-05-01'}],sig:[]},
      reporting:{mois:{},fec:{nom:'FEC2014.txt',du:'2014-01-01',au:'2014-12-31',mois:{},debit:0,credit:0,ecritures:0}}}};
    DB.parametres.adminInscrits=['c1']; save(); },y);
  const nb=t=>String(t||'').replace(/[  ]/g,' ');
  let r;

  // 1. inscription
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent)}; });
  A(r.b.includes('Archive')&&r.on.includes('MARQ ARCHIVE'),'module inscrit : barre latérale et tuile',JSON.stringify(r.on));

  // 2. inventaire : durées et points de départ
  r=await ev(()=>{ const I=admArcInventaire('c1'), m={}; I.forEach(z=>{ m[z.id]=z; }); return m; });
  const E=(id,ech)=>r[id]&&r[id].ech===ech;
  A(E('fact:f1','2020-12-31'),'facture : 10 ans à compter de la clôture de l’exercice',JSON.stringify(r['fact:f1']));
  A(E('devis:d1','2020-01-10')&&E('devis:d2',(y+4)+'-01-10'),'devis refusé ou sans suite : 5 ans',JSON.stringify([r['devis:d1'],r['devis:d2']]));
  A(E('prosp:k2','2022-05-01')&&r['prosp:k3']&&!r['prosp:k1'],'prospect : 3 ans après le dernier échange (les clients ne sont pas concernés)',JSON.stringify(r['prosp:k2']));
  A(E('ao:v1','2021-01-01'),'veille des marchés : 1 an après la date limite',JSON.stringify(r['ao:v1']));
  A(E('fact:w1','2022-12-31')&&E('wf:w2','2023-07-01'),'bon de commande validé : 10 ans après la clôture ; autre décision : 5 ans',JSON.stringify([r['fact:w1'],r['wf:w2']]));
  A(E('paie:2015-06','2021-06-30')&&/bulletins et DSN/.test(r['paie:2015-06'].titre),'paie : 6 ans à compter de la fin du mois',JSON.stringify(r['paie:2015-06']));
  A(E('sal:s1','2021-02-01')&&!r['sal:s2'],'salarié sorti : 5 ans après le départ ; salarié présent non concerné',JSON.stringify(r['sal:s1']));
  A(E('disc:n1','2022-01-01'),'note disciplinaire : 3 ans',JSON.stringify(r['disc:n1']));
  A(E('sin:si1','2022-01-01')&&!r['sin:si2'],'sinistre clos : 2 ans après la clôture ; sinistre ouvert non concerné',JSON.stringify(r['sin:si1']));
  A(E('doc:x1','2023-03-01')&&E('doc:x3',(y+5)+'-05-01')&&!r['doc:x2'],'coffre selon la rubrique (social 5 ans, fiscal 6 ans) ; documents juridiques jamais proposés',JSON.stringify([r['doc:x1'],r['doc:x3']]));
  A(E('fec:fec','2024-12-31'),'FEC : 10 ans à compter de la fin de la période',JSON.stringify(r['fec:fec']));

  // 3. clôture d'un sinistre : date mémorisée
  r=await ev(()=>{ DB.admin.c1.control.sinistres.push({id:'si3',date:'2020-01-01',nature:'Incendie',statut:'Indemnisé'}); save(); go('mcontrol'); admSinStatut('si3','Clos'); const s=DB.admin.c1.control.sinistres.filter(x=>x.id==='si3')[0]; const I=admArcInventaire('c1').filter(z=>z.id==='sin:si3')[0]; return {cl:s.closLe,ech:I&&I.ech}; });
  const auj=new Date(); const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  A(r.cl===iso(auj)&&r.ech===(auj.getFullYear()+2)+iso(auj).slice(4),'sinistre passé à « Clos » : date de clôture enregistrée, délai compté à partir d’elle',JSON.stringify(r));

  // 4. page : durées, onglet À purger, alerte
  r=await ev(()=>{ go('marchive'); admTab('marchive','dur'); const d=document.getElementById('view').innerText; admTab('marchive','pur'); const pu=document.getElementById('view').innerText; const tab=[...document.querySelectorAll('.adm-tabs button,.adm-tab')].map(x=>x.textContent.trim()).join('|'); return {d,pu,tab,n:document.querySelectorAll('.arc-lot').length,bil:admArcBilan('c1')}; });
  A(/L123-22/.test(r.d)&&/Statuts, procès-verbaux/.test(r.d)&&/jamais proposés/.test(r.d),'durées légales affichées avec leur base ; conservés sans limite listés',nb(r.d).slice(0,200));
  A(r.n===11&&/Factures et pièces comptables\s*2 éléments/.test(nb(r.pu)),'À purger : un lot par catégorie échue',r.n+' '+nb(r.pu).slice(0,300));
  A(r.bil.alertes.length===1&&/Archivage — 12 éléments arrivés à échéance/.test(r.bil.alertes[0].titre)&&r.bil.alertes[0].niv==='o'&&r.bil.domaines[0][0]==='Archivage'&&r.bil.domaines[0][1]===Math.round(6*100/18),'alerte « éléments arrivés à échéance » et domaine Archivage noté',JSON.stringify(r.bil));

  // 5. gel : exclut de la purge, levée
  r=await ev(()=>{ admArcGel('fact:f1'); const t=document.querySelector('#ov').classList.contains('show'); admArcGelOk('fact:f1'); const sans=document.querySelector('#ov').classList.contains('show'); document.getElementById('adm-arc-m').value='Litige avec Nexity'; admArcGelOk('fact:f1');
    const f=admArcInventaire('c1').filter(z=>z.id==='fact:f1')[0]; admTab('marchive','gel'); const g=document.getElementById('view').innerText; return {t,sans,gel:f.gel,g}; });
  A(r.t&&r.sans&&r.gel&&/Litige avec Nexity/.test(r.g),'gel : motif obligatoire, élément listé dans « Gels »',JSON.stringify({t:r.t,sans:r.sans,gel:r.gel}));
  r=await ev(()=>{ admArcLot('fact'); const ids=[...document.querySelectorAll('.arc-cb')].map(c=>c.value); closeModal(); return ids; });
  A(r.length===1&&r[0]==='fact:w1','élément gelé exclu du lot à purger',JSON.stringify(r));

  // 6. purge : autorisation, décocher, confirmation, journal
  r=await ev(()=>{ window.__conf=0; admArcLot('fact'); document.getElementById('adm-arc-par').value=''; admArcPurger('fact'); const bloque=!!DB.admin.c1.workflow.queue.filter(w=>w.id==='w1').length&&window.__conf===0;
    return {bloque,par:(admArcLot('fact'),document.getElementById('adm-arc-par').value)}; });
  A(r.bloque&&r.par==='Jean Martin, Président','purge refusée sans le nom de la personne qui l’autorise (pré-rempli avec le dirigeant)',JSON.stringify(r));
  r=await ev(()=>{ closeModal(); admArcLot('devis'); const cbs=[...document.querySelectorAll('.arc-cb')]; admArcPurger('devis'); return {n:cbs.length,conf:window.__conf,d:DB.admin.c1.crm.pieces.map(x=>x.id),j:DB.admin.c1.archive.journal.slice(-1)[0]}; });
  A(r.n===1&&r.conf===1&&!r.d.includes('d1')&&r.d.includes('d2')&&r.j&&r.j.n===1&&r.j.par==='Jean Martin, Président'&&/D2015-1/.test(r.j.titres[0]),'purge confirmée : seul l’élément échu est effacé, purge inscrite au journal',JSON.stringify(r));
  r=await ev(()=>{ admArcLot('sal'); admArcPurger('sal'); admArcLot('paie'); document.querySelectorAll('.arc-cb').forEach(c=>{ c.checked=false; }); admArcPurger('paie'); const encore=document.querySelector('#ov').classList.contains('show'); closeModal();
    const h=DB.admin.c1.rh; return {s:h.salaries.map(x=>x.id),n:h.notes.length,paie:!!DB.admin.c1.paye.mois['2015-06'],encore}; });
  A(r.s.join()==='s2'&&r.n===0&&r.paie&&r.encore,'dossier du salarié sorti purgé avec ses notes ; lot entièrement décoché : rien n’est effacé',JSON.stringify(r));
  r=await ev(()=>{ admTab('marchive','jr'); return document.getElementById('view').innerText; });
  A(/Devis refusés ou restés sans suite/.test(r)&&/Dossier de Paul Durand/.test(r)&&/Jean Martin, Président/.test(r),'journal des purges : lot, nombre, autorisation, détail',nb(r).slice(0,300));

  // 7. levée du gel
  r=await ev(()=>{ admArcDegel('fact:f1'); return admArcInventaire('c1').filter(z=>z.id==='fact:f1')[0].gel; });
  A(r===false,'lever le gel : l’élément redevient purgeable',String(r));

  // 8. Page Entreprise
  r=await ev(()=>{ go('entreprise'); return document.getElementById('view').innerText; });
  A(/Archivage/.test(r)&&/Archivage — \d+ éléments? arrivés? à échéance/.test(nb(r)),'Page Entreprise : alerte et domaine Archivage',(nb(r).match(/Archivage[^\n]*/)||[''])[0]);

  // 9. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['dur','pur','gel','jr']){ r=await ev(t=>{ go('marchive'); admTab('marchive',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className&&e.className.baseVal!==undefined?e.className.baseVal:(e.className||e.tagName)); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  r=await ev(()=>{ go('marchive'); admTab('marchive','pur'); admArcLot('fact'); const m=document.querySelector('#ov .modal').getBoundingClientRect(); const o=[...document.querySelectorAll('#ov .modal *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length; closeModal(); return {w:Math.round(m.width),o}; });
  A(r.o===0&&r.w<=390,'téléphone : fenêtre de purge sans débordement',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
