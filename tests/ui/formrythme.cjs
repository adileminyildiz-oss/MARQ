/**
 * Mar'q — Rythme des formulaires (v718)
 *
 * Dans un formulaire, c'est l'espace qui dit quelle étiquette va avec quel
 * champ : il en faut nettement moins DANS un groupe qu'ENTRE deux groupes.
 * Le logiciel faisait presque l'inverse — 7 px entre une étiquette et son
 * champ, 11 px avant l'étiquette suivante. Ce test fige la hiérarchie.
 *
 * Il ne mesure que ce qui est réellement visible : les Paramètres n'affichent
 * qu'un panneau à la fois, et mesurer un élément masqué donne zéro.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const ECRANS=['formulaire','etudemarche','params'];

(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await pg.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  await pg.evaluate(()=>{ window.toast=()=>{}; DB.clients=[]; DB.dossiers=[]; DB.demandes=[]; save(); });
  const poser=async id=>{ await pg.evaluate(i=>{ state.page=i; render(); },id);
    await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await pg.waitForTimeout(400); };

  for(const id of ECRANS){
    await poser(id);
    const m=await pg.evaluate(()=>{
      const CH='input,select,textarea';
      const dedans=[], entre=[]; let nonMarq=0, paires=0;
      document.querySelectorAll('#view .card-b').forEach(cb=>{
        const k=Array.from(cb.children);
        k.forEach((x,i)=>{
          if(x.tagName!=='LABEL') return;
          const s=k[i+1]; if(!(s&&s.matches&&s.matches(CH))) return;
          const rx=x.getBoundingClientRect(), rs=s.getBoundingClientRect();
          if(!rx.height||!rs.height) return;      /* masqué : rien à mesurer */
          paires++;
          if(!x.classList.contains('mq-lab')) nonMarq++;
          dedans.push(Math.round(rs.top-rx.bottom));
          const a=k[i+2];
          if(a&&a.tagName==='LABEL'&&a.getBoundingClientRect().height)
            entre.push(Math.round(a.getBoundingClientRect().top-rs.bottom));
        });
      });
      const moy=t=>t.length?Math.round(t.reduce((s,v)=>s+v,0)/t.length):null;
      return {paires, nonMarq, dedans:moy(dedans), entre:moy(entre),
        maxDedans:Math.max.apply(null,dedans.concat([0])), nEntre:entre.length};
    });
    A(m.paires>0, id+' : des groupes étiquette + champ sont rendus', 'paires='+m.paires);
    A(m.nonMarq===0, id+' : tous les groupes visibles sont pris en charge', m.nonMarq+' oubliés');
    A(m.dedans!==null && m.dedans<=9, id+' : l’étiquette reste collée à son champ ('+m.dedans+' px)');
    if(m.nEntre){
      A(m.entre>=16, id+' : les groupes sont nettement séparés ('+m.entre+' px)');
      A(m.entre >= 2*m.dedans, id+' : séparation au moins double de l’espace interne',
        m.entre+' contre '+m.dedans);
    }
  }

  // ---- les rangées à deux colonnes s'alignent par le haut ----
  await poser('formulaire');
  let r=await pg.evaluate(()=>{
    const f=document.querySelectorAll('#view .frow');
    if(!f.length) return {n:0};
    const al=getComputedStyle(f[0]).alignItems;
    let decales=0, testees=0;
    f.forEach(x=>{
      const e=Array.from(x.children).filter(c=>c.getBoundingClientRect().height);
      if(e.length!==2) return;
      const c1=e[0].querySelector('input,select,textarea'), c2=e[1].querySelector('input,select,textarea');
      if(!c1||!c2) return;
      testees++;
      /* 4 px : en dessous, c'est l'arrondi sous-pixel des hauteurs de ligne,
         invisible sur un champ de 34 px. Un vrai décalage vaut une ligne. */
      if(Math.abs(c1.getBoundingClientRect().top-c2.getBoundingClientRect().top)>4) decales++;
    });
    return {n:f.length, al, decales, testees};
  });
  A(r.al==='start' || r.al==='flex-start','les rangées à deux colonnes s’alignent par le haut',r.al);
  A(r.testees>0 && r.decales===0,'les deux champs d’une rangée sont à la même hauteur',
    r.decales+' décalée(s) sur '+r.testees);

  // ---- une étiquette sur deux lignes ne décale pas le champ d'en face ----
  await pg.setViewportSize({width:1120,height:1000});
  await poser('formulaire');
  r=await pg.evaluate(()=>{
    let decales=0, testees=0, surDeuxLignes=0;
    document.querySelectorAll('#view .frow').forEach(x=>{
      const e=Array.from(x.children).filter(c=>c.getBoundingClientRect().height);
      if(e.length!==2) return;
      const l1=e[0].querySelector('label'), l2=e[1].querySelector('label');
      const c1=e[0].querySelector('input,select,textarea'), c2=e[1].querySelector('input,select,textarea');
      if(!c1||!c2||!l1||!l2) return;
      testees++;
      if(l1.getBoundingClientRect().height>22||l2.getBoundingClientRect().height>22) surDeuxLignes++;
      if(Math.abs(c1.getBoundingClientRect().top-c2.getBoundingClientRect().top)>4) decales++;
    });
    return {decales, testees, surDeuxLignes};
  });
  A(r.testees>0 && r.decales===0,'en fenêtre étroite non plus, rien ne se décale',
    r.decales+' décalée(s) sur '+r.testees+' ('+r.surDeuxLignes+' étiquette(s) sur deux lignes)');
  await pg.setViewportSize({width:1500,height:1000});

  // ---- on ne touche pas aux étiquettes de cases à cocher ----
  r=await pg.evaluate(()=>{
    let enLigne=0, casses=0;
    document.querySelectorAll('#view label').forEach(l=>{
      if(!l.querySelector('input[type="checkbox"],input[type="radio"]')) return;
      enLigne++;
      if(l.classList.contains('mq-lab')) casses++;
    });
    return {enLigne, casses};
  });
  A(r.casses===0,'les étiquettes de cases à cocher gardent leur mise en forme',
    r.casses+' touchée(s) sur '+r.enLigne);

  // ---- rien n'a cassé ----
  r=await pg.evaluate(()=>{ const out={};
    PAGES.forEach(p=>{ try{ state.page=p.id; render(); out[p.id]=1; }catch(e){ out[p.id]='ERREUR '+e.message; } });
    return out; });
  const casses=Object.keys(r).filter(k=>r[k]!==1);
  A(casses.length===0,'les '+Object.keys(r).length+' écrans se rendent encore',casses.join(', '));
  A(errs.length===0,'aucune erreur JavaScript',errs.slice(0,3).join(' | '));

  console.log('  TOTAL '+ok+' ok / '+ko+' ko');
  await b.close();
  process.exit(ko?1:0);
})();
