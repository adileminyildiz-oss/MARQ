/**
 * Mar'q — MARQ WORKFLOW (circuits de validation) et MARQ RH (v740)
 *
 * Fige les circuits : achat sous le seuil validé seul, au-dessus accord du
 * dirigeant puis bon de commande numéroté ; absence validée → reportée en
 * RH ; embauche validée → salarié créé et registre du personnel daté ;
 * sinistre validé → ouvert dans MARQ CONTROL ; refus avec motif obligatoire.
 * Côté RH : reprise des salariés de la fiche, alertes DPAE / visite /
 * entretien / fin d'essai / fin de CDD, soldes de congés, notes sensibles
 * sous code d'accès, score Social ; affichage téléphone.
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
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',regime:'IS',president:'Karim Benali',salaries:[{prenom:'Lina',nom:'Morel',poste:'Conductrice de travaux',contrat:'CDI'},{prenom:'Hugo',nom:'Petit',poste:'Maçon',contrat:'CDD'}]}];
    DB.admin={}; DB.parametres.adminInscrits=DB.clients.map(c=>c.id); DB.parametres.adminEnt='c1'; delete DB.parametres.adminCodeHash; window.__admSens=0; save(); });
  const set=(o)=>ev(o=>{ Object.keys(o).forEach(k=>{ const e=document.getElementById(k); if(e) e.value=o[k]; }); },o);
  const iso=d=>d.toISOString().slice(0,10);
  const J=n=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
  let r;

  // 1. inscription des deux modules
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent),dom:document.querySelector('.adm-dom').innerText}; });
  A(r.b.includes('RH')&&r.b.includes('Workflow')&&r.on.includes('MARQ RH')&&r.on.includes('MARQ WORKFLOW')&&/Social/.test(r.dom),'modules inscrits : barre, tuiles, domaine Social',JSON.stringify(r.on));

  // 2. reprise des salariés de la fiche (sans doublon)
  r=await ev(()=>{ go('mrh'); admRhReprendre(); admRhReprendre(); const S=DB.admin.c1.rh.salaries; return {n:S.length,noms:S.map(s=>s.prenom+' '+s.nom),btn:/Reprendre les salariés/.test(document.getElementById('view').innerText)}; });
  A(r.n===2&&!r.btn,'salariés repris de la fiche client une seule fois ; le bouton de reprise disparaît',JSON.stringify(r));

  // 3. alertes RH : DPAE, visite, entretien, fin d'essai, fin de CDD ; score Social
  r=await ev(({e1,e2,fin})=>{ const S=DB.admin.c1.rh.salaries; Object.assign(S[0],{entree:e1,essaiMois:'2'}); Object.assign(S[1],{entree:e2,contrat:'CDD',fin:fin,dpae:e2}); save();
    const b=admRhBilan('c1'); return {t:b.alertes.map(a=>a.titre),s:b.domaines[0][1]}; },{e1:J(-55),e2:J(-400),fin:J(20)});
  A(r.t.some(t=>/^DPAE — Lina/.test(t))&&r.t.some(t=>/^Fin de période d’essai — Lina/.test(t))&&r.t.some(t=>/^Visite médicale — Hugo/.test(t))&&r.t.some(t=>/^Fin de CDD — Hugo/.test(t))&&!r.t.some(t=>/^DPAE — Hugo/.test(t))&&r.s<100,'alertes : DPAE manquante, fin d’essai, visite en retard, fin de CDD ; score Social incomplet',JSON.stringify(r));
  r=await ev(()=>{ const S=DB.admin.c1.rh.salaries; const t=new Date().toISOString().slice(0,10); S.forEach(s=>{ admRhChamp(s.id,'visite',t); admRhChamp(s.id,'entretien',t); }); admRhChamp(S[0].id,'dpae',S[0].entree);
    const b=admRhBilan('c1'); return {s:b.domaines[0][1],v:b.alertes.filter(a=>/Visite|Entretien|DPAE/.test(a.titre)).length}; });
  A(r.s===100&&r.v===0,'DPAE, visites et entretiens faits : score Social 100',JSON.stringify(r));

  // 4. achat sous le seuil → validé seul + bon de commande ; au-dessus → dirigeant
  r=await ev(()=>{ go('mworkflow'); admWfNouvelle('Achat'); document.getElementById('adm-wc-o').value='Casques de chantier'; document.getElementById('adm-wc-m').value='800'; admWfCreer();
    admWfNouvelle('Achat'); document.getElementById('adm-wc-o').value='Mini-pelle'; document.getElementById('adm-wc-f').value='LOCAMAT'; document.getElementById('adm-wc-m').value='12000'; admWfCreer();
    const Q=DB.admin.c1.workflow.queue; return {a:Q[0].statut,bc:Q[0].bc,b:Q[1].statut,fileTxt:document.getElementById('view').innerText}; });
  A(r.a==='valide'&&/^BC-\d{4}-01$/.test(r.bc)&&r.b==='dirigeant'&&/Accord du dirigeant/.test(r.fileTxt)&&/Mini-pelle/.test(r.fileTxt)&&!/Casques/.test(r.fileTxt),'achat sous le seuil validé seul (BC-…-01) ; au-dessus, accord du dirigeant attendu',JSON.stringify({a:r.a,bc:r.bc,b:r.b}));
  r=await ev(()=>{ const d=DB.admin.c1.workflow.queue[1]; admWfValider(d.id); admWfBc(d.id); const t=document.getElementById('adm-doc').value; closeModal(); return {s:d.statut,bc:d.bc,t,h:d.historique.map(x=>x.action).join(' | ')}; });
  A(r.s==='valide'&&/-02$/.test(r.bc)&&/BON DE COMMANDE BC-/.test(r.t)&&/LOCAMAT/.test(r.t)&&/Accord du dirigeant reçu/.test(r.h),'accord du dirigeant → bon de commande n° 2 pré-rempli, historique tracé',JSON.stringify({bc:r.bc,h:r.h}));
  r=await ev(()=>{ admTab('mworkflow','circ'); admWfSeuil('1000'); return DB.admin.c1.workflow.seuil; });
  A(r===1000,'seuil des demandes d’achat réglable');

  // 5. absence → RH ; solde de congés
  r=await ev(({d,f})=>{ admTab('mworkflow','file'); admWfNouvelle('Absence'); const s=DB.admin.c1.rh.salaries[0]; document.getElementById('adm-wa-s').value=s.id; document.getElementById('adm-wa-d').value=d; document.getElementById('adm-wa-f').value=f; admWfCreer();
    const w=DB.admin.c1.workflow.queue.slice(-1)[0], avant=DB.admin.c1.rh.absences.length; admWfValider(w.id); const A2=DB.admin.c1.rh.absences;
    go('mrh'); admTab('mrh','abs'); return {st:w.statut,avant,apres:A2.length,lien:A2[0]&&A2[0].wf===w.id,txt:document.getElementById('view').innerText}; },{d:J(1),f:J(1)});
  A(r.avant===0&&r.apres===1&&r.lien&&/Congés payés/.test(r.txt)&&/À intégrer/.test(r.txt),'absence validée → reportée dans MARQ RH, à intégrer en paie',JSON.stringify({st:r.st,a:r.apres}));
  r=await ev(()=>{ const a=DB.admin.c1.rh.absences[0]; admRhPaie(a.id); return !!DB.admin.c1.rh.absences[0].paie; });
  A(r,'absence marquée intégrée à la paie');
  r=await ev(()=>{ go('mworkflow'); admWfNouvelle('Absence'); document.getElementById('adm-wa-d').value='2026-05-10'; document.getElementById('adm-wa-f').value='2026-05-01'; const n=DB.admin.c1.workflow.queue.length; admWfCreer(); const m=document.getElementById('ov'); const o=!!m&&m.classList.contains('show')&&/Nouvelle demande/.test(m.innerText); closeModal(); return {n2:DB.admin.c1.workflow.queue.length-n,o}; });
  A(r.n2===0&&r.o,'absence aux dates inversées refusée (la fenêtre reste ouverte)',JSON.stringify(r));

  // 6. embauche → salarié créé + registre ; sinistre → CONTROL ; refus avec motif
  r=await ev(e=>{ admWfNouvelle('Embauche'); document.getElementById('adm-we-p').value='Nora'; document.getElementById('adm-we-n').value='Diallo'; document.getElementById('adm-we-po').value='Assistante'; document.getElementById('adm-we-e').value=e; admWfCreer();
    const w=DB.admin.c1.workflow.queue.slice(-1)[0]; admWfValider(w.id); const S=DB.admin.c1.rh.salaries; const n=S.find(s=>s.nom==='Diallo'); const reg=DB.admin.c1.legal.registres.personnel;
    return {n:!!n,dpae:admRhBilan('c1').alertes.some(a=>/DPAE — Nora/.test(a.titre)),reg:!!(reg&&reg.date),h:w.historique.slice(-1)[0].action}; },J(10));
  A(r.n&&r.dpae&&r.reg&&/DPAE à faire/.test(r.h),'embauche validée → salarié créé, registre du personnel daté, DPAE à faire',JSON.stringify(r));
  r=await ev(()=>{ admWfNouvelle('Sinistre'); document.getElementById('adm-ws-n').value='Dégât des eaux au dépôt'; admWfCreer(); const w=DB.admin.c1.workflow.queue.slice(-1)[0]; admWfValider(w.id); const S=(DB.admin.c1.control||{}).sinistres||[]; return {n:S.length,st:S[0]&&S[0].statut,nat:S[0]&&S[0].nature}; });
  A(r.n===1&&r.st==='À déclarer'&&/Dégât/.test(r.nat),'sinistre validé → ouvert dans MARQ CONTROL, à déclarer',JSON.stringify(r));
  r=await ev(()=>{ admWfNouvelle('Achat'); document.getElementById('adm-wc-o').value='Camion benne'; document.getElementById('adm-wc-m').value='45000'; admWfCreer(); const w=DB.admin.c1.workflow.queue.slice(-1)[0];
    admWfRefuser(w.id); admWfRefuserOk(w.id); const s1=w.statut; document.getElementById('adm-wr').value='Budget non prévu cette année'; admWfRefuserOk(w.id);
    admTab('mworkflow','hist'); return {s1,s2:w.statut,m:w.motif,hist:/Refusée/.test(document.getElementById('view').innerText)}; });
  A(r.s1==='dirigeant'&&r.s2==='refuse'&&/Budget/.test(r.m)&&r.hist,'refus : motif obligatoire, décision visible dans l’historique',JSON.stringify(r));

  // 7. demande ancienne → alerte sur la Page Entreprise, validations cliquables
  r=await ev(()=>{ admTab('mworkflow','file'); admWfNouvelle('Achat'); document.getElementById('adm-wc-o').value='Échafaudage'; document.getElementById('adm-wc-m').value='3000'; admWfCreer();
    const w=DB.admin.c1.workflow.queue.slice(-1)[0]; w.ts=Date.now()-7*86400000; save(); go('entreprise'); const txt=document.getElementById('view').innerText;
    const rows=[...document.querySelectorAll('.adm-row')].some(x=>/mworkflow/.test(x.getAttribute('onclick')||'')); return {rows,val:/Échafaudage/.test(txt),traiter:[...document.querySelectorAll('button')].some(x=>/Traiter/.test(x.textContent))}; });
  A(r.rows&&r.val&&r.traiter,'demande en attente depuis 7 jours : alerte et carte « Validations » sur la Page Entreprise',JSON.stringify(r));

  // 8. notes sensibles sous code
  r=await p.evaluate(async()=>{ go('mrh'); admTab('mrh','sens'); const lock=!!document.querySelector('.adm-lockbox'); admRhNote(); const modCode=!!document.getElementById('adm-code');
    document.getElementById('adm-code').value='rh-code-1'; document.getElementById('adm-code2').value='rh-code-1'; await admSensibleOk();
    admRhNote(); document.getElementById('adm-nx').value='Avertissement du 3 mars'; admRhNoteOk(); const n=DB.admin.c1.rh.notes.length; const vu=/Avertissement du 3 mars/.test(document.getElementById('view').innerText);
    admSensibleFermer(); const cache=!/Avertissement du 3 mars/.test(document.getElementById('view').innerText); admRhNoteSuppr(DB.admin.c1.rh.notes[0].id); return {lock,modCode,n,vu,cache,reste:DB.admin.c1.rh.notes.length}; });
  A(r.lock&&r.modCode&&r.n===1&&r.vu&&r.cache&&r.reste===1,'notes sensibles : code requis, visibles une fois ouvert, masquées à la fermeture, non supprimables sans accès',JSON.stringify(r));

  // 9. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const [m,t] of [['mrh','sal'],['mrh','abs'],['mrh','med'],['mrh','ent'],['mrh','sens'],['mworkflow','file'],['mworkflow','circ'],['mworkflow','hist']]){
    r=await ev(([m,t])=>{ go(m); admTab(m,t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className||e.tagName); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },[m,t]);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+m+' › '+t+')',JSON.stringify(r)); }
  r=await ev(()=>{ admWfNouvelle('Embauche'); const m=document.querySelector('#ov.show .modal'); if(!m) return false; const q=m.getBoundingClientRect(); const ok=q.width>0&&q.left>=-1&&q.right<=innerWidth+1; closeModal(); return ok; });
  A(r,'téléphone : fenêtre de demande dans l’écran');
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
