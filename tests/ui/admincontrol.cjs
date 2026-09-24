/**
 * Mar'q — MARQ CONTROL : vigilance LCB-FT, assurances & sinistres, qualité (v738)
 *
 * Fige : l'inscription du module dans le registre (barre, tuile, alertes,
 * score), le verrou des données sensibles (code conservé seulement haché),
 * le calcul du niveau de risque et de la périodicité de revue, la décennale
 * exigée pour le bâtiment, le délai de 5 jours ouvrés des sinistres, et le
 * suivi ISO 9001 / Qualiopi.
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
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; try{ delete DB.parametres.adminCodeHash; }catch(e){} window.__admSens=0;
    const y=new Date().getFullYear(); DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',siren:'912345678',president:'Karim Benali',presidentFonction:'Président',siege:'14 rue des Forges',cp:'59000',ville:'Lille',activites:['Gros œuvre et maçonnerie'],associes:[{nom:'Karim Benali',parts:500}]}]; DB.admin={}; save(); });
  const errs2=()=>errs.filter(e=>!/ServiceWorker/.test(e));
  let r;
  const iso=d=>d.toISOString().slice(0,10), dans=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return iso(d); };

  // 1. inscription dans le registre des modules
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); const on=[...document.querySelectorAll('button.adm-tile')].map(x=>x.querySelector('b').textContent); const dom=document.querySelector('.adm-dom').innerText; return {b,on,dom}; });
  A(r.b.includes('Control')&&r.on.includes('MARQ CONTROL')&&/KYC \/ LCB-FT\s*\n?\s*\d+/.test(r.dom)&&/Assurances\s*\n?\s*\d+/.test(r.dom)&&/Qualité\s*\n?\s*non évalué/.test(r.dom),'module inscrit : barre, tuile ouverte, domaines KYC et Assurances notés, Qualité non évalué',JSON.stringify({on:r.on,dom:r.dom}));

  // 2. verrou : sans code, rien n'est affiché ; création du code haché ; mauvais code refusé
  r=await ev(()=>{ go('mcontrol'); admTab('mcontrol','kyc'); return {lock:!!document.querySelector('.adm-lockbox'),crit:!!document.querySelector('.adm-crit')}; });
  A(r.lock&&!r.crit,'vigilance LCB-FT verrouillée tant que le code n’est pas saisi');
  r=await p.evaluate(async()=>{ admSensibleOuvrir(); document.getElementById('adm-code').value='secret-9'; document.getElementById('adm-code2').value='secret-9'; await admSensibleOk(); const h=DB.parametres.adminCodeHash; const clair=JSON.stringify(DB).includes('secret-9');
    admSensibleFermer(); admSensibleOuvrir(); document.getElementById('adm-code').value='mauvais-1'; const ko=await admSensibleOk(); const encore=!!document.querySelector('.adm-lockbox');
    document.getElementById('adm-code').value='secret-9'; const okv=await admSensibleOk(); return {h:!!h&&h.length>=8,clair,ko,encore,okv,crit:!!document.querySelector('.adm-crit')}; });
  A(r.h&&!r.clair&&r.ko===false&&r.encore&&r.okv&&r.crit,'code d’accès : conservé haché (jamais en clair), mauvais code refusé, bon code ouvre l’accès',JSON.stringify(r));

  // 3. niveau de risque et périodicité
  r=await ev(()=>{ admKycCrit('especes',true); const m=admControlBilan('c1').kyc.niveau; admKycCrit('ppe',true); const e=admControlBilan('c1').kyc.niveau; const renf=/Vigilance renforcée/.test(document.getElementById('view').innerText);
    admKycCrit('ppe',false); admKycCrit('especes',false); admKycRevue(); const b=admControlBilan('c1').kyc; const due=b.due; const y=new Date(); return {m,e,renf,f:b.niveau,ans:due.getFullYear()-y.getFullYear()}; });
  A(r.m==='moyen'&&r.e==='eleve'&&r.renf&&r.f==='faible'&&r.ans===3,'risque : moyen, élevé (PPE) avec vigilance renforcée, faible → revue à 3 ans',JSON.stringify(r));

  // 4. contrôles KYC : dirigeant, gel, repris de Legal
  r=await ev(y=>{ const s0=admControlBilan('c1').kyc.score; admKyc('dirigeant',y); admKyc('gelDate',y); admKbis(y); const L=DB.admin.c1.legal; L.actes.push({id:'a1',titre:'Statuts',date:y,statut:'Signé'}); L.be.push({id:'b1',nom:'Karim Benali',pct:'100',validite:'2031-01-01',verifie:true}); save();
    const b=admControlBilan('c1').kyc; admKyc('gelResultat','Correspondance'); const g=admControlBilan('c1'); admKyc('gelResultat','Aucune correspondance'); return {s0,s:b.score,corr:g.alertes.some(a=>/Correspondance sur les listes de gel/.test(a.titre))&&g.kyc.score<100}; },iso(new Date()));
  A(r.s0<r.s&&r.s===100&&r.corr,'KYC : 100 quand tout est vérifié (K-bis, statuts et bénéficiaires repris de Legal) ; une correspondance sur les listes de gel alerte',JSON.stringify(r));

  // 5. assurances : décennale exigée pour le bâtiment, échéances
  r=await ev(()=>{ admTab('mcontrol','ass'); const a0=admControlBilan('c1').alertes.map(a=>a.titre); return a0; });
  A(r.includes('Assurance décennale obligatoire'),'activité du bâtiment sans décennale : alerte',JSON.stringify(r));
  r=await ev(d=>{ admAss(); document.getElementById('adm-at2').value='Décennale'; document.getElementById('adm-aa').value='SMABTP'; document.getElementById('adm-ae').value=d.passe; admAssOk();
    const al1=admControlBilan('c1').alertes.map(a=>a.titre); const x=DB.admin.c1.control.assurances[0]; admAss(x.id); document.getElementById('adm-ae').value=d.bientot; admAssOk(x.id); const al2=admControlBilan('c1').alertes.map(a=>a.titre);
    admAss(x.id); document.getElementById('adm-ae').value=d.loin; admAssOk(x.id); const b=admControlBilan('c1'); return {al1,al2,al3:b.alertes.map(a=>a.titre),s:b.ass.score}; },{passe:dans(-3),bientot:dans(20),loin:dans(300)});
  A(r.al1.includes('Assurance Décennale expirée')&&r.al2.includes('Renouvellement Décennale')&&!r.al3.some(x=>/Décennale|décennale/.test(x))&&r.s===100,'échéances : expirée, à renouveler sous 60 j, puis valide (score 100)',JSON.stringify(r));

  // 6. sinistres : délai de 5 jours ouvrés, courrier pré-rempli, statut
  r=await ev(()=>{ admSinistre(); document.getElementById('adm-sn').value='Dégât des eaux sur chantier'; document.getElementById('adm-sx').value='Rupture de canalisation'; admSinistreOk(); const s=DB.admin.c1.control.sinistres[0];
    const al=admControlBilan('c1').alertes.filter(a=>/Sinistre à déclarer/.test(a.titre)); const lim=al[0]&&al[0].date; const d=new Date(s.date); let n=0; const x=new Date(d); while(n<5){ x.setDate(x.getDate()+1); if(x.getDay()%6) n++; }
    admSinCourrier(s.id); const txt=document.getElementById('adm-doc').value; closeModal(); admSinStatut(s.id,'Déclaré'); const apres=admControlBilan('c1').alertes.some(a=>/Sinistre à déclarer/.test(a.titre));
    return {un:al.length===1,jours:lim&&lim.toDateString()===x.toDateString(),txt:/SMABTP/.test(txt)&&/Dégât des eaux/.test(txt)&&/BATI-NORD/.test(txt)&&/Karim Benali, Président/.test(txt),apres,decl:DB.admin.c1.control.sinistres[0].declareLe}; });
  A(r.un&&r.jours&&r.txt&&!r.apres&&!!r.decl,'sinistre : 5 jours ouvrés pour déclarer, courrier pré-rempli, alerte levée une fois déclaré',JSON.stringify(r));

  // 7. qualité : référentiel, couverture, non-conformité en retard, audit
  r=await ev(d=>{ admTab('mcontrol','qua'); admQuaRef('qualiopi'); ['q1','q2','q3','q4','q5','q6','q7'].forEach((k,i)=>admQuaItem(k,i<5?'ok':'partiel')); const b1=admControlBilan('c1').qua;
    admNc(); document.getElementById('adm-nl').value='Enquête de satisfaction non exploitée'; document.getElementById('adm-ne').value=d.passe; admNcOk(); admQuaAudit(d.bientot); const b2=admControlBilan('c1'); const n=DB.admin.c1.control.qualite.nc[0]; admNcClore(n.id); const b3=admControlBilan('c1').qua;
    return {cov:Math.round(b1.cov*100),s1:b1.score,s2:b2.qua.score,al:b2.alertes.map(a=>a.titre),s3:b3.score}; },{passe:dans(-2),bientot:dans(30)});
  A(r.cov===86&&r.s1===86&&r.s2===76&&r.al.includes('Non-conformité en retard')&&r.al.includes('Audit Qualiopi')&&r.s3===86,'Qualiopi : couverture 86 %, non-conformité en retard −10, audit à 30 jours signalé, clôture rétablit le score',JSON.stringify(r));

  // 8. Page Entreprise : domaines et alertes du module
  r=await ev(()=>{ go('entreprise'); return {dom:document.querySelector('.adm-dom').innerText,rows:[...document.querySelectorAll('.adm-row')].map(x=>x.getAttribute('onclick')),n:(document.querySelector('button.adm-tile .adm-n')||{}).textContent}; });
  A(/Qualité\s*\n?\s*86/.test(r.dom)&&r.rows.some(x=>/mcontrol/.test(x)),'Page Entreprise : score Qualité affiché, alertes du module cliquables vers Control',JSON.stringify(r));

  // 9. téléphone et erreurs
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['kyc','ass','qua']){ r=await ev(t=>{ go('mcontrol'); admTab('mcontrol',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  A(errs2().length===0,'aucune erreur JavaScript',errs2().join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
