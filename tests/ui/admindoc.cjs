/**
 * Mar'q — MARQ DOC : modèles pré-remplis, signatures et coffre (v744)
 *
 * Fige : modèles alimentés par la fiche société et les modules (RH, PAYE,
 * CRM), contrôles de saisie (motif et fin du CDD, délai de convocation de
 * 15 jours, dividendes sur perte), texte modifiable avant enregistrement,
 * circuit de signature par signataire (relance, alerte après 3 jours,
 * signé par tous → versé signé au coffre, non supprimable), coffre
 * (rubriques, recherche, dépôt de fichier, limite de taille), téléphone.
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
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',capital:10000,siren:'912345678',president:'Karim Benali',siege:'14 rue des Forges',cp:'59000',ville:'Lille',email:'k.benali@bati-nord.fr'},{id:'c2',clientType:'entreprise',denomination:'VIDE SARL',forme:'sarl'}];
    DB.admin={c1:{rh:{salaries:[{id:'s1',prenom:'Lina',nom:'Moreau',poste:'Maçonne',contrat:'CDI',entree:'2026-10-05',essaiMois:'2',actif:true,email:'lina@exemple.fr',paie:{heures:'151.67',taux:'13.20',nir:'292027511803311',naissance:'1992-02-03',lieu:'Roubaix'}},{id:'s2',prenom:'Hugo',nom:'Petit',poste:'Manœuvre',contrat:'CDD',entree:'2026-06-01',actif:true}],absences:[],notes:[]},crm:{contacts:[{id:'k1',raison:'M. Hamon',contact:'Jean Hamon',type:'Client',ville:'Lille',email:'hamon@exemple.fr'}],pieces:[],boamp:{mots:'',deps:'',avis:[]}}}};
    DB.parametres.adminInscrits=['c1','c2']; save(); });
  const nb=t=>String(t||'').replace(/[  ]/g,' ');
  const J=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  let r;

  // 1. inscription, tuiles, pré-requis
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c2'); go('mdoc'); admEntChoisir('c2'); const off=[...document.querySelectorAll('.doc-tile[data-off]')].length; admDocModele('cdi'); const t=window.__toasts.slice(-1)[0];
    admEntChoisir('c1'); return {b,off,t,n:document.querySelectorAll('.doc-tile').length,off1:document.querySelectorAll('.doc-tile[data-off]').length}; });
  A(r.b.includes('Doc')&&r.n===8&&r.off===6&&r.off1===0&&/MARQ RH/.test(r.t),'8 modèles ; ceux qui demandent un salarié ou un client sont signalés et refusés s’il manque',JSON.stringify(r));

  // 2. CDI pré-rempli (société + RH + paie)
  r=await ev(()=>{ admDocModele('cdi'); document.getElementById('adm-dm-cc').value='Bâtiment — ouvriers (IDCC 1597)'; admDocGenerer('cdi'); return document.getElementById('adm-doc').value; });
  const cdi=nb(r);
  A(/CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE/.test(cdi)&&/BATI-NORD, SAS au capital de 10 000,00 €, dont le siège social est situé 14 rue des Forges, 59000 Lille, immatriculée au RCS de Lille sous le numéro 912 345 678, représentée par Karim Benali, en qualité de Président/.test(cdi),'CDI : en-tête de la société complet (forme, capital, siège, RCS, dirigeant et qualité)',cdi.slice(0,320));
  A(/Lina Moreau, né\(e\) le 03\/02\/1992 à Roubaix, n° de sécurité sociale 292027511803311/.test(cdi)&&/05\/10\/2026/.test(cdi)&&/Maçonne/.test(cdi)&&/2 mois/.test(cdi)&&/2 002,04 €/.test(cdi)&&/IDCC 1597/.test(cdi),'CDI : salarié (RH), période d’essai, rémunération reprise de la paie (151,67 h × 13,20 €)',cdi.slice(320,900));

  // 3. contrôles de saisie
  r=await ev(()=>{ const out={}; closeModal(); admDocModele('cdd'); document.getElementById('adm-dm-s').value='s2'; admDocGenerer('cdd'); out.a=window.__toasts.slice(-1)[0];
    document.getElementById('adm-dm-f').value='2026-11-30'; document.getElementById('adm-dm-m').value='Remplacement d’un salarié absent'; admDocGenerer('cdd'); out.b=window.__toasts.slice(-1)[0];
    document.getElementById('adm-dm-rp').value='Paul Durand'; admDocGenerer('cdd'); out.t=document.getElementById('adm-doc').value; closeModal();
    admDocModele('convoc'); document.getElementById('adm-dm-d').value=new Date(Date.now()+5*864e5).toISOString().slice(0,10); admDocGenerer('convoc'); out.c=window.__toasts.slice(-1)[0]; closeModal();
    admDocModele('pvag'); document.getElementById('adm-dm-res').value='-5000'; document.getElementById('adm-dm-af').value='Distribution de dividendes'; document.getElementById('adm-dm-dv').value='1000'; admDocGenerer('pvag'); out.d=window.__toasts.slice(-1)[0]; closeModal(); return out; });
  A(/date de fin/.test(r.a)&&/salarié remplacé/.test(r.b)&&/remplacement d’un salarié absent \(Paul Durand\)/.test(r.t)&&/L1242-2/.test(r.t)&&/30\/11\/2026/.test(r.t)&&/15 jours/.test(r.c)&&/perte/.test(r.d),'contrôles : fin et motif du CDD, convocation 15 jours avant, pas de dividende sur une perte',JSON.stringify({a:r.a,b:r.b,c:r.c,d:r.d}));

  // 4. PV d'AG et attestation TVA
  r=await ev(()=>{ admDocModele('pvag'); document.getElementById('adm-dm-res').value='20000'; document.getElementById('adm-dm-af').value='Réserve légale puis report à nouveau'; admDocGenerer('pvag'); const pv=document.getElementById('adm-doc').value; closeModal();
    admDocModele('tva10'); document.getElementById('adm-dm-a').value='8 rue Nationale, Lille'; document.getElementById('adm-dm-n').value='réfection de la salle de bains'; admDocGenerer('tva10'); const tv=document.getElementById('adm-doc').value; closeModal(); return {pv,tv}; });
  A(/1 000,00 € à la réserve légale et le solde, soit 19 000,00 €/.test(nb(r.pv))&&/QUITUS|Quitus/.test(r.pv)&&/exercice clos le 31\/12\/\d{4}/.test(r.pv),'PV d’AG : affectation (5 % à la réserve légale), quitus, exercice clos',nb(r.pv).slice(0,200));
  A(/TVA à taux réduit de 10 %/.test(r.tv)&&/Jean Hamon/.test(r.tv)&&/8 rue Nationale, Lille/.test(r.tv)&&/plus de deux ans/.test(r.tv)&&/912345678/.test(r.tv),'attestation TVA : client repris de MARQ CRM, adresse et nature des travaux, conditions légales');

  // 5. texte modifiable, enregistrement, signature
  r=await ev(()=>{ admDocModele('cdi'); admDocGenerer('cdi'); const ta=document.getElementById('adm-doc'); ta.value=ta.value.replace('Article 6 — Congés payés','Article 6 — Congés payés (texte revu)'); admDocEnregistrer(1);
    const d=DB.admin.c1.doc; return {docs:d.docs.length,revu:/texte revu/.test(d.docs[0].texte),sig:d.sig[0]&&d.sig[0].signataires.map(s=>s.nom).join(' | '),tab:window.__admTab.mdoc,view:document.getElementById('view').innerText}; });
  A(r.docs===1&&r.revu&&/Karim Benali \(Président\) \| Lina Moreau/.test(r.sig)&&r.tab==='sig'&&/1 sur 2|0 sur 2/.test(r.view),'modification conservée ; envoi en signature au dirigeant et au salarié',JSON.stringify({sig:r.sig,tab:r.tab}));
  r=await ev(()=>{ const g=DB.admin.c1.doc.sig[0]; g.envoye=new Date(Date.now()-4*864e5).toISOString().slice(0,10); save(); const a=admDocBilan('c1').alertes.map(x=>x.titre+' | '+x.detail); admDocRelance(g.id); const b2=admDocBilan('c1').alertes.length; return {a,b2,t:window.__toasts.slice(-1)[0],rel:g.relances.length}; });
  A(r.a.length===1&&/Signature en attente — Contrat de travail à durée indéterminée — Lina Moreau/.test(r.a[0])&&r.b2===0&&r.rel===1&&/k\.benali@bati-nord\.fr, lina@exemple\.fr/.test(r.t),'signature en attente depuis 4 jours : alerte ; relance notée (adresses des signataires) et alerte levée',JSON.stringify(r));
  r=await ev(()=>{ const d=DB.admin.c1.doc, g=d.sig[0]; admDocSigne(g.id,0); const s1=g.statut; admDocSigne(g.id,1); const doc=d.docs[0]; admDocSuppr(doc.id); return {s1,s2:g.statut,signe:doc.signe,reste:d.docs.length,t:window.__toasts.slice(-1)[0]}; });
  A(r.s1==='en cours'&&r.s2==='signé'&&!!r.signe&&r.reste===1&&/ne se supprime pas/.test(r.t),'signé par tous : document marqué signé au coffre et protégé contre la suppression',JSON.stringify(r));

  // 6. coffre : dépôt, rubriques, recherche, taille
  r=await p.evaluate(async()=>{ admTab('mdoc','cof'); const inp=document.getElementById('adm-doc-f'); const dt=new DataTransfer(); dt.items.add(new File(['attestation RC'],'Attestation RC decennale.pdf',{type:'application/pdf'})); inp.files=dt.files; admDocDepot(inp);
    await new Promise(r=>setTimeout(r,300)); document.getElementById('adm-dd-c').value='Assurances'; admDocDepotOk();
    const big=new DataTransfer(); big.items.add(new File([new Uint8Array(2*1024*1024)],'gros.pdf',{type:'application/pdf'})); inp.files=big.files; admDocDepot(inp); const tb=window.__toasts.slice(-1)[0];
    const d=DB.admin.c1.doc; admDocCat('Assurances'); const v1=document.querySelectorAll('.adm-t tbody tr').length; admDocCat(''); admDocQ('congés'); const v2=[...document.querySelectorAll('.adm-t tbody tr')].map(x=>x.innerText.split('\t')[0]); admDocQ('');
    return {n:d.docs.length,f:d.docs[1]&&d.docs[1].cat,fic:!!(d.docs[1]&&d.docs[1].fichier&&/^data:application\/pdf/.test(d.docs[1].fichier.data)),tb,v1,v2}; });
  A(r.n===2&&r.f==='Assurances'&&r.fic&&/trop lourd/.test(r.tb)&&r.v1===1&&r.v2.length===1&&/Contrat de travail/.test(r.v2[0]),'coffre : fichier déposé et classé, fichier trop lourd refusé, filtre par rubrique, recherche dans le texte',JSON.stringify(r));

  // 7. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['mod','sig','cof']){ r=await ev(t=>{ go('mdoc'); admTab('mdoc',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  r=await ev(()=>{ admDocModele('cdi'); admDocGenerer('cdi'); const m=document.querySelector('#ov.show .modal'); const q=m.getBoundingClientRect(); const ok=q.left>=-1&&q.right<=innerWidth+1; closeModal(); return ok; });
  A(r,'téléphone : fenêtre du document dans l’écran');
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
