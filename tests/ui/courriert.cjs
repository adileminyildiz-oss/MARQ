const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(2200);

  await pg.evaluate(()=>{
    DB.clients=(DB.clients||[]).filter(x=>x.id!=='cv1');
    DB.clients.push({id:'cv1',clientType:'societe',denomination:'NOVA TP',forme:'sas',siren:'111222333',
      siret:'11122233300018',capital:'10000',ape:'4321A',tva:'FR90111222333',objet:'Travaux électriques',
      siege:'5 rue du Port',cp:'75012',ville:'Paris',president:'Mme Sonia Rives',presidentFonction:'Présidente',
      email:'contact@novatp.fr',tel:'01 44 55 66 77'});
    DB.dossiers=(DB.dossiers||[]).filter(x=>x.id!=='dv1');
    DB.dossiers.push({id:'dv1',ref:'DOS-2026-000444',clientIds:['cv1'],statut:'en cours',formalite:'Création SAS',
      intake:{type:'SAS',societe:{denomination:'NOVA TP'},siege:{},direction:{},contact:{}}});
    DB.demandes=(DB.demandes||[]).filter(x=>x.id!=='qv1');
    DB.demandes.push({id:'qv1',code:'CR-2026-0044',dossierId:'dv1',clientNom:'Sonia Rives',clientEmail:'contact@novatp.fr'});
    DB.parametres.cabinet=Object.assign({},DB.parametres.cabinet||{},{nom:'AEM CONSEIL',email:'aemconseil.sas@gmail.com',tel:'01 00 00 00 00'});
  });

  // contexte
  const cx=await pg.evaluate(()=>{ const d=DB.demandes.find(x=>x.id==='qv1');
    const c=window.courrierContexte(d); return {cl:c.client&&c.client.id, dos:c.dossier&&c.dossier.id}; });
  A(cx.cl==='cv1'&&cx.dos==='dv1','société et dossier retrouvés depuis la demande');

  const cx2=await pg.evaluate(()=>{ const c=window.courrierContexte(DB.dossiers.find(x=>x.id==='dv1'));
    return c.client&&c.client.id; });
  A(cx2==='cv1','société retrouvée depuis un dossier');

  // variables
  const V=await pg.evaluate(()=>{ const d=DB.demandes.find(x=>x.id==='qv1');
    const V=window.courrierVariables(d); const o={}; Object.keys(V).forEach(k=>o[k]=V[k].v); return o; });
  A(V.societe==='NOVA TP','variable société');
  A(V.siren==='111222333'&&V.siret==='11122233300018','variables SIREN et SIRET');
  A(V.dirigeant==='Mme Sonia Rives'&&V.fonction==='Présidente','variables dirigeant et fonction');
  A(V.ville==='Paris'&&V.cp==='75012','variables ville et code postal');
  A(V.tva==='FR90111222333'&&V.ape==='4321A','variables TVA et code APE');
  A(V.dossier==='DOS-2026-000444','variable numéro de dossier');
  A(V.cabinet==='AEM CONSEIL'&&/@/.test(V.cabinetEmail||''),'variables du cabinet');
  A(/\d{2}\/\d{2}\/\d{4}/.test(V.date||''),'variable date du jour');
  A(/\d{4}/.test(V.annee||''),'variable année');

  // résolution
  const r=await pg.evaluate(()=>{ const d=DB.demandes.find(x=>x.id==='qv1');
    return {
      simple:window.courrierResoudre('Société {societe} ({siren}), dirigée par {dirigeant}.',d),
      dos:window.courrierResoudre('Dossier {dossier} — {formalite}',d),
      vide:window.courrierResoudre('Avant\nVotre numéro de TVA : {inexistant}\nAprès',d),
      videVar:window.courrierResoudre('Capital {capital} euros',d)
    }; });
  A(r.simple==='Société NOVA TP (111222333), dirigée par Mme Sonia Rives.','variables remplacées dans une phrase');
  A(/DOS-2026-000444/.test(r.dos)&&/Cr[ée]ation SAS/i.test(r.dos),'dossier et formalité remplacés');
  A(r.vide==='Avant\nVotre numéro de TVA : {inexistant}\nAprès','une variable inconnue reste telle quelle');
  A(/10000/.test(r.videVar),'capital remplacé');

  // ligne supprimée quand la variable est vide
  const vd=await pg.evaluate(()=>{ const d=DB.demandes.find(x=>x.id==='qv1');
    const c=DB.clients.find(x=>x.id==='cv1'); const sv=c.tva; c.tva='';
    const t=window.courrierResoudre('Bonjour\nTVA : {tva}\nCordialement',d); c.tva=sv; return t; });
  A(vd==='Bonjour\nCordialement','une variable sans valeur emporte sa ligne');

  // greffe sur les modèles d'e-mails
  const tpl=await pg.evaluate(()=>{ const d=DB.demandes.find(x=>x.id==='qv1');
    DB.parametres.mailModeles=DB.parametres.mailModeles||{};
    DB.parametres.mailModeles.suivi={label:'Point',sujet:'Dossier {dossier} — {societe}',
      corps:'Bonjour {prenom},\n\nVotre dossier {dossier} ({formalite}) avance.\nÉtape en cours : {etape}.\n\n{cabinet} — {cabinetEmail}'};
    const m=window.mailTplResolve(d,'suivi'); return m; });
  A(/DOS-2026-000444/.test(tpl.sujet)&&/NOVA TP/.test(tpl.sujet),'objet du modèle résolu avec les nouvelles variables');
  A(/Bonjour Sonia/.test(tpl.corps),'les anciennes variables continuent de fonctionner');
  A(/AEM CONSEIL/.test(tpl.corps)&&/aemconseil/.test(tpl.corps),'coordonnées du cabinet insérées');
  A(!/\{/.test(tpl.corps),'aucune variable ne subsiste dans le corps');

  // aide-mémoire
  const aide=await pg.evaluate(()=>{ const d=DB.demandes.find(x=>x.id==='qv1');
    window.courrierAide(d); const m=document.querySelector('.cv-aide');
    return {ok:!!m, txt:m?m.textContent.replace(/[  ]/g,' '):'',
      n:document.querySelectorAll('.cv-t tbody tr').length}; });
  A(aide.ok,'aide-mémoire ouvert');
  A(aide.n>=25,'toutes les variables listées ('+aide.n+')');
  A(/\{societe\}/.test(aide.txt)&&/\{dossier\}/.test(aide.txt),'variables affichées avec leurs accolades');
  A(/NOVA TP/.test(aide.txt),'valeur réelle affichée à côté de chaque variable');
  A(/\{prenom\}/.test(aide.txt),'les variables historiques sont rappelées');

  // sans contexte : rien ne casse
  const nul=await pg.evaluate(()=>{ const V=window.courrierVariables(null);
    const t=window.courrierResoudre('Bonjour {societe} — {cabinet}',null);
    return {cab:V.cabinet.v, soc:V.societe.v, t:t}; });
  A(nul.cab==='AEM CONSEIL'&&nul.soc==='','sans dossier : le cabinet reste connu, la société est vide');
  A(!/\{/.test(nul.t),'aucune variable en suspens sans contexte');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
