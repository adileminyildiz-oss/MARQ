/**
 * Mar'q — Boutons de l'écran Formulaire (v720)
 *
 * Quatre défauts mesurés, quatre verrous.
 *
 * 1. La barre d'actions fixe se calait sur la FENÊTRE, pas sur la colonne de
 *    contenu. Deux causes cumulées : fiBarAlign écrivait une mesure en pixels
 *    écran dans une variable relue en pixels CSS (sous html{zoom:1.1} les
 *    212 px de la barre latérale devenaient 233), et « right:0 » passait sous
 *    la barre de défilement. Les boutons d'enregistrement dépassaient de 13 px
 *    le bord des cartes.
 * 2. « Enregistrer le brouillon » existait deux fois, à deux tailles, visibles
 *    en même temps à 150 px d'écart.
 * 3. .fi-nat (Création de société / Modification statutaire) portait un rayon
 *    de 10 px et une graisse de 400 — uniques dans le logiciel — juste sous
 *    .fi-subtab. Le choix principal du formulaire était habillé en champ de
 *    saisie. Il rejoint la famille « choisir parmi » de ui-polish-css.
 * 4. Les fondamentaux qui étaient déjà bons et doivent le rester : tout bouton
 *    porte un nom accessible, aucun ne sort du cadre, un bouton désactivé se
 *    voit et le bandeau dit pourquoi.
 *
 * Le seuil d'alignement est à 1 px : la conversion de zoom laisse un arrondi
 * sous-pixel, rien de plus.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };

(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await pg.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  await pg.evaluate(()=>{ window.toast=()=>{}; DB.clients=[]; DB.dossiers=[]; DB.demandes=[]; save(); });
  const poser=async()=>{ await pg.evaluate(()=>{ state.page='formulaire'; render(); });
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await pg.waitForTimeout(400); };
  await poser();

  /* ---- 1. la barre d'actions est calée sur la colonne de contenu ---- */
  for(const larg of [1500, 1280, 1100]){
    await pg.setViewportSize({width:larg,height:1000});
    await poser();
    const g=await pg.evaluate(()=>{
      const R=s=>{ const e=document.querySelector(s); if(!e) return null;
        const r=e.getBoundingClientRect(); return {l:r.left,r:r.right,h:r.height}; };
      return {wrap:R('.fi-wrap'), dedans:R('.fi-actions-in'), barre:R('.fi-actions'), vue:R('#view')};
    });
    if(!g.wrap||!g.dedans||!g.barre||!g.vue){ A(false, larg+' px : la barre d’actions est rendue'); continue; }
    const dg=Math.abs(g.dedans.l-g.wrap.l), dd=Math.abs(g.dedans.r-g.wrap.r);
    A(dg<=1, larg+' px : les boutons commencent au bord gauche du contenu ('+dg.toFixed(1)+' px)');
    A(dd<=1, larg+' px : les boutons s’arrêtent au bord droit du contenu ('+dd.toFixed(1)+' px)');
    A(Math.abs(g.barre.r-g.vue.r)<=1, larg+' px : la barre ne passe pas sous l’ascenseur',
      'barre '+g.barre.r.toFixed(0)+' contre vue '+g.vue.r.toFixed(0));
  }
  await pg.setViewportSize({width:1500,height:1000}); await poser();

  /* ---- 2. une seule façon d'enregistrer un brouillon ---- */
  {
    const m=await pg.evaluate(()=>{
      const bs=[...document.querySelectorAll('button')]
        .filter(b=>(b.getAttribute('onclick')||'')==='formBrouillon()')
        .filter(b=>b.getBoundingClientRect().height>0);
      return {n:bs.length, lbl:bs.map(b=>b.textContent.trim()),
        carte:/brouillon/i.test(document.querySelector('#view')?.textContent||'')};
    });
    A(m.n===1, 'un seul bouton « brouillon » visible', m.n+' trouvés : '+m.lbl.join(' / '));
    A(m.n===1 && /^Enregistrer le brouillon$/.test(m.lbl[0]||''),
      'il est nommé par un verbe, comme les autres boutons de la barre', m.lbl.join(' / '));
    A(m.carte, 'la carte latérale garde l’information sur le dernier brouillon');
  }

  /* ---- 3. le choix de nature est habillé en bouton, pas en champ ---- */
  {
    const m=await pg.evaluate(()=>{
      const lire=s=>{ const e=document.querySelector(s); if(!e) return null; const c=getComputedStyle(e);
        return {rad:c.borderRadius, fw:c.fontWeight, fs:c.fontSize, h:Math.round(e.getBoundingClientRect().height*10)/10}; };
      const champ=document.querySelector('#view input:not([type=checkbox]):not([type=radio])');
      return {nat:lire('.fi-nat'), sub:lire('.fi-subtab'),
        champRad:champ?getComputedStyle(champ).borderRadius:null,
        nOn:document.querySelectorAll('#view .fi-nat.on').length,
        ombre:(()=>{ const on=document.querySelector('.fi-nat.on'), off=document.querySelector('.fi-nat:not(.on)');
          return {on:on?getComputedStyle(on).boxShadow:'', off:off?getComputedStyle(off).boxShadow:''}; })()};
    });
    A(!!m.nat && !!m.sub, 'les deux barres de choix sont rendues');
    A(m.nat && m.sub && m.nat.rad===m.sub.rad, 'même rayon que la barre d’onglets juste au-dessus',
      m.nat&&m.sub?(m.nat.rad+' contre '+m.sub.rad):'');
    A(m.nat && m.nat.fw==='600', 'la graisse est celle des boutons (600)', m.nat?m.nat.fw:'');
    A(m.nat && m.sub && Math.abs(m.nat.h-m.sub.h)<=1, 'même hauteur que la barre d’onglets',
      m.nat&&m.sub?(m.nat.h+' contre '+m.sub.h):'');
    A(m.nOn===1, 'une seule nature est sélectionnée à la fois', 'nOn='+m.nOn);
    /* Le thème impose le fond noir à tout bouton : la sélection passe par l’ombre. */
    A(m.ombre && m.ombre.on && m.ombre.on!=='none' && m.ombre.on!==m.ombre.off,
      'la nature choisie se distingue de l’autre au premier coup d’œil',
      'choisie « '+(m.ombre?m.ombre.on:'')+' » / autre « '+(m.ombre?m.ombre.off:'')+' »');
  }

  /* ---- 4. les barres de boutons sont centrées, sur les DEUX écrans ---- */
  for(const ecran of ['formulaire','etudemarche']){
    await pg.evaluate(x=>{ state.page=x; render(); }, ecran);
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await pg.waitForTimeout(400);
    const m=await pg.evaluate(()=>{
      const centre=sel=>{ const p=document.querySelector(sel); if(!p) return null;
        const bs=[...p.querySelectorAll('button,.btn')].filter(b=>b.getBoundingClientRect().width>0);
        if(!bs.length) return null;
        const pr=p.getBoundingClientRect();
        const g=Math.min.apply(null,bs.map(b=>b.getBoundingClientRect().left));
        const d=Math.max.apply(null,bs.map(b=>b.getBoundingClientRect().right));
        return {ecart:Math.abs((g+d)/2-(pr.left+pr.right)/2), g:g-pr.left, d:pr.right-d,
          disp:getComputedStyle(p).display}; };
      const pilule=document.querySelector('.fi-subtabs-in');
      const onglets=pilule?[...pilule.querySelectorAll('.fi-subtab')].map(b=>Math.round(b.getBoundingClientRect().width)):[];
      return {barre:centre('.fi-actions-col'), pilule:centre('.fi-subtabs-in'), onglets};
    });
    if(m.barre) A(m.barre.ecart<=1, ecran+' : la barre du bas est centrée ('+m.barre.ecart.toFixed(1)+' px du milieu)',
      'marge G '+m.barre.g.toFixed(0)+' / D '+m.barre.d.toFixed(0));
    A(m.pilule && m.pilule.ecart<=1, ecran+' : la pilule d’onglets est centrée',
      m.pilule?('écart '+m.pilule.ecart.toFixed(1)+' px'):'pilule absente');
    A(m.pilule && m.pilule.disp==='grid', ecran+' : la pilule garde ses deux moitiés (grille)',
      m.pilule?m.pilule.disp:'');
    A(m.onglets.length===2 && Math.abs(m.onglets[0]-m.onglets[1])<=1,
      ecran+' : les deux onglets font la même largeur', m.onglets.join(' / '));
  }
  await pg.evaluate(()=>{ state.page='formulaire'; render(); });
  await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await pg.waitForTimeout(400);

  /* ---- 5. ce qui était déjà bon doit le rester ---- */
  {
    const m=await pg.evaluate(()=>{
      const vis=e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; };
      const bs=[...document.querySelectorAll('#view button, #view .btn')].filter(vis);
      const nom=b=>(b.textContent||'').trim()||b.getAttribute('aria-label')||b.getAttribute('title')||
        (b.querySelector('svg,img')?'icône':'');
      const sansNom=bs.filter(b=>!nom(b)).map(b=>b.className);
      const hors=bs.filter(b=>{ const r=b.getBoundingClientRect(); return r.left<-1||r.right>innerWidth+1; }).map(b=>nom(b));
      const eteints=bs.filter(b=>b.disabled||b.classList.contains('is-disabled'));
      const eteintsVus=eteints.filter(b=>{ const c=getComputedStyle(b);
        return parseFloat(c.opacity)<0.8 || c.cursor==='not-allowed'; });
      const hauteurs={}, rayons={};
      bs.forEach(b=>{ const r=b.getBoundingClientRect(), c=getComputedStyle(b);
        hauteurs[Math.round(r.height*10)/10]=1; rayons[c.borderRadius]=1; });
      const gate=document.querySelector('#fi-gate');
      return {n:bs.length, sansNom, hors, nEteints:eteints.length, nEteintsVus:eteintsVus.length,
        hauteurs:Object.keys(hauteurs).length, rayons:Object.keys(rayons).length,
        gateTxt:(gate&&gate.textContent||'').trim().slice(0,90),
        listeH:Object.keys(hauteurs).sort((a,b)=>a-b), listeR:Object.keys(rayons)};
    });
    A(m.n>=25, 'les boutons de l’écran sont rendus ('+m.n+')');
    A(m.sansNom.length===0, 'chaque bouton porte un nom lisible ou une icône', m.sansNom.join(', '));
    A(m.hors.length===0, 'aucun bouton ne sort du cadre', m.hors.join(', '));
    A(m.nEteints>0 && m.nEteints===m.nEteintsVus, 'un bouton désactivé se voit désactivé',
      m.nEteintsVus+'/'+m.nEteints);
    A(/compl[ée]ter|complet/i.test(m.gateTxt), 'le bandeau dit ce qui manque avant de pouvoir générer', m.gateTxt);
    /* Un escalier de tailles, pas un désordre : .btn, .btn-sm, la barre de
       choix, et deux pastilles d'icône (chevron de repli, menu « ⋮ »). */
    A(m.hauteurs<=5, 'les hauteurs restent un escalier lisible ('+m.hauteurs+')', m.listeH.join(' / '));
    A(m.rayons<=3, 'les rayons restent un jeu restreint ('+m.rayons+')', m.listeR.join(' / '));
  }

  A(errs.length===0, 'aucune erreur JavaScript', errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
