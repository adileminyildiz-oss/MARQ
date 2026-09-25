/**
 * Mar'q — Cache de calcul le temps d'un affichage (v765, recette 7.7 à 7.9)
 *
 * Les statuts de chaque dossier étaient recalculés des dizaines de fois par
 * affichage (5 s pour le tableau de bord d'un cabinet de 300 dossiers). Ils
 * sont désormais gardés le temps d'un seul affichage. Ce test fige : les temps
 * sur un volume courant, et surtout la FRAÎCHEUR — une donnée modifiée hors
 * affichage, même sans enregistrement, est prise en compte immédiatement.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1360,height:900}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ const C=[],D=[],F=[];
    for(let i=0;i<300;i++){ C.push({id:'pc'+i,clientType:'entreprise',denomination:'SOCIETE PERF '+i,email:'p'+i+'@ex.fr',associes:[],docVars:{},createdAt:'2020-01-01'});
      D.push({id:'pd'+i,ref:'DOS-P-'+i,numeroDossier:'DOS-P-'+i,clientIds:['pc'+i],serviceIds:[],statut:'En cours',createdAt:'2021-03-01',historique:[{d:'2021-03-01',t:'Dossier créé'}]}); }
    for(let i=0;i<600;i++) F.push({id:'pf'+i,numero:'FAC-2025-'+i,statut:'emise',clNom:'SOCIETE PERF '+(i%300),dateEmise:'2025-03-15',tva:20,remise:0,lignes:[{des:'P',qte:1,pu:100}]});
    DB.clients=DB.clients.concat(C); DB.dossiers=DB.dossiers.concat(D); DB.parametres.facturier=F; save(); });
  const t=await ev(()=>['cockpit','demandes','facturier','espace'].map(id=>{ const t0=performance.now(); state.page=id; render(); return [id,Math.round(performance.now()-t0)]; }));
  const pire=Math.max(...t.map(x=>x[1]));
  A(pire<2500,'volume courant (300 dossiers, 600 factures) : chaque écran en moins de 2,5 s',JSON.stringify(t));
  /* le cache ne vit que pendant un affichage */
  const f=await ev(()=>{ const d=DB.dossiers.find(x=>x.id==='pd0'); const a=JSON.stringify(dossierStatuts(d)); d.statut='Clôturé'; d.wf=Object.assign({},d.wf,{factureEmise:true,recette:1}); const b2=JSON.stringify(dossierStatuts(d)); return {change:a!==b2}; });
  A(f.change,'hors affichage, une modification non enregistrée est vue immédiatement');
  const g=await ev(()=>{ const d=DB.dossiers.find(x=>x.id==='pd1'); let dedans=null, apres=null; const _r=window.render;
    state.page='cockpit'; render(); const av=JSON.stringify(dossierStatuts(d)); d.immat={depose:true,kbis:true,verifie:true}; apres=JSON.stringify(dossierStatuts(d)); return {change:av!==apres}; });
  A(g.change,'après un affichage, la donnée modifiée est recalculée (aucune valeur gardée)');
  const h=await ev(()=>{ let n=0; const _s=window.save; const d=DB.demandes||(DB.demandes=[]); for(let i=0;i<50;i++) d.push({id:'pq'+i,clientNom:'D '+i,clientEmail:'d'+i+'@ex.fr',statut:'nouvelle',createdAt:'2025-06-01'});
    window.__nSave=0; const orig=window.save; state.page='demandes'; render(); return {codes:DB.demandes.filter(x=>/^pq/.test(x.id)&&x.code).length}; });
  A(h.codes===50,'numéros attribués à l’affichage : tous posés',JSON.stringify(h));
  const persist=await ev(()=>{ const raw=localStorage.getItem('last-db-v1')||''; return raw.indexOf('"pq49"')>=0 && /"code":"[^"]+"/.test(raw); });
  A(persist,'les numéros attribués pendant l’affichage sont enregistrés à la fin de l’affichage');
  A(errs.length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));
  await b.close(); console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); process.exit(1); });
