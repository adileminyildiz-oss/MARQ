const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1080}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(3400);

  await pg.evaluate(()=>{
    DB.clients=[{id:'ec1',clientType:'societe',denomination:'ATLAS BTP',prenom:'',nom:''},
                {id:'ec2',clientType:'particulier',prenom:'Paul',nom:'Morel'}];
    DB.dossiers=[{id:'ed1',ref:'DOS-911',clientIds:['ec1'],serviceIds:[],statut:'Nouveau',wf:{},historique:[]},
                 {id:'ed2',ref:'DOS-912',clientIds:['ec1'],serviceIds:[],statut:'Nouveau',wf:{},historique:[]},
                 {id:'ed3',ref:'DOS-913',clientIds:['ec2'],serviceIds:[],statut:'En cours',wf:{},historique:[]}];
    delete DB.parametres.etiquettes;
  });

  /* --- poser --- */
  const po=await pg.evaluate(()=>({
    a:window.etqPoser('dossier','ed1','urgent'),
    b:window.etqPoser('dossier','ed1','  URGENT '),        // déjà posée, accents/casse ignorés
    c:window.etqPoser('dossier','ed1',''),
    d:window.etqPoser('dossier','ed1','à relancer'),
    e:window.etqPoser('client','ec1','BTP'),
    f:window.etqPoser('dossier','inconnu','x'),
    liste:window.etqListe('dossier','ed1'),
    jr:(DB.parametres.etiquettes.journal[0]||{}).action}));
  A(po.a===true&&po.d===true&&po.e===true,'une étiquette se pose sur un dossier comme sur un client');
  A(po.b===false,'la même étiquette ne se pose pas deux fois (casse et accents ignorés)');
  A(po.c===false&&po.f===false,'une étiquette vide ou une fiche inconnue ne changent rien');
  A(po.liste.length===2&&po.liste[0]==='urgent','la fiche porte ses étiquettes dans l\'ordre où on les a posées');
  A(po.jr==='étiquette posée','la pose est notée au journal');

  const nrm=await pg.evaluate(()=>({
    long:window.etqNorm('une étiquette vraiment beaucoup trop longue pour tenir').length,
    esp:window.etqNorm('  dossier    sensible  ')}));
  A(nrm.long===28&&nrm.esp==='dossier sensible','le nom est nettoyé et borné à une longueur raisonnable');

  /* --- porte / retirer --- */
  const rt=await pg.evaluate(()=>{
    const av=window.etqPorte('dossier','ed1','URGENT');
    const r=window.etqRetirer('dossier','ed1','Urgent');
    const r0=window.etqRetirer('dossier','ed1','jamais posée');
    return {av:av,r:r,r0:r0,ap:window.etqPorte('dossier','ed1','urgent'),
      reste:window.etqListe('dossier','ed1'),jr:(DB.parametres.etiquettes.journal[0]||{}).action}; });
  A(rt.av===true&&rt.ap===false&&rt.r===true,'on retire une étiquette, quelle que soit la casse');
  A(rt.r0===false&&rt.reste.length===1,'retirer une étiquette absente ne touche à rien');
  A(rt.jr==='étiquette retirée','le retrait est noté au journal');

  /* --- inventaire --- */
  const inv=await pg.evaluate(()=>{
    window.etqPoser('dossier','ed1','urgent');
    window.etqPoser('dossier','ed2','urgent');
    window.etqPoser('dossier','ed3','BTP');
    window.etqPoser('client','ec2','à relancer');
    return window.etqToutes(); });
  const urg=inv.filter(x=>x.nom==='urgent')[0], btp=inv.filter(x=>x.nom==='BTP')[0];
  A(urg&&urg.dossiers===2&&urg.clients===0,'l\'inventaire compte les dossiers étiquetés');
  A(btp&&btp.dossiers===1&&btp.clients===1&&btp.total===2,'il compte aussi les clients');
  A(inv[0].nom==='urgent'||inv[0].total>=inv[inv.length-1].total,'les étiquettes les plus employées viennent en tête');

  /* --- renommer partout --- */
  const rn=await pg.evaluate(()=>{
    const n=window.etqRenommer('urgent','prioritaire');
    return {n:n,ed1:window.etqListe('dossier','ed1'),ed2:window.etqListe('dossier','ed2'),
      restant:window.etqToutes().filter(x=>x.nom==='urgent').length,
      jr:(DB.parametres.etiquettes.journal[0]||{}).action}; });
  A(rn.n===2&&rn.ed1.indexOf('prioritaire')>=0&&rn.ed2.indexOf('prioritaire')>=0,
    'renommer une étiquette la renomme sur toutes les fiches');
  A(rn.restant===0&&rn.jr==='étiquette renommée','l\'ancien nom disparaît et le journal le dit');

  const rndup=await pg.evaluate(()=>{
    window.etqPoser('dossier','ed1','BTP');               // ed1 porte prioritaire, à relancer, BTP
    window.etqRenommer('prioritaire','btp');              // fusionne avec BTP déjà posée
    return window.etqListe('dossier','ed1'); });
  A(rndup.filter(x=>/btp/i.test(x)).length===1,'un renommage qui rejoint une étiquette existante ne la double pas');

  const rnv=await pg.evaluate(()=>window.etqRenommer('btp','   '));
  A(rnv===0,'un renommage sans nom est refusé');
  const rni=await pg.evaluate(()=>window.etqRenommer('jamais employée','autre'));
  A(rni===0,'renommer une étiquette que personne ne porte ne fait rien');

  /* --- retirer partout --- */
  const ef=await pg.evaluate(()=>{
    const n=window.etqEffacer('btp');
    return {n:n,reste:window.etqToutes().map(x=>x.nom),
      jr:(DB.parametres.etiquettes.journal[0]||{}).action}; });
  A(ef.n>=2&&ef.reste.indexOf('btp')<0&&ef.reste.indexOf('BTP')<0,
    '« retirer partout » enlève l\'étiquette de toutes les fiches');
  A(ef.jr==='étiquette supprimée','la suppression est notée au journal');

  /* --- filtre de la liste des dossiers du Traitement --- */
  const fl=await pg.evaluate(()=>{
    window.etqPoser('dossier','ed1','urgent'); window.etqPoser('dossier','ed3','urgent');
    const L=DB.dossiers;
    const tous=window.espMiniList(L,'ed1');
    window.etqFiltrer('urgent');
    const filtre=window.espMiniList(L,'ed1');
    const actif=window.etqFiltreActif();
    window.etqFiltrer('urgent');                            // re-clic : on retire le filtre
    const apres=window.etqFiltreActif();
    return {tous:(tous.match(/DOS-9\d\d/g)||[]),filtre:(filtre.match(/DOS-9\d\d/g)||[]),
      bar:/etq-bar/.test(tous),actif:actif,apres:apres,
      intact:(DB.dossiers||[]).length}; });
  A(fl.bar,'une barre d\'étiquettes surmonte la liste des dossiers du Traitement');
  A(fl.tous.length===3&&fl.filtre.length===2&&fl.filtre.indexOf('DOS-912')<0,
    'le filtre ne laisse que les dossiers qui portent l\'étiquette');
  A(fl.actif==='urgent'&&fl.apres==='','on met le filtre et on l\'enlève du même bouton');
  A(fl.intact===3,'le filtre n\'enlève aucun dossier de la base');

  /* --- le filtre se voit vraiment à l'écran --- */
  await pg.evaluate(()=>{ state.page='espace'; state.espaceDossier='ed1'; render(); });
  await pg.waitForTimeout(700);
  const ecrf=await pg.evaluate(()=>{
    const av=document.querySelectorAll('.esp-mini-list > *').length;
    const bar=!!document.querySelector('.esp-mini .etq-bar');
    window.etqFiltrer('urgent');
    return new Promise(r=>setTimeout(()=>r({av:av,bar:bar,
      ap:document.querySelectorAll('.esp-mini-list > *').length,
      on:!!document.querySelector('.esp-mini .etq-f.on')}),600)); });
  A(ecrf.bar&&ecrf.av===3&&ecrf.ap===2&&ecrf.on,
    'à l\'écran, la barre filtre bien la liste et se marque comme active');
  await pg.evaluate(()=>{ window.etqFiltrer('urgent'); }); await pg.waitForTimeout(400);

  /* --- pastilles --- */
  const ch=await pg.evaluate(()=>({
    d:window.etqChipsHTML('dossier','ed1'),
    fixe:window.etqChipsHTML('dossier','ed1',{fixe:true})}));
  A(/class="etq"/.test(ch.d)&&/etqAjouter\('dossier','ed1'\)/.test(ch.d),
    'les pastilles d\'une fiche s\'accompagnent d\'un bouton pour en poser une');
  A(/etqRetirer/.test(ch.d)&&!/etqRetirer|etq-add/.test(ch.fixe),
    'en lecture seule, ni croix ni bouton d\'ajout');

  /* --- à l'écran : dossier puis client --- */
  await pg.evaluate(()=>{ state.page='espace'; state.espaceDossier='ed1'; render(); });
  await pg.waitForTimeout(700);
  const ecr=await pg.evaluate(()=>{ const s=document.querySelectorAll('.tr-head .etq-strip');
    return {n:s.length,txt:s[0]?s[0].textContent.replace(/\s+/g,' ').trim():''}; });
  A(ecr.n===1&&/urgent/.test(ecr.txt)&&/Étiquette/.test(ecr.txt),
    'les étiquettes du dossier se lisent dans l\'en-tête du Traitement');

  await pg.evaluate(()=>{ state.page='clients'; state.cliSel='ec2'; render(); });
  await pg.waitForTimeout(700);
  const cli=await pg.evaluate(()=>{ const s=document.querySelectorAll('.cli-fiche-head .etq-strip');
    return {n:s.length,txt:s[0]?s[0].textContent.replace(/\s+/g,' ').trim():''}; });
  A(cli.n===1&&/à relancer/.test(cli.txt),'celles du client se lisent sur sa fiche');

  /* --- pose depuis l'écran, plusieurs d'un coup --- */
  const aj=await pg.evaluate(()=>{ let q=null;
    const _p=window.uiPrompt; window.uiPrompt=function(m,d,ok){ q=m; ok('récurrent, à facturer'); };
    window.etqAjouter('dossier','ed2'); window.uiPrompt=_p;
    return {q:q,l:window.etqListe('dossier','ed2')}; });
  A(aj.l.indexOf('récurrent')>=0&&aj.l.indexOf('à facturer')>=0,
    'on peut poser plusieurs étiquettes d\'un coup, séparées par une virgule');
  A(/DOS-912/.test(aj.q)&&/Déjà employées|mot court/.test(aj.q),
    'la demande rappelle la fiche concernée et propose les étiquettes déjà employées');

  /* --- carte de gestion dans les Paramètres --- */
  const pa=await pg.evaluate(()=>{ const c=window.etqCarte();
    const p=window.pageParams();
    return {c:c,dans:(''+p).indexOf('etq-card')>=0,
      deux:((''+p).match(/etq-card/g)||[]).length}; });
  A(/Étiquettes<\/h2>/.test(pa.c)&&/Renommer/.test(pa.c)&&/Retirer partout/.test(pa.c),
    'les Paramètres offrent de renommer ou de retirer une étiquette partout');
  A(pa.dans&&pa.deux===1,'la carte figure une seule fois dans les Paramètres');

  const vide=await pg.evaluate(()=>{ DB.dossiers.forEach(d=>d.etiquettes=[]);
    DB.clients.forEach(c=>c.etiquettes=[]); return window.etqCarte(); });
  A(/Aucune étiquette posée/.test(vide),'sans étiquette, la carte le dit simplement');

  /* --- audit --- */
  const au=await pg.evaluate(()=>{ try{ return (window.auditEntrees()||[])
    .filter(e=>/étiquette/i.test(e.action||'')).map(e=>e.srcLbl||e.src); }catch(e){ return []; } });
  A(au.length>0&&au.every(x=>/tiquettes/.test(x)),
    'les poses et retraits remontent au journal d\'audit, sous leur nom');

  A(errs.length===0,'aucune erreur de page ('+errs.slice(0,2).join(' / ')+')');
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
