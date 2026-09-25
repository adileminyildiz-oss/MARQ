/**
 * Mar'q — Documents de création : figés, utiles seulement, rangés par dossier (v760)
 *
 * Fige : à la création, seuls les documents utiles sont générés (plus de
 * cession, de procès-verbal ou de contrat de domiciliation pour un local
 * commercial) et chacun reçoit une copie datée (version 1) ; un document
 * approuvé est lu depuis sa copie — modifier la fiche client ne le change
 * plus, un bouton propose la mise à jour ; une retouche du document lui-même
 * le remet à vérifier ; les versions sont compressées dans le dossier et
 * survivent au rechargement ; le répertoire les liste et les exporte ; le
 * versement au coffre porte l'identifiant du dossier et du client.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const FORM=(Y,siege,dirX)=>({type:'sas',nature:'creation',numeroDossier:'',
  societe:{denomination:'BATI-SUD CONSTRUCTION',sigle:'BSC',capital:'10000',objet:'Travaux de maçonnerie générale et de gros œuvre de bâtiment',regime:'IS',debut:Y+'-10-01'},
  siege:Object.assign({rue:'4 avenue du Port',cp:'13002',ville:'Marseille',type:'Local commercial',bailleur:'SCI Les Docks'},siege||{}),
  direction:Object.assign({civilite:'M.',prenom:'Karim',nom:'Benali',naissance:'1985-04-12',lieuNaissance:'Lyon',pays:'France',nationalite:'Française',adresse:'8 rue Paradis',fonction:'Président'},dirX||{}),
  dirx:{cp:'13001',ville:'Marseille',typePiece:'Carte nationale d’identité',numPiece:'X4RT93KL2',pereNom:'Ahmed Benali',mereNom:'Nadia Haddad'},
  titres:{nominal:'10',nbTitres:'1000'},dates:{dateActe:Y+'-09-20',villeSignature:'Marseille',anneeExo:String(Y),finExo:(Y+1)+'-12-31',duree:'99',clotureAnnuelle:'31 décembre',rcsVille:'Marseille'},
  associes:[{civilite:'M.',prenom:'Karim',nom:'Benali',apport:'6000',parts:'600',role:'Président'},{civilite:'Mme',prenom:'Sonia',nom:'Petit',apport:'4000',parts:'400',role:'Associée'}],
  contact:{email:'k.benali@batisud.fr',tel:'0600000000'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'10000',date:Y+'-09-15'},
  apports:{numeraire:'10000',liberation:'Totale'},conjoint:{},cac:{},extra:{},beneficiaires:[{nom:'Karim Benali',detention:'60',vote:'60'}],profil:{}});
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  const pret=async()=>{ await p.evaluate(()=>{ try{_authGranted();}catch(e){} }); await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000}); };
  await p.goto(URL_APP); await pret();
  const ev=(f,a)=>p.evaluate(f,a); const Y=new Date().getFullYear();
  const creer=(f)=>ev((f)=>{ window.toast=()=>{}; window.open=()=>null; window.uiConfirm=(m,fn)=>fn&&fn(); window.__formData=f; state.page='formulaire'; render(); formDoCreate(false); try{closeModal();}catch(e){} return DB.dossiers[0].id; },f);

  /* 1. local commercial, dirigeant associé, filiation renseignée */
  await ev(()=>{ DB.clients=[]; DB.dossiers=[]; DB.demandes=[]; save(); });
  const id=await creer(FORM(Y));
  let r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); return {docs:Object.keys(d.docs).filter(k=>d.docs[k].genere).sort(),regle:d.docsRegle,req:espDocsRequis(d).map(x=>x.k).sort(),
    v1:Object.keys(d.figes||{}).length,mot:((d.figes||{}).statuts||[])[0]}; },id);
  const attendus=['dnc','filiation','lettremission','pouvoir','rbe','souscripteurs','statuts'];
  A(JSON.stringify(r.docs)===JSON.stringify(attendus),'création : seuls les documents utiles sont générés (7 au lieu de 17)',r.docs.join(','));
  A(JSON.stringify(r.req)===JSON.stringify(attendus)&&r.regle==='utile','la liste des documents requis suit la même règle',r.req.join(','));
  A(r.v1===7&&r.mot&&r.mot.v===1&&r.mot.motif==='création'&&!r.mot.valide,'chaque document reçoit une copie datée (version 1, création)',JSON.stringify(r.mot&&{v:r.mot.v,m:r.mot.motif}));

  /* 2. domicile du dirigeant + dirigeant non associé ; société de domiciliation */
  const id2=await creer(FORM(Y,{type:'Domicile du dirigeant',bailleur:''},{prenom:'Hugo',nom:'Martin'}));
  const id3=await creer(FORM(Y,{type:'Domiciliation',domiciliataire:'Kandbaz'}));
  r=await ev(([a,c])=>{ const f=id=>{ const d=DB.dossiers.find(x=>x.id===id); return Object.keys(d.docs).filter(k=>d.docs[k].genere); }; return {a:f(a),c:f(c)}; },[id2,id3]);
  A(r.a.includes('decladomicile')&&r.a.includes('acceptation')&&!r.a.includes('contratdomicil'),'siège au domicile + dirigeant tiers : déclaration de domiciliation et acceptation des fonctions',r.a.join(','));
  A(r.c.includes('contratdomicil')&&r.c.includes('attestdomicil')&&!r.c.includes('decladomicile')&&!r.c.includes('acceptation'),'société de domiciliation : contrat et attestation de domiciliation',r.c.join(','));
  r=await ev(()=>{ return ['cession','presence','etatlieux','rapportgestion','pv','convention'].filter(k=>DB.dossiers.some(d=>d.docs[k]&&d.docs[k].genere)); });
  A(!r.length,'jamais de cession, feuille de présence, état des lieux, rapport de gestion, procès-verbal ni convention à la création',r.join(','));

  /* 3. le cabinet ajoute ou retire un document optionnel */
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); espDocToggleReq(id,'convention'); espDocToggleReq(id,'rbe'); const q=espDocsRequis(d).map(x=>x.k); espDocToggleReq(id,'convention'); espDocToggleReq(id,'rbe'); return {conv:q.includes('convention'),rbe:q.includes('rbe'),apres:espDocsRequis(d).map(x=>x.k).includes('rbe')}; },id);
  A(r.conv&&!r.rbe&&r.apres,'un document optionnel s’ajoute ou se retire d’un clic',JSON.stringify(r));

  /* 4. validation : le document est figé, la fiche client ne le change plus */
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); docApprove(id,'pouvoir'); const c=DB.clients.find(x=>x.id===d.clientIds[0]);
    const avant=espDocRender(d,'pouvoir'); const n0=d.figes.pouvoir.length;
    c.docVars.villeSignature='Toulon'; c.docVars.rcsVille='Toulon'; if(d.intake&&d.intake.siege){ d.intake.siege.ville='Toulon'; }
    const apres=espDocRender(d,'pouvoir'); const st=figEtat(d,'pouvoir');
    return {n0,valide:!!d.figes.pouvoir[n0-1].valide,meme:avant===apres,st,live:(()=>{ window.__figLive=1; const h=espDocRender(d,'pouvoir'); window.__figLive=0; return h!==apres; })()}; },id);
  A(r.n0===1&&r.valide,'approuvé sans changement : la version 1 devient la version en vigueur (pas de doublon)',JSON.stringify(r));
  A(r.meme&&r.live,'fiche client modifiée : le document approuvé reste identique à sa copie figée',JSON.stringify(r.st));
  A(r.st.fige&&r.st.change,'l’écart avec la fiche est signalé',JSON.stringify(r.st));
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); const h=docFolderCard(d); return {fig:/dfd-fig[^>]*>figé · v1/.test(h),chg:/fiche changée/.test(h),maj:h.includes("figMettreAJour('"+id+"','pouvoir')"),ver:h.includes("figVersions('"+id+"','pouvoir')"),note:/est <b>figé<\/b>/.test(h)}; },id);
  A(r.fig&&r.chg&&r.maj&&r.ver&&r.note,'carte des documents : « figé · v1 », « fiche changée », Mettre à jour, Versions',JSON.stringify(r));

  /* 5. mise à jour : nouvelle version après nouvelle approbation */
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); figMettreAJour(id,'pouvoir'); const lib=!(d.docFolder.approved.pouvoir); docApprove(id,'pouvoir');
    const h=espDocRender(d,'pouvoir'); return {lib,n:d.figes.pouvoir.length,v:figEtat(d,'pouvoir').vigueur,chg:figEtat(d,'pouvoir').change,toulon:/Toulon/.test(h)}; },id);
  A(r.lib&&r.n===2&&r.v===2&&!r.chg&&r.toulon,'Mettre à jour → à vérifier → approuvé : version 2 en vigueur, reprenant la fiche',JSON.stringify(r));
  await ev((id)=>figVersions(id,'pouvoir'),id); await p.waitForTimeout(200);
  r=await ev(()=>({rows:document.querySelectorAll('#ov .fig-t tbody tr').length,vig:!!document.querySelector('#ov .fig-pill')}));
  A(r.rows===2&&r.vig,'fenêtre Versions : 2 versions, celle en vigueur marquée',JSON.stringify(r));
  await ev((id)=>{ closeModal(); figVoir(id,'pouvoir',1); },id); await p.waitForTimeout(250);
  r=await ev(()=>{ const t=(document.querySelector('#ov .doc-gen')||{}).innerHTML||''; return {marseille:/Marseille/.test(t),toulon:/Toulon/.test(t),ban:!!document.querySelector('#ov .fig-ban')}; });
  A(r.marseille&&!r.toulon&&r.ban,'la version 1 reste consultable telle qu’elle était',JSON.stringify(r));
  await ev(()=>closeModal());

  /* 6. retouche du document lui-même après validation → remis à vérifier */
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); docApprove(id,'dnc'); d.docCustom=d.docCustom||{}; d.docCustom.dnc='<p>Texte retouché</p>'; const h=espDocRender(d,'dnc'); return {h:/retouché/.test(h),appr:d.docFolder.approved.dnc}; },id);
  A(r.h&&r.appr===false,'document retouché après validation : la retouche s’affiche et il repasse « à vérifier »',JSON.stringify(r));

  /* 7. répertoire : versions listées et exportées ; coffre rattaché par identifiant */
  r=await ev((id)=>{ const R=repContenu(id); const s=R.sections.find(x=>x.k==='documents'), c=R.sections.find(x=>x.k==='coffre'); return {v:s.items.filter(x=>x.version).length,coffre:!!c,dir:c&&c.dir}; },id);
  A(r.v>=8&&r.coffre&&r.dir==='10-Coffre-du-client','répertoire : versions figées listées + section « Coffre du client »',JSON.stringify(r));
  r=await ev((id)=>{ window.__figExport=1; const R=repContenu(id); window.__figExport=0; const s=R.sections.find(x=>x.k==='documents'); const x=s.items.filter(x=>x.version&&x.data); return {n:x.length,html:x.length?atob(x[0].data.split(',')[1]).length>200:false}; },id);
  A(r.n>=8&&r.html,'export du répertoire : chaque version est un vrai fichier HTML',JSON.stringify(r));
  const nv=await ev((id)=>new Promise(res=>{ docApproveAll(id); coVerser(id,true,n=>res(n)); }),id);
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); const o=JSON.parse(localStorage.getItem('last-svc')||'{}'); const it=((o.coffre||{}).items||[]).filter(x=>x.dosId===id); const R=repContenu(id);
    return {n:it.length,cli:it.every(x=>x.cliId===d.clientIds[0]),keys:it.filter(x=>x.docKey).length,rep:R.sections.find(x=>x.k==='coffre').items.length}; },id);
  A(nv>0&&r.n===nv&&r.cli&&r.keys===r.n&&r.rep===r.n,'versement au coffre : chaque document porte le dossier, le client et sa clé, et apparaît dans le répertoire',JSON.stringify({nv,...r}));

  /* 8. rechargement : copies compressées, relues, toujours figées */
  await p.waitForTimeout(600);
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); const L=[].concat(...Object.values(d.figes)); return {gz:L.filter(v=>v.gz&&v.h==null).length,tot:L.length}; },id);
  A(r.tot>0&&r.gz===r.tot,'copies compressées dans le dossier',JSON.stringify(r));
  await p.reload(); await pret(); await p.waitForTimeout(900);
  r=await ev((id)=>{ const d=DB.dossiers.find(x=>x.id===id); const h=espDocRender(d,'pouvoir'); const st=figEtat(d,'pouvoir'); return {toulon:/Toulon/.test(h),v:st.vigueur,fige:st.fige}; },id);
  A(r.toulon&&r.v===2&&r.fige,'après rechargement : la version en vigueur est relue depuis sa copie',JSON.stringify(r));

  /* 9. les dossiers antérieurs gardent leur règle */
  r=await ev(()=>{ const d=JSON.parse(JSON.stringify(DB.dossiers[0])); delete d.docsRegle; d.docsInclus={}; d.id='ancien'; DB.dossiers.push(d); const q=espDocsRequis(d).map(x=>x.k); DB.dossiers.pop(); return q.length; });
  A(r===17,'dossier antérieur (sans la règle) : liste inchangée',String(r));

  A(!errs.length,'aucune erreur de page',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
