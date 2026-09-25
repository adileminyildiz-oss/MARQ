/**
 * Mar'q — Documents : « Enregistrer sous » (v761)
 *
 * Fige : un vrai fichier PDF (en-tête %PDF, pages A4, texte et accents
 * lisibles, pied « Page n / N ») au lieu de la fenêtre d'impression ; un
 * véritable classeur Excel (.xlsx : feuilles Informations / Document /
 * Tableau n, capital en nombre) ; Word, page web, texte, CSV ; le choix de
 * l'emplacement quand le navigateur le permet, repli en téléchargement ;
 * menu dans la visionneuse et dans la fiche technique, fenêtre « Enregistrer
 * sous » depuis la carte des documents, archive de tous les documents ;
 * versement au coffre rattaché au dossier ; dates des actes en JJ/MM/AAAA.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const FORM=(Y)=>({type:'sas',nature:'creation',numeroDossier:'',
  societe:{denomination:'BATI-SUD CONSTRUCTION',sigle:'BSC',capital:'10000',objet:'Travaux de maçonnerie générale et de gros œuvre de bâtiment',regime:'IS',debut:Y+'-10-01'},
  siege:{rue:'4 avenue du Port',cp:'13002',ville:'Marseille',type:'Local commercial',bailleur:'SCI Les Docks'},
  direction:{civilite:'M.',prenom:'Karim',nom:'Benali',naissance:'1985-04-12',lieuNaissance:'Lyon',pays:'France',nationalite:'Française',adresse:'8 rue Paradis',fonction:'Président'},
  dirx:{cp:'13001',ville:'Marseille',pereNom:'Ahmed Benali',mereNom:'Nadia Haddad'},
  titres:{nominal:'10',nbTitres:'1000'},dates:{dateActe:'2026-09-20',villeSignature:'Marseille',anneeExo:String(Y),finExo:(Y+1)+'-12-31',duree:'99',clotureAnnuelle:'31 décembre',rcsVille:'Marseille'},
  associes:[{civilite:'M.',prenom:'Karim',nom:'Benali',apport:'6000',parts:'600',role:'Président'},{civilite:'Mme',prenom:'Sonia',nom:'Petit',apport:'4000',parts:'400',role:'Associée'}],
  contact:{email:'k.benali@batisud.fr',tel:'0600000000'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'10000',date:Y+'-09-15'},
  apports:{numeraire:'10000',liberation:'Totale'},conjoint:{},cac:{},extra:{},beneficiaires:[],profil:{}});
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950},acceptDownloads:true});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} }); await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  const id=await ev((f)=>{ window.toast=()=>{}; window.uiConfirm=(m,fn)=>fn&&fn(); DB.clients=[]; DB.dossiers=[]; save();
    /* le sélecteur d'emplacement est simulé : on capte ce qui y serait écrit */
    window.__ecrit=null; window.showSaveFilePicker=function(o){ return Promise.resolve({createWritable:function(){ return Promise.resolve({write:function(b){ window.__ecrit={nom:o.suggestedName,taille:b.size,types:o.types}; return Promise.resolve(); },close:function(){ return Promise.resolve(); }}); }}); };
    window.__formData=f; state.page='formulaire'; render(); formDoCreate(false); try{closeModal();}catch(e){} return DB.dossiers[0].id; },FORM(new Date().getFullYear()));
  const octets=(fmt,k)=>ev(async([id,k,fmt])=>{ await svEnregistrer(fmt,svSource(id,k)); const a=new Uint8Array(await window.__svBlob.arrayBuffer()); let s=''; for(let i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return {s,nom:svDernier.nom,via:svDernier.via,ecrit:window.__ecrit}; },[id,k,fmt]);

  /* PDF */
  let r=await octets('pdf','statuts');
  const pages=(r.s.match(/\/Type \/Page\b(?!s)/g)||[]).length;
  A(r.s.startsWith('%PDF-1.4')&&/%%EOF\s*$/.test(r.s)&&/\/MediaBox \[0 0 595\.28 841\.89\]/.test(r.s),'PDF : un vrai fichier (en-tête, fin, pages A4)',r.s.slice(0,12));
  A(pages>=3&&r.s.includes('(Page 1 / '+pages+')'),'PDF : '+pages+' pages numérotées',String(pages));
  A(r.s.includes('(BATI-SUD ')&&r.s.includes('(Soci\xe9t\xe9 ')&&/\/Encoding \/WinAnsiEncoding/.test(r.s),'PDF : texte lisible, accents codés (WinAnsi)');
  A(r.s.includes('(20/09/2026')||r.s.includes('(20/09/2026, ')||/\(20\/09\/2026/.test(r.s),'date de l’acte en JJ/MM/AAAA (plus « 2026/09/2020 »)',(r.s.match(/\((\d+\/\d+\/\d+)/)||[])[1]);
  A(r.via==='emplacement'&&r.ecrit&&/^Projet de statuts - BATI-SUD CONSTRUCTION - \d{4}-\d{2}-\d{2}\.pdf$/.test(r.ecrit.nom),'l’utilisateur choisit l’emplacement ; nom proposé : document - société - date',JSON.stringify(r.ecrit&&r.ecrit.nom));
  /* repli : pas de sélecteur → téléchargement */
  await ev(()=>svChoisirEmplacement(false));
  const dlP=p.waitForEvent('download',{timeout:8000}).catch(()=>null);
  r=await octets('pdf','pouvoir'); const dl=await dlP;
  A(r.via==='telechargement'&&dl&&/\.pdf$/.test(dl.suggestedFilename()),'sans choix d’emplacement : le fichier est téléchargé',dl&&dl.suggestedFilename());
  await ev(()=>svChoisirEmplacement(true));

  /* Excel */
  r=await octets('xlsx','souscripteurs');
  A(r.s.startsWith('PK')&&r.s.includes('xl/workbook.xml')&&r.s.includes('[Content_Types].xml'),'Excel : un vrai classeur .xlsx');
  A(/name="Informations"/.test(r.s)&&/name="Document"/.test(r.s)&&/name="Tableau 1"/.test(r.s),'Excel : feuilles Informations, Document, Tableau 1');
  A(/Capital social<\/t><\/is><\/c><c r="B\d+" s="2"><v>10000<\/v>/.test(r.s),'Excel : le capital est un nombre au format euro');
  A(/<f>SUM\(B\d+:B\d+\)<\/f><v>10000<\/v>/.test(r.s),'Excel : répartition du capital avec total calculé (formule)');
  /* Word, texte, page web, CSV */
  r=await octets('docx','dnc'); A(r.s.startsWith('PK')&&r.s.includes('word/document.xml'),'Word : un vrai .docx');
  r=await octets('txt','statuts'); A(/ARTICLE 1/.test(r.s)&&/BATI-SUD CONSTRUCTION/.test(r.s),'Texte : le contenu du document');
  r=await octets('html','statuts'); A(/^<!doctype html>/.test(r.s)&&/BATI-SUD/.test(r.s),'Page web : fichier HTML autonome');
  r=await octets('csv','souscripteurs'); A(/;/.test(r.s)&&/Karim Benali/.test(decodeURIComponent(escape(r.s))),'CSV : les tableaux, point-virgule');

  /* visionneuse : menu Enregistrer sous */
  await ev((id)=>espDocVoir(id,'statuts'),id); await p.waitForTimeout(400);
  r=await ev(()=>{ const f=document.getElementById('ov-f'); const items=[...f.querySelectorAll('.sv-it b')].map(x=>x.textContent); return {btn:/Enregistrer sous/.test(f.textContent),items,ancien:!!f.querySelector('#doc-dl-menu')}; });
  A(r.btn&&r.items.includes('PDF')&&r.items.includes('Excel (.xlsx)')&&r.items.includes('Word (.docx)')&&r.items.includes('Dans le coffre du client')&&r.items.includes('Version dans le dossier')&&!r.ancien,'visionneuse : menu « Enregistrer sous » (formats + coffre + version)',JSON.stringify(r));
  await p.click('#ov-f .sv-wrap > .btn'); await p.waitForTimeout(150);
  r=await ev(()=>{ const m=document.querySelector('#ov-f .sv-menu'); const R=m.getBoundingClientRect(); return {vis:m.classList.contains('show'),top:R.top,bottom:R.bottom,h:innerHeight}; });
  A(r.vis&&r.top>=0&&r.bottom<=r.h,'le menu s’ouvre et tient dans l’écran',JSON.stringify(r));
  await ev(()=>{ window.__ecrit=null; });
  await p.click('#ov-f .sv-it:has(b:text-is("PDF"))'); await p.waitForTimeout(600);
  r=await ev(()=>({e:window.__ecrit,f:svDernier.fmt}));
  A(r.e&&/Projet de statuts/.test(r.e.nom)&&r.f==='pdf','clic sur PDF dans la visionneuse : le statut est enregistré',JSON.stringify(r));
  /* coffre */
  const n=await ev(()=>svCoffre());
  r=await ev((id)=>{ const o=JSON.parse(localStorage.getItem('last-svc')||'{}'); const it=((o.coffre||{}).items||[]).filter(x=>x.dosId===id); return {n:it.length,k:it[0]&&it[0].docKey,pdf:it[0]&&/\.pdf$/.test(it[0].nom)}; },id);
  A(n===1&&r.n===1&&r.k==='statuts'&&r.pdf,'versé au coffre du client en PDF, rattaché au dossier et au document',JSON.stringify(r));
  await ev(()=>closeModal());

  /* carte des documents : Enregistrer sous… et Tout enregistrer sous… */
  r=await ev((id)=>{ const h=docFolderCard(DB.dossiers.find(x=>x.id===id)); return {un:h.includes("svDialogue('"+id+"','statuts')"),tout:h.includes("svDialogue('"+id+"','*')")}; },id);
  A(r.un&&r.tout,'carte des documents : « Enregistrer sous… » par document et « Tout enregistrer sous… »',JSON.stringify(r));
  await ev((id)=>svDialogue(id,'souscripteurs'),id); await p.waitForTimeout(250);
  r=await ev(()=>({nom:(document.getElementById('sv-nom')||{}).value,f:[...document.querySelectorAll('input[name=sv-fmt]')].map(x=>x.value)}));
  A(/^Liste des souscripteurs d.actions - BATI-SUD CONSTRUCTION/.test(r.nom||'')&&r.f.join(',')==='pdf,docx,xlsx,html,txt,csv','fenêtre « Enregistrer sous » : nom proposé et six formats',JSON.stringify(r));
  await ev(()=>{ document.getElementById('sv-nom').value='Souscripteurs BSC'; document.querySelector('input[name=sv-fmt][value=xlsx]').checked=true; window.__ecrit=null; });
  await ev((id)=>svDialogueValider(id,'souscripteurs'),id); await p.waitForTimeout(500);
  r=await ev(()=>window.__ecrit);
  A(r&&r.nom==='Souscripteurs BSC.xlsx','le nom saisi et le format choisi sont respectés',JSON.stringify(r));
  await ev((id)=>{ window.__ecrit=null; return svTout(id,'pdf'); },id); await p.waitForTimeout(300);
  r=await ev(async()=>{ const a=new Uint8Array(await window.__svBlob.arrayBuffer()); let s=''; for(let i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return {zip:s.startsWith('PK'),pdf:(s.match(/\.pdf/g)||[]).length,nom:svDernier.nom}; });
  A(r.zip&&r.pdf>=14&&/^Documents - BATI-SUD CONSTRUCTION - PDF/.test(r.nom),'tous les documents du dossier en une archive de PDF',JSON.stringify(r));

  /* fiche technique de création : même menu */
  await ev((f)=>{ window.__formData=f; state.page='formulaire'; render(); formFicheOuvrir(); },FORM(new Date().getFullYear())); await p.waitForTimeout(400);
  r=await ev(()=>({menu:!!document.querySelector('#ov-f .sv-wrap'),version:/Version dans le dossier/.test((document.querySelector('#ov-f .sv-menu')||{}).textContent||'')}));
  A(r.menu&&!r.version,'fiche technique de création : menu « Enregistrer sous » (sans version, pas encore de dossier)',JSON.stringify(r));
  r=await ev(async()=>{ await svEnregistrer('pdf'); const a=new Uint8Array(await window.__svBlob.arrayBuffer()); let s=''; for(let i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return {pdf:s.startsWith('%PDF'),txt:s.includes('(FICHE ')||s.includes('(Fiche ')}; });
  A(r.pdf&&r.txt,'fiche technique enregistrée en PDF',JSON.stringify(r));
  await ev(()=>closeModal());

  A(!errs.length,'aucune erreur de page',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
