/**
 * Mar'q — Contrôle 360° et rapport d'anomalies (v723)
 *
 * Six blocs notés sur 100 (juridique, fiscal, social, pièces, conformité,
 * dépôt). Chaque point en défaut devient une anomalie critique, majeure ou
 * mineure. Le test fige : les règles de chaque bloc, l'entrée des critiques
 * dans le verrou de dépôt (v722), le rapport envoyé au client (seules les
 * demandes qui le concernent, jamais sans relecture), et la place de la carte.
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
  const find=(k,R)=>{ for(const b of R.blocs) for(const p of b.points) if(b.k+'.'+p.k===k) return p; return null; };
  await ev(()=>{ window.__find=(k,R)=>{ for(const b of R.blocs) for(const p of b.points) if(b.k+'.'+p.k===k) return p; return null; }; });

  // ---------- 1. la grille ----------
  let r=await ev(()=>{ const m=window.__mk('sas'); window.__id=m.id; const R=controle360(m.id);
    return {blocs:R.blocs.map(b=>b.titre),scores:R.blocs.map(b=>b.score),score:R.score,n:R.compte,
      id:__find('pieces.identite',R),tv:__find('fiscal.tva',R),pres:__find('social.president',R)}; });
  A(r.blocs.join()==='Juridique,Fiscal,Social,Pièces,Conformité,Dépôt','six blocs, dans l’ordre du cabinet',r.blocs.join());
  A(r.scores.every(s=>s===null||(s>=0&&s<=100))&&r.score>=0&&r.score<=100,'chaque bloc et le dossier ont un score sur 100',JSON.stringify(r.scores)+' '+r.score);
  A(r.id&&r.id.etat==='ko'&&r.id.grav==='critique'&&r.id.client,'dossier neuf : pièce d’identité absente → critique, à demander au client',JSON.stringify(r.id));
  A(r.tv&&r.tv.etat==='ko'&&r.tv.grav==='majeure','régime de TVA non choisi → majeure (l’ancien contrôle le laissait toujours « à définir »)',JSON.stringify(r.tv));
  A(r.pres&&r.pres.etat==='ok','président de SAS : assimilé salarié déduit de la forme',JSON.stringify(r.pres));

  // ---------- 2. juridique ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id), c=clientById(d.clientIds[0]);
    const cap0=d.intake.societe.capital, ccap=c.capital, obj=d.intake.societe.objet, den=d.intake.societe.denomination, ap=d.intake.associes[0].apport;
    d.intake.societe.capital=''; c.capital=0; const a=__find('juridique.capital',controle360(d));
    d.intake.societe.capital=cap0; c.capital=ccap;
    d.intake.societe.objet='Conseil'; const o=__find('juridique.objet',controle360(d)); d.intake.societe.objet=obj;
    d.intake.societe.denomination='SOC  SAS'; const f=__find('juridique.orthographe',controle360(d)); d.intake.societe.denomination=den;
    d.intake.associes[0].apport='2500'; const rp=__find('juridique.repartition',controle360(d)); d.intake.associes[0].apport=ap;
    const ok=controle360(d); return {a,o,f,rp,rep:__find('juridique.repartition',ok),obj:__find('juridique.objet',ok),ortho:__find('juridique.orthographe',ok)}; });
  A(r.a.etat==='ko'&&r.a.grav==='critique'&&/capital/.test(r.a.demande),'capital manquant → critique',JSON.stringify(r.a));
  A(r.o.etat==='ko'&&r.o.grav==='majeure'&&/trop vague/.test(r.o.demande),'objet social trop court → majeure « objet social incomplet »',JSON.stringify(r.o));
  A(r.f.etat==='ko'&&r.f.grav==='mineure'&&/espace en double/.test(r.f.detail),'faute de frappe dans la dénomination → mineure',JSON.stringify(r.f));
  A(r.rp.etat==='ko'&&r.rp.grav==='majeure'&&/4\s?500/.test(r.rp.detail),'apports qui ne font pas le capital → majeure',JSON.stringify(r.rp));
  A(r.rep.etat==='ok'&&r.obj.etat==='ok'&&r.ortho.etat==='ok','une fois corrigé, chaque point repasse au vert');

  // ---------- 3. fiscal et social ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    d.fiscal={tva:'franchise'}; d.intake.profil={caPrev:'120000',activiteType:'commerciale'};
    const fr=__find('fiscal.franchise',controle360(d));
    d.intake.profil={caPrev:'30000',activiteType:'commerciale'}; const fr2=__find('fiscal.franchise',controle360(d));
    d.fiscal={tva:'rs',regimeSocial:'tns'}; const R=controle360(d); const pr=__find('social.president',R), tv=__find('fiscal.tva',R);
    d.fiscal={tva:'rs'}; delete d.intake.profil;
    const m=window.__mk('sarl'); const s=DB.dossiers.find(x=>x.id===m.id); s.fiscal={regimeSocial:'assimile'};
    const g=__find('social.gerant',controle360(s)); s.fiscal={regimeSocial:'tns'}; const g2=__find('social.gerant',controle360(s));
    const ps=__find('social.president',controle360(s));
    return {fr,fr2,pr,tv,g,g2,ps}; });
  A(r.fr.etat==='ko'&&/120\s?000/.test(r.fr.detail),'franchise en base avec un CA prévu au-delà du seuil → anomalie',JSON.stringify(r.fr));
  A(r.fr2.etat==='ok','franchise en base sous le seuil → conforme',JSON.stringify(r.fr2));
  A(r.pr.etat==='ko'&&r.tv.etat==='ok','président de SAS déclaré TNS → incohérence relevée ; TVA choisie → conforme',JSON.stringify([r.pr,r.tv]));
  A(r.g.etat==='ko'&&/attendu : travailleur non salarié/.test(r.g.detail),'gérant majoritaire de SARL (60 %) déclaré assimilé → incohérence',JSON.stringify(r.g));
  A(r.g2.etat==='ok'&&r.ps.etat==='na','gérant TNS → conforme ; le point « président » est sans objet en SARL',JSON.stringify([r.g2,r.ps]));

  // ---------- 4. le dossier complet, et le verrou de dépôt ----------
  await ev(()=>{ window.__mener=function(id){ const d=DB.dossiers.find(x=>x.id===id);
    trwValider(id,'demande');
    d.attachments=[{name:'cni-lambert.jpg',msgId:'x'},{name:'edf-domicile.pdf',msgId:'x'},{name:'rib.pdf',msgId:'x'}];
    enregPieces(d).forEach(pc=>{ if(pc.origine==='client') enregPieceToggle(id,pc.k,true); });
    [...new Set(e2Pieces(d).map(a=>demAttCat(a).key))].forEach(k=>e3Certifier(id,k)); trwValider(id,'pieces');
    docGenAll(id); docApproveAll(id);
    ['juridique','orthographe','fiscal','activite','capital'].forEach(k=>chPoint(id,k,true)); chVerdict(id,'conforme');
    a3ToutSigner(id); trwValider(id,'actes');
    d.attest=d.attest||{}; ['capital','annonce'].forEach(t=>{ d.attest[t]=d.attest[t]||{}; d.attest[t].fichier={name:t+'.pdf',ts:Date.now()}; at4Valider(id,t); });
    trwValider(id,'attestations'); return d; }; });
  r=await ev(async()=>{ const m=window.__mk('sas'); const d=window.__mener(m.id); window.__id2=d.id; d.fiscal={tva:'rs'};
    await conformiteDesigner('Léa MARTIN','482913','482913');
    const R=controle360(d); const avant=zeroDefaut(d);
    return {crit:R.compte.critique,pieces:R.blocs[3].score,zd:avant.anomalies.map(a=>a.k)}; });
  A(r.crit===0,'dossier mené à l’étape Immatriculation : aucune anomalie critique',JSON.stringify(r));
  A(r.zd.length===1&&r.zd[0]==='niveau2','le zéro défaut n’ajoute rien : seul le niveau 2 manque encore',JSON.stringify(r.zd));

  r=await ev(async()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2);
    d.verif=d.verif||{}; d.verif.extract=d.verif.extract||{}; d.verif.extract.dateExpiration='01/01/2020';
    const R=controle360(d), id=__find('pieces.identite',R), Z=zeroDefaut(d);
    const v=await conformiteValider(d.id,'482913');
    im5Depose(d.id); const modal=(document.getElementById('ov')||{}).textContent||''; try{ closeModal(); }catch(e){}
    return {id,k:Z.anomalies.map(a=>a.k),pret:Z.pretN2,v,depose:!!(d.immat&&d.immat.depose),modal:/Pièce d’identité/.test(modal)}; });
  A(r.id.etat==='ko'&&r.id.grav==='critique'&&/expirée/.test(r.id.detail),'pièce d’identité expirée → critique',JSON.stringify(r.id));
  A(r.k.indexOf('360:pieces.identite')>=0&&r.pret===false,'la critique entre dans le zéro défaut : le niveau 2 n’est plus possible',JSON.stringify(r.k));
  A(r.v.ok===false&&r.depose===false&&r.modal,'validation refusée, dépôt refusé, et la fenêtre nomme la pièce',JSON.stringify(r));

  r=await ev(async()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2);
    d.verif.extract.dateExpiration='01/01/2035';
    const obj=d.intake.societe.objet; d.intake.societe.objet='Agence immobilière : transactions immobilières et gestion locative';
    const c=clientById(d.clientIds[0]); const ca=c.activites; c.activites=[d.intake.societe.objet];
    const R=controle360(d); const reg=__find('conformite.reglementee',R), au=__find('conformite.autorisation',R);
    const k1=zeroDefaut(d).anomalies.map(a=>a.k);
    c360Autorisation(d.id,true); const au2=__find('conformite.autorisation',controle360(d)); const k2=zeroDefaut(d).anomalies.map(a=>a.k);
    const hist=(d.historique||[]).some(h=>/Autorisation d’exercice vérifiée/.test(h.t));
    c360Autorisation(d.id,false); d.intake.societe.objet=obj; c.activites=ca;
    return {reg,au,k1,au2,k2,hist}; });
  A(r.reg.etat==='warn'&&/immobilier/.test(r.reg.detail),'activité réglementée repérée dans l’objet (immobilier)',JSON.stringify(r.reg));
  A(r.au.etat==='ko'&&r.au.grav==='critique'&&r.k1.indexOf('360:conformite.autorisation')>=0,'sans autorisation vérifiée → critique, dépôt bloqué',JSON.stringify([r.au,r.k1]));
  A(r.au2.etat==='ok'&&r.k2.indexOf('360:conformite.autorisation')<0&&r.hist,'« Autorisation vérifiée » lève le blocage, et c’est tracé',JSON.stringify([r.au2,r.k2]));

  r=await ev(async()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2);
    const v=await conformiteValider(d.id,'482913'); const R=controle360(d);
    im5Depose(d.id); try{ closeModal(); }catch(e){}
    return {v,finale:__find('depot.finale',R),depose:!!(d.immat&&d.immat.depose)}; });
  A(r.v.ok&&r.finale.etat==='ok'&&r.depose,'tout levé : niveau 2 validé, validation finale au vert, dépôt constaté',JSON.stringify(r));

  // ---------- 5. le rapport au client ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    d.intake.societe.objet='Conseil'; const M=c360Mail(d.id);
    const R=controle360(d);
    const interne=R.anomalies.filter(a=>!a.client).map(a=>a.lbl);
    return {M,interne,pc:R.pourClient.length}; });
  A(r.M.to==='s.lambert@logis.fr','le rapport part à l’adresse du client',r.M.to);
  A(/^Bonjour Mme LAMBERT,/.test(r.M.corps)&&/À traiter en priorité/.test(r.M.corps)&&/Important/.test(r.M.corps)&&/pièce d’identité/.test(r.M.corps),'message rédigé par gravité, avec les demandes concrètes',r.M.corps.slice(0,300));
  A(r.M.n===r.pc&&r.interne.length>0&&r.interne.every(l=>r.M.corps.indexOf(l)<0),'seules les demandes adressées au client y figurent, jamais les points internes',JSON.stringify(r.interne));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    const sent=[]; const _s=window.demEnvoiSilencieux; window.demEnvoiSilencieux=function(to,s,c){ sent.push({to,s,c}); return true; };
    c360OuvrirEnvoi(d.id); const ov=document.getElementById('ov'); const vis=!!(ov&&document.getElementById('c360-corps'));
    document.getElementById('c360-to').value='pas-une-adresse'; const refus=c360Envoyer(d.id);
    const avantEnvoi=sent.length;
    document.getElementById('c360-to').value='s.lambert@logis.fr';
    document.getElementById('c360-corps').value+='\nPS : relu par le gestionnaire.';
    const okEnv=c360Envoyer(d.id); window.demEnvoiSilencieux=_s;
    const env=(d.c360&&d.c360.envois||[])[0]||{};
    return {vis,refus,avantEnvoi,okEnv,sent:sent.length,ps:sent[0]&&/relu par le gestionnaire/.test(sent[0].c),env,
      hist:(d.historique||[]).some(h=>/Rapport d’anomalies envoyé/.test(h.t)),audit:(DB.audit||[]).some(a=>a.action==='Contrôle 360°'&&/envoyé/.test(a.detail||a.details||''))}; });
  A(r.vis,'« Envoyer au client » ouvre d’abord le message à relire');
  A(r.refus===false&&r.avantEnvoi===0,'une adresse invalide est refusée, rien ne part',JSON.stringify(r));
  A(r.okEnv&&r.sent===1&&r.ps,'le message part tel que relu et modifié par le gestionnaire',JSON.stringify(r));
  A(r.env.to==='s.lambert@logis.fr'&&r.env.n>0&&r.hist&&r.audit,'envoi daté au dossier, à l’historique et au journal d’audit',JSON.stringify(r));

  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2); try{ closeModal(); }catch(e){}
    const eff=__find('social.effectif',controle360(d)); d.intake.societe.effectif='0';
    const M=c360Mail(d.id); window.__toasts=[]; document.getElementById('ov-b').innerHTML=''; c360OuvrirEnvoi(d.id);
    const ov=document.getElementById('c360-corps');
    let html=''; const _o=window.open; window.open=()=>({document:{write(h){ html+=h; },close(){}},focus(){}}); c360Imprimer(d.id); window.open=_o;
    return {eff,n:M.n,modal:!!ov,toast:window.__toasts.join(' | '),imp:/Rapport d’anomalies/.test(html)&&/Scores par bloc/.test(html)}; });
  A(r.eff.etat==='ko'&&r.eff.grav==='mineure','effectif prévisionnel absent → mineure, à demander au client',JSON.stringify(r.eff));
  A(r.n===0&&!r.modal&&/Rien à demander/.test(r.toast),'dossier sans demande au client : rien n’est envoyé',JSON.stringify(r));
  A(r.imp,'le rapport s’imprime (scores par bloc et anomalies)');

  // ---------- 6. l'écran ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id);
    state.page='espace'; state.espaceDossier=d.id; const out={};
    ['demande','pieces','actes','attestations','immatriculation','cloture'].forEach(t=>{ d.wf=d.wf||{}; state.espTab=t; render();
      const v=document.getElementById('view'); const p=v.querySelector('.esp-tabpanel[data-tab="'+t+'"]');
      const c=v.querySelector('.mq-360-card');
      out[t]={onglet:state.espTab,carte:!!c,dans:!!(c&&p&&p.contains(c)),premier:!!(c&&p&&p.firstElementChild===c),h:c?c.getBoundingClientRect().height:0,
        blocs:c?c.querySelectorAll('.mq-360-bloc').length:0,score:c?(c.querySelector('.mq-360-score')||{}).textContent:'',
        auto:((p&&p.querySelector('.mq-ch-auto'))||{}).textContent||''}; });
    return out; });
  const vus=Object.keys(r).filter(t=>r[t].carte);
  A(r.pieces.onglet==='pieces'&&r.pieces.carte&&r.pieces.premier&&r.pieces.h>0,'la carte est en tête de l’onglet Pièces, visible',JSON.stringify(r.pieces));
  A(r.pieces.blocs===6&&/\/ 100/.test(r.pieces.score),'six blocs et le score du dossier',JSON.stringify(r.pieces));
  A(vus.every(t=>r[t].onglet==='pieces'||r[t].onglet==='actes'),'elle n’apparaît que dans les onglets Pièces et Actes',JSON.stringify(vus.map(t=>t+'→'+r[t].onglet)));
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===window.__id2); state.page='espace'; state.espaceDossier=d.id; state.espTab='actes'; render();
    const v=document.getElementById('view'), p=v.querySelector('.esp-tabpanel[data-tab="actes"]'); const c=p&&p.querySelector('.mq-360-card');
    return {onglet:state.espTab,premier:!!(c&&p.firstElementChild===c),auto:((p&&p.querySelector('.mq-ch-auto'))||{}).textContent||''}; });
  A(r.premier,'en tête de l’onglet Actes aussi',JSON.stringify(r));
  A(/Contrôle 360°/.test(r.auto)&&!/Contrôle automatique/.test(r.auto),'le contrôle humain affiche le score 360° au lieu de l’ancien score à trois agents',r.auto);

  // ---------- 7. pas de boucle entre le 360 et le zéro défaut ----------
  r=await ev(()=>{ const t0=Date.now(); let ok=true; try{ for(let i=0;i<20;i++){ DB.dossiers.forEach(d=>{ dossierStatuts(d); zeroDefaut(d); controle360(d); }); } }catch(e){ ok=String(e); }
    return {ok,ms:Date.now()-t0,n:DB.dossiers.length}; });
  A(r.ok===true,'statuts, zéro défaut et 360 s’appellent sans boucle',JSON.stringify(r));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
