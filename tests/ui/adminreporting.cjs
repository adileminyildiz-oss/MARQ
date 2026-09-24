/**
 * Mar'q — MARQ REPORTING : pilotage du dirigeant (v745)
 *
 * Fige : consolidation par mois avec priorité FEC > saisie > données de
 * Mar'q (factures CRM, achats validés), lecture d'un FEC (tabulation ou
 * « | », virgule décimale, comptes 70 / 6 / 64 / 411 / 512, à-nouveaux
 * exclus du résultat, équilibre), écarts CA comptable / facturé / saisi,
 * tableau de bord (N-1, marge, masse salariale, trésorerie, délai
 * d'encaissement), graphique, export CSV, synthèse, alertes, carte
 * « Chiffres clés » de la Page Entreprise, téléphone.
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
  const y=new Date().getFullYear();
  await ev(y=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas'}];
    DB.admin={c1:{crm:{contacts:[{id:'k1',raison:'Nexity',type:'Client'}],pieces:[
      {id:'f1',type:'Facture',num:'F1',contactId:'k1',date:y+'-01-15',ht:10000,tva:20,statut:'Payée',payeLe:y+'-02-10'},
      {id:'f2',type:'Facture',num:'F2',contactId:'k1',date:y+'-02-20',ht:5000,tva:20,statut:'À encaisser'},
      {id:'f3',type:'Facture',num:'F3',contactId:'k1',date:y+'-03-05',ht:8000,tva:20,statut:'À encaisser'}],boamp:{mots:'',deps:'',avis:[]}},
      workflow:{queue:[{id:'w1',type:'Achat',statut:'valide',ts:new Date(y,1,12).getTime(),data:{objet:'Outillage',montant:1200}}]},
      reporting:{mois:{}}}};
    DB.parametres.adminInscrits=['c1']; save(); },y);
  const nb=t=>String(t||'').replace(/[  ]/g,' ');
  let r;

  // 1. inscription
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent)}; });
  A(r.b.includes('Reporting')&&r.on.includes('MARQ REPORTING'),'module inscrit : registre et tuile de la page Administration',JSON.stringify(r.on));

  // 2. données de Mar'q : CA facturé, achats validés, encours en fin de mois
  r=await ev(y=>({jan:admRepConso('c1',y+'-01'),fev:admRepConso('c1',y+'-02'),mar:admRepConso('c1',y+'-03'),avr:admRepConso('c1',y+'-04')}),y);
  A(r.jan.src==='Mar’q'&&r.jan.ca===10000&&r.jan.enc===12000&&r.fev.ca===5000&&r.fev.ch===1200&&r.fev.enc===6000&&r.mar.enc===15600&&r.avr===null,'données de Mar’q : CA facturé du mois, achats validés, encours TTC en fin de mois (facture payée le mois suivant comptée en janvier)',JSON.stringify(r));

  // 3. la saisie prime sur Mar'q
  r=await ev(y=>{ go('mreporting'); admChiffres(y+'-03'); document.getElementById('adm-cca').value='9000'; document.getElementById('adm-cch').value='6000'; document.getElementById('adm-cms').value='3000'; document.getElementById('adm-cen').value='14000'; admChiffresOk(); return admRepConso('c1',y+'-03'); },y);
  A(r.src==='Saisie'&&r.ca===9000&&r.ch===6000,'la saisie mensuelle prime sur les données de Mar’q',JSON.stringify(r));

  // 4. FEC : lecture, équilibre, priorité, à-nouveaux
  const fec=['JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tCompAuxNum\tCompAuxLib\tPieceRef\tPieceDate\tEcritureLib\tDebit\tCredit\tEcritureLet\tDateLet\tValidDate\tMontantdevise\tIdevise',
    'AN\tA nouveaux\t1\t'+y+'0101\t512000\tBanque\t\t\t\t\tReport\t5000,00\t0,00\t\t\t\t\t',
    'AN\tA nouveaux\t1\t'+y+'0101\t110000\tReport a nouveau\t\t\t\t\tReport\t0,00\t5000,00\t\t\t\t\t',
    'AN\tA nouveaux\t1\t'+y+'0101\t706000\tPrestations\t\t\t\t\tErreur volontaire\t0,00\t0,00\t\t\t\t\t',
    'VT\tVentes\t2\t'+y+'0115\t411000\tClients\t\t\t\t\tF1\t12000,00\t0,00\t\t\t\t\t',
    'VT\tVentes\t2\t'+y+'0115\t706000\tPrestations\t\t\t\t\tF1\t0,00\t10000,00\t\t\t\t\t',
    'VT\tVentes\t2\t'+y+'0115\t445710\tTVA\t\t\t\t\tF1\t0,00\t2000,00\t\t\t\t\t',
    'HA\tAchats\t3\t'+y+'0120\t606000\tFournitures\t\t\t\t\tA1\t800,00\t0,00\t\t\t\t\t',
    'HA\tAchats\t3\t'+y+'0120\t401000\tFournisseurs\t\t\t\t\tA1\t0,00\t800,00\t\t\t\t\t',
    'OD\tPaie\t4\t'+y+'0131\t641000\tSalaires\t\t\t\t\tPaie\t3000,00\t0,00\t\t\t\t\t',
    'OD\tPaie\t4\t'+y+'0131\t645000\tCharges sociales\t\t\t\t\tPaie\t1200,00\t0,00\t\t\t\t\t',
    'OD\tPaie\t4\t'+y+'0131\t421000\tPersonnel\t\t\t\t\tPaie\t0,00\t4200,00\t\t\t\t\t',
    'BQ\tBanque\t5\t'+y+'0210\t512000\tBanque\t\t\t\t\tRegl F1\t12000,00\t0,00\t\t\t\t\t',
    'BQ\tBanque\t5\t'+y+'0210\t411000\tClients\t\t\t\t\tRegl F1\t0,00\t12000,00\t\t\t\t\t'].join('\r\n');
  r=await ev(({fec,y})=>{ admTab('mreporting','fec'); const F=admRepFecTexte(fec,'FEC_'+y+'.txt'); return {F:{d:F.debit,c:F.credit,n:F.ecritures,du:F.du,au:F.au},jan:admRepConso('c1',y+'-01'),fev:admRepConso('c1',y+'-02'),mar:admRepConso('c1',y+'-03'),t:document.getElementById('view').innerText,al:admRepBilan('c1').alertes.map(a=>a.titre)}; },{fec,y});
  A(r.F.n===13&&r.F.d===r.F.c&&r.F.d===34000&&!r.al.includes('FEC déséquilibré'),'FEC lu : 13 écritures, débit = crédit, pas d’alerte',JSON.stringify(r.F));
  A(r.jan.src==='FEC'&&r.jan.ca===10000&&r.jan.ch===5000&&r.jan.ms===4200&&r.jan.enc===12000&&r.jan.treso===5000&&r.fev.treso===17000&&r.fev.enc===0,'FEC : CA (70), charges (classe 6), masse salariale (64), encours (411) et trésorerie (512) cumulés, à-nouveaux compris dans les soldes',JSON.stringify({jan:r.jan,fev:r.fev}));
  A(r.mar.src==='Saisie','mois hors FEC : la saisie reste utilisée',JSON.stringify(r.mar));
  A(/Équilibre\s*équilibré/.test(nb(r.t))&&/10 000,00/.test(nb(r.t)),'onglet FEC : période, écritures, équilibre et CA comptable par mois',nb(r.t).slice(0,300));

  // 5. écart CA comptable / facturé ; FEC déséquilibré
  r=await ev(({fec,y})=>{ DB.admin.c1.crm.pieces[0].ht=11000; save(); go('mreporting'); admTab('mreporting','fec'); const t=document.getElementById('view').innerText;
    admRepFecTexte(fec.replace('0,00\t10000,00','0,00\t9000,00'),'FEC_faux.txt'); const al=admRepBilan('c1').alertes.map(a=>a.titre); admRepFecTexte(fec,'FEC_'+y+'.txt'); DB.admin.c1.crm.pieces[0].ht=10000; save(); return {t,al}; },{fec,y});
  A(/écart 1 000,00/.test(nb(r.t))&&r.al.includes('FEC déséquilibré'),'écart CA facturé / comptable signalé ; FEC déséquilibré en alerte',JSON.stringify(r.al));
  r=await ev(()=>{ try{ admRepFecTexte('nimporte;quoi\n1;2','x'); return 'lu'; }catch(e){ return e.message; } });
  A(/colonnes du FEC introuvables/.test(r),'fichier qui n’est pas un FEC : refusé avec explication',r);

  // 6. tableau de bord et N-1
  r=await ev(y=>{ DB.admin.c1.reporting.mois[(y-1)+'-01']={ca:8000,ch:6000,ms:2000,enc:9000}; DB.admin.c1.reporting.mois[(y-1)+'-02']={ca:4000,ch:3000,ms:2000,enc:5000}; DB.admin.c1.reporting.mois[(y-1)+'-03']={ca:8000,ch:5000,ms:2000,enc:9000}; save();
    go('mreporting'); admTab('mreporting','tdb'); return {k:document.querySelector('.rep-k').innerText,bars:document.querySelectorAll('.rep-g .rep-b').length,ax:document.querySelectorAll('.rep-y span').length+document.querySelectorAll('.rep-m').length,h:[...document.querySelectorAll('.rep-b.rep-ca')].map(b=>Math.round(b.getBoundingClientRect().height)),fs:getComputedStyle(document.querySelector('.rep-m')).fontSize}; },y);
  A(/Chiffre d’affaires\s*19 000,00/.test(nb(r.k))&&/-5 % sur la même période de/.test(nb(r.k))&&/Trésorerie\s*17 000,00/.test(nb(r.k)),'tableau de bord : CA cumulé (février couvert par le FEC sans vente), −5 % sur N-1 à période égale, trésorerie issue du FEC',nb(r.k).replace(/\s+/g,' '));
  A(r.bars===6&&r.ax===17&&r.h[0]>0&&r.h[1]===0&&r.h[2]>r.h[1]&&r.fs==='11px','graphique : barres CA et charges par mois renseigné, axes gradués',JSON.stringify(r));

  // 7. mois par mois, CSV, synthèse, Page Entreprise
  r=await ev(y=>{ admTab('mreporting','mois'); const t=document.getElementById('view').innerText; const csv=admRepCsvTexte(y); admTab('mreporting','exp'); const s=document.getElementById('adm-doc').value; go('entreprise'); const e=document.getElementById('view').innerText; return {t,csv,s,e}; },y);
  const L=r.csv.split('\r\n');
  A(/FEC/.test(r.t)&&/Saisie/.test(r.t)&&L.length===13&&L[1]===y+'-01;10000;5000;5000;4200;12000;5000;FEC'&&/^Mois;Chiffre d’affaires HT;/.test(L[0]),'mois par mois : source affichée ; CSV à 12 lignes, virgule décimale',L.slice(0,3).join(' | '));
  A(/Point de gestion — BATI-NORD — mars/.test(r.s)&&/à confirmer par la comptabilité/.test(r.s),'synthèse du mois (dernier mois renseigné), source signalée',r.s.split('\n')[0]);
  A(/Chiffre d’affaires \d{4}\s*19 000,00/.test(nb(r.e)),'Page Entreprise : « Chiffres clés » reprend les chiffres consolidés (FEC + saisie)',nb(r.e).match(/Chiffre d’affaires \d{4}[^\n]*\n?[^\n]*/)||'');

  // 8. alerte chiffres manquants (après le 10) ; téléphone
  r=await ev(()=>{ const d=new Date(); if(d.getDate()<10) return 'hors période'; const al=admRepBilan('c1').alertes.map(a=>a.titre); return al.some(x=>/^Chiffres d(e |’).* à saisir$/.test(x))?'ok':JSON.stringify(al); });
  A(r==='ok'||r==='hors période','mois précédent sans aucun chiffre : alerte à partir du 10',r);
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['tdb','mois','fec','exp']){ r=await ev(t=>{ go('mreporting'); admTab('mreporting',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')&&!e.closest('.adm-mbar')) o.push(e.className&&e.className.baseVal!==undefined?e.className.baseVal:(e.className||e.tagName)); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
