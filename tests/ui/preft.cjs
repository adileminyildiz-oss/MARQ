const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0;
const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(2000);

  // ── jeu d'essai : un client complet + un dossier rattaché
  const setup=await pg.evaluate(()=>{
    const c={id:'cPF1',clientType:'societe',denomination:'ATLAS BTP',forme:'sasu',siren:'987654321',
      siret:'98765432100017',capital:'5000',ape:'4120A',tva:'FR12987654321',objet:'Travaux de maçonnerie',
      siege:'8 avenue des Tilleuls',cp:'93100',ville:'Montreuil',regime:'IS',
      president:'M. Karim Benali',presidentFonction:'Président',dirCivilite:'M.',dirNationalite:'Française',
      dirNaissance:'12/04/1985',dirLieuNaissance:'Alger',dirAdresse:'3 rue Basse',dirCp:'93200',dirVille:'Saint-Denis',
      dirTel:'06 11 22 33 44',dirEmail:'karim@atlasbtp.fr',email:'contact@atlasbtp.fr',tel:'01 48 00 00 00',
      dateDebut:'01/03/2026',rcsVille:'Bobigny',salaries:[{nom:'A'},{nom:'B'}]};
    DB.clients=DB.clients||[]; DB.clients=DB.clients.filter(x=>x.id!=='cPF1'); DB.clients.push(c);
    DB.dossiers=DB.dossiers||[]; DB.dossiers=DB.dossiers.filter(x=>x.id!=='dPF1');
    DB.dossiers.push({id:'dPF1',ref:'DOS-2026-000901',clientIds:['cPF1'],statut:'en cours',formalite:'Création SASU',
      intake:{type:'SASU',societe:{denomination:'ATLAS BTP'},siege:{},direction:{},contact:{}}});
    return {clients:DB.clients.length,dossiers:DB.dossiers.length};
  });
  A(setup.clients>0&&setup.dossiers>0,'jeu d\'essai en place');

  // ── 1) le référentiel
  const M=await pg.evaluate(()=>window.prefValeurs('cPF1','dPF1'));
  A(M.denomination&&M.denomination.v==='ATLAS BTP','dénomination reprise');
  A(M.siren&&M.siren.v==='987654321','SIREN repris');
  A(M.siret&&M.siret.v==='98765432100017','SIRET repris');
  A(M.cp&&M.cp.v==='93100'&&M.ville&&M.ville.v==='Montreuil','code postal et ville repris');
  A(M.president&&M.president.v==='M. Karim Benali','dirigeant repris');
  A(M.lieunaissance&&M.lieunaissance.v==='Alger','lieu de naissance repris');
  A(M.ref&&M.ref.v==='DOS-2026-000901','n° de dossier repris');
  A(M.effectif&&M.effectif.v==='2','effectif calculé');
  A(M.denomination.src==='fiche client','provenance indiquée');
  A(/dossier DOS-2026-000901/.test(M.ref.src),'provenance du dossier indiquée');

  // ── 2) reconnaissance des champs : formulaire de démonstration
  const scan=await pg.evaluate(()=>{
    const v=document.getElementById('view');
    const box=document.createElement('div'); box.id='zz-essai';
    box.innerHTML=
      '<label><span>Dénomination</span><input id="e-den"></label>'
     +'<label><span>N° SIREN</span><input id="e-siren"></label>'
     +'<label><span>Code postal</span><input id="e-cp"></label>'
     +'<label><span>Ville</span><input id="e-ville"></label>'
     +'<label><span>Nom &amp; prénom du dirigeant</span><input id="e-dir"></label>'
     +'<label><span>Téléphone</span><input id="e-tel"></label>'
     +'<label><span>Capital social</span><input id="e-cap" value="1 000"></label>'
     +'<label><span>Nom du fournisseur</span><input id="e-four"></label>'
     +'<label><span>Forme juridique</span><select id="e-forme"><option></option><option>SARL</option><option>SASU</option></select></label>'
     +'<label><span>Date de naissance</span><input type="date" id="e-naiss"></label>'
     +'<input id="e-cli" oninput="cliSet(\'cPF1\',\'objet\',this.value)">';
    v.appendChild(box);
    state.cliSel='cPF1';
    const L=window.prefScan();
    return L.map(x=>({id:x.el.id,cle:x.cle,val:x.val,src:x.src}));
  });
  const by=k=>scan.find(x=>x.id===k);
  A(by('e-den')&&by('e-den').val==='ATLAS BTP','champ « Dénomination » reconnu par son libellé');
  A(by('e-siren')&&by('e-siren').val==='987654321','champ « N° SIREN » reconnu');
  A(by('e-cp')&&by('e-cp').val==='93100','champ « Code postal » reconnu');
  A(by('e-dir')&&by('e-dir').val==='M. Karim Benali','champ « Nom & prénom du dirigeant » reconnu');
  A(!by('e-cap'),'champ déjà saisi (capital) laissé intact');
  A(!by('e-four'),'champ d\'une autre entité (fournisseur) écarté');
  A(by('e-forme')&&by('e-forme').val==='SASU','liste déroulante : option correspondante trouvée');
  A(by('e-naiss')&&by('e-naiss').val==='1985-04-12','date convertie au format attendu');
  A(by('e-cli')&&by('e-cli').cle==='objet','champ reconnu par la clé de son gestionnaire');

  // ── 3) remplissage réel
  const rempli=await pg.evaluate(()=>{ const n=window.prefRemplir();
    return {n:n,den:document.getElementById('e-den').value,cap:document.getElementById('e-cap').value,
      four:document.getElementById('e-four').value,forme:document.getElementById('e-forme').value,
      naiss:document.getElementById('e-naiss').value}; });
  A(rempli.n>=8,'remplissage effectué ('+rempli.n+' champs)');
  A(rempli.den==='ATLAS BTP','valeur posée dans le champ');
  A(rempli.cap==='1 000','champ déjà saisi non écrasé');
  A(rempli.four==='','champ d\'une autre entité non touché');
  A(rempli.forme==='SASU','liste déroulante positionnée');
  A(rempli.naiss==='1985-04-12','date posée');

  // ── 4) l'événement input a bien été propagé (le logiciel enregistre)
  const propage=await pg.evaluate(()=>{ const c=DB.clients.find(x=>x.id==='cPF1'); return c&&c.objet; });
  A(propage==='Travaux de maçonnerie','la saisie est enregistrée par le logiciel');

  // ── 5) annulation
  const annule=await pg.evaluate(()=>{ window.prefAnnuler();
    return {den:document.getElementById('e-den').value,forme:document.getElementById('e-forme').value}; });
  A(annule.den===''&&annule.forme==='','annulation : champs remis à vide');

  // ── 6) journal & audit
  const jr=await pg.evaluate(()=>{ const j=(DB.parametres.prefChaine||{}).journal||[];
    const au=(window.auditEntrees()||[]).filter(x=>x.src==='prefChaine');
    return {n:j.length,act:j.map(x=>x.action),au:au.length,lbl:au[0]&&au[0].srcLbl}; });
  A(jr.n>=2,'journal alimenté');
  A(jr.act.indexOf('pré-remplissage')>=0,'remplissage journalisé');
  A(jr.au>=2&&jr.lbl==='Pré-remplissage','journal repris dans l\'audit consolidé');

  // ── 7) bouton contextuel
  const bar=await pg.evaluate(()=>{ window.prefBarre(); const b=document.getElementById('pf-bar');
    return {ok:!!b,txt:b?b.textContent:''}; });
  A(bar.ok&&/Compléter depuis le dossier/.test(bar.txt),'bouton « Compléter depuis le dossier » affiché');

  // ── 8) aperçu de contrôle
  const ap=await pg.evaluate(()=>{ window.prefApercu(); const p=document.querySelector('.pf-panel');
    return {ok:!!p,txt:p?p.textContent.replace(/[  ]/g,' '):'',ck:document.querySelectorAll('.pf-panel input[type=checkbox]').length}; });
  A(ap.ok,'aperçu de contrôle ouvert');
  A(/ATLAS BTP/.test(ap.txt),'société rappelée dans l\'aperçu');
  A(/fiche client/.test(ap.txt),'provenance affichée dans l\'aperçu');
  A(ap.ck>=8,'une case par information ('+ap.ck+')');

  // ── 9) sélection partielle
  const part=await pg.evaluate(()=>{ document.querySelectorAll('.pf-panel input[type=checkbox]').forEach((c,i)=>{ c.checked=(i===0); });
    const n=window.prefValider(); return {den:document.getElementById('e-den').value,siren:document.getElementById('e-siren').value}; });
  A(part.den!==''&&part.siren==='','sélection partielle respectée');

  // ── 10) réglage marche/arrêt
  const off=await pg.evaluate(()=>{ window.prefSet('actif',false); window.prefBarre();
    const b=!document.getElementById('pf-bar'); window.prefSet('actif',true); return b; });
  A(off,'réglage : le bouton disparaît quand le pré-remplissage est désactivé');

  // ── 11) carte Paramètres
  const par=await pg.evaluate(()=>{ const h=window.pageParams(); return {ok:/pf-params/.test(h),txt:/Pré-remplissage des formulaires/.test(h)}; });
  A(par.ok&&par.txt,'carte de réglage présente dans les Paramètres');

  // ── 12) sans contexte : rien ne se produit
  const vide=await pg.evaluate(()=>{ const s={cliSel:state.cliSel,ed:state.edLibId,esp:state.espaceDossier,dos:state.dossierId,dem:state.demSel};
    state.cliSel=null;state.edLibId=null;state.espaceDossier=null;state.dossierId=null;state.demSel=null;
    const cx=window.prefContexte(); const L=window.prefScan();
    Object.assign(state,{cliSel:s.cliSel,edLibId:s.ed,espaceDossier:s.esp,dossierId:s.dos,demSel:s.dem});
    return {cx:cx===null,n:L.length}; });
  A(vide.cx&&vide.n===0,'aucun contexte : aucun champ proposé');

  // ── 13) contexte par le dossier ouvert
  const parDos=await pg.evaluate(()=>{ const s=state.cliSel; state.cliSel=null; state.espaceDossier='dPF1';
    const cx=window.prefContexte(); state.espaceDossier=null; state.cliSel=s;
    return cx&&cx.client&&cx.client.id; });
  A(parDos==='cPF1','société retrouvée depuis le dossier ouvert');

  // ── 14) bulle d'information lisible (pas de « undefined »)
  const tst=await pg.evaluate(()=>{ const t=document.getElementById('toast'); t.className=''; t.innerHTML='';
    window.prefRemplir(); const ic=t.querySelector('.tst-ic'); return {ic:ic?ic.textContent:'',cl:t.className}; });
  A(tst.ic!=='undefined'&&tst.ic!=='','bulle d\'information : icône correcte ('+tst.ic+')');
  A(/tst-(success|warn|error|info)\b/.test(tst.cl),'bulle d\'information : type reconnu ('+tst.cl+')');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  await pg.evaluate(()=>{ const e=document.getElementById('zz-essai'); if(e) e.remove(); });
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
