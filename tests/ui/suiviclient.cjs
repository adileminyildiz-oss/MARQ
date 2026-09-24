/**
 * Mar'q — Le client voit où en est son dossier (v733)
 *
 * Démarre le serveur du portail. Vérifie que le client voit ses étapes publiques
 * (jamais les honoraires ni les contrôles internes), que le cabinet voit le même
 * bloc, que la synchronisation porte l'avancement, que le serveur ne garde que
 * des champs publics bornés, et que rien de ce qu'il renvoie n'est interprété.
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
  const { spawn } = require('child_process'); const fs=require('fs'), path=require('path'), os=require('os');
  const PORT=8800+Math.floor(Math.random()*90), TOKEN='ci-cabinet-token', DATA=fs.mkdtempSync(path.join(os.tmpdir(),'marq-suivi-')), BASE='http://localhost:'+PORT;
  const srv=spawn('node',['server.js'],{cwd:path.join(__dirname,'..','..','server','portal'),env:Object.assign({},process.env,{PORT:String(PORT),CABINET_TOKEN:TOKEN,JWT_SECRET:'ci-jwt',ALLOWED_ORIGIN:'*',DATA_DIR:DATA}),stdio:'ignore'});
  const fin=()=>{ try{ srv.kill(); }catch(e){} try{ fs.rmSync(DATA,{recursive:true,force:true}); }catch(e){} };
  let up=false; for(let i=0;i<60&&!up;i++){ try{ const r=await fetch(BASE+'/health'); up=r.ok; }catch(e){} if(!up) await new Promise(r=>setTimeout(r,200)); }
  A(up,'serveur du portail démarré');
  let r;

  // ---------- 1. ce que le client doit savoir, et rien d'autre ----------
  r=await ev(()=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); window.__d=d.id; const J=86400000,N=Date.now();
    d.wf={__v6:1,demande:N-6*J}; d.createdAt=new Date(N-6*J).toISOString().slice(0,10);
    parcoursOublier(); const nom=(clientById(d.clientIds[0])||{}).denomination; window.__nom=nom; const L=suiviClient(nom);
    const x=L[0]||{}; return {nom,fo:x.formalite,n:L.length,et:(x.etapes||[]).map(e=>e.lbl+':'+e.etat).join(' | '),phrase:x.phrase,att:x.attendu,cles:Object.keys(x).sort().join(','),maj:x.maj}; });
  A(r.n===1&&/^Demande reçue:fait/.test(r.et)&&/Pièces réunies:encours/.test(r.et)&&/Dossier remis:avenir$/.test(r.et),'le client voit ses étapes, de la demande reçue au dossier remis, avec celle en cours',r.et);
  A(!/Honoraires|archiv|qualifi/i.test(r.et)&&r.cles==='attendu,enCours,etapes,fait,formalite,maj,phrase,ref,termine,total','aucune étape interne (honoraires, qualification, archivage), aucun champ de plus que le nécessaire',r.cles);
  A(r.fo==='Création de votre SAS','la formalité est nommée en clair (« Création de votre SAS »), pas par son code',r.fo);
  A(/^Nous (attendons|vérifions) vos pièces\.$/.test(r.phrase)&&/^\d{4}-\d{2}-\d{2}$/.test(r.maj),'l’étape en cours est dite en clair, avec la date de la dernière avancée',JSON.stringify(r));

  // ---------- 2. côté cabinet : ce que voit le client ----------
  r=await ev(()=>{ state.page='espace'; state.espaceDossier=__d; state.espTab='demande'; render();
    const c=document.querySelector('#view .esp-tabpanel[data-tab="demande"] .sc-card'); return {c:!!c,t:c?c.innerText:'',btn:c?[...c.querySelectorAll('button')].map(b=>b.textContent):[]}; });
  A(r.c&&/Ce que voit le client/.test(r.t)&&/Où en est mon dossier/.test(r.t)&&r.btn.includes('Aperçu du portail')&&r.btn.includes('Copier l’accès du client'),'onglet Demande : le cabinet voit exactement le bloc montré au client',JSON.stringify(r.btn));
  r=await ev(()=>{ suiviClientApercu(__d); const ov=document.getElementById('portail-ov'); const t=ov?ov.innerText:''; const ok=/Où en est mon dossier/.test(t)&&/Pièces réunies/.test(t); try{ closePortail(); }catch(e){} return ok; });
  A(r,'aperçu du portail (mode local) : le bloc de suivi apparaît au-dessus des documents');

  // ---------- 3. en ligne : synchronisation, connexion du client ----------
  r=await ev(async(cfg)=>{ localStorage.setItem('last-portal-srv',JSON.stringify({url:cfg.base,token:cfg.token,auto:false}));
    svcPortSyncNow(); for(let i=0;i<40;i++){ await new Promise(r=>setTimeout(r,100)); if(/Synchronis/.test((JSON.parse(localStorage.getItem('last-portal-srv'))||{})._last||'')) break; }
    return (JSON.parse(localStorage.getItem('last-portal-srv'))||{})._last; },{base:BASE,token:TOKEN});
  A(/Synchronis/.test(r||''),'synchronisation : le client ayant un dossier en cours part vers le portail même sans document partagé',r);
  const code=await ev(()=>{ const svc=JSON.parse(localStorage.getItem('last-svc')||'{}'); return ((svc.portail||{}).codes||{})[__nom.trim().toLowerCase()]; });
  r=await ev(async(o)=>{ const L=await fetch(o.base+'/portal/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client:window.__nom,code:o.code})}); const j=await L.json();
    const d=await (await fetch(o.base+'/portal/docs',{headers:{Authorization:'Bearer '+j.token}})).json(); return {ok:L.status===200,s:d.suivi}; },{base:BASE,code});
  A(r.ok&&Array.isArray(r.s)&&r.s.length===1&&r.s[0].etapes.some(e=>e.lbl==='Pièces réunies'&&e.etat==='encours'),'le serveur rend au client connecté l’avancement de son dossier',JSON.stringify(r.s).slice(0,200));

  // ---------- 4. le serveur ne garde que le public, borné ----------
  r=await ev(async(o)=>{ const bad=[{ref:'X',formalite:'Création',phrase:'<img src=x onerror=alert(1)>'+('a'.repeat(400)),honoraires:1200,notes:'interne',etapes:[{lbl:'Étape',etat:'pirate',x:1}],attendu:['a'],maj:'nimporte'}];
    await fetch(o.base+'/admin/sync',{method:'POST',headers:{'Content-Type':'application/json','X-Cabinet-Token':o.token},body:JSON.stringify({cabinet:'C',mode:'replace',clients:[{name:'PIRATE',code:'ABCD1234',suivi:bad}],docs:[]})});
    const L=await (await fetch(o.base+'/portal/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client:'PIRATE',code:'ABCD1234'})})).json();
    const d=await (await fetch(o.base+'/portal/docs',{headers:{Authorization:'Bearer '+L.token}})).json(); return d.suivi[0]; },{base:BASE,token:TOKEN});
  A(r&&r.honoraires===undefined&&r.notes===undefined&&r.phrase.length===160&&r.etapes[0].etat==='avenir'&&r.etapes[0].x===undefined&&r.maj==='','serveur : champs inconnus écartés, textes bornés, états et dates contrôlés',JSON.stringify(r).slice(0,200));

  // ---------- 5. le portail en ligne, vu par le client ----------
  await ev(async(cfg)=>{ localStorage.setItem('last-portal-srv',JSON.stringify({url:cfg.base,token:cfg.token,auto:false})); svcPortSyncNow(); await new Promise(r=>setTimeout(r,800)); },{base:BASE,token:TOKEN});
  await ev(()=>{ openPortail(window.__nom); });
  await p.fill('#port-in-client',await ev(()=>window.__nom)); await p.fill('#port-in-code',code); await ev(()=>svcPortLogin());
  await p.waitForFunction(()=>{ const ov=document.getElementById('portail-ov'); return ov&&/Où en est mon dossier/.test(ov.innerText); },{timeout:8000}).catch(()=>{});
  r=await ev(()=>{ const ov=document.getElementById('portail-ov'); const t=ov?ov.innerText:''; return {suivi:/Où en est mon dossier/.test(t),etape:/Pièces réunies/.test(t),remote:!!window.__portRemote,xss:!!(ov&&ov.querySelector('img[src="x"]'))}; });
  A(r.suivi&&r.etape&&r.remote,'portail en ligne : après connexion, le client voit « Où en est mon dossier » servi par le serveur',JSON.stringify(r));
  await ev(async()=>{ window.__portSuivi=[{ref:'X',formalite:'<b>t</b>',phrase:'<img src="x" onerror="window.__pwn=1">',etapes:[{lbl:'<i>e</i>',etat:'fait'}],attendu:['<script>1</script>'],fait:1,total:1,maj:''}]; });
  r=await ev(()=>{ const h=portSuiviHTML('X',true); const d=document.createElement('div'); d.innerHTML=h; return {img:!!d.querySelector('img'),b:!!d.querySelector('b.x'),i:!!d.querySelector('.sc-steps i'),s:!!d.querySelector('script'),pwn:!!window.__pwn}; });
  A(!r.img&&!r.i&&!r.s&&!r.pwn,'tout ce qui vient du serveur est affiché comme du texte, jamais interprété',JSON.stringify(r));
  await ev(()=>{ try{ closePortail(); }catch(e){} });

  fin();
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
