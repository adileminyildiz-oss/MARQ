const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1080}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForFunction(() => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'), { timeout: 20000 });

  // file d'envoi : quatre boutons par ligne
  await pg.evaluate(()=>{
    DB.parametres.fileEnvoi={items:[1,2,3].map(i=>({id:'k'+i,ts:Date.now(),to:'c'+i+'@x.fr',
      sujet:'Objet '+i,corps:'Bonjour',canal:'email',mod:'Clients',fait:false})),journal:[]};
    try{ go('cockpit'); }catch(e){}
  });
  await pg.waitForTimeout(1200);

  // regroupement effectif
  const g=await pg.evaluate(()=>{
    const rows=[...document.querySelectorAll('#view .fe-a')];
    return {n:rows.length,
      dots:rows.filter(r=>r.querySelector('.kb-dots')).length,
      visibles:rows.map(r=>[...r.children].filter(c=>c.tagName==='BUTTON'&&c.offsetParent!==null).length),
      caches:rows.map(r=>r.querySelectorAll('.kb-cache button').length),
      marque:rows.map(r=>r.getAttribute('data-kb'))}; });
  A(g.n===3,'trois lignes de file d\'envoi rendues');
  A(g.dots===3,'chaque ligne reçoit un bouton à trois points');
  A(g.visibles.every(x=>x===1),'un seul bouton visible par ligne au lieu de quatre');
  A(g.caches.every(x=>x===4),'les quatre boutons d\'origine sont conservés, masqués');
  A(g.marque.every(x=>x==='1'),'les lignes traitées sont marquées');

  // Prévoyance : dès deux actions, les points prennent le relais
  const pv=await pg.evaluate(()=>{ const rows=[...document.querySelectorAll('#view .pv-act')];
    return {n:rows.length, dots:rows.filter(r=>r.querySelector('.kb-dots')).length,
      seuil:(DB.parametres.actionsGroupees||{}).seuil,
      btns:rows.map(r=>[...r.children].filter(c=>c.tagName==='BUTTON'&&c.offsetParent!==null).length)}; });
  A(pv.seuil===2,'les points prennent le relais dès deux actions');
  A(pv.n>=2&&pv.dots===pv.n&&pv.btns.every(x=>x===1),
    'les lignes de la Prévoyance sont regroupées aussi ('+pv.n+')');

  // ouverture du menu
  await pg.click('#view .fe-a .kb-dots'); await pg.waitForTimeout(250);
  const m=await pg.evaluate(()=>{ const m=document.getElementById('kb-menu'); if(!m) return null;
    const r=m.getBoundingClientRect();
    return {n:m.querySelectorAll('.kb-it').length,
      lbl:[...m.querySelectorAll('.kb-it')].map(x=>x.textContent),
      danger:[...m.querySelectorAll('.kb-danger')].map(x=>x.textContent),
      pos:getComputedStyle(m).position, dansEcran:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,
      exp:document.querySelector('#view .fe-a .kb-dots').getAttribute('aria-expanded')}; });
  A(m&&m.n===4,'le menu propose les quatre choix');
  A(m.lbl.join('|')==='Ouvrir|Copier|Envoyé|Retirer','les libellés d\'origine sont repris');
  A(m.danger.join('|')==='Retirer','l\'action destructrice est distinguée');
  A(m.pos==='fixed'&&m.dansEcran,'le menu est recadré dans l\'écran');
  A(m.exp==='true','le bouton indique que le menu est ouvert');

  // l'action fonctionne réellement
  const act=await pg.evaluate(()=>{ window.__cop=null; const _c=window.fileEnvoiCopier;
    window.fileEnvoiCopier=function(id){ window.__cop=id; };
    const it=[...document.querySelectorAll('#kb-menu .kb-it')].find(x=>/Copier/.test(x.textContent));
    it.click(); window.fileEnvoiCopier=_c;
    return {id:window.__cop, ferme:!document.getElementById('kb-menu')}; });
  A(/^k[123]$/.test(act.id||''),'le choix déclenche bien l\'action du bouton d\'origine');
  A(act.ferme,'le menu se referme après le choix');

  // fermeture au clic extérieur et à Échap
  await pg.click('#view .fe-a .kb-dots'); await pg.waitForTimeout(200);
  await pg.mouse.click(900,20); await pg.waitForTimeout(200);
  const ext=await pg.evaluate(()=>!document.getElementById('kb-menu'));
  A(ext,'un clic à l\'extérieur referme le menu');
  await pg.click('#view .fe-a .kb-dots'); await pg.waitForTimeout(200);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  const esc=await pg.evaluate(()=>({ferme:!document.getElementById('kb-menu'),
    focus:document.activeElement&&document.activeElement.classList.contains('kb-dots')}));
  A(esc.ferme,'la touche Échap referme le menu');
  A(esc.focus,'le curseur revient sur le bouton');

  // clavier : flèches
  await pg.click('#view .fe-a .kb-dots'); await pg.waitForTimeout(250);
  const kb=await pg.evaluate(()=>document.activeElement&&document.activeElement.textContent);
  A(kb==='Ouvrir','le premier choix reçoit le curseur à l\'ouverture');
  await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(120);
  const kb2=await pg.evaluate(()=>document.activeElement&&document.activeElement.textContent);
  A(kb2==='Copier','la flèche du bas descend dans la liste');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);

  // un second menu remplace le premier
  const deux=await pg.evaluate(()=>{ const d=[...document.querySelectorAll('#view .fe-a .kb-dots')];
    d[0].click(); d[1].click(); return document.querySelectorAll('#kb-menu').length; });
  A(deux===1,'un seul menu ouvert à la fois');
  await pg.keyboard.press('Escape');

  // les sélecteurs de choix ne sont pas touchés
  const ex=await pg.evaluate(async()=>{ try{ go('editions'); }catch(e){}
    await new Promise(r=>setTimeout(r,900));
    const vs=[...document.querySelectorAll('#view .ed2-pc-vs')];
    return {n:vs.length, dots:vs.filter(x=>x.querySelector('.kb-dots')).length,
      btn:vs.length?[...vs[0].children].filter(c=>c.tagName==='BUTTON'&&c.offsetParent!==null).length:0}; });
  A(ex.n>=2,'les sélecteurs de forme juridique sont présents');
  A(ex.dots===0,'un sélecteur de choix n\'est jamais regroupé');
  A(ex.btn>=3,'ses boutons restent tous visibles');

  // en-tête de carte : jamais regroupé
  const hd=await pg.evaluate(()=>{
    const h=[...document.querySelectorAll('#view .card-h')].filter(x=>[...x.children].filter(c=>c.tagName==='BUTTON').length>=3);
    return h.filter(x=>x.querySelector('.kb-dots')).length; });
  A(hd===0,'les en-têtes de carte ne sont pas regroupés');

  // seuil réglable
  const seuil=await pg.evaluate(async()=>{ window.kbSet('seuil',2);
    try{ go('cockpit'); }catch(e){} await new Promise(r=>setTimeout(r,900));
    const a=[...document.querySelectorAll('#view .cxc-act')].filter(x=>x.querySelector('.kb-dots')).length;
    window.kbSet('seuil',3); try{ go('cockpit'); }catch(e){} await new Promise(r=>setTimeout(r,900));
    const b2=[...document.querySelectorAll('#view .cxc-act')].filter(x=>x.querySelector('.kb-dots')).length;
    return {deux:a,trois:b2}; });
  A(seuil.deux>0,'seuil à deux : les paires de boutons sont regroupées aussi');
  A(seuil.trois===0,'seuil à trois : les paires restent affichées');

  // arrêt complet
  const off=await pg.evaluate(async()=>{ window.kbSet('actif',false);
    try{ go('cockpit'); }catch(e){} await new Promise(r=>setTimeout(r,900));
    const n=document.querySelectorAll('#view .kb-dots').length;
    const v=[...document.querySelectorAll('#view .fe-a')].map(r=>[...r.children].filter(c=>c.tagName==='BUTTON'&&c.offsetParent!==null).length);
    window.kbSet('actif',true); return {n:n,v:v}; });
  A(off.n===0,'réglage décoché : plus aucun bouton à trois points');
  A(off.v.every(x=>x===4),'les boutons d\'origine reviennent tous');

  // carte de réglage
  const cd=await pg.evaluate(()=>{ const h=window.pageParams();
    return {ok:/kb-card/.test(h), t:/Actions groupées/.test(h), s:/kbSet\('seuil'/.test(h),
      ex:/forme juridique/.test(h)}; });
  A(cd.ok&&cd.t,'carte de réglage présente dans les Paramètres');
  A(cd.s,'le seuil est réglable');
  A(cd.ex,'les exclusions sont dites explicitement');

  // idempotence
  const idem=await pg.evaluate(async()=>{ try{ go('cockpit'); }catch(e){}
    await new Promise(r=>setTimeout(r,900));
    window.kbBalayer(); window.kbBalayer();
    const r=[...document.querySelectorAll('#view .fe-a')];
    return {dots:r.map(x=>x.querySelectorAll('.kb-dots').length),
      caches:r.map(x=>x.querySelectorAll('.kb-cache').length)}; });
  A(idem.dots.every(x=>x===1)&&idem.caches.every(x=>x===1),'plusieurs balayages n\'empilent pas les boutons');

  // apparence demandée : points horizontaux, fins, sans cadre, cible réduite
  await pg.evaluate(()=>{ try{ go('cockpit'); }catch(e){} }); await pg.waitForTimeout(900);
  await pg.hover('#view .fe-a'); await pg.waitForTimeout(250);
  const look=await pg.evaluate(async()=>{
    const d=document.querySelector('#view .fe-a .kb-dots'); if(!d) return null;
    const cs=getComputedStyle(d); const r=d.getBoundingClientRect();
    const pts=[...d.querySelectorAll('.kb-d')].map(x=>{const q=x.getBoundingClientRect();return {x:q.left,y:q.top,w:q.width};});
    d.click(); await new Promise(r2=>setTimeout(r2,200));
    const its=[...document.querySelectorAll('#kb-menu .kb-it')];
    const it=its.find(x=>x!==document.activeElement)||its[0]; const ics=getComputedStyle(it);
    const dg=document.querySelector('#kb-menu .kb-danger'); const dcs=dg?getComputedStyle(dg):null;
    const m=getComputedStyle(document.getElementById('kb-menu'));
    /* les styles calculés sont vivants : on les fige avant de refermer */
    const out={larg:r.width,haut:r.height,
      fond:cs.backgroundColor, bord:cs.borderTopWidth, ombre:cs.boxShadow,
      pt:pts[0].w, memeX:pts.every(p2=>Math.abs(p2.x-pts[0].x)<0.6), croissant:pts[2].y>pts[1].y&&pts[1].y>pts[0].y,
      itFond:''+ics.backgroundColor, itBord:''+ics.borderTopWidth, itOmbre:''+ics.boxShadow,
      rouge:dcs?(''+dcs.color):'', menuBord:''+m.borderTopWidth};
    document.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    return out; });
  A(look&&look.memeX&&look.croissant,'les trois points sont alignés verticalement');
  A(look.pt<=2.5,'les points sont fins ('+look.pt.toFixed(1)+' px)');
  A(/rgba\(0, 0, 0, 0\)|transparent/.test(look.fond),'le bouton n\'a aucun fond');
  A(look.bord==='0px'&&look.ombre==='none','le bouton n\'a aucun bord ni relief');
  A(look.larg<=16&&look.haut<=30,'la zone visible est réduite ('+Math.round(look.larg)+'×'+Math.round(look.haut)+' px)');
  A(/rgba\(0, 0, 0, 0\)|transparent/.test(look.itFond)&&look.itBord==='0px'&&look.itOmbre==='none',
    'les choix de la liste n\'ont ni cadre ni fond propre');
  A(look.menuBord==='0px','le panneau du menu n\'a pas de bord visible');
  A(/rgb\(232, 144, 122\)/.test(look.rouge||''),'le choix destructeur reste en rouge');

  // visibles seulement quand le pointeur vise la ligne
  await pg.evaluate(()=>{ try{ go('cockpit'); }catch(e){} }); await pg.waitForTimeout(900);
  await pg.mouse.move(20,20); await pg.waitForTimeout(250);
  const repos=await pg.evaluate(()=>{ const d=document.querySelector('#view .fe-a .kb-dots');
    const r=d.closest('.kb-host');
    return {op:getComputedStyle(d).opacity, hote:!!r, cls:r?r.className.split(' ')[0]:''}; });
  A(repos.hote,'la ligne qui porte les actions est repérée comme zone de survol ('+repos.cls+')');
  A(parseFloat(repos.op)===0,'au repos, les points sont invisibles');
  const place=await pg.evaluate(()=>{ const d=document.querySelector('#view .fe-a .kb-dots');
    const r=d.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}; });
  A(place.w>0&&place.h>0,'ils gardent leur place : la ligne ne bouge pas au survol');
  await pg.hover('#view .fe-a'); await pg.waitForTimeout(250);
  const surv=await pg.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#view .fe-a .kb-dots')).opacity));
  A(surv>0,'au survol de la ligne, les points apparaissent ('+surv+')');
  const clav=await pg.evaluate(async()=>{ document.querySelector('#view .fe-a .kb-dots').focus();
    await new Promise(r=>setTimeout(r,200));
    const o=parseFloat(getComputedStyle(document.querySelector('#view .fe-a .kb-dots')).opacity);
    document.activeElement.blur(); return o; });
  A(clav>0,'au clavier, les points apparaissent aussi');
  const ouv=await pg.evaluate(async()=>{ await pg.__x; return 0; }).catch(()=>0);
  await pg.mouse.move(20,20); await pg.waitForTimeout(200);
  await pg.evaluate(()=>{ document.querySelector('#view .fe-a .kb-dots').click(); });
  await pg.waitForTimeout(250);
  const ouvert=await pg.evaluate(()=>{ const d=document.querySelector('#view .fe-a .kb-dots');
    const o=parseFloat(getComputedStyle(d).opacity); document.dispatchEvent(new MouseEvent('click',{bubbles:true})); return o; });
  A(ouvert>0,'menu ouvert, le pointeur ailleurs : les points restent visibles');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
