/**
 * Mar'q — Module post-création : l'entreprise après le K-bis (v728)
 *
 * À la réception du K-bis, Mar'q prépare la proposition des services qui
 * suivent une création (compte bancaire, contrat comptable, TVA, RC Pro,
 * mutuelle, bénéficiaires effectifs, facturation, logiciel comptable,
 * contrat de travail). Le test fige : le déclenchement au K-bis, la
 * pertinence selon le dossier, les tarifs (catalogue et réglage), le suivi
 * service par service, la proposition relue avant envoi, la relance, le
 * devis des services acceptés, le suivi fiscal et la vue du Pilotage.
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

  let r;
  await ev(()=>{ localStorage.removeItem('last-svc'); window.demEnvoiSilencieux=(to,s,c)=>{ window.__sent={to,s,c}; return true; };
    window.__mkK=function(type,fn){ const m=window.__mk(type); const d=DB.dossiers.find(x=>x.id===m.id); if(fn) fn(d); return d; };
    window.__kbis=function(d){ d.immat=Object.assign(d.immat||{},{kbis:{name:'kbis.pdf',ts:Date.now()}}); }; });

  // ---------- 1. avant le K-bis ----------
  r=await ev(()=>{ const d=__mkK('sas'); window.__a=d.id; const B=onbBilan(d);
    d.wf={__v6:1}; ['demande','pieces','actes','attestations'].forEach(k=>d.wf[k]=Date.now());
    state.page='espace'; state.espaceDossier=d.id; state.espTab='immatriculation'; render();
    const vue=!!document.querySelector('#view .mq-onb-card'), t=document.createElement('div'); t.innerHTML=onbCarte(d.id);
    return {app:B.applicable,kbis:B.kbis,vue,txt:t.textContent,depuis:!!(d.onb728&&d.onb728.depuis),prev:prevItems().filter(x=>/^onb/.test(x.key)).length}; });
  A(r.app&&!r.kbis&&!r.vue&&/À la réception du K-bis/.test(r.txt)&&!r.depuis&&r.prev===0,'avant le K-bis : rien à proposer ; la carte annonce seulement les services à venir',JSON.stringify(r));

  // ---------- 2. le K-bis reçu ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===__a); __kbis(d); d.wf.immatriculation=Date.now(); state.espTab='cloture'; render();
    const c=document.querySelector('#view .esp-tabpanel[data-tab="cloture"] .mq-onb-card'); const kn=document.querySelector('#view .esp-tabpanel[data-tab="cloture"] .mq-kn-card');
    const B=onbBilan(d); const h1=(d.historique||[]).filter(x=>/K-bis reçu : services/.test(x.t)).length; render(); const h2=(d.historique||[]).filter(x=>/K-bis reçu : services/.test(x.t)).length;
    return {n:B.items.length,etats:B.items.map(x=>x.k+':'+x.etat).join(' '),pot:B.recurrentPotentiel,avant:!!(c&&kn&&c.nextElementSibling===kn),li:c?c.querySelectorAll('.mq-onb-it').length:0,h1,h2,
      prix:B.items.filter(x=>['comptable','facturation','tva','banque','rbe','logiciel'].includes(x.k)).map(x=>x.k+'='+x.prix.lbl).join(' | ')}; });
  A(r.n===9&&r.li===9&&r.avant,'K-bis reçu : les neuf services, carte en tête de l’onglet Clôture',JSON.stringify(r));
  A(/travail:na/.test(r.etats)&&/comptable:a_proposer/.test(r.etats)&&/banque:a_proposer/.test(r.etats),'SAS sans salarié : contrat de travail sans objet, le reste à proposer',r.etats);
  A(/comptable=1[\s ]150,00 € HT par an/.test(r.prix)&&/facturation=29,00 € HT par mois/.test(r.prix)&&/banque=Commission/.test(r.prix)&&/rbe=Inclus/.test(r.prix)&&/logiciel=Tarif à fixer/.test(r.prix)&&r.pot===1538,'tarifs du catalogue : bilan + AGO 1 150 €/an, facturation 29 €/mois, TVA 40 € ; potentiel 1 538 €/an',r.prix+' · '+r.pot);
  A(r.h1===1&&r.h2===1,'la réception du K-bis est notée une seule fois dans l’historique',JSON.stringify(r));

  r=await ev(()=>{ state.espTab='immatriculation'; render(); return !!document.querySelector('#view .esp-tabpanel[data-tab="immatriculation"] .mq-onb-card'); });
  A(r,'la carte se voit aussi dans l’onglet Immatriculation dès le K-bis');

  // ---------- 3. selon le dossier ----------
  r=await ev(()=>{ const d=__mkK('sarl',x=>{ x.intake.societe.objet='Maçonnerie et gros œuvre'; x.intake.societe.effectif='2'; x.fiscal={regimeSocial:'tns',tva:'rn'}; __kbis(x); });
    const B=onbBilan(d), g=k=>B.items.find(x=>x.k===k);
    const s=__mkK('sci',x=>{ x.intake.societe.regime='IR'; __kbis(x); }), C=onbBilan(s), h=k=>C.items.find(x=>x.k===k);
    const m=window.__mkModif('siege'), M=onbBilan(DB.dossiers.find(x=>x.id===m.id));
    return {rc:g('rcpro').pourquoi,trav:[g('travail').etat,g('travail').prix.annuel,g('travail').prix.unique],mut:g('mutuelle').pourquoi,tva:[g('tva').etat,g('tva').prix.annuel],
      sci:['tva','rcpro','mutuelle','facturation','travail'].map(k=>h(k).etat).join(','),sciOk:['banque','comptable','rbe','logiciel'].map(k=>h(k).etat).join(','),sciR:h('tva').raison,modif:M.applicable}; });
  A(r.trav[0]==='a_proposer'&&r.trav[1]===660&&r.trav[2]===180&&/collective obligatoire/.test(r.mut),'SARL avec deux salariés : contrat et paie chiffrés (180 € puis 660 €/an), mutuelle collective obligatoire',JSON.stringify(r));
  A(/Obligatoire pour l’activité : Bâtiment \(BTP\)/.test(r.rc),'RC Pro : l’activité réglementée est nommée en toutes lettres',r.rc);
  A(r.tva[0]==='a_proposer'&&r.tva[1]===480,'TVA au réel normal : douze déclarations par an (480 €)',JSON.stringify(r.tva));
  A(r.sci==='na,na,na,na,na'&&r.sciOk==='a_proposer,a_proposer,a_proposer,a_proposer'&&/location nue/.test(r.sciR),'SCI : TVA, RC Pro, mutuelle, facturation, paie sans objet, avec la raison',JSON.stringify(r));
  A(r.modif===false,'une modification statutaire n’a pas de suivi après création',String(r.modif));

  // ---------- 4. suivre chaque service ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===__a);
    onbMarquer(d.id,'comptable','accepte'); onbMarquer(d.id,'facturation','en_place'); onbMarquer(d.id,'logiciel','refuse'); const bad=onbMarquer(d.id,'pirate','accepte')||onbMarquer(d.id,'banque','nimporte');
    const B=onbBilan(d); const au=(DB.audit||[]).filter(a=>a.action==='Après la création').length;
    onbMarquer(d.id,'logiciel','a_proposer'); const re=onbBilan(d).items.find(x=>x.k==='logiciel').etat;
    return {signe:B.recurrentSigne,pot:B.recurrentPotentiel,bad,au,re,hist:(d.historique||[]).some(h=>/Contrat comptable.*accepté/.test(h.t))}; });
  A(r.signe===1498&&r.pot===40&&!r.bad&&r.au>=3&&r.re==='a_proposer'&&r.hist,'accepté / en place / refusé / rouvert : le récurrent signé (1 498 €/an) et le potentiel suivent ; chaque geste est tracé',JSON.stringify(r));

  // ---------- 5. la proposition ----------
  await ev(()=>{ onbProposer(__a); });
  r=await ev(()=>({ck:document.querySelectorAll('.mq-onb-cks input').length,to:document.getElementById('onb-to').value,c:document.getElementById('onb-corps').value}));
  A(r.ck===6&&r.to==='s.lambert@logis.fr'&&/est immatriculée/.test(r.c)&&/Compte bancaire professionnel/.test(r.c)&&!/Contrat comptable/.test(r.c),'proposition : les services encore à proposer, cochés, avec le message prêt à relire',JSON.stringify({ck:r.ck,to:r.to}));
  r=await ev(()=>{ const b=document.querySelector('.mq-onb-cks input[value="rbe"]'); b.checked=false; b.onchange(); const c=document.getElementById('onb-corps').value;
    document.getElementById('onb-to').value='faux'; const ko=onbProposerGo(__a); document.getElementById('onb-to').value='s.lambert@logis.fr'; const ok=onbProposerGo(__a);
    const d=DB.dossiers.find(x=>x.id===__a), B=onbBilan(d);
    return {sansRbe:!/bénéficiaires/.test(c),ko,ok,sent:window.__sent&&window.__sent.to,props:d.onb728.propositions.length,items:d.onb728.propositions[0].items.join(','),rbe:B.items.find(x=>x.k==='rbe').etat,banque:B.items.find(x=>x.k==='banque').etat}; });
  A(r.sansRbe&&r.ko===false&&r.ok===true&&r.sent==='s.lambert@logis.fr'&&r.props===1,'décocher un service le retire du message ; adresse invalide refusée ; envoi enregistré',JSON.stringify(r));
  A(r.banque==='propose'&&r.rbe==='a_proposer'&&!/rbe/.test(r.items),'seuls les services envoyés passent à « Proposé »',JSON.stringify(r));

  // ---------- 6. relance, Prévoyance, centre d'exécution ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===__a); const avant=onbBilan(d).aRelancer; d.onb728.propositions[0].ts-=8*86400000;
    const B=onbBilan(d), P=prevItems().filter(x=>/^onb/.test(x.key)).map(x=>x.key.split(':')[0]+':'+(x.titre.split(' · ')[1]||'')), cx=cxChaineLignes().find(x=>x.key==='onb');
    state.page='espace'; state.espaceDossier=__a; state.espTab='cloture'; render(); const n=(document.querySelector('#view .mq-onb-card .mq-onb-note')||{}).textContent||'';
    return {avant,apres:B.aRelancer,P,cx:cx&&{a:cx.attente,h:cx.humain,det:cx.detail},n,btn:(document.querySelector('#view .mq-onb-card .mq-onb-acts .btn-pri')||{}).textContent}; });
  A(!r.avant&&r.apres&&/à relancer/.test(r.n)&&r.btn==='Relancer la proposition','sans réponse après sept jours : « à relancer » dans la carte',JSON.stringify(r));
  A(r.P.includes('onbr:relancer la proposition')&&r.P.includes('onb:services après création')&&r.cx&&r.cx.h>=1&&r.cx.a>=1,'Prévoyance et centre d’exécution : propositions à faire et à relancer',JSON.stringify({P:r.P,cx:r.cx}));

  // ---------- 7. devis et suivi fiscal ----------
  r=await ev(()=>{ const d=DB.dossiers.find(x=>x.id===__a); onbMarquer(d.id,'tva','accepte'); onbMarquer(d.id,'banque','accepte'); onbMarquer(d.id,'facturation','accepte');
    const L=onbLignes(d.id); const ok=onbDevis(d.id); const dr=window.__invDraft||{};
    return {L:L.map(l=>l.des+'|'+l.qte+'|'+l.pu).join(' ; '),ok,page:state.page,lig:(dr.lignes||[]).length,doss:dr.dossierId===d.id,note:dr.note||''}; });
  A(/Contrat comptable \(lettre de mission\) \(annuel\)\|1\|1150/.test(r.L)&&/Facturation \(12 mois\)\|12\|29/.test(r.L)&&/Déclarations de TVA\|1\|40/.test(r.L)&&!/bancaire/.test(r.L),'devis : les services acceptés, au tarif ; la commission bancaire n’est pas facturée au client',r.L);
  A(r.ok&&r.page==='facturier'&&r.lig===3&&r.doss&&/Services après création/.test(r.note),'le devis s’ouvre dans le facturier, rattaché au dossier',JSON.stringify(r));
  r=await ev(()=>{ state.page='espace'; state.espaceDossier=__a; render(); const n0=(DB.abonnes||[]).length; onbSuiviFiscal(__a);
    return {f:(document.getElementById('cf-formule')||{}).value,m:(document.getElementById('cf-mens')||{}).value,r:(document.getElementById('cf-raison')||{}).value,n:(DB.abonnes||[]).length-n0}; });
  A(r.f==='Mission comptable'&&r.m==='95.83'&&r.r==='SOC SAS'&&r.n===0,'contrat comptable : le suivi fiscal s’ouvre pré-rempli (mensualité 95,83 €), rien n’est créé sans validation',JSON.stringify(r));
  await ev(()=>{ try{ closeModal(); }catch(e){} });

  // ---------- 8. les tarifs ----------
  r=await ev(()=>{ const a=onbTarifSet('logiciel','montant','25'), b=onbTarifSet('logiciel','montant','-5'), c=onbTarifSet('logiciel','mode','gratuit'), dd=onbTarifSet('pirate','montant','1');
    const L=onbBilan(__a).items.find(x=>x.k==='logiciel').prix;
    localStorage.setItem('last-svc',JSON.stringify({cat:{groups:[{g:'x',items:[{n:'Bilan + liasse fiscale',p:1200,u:'/ an'}]}]}}));
    const cmp=onbTarifs().comptable.montant; localStorage.removeItem('last-svc');
    onbTarifsOuvrir(); const rows=document.querySelectorAll('#ov .mq-onb-tar tbody tr').length; closeModal();
    return {a,b,c,dd,lbl:L.lbl,an:L.annuel,cmp,rows}; });
  A(r.a&&!r.b&&!r.c&&!r.dd&&/25,00 € HT par mois/.test(r.lbl)&&r.an===300,'tarif réglable (logiciel : 25 €/mois) ; valeurs aberrantes refusées',JSON.stringify(r));
  A(r.cmp===1450&&r.rows===9,'les prix suivent le catalogue des prestations (bilan à 1 200 € + AGO) ; neuf lignes de tarifs',JSON.stringify(r));

  // ---------- 9. Pilotage ----------
  r=await ev(()=>{ const G=onbGlobal(); const h=pagePilotage(); const t=document.createElement('div'); t.innerHTML=h; const c=t.querySelector('.mq-onb-glob');
    return {n:G.entreprises,ap:G.aProposer.map(x=>x.d.id).includes(__a),ar:G.aRelancer.length,signe:G.signe,carte:c?c.textContent:''}; });
  A(r.n>=3&&!r.ap&&r.ar===1&&r.signe>0&&/Services après création/.test(r.carte)&&/À proposer/.test(r.carte)&&/À relancer/.test(r.carte),'Pilotage : récurrent signé, entreprises à qui proposer et propositions à relancer',JSON.stringify({n:r.n,ap:r.ap,ar:r.ar,signe:r.signe}));

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
