const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1700,height:1080}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(3400);

  await pg.evaluate(()=>{
    const T=(j,h)=>new Date(j+'T'+h+':00').getTime();
    DB.clients=[{id:'lc1',clientType:'societe',denomination:'ATLAS BTP',email:'a@x.fr'}];
    DB.dossiers=[{id:'ld1',ref:'DOS-901',numeroDossier:'DOS-901',clientIds:['lc1'],
      formalite:'Création SAS',statut:'encours',
      wf:{demande:T('2026-03-02','09:12'),pieces:T('2026-03-05','14:30')},
      historique:[{d:'2026-03-05',t:'Étape « Pièces » validée'},
                  {d:'2026-03-04',t:'Lien de signature envoyé à a@x.fr : Statuts'},
                  {d:'2026-03-02',t:'Dossier créé depuis la demande de ATLAS BTP'}],
      notesList:[{id:'n1',ts:T('2026-03-06','10:05'),type:'appel',txt:'Le gérant rappelle lundi',qui:'Adil'}]},
      {id:'ld2',ref:'DOS-902',clientIds:['lc1'],formalite:'Transfert',wf:{},historique:[]}];
    DB.parametres.facturier=[
      {id:'lf1',type:'facture',numero:'FA-9',dossierId:'ld1',clNom:'ATLAS BTP',statut:'emise',
        dateEmise:'2026-03-07',lignes:[{des:'Honoraires',qte:1,pu:1200}],
        paye:{date:'2026-03-20',montant:1200,mode:'Virement',releve:{lib:'VIR ATLAS BTP'}}},
      {id:'lf2',type:'devis',numero:'DE-3',dossierId:'ld1',clNom:'ATLAS BTP',statut:'emise',
        dateEmise:'2026-03-01',lignes:[{des:'Honoraires',qte:1,pu:1200}]},
      {id:'lf3',type:'facture',numero:'FA-10',dossierId:'ld2',clNom:'ATLAS BTP',statut:'emise',
        dateEmise:'2026-03-08',lignes:[{des:'Autre',qte:1,pu:500}]}];
    DB.parametres.tempsChaine={lignes:[
      {id:'t1',dossierId:'ld1',min:150,objet:'Rédaction des statuts',date:'2026-03-04',ts:T('2026-03-04','18:00')},
      {id:'t2',dossierId:'ld2',min:60,objet:'Autre dossier',date:'2026-03-04',ts:T('2026-03-04','19:00')}],journal:[]};
    DB.parametres.partagesLien=[
      {ts:T('2026-03-03','11:00'),numero:'DOS-901',dest:'a@x.fr',canal:'e-mail',url:'https://x/depot.html?k=1'},
      {ts:T('2026-03-03','11:05'),numero:'DOS-999',dest:'z@x.fr',canal:'SMS',url:'https://x/depot.html?k=2'}];
  });

  /* --- ce que le fil rassemble --- */
  const F=await pg.evaluate(()=>window.filDossier('ld1'));
  A(F&&F.ref==='DOS-901'&&F.nom==='ATLAS BTP','le fil sait de quel dossier et de quel client il parle');
  const cats=(F.evts||[]).map(e=>e.cat);
  ['etape','suivi','courrier','note','facture','temps'].forEach(c=>
    A(cats.indexOf(c)>=0,'le fil réunit les événements de type « '+c+' »'));
  A(F.evts.length===10,'dix événements réunis, sans doublon ('+F.evts.length+')');

  /* --- pas de doublon entre l'étape horodatée et la ligne de suivi --- */
  const dup=F.evts.filter(e=>/Étape « Pièces » validée/.test(e.titre));
  A(dup.length===1&&dup[0].cat==='etape'&&!dup[0].approx,
    'une étape validée n\'apparaît qu\'une fois, à son heure exacte');
  const dem=F.evts.filter(e=>/Étape « Demande » validée/.test(e.titre));
  A(dem.length===1,'une étape sans ligne de suivi apparaît tout de même');

  /* --- ordre --- */
  const ts=F.evts.map(e=>e.ts);
  A(ts.every((v,i)=>i===0||ts[i-1]>=v),'les événements sont rendus du plus récent au plus ancien');
  A(/Encaissement/.test(F.evts[0].titre),'l\'encaissement du 20 mars ouvre le fil');

  /* --- rien d'un autre dossier --- */
  const txt=JSON.stringify(F.evts);
  A(!/FA-10|Autre dossier|DOS-999|z@x\.fr/.test(txt),'rien d\'un autre dossier ne s\'y glisse');

  /* --- détail des lignes --- */
  const enc=F.evts.filter(e=>/Encaissement/.test(e.titre))[0];
  A(/1 200/.test(enc.titre.replace(/ | /g,' '))&&/Virement/.test(enc.detail||''),
    'l\'encaissement dit son montant et son moyen de paiement');
  const tp=F.evts.filter(e=>e.cat==='temps')[0];
  A(/2 h 30 min/.test(tp.titre.replace(/ | /g,' '))&&/statuts/i.test(tp.detail||''),
    'le temps passé est dit en heures et minutes, avec son objet');
  const co=F.evts.filter(e=>e.cat==='courrier')[0];
  A(/lien de dépôt/.test(co.titre)&&/e-mail/.test(co.titre)&&/a@x\.fr/.test(co.detail||''),
    'l\'envoi d\'un lien dit ce qui a été envoyé, par quel canal et à qui');
  const no=F.evts.filter(e=>e.cat==='note')[0];
  A(no.titre==='Appel'&&/rappelle lundi/.test(no.detail||'')&&no.qui==='Adil',
    'une note reprend son type, son texte et son auteur');

  /* --- les lignes de suivi non horodatées --- */
  const sv=F.evts.filter(e=>e.cat==='suivi');
  A(sv.length===2&&sv.every(e=>e.approx===true),
    'le suivi, daté au jour, est signalé comme tel (heure inconnue)');

  /* --- dossier sans rien --- */
  const vide=await pg.evaluate(()=>window.filDossier('ld2'));
  A(vide&&vide.evts.length===2,'un dossier presque vide ne montre que ce qui le concerne');
  const nul=await pg.evaluate(()=>window.filDossier('inexistant'));
  A(nul===null,'un dossier inconnu ne produit pas de fil');

  /* --- ouverture, filtres, sens --- */
  await pg.evaluate(()=>{ window.filOuvrir('ld1'); }); await pg.waitForTimeout(350);
  const vu=await pg.evaluate(()=>{
    const w=document.querySelector('.fl-wrap');
    return {ouvert:!!w, titre:(document.querySelector('#ov-t')||{}).textContent||document.body.innerText.slice(0,0),
      n:document.querySelectorAll('.fl-it').length,
      jours:document.querySelectorAll('.fl-jour').length,
      chips:[].map.call(document.querySelectorAll('.fl-chip'),c=>c.textContent.replace(/\s+/g,' ').trim())};
  });
  A(vu.ouvert&&vu.n===10,'le fil s\'ouvre et affiche les dix événements');
  A(vu.jours===8,'les événements sont regroupés par journée ('+vu.jours+' journées)');
  A(vu.chips[0].indexOf('Tout 10')===0,'un filtre « Tout » annonce le total');
  A(vu.chips.some(c=>/Temps passé 1/.test(c))&&vu.chips.some(c=>/Facturation 3/.test(c)),
    'chaque nature a son filtre et son compte');

  const filtre=await pg.evaluate(()=>{ window.filCat('facture');
    return {n:document.querySelectorAll('.fl-it').length,
      on:(document.querySelector('.fl-chip.on')||{}).textContent.replace(/\s+/g,' ').trim()}; });
  A(filtre.n===3&&/Facturation/.test(filtre.on),'un filtre ne laisse que sa nature');

  const sens=await pg.evaluate(()=>{ window.filCat('');
    const av=document.querySelector('.fl-it .fl-t b').textContent;
    window.filSens();
    const ap=document.querySelector('.fl-it .fl-t b').textContent;
    const lbl=document.querySelector('.fl-sens').textContent.trim();
    return {av:av,ap:ap,lbl:lbl}; });
  A(/Encaissement/.test(sens.av)&&/Devis/.test(sens.ap),'on peut lire le fil du plus ancien au plus récent');
  A(/plus ancien/.test(sens.lbl),'le bouton dit dans quel sens on lit');

  /* --- impression --- */
  const doc=await pg.evaluate(()=>{ window.filSens(); return window.filDocHTML('ld1'); });
  A(/fl-doc/.test(doc)&&/Fil du dossier DOS-901/.test(doc),'le fil s\'imprime en page A4 à son en-tête');
  A(/ATLAS BTP/.test(doc)&&/Création SAS/.test(doc)&&/10 événements/.test(doc),
    'l\'en-tête imprimé rappelle le client, la formalité et le nombre d\'événements');
  A(/Encaissement/.test(doc)&&/Rédaction des statuts/.test(doc),'le document imprimé porte bien les événements');

  const imp=await pg.evaluate(()=>{ let écrit=''; const faux={document:{write(s){écrit+=s;},close(){}}};
    const _o=window.open; window.open=()=>faux; try{ window.filImprimer('ld1'); }finally{ window.open=_o; }
    return écrit; });
  A(/<title>Fil du dossier DOS-901/.test(imp)&&/@page\{size:A4/.test(imp),'l\'impression ouvre une page A4 titrée');

  /* --- export --- */
  const csv=await pg.evaluate(()=>{ let cap=null;
    const _t=window.MQ.telecharger; window.MQ.telecharger=function(c,n){ cap={c:c,n:n}; return true; };
    window.filCSV('ld1'); window.MQ.telecharger=_t; return cap; });
  A(csv&&/fil-DOS-901\.csv/.test(csv.n),'l\'export porte le nom du dossier');
  A(/"Date";"Heure";"Nature";"[^"]*v[ée]nement"/.test(csv.c)&&csv.c.split('\n').length===11,
    'le fichier a son en-tête et une ligne par événement');

  /* --- accès depuis le Traitement --- */
  const btn=await pg.evaluate(()=>{ const h=window.espTraitementCard(DB.dossiers[0]);
    return {dedans:h.indexOf("filOuvrir('ld1')")>=0, lbl:/Fil du dossier<\/span>/.test(h),
      deuxfois:(h.match(/filOuvrir/g)||[]).length}; });
  A(btn.dedans&&btn.lbl,'le bouton « Fil du dossier » figure dans les outils du Traitement');
  A(btn.deuxfois===1,'il n\'y figure qu\'une fois');

  A(errs.length===0,'aucune erreur de page ('+errs.slice(0,2).join(' / ')+')');
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
