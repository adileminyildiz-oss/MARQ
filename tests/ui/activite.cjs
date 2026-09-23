/**
 * Mar'q — Pièces demandées selon l'activité (v725)
 *
 * L'objet social est analysé : une activité réglementée (bâtiment,
 * restauration, transport, immobilier…) ajoute ses pièces à la demande. Le
 * test fige : la détection et ses faux amis, les pièces ajoutées et leur
 * circuit (carte, message, lien de dépôt, portail), le lien avec le contrôle
 * 360° et le zéro défaut, et les corrections du gestionnaire.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  p.on('dialog',d=>d.accept());
  await p.goto(URL_APP);
  await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'test'; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.open=()=>({close(){},focus(){},document:{write(){},close(){}}}); try{ ['demandes','agenda','fiscal','formulaire','espace'].forEach(id=>modPauseSet(id,false)); }catch(e){}
  DB.demandes=[]; DB.dossiers=[]; DB.clients=[]; DB.factures=DB.factures||[]; DB.parametres.formDrafts=[];
  // fabrique de dossiers complets via le Formulaire
  window.__mk=function(type,extra){ formReset(); formNature('creation'); formType(type); const o=window.__formData; const den=(extra&&extra.den)||('SOC '+type.toUpperCase());
    Object.assign(o,{societe:{denomination:den,capital:'5000',objet:'Location de logements meublés',debut:'2026-10-01',regime:'IS'},titres:{nominal:'10',nbTitres:'500'},apports:{numeraire:'5000',nature:'0'},siege:{rue:'14 rue des Jacobins',cp:'80000',ville:'Amiens',type:'domiciliation'},direction:{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'14 rue des Jacobins 80000 Amiens',fonction:''},dirx:{pereNom:'Jean LAMBERT',mereNom:'Marie DURAND',secu:'288038002104512',typePiece:'cni'},contact:{email:'s.lambert@logis.fr',tel:'0612345678'},dates:{dateActe:'2026-09-14',villeSignature:'Amiens'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'5000',date:'2026-09-10'},
      associes:(type==='sasu'||type==='eurl')?[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'500',apport:'5000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'}]:[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'300',apport:'3000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'},{civilite:'M.',prenom:'Marc',nom:'LAMBERT',parts:'200',apport:'2000',naissance:'1985-07-02',lieuNaissance:'Lille',pays:'France',nationalite:'Française',adresse:'Lille'}]});
    const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id,ref:d&&(d.numeroDossier||d.ref)}; };
  window.__mkModif=function(kind){ formReset(); formNature('modification'); formModifKind(kind); const o=window.__formData; o.contact={email:'eric@garage-dupont.fr',tel:'0611223344'}; o.modif={kind,societe:{denomination:'GARAGE DUPONT',forme:'sarl',siren:'812345678',rcsVille:'Amiens',siege:'5 rue Neuve',cp:'80000',ville:'Amiens'},dates:{acte:'2026-09-14',effet:'2026-10-01',ville:'Amiens'},signataire:{prenom:'Éric',nom:'DUPONT'},nouveau:{siege:'3 quai du Canal',cp:'80000',ville:'Amiens',prenom:'Paul',nom:'DUPONT',naissance:'1990-01-01',adresse:'Amiens',denomination:'GARAGE DUPONT & FILS',objet:'Réparation automobile',capital:'20000',formeNouvelle:'sas',cedant:'Éric DUPONT',cessionnaire:'Paul DUPONT',nbTitres:'100',prix:'10000',liquidateur:'Éric DUPONT',siegeLiquidation:'Amiens',dateClotureLiq:'2026-12-31',ancienneCloture:'31/12',nouvelleCloture:'30/06'}}; const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id}; };
});

  // ---------- 1. un dossier neuf ne part pas ----------
  const keys=L=>L.map(p=>p.k).filter(k=>/^act_/.test(k)).sort().join(',');
  // ---------- 1. activité ordinaire : rien ne change ----------
  let r=await ev(()=>{ const m=window.__mk('sas'); window.__id=m.id; const d=DB.dossiers.find(x=>x.id===m.id);
    const A=activiteAnalyse(d); return {f:A.familles.length,p:A.pieces.length,act:piecesRequises(d).filter(p=>/^act_/.test(p.k)).length,lien:/&x=/.test(depotLien(d))}; });
  A(r.f===0&&r.p===0&&r.act===0&&!r.lien,'location meublée : aucune pièce ajoutée, lien de dépôt inchangé',JSON.stringify(r));

  // ---------- 2. BTP ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id); d.intake.societe.objet='Travaux de maçonnerie et gros œuvre';
    const A=activiteAnalyse(d), L=piecesRequises(d), E=enregPieces(d).filter(p=>/^act_/.test(p.k));
    const u=depotLien(d), x=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(u.split('&x=')[1])))));
    return {fam:A.actives.map(f=>f.k),keys:L.filter(p=>/^act_/.test(p.k)).map(p=>p.k),orig:E.map(p=>p.origine),note:E[0]&&E[0].note,x:x.map(p=>p[0])}; });
  A(r.fam.join()==='btp','« maçonnerie et gros œuvre » : activité du bâtiment repérée',JSON.stringify(r.fam));
  A(r.keys.join()==='act_decennale,act_carte_btp,act_qualif_btp','trois pièces ajoutées : décennale, carte BTP, qualification',JSON.stringify(r.keys));
  A(r.orig.every(o=>o==='client')&&/Exigée pour l’activité : Bâtiment/.test(r.note),'elles sont à recevoir du client, avec la raison de la demande',JSON.stringify(r));
  A(r.x.join()===r.keys.join(),'le lien de dépôt du client les porte',JSON.stringify(r.x));

  // ---------- 3. restaurant avec bar, et faux amis ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id); const o=d.intake.societe.objet;
    function f(t){ d.intake.societe.objet=t; const A=activiteAnalyse(d); return {fam:A.actives.map(x=>x.k).join(),p:A.pieces.map(x=>x.k).join(),n:A.pieces.length,deux:(A.pieces.filter(x=>x.k==='act_form_expl')[0]||{familles:[]}).familles.length}; }
    const out={resto:f('Restaurant traditionnel et bar licence IV'),meubles:f('Restauration de meubles anciens'),bat:f('Gestion de bâtiments et de copropriétés'),
      transp:f('Transport routier de marchandises'),vtc:f('Chauffeur VTC'),immo:f('Agence immobilière : transactions et gestion locative')};
    d.intake.societe.objet=o; return out; });
  A(r.resto.fam==='restauration,boissons'&&r.resto.n===3&&r.resto.deux===2,'restaurant avec bar : formation d’exploitant demandée une seule fois, hygiène et licence en plus',JSON.stringify(r.resto));
  A(r.meubles.n===0&&r.bat.n===0,'« restauration de meubles » et « gestion de bâtiments » ne déclenchent rien',JSON.stringify([r.meubles,r.bat]));
  A(/act_capacite_transp/.test(r.transp.p)&&/act_registre_transp/.test(r.transp.p)&&r.vtc.p==='act_carte_vtc','transport : capacité et registre ; VTC : carte professionnelle',JSON.stringify([r.transp,r.vtc]));
  A(r.immo.p==='act_carte_immo,act_garantie,act_rcp','immobilier : carte professionnelle, garantie financière, responsabilité civile',r.immo.p);

  // ---------- 4. les libellés ne se confondent pas avec d'autres pièces ----------
  r=await ev(()=>{ const bad=[]; ACTIVITES_REGLEMENTEES.forEach(f=>f.pieces.forEach(p=>{ const c0=demAttGuess(p.label+'.pdf'), c=c0&&(c0.key||c0); if(c&&c!=='autre') bad.push(p.label+' → '+c); })); return bad; });
  A(r.length===0,'aucun libellé n’est pris pour une pièce d’identité, un K-bis ou une attestation de capital',JSON.stringify(r));

  // ---------- 5. une modification sans changement d'activité ----------
  r=await ev(()=>{ const m=window.__mkModif('siege'); const d=DB.dossiers.find(x=>x.id===m.id); d.intake.societe=Object.assign({},d.intake.societe,{objet:'Plomberie et chauffage'});
    const A=activiteAnalyse(d); return {app:A.applicable,n:A.pieces.length}; });
  A(r.app===false&&r.n===0,'transfert de siège : l’activité ne change pas, rien n’est ajouté',JSON.stringify(r));

  // ---------- 6. réception, contrôle 360° et zéro défaut ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    const c0=controle360(d); const au0=c0.blocs.filter(b=>b.k==='conformite')[0].points.filter(p=>p.k==='autorisation')[0];
    const z0=zeroDefaut(d).anomalies.map(a=>a.k);
    enregPieceToggle(d.id,'act_decennale',true); d.piecesRecues=Object.assign(d.piecesRecues||{},{act_carte_btp:true});
    const A1=activiteAnalyse(d);
    enregPieceToggle(d.id,'act_qualif_btp',true);
    const c1=controle360(d); const au1=c1.blocs.filter(b=>b.k==='conformite')[0].points.filter(p=>p.k==='autorisation')[0];
    const reg=c1.blocs.filter(b=>b.k==='conformite')[0].points.filter(p=>p.k==='reglementee')[0];
    const z1=zeroDefaut(d).anomalies.map(a=>a.k);
    const M=c360Mail(d.id);
    return {au0,z0:z0.indexOf('360:conformite.autorisation')>=0,manq1:A1.manquantes.map(p=>p.k),au1,reg:reg.detail,z1:z1.indexOf('360:conformite.autorisation')>=0}; });
  A(r.au0.etat==='ko'&&r.au0.grav==='critique'&&/décennale/.test(r.au0.detail)&&/assurance décennale/.test(r.au0.demande),'360 : les pièces manquantes sont nommées, et demandées au client',JSON.stringify(r.au0));
  A(r.z0,'tant qu’elles manquent, le dépôt reste bloqué',JSON.stringify(r));
  A(r.manq1.join()==='act_qualif_btp','une pièce cochée ou déposée par le portail compte comme reçue',JSON.stringify(r.manq1));
  A(r.au1.etat==='ok'&&/pièces reçues/.test(r.au1.detail)&&!r.z1&&/bâtiment/.test(r.reg),'toutes reçues : le point « Autorisations » passe au vert et ne bloque plus le dépôt',JSON.stringify(r.au1));

  // ---------- 7. les corrections du gestionnaire ----------
  r=await ev(()=>{ const m=window.__mk('sas'); const d=DB.dossiers.find(x=>x.id===m.id); d.intake.societe.objet='Plomberie, chauffage et rénovation'; window.__id2=m.id;
    const a=activiteAnalyse(d).pieces.length;
    activiteExclure(d.id,'btp',true); const b=activiteAnalyse(d); const exclu={n:b.pieces.length,src:b.familles[0].source,req:piecesRequises(d).filter(p=>/^act_/.test(p.k)).length};
    activiteExclure(d.id,'btp',false); const c=activiteAnalyse(d).pieces.length;
    activiteAjouter(d.id,'transport'); const e=activiteAnalyse(d).pieces.map(p=>p.k);
    activiteRetirerAjout(d.id,'transport'); const f=activiteAnalyse(d).pieces.length;
    return {a,exclu,c,e,f,hist:(d.historique||[]).filter(h=>/Activité (écartée|rétablie|ajoutée|retirée)/.test(h.t)).length,
      audit:(DB.audit||[]).filter(x=>x.action==='Pièces selon l’activité').length}; });
  A(r.a===3&&r.exclu.n===0&&r.exclu.src==='exclue'&&r.exclu.req===0,'« Pas cette activité » retire ses pièces de la demande',JSON.stringify(r));
  A(r.c===3&&r.e.indexOf('act_capacite_transp')>=0&&r.f===3,'rétablir, ajouter une activité, puis la retirer',JSON.stringify(r));
  A(r.hist===4&&r.audit>=4,'chaque correction est à l’historique et au journal d’audit',JSON.stringify(r));

  // ---------- 8. le message de demande de pièces ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2); let t=''; try{ const x=depotMsgResolve(d); t=typeof x==='string'?x:JSON.stringify(x); }catch(e){ t='ERR '+e; }
    return {deca:/assurance décennale/.test(t),lien:/&x=/.test(t)}; });
  A(r.deca,'le message de demande de pièces liste la décennale',JSON.stringify(r));

  // ---------- 9. écrans ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2); state.page='espace'; state.espaceDossier=d.id; d.wf=d.wf||{}; d.wf.demande=d.wf.demande||Date.now();
    state.espTab='pieces'; render(); const v=document.getElementById('view'), p=v.querySelector('.esp-tabpanel[data-tab="pieces"]');
    const c=p&&p.querySelector('.mq-act-card'), att=p&&p.querySelector('.fi-attendues');
    const out={onglet:state.espTab,carte:!!c,avant:!!(c&&att&&c.compareDocumentPosition(att)&Node.DOCUMENT_POSITION_FOLLOWING),h:c?c.getBoundingClientRect().height:0,
      pcs:c?c.querySelectorAll('.mq-act-pcs li').length:0,attDeca:!!(att&&/assurance décennale/.test(att.textContent))};
    state.espTab='demande'; render(); out.ailleurs=!!document.querySelector('#view .mq-act-card');
    return out; });
  A(r.onglet==='pieces'&&r.carte&&r.avant&&r.h>0&&r.pcs===3,'onglet Pièces : la carte « Pièces selon l’activité » précède les pièces attendues',JSON.stringify(r));
  A(r.attDeca&&!r.ailleurs,'la décennale figure dans « Pièces attendues » ; la carte n’est pas ailleurs',JSON.stringify(r));

  r=await ev(()=>{ state.page='formulaire'; render(); formSet('societe.objet','Pizzeria et vente de plats à emporter'); render();
    const b=document.querySelector('#view .mq-act-apercu'); return {vu:!!b&&b.style.display!=='none',t:b?b.textContent:''}; });
  A(r.vu&&/Restauration/.test(r.t)&&/hygiène/.test(r.t),'Formulaire : dès l’objet social saisi, Mar’q annonce les pièces qui seront demandées',r.t);

  // ---------- 10. le portail de dépôt ----------
  const base=URL_APP.replace(/index\.html.*$/,'depot.html');
  const p2=await b.newPage();
  async function nb(q){ await p2.goto(base+q); return p2.evaluate(()=>[...document.querySelectorAll('.piece b')].map(x=>x.textContent)); }
  const enc=a=>encodeURIComponent(Buffer.from(JSON.stringify(a),'utf8').toString('base64'));
  const sans=await nb('?d=DOS-1&k=t');
  const avec=await nb('?d=DOS-1&k=t&x='+enc([['act_decennale','Attestation d’assurance décennale','x'],['evil','Pièce pirate',''],['act_x"><img','z','']]));
  A(sans.length===4,'portail sans activité : les quatre pièces habituelles',JSON.stringify(sans));
  A(avec.length===5&&avec[4]==='Attestation d’assurance décennale','portail : la décennale s’ajoute ; une clé étrangère est ignorée',JSON.stringify(avec));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
