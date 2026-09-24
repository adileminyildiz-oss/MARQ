/**
 * Mar'q — Espace client : aucun défaut d'affichage, du petit téléphone à l'ordinateur (v734)
 *
 * L'espace client a été refait à l'image du logiciel (barre latérale, quatre
 * rubriques ; sur téléphone, la barre latérale s'ouvre en tiroir par le
 * bouton menu, v735). Ce test en fige la qualité :
 * sur sept formats (320 px à la tablette, téléphone à l'horizontale compris)
 * et quatre situations (dossier normal, espace vide, mode local, noms et
 * listes démesurés), il ne tolère ni débordement, ni texte coupé ou
 * superposé, menu ouvert compris, ni cible tactile de moins de 44 px, ni champ sous 16 px (zoom
 * forcé sur iPhone), ni police sous 11 px, ni fin de page cachée sous la
 * barre du bas. Il vérifie aussi que le menu s'ouvre et se referme (choix,
 * voile, Échap), que les rubriques s'enchaînent, que la
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
    const zone=e=>e.closest('.pt-bottom')?'b':(e.closest('.pt-top')?'t':(e.closest('.pt-side')?'s':'m'));
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
      for(const x of await p.evaluate(REACH)) issues.push(sn+'/'+tab+' : '+x);
      if(w<=760&&tab==='accueil'){ await p.evaluate(()=>portV2Nav(true)); await p.waitForTimeout(320);
        for(const x of await p.evaluate(CHECK)) issues.push(sn+'/menu ouvert : '+x);
        await p.evaluate(()=>portV2Nav(false)); await p.waitForTimeout(320); } }
    const u=[...new Set(issues)];
    A(u.length===0,w+'×'+h+' : aucun défaut d’affichage (4 rubriques × 4 situations, menu ouvert, connexion)',u.slice(0,6).join(' | '));
    await p.context().close(); }

  // ---------- téléphone : parcours au doigt ----------
  const m=await page(390,844);
  let r=await m.evaluate(()=>{ openPortail(''); svcPortLogin(); const e=document.getElementById('port-err'); const i=document.getElementById('port-in-code');
    return {err:e&&e.style.display==='block'&&!!e.textContent.trim(),fs:parseFloat(getComputedStyle(i).fontSize),h:Math.round(i.getBoundingClientRect().height)}; });
  A(r.err&&r.fs>=16&&r.h>=44,'connexion : erreur affichée, champ à 16 px et 44 px de haut',JSON.stringify(r));
  await space(m,STATES.demo,'accueil');
  const vueTiroir=()=>m.evaluate(()=>{ const ov=document.getElementById('portail-ov'); const sd=ov.querySelector('.pt-side'); const r=sd.getBoundingClientRect(); const mb=ov.querySelector('.pt-menu'); const pan=ov.querySelector('.pt-panel:not([hidden])');
    return {open:ov.classList.contains('pt-nav-open'),vis:getComputedStyle(sd).visibility,left:Math.round(r.left),right:Math.round(r.right),vw:innerWidth,exp:mb.getAttribute('aria-expanded'),modal:sd.getAttribute('aria-modal'),foc:document.activeElement===sd,tab:pan&&pan.getAttribute('data-tab'),h1:ov.querySelector('.pt-top-t h1').textContent}; });
  r=await m.evaluate(()=>{ const ov=document.getElementById('portail-ov'); const mb=ov.querySelector('.pt-menu'); const b=mb.getBoundingClientRect();
    return {menu:getComputedStyle(mb).display,w:Math.round(b.width),h:Math.round(b.height),dot:!!mb.querySelector('.pt-menu-dot'),bas:ov.querySelectorAll('.pt-bottom').length,tabs:ov.querySelectorAll('.pt-side .pt-tab').length,
      tags:ov.querySelectorAll('aside,main,header,footer,nav,section,article').length}; });
  let t0=await vueTiroir();
  A(r.menu==='flex'&&r.w>=44&&r.h>=44&&r.dot&&r.bas===0&&r.tabs===4&&!t0.open&&t0.vis==='hidden'&&t0.right<=0,'téléphone : bouton menu (44 px, pastille des nouveautés), barre latérale rangée hors de l’écran, plus de barre du bas',JSON.stringify([r,t0]));
  A(r.tags===0,'aucune balise que le logiciel stylise (aside, main…) : le portail ne dépend pas de ses règles',''+r.tags);
  await m.tap('.pt-menu'); await m.waitForTimeout(350); t0=await vueTiroir();
  A(t0.open&&t0.vis==='visible'&&t0.left===0&&t0.right<t0.vw&&t0.exp==='true'&&t0.modal==='true'&&t0.foc,'toucher le menu ouvre la barre latérale depuis la gauche, entière, le focus y passe',JSON.stringify(t0));
  await m.tap('.pt-side [data-go="docs"]'); await m.waitForTimeout(350); t0=await vueTiroir();
  A(!t0.open&&t0.vis==='hidden'&&t0.tab==='docs'&&t0.h1==='Mes documents'&&t0.exp==='false'&&t0.modal===null,'choisir « Mes documents » ouvre la rubrique et referme le menu',JSON.stringify(t0));
  await m.tap('.pt-menu'); await m.waitForTimeout(350); await m.mouse.click(t0.vw-20,400); await m.waitForTimeout(350); let t1=await vueTiroir();
  await m.tap('.pt-menu'); await m.waitForTimeout(350); await m.keyboard.press('Escape'); await m.waitForTimeout(350); let t2=await vueTiroir();
  A(!t1.open&&!t2.open&&t1.tab==='docs','le voile et la touche Échap referment le menu sans changer de rubrique',JSON.stringify([t1.open,t2.open,t1.tab]));
  await m.fill('#port-q','domiciliation'); await m.waitForTimeout(80);
  r=await m.evaluate(()=>document.querySelectorAll('#portail-ov .port-doc').length);
  A(r===1,'la recherche filtre les documents au doigt',''+r);
  await m.tap('.pt-menu'); await m.waitForTimeout(350); await m.tap('.pt-side [data-go="envoyer"]'); await m.waitForTimeout(350);
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
    return {bar:ov.querySelectorAll('.pt-bottom').length?'x':getComputedStyle(q('.pt-menu')).display,cam:getComputedStyle(q('.pt-cam')).display,side:[Math.round(side.left),Math.round(side.height)],outBottom:Math.round(out.bottom),vh,name:q('.pt-me-n').getBoundingClientRect().right<=side.right+0.5}; });
  A(r.bar==='none'&&r.cam==='none'&&r.side[0]===0&&r.side[1]<=r.vh&&r.outBottom<=r.vh&&r.name,'ordinateur : barre latérale en place et entière (nom long, déconnexion visible), ni bouton menu ni photo',JSON.stringify(r));
  await d.context().close();

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
