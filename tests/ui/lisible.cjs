/**
 * Mar'q — Lisibilité des écrans récents (v731)
 *
 * Audit rejoué à 390 px (téléphone) et 1 400 px : onglets du Traitement d'une SAS
 * du BTP au K-bis reçu, Pilotage, Tableau de bord, Formulaire, Barèmes,
 * Pré-diagnostic, et les trois pages publiques. Aucun texte coupé sans info-bulle,
 * aucun débordement horizontal, aucune police sous 11 px, aucun « undefined ».
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
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'test'; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.open=()=>({close(){},focus(){},document:{write(){},close(){}}}); try{ ['demandes','agenda','fiscal','formulaire','espace'].forEach(id=>modPauseSet(id,false)); }catch(e){}
  DB.demandes=[]; DB.dossiers=[]; DB.clients=[]; DB.factures=DB.factures||[]; DB.parametres.formDrafts=[];
  // fabrique de dossiers complets via le Formulaire
  window.__mk=function(type,extra){ formReset(); formNature('creation'); formType(type); const o=window.__formData; const den=(extra&&extra.den)||('SOC '+type.toUpperCase());
    Object.assign(o,{societe:{denomination:den,capital:'5000',objet:'Location de logements meublés',debut:'2026-10-01',regime:'IS'},titres:{nominal:'10',nbTitres:'500'},apports:{numeraire:'5000',nature:'0'},siege:{rue:'14 rue des Jacobins',cp:'80000',ville:'Amiens',type:'domiciliation'},direction:{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'14 rue des Jacobins 80000 Amiens',fonction:''},dirx:{pereNom:'Jean LAMBERT',mereNom:'Marie DURAND',secu:'288038002104512',typePiece:'cni'},contact:{email:'s.lambert@logis.fr',tel:'0612345678'},dates:{dateActe:'2026-09-14',villeSignature:'Amiens'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'5000',date:'2026-09-10'},
      associes:(type==='sasu'||type==='eurl')?[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'500',apport:'5000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'}]:[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'300',apport:'3000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'},{civilite:'M.',prenom:'Marc',nom:'LAMBERT',parts:'200',apport:'2000',naissance:'1985-07-02',lieuNaissance:'Lille',pays:'France',nationalite:'Française',adresse:'Lille'}]});
    const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id,ref:d&&(d.numeroDossier||d.ref)}; };
  window.__mkModif=function(kind){ formReset(); formNature('modification'); formModifKind(kind); const o=window.__formData; o.contact={email:'eric@garage-dupont.fr',tel:'0611223344'}; o.modif={kind,societe:{denomination:'GARAGE DUPONT',forme:'sarl',siren:'812345678',rcsVille:'Amiens',siege:'5 rue Neuve',cp:'80000',ville:'Amiens'},dates:{acte:'2026-09-14',effet:'2026-10-01',ville:'Amiens'},signataire:{prenom:'Éric',nom:'DUPONT'},nouveau:{siege:'3 quai du Canal',cp:'80000',ville:'Amiens',prenom:'Paul',nom:'DUPONT',naissance:'1990-01-01',adresse:'Amiens',denomination:'GARAGE DUPONT & FILS',objet:'Réparation automobile',capital:'20000',formeNouvelle:'sas',cedant:'Éric DUPONT',cessionnaire:'Paul DUPONT',nbTitres:'100',prix:'10000',liquidateur:'Éric DUPONT',siegeLiquidation:'Amiens',dateClotureLiq:'2026-12-31',ancienneCloture:'31/12',nouvelleCloture:'30/06'}}; const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id}; };
});

  // ---------- 1. un dossier neuf ne part pas ----------
  const RACINE=URL_APP.replace(/index\.html.*$/,'');
  const AUDIT=(sel)=>{ const out=[]; const roots=sel==='body'?[document.body]:[...document.querySelectorAll(sel)].filter(e=>e.offsetParent||getComputedStyle(e).position==='fixed'); const vw=document.documentElement.clientWidth;
    roots.forEach(root=>{
      const t=root.innerText||''; const m=t.match(/undefined|NaN(?![a-zA-Z])|\[object Object\]|null €|Invalid Date/g); if(m) out.push('texte:'+[...new Set(m)].join(','));
      root.querySelectorAll('*').forEach(e=>{ if(!e.offsetParent) return; const cs=getComputedStyle(e); const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
        if(own&&parseFloat(cs.fontSize)<11) out.push('police '+cs.fontSize+':'+(e.className||e.tagName)+':'+e.textContent.trim().slice(0,30));
        const r=e.getBoundingClientRect(); if(r.width>0&&r.right>vw+2&&!e.closest('[style*="overflow"],.table-wrap,table,pre')) out.push('déborde '+Math.round(r.right-vw)+'px:'+(e.className||e.tagName)+':'+e.textContent.trim().slice(0,30));
        if(own&&cs.overflow!=='visible'&&cs.whiteSpace==='nowrap'&&e.scrollWidth>e.clientWidth+2&&!e.getAttribute('title')) out.push('tronqué '+(e.scrollWidth-e.clientWidth)+'px:'+(e.className||e.tagName)+':'+e.textContent.trim().slice(0,50));
        if((e.tagName==='BUTTON')&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('title')) out.push('bouton vide:'+e.className); });
    });
    return {n:roots.length, pb:[...new Set(out)].slice(0,15)}; };
  const res=[];
  async function passe(w,nom,prep,sel,arg){ await p.setViewportSize({width:w,height:900}); await ev(prep,arg); await p.waitForTimeout(250);
    const r=await p.evaluate(`(${AUDIT.toString()})(${JSON.stringify(sel)})`); res.push([w,nom,r.n,r.pb]); }
  await ev(()=>{ window.__mkK=function(type,fn){ const m=window.__mk(type); const d=DB.dossiers.find(x=>x.id===m.id); if(fn) fn(d); return d; };
    const d=__mkK('sas',x=>{ x.intake.societe.objet='Maçonnerie et gros œuvre'; x.immat=Object.assign(x.immat||{},{kbis:{name:'kbis.pdf',ts:Date.now()}}); x.wf={__v6:1}; ['demande','pieces','actes','attestations','immatriculation'].forEach(k=>x.wf[k]=Date.now()); });
    window.__a=d.id; });
  for(const w of [390,1400]){
    for(const tab of ['demande','pieces','actes','attestations','immatriculation','cloture'])
      await passe(w,'espace/'+tab,(tb)=>{ state.page='espace'; state.espaceDossier=__a; state.espTab=tb; render(); },'#view .esp-tabpanel[data-tab="'+tab+'"]',tab);
    await passe(w,'pilotage',()=>{ state.page='pilotage'; render(); },'#view');
    await passe(w,'tableau de bord',()=>{ state.page='cockpit'; render(); },'#view');
    await passe(w,'formulaire',()=>{ state.page='formulaire'; render(); },'#view');
    await passe(w,'barèmes',()=>{ state.page='params'; render(); spGo('cab/bar'); },'.bar-card');
    await passe(w,'pré-diagnostic',()=>{ state.page='cockpit'; render(); prediagOuvrir(); },'#ov .modal');
    await ev(()=>{ try{ closeModal(); }catch(e){} });
  }
  // pages publiques
  for(const pg of ['infos.html?d=DOS-2026-77&k=t&t=sasu&f=denomination,objet,documents,associes','diagnostic.html','depot.html?d=DOS-2026-77&k=t']){
    const q=await b.newPage({viewport:{width:390,height:900}}); const qe=[]; q.on('pageerror',e=>qe.push(''+e));
    await q.goto(RACINE+pg); await q.waitForTimeout(600);
    const r=await q.evaluate(`(${AUDIT.toString()})('body')`); res.push([390,pg.split('?')[0],r.n,r.pb.concat(qe.map(x=>'erreur:'+x))]); await q.close(); }
  res.forEach(x=>A(x[2]>0&&x[3].length===0,'largeur '+x[0]+' px — '+x[1]+' : rien de coupé, rien ne déborde, aucune police sous 11 px, aucun texte parasite',x[2]+' zone(s) · '+x[3].join(' | ')));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
