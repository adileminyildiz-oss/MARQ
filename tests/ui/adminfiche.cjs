/**
 * Mar'q — Administration : fiches techniques hebdomadaire et mensuelle (v755)
 *
 * Fige : la fiche réunit tous les modules sur la période (réalisé, points de
 * vigilance avec action et référence, échéances, attendu du client,
 * chiffres clés) ; la version client ne contient aucun point interne
 * (gel des avoirs, LCB-FT, purges) ; navigation de période ; l'envoi
 * marque la fiche et la verse au coffre ; rappel dans la Prévoyance le
 * lundi et en début de mois.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    window.demEnvoiDirect=(to,s,b)=>{ window.__mail={to,s,b}; return true; };
    const P2=n=>String(n).padStart(2,'0'), iso=d=>d.getFullYear()+'-'+P2(d.getMonth()+1)+'-'+P2(d.getDate());
    const lun=new Date(); lun.setHours(0,0,0,0); lun.setDate(lun.getDate()-((lun.getDay()+6)%7)); const j=n=>iso(new Date(lun.getTime()+n*86400000));
    window.__j=j; const y=new Date().getFullYear();
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',siren:'552100554',president:'Jean Martin',email:'direction@bati-nord.fr'}];
    DB.admin={c1:{suiviDepuis:(y-1)+'-01-01',
      crm:{contacts:[{id:'k1',raison:'Nexity',type:'Client'}],pieces:[{id:'f1',type:'Facture',num:'F-1',contactId:'k1',date:j(1),ht:1000,tva:20,statut:'Payée',payeLe:j(2)}]},
      rh:{salaries:[{id:'s1',prenom:'Lina',nom:'Morel',contrat:'CDD',entree:j(1),actif:true}],absences:[],notes:[]},
      workflow:{queue:[{id:'w1',type:'Achat',statut:'dirigeant',ts:Date.now(),libelle:'Mini-pelle 7 800 € HT',data:{},historique:[]},{id:'w2',type:'Absence',statut:'valide',ts:Date.now(),libelle:'Congés Paul',data:{},historique:[{ts:new Date(j(2)+'T10:00').getTime(),action:'Validée'}]}]},
      doc:{docs:[],sig:[{id:'g1',titre:'Contrat Lina Morel',statut:'en cours',signataires:[{nom:'Jean Martin',statut:'signé',date:j(1)},{nom:'Lina Morel',statut:'attente'}],relances:[]}]},
      control:{sinistres:[],assurances:[]},archive:{journal:[{date:j(2),lot:'Prospects',n:3,par:'Adil'}]},reporting:{mois:{}}}};
    DB.parametres.adminInscrits=['c1']; save(); });
  let r=await ev(()=>{ const F=admFiche('c1','semaine',__j(0)); const h=admFicheHTML(F,'client'), hc=admFicheHTML(F,'cabinet');
    const d=document.createElement('div'); d.innerHTML=h; const t=d.innerText; d.innerHTML=hc; const tc=d.innerText;
    return {t,tc,fait:F.fait.map(x=>x.l),att:F.attendu.map(x=>x.l),vig:F.vig.map(x=>x.titre+'|'+x.action+'|'+x.ref)}; });
  A(/Fiche technique hebdomadaire/.test(r.t)&&/BATI-NORD/.test(r.t)&&/SIREN 552 100 554/.test(r.t),'fiche hebdomadaire : en-tête société et période',r.t.slice(0,160));
  A(r.fait.some(x=>/Facture F-1 émise/.test(x))&&r.fait.some(x=>/Facture F-1 encaissée/.test(x))&&r.fait.some(x=>/Embauche : Lina Morel/.test(x))&&r.fait.some(x=>/Contrat Lina Morel signé par Jean Martin/.test(x))&&r.fait.some(x=>/Absence — Congés Paul : validée/.test(x)),'réalisé : factures, embauche, signature, décisions du circuit',JSON.stringify(r.fait));
  A(r.att.some(x=>/Votre accord : Achat/.test(x))&&r.att.some(x=>/Signature attendue : Contrat Lina Morel — Lina Morel/.test(x)),'attendu du client : accord du dirigeant, signature',JSON.stringify(r.att));
  A(r.vig.some(x=>/^DPAE — Lina Morel\|.*URSSAF.*\|C\. trav\., art\. L1221-10$/.test(x)),'point de vigilance avec action et texte de référence (DPAE)',JSON.stringify(r.vig));
  A(!/gel des avoirs|Purge|LCB/i.test(r.t)&&/gel des avoirs/i.test(r.tc)&&/Purge « Prospects »/.test(r.tc),'version client sans points internes ; version cabinet complète',JSON.stringify({c:/gel/i.test(r.t),cab:/gel/i.test(r.tc)}));

  r=await ev(()=>{ const y=new Date().getFullYear(), m=String(new Date().getMonth()+1).padStart(2,'0'); DB.admin.c1.reporting.mois[y+'-'+m]={ca:20000,ch:12000,ms:5000,enc:3000}; save(); admBilanCacheVider();
    const F=admFiche('c1','mois',y+'-'+m+'-01'); const d=document.createElement('div'); d.innerHTML=admFicheHTML(F,'client'); return {t:d.innerText,ch:F.chiffres}; });
  A(/Fiche technique mensuelle/.test(r.t)&&/Chiffres clés/.test(r.t)&&r.ch.duMois.ca===20000&&/8\s?000,00\s?€/.test(r.t),'fiche mensuelle : chiffres du mois et résultat',JSON.stringify(r.ch));

  // fenêtre, navigation, envoi
  r=await ev(()=>{ go('entreprise'); admEntChoisir('c1'); const t=document.getElementById('view').innerText; admFicheOuvrir('semaine'); const t1=document.getElementById('ov-t').textContent; admFicheDecaler(-1); const t2=document.getElementById('ov-t').textContent; admFicheMode('cabinet'); const cab=/Version cabinet/.test(document.getElementById('adm-fi-body').innerText); admFicheMode('client'); admFicheDecaler(1);
    admFicheEnvoyer(); const to=document.getElementById('adm-fi-to').value; admFicheEnvoyerOk(); const fi=DB.admin.c1.fiches, docs=DB.admin.c1.doc.docs;
    return {carte:/Présentation au client/.test(t),t1,t2,cab,to,mail:window.__mail,fi,docs:docs.map(x=>x.titre+'|'+x.fiche)}; });
  A(r.carte&&/Fiche de la semaine du/.test(r.t1)&&r.t1!==r.t2&&r.cab,'carte « Présentation au client » ; fenêtre, semaine précédente, version cabinet',JSON.stringify({t1:r.t1,t2:r.t2}));
  A(r.to==='direction@bati-nord.fr'&&r.mail&&r.mail.to==='direction@bati-nord.fr'&&!/gel des avoirs|Purge/i.test(r.mail.b),'envoi au client : e-mail pré-rempli, sans point interne',JSON.stringify(r.mail&&r.mail.s));
  const cle=Object.keys((r.fi||{}).semaine||{})[0];
  A(cle&&r.fi.semaine[cle].envoye&&r.docs.some(x=>/^Fiche de la semaine du/.test(x)&&/semaine:/.test(x)),'fiche marquée envoyée et versée au coffre',JSON.stringify({fi:r.fi,docs:r.docs}));
  r=await ev(()=>{ go('entreprise'); admEntChoisir('c1'); return /envoyée le/.test(document.getElementById('view').innerText); });
  A(r,'carte : fiche de la semaine « envoyée le … »');

  // Prévoyance : un lundi, début de mois
  await p.clock.setFixedTime(new Date('2026-10-05T09:00:00'));
  r=await ev(()=>{ const L=(window.prevItems()||[]).filter(x=>/^admfiche:/.test(x.key)); return L.map(x=>x.key+'|'+x.titre+'|'+x.detail); });
  A(r.some(x=>/admfiche:semaine:2026-09-28\|Fiches hebdomadaires à envoyer\|1 société\(s\) : BATI-NORD/.test(x))&&r.some(x=>/admfiche:mois:2026-09\|Fiches mensuelles à envoyer/.test(x)),'Prévoyance : lundi 5 octobre, fiches de la semaine écoulée et du mois de septembre à envoyer',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
