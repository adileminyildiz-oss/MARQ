/**
 * Mar'q — Administration d'entreprise : Page Entreprise et MARQ LEGAL (v737)
 *
 * Fige le socle : section « Administration » dans la barre, Page Entreprise
 * construite sur les fiches « Entreprise » réelles (identité, échéances,
 * chiffres saisis, score), et le module LEGAL (registres, titres et détention,
 * bénéficiaires effectifs, assemblée annuelle, K-bis) dont les contrôles
 * alimentent les échéances et le score de la Page Entreprise.
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
    DB.clients=[]; DB.dossiers=[]; DB.admin={}; save(); });
  const errs2=()=>errs.filter(e=>!/ServiceWorker/.test(e));
  let r;

  // 1. barre latérale : groupe Administration
  r=await ev(()=>{ go('cockpit'); const L=[...document.querySelectorAll('#nav .nav-flat-lbl')].map(x=>x.textContent.trim()); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); return {L,b}; });
  A(r.L.includes('Administration')&&r.b.includes('Entreprises')&&r.b.includes('Legal'),'barre latérale : groupe « Administration » avec Entreprises et Legal',JSON.stringify(r.L));

  // 2. aucune entreprise : invitation à créer la fiche
  r=await ev(()=>{ go('entreprise'); return document.getElementById('view').innerText; });
  A(/Aucune entreprise cliente/.test(r)&&/Créer une fiche entreprise/.test(r),'sans fiche entreprise : message clair et bouton de création');

  // 3. fiches réelles : sélecteur, identité, particuliers exclus
  r=await ev(()=>{ const y=new Date().getFullYear();
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',siren:'912345678',president:'Karim Benali',siege:'14 rue des Forges',cp:'59000',ville:'Lille',capital:10000,activites:['Gros œuvre'],salaries:[{nom:'A'},{nom:'B'}],associes:[{nom:'Karim Benali',parts:450},{nom:'Samia Benali',parts:50}],regime:'IS',dateCreation:(y-3)+'-03-01'},
      {id:'c2',clientType:'entreprise',denomination:'AXIOME FORMATION',forme:'sas'},{id:'p1',clientType:'particulier',prenom:'Jean',nom:'DUPONT'}];
    DB.parametres.adminInscrits=['c1','c2']; save(); go('entreprise'); admEntChoisir('c1'); const opts=[...document.querySelectorAll('#adm-ent option')].map(o=>o.textContent); return {opts,txt:document.getElementById('view').innerText}; });
  A(r.opts.length===2&&r.opts.includes('BATI-NORD')&&!r.opts.some(o=>/DUPONT/.test(o))&&/SIREN 912 345 678/.test(r.txt)&&/Karim Benali/.test(r.txt)&&/2 salariés/.test(r.txt),'Page Entreprise : fiches entreprise seulement, identité reprise de la fiche',JSON.stringify(r.opts));
  r=await ev(()=>{ admEntChoisir('c2'); const t=document.getElementById('view').innerText; admEntChoisir('c1'); return t; });
  A(/AXIOME FORMATION/.test(r)&&/à compléter/.test(r),'changement d’entreprise ; champs manquants signalés « à compléter »');

  // 4. alertes LEGAL sur la Page Entreprise (K-bis absent, BE à déclarer, AG, DUERP)
  r=await ev(()=>{ go('entreprise'); return [...document.querySelectorAll('.adm-row b')].map(b=>b.textContent); });
  A(r.includes('K-bis')&&r.some(x=>/Assemblée d’approbation des comptes/.test(x))&&r.includes('DUERP à mettre à jour'),'échéances et alertes issues du module Legal',JSON.stringify(r));

  // 5. titres : reprise des associés, détention, cession contrôlée
  r=await ev(()=>{ go('mlegal'); admTab('mlegal','reg'); admTitresReprendre(); const t1=document.getElementById('view').innerText;
    admTitre(); document.getElementById('adm-tt').value='Cession'; document.getElementById('adm-tde').value='Samia Benali'; document.getElementById('adm-ta').value='Paul Martin'; document.getElementById('adm-tn').value='80'; admTitreOk(); const refus=document.getElementById('ov').classList.contains('show');
    document.getElementById('adm-tn').value='50'; admTitreOk(); const t2=document.getElementById('view').innerText; return {t1,refus,t2,n:DB.admin.c1.legal.titres.length}; });
  A(/Karim Benali 90 %/.test(r.t1)&&r.refus&&r.n===3&&/Paul Martin 10 %/.test(r.t2),'registre des titres : associés repris, détention calculée, cession au-delà des titres détenus refusée',JSON.stringify({n:r.n,refus:r.refus}));

  // 6. bénéficiaires effectifs proposés depuis la détention
  r=await ev(()=>{ admTab('mlegal','be'); const avant=/À déclarer d’après le registre des titres : Karim Benali/.test(document.getElementById('view').innerText); admBeProposer(); const be=DB.admin.c1.legal.be.map(b=>b.nom);
    const b0=DB.admin.c1.legal.be[0]; admBe(b0.id); document.getElementById('adm-bv').value='2020-01-01'; admBeOk(b0.id); go('entreprise'); const al=[...document.querySelectorAll('.adm-row b')].map(b=>b.textContent); return {avant,be,al}; });
  A(r.avant&&r.be.length===1&&r.be[0]==='Karim Benali'&&r.al.some(x=>/Pièce d’identité — Karim Benali/.test(x))&&!r.al.includes('Bénéficiaires effectifs à déclarer'),'bénéficiaires effectifs : proposés au-delà de 25 %, pièce expirée signalée',JSON.stringify(r.al));

  // 7. décisions : ajout, modification, validation obligatoire
  r=await ev(()=>{ go('mlegal'); admTab('mlegal','reg'); admDecision(); document.getElementById('adm-dx').value=''; admDecisionOk(); const refus=document.getElementById('ov').classList.contains('show');
    document.getElementById('adm-dx').value='Transfert du siège social'; document.getElementById('adm-ds').value='Signé'; admDecisionOk(); const d=DB.admin.c1.legal.decisions; return {refus,n:d.length,o:d[0]&&d[0].objet,st:d[0]&&d[0].statut,ov:document.getElementById('ov').classList.contains('show')}; });
  A(r.refus&&r.n===1&&r.o==='Transfert du siège social'&&r.st==='Signé'&&!r.ov,'registre des décisions : objet obligatoire, inscription enregistrée',JSON.stringify(r));

  // 8. assemblée annuelle : étapes, PV inscrit au registre, dépôt
  r=await ev(()=>{ admTab('mlegal','ag'); ['comptes','rapport','convoc','tenue','pv'].forEach(k=>{ const ex=+document.querySelector('.adm-st').getAttribute('onclick').match(/admAgEtape\((\d+)/)[1]; admAgEtape(ex,k); });
    const dec=DB.admin.c1.legal.decisions.filter(d=>d.agEx).length; go('entreprise'); const al=[...document.querySelectorAll('.adm-row b')].map(b=>b.textContent); return {dec,al}; });
  A(r.dec===1&&r.al.some(x=>/Dépôt des comptes/.test(x))&&!r.al.some(x=>/Assemblée d’approbation/.test(x)),'assemblée : PV signé inscrit au registre, puis échéance de dépôt au greffe',JSON.stringify(r.al));
  r=await ev(()=>{ go('mlegal'); admTab('mlegal','ag'); const ex=+document.querySelector('.adm-st').getAttribute('onclick').match(/admAgEtape\((\d+)/)[1]; admAgDoc(ex,'pv'); const t=document.getElementById('adm-doc').value; closeModal(); return t; });
  A(/PROCÈS-VERBAL/.test(r)&&/BATI-NORD/.test(r)&&/SIREN 912345678/.test(r)&&/Karim Benali/.test(r),'procès-verbal pré-rempli avec la fiche de la société');

  // 9. K-bis, DUERP, statuts → score juridique
  r=await ev(()=>{ go('mlegal'); const s0=admLegalBilan('c1').score; admKbis(new Date().toISOString().slice(0,10)); admRegistre('duerp',new Date().toISOString().slice(0,10));
    admActe(); document.getElementById('adm-at').value='Statuts'; admActeOk(); admAgEtape(+Object.keys(DB.admin.c1.legal.ag)[0],'depot'); DB.admin.c1.legal.be[0].validite='2031-01-01';
    const b=admLegalBilan('c1'); go('entreprise'); const txt=document.getElementById('view').innerText+'\n'+[...document.querySelectorAll('.adm-row b')].map(x=>x.textContent).join('|'); const rows=[...document.querySelectorAll('.adm-row b')].map(x=>x.textContent).join('|'); return {s0,s:b.score,al:b.alertes.map(a=>a.titre),txt,rows}; });
  A(r.s0<r.s&&r.s===100&&!r.al.length&&!/K-bis|Assemblée d’approbation|Dépôt des comptes|DUERP|Bénéficiaires effectifs à déclarer/.test(r.rows)&&/Juridique\s*\n?\s*100/.test(r.txt),'score juridique : 100 quand tout est à jour, plus aucune alerte',JSON.stringify({s0:r.s0,s:r.s,al:r.al}));

  // 10. chiffres du mois → chiffres clés
  r=await ev(()=>{ const y=new Date().getFullYear(); admChiffres(y+'-01'); document.getElementById('adm-cca').value='100000'; document.getElementById('adm-cch').value='80000'; document.getElementById('adm-cms').value='30000'; document.getElementById('adm-cen').value='12000'; admChiffresOk();
    admChiffres(y+'-02'); document.getElementById('adm-cca').value='120 000'; document.getElementById('adm-cch').value='90000'; admChiffresOk(); return document.querySelector('.adm-kpis').innerText; });
  A(/220\s000,00\s€/.test(r)&&/22,7 %/.test(r)&&/2 mois saisis/.test(r),'chiffres saisis : cumul du chiffre d’affaires et marge calculés',r.replace(/\s+/g,' '));

  // 11. modules non livrés : signalés, non cliquables ; Legal cliquable
  r=await ev(()=>{ const off=[...document.querySelectorAll('.adm-tile.off')].length; const on=[...document.querySelectorAll('button.adm-tile')].map(b=>b.textContent); return {off,on}; });
  A(r.off+r.on.length===11&&r.on.some(x=>/MARQ LEGAL/.test(x))&&r.off>0,'tuiles : modules livrés ouverts (dont Legal), les autres signalés « En préparation »',JSON.stringify(r));

  // 11b. onglet actif lisible
  r=await ev(()=>{ go('mlegal'); admTab('mlegal','ag'); const t=document.querySelector('.adm-tab.on'); const c=getComputedStyle(t); return {bg:c.backgroundColor,fill:c.webkitTextFillColor,col:c.color}; });
  A(/244, 246, 250/.test(r.bg)&&/11, 11, 12/.test(r.fill),'onglet actif lisible (texte foncé sur fond clair)',JSON.stringify(r));

  // 12. persistance et téléphone
  r=await ev(()=>JSON.parse(JSON.stringify(DB.admin.c1.legal)).decisions.length>=2);
  A(r,'données de l’administration conservées dans la base');
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const pg of ['entreprise','mlegal']){ r=await ev(pg=>{ go(pg); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className); }); return {o,hs:document.documentElement.scrollWidth>innerWidth}; },pg);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse de l’écran ('+pg+')',JSON.stringify(r)); }
  A(errs2().length===0,'aucune erreur JavaScript',errs2().join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
