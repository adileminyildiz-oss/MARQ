/**
 * Mar'q — Espace client ↔ Administration : le client déclare, le cabinet valide (v748)
 *
 * Fige : rubrique « Déclarer » dans l'espace client des seules sociétés
 * inscrites à l'Administration ; absence (salariés actifs de MARQ RH),
 * demande d'achat, nouveau salarié, sinistre, avec contrôles de saisie ;
 * chaque déclaration entre dans la file de MARQ WORKFLOW (source « Le client
 * (espace client) », précisions du client affichées) et suit le même circuit
 * (seuil d'achat, accord du dirigeant, report dans RH et CONTROL) ; le client
 * voit l'état (en cours d'examen, accord du dirigeant, validée, refusée avec
 * le motif) ; carte « Espace client » dans MARQ WORKFLOW ; téléphone.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  p.on('dialog',d=>d.accept());
  await p.goto(URL_APP);
  await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  const y=new Date().getFullYear();
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; try{ localStorage.removeItem('last-portal-srv'); }catch(e){}
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',president:'Jean Martin'},{id:'c2',clientType:'entreprise',denomination:'HORS-ADMIN',forme:'sarl'}];
    DB.admin={c1:{rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',contrat:'CDI',actif:true},{id:'s2',prenom:'Ancien',nom:'Salarié',actif:false}],absences:[],notes:[]},workflow:{queue:[],seuil:5000,bc:0},legal:{registres:{}},control:{sinistres:[],assurances:[]}}};
    DB.parametres.adminInscrits=['c1']; save(); });
  let r;

  // 1. informations transmises au portail
  r=await ev(()=>({i:admPortailInfo('bati-nord'),n:admPortailInfo('HORS-ADMIN'),noms:suiviClientsNoms()}));
  A(r.i&&r.i.inscrit&&r.i.salaries.length===1&&r.i.salaries[0].nom==='Paul Durand'&&r.n===null&&r.noms.includes('BATI-NORD')&&!r.noms.includes('HORS-ADMIN'),'portail : seules les sociétés inscrites ont un espace de déclaration (salariés actifs transmis)',JSON.stringify(r));

  // 2. rubrique « Déclarer » dans l'aperçu de l'espace client
  const ouvrir=async(n)=>{ await ev(n=>{ try{ closePortail(); }catch(e){} svcPortPreview(n); },n); await p.waitForSelector('#portail-ov .pt-side-nav',{timeout:8000}); };
  await ouvrir('HORS-ADMIN');
  r=await ev(()=>!!document.querySelector('#portail-ov [data-go="declarer"]'));
  A(r===false,'société non inscrite : pas de rubrique « Déclarer »');
  await ouvrir('BATI-NORD');
  r=await ev(()=>{ const t=document.querySelector('#portail-ov .pt-tab[data-go="declarer"]'); t.click(); const pn=document.querySelector('#portail-ov .pt-panel[data-tab="declarer"]'); const autres=[...document.querySelectorAll('#portail-ov .pt-panel')].filter(x=>x!==pn&&!x.hidden).length;
    return {h:document.querySelector('#portail-ov .pt-top-t h1').textContent,vis:!pn.hidden,autres,ch:[...pn.querySelectorAll('.ptd-c b')].map(x=>x.textContent),on:t.classList.contains('on')}; });
  A(r.h==='Déclarer'&&r.vis&&r.autres===0&&r.on&&r.ch.join('|')==='Absence d’un salarié|Demande d’achat|Nouveau salarié|Sinistre','rubrique « Déclarer » : quatre déclarations proposées',JSON.stringify(r));

  // 3. absence : contrôle puis envoi
  r=await ev(()=>{ portDeclChoix('Absence'); const o=[...document.querySelectorAll('#ptd-s option')].map(x=>x.textContent); portDeclEnvoyer(); return {o,err:document.getElementById('ptd-err').textContent}; });
  A(r.o.join()==='Paul Durand'&&/date de début/.test(r.err),'absence : salariés actifs seulement ; date de début exigée',JSON.stringify(r));
  r=await ev(y=>{ document.getElementById('ptd-t').value='Maladie'; document.getElementById('ptd-d').value=y+'-11-03'; document.getElementById('ptd-fi').value=y+'-11-05'; document.getElementById('ptd-com').value='Arrêt de travail envoyé par courrier'; portDeclEnvoyer();
    const w=DB.admin.c1.workflow.queue; return {w:w.map(d=>({t:d.type,s:d.statut,src:d.source,l:d.libelle,c:d.commentaire,p:!!d.portail})),li:document.getElementById('ptd-liste').innerText,form:!!document.querySelector('.ptd-form')}; },y);
  A(r.w.length===1&&r.w[0].t==='Absence'&&r.w[0].s==='attente'&&r.w[0].src==='Le client (espace client)'&&/Paul Durand — maladie du 03\/11/.test(r.w[0].l)&&r.w[0].c==='Arrêt de travail envoyé par courrier'&&r.w[0].p,'absence envoyée : dans la file de MARQ WORKFLOW, source et précisions du client',JSON.stringify(r.w));
  A(/Déclaration envoyée/.test(r.li)&&/En cours d’examen/.test(r.li)&&!r.form,'client : confirmation et état « En cours d’examen »',r.li.slice(0,200));

  // 4. achats : sous le seuil (validé), au-dessus (accord du dirigeant)
  r=await ev(()=>{ portDeclChoix('Achat'); document.getElementById('ptd-o').value='Location mini-pelle'; portDeclEnvoyer(); const e1=document.getElementById('ptd-err').textContent;
    document.getElementById('ptd-fo').value='Kiloutou'; document.getElementById('ptd-m').value='1 200,50'; portDeclEnvoyer();
    portDeclChoix('Achat'); document.getElementById('ptd-o').value='Camion benne'; document.getElementById('ptd-m').value='38000'; portDeclEnvoyer();
    const q=DB.admin.c1.workflow.queue.filter(d=>d.type==='Achat'); return {e1,q:q.map(d=>({s:d.statut,m:d.data.montant,bc:d.bc||''})),li:document.getElementById('ptd-liste').innerText}; });
  A(/montant hors taxes/.test(r.e1)&&r.q.length===2&&r.q[0].s==='valide'&&r.q[0].m===1200.5&&/^BC-\d{4}-0*1$/.test(r.q[0].bc)&&r.q[1].s==='dirigeant','achats : montant exigé ; sous le seuil validé avec bon de commande, au-dessus en attente du dirigeant',JSON.stringify(r.q));
  A(/Validée/.test(r.li)&&/En attente de l’accord du dirigeant/.test(r.li),'client : « Validée » et « En attente de l’accord du dirigeant »',r.li.replace(/\s+/g,' ').slice(0,300));

  // 5. nouveau salarié → validation du cabinet → MARQ RH
  r=await ev(y=>{ portDeclChoix('Embauche'); document.getElementById('ptd-p').value='Lina'; document.getElementById('ptd-n').value='Morel'; document.getElementById('ptd-po').value='Maçonne'; document.getElementById('ptd-c').value='CDD'; document.getElementById('ptd-e').value=y+'-12-01'; portDeclEnvoyer(); const e=document.getElementById('ptd-err').textContent;
    document.getElementById('ptd-ef').value=(y+1)+'-05-31'; portDeclEnvoyer(); const d=DB.admin.c1.workflow.queue.filter(x=>x.type==='Embauche')[0]; return {e,s:d&&d.statut,id:d&&d.id}; },y);
  A(/fin du CDD/.test(r.e)&&r.s==='attente','nouveau salarié : fin du CDD exigée ; demande en attente du cabinet',JSON.stringify(r));
  r=await ev(id=>{ closePortail(); go('mworkflow'); admEntChoisir('c1'); go('mworkflow'); const v=document.getElementById('view').innerText; admWfValider(id); const s=DB.admin.c1.rh.salaries.filter(x=>x.nom==='Morel')[0]; return {v,s}; },r.id);
  r.li=await ev(()=>{ svcPortPreview('BATI-NORD'); portV2Tab('declarer'); return new Promise(r=>setTimeout(()=>r(document.getElementById('ptd-liste').innerText),150)); });
  A(/Espace client/.test(r.v)&&/BATI-NORD déclare ses absences/.test(r.v)&&/Arrêt de travail envoyé par courrier/.test(r.v)&&/Le client \(espace client\)/.test(r.v),'MARQ WORKFLOW : carte « Espace client », précisions et source du client dans la file',r.v.replace(/\s+/g,' ').slice(0,400));
  A(r.s&&r.s.contrat==='CDD'&&r.s.poste==='Maçonne'&&r.s.fin===(y+1)+'-05-31'&&r.s.actif,'validation du cabinet : salarié créé dans MARQ RH',JSON.stringify(r.s));
  A(/Embauche de Lina Morel/.test(r.li)&&/Lina Morel[\s\S]{0,120}Validée/.test(r.li),'client : l’embauche apparaît « Validée »',r.li.replace(/\s+/g,' ').slice(0,300));

  // 6. sinistre refusé avec motif
  r=await ev(y=>{ portDeclChoix('Sinistre'); document.getElementById('ptd-sd').value=y+'-09-20'; document.getElementById('ptd-sn').value='Vol ou effraction'; document.getElementById('ptd-sl').value='Chantier Roubaix'; portDeclEnvoyer(); const e=document.getElementById('ptd-err').textContent;
    document.getElementById('ptd-sx').value='Vol de deux perforateurs dans le conteneur'; portDeclEnvoyer(); const d=DB.admin.c1.workflow.queue.filter(x=>x.type==='Sinistre')[0]; return {e,d:{s:d.statut,desc:d.data.description,nat:d.data.nature,id:d.id}}; },y);
  A(/Décrivez/.test(r.e)&&r.d.s==='attente'&&r.d.nat==='Vol ou effraction'&&/^Lieu : Chantier Roubaix\. Vol de deux perforateurs/.test(r.d.desc),'sinistre : description exigée ; lieu repris dans les circonstances',JSON.stringify(r.d));
  r=await ev(id=>{ closePortail(); go('mworkflow'); admWfRefuser(id); document.getElementById('adm-wr').value='Déjà déclaré par téléphone le 21/09'; admWfRefuserOk(id); svcPortPreview('BATI-NORD'); portV2Tab('declarer'); return new Promise(r=>setTimeout(()=>r(document.getElementById('ptd-liste').innerText),150)); },r.d.id);
  A(/Refusée/.test(r)&&/Motif : Déjà déclaré par téléphone le 21\/09/.test(r),'client : sinistre « Refusée » avec le motif du cabinet',r.replace(/\s+/g,' ').slice(0,300));

  // 7. navigation : retour aux autres rubriques
  r=await ev(()=>{ portV2Tab('docs'); const pn=document.querySelector('#portail-ov .pt-panel[data-tab="declarer"]'); const on=document.querySelector('#portail-ov .pt-tab[data-go="declarer"]').classList.contains('on'); return {hid:pn.hidden,on,h:document.querySelector('#portail-ov .pt-top-t h1').textContent}; });
  A(r.hid&&!r.on&&r.h==='Mes documents','retour aux autres rubriques : « Déclarer » se referme',JSON.stringify(r));

  // 8. téléphone
  await p.setViewportSize({width:375,height:760}); await p.waitForTimeout(200);
  for(const t of ['','Absence','Embauche','Sinistre']){ r=await ev(t=>{ svcPortPreview('BATI-NORD'); portV2Tab('declarer'); portDeclChoix(t); const o=[]; document.querySelectorAll('#portail-ov .pt-panel[data-tab="declarer"] *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1) o.push(e.className||e.tagName); }); const fs=[...document.querySelectorAll('.ptd-f input,.ptd-f select')].map(e=>getComputedStyle(e).fontSize); return {o:o.slice(0,4),fs:[...new Set(fs)]}; },t);
    A(!r.o.length&&(!r.fs.length||(r.fs.length===1&&r.fs[0]==='16px')),'téléphone : rien ne dépasse, champs en 16 px ('+(t||'choix')+')',JSON.stringify(r)); }
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
