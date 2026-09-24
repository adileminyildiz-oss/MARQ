/**
 * Mar'q — Espace client : aucun défaut d'affichage, du petit téléphone à l'ordinateur (v734)
 *
 * L'espace client a été refait à l'image du logiciel (barre latérale, quatre
 * rubriques, barre d'onglets sur téléphone). Ce test en fige la qualité :
 * sur sept formats (320 px à la tablette, téléphone à l'horizontale compris)
 * et quatre situations (dossier normal, espace vide, mode local, noms et
 * listes démesurés), il ne tolère ni débordement, ni texte coupé ou
 * superposé, ni cible tactile de moins de 44 px, ni champ sous 16 px (zoom
 * forcé sur iPhone), ni police sous 11 px, ni fin de page cachée sous la
 * barre du bas. Il vérifie aussi que les rubriques s'enchaînent, que la
 * photo est proposée au doigt, et que l'ordinateur garde sa barre latérale
 * entière (nom du client et déconnexion visibles).
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const ST=['Demande reçue','Devis envoyé','Votre accord','Dossier ouvert','Pièces réunies','Actes rédigés','Actes signés','Annonce légale publiée','Dossier déposé','Immatriculation obtenue','Dossier remis'];
  const dos=(ref,f,k,att)=>({ref,formalite:f,phrase:'Vos actes vous attendent pour signature.',etapes:ST.map((l,i)=>({lbl:l,etat:i<k?'fait':(i===k?'encours':'avenir')})),attendu:att,maj:'2026-09-22',fait:k,total:11,enCours:ST[k],termine:false});
  const DOCS=[{rid:'1',nom:'Projet de statuts.pdf',cat:'Actes',date:'2026-09-22'},{rid:'5',nom:'Déclaration des bénéficiaires effectifs.pdf',cat:'Actes',date:'2026-09-22'},{rid:'2',nom:'Attestation de domiciliation.pdf',cat:'Justificatifs',date:'2026-09-18'},{rid:'3',nom:'Devis accepté.pdf',cat:'Honoraires',date:'2026-09-10'},{rid:'4',nom:'Liste des pièces à fournir.pdf',cat:'Informations',date:'2026-09-09'}];
  const LONGDOCS=DOCS.concat(Array.from({length:22},(_, i)=>({rid:'L'+i,nom:(i===0?'Proces-verbal_assemblee_generale_extraordinaire_transfert_de_siege_social_2026_version_definitive_signee.pdf':'Pièce complémentaire numéro '+(i+1)+' du dossier de modification statutaire.pdf'),cat:['Actes','Honoraires','Informations','Justificatifs','Correspondances administratives','Divers'][i%6],date:'2026-08-'+String(10+i).padStart(2,'0')})));
  const STATES={
    demo:{client:'SARL DUPONT',suivi:[dos('DOS-2026-014','Création de votre SAS',6,['signer les actes','déposer le capital et nous envoyer l’attestation'])],docs:DOCS,msg:'Bonjour, vos statuts sont prêts. Merci de les relire puis de les signer : nous lançons l’annonce légale dès réception.',nw:{'1':1,'5':1},remote:true},
    vide:{client:'M. Martin',suivi:[],docs:[],msg:'',nw:{},remote:true},
    local:{client:'SARL DUPONT',suivi:[],docs:DOCS.slice(0,2),msg:'',nw:{},remote:false},
    long:{client:'SOCIÉTÉ CIVILE IMMOBILIÈRE DES GRANDS BOULEVARDS HAUSSMANNIENS',suivi:[dos('DOS-2026-014-MODIFICATION-STATUTAIRE','Transfert de siège social et modification de l’objet social de votre société civile immobilière',3,['compléter le formulaire en ligne','nous transmettre la pièce d’identité du gérant et le justificatif de domicile de moins de trois mois','signer les actes','déposer le capital et nous envoyer l’attestation','répondre au rapport d’anomalies']),dos('DOS-2026-015','Création de votre SAS',10,[]),dos('DOS-2026-016','Dépôt de marque',1,['signer'])],docs:LONGDOCS,msg:'Bonjour, merci de consulter https://marq.aemconseil.eu/depot.html?client=SOCIETE-CIVILE-IMMOBILIERE-DES-GRANDS-BOULEVARDS-HAUSSMANNIENS&code=ABCDEF0123456789 pour déposer vos pièces.\nCordialement,\nL’équipe',nw:{'1':1,'5':1,'L0':1,'L1':1,'L2':1,'L3':1,'L4':1,'L5':1,'L6':1,'L7':1,'L8':1,'L9':1,'L10':1,'L11':1},remote:true}
  };
  const VPS=[[320,568],[375,667],[390,844],[430,932],[768,1024],[844,390],[667,375]];
  async function page(w,h){ const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:w<=900,isMobile:w<=900,deviceScaleFactor:1}); const p=await ctx.newPage(); p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(w+'x'+h+' '+e); });
    await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} }); await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000}); return p; }
  async function space(p,s,tab){ await p.evaluate(({s,tab})=>{ openPortail(s.client); window.__portSuivi=s.suivi; window.__portMsg=s.msg; window.__portNew=s.nw; window.__portNewCount=Object.keys(s.nw).length; window.__portDocsAll=s.docs; window.__portRemote=s.remote;
      window.__ptState={tab:tab,cat:''}; portV2Space(document.getElementById('portail-ov'),s.client,s.docs,s.remote); },{s,tab}); await p.waitForTimeout(120); }
  const CHECK=()=>{ const out=[]; const vw=innerWidth, vh=innerHeight, touch=matchMedia('(pointer:coarse)').matches||vw<=760; const ov=document.getElementById('portail-ov');
    const vis=e=>{ if(e.closest('[hidden]')) return false; const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; };
    const nm=e=>(e.className&&e.className.baseVal===undefined?('.'+String(e.className).trim().split(/\s+/).join('.')):e.tagName)+(e.id?('#'+e.id):'')+' «'+(e.innerText||e.value||e.placeholder||'').trim().slice(0,30)+'»';
    if(document.documentElement.scrollWidth>vw+1) out.push('page déborde en largeur '+document.documentElement.scrollWidth);
    [ov,ov.querySelector('.pt-body'),ov.querySelector('.pt-main'),ov.querySelector('.pt-login')].forEach(c=>{ if(c&&c.scrollWidth>c.clientWidth+1) out.push('défilement horizontal '+nm(c)+' '+c.scrollWidth+'>'+c.clientWidth); });
    const all=[...ov.querySelectorAll('*')].filter(e=>!(e instanceof SVGElement&&e.tagName!=='svg')&&vis(e));
    all.forEach(e=>{ const r=e.getBoundingClientRect(); if(r.right>vw+0.6||r.left<-0.6) out.push('hors écran '+nm(e)+' ['+Math.round(r.left)+','+Math.round(r.right)+']');
      const cs=getComputedStyle(e);
      if(/hidden|clip/.test(cs.overflowX+cs.overflow)&&e.scrollWidth>e.clientWidth+1&&cs.textOverflow!=='ellipsis'&&!e.matches('.pt-ring span,.pt-bar,.pt-card,.pt-login-card,.pt-app,#portail-ov,.pt-doc-ic')) out.push('texte coupé '+nm(e)+' '+e.scrollWidth+'>'+e.clientWidth);
      if(e.scrollHeight>e.clientHeight+2&&/hidden|clip/.test(cs.overflowY)&&!e.matches('.pt-app,#portail-ov,.pt-body,.pt-side,.pt-card,.pt-login-card,.pt-bar')) out.push('texte coupé (hauteur) '+nm(e));
      const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      if(own&&parseFloat(cs.fontSize)<11) out.push('police < 11px '+nm(e)+' '+cs.fontSize);
      if(touch&&e.matches('input:not([type=file]),select,textarea')&&parseFloat(cs.fontSize)<16) out.push('zoom iOS: champ < 16px '+nm(e)+' '+cs.fontSize);
      if(touch&&e.matches('button,a[href],select,input:not([type=file]),[role=button],label.pt-search')&&(r.height<44||r.width<44)) out.push('cible tactile < 44px '+nm(e)+' '+Math.round(r.width)+'x'+Math.round(r.height));
    });
    // chevauchement de textes
    const txt=all.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
    const zone=e=>e.closest('.pt-bottom')?'b':(e.closest('.pt-top')?'t':'m');
    const R=txt.map(e=>{ const rg=document.createRange(); rg.selectNodeContents(e); return [e,[...rg.getClientRects()]]; });
    for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ const [a,ra]=R[i],[c,rc]=R[j]; if(a.contains(c)||c.contains(a)||zone(a)!==zone(c)) continue;
      let hit=false; ra.forEach(x=>rc.forEach(y=>{ const w=Math.min(x.right,y.right)-Math.max(x.left,y.left), h=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top); if(w>2&&h>2) hit=true; })); if(hit) out.push('chevauchement '+nm(a)+' / '+nm(c)); }
    return out; };
  const REACH=()=>{ const out=[]; const bd=document.querySelector('#portail-ov .pt-body'); if(!bd) return out; bd.scrollTop=1e6; const bot=document.querySelector('#portail-ov .pt-bottom'); const foot=document.querySelector('#portail-ov .pt-panel:not([hidden])'); 
    const limit=(bot&&getComputedStyle(bot).display!=='none')?bot.getBoundingClientRect().top:innerHeight; const last=foot?foot.getBoundingClientRect().bottom:0; if(last>limit+1) out.push('fin de page cachée sous la barre du bas ('+Math.round(last)+'>'+Math.round(limit)+')');
    const top=document.querySelector('#portail-ov .pt-top'); bd.scrollTop=0; return out; };
  for(const [w,h] of VPS){ const p=await page(w,h); const issues=[];
    await p.evaluate(()=>openPortail('')); await p.waitForTimeout(120);
    for(const x of await p.evaluate(CHECK)) issues.push('connexion : '+x);
    await p.evaluate(()=>{ try{ svcPortLogin(); }catch(e){} }); await p.waitForTimeout(120);
    for(const x of await p.evaluate(CHECK)) issues.push('connexion+erreur : '+x);
    for(const sn of Object.keys(STATES)) for(const tab of ['accueil','dossier','docs','envoyer']){
      await space(p,STATES[sn],tab);
      for(const x of await p.evaluate(CHECK)) issues.push(sn+'/'+tab+' : '+x);
      for(const x of await p.evaluate(REACH)) issues.push(sn+'/'+tab+' : '+x); }
    const u=[...new Set(issues)];
    A(u.length===0,w+'×'+h+' : aucun défaut d’affichage (4 rubriques × 4 situations + connexion)',u.slice(0,6).join(' | '));
    await p.context().close(); }

  // ---------- téléphone : parcours au doigt ----------
  const m=await page(390,844);
  let r=await m.evaluate(()=>{ openPortail(''); svcPortLogin(); const e=document.getElementById('port-err'); const i=document.getElementById('port-in-code');
    return {err:e&&e.style.display==='block'&&!!e.textContent.trim(),fs:parseFloat(getComputedStyle(i).fontSize),h:Math.round(i.getBoundingClientRect().height)}; });
  A(r.err&&r.fs>=16&&r.h>=44,'connexion : erreur affichée, champ à 16 px et 44 px de haut',JSON.stringify(r));
  await space(m,STATES.demo,'accueil');
  r=await m.evaluate(()=>{ const ov=document.getElementById('portail-ov'); const bt=[...ov.querySelectorAll('.pt-bottom .pt-btab')];
    return {n:bt.length,lbl:bt.map(x=>x.querySelector('.pt-tl').textContent),bar:getComputedStyle(ov.querySelector('.pt-bottom')).display,side:getComputedStyle(ov.querySelector('.pt-side')).display,
      tags:ov.querySelectorAll('aside,main,header,footer,nav,section,article').length}; });
  A(r.n===4&&r.lbl.join('|')==='Accueil|Avancement|Documents|Envoyer'&&r.bar==='flex'&&r.side==='none','barre du bas : quatre onglets courts, barre latérale masquée',JSON.stringify(r));
  A(r.tags===0,'aucune balise que le logiciel stylise (aside, main…) : le portail ne dépend pas de ses règles',''+r.tags);
  await m.tap('.pt-bottom [data-go="docs"]'); await m.waitForTimeout(120);
  r=await m.evaluate(()=>{ const ov=document.getElementById('portail-ov'); const pan=ov.querySelector('.pt-panel:not([hidden])');
    return {tab:pan&&pan.getAttribute('data-tab'),h1:ov.querySelector('.pt-top-t h1').textContent,sel:ov.querySelector('.pt-bottom [data-go="docs"]').getAttribute('aria-selected'),top:ov.querySelector('.pt-body').scrollTop}; });
  A(r.tab==='docs'&&r.h1==='Mes documents'&&r.sel==='true'&&r.top===0,'toucher « Documents » ouvre la rubrique, en haut de page',JSON.stringify(r));
  await m.fill('#port-q','domiciliation'); await m.waitForTimeout(80);
  r=await m.evaluate(()=>document.querySelectorAll('#portail-ov .port-doc').length);
  A(r===1,'la recherche filtre les documents au doigt',''+r);
  await m.tap('.pt-bottom [data-go="envoyer"]'); await m.waitForTimeout(120);
  r=await m.evaluate(()=>{ const ov=document.getElementById('portail-ov'); const cam=document.getElementById('port-up-cam'); const bt=ov.querySelector('.pt-cam'); const dz=[...ov.querySelectorAll('.pt-drop b')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.textContent);
    return {cap:cam&&cam.getAttribute('capture'),acc:cam&&cam.getAttribute('accept'),vis:bt&&getComputedStyle(bt).display!=='none',dz,st:getComputedStyle(document.getElementById('port-up-status')).display,file:!!document.getElementById('port-up-file')}; });
  A(r.cap==='environment'&&r.acc==='image/*'&&r.vis&&r.file,'au doigt : « Prendre une photo » ouvre l’appareil, le choix de fichiers reste',JSON.stringify(r));
  A(r.dz.join()==='Choisir des fichiers'&&r.st==='none','zone de dépôt dite pour le toucher, aucun blanc tant que rien n’est envoyé',JSON.stringify(r));
  await m.context().close();

  // ---------- ordinateur : barre latérale entière ----------
  const d=await page(1440,900);
  await space(d,STATES.long,'accueil');
  r=await d.evaluate(()=>{ const ov=document.getElementById('portail-ov'); const q=s=>ov.querySelector(s); const vh=innerHeight;
    const out=q('.pt-out').getBoundingClientRect(), side=q('.pt-side').getBoundingClientRect();
    return {bar:getComputedStyle(q('.pt-bottom')).display,cam:getComputedStyle(q('.pt-cam')).display,side:[Math.round(side.left),Math.round(side.height)],outBottom:Math.round(out.bottom),vh,name:q('.pt-me-n').getBoundingClientRect().right<=side.right+0.5}; });
  A(r.bar==='none'&&r.cam==='none'&&r.side[0]===0&&r.side[1]<=r.vh&&r.outBottom<=r.vh&&r.name,'ordinateur : barre latérale en place et entière (nom long, déconnexion visible), pas de barre du bas ni de photo',JSON.stringify(r));
  await d.context().close();

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
