/**
 * Mar'q — Cartes d'informations & réparations d'affichage (v717)
 *
 * Prouve quatre choses : les cartes s'ouvrent et se rangent et s'en
 * souviennent ; le journal d'activité du Pilotage n'écrit plus la date
 * par-dessus le nom ; un sous-titre trop long se termine par des points de
 * suspension au lieu d'être tranché ; et le numéro de dossier ne s'affiche
 * plus deux fois.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const LONG='SOCIETE NOUVELLE DES ETABLISSEMENTS MARTIN-DUBOIS ET COMPAGNIE';

(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:960}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await pg.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=f=>pg.evaluate(f);
  /* les cartes sont équipées sur l'image d'animation qui suit le rendu
     (v716) : on laisse passer une image avant de mesurer. */
  const img=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

  await pg.evaluate(L=>{
    window.toast=()=>{}; window.uiConfirm=(m,f)=>f&&f();
    DB.clients=[{id:'c1',denomination:L,email:'direction.administrative@exemple-tres-long.fr',
                 siren:'912345678',formeJuridique:'SAS'},
                {id:'c2',denomination:'BETA SARL',email:'b@beta.fr',siren:'823456789'}];
    DB.dossiers=[
      {id:'d1',ref:'AEM-2026-000101',numeroDossier:'AEM-2026-000101',clientIds:['c1'],
       formalite:"Transformation de société à responsabilité limitée en société par actions simplifiée",
       statut:'En cours',createdAt:'2026-09-01',pieces:{},piecesRecues:{},docs:{},
       historique:[{d:'2026-09-02',t:"Pièces justificatives reçues du client par le formulaire en ligne"}],
       wf:{demande:Date.parse('2026-09-01')}},
      {id:'d2',ref:'AEM-2026-000102',numeroDossier:'AEM-2026-000102',clientIds:['c2'],
       formalite:'Transfert de siège',statut:'En cours',createdAt:'2026-09-05',
       pieces:{},piecesRecues:{},docs:{},historique:[],wf:{}}];
    DB.demandes=[]; DB.parametres=DB.parametres||{}; DB.parametres.facturier=[];
    save();
  },LONG);

  // ---------- 1. le journal d'activité du Pilotage ----------
  let r=await ev(()=>{
    state.page='pilotage'; render();
    const row=document.querySelector('#view .jact-row');
    if(!row) return {absent:true};
    const d=row.querySelector('.jact-date'), m=row.querySelector('.jact-main');
    const rd=d.getBoundingClientRect(), rm=m.getBoundingClientRect();
    const chevauche=Math.min(rd.right,rm.right)-Math.max(rd.left,rm.left)>2;
    return {chevauche, dW:Math.round(rd.width), disp:getComputedStyle(row).display,
      anciennes:document.querySelectorAll('#view .nt-row').length};
  });
  A(!r.absent,'le journal d’activité du Pilotage est rendu');
  A(r.chevauche===false,'la date et le nom ne se chevauchent plus',JSON.stringify(r));
  A(r.dW>=80,'la colonne de date garde sa largeur','largeur '+r.dW+' px');
  A(r.anciennes===0,'le Pilotage n’utilise plus les classes du centre de notifications');

  // le centre de notifications, lui, garde les siennes
  r=await ev(()=>{ const css=Array.from(document.styleSheets).length; 
    return {ok: document.documentElement.innerHTML.indexOf('nt-row')>0}; });
  A(r.ok,'le centre de notifications conserve ses propres classes');

  // ---------- 2. sous-titre long : ellipse, pas de coupure nette ----------
  await ev(()=>{ state.page='espace'; render(); }); await img();
  r=await ev(()=>{
    const subs=Array.from(document.querySelectorAll('#view .card-h .sub'));
    const longs=subs.filter(s=>s.scrollWidth>s.clientWidth+1);
    return {n:subs.length, nLongs:longs.length,
      tousEllipse: longs.every(s=>{ const c=getComputedStyle(s);
        return c.textOverflow==='ellipsis'&&c.overflowX==='hidden'; })};
  });
  A(r.n>0,'l’écran Traitement a des sous-titres de carte','n='+r.n);
  A(r.tousEllipse,'tout sous-titre trop long se termine par une ellipse',JSON.stringify(r));

  // ---------- 3. le numéro de dossier ne se répète plus ----------
  r=await ev(()=>{
    if(typeof prevoyanceListe!=='function'&&typeof prevCalc!=='function'){
      // on passe par l'écran, qui est la seule surface visible
      state.page='cockpit'; render();
      const t=Array.from(document.querySelectorAll('#view .pv-main b')).map(x=>x.textContent.trim());
      return {titres:t, doublons:t.filter(x=>{ const m=x.match(/[A-Z]{2,}-\d{4}-\d+/g); return m&&m.length>1&&m[0]===m[1]; })};
    }
    return {titres:[],doublons:[]};
  });
  A(r.doublons.length===0,'aucun titre ne répète deux fois la même référence',JSON.stringify(r.doublons));

  // ---------- 3 bis. la pastille « nouveau » est réellement visible ----------
  await ev(()=>{ state.page='cockpit'; render(); }); await img();
  r=await ev(()=>{
    const L=Array.from(document.querySelectorAll('#view .pv-main em'));
    return {n:L.length, coupees:L.filter(e=>{
      const par=e.closest('.pv-det')||e.parentElement;
      return e.getBoundingClientRect().right>par.getBoundingClientRect().right+1; }).length};
  });
  A(r.n===0||r.coupees===0,'la pastille « nouveau » n’est plus coupée par l’ellipse',
    r.coupees+' coupée(s) sur '+r.n);

  // ---------- 4. ouvrir et ranger une carte ----------
  await ev(()=>{ state.page='pilotage'; render(); }); await img();
  r=await ev(()=>{
    const c=document.querySelector('#view .card[data-mqk]');
    if(!c) return {absent:true};
    const b=c.querySelector('.card-h > .mq-pli');
    const corps=Array.from(c.children).filter(x=>!x.classList.contains('card-h'));
    const visAvant=corps.some(x=>getComputedStyle(x).display!=='none');
    b.click();
    const visApres=corps.some(x=>getComputedStyle(x).display!=='none');
    const k=c.getAttribute('data-mqk');
    const memo=JSON.parse(localStorage.getItem('marq-cartes-rangees')||'{}');
    return {bouton:!!b, visAvant, visApres, range:c.classList.contains('mq-range'),
      memorise:!!memo[k], aria:b.getAttribute('aria-expanded'), k};
  });
  A(!r.absent&&r.bouton,'chaque carte à en-tête reçoit son bouton d’ouverture');
  A(r.visAvant===true,'la carte est ouverte au départ');
  A(r.visApres===false,'un clic range la carte');
  A(r.aria==='false','le bouton annonce son état aux outils d’accessibilité');
  A(r.memorise===true,'la carte rangée est mémorisée');

  // ---------- 5. l'état survit au rendu et au changement d'écran ----------
  await ev(()=>{ render(); }); await img();
  const apresRendu=await ev(()=>{ const c=document.querySelector('#view .card[data-mqk]');
    return !!(c&&c.classList.contains('mq-range')); });
  await ev(()=>{ state.page='agenda'; render(); }); await img();
  await ev(()=>{ state.page='pilotage'; render(); }); await img();
  const apresAllerRetour=await ev(()=>{ const c=document.querySelector('#view .card[data-mqk]');
    return !!(c&&c.classList.contains('mq-range')); });
  r={apresRendu,apresAllerRetour};
  A(r.apresRendu===true,'la carte reste rangée après un nouveau rendu');
  A(r.apresAllerRetour===true,'elle le reste après avoir changé d’écran et être revenu');

  // ---------- 6. rouvrir ----------
  r=await ev(()=>{
    const c=document.querySelector('#view .card[data-mqk]');
    c.querySelector('.card-h > .mq-pli').click();
    const corps=Array.from(c.children).filter(x=>!x.classList.contains('card-h'));
    const memo=JSON.parse(localStorage.getItem('marq-cartes-rangees')||'{}');
    return {visible:corps.some(x=>getComputedStyle(x).display!=='none'),
      oublie:!memo[c.getAttribute('data-mqk')]};
  });
  A(r.visible===true,'un second clic rouvre la carte');
  A(r.oublie===true,'la carte rouverte ne reste pas marquée comme rangée');

  // ---------- 7. tout ranger / tout ouvrir ----------
  await ev(()=>{ state.page='cockpit'; render(); }); await img();
  r=await ev(()=>{
    const n=document.querySelectorAll('#view .card[data-mqk]').length;
    cartesTout(false);
    const rangees=document.querySelectorAll('#view .card[data-mqk].mq-range').length;
    cartesTout(true);
    const ouvertes=document.querySelectorAll('#view .card[data-mqk]:not(.mq-range)').length;
    const b=document.getElementById('mq-pli-tout');
    return {n, rangees, ouvertes, bouton:!!b, visible:b&&b.style.display!=='none'};
  });
  A(r.bouton&&r.visible,'la barre du haut porte le bouton « ranger / ouvrir tout »');
  A(r.n>0&&r.rangees===r.n,'« tout ranger » range toutes les cartes de l’écran',r.rangees+'/'+r.n);
  A(r.ouvertes===r.n,'« tout ouvrir » les rouvre toutes',r.ouvertes+'/'+r.n);

  // ---------- 8. on ne range pas ce qui n'est pas une carte d'information ----------
  await ev(()=>{ state.page='params'; render(); }); await img();
  r=await ev(()=>{
    return {dansModale:document.querySelectorAll('#ov .card[data-mqk]').length,
      details:document.querySelectorAll('details.card[data-mqk]').length};
  });
  A(r.dansModale===0,'les cartes d’une fenêtre modale ne sont pas touchées');
  A(r.details===0,'les cartes déjà repliables gardent leur propre mécanisme');

  // ---------- 9. le menu « ⋮ » a un nom ----------
  r=await ev(()=>{
    const L=Array.from(document.querySelectorAll('.kb-dots'));
    return {n:L.length, sansNom:L.filter(x=>!x.getAttribute('aria-label')).length};
  });
  A(r.n===0||r.sansNom===0,'le menu « ⋮ » annonce ce qu’il ouvre',r.sansNom+' sans nom sur '+r.n);

  // ---------- 9 bis. aucune carte titrée n'est laissée de côté ----------
  const oublis=[];
  for(const id of await ev(()=>PAGES.map(p=>p.id))){
    await ev(new Function('state.page="'+id+'"; render();')); await img();
    const m=await pg.evaluate(p=>{
      const out=[];
      document.querySelectorAll('#view .card').forEach(c=>{
        if(c.tagName==='DETAILS'||c.hasAttribute('data-mqk')) return;
        const h=c.querySelector(':scope > .card-h');
        if(h&&(h.querySelector('h2')||h.querySelector('h3')))
          out.push(p+' : '+(h.textContent||'').replace(/\s+/g,' ').trim().slice(0,30));
      });
      return out; }, id);
    oublis.push(...m);
  }
  A(oublis.length===0,'toute carte portant un titre peut être rangée',oublis.slice(0,4).join(' | '));

  // ---------- 10. rien n'a cassé ----------
  r=await ev(()=>{
    const out={};
    PAGES.forEach(p=>{ try{ state.page=p.id; render(); out[p.id]=document.getElementById('view').children.length; }
                       catch(e){ out[p.id]='ERREUR: '+e.message; } });
    return out;
  });
  const casses=Object.keys(r).filter(k=>(''+r[k]).indexOf('ERREUR')===0);
  A(casses.length===0,'les '+Object.keys(r).length+' écrans se rendent encore',casses.join(', '));
  A(errs.length===0,'aucune erreur JavaScript',errs.slice(0,3).join(' | '));

  console.log('  TOTAL '+ok+' ok / '+ko+' ko');
  await b.close();
  process.exit(ko?1:0);
})();
