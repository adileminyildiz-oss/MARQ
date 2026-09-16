const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1080}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(3400);

  /* base neuve */
  const neuf=await pg.evaluate(()=>{ delete DB.parametres.actionsGroupees;
    window.kbSet('actif',true); return DB.parametres.actionsGroupees; });
  A(neuf.seuil===2,'une base neuve regroupe dès deux actions');

  /* base réglée sur l'ancien seuil : reprise unique */
  const rep=await pg.evaluate(()=>{ DB.parametres.actionsGroupees={actif:true,seuil:3,__s4:1};
    window.kbSet('actif',true); return DB.parametres.actionsGroupees; });
  A(rep.seuil===2&&rep.__s2===1&&rep.__s4===undefined,
    'une base restée sur un ancien seuil est reprise à deux');

  /* un choix ultérieur est respecté */
  const choix=await pg.evaluate(()=>{ window.kbSet('seuil',4);
    const a=DB.parametres.actionsGroupees.seuil;
    window.kbSet('actif',true);                 /* re-passage par cfg() */
    return {a:a,b:DB.parametres.actionsGroupees.seuil}; });
  A(choix.a===4&&choix.b===4,'un seuil choisi ensuite dans les Paramètres n\'est plus écrasé');

  const carte=await pg.evaluate(()=>{ DB.parametres.actionsGroupees={actif:true};
    return window.kbCarte?window.kbCarte():(window.kbCard?window.kbCard():''); });
  A(/à partir de 2 boutons/.test(carte)||/value="2"/.test(carte),
    'la carte des Paramètres annonce le nouveau seuil');

  A(errs.length===0,'aucune erreur de page ('+errs.slice(0,2).join(' / ')+')');
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
