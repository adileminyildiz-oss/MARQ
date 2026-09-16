const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1050}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(2200);

  // pas de passerelle configurée
  const gw=await pg.evaluate(()=>{ const c=(typeof demSyncCfg==='function')?demSyncCfg():null; return !!(c&&c.url); });
  A(gw===false,'passerelle non configurée dans le jeu d\'essai');

  // jeu d'essai : deux clients incomplets avec une adresse
  await pg.evaluate(()=>{
    DB.clients=(DB.clients||[]).filter(x=>!/^fe/.test(x.id));
    DB.clients.push({id:'fe1',clientType:'societe',denomination:'ALPHA SARL',email:'alpha@test.fr'});
    DB.clients.push({id:'fe2',clientType:'societe',denomination:'BETA SAS',email:'beta@test.fr'});
    delete DB.parametres.fileEnvoi;
  });

  // la chaîne Clients est bien bloquée
  const bloque=await pg.evaluate(()=>{ const L=(typeof cxChaineLignes==='function')?cxChaineLignes():[];
    const l=L.find(x=>x.key==='cli'); return l?{exec:!!l.exec,lbl:l.execLbl}:null; });
  A(bloque&&bloque.exec===false&&/Passerelle requise/.test(bloque.lbl||''),'la chaîne Clients est bloquée sans passerelle');

  // préparation : aucune fenêtre ne s'ouvre, les messages sont retenus
  const prep=await pg.evaluate(()=>{ window.__open=0; const _o=window.open; window.open=function(){ window.__open++; return null; };
    const n=window.fileEnvoiPreparer('cli','Clients'); window.open=_o;
    const c=DB.parametres.fileEnvoi;
    return {n:n,ouvertes:window.__open,items:(c.items||[]).length,
      to:(c.items||[]).map(x=>x.to).sort(), sujet:(c.items[0]||{}).sujet, corps:(c.items[0]||{}).corps,
      canal:(c.items[0]||{}).canal, mod:(c.items[0]||{}).mod, jr:(c.journal||[]).length}; });
  A(prep.n>=2,'messages préparés ('+prep.n+')');
  A(prep.ouvertes===0,'aucune fenêtre de messagerie ouverte pendant la préparation');
  A(prep.to.indexOf('alpha@test.fr')>=0&&prep.to.indexOf('beta@test.fr')>=0,'les destinataires sont retenus');
  A(prep.n===prep.items,'un message par client à relancer');
  A(/Informations à compléter/.test(prep.sujet||''),'objet du message conservé');
  A(/Bonjour/.test(prep.corps||'')&&prep.corps.length>80,'corps du message conservé');
  A(prep.canal==='email','canal identifié');
  A(prep.mod==='Clients','module d\'origine conservé');
  A(prep.jr>=1,'préparation journalisée');

  // la chaîne a bien fait son travail (marquage sur les fiches)
  const marq=await pg.evaluate(()=>(DB.clients||[]).filter(x=>/^fe/.test(x.id)).every(c=>!!c.infosDemandeLe));
  A(marq,'la chaîne a marqué les fiches comme relancées');

  // les fonctions d'envoi ont été rendues
  const restaure=await pg.evaluate(()=>({o:typeof window.open==='function'&&!/prendre/.test(''+window.open),
    s:typeof window.demSendViaScript, c:(typeof demSyncCfg==='function')?!!(demSyncCfg()||{}).url:false}));
  A(restaure.c===false,'la passerelle est de nouveau vue comme absente après la préparation');

  // pas de doublon si on relance
  const deux=await pg.evaluate(()=>{ const _o=window.open; window.open=()=>null;
    const n=window.fileEnvoiPreparer('cli','Clients'); window.open=_o;
    return {n:n,items:(DB.parametres.fileEnvoi.items||[]).length}; });
  A(deux.items===prep.items,'pas de doublon dans la file après une seconde préparation');

  // carte de la file
  const cd=await pg.evaluate(()=>{ const h=window.fileEnvoiCard(); return {ok:/fe-card/.test(h),
    t:/Messages à envoyer/.test(h), a:/alpha@test\.fr/.test(h), ouv:/fileEnvoiOuvrir/.test(h),
    cop:/fileEnvoiCopier/.test(h), csv:/fileEnvoiCSV/.test(h)}; });
  A(cd.ok&&cd.t,'carte « Messages à envoyer » présente');
  A(cd.a,'destinataire listé');
  A(cd.ouv&&cd.cop&&cd.csv,'ouvrir, copier et exporter disponibles');

  // ouvrir un message
  const ouv=await pg.evaluate(()=>{ let u=null; const _o=window.open; window.open=x=>{ u=x; return null; };
    const id=DB.parametres.fileEnvoi.items[0].id; window.fileEnvoiOuvrir(id); window.open=_o;
    const x=DB.parametres.fileEnvoi.items.find(y=>y.id===id);
    return {url:u,fait:x.fait}; });
  A(/^mailto:/.test(ouv.url||''),'le message s\'ouvre dans la messagerie');
  A(/subject=/.test(ouv.url||'')&&/body=/.test(ouv.url||''),'objet et corps transmis à la messagerie');
  A(ouv.fait===true,'le message passe en « envoyé »');

  // export CSV
  const csv=await pg.evaluate(()=>{ let nom=null; const _c=document.createElement.bind(document);
    document.createElement=function(t){ const el=_c(t); if(t==='a') el.click=function(){ nom=el.download; }; return el; };
    window.fileEnvoiCSV(); document.createElement=_c; return nom; });
  A(/^marq-envois-\d{4}-\d{2}-\d{2}\.csv$/.test(csv||''),'export pour publipostage produit un fichier daté');

  // nettoyage
  const vid=await pg.evaluate(()=>{ window.fileEnvoiVider(); const c=DB.parametres.fileEnvoi;
    return {n:(c.items||[]).length, att:(c.items||[]).filter(x=>!x.fait).length}; });
  A(vid.n===prep.items-1&&vid.att===vid.n,'les messages envoyés sont retirés, ceux en attente restent');

  // bouton sur le centre d'exécution
  const btn=await pg.evaluate(async()=>{ try{ go('cockpit'); }catch(e){}
    await new Promise(r=>setTimeout(r,700)); window.fileEnvoiBoutons();
    const rows=[...document.querySelectorAll('.cxc-card .cxc-row')];
    const r=rows.find(x=>/Passerelle requise/.test(x.textContent||''));
    const b=r?[...r.querySelectorAll('button')].find(x=>/Préparer les messages/.test(x.textContent)):null;
    return {rows:rows.length, trouve:!!b, cache:r?!![...r.querySelectorAll('.cxc-tag')].every(t=>t.style.display==='none'||!/Passerelle/.test(t.textContent)):false}; });
  A(btn.rows>0,'centre d\'exécution rendu');
  A(btn.trouve,'bouton « Préparer les messages » posé à la place du blocage');

  // carte visible sur le tableau de bord
  const vis=await pg.evaluate(async()=>{ await new Promise(r=>setTimeout(r,400));
    return !!document.querySelector('#view .fe-card'); });
  A(vis,'la file apparaît sur le tableau de bord');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
