/**
 * Mar'q — Administration : bilans en cache d'un affichage à l'autre (v750)
 *
 * Fige : sur un cabinet chargé (40 sociétés inscrites), l'écran de choix
 * réaffiché (recherche, retour) ne recalcule plus les bilans des 40
 * sociétés ; le cache est invalidé à chaque enregistrement de la base
 * (une nouvelle alerte apparaît aussitôt) et peut être vidé.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const r=await p.evaluate(()=>{ const y=new Date().getFullYear(); DB.clients=[]; DB.admin={}; const ids=[];
    for(let c=0;c<40;c++){ const id='c'+c; ids.push(id); DB.clients.push({id,clientType:'entreprise',denomination:'SOCIETE '+String(c).padStart(2,'0'),forme:'sas'});
      const pieces=[]; for(let i=0;i<200;i++) pieces.push({id:'f'+i,type:'Facture',num:'F'+i,contactId:'k1',date:(y-(i%6))+'-'+String(1+i%12).padStart(2,'0')+'-10',ht:1000,tva:20,statut:'Payée'});
      const sal=[]; for(let s=0;s<30;s++) sal.push({id:'s'+s,prenom:'P'+s,nom:'N'+s,contrat:'CDI',entree:'2020-01-01',actif:true});
      const docs=[]; for(let d=0;d<50;d++) docs.push({id:'d'+d,titre:'Doc '+d,cat:'Social',date:(y-(d%8))+'-03-01',texte:'x'});
      DB.admin[id]={crm:{contacts:[{id:'k1',raison:'Client',type:'Client'}],pieces,boamp:{mots:'',deps:'',avis:[]}},rh:{salaries:sal,absences:[],notes:[]},workflow:{queue:[],seuil:5000,bc:0},doc:{docs,sig:[]},legal:{registres:{}},control:{sinistres:[],assurances:[]}}; }
    DB.parametres.adminInscrits=ids; save();
    const t=f=>{ const a=performance.now(); f(); return performance.now()-a; };
    let n=0; const calc=[]; const o=admBilanGlobal; // compter les calculs via un module espion
    admModule('mespion',{lbl:'Espion',sub:'test',ic:'box',page:()=>'',bilan:()=>{ n++; return {alertes:[],domaines:[]}; }});
    admBilanCacheVider(); go('entreprise'); const n1=n; const t1=t(()=>render()); const n2=n-n1;
    const t2=t(()=>render()); const n3=n-n1-n2;
    return {n1,n2,n3,t1:Math.round(t1),t2:Math.round(t2)}; });
  A(r.n1===40&&r.n2===0&&r.n3===0,'écran de choix réaffiché : les bilans des 40 sociétés ne sont pas recalculés',JSON.stringify(r));
  const r2=await p.evaluate(()=>{ let n=0; admModule('mespion2',{lbl:'Espion 2',sub:'test',ic:'box',page:()=>'',bilan:(c)=>{ n++; return c.id==='c3'&&window.__alerte?{alertes:[{niv:'r',date:new Date(),titre:'Alerte de test',detail:''}],domaines:[]}:{alertes:[],domaines:[]}; }});
    admBilanCacheVider(); const a0=admBilanGlobal('c3').alertes.some(a=>a.titre==='Alerte de test');
    window.__alerte=1; const a1=admBilanGlobal('c3').alertes.some(a=>a.titre==='Alerte de test');
    save(); const a2=admBilanGlobal('c3').alertes.some(a=>a.titre==='Alerte de test');
    const b1=admBilanGlobal('c3'); b1.alertes.push({titre:'intrus'}); const a3=admBilanGlobal('c3').alertes.some(a=>a.titre==='intrus');
    return {a0,a1,a2,a3}; });
  A(!r2.a0&&!r2.a1&&r2.a2,'cache invalidé à l’enregistrement : la nouvelle alerte apparaît aussitôt',JSON.stringify(r2));
  A(!r2.a3,'le bilan servi par le cache ne peut pas être altéré par l’appelant',JSON.stringify(r2));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
