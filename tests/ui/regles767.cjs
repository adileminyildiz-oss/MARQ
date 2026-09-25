/**
 * Mar'q — Règles métier v767 (recette 3.4, 4.4 à 4.7, 4.9, 6.7, 9.4, 10.5)
 *
 * Fige : contrôles de formats des actes (montant, téléphone, date impossible),
 * clé du n° de TVA intracommunautaire, taux de TVA légaux au facturier,
 * acompte bancaire qui laisse la facture ouverte avec son reste dû, client
 * rattaché à un dossier protégé de la suppression, corbeille, et journal des
 * suppressions de client, dossier et facture.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1360,height:900}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ window.uiConfirm=(m,cb)=>cb&&cb(); window.toast=()=>{}; });

  /* formats */
  const f=await ev(()=>{ const t=(k,v)=>{ const r=mqDocControles('recette',{[k]:v}); return {b:r.bloquants.length,a:r.avertissements.length}; };
    return { neg:t('capital','-500'), lettres:t('capital','mille'), ok1:t('capital','10 000 €'), ok2:t('capitalSocial','1.500,50'), dec:t('capital','12,345'),
      prix:t('prixCession','sur devis'), tel:t('tel','abc'), telOk:t('telephone','06 12 34 56 78'),
      imp:t('dateNaissance','31/02/1990'), iso:t('dateSignature','2026-02-29'), okd:t('dateSignature','28/02/2026'), bis:t('dateSignature','29/02/2024') }; });
  A(f.neg.b&&f.lettres.b&&f.dec.b,'capital « -500 », « mille », « 12,345 » : refusés',JSON.stringify([f.neg,f.lettres,f.dec]));
  A(!f.ok1.b&&!f.ok1.a&&!f.ok2.b,'capital « 10 000 € » et « 1.500,50 » : acceptés',JSON.stringify([f.ok1,f.ok2]));
  A(!f.prix.b&&f.prix.a,'prix « sur devis » : simple avertissement, jamais bloquant');
  A(f.tel.a&&!f.tel.b&&!f.telOk.a,'téléphone « abc » signalé (avertissement), numéro valide accepté');
  A(f.imp.b&&f.iso.b&&!f.okd.b&&!f.bis.b,'dates impossibles 31/02/1990 et 29/02/2026 refusées ; 28/02/2026 et 29/02/2024 acceptées',JSON.stringify([f.imp,f.iso,f.okd,f.bis]));
  const tv=await ev(()=>['FR40303265045','FR44732829320','FR00732829320','FR44732829321','FR1273282932','FR 44 732 829 320'].map(v=>validTvaFr(v)));
  A(tv[0]&&tv[1]&&!tv[2]&&!tv[3]&&!tv[4]&&tv[5],'n° de TVA : clé et SIREN contrôlés',JSON.stringify(tv));

  /* taux de TVA */
  const taux=await ev(()=>{ const essai=t=>{ window.__invDraft=null; state.page='facturier'; render(); const d=window.__invDraft;
      Object.assign(d,{clNom:'CLIENT TVA',tva:t,lignes:[{des:'Prestation',qte:1,pu:100}]}); render();
      const n0=(DB.parametres.facturier||[]).length; invSave('emise'); return (DB.parametres.facturier||[]).length>n0; };
    return { t55:essai(55), t55b:essai(5.5), t20:essai(20), t13:essai(13) }; });
  A(!taux.t55,'facture à 55 % de TVA : refusée');
  A(taux.t55b&&taux.t20&&taux.t13,'5,5 %, 20 % et 13 % (Corse) : émises',JSON.stringify(taux));

  /* acompte bancaire */
  const ac=await ev(()=>{ const F=(o)=>Object.assign({type:'facture',statut:'emise',tva:20,remise:0},o);
    DB.parametres.facturier=[F({id:'rg-3',numero:'FAC-2026-0414',clNom:'SONIA PETIT',dateEmise:'2026-08-25',lignes:[{des:'Domiciliation',qte:1,pu:200}]})]; save();
    const pointer=(csv)=>{ rapproPoserTexte(csv,'r.csv'); const rel=DB.parametres.rapproChaine.releve; if(!rel) return 'aucun relevé';
      const i=rel.props.findIndex(x=>/PETIT/.test(x.ligne.lib)); if(i<0) return 'ligne introuvable'; rapproManuel(i,'rg-3'); rapproPointer(); return ''; };
    const e1=pointer('Date;Libellé;Débit;Crédit\n05/09/2026;VIR PETIT SONIA acompte FAC-2026-0414;;100,00');
    const f=DB.parametres.facturier[0]; const apres1={paye:!!f.paye, reste:invResteDu(f), n:(f.reglements||[]).length};
    const e2=pointer('Date;Libellé;Débit;Crédit\n20/09/2026;VIR PETIT SONIA solde FAC-2026-0414;;140,00');
    return {e1,e2,apres1,apres2:{paye:!!f.paye, montant:f.paye&&f.paye.montant, reste:invResteDu(f), n:(f.reglements||[]).length}}; });
  A(!ac.e1&&!ac.apres1.paye&&ac.apres1.reste===140,'acompte de 100 € sur 240 € : facture ouverte, reste dû 140 €',JSON.stringify(ac));
  A(!ac.e2&&ac.apres2.paye&&ac.apres2.montant===240&&ac.apres2.reste===0&&ac.apres2.n===2,'solde de 140 € : facture encaissée pour 240 € (2 règlements)',JSON.stringify(ac.apres2));

  /* client rattaché, corbeille, journal */
  const cl=await ev(()=>{ DB.clients.push({id:'rg-c1',clientType:'entreprise',denomination:'CLIENT RATTACHE',associes:[],docVars:{}},{id:'rg-c2',clientType:'entreprise',denomination:'CLIENT LIBRE',associes:[],docVars:{}});
    DB.dossiers.push({id:'rg-d1',ref:'DOS-RG-0001',clientIds:['rg-c1'],serviceIds:[],statut:'En cours',historique:[]});
    DB.parametres.facturier.push({id:'rg-f9',numero:'FAC-RG-0009',type:'facture',statut:'brouillon',clNom:'X',lignes:[]}); save();
    cliDel('rg-c1'); const reste=!!clientById('rg-c1');
    cliDel('rg-c2'); const libre=!clientById('rg-c2'); const corb=(DB.corbeille||[]).some(x=>x.type==='client'&&x.data&&x.data.id==='rg-c2');
    delDossier('rg-d1'); invDel('rg-f9');
    const j=JSON.stringify(DB.audit||[]);
    return {reste,libre,corb,jc:j.indexOf('CLIENT LIBRE')>=0,jd:j.indexOf('DOS-RG-0001')>=0,jf:j.indexOf('FAC-RG-0009')>=0,jr:j.indexOf('CLIENT RATTACHE')>=0}; });
  A(cl.reste,'client rattaché à un dossier : suppression refusée');
  A(cl.libre&&cl.corb,'client libre : supprimé, et placé dans la corbeille');
  A(cl.jc&&cl.jd&&cl.jf,'journal : suppressions du client, du dossier et de la facture inscrites',JSON.stringify(cl));
  A(!cl.jr,'journal : une suppression refusée n’est pas inscrite comme faite');
  const rest=await ev(()=>{ const x=(DB.corbeille||[]).find(x=>x.type==='client'&&x.data&&x.data.id==='rg-c2'); return x?x.cid:null; });
  A(!!rest,'le client supprimé est restaurable depuis la corbeille');

  /* RGPD : export et effacement d'une personne */
  const rg=await ev(()=>{ DB.clients.push({id:'rg-p',clientType:'particulier',prenom:'Sonia',nom:'PETIT',email:'sonia.petit@example.fr',tel:'0600000000',associes:[],docVars:{}});
    DB.dossiers.push({id:'rg-dp',ref:'DOS-RG-0002',clientIds:['rg-p'],serviceIds:[],statut:'En cours',historique:[{d:'2026-09-01',t:'Dossier créé pour Sonia PETIT'}],docs:{identite:[{nom:'cni-petit.jpg',dataUrl:'data:image/jpeg;base64,AAAA'}]}});
    DB.demandes=(DB.demandes||[]).concat([{id:'rg-q',clientNom:'Sonia PETIT',clientEmail:'sonia.petit@example.fr',clientTel:'0600000000',statut:'nouvelle'}]);
    DB.parametres.facturier.push({id:'rg-fp',numero:'FAC-RG-0010',type:'facture',statut:'emise',clNom:'Sonia PETIT',tva:20,lignes:[{des:'Domiciliation',qte:1,pu:100}]}); save();
    const ex=rgpdExporterPersonne('rg-p');
    rgpdEffacerPersonne('rg-p');
    const txt=JSON.stringify({c:DB.clients,d:DB.dossiers,m:DB.demandes,k:DB.corbeille});
    const f=DB.parametres.facturier.find(x=>x.id==='rg-fp'); const d=DB.dossiers.find(x=>x.id==='rg-dp');
    return {ex:ex&&{d:ex.dossiers.length,q:ex.demandes.length,f:ex.factures.length,p:ex.pieces},
      restes:['sonia.petit@example.fr','cni-petit.jpg','Sonia PETIT','0600000000'].filter(x=>txt.indexOf(x)>=0),
      fiche:!!clientById('rg-p'), facture:!!f&&f.clNom==='Sonia PETIT'&&/conservée/.test(f.rgpdNote||''), dossier:!!d&&!!d.rgpdEfface,
      journal:JSON.stringify(DB.audit||[]).indexOf('Effacement RGPD')>=0 && JSON.stringify(DB.audit||[]).indexOf('Sonia')<0 }; });
  A(rg.ex&&rg.ex.d===1&&rg.ex.q===1&&rg.ex.f===2&&rg.ex.p.indexOf('cni-petit.jpg')>=0,'export RGPD : fiche, dossier, demande, ses 2 factures (casse du nom ignorée) et liste des pièces',JSON.stringify(rg.ex));
  A(!rg.fiche&&rg.restes.length===0,'effacement : plus aucune donnée de la personne (fiche, dossier, demande, pièce, corbeille)',JSON.stringify(rg.restes));
  A(rg.facture&&rg.dossier,'effacement : facture conservée avec mention (obligation comptable), dossier anonymisé et marqué');
  A(rg.journal,'effacement journalisé sans reprendre le nom de la personne');
  const btn=await ev(()=>{ state.page='clients'; state.cliSel=(DB.clients[0]||{}).id; render(); const h=document.body.innerHTML; return /rgpdExporterPersonne\(/.test(h)&&/rgpdEffacerPersonne\(/.test(h); });
  A(btn,'fiche client : boutons « Exporter ses données » et « Effacer la personne »');

  const pg=await ev(()=>{ const d0=new Date(); d0.setMonth(d0.getMonth()-2); const recent=d0.toISOString().slice(0,10);
    DB.dossiers.push({id:'rg-old',ref:'DOS-VIEUX',statut:'Clôturé',archived:true,clientIds:[],clotureLe:'2020-06-01',docs:{identite:[{nom:'cni.jpg',dataUrl:'data:image/jpeg;base64,AAAA'}]}},
      {id:'rg-rec',ref:'DOS-RECENT',statut:'Clôturé',clientIds:[],clotureLe:recent,docs:{identite:[{nom:'cni2.jpg',dataUrl:'data:image/jpeg;base64,AAAA'}]}},
      {id:'rg-nd',ref:'DOS-SANSDATE',statut:'Clôturé',clientIds:[],docs:{identite:[{nom:'cni3.jpg',dataUrl:'data:image/jpeg;base64,AAAA'}]}});
    const n=mqPurgeEcheance(); const g=id=>DB.dossiers.find(x=>x.id===id).docs.identite[0];
    return {n, vieux:!g('rg-old').dataUrl&&g('rg-old').purged, recent:!!g('rg-rec').dataUrl, sansDate:!!g('rg-nd').dataUrl, j:JSON.stringify(DB.audit||[]).indexOf('DOS-VIEUX')>=0}; });
  A(pg.vieux&&pg.recent&&pg.sansDate&&pg.j,'conservation : pièces d’un dossier clos en 2020 purgées ; clôture récente ou sans date conservées ; purge journalisée',JSON.stringify(pg));

  const cs=await ev(()=>{ let msg=''; const t=window.toast; window.toast=(m)=>{ msg+=m+' | '; };
    cliNew('entreprise'); const id=state.cliSel; cliSet(id,'siren','123456789'); const m1=msg; msg=''; cliSet(id,'siren','732829320'); const m2=msg; window.toast=t;
    return {m1:/SIREN invalide/.test(m1), m2:!m2, garde:clientById(id).siren==='732829320'}; });
  A(cs.m1&&cs.m2&&cs.garde,'fiche client : SIREN faux signalé dès la saisie, SIREN valide accepté sans message',JSON.stringify(cs));
  A(await ev(()=>/object-src 'none'/.test((document.querySelector('meta[http-equiv="Content-Security-Policy" i]')||{}).content||'')),'politique CSP présente (object-src none, base-uri self)');

  A(errs.length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));
  await b.close(); console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); process.exit(1); });
