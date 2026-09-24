/**
 * Mar'q — MARQ IA : rédiger, lire les pièces, analyser un appel d'offres (v747)
 *
 * Fige : brouillons types avec la fiche société (en-tête, SIREN, signataire
 * et qualité, « [à compléter] » pour ce qui manque), relance graduée sur une
 * facture impayée du CRM (L441-10, mise en demeure), note au dirigeant
 * reprenant les alertes des modules, rédaction par l'outil (mode
 * démonstration) puis enregistrement au coffre de MARQ DOC ; lecture d'une
 * pièce (type, numéro, montants, SIREN contrôlé, TVA intracom., IBAN,
 * échéance), avertissements (SIREN d'une autre société, K-bis de plus de
 * trois mois, HT + TVA ≠ TTC), classement au coffre, échéance suivie en
 * alerte, contrat d'assurance mis au registre de MARQ CONTROL, réponse à un
 * courrier ; analyse d'un appel d'offres (date limite, procédure, lots,
 * critères, montant, durée, visite, pièces exigées confrontées au coffre,
 * aux assurances et aux factures, avis Go / No-go), trame du mémoire
 * technique, décision reportée sur la veille du CRM, téléphone.
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
  const D=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return d; };
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const frd=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  const y=new Date().getFullYear();
  await ev(({y,old})=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    DB.parametres.ia=Object.assign(DB.parametres.ia||{},{demo:true,enabled:false});
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',siren:'552100554',president:'Jean Martin',siege:'12 rue des Forges',cp:'59000',ville:'Lille',capital:'10000',activites:['Maçonnerie générale']}];
    DB.admin={c1:{crm:{contacts:[{id:'k1',raison:'Nexity',type:'Client',adresse:'19 rue de Vienne, 75008 Paris'},{id:'k2',raison:'Vinci',type:'Client'},{id:'k3',raison:'Eiffage',type:'Client'}],
      pieces:[{id:'f1',type:'Facture',num:'F-2026-7',contactId:'k1',date:y+'-05-02',echeance:y+'-06-01',ht:10000,tva:20,statut:'À encaisser'},
        {id:'f2',type:'Facture',num:'F-2026-2',contactId:'k2',date:y+'-02-01',ht:4000,tva:20,statut:'Payée'},
        {id:'f3',type:'Facture',num:'F-2026-3',contactId:'k3',date:y+'-03-01',ht:6000,tva:20,statut:'Payée'}],
      boamp:{mots:'maçonnerie',deps:'59',avis:[{id:'av1',objet:'Réhabilitation du groupe scolaire Jean Jaurès',acheteur:'Ville de Lille',limite:'',statut:'Nouveau',pert:'Forte',url:'https://www.boamp.fr/x'}]}},
      doc:{docs:[{id:'x1',titre:'Extrait K-bis BATI-NORD',cat:'Juridique',date:old.kb},{id:'x2',titre:'Attestation de vigilance URSSAF',cat:'Social',date:old.ur}],sig:[]},
      control:{assurances:[{id:'as1',type:'RC professionnelle',assureur:'MAAF',police:'RC-1',echeance:(y+1)+'-01-01',prime:''}],sinistres:[]}}};
    DB.parametres.adminInscrits=['c1']; save(); },{y,old:{kb:iso(D(-20)),ur:iso(D(-40))}});
  const nb=t=>String(t||'').replace(/[\u00a0\u202f]/g,' ');
  let r;

  // 1. inscription
  r=await ev(()=>{ go('cockpit'); const b=[...document.querySelectorAll('#nav .nav-btn')].map(x=>x.textContent.trim()); go('entreprise'); admEntChoisir('c1'); return {b,on:[...document.querySelectorAll('button.adm-tile b')].map(x=>x.textContent)}; });
  A(r.b.includes('IA')&&r.on.includes('MARQ IA'),'module inscrit : barre latérale et tuile',JSON.stringify(r.on));

  // 2. brouillons types
  r=await ev(()=>({c:admIaBrouillon('courrier',{dest:'Mairie de Lille',objet:'Demande de délai'}),m:admIaBrouillon('mail',{})}));
  A(/^BATI-NORD — SAS\n12 rue des Forges, 59000 Lille\nSIREN 552100554/.test(r.c)&&/Objet : Demande de délai/.test(r.c)&&/\[à compléter\]/.test(r.c)&&/Lille, le \d\d\/\d\d\/\d{4}/.test(r.c)&&/Jean Martin\nPrésident — BATI-NORD$/.test(r.c),'courrier : en-tête de la société, objet, « [à compléter] » pour ce qui manque, lieu, date et signataire avec sa qualité',r.c.slice(0,160));
  A(/À : \[à compléter\]/.test(r.m)&&/Jean Martin\nBATI-NORD/.test(r.m),'e-mail court : rien d’inventé',r.m);
  r=await ev(()=>({a:admIaBrouillon('relance',{fact:'f1'}),b:admIaBrouillon('relance',{fact:'f1',ton:'Mise en demeure'})}));
  A(/Nexity\n19 rue de Vienne/.test(r.a)&&/facture n° F-2026-7/.test(r.a)&&/12 000,00/.test(nb(r.a))&&/échéance le 01\/06\//.test(r.a)&&!/mise en demeure/i.test(r.a),'relance : client et adresse du CRM, n°, montant TTC, échéance, ton courtois au premier rappel',nb(r.a).slice(0,300));
  A(/Lettre recommandée avec accusé de réception/.test(r.b)&&/mettons en demeure/.test(r.b)&&/L441-10/.test(r.b)&&/40 €/.test(r.b),'mise en demeure : recommandé, délai de huit jours, pénalités et indemnité de 40 € (L441-10)',nb(r.b).slice(0,200));

  // 3. rédaction via l'outil (mode démonstration) → coffre
  r=await ev(async()=>{ go('mia'); admTab('mia','redac'); const tiles=document.querySelectorAll('.ia-tile').length; admIaRedac('relance'); const opts=[...document.querySelectorAll('#adm-ia-fact option')].map(o=>o.value);
    admIaRediger('relance'); await new Promise(r=>setTimeout(r,700)); const txt=document.getElementById('adm-ia-doc').value, cat=document.getElementById('adm-ia-cat').value;
    admIaGarder(); const d=DB.admin.c1.doc.docs.slice(-1)[0], h=DB.admin.c1.ia.redac.slice(-1)[0]; return {tiles,opts,txt,cat,d,h,band:document.querySelector('.ia-mode').textContent}; });
  A(r.tiles===7&&r.opts.join()==='f1'&&/facture n° F-2026-7/.test(r.txt)&&/démonstration/.test(r.band),'7 types de documents ; seules les factures impayées sont proposées ; brouillon rédigé (mode démonstration signalé)',JSON.stringify({t:r.tiles,o:r.opts,b:r.band}));
  A(r.d&&r.d.cat==='Clients & achats'&&/^Relance — facture F-2026-7/.test(r.d.titre)&&/F-2026-7/.test(r.d.texte)&&r.h&&r.h.docId===r.d.id&&r.h.src==='Modèle','document enregistré au coffre de MARQ DOC (rubrique proposée) et gardé à l’historique',JSON.stringify({d:r.d&&r.d.titre,h:r.h}));
  r=await ev(()=>{ admIaRedac('memoire'); admIaRediger('memoire'); const t=window.__toasts.slice(-1)[0]; closeModal(); return t; });
  A(/Analysez d’abord un appel d’offres/.test(r),'trame de mémoire technique : refusée tant qu’aucun appel d’offres n’est analysé',r);

  // 4. lecture d'une facture
  const ech=D(10);
  const fact=['SARL Béton Plus — 4 avenue du Port, 59140 Dunkerque','SIRET 443 061 841 00005 — TVA FR 21 443061841','Facture n° FB-2026-118 du 01/09/'+y,'Client : BATI-NORD — SIREN 552 100 554',
    'Livraison béton C25/30','Total HT 2 500,00 €','TVA 20 % 500,00 €','Total TTC 3 000,00 €','À payer avant le '+frd(ech),'IBAN FR76 3000 6000 0112 3456 7890 189'].join('\n');
  r=await ev(txt=>{ go('mia'); admTab('mia','lire'); const x=admIaLireTexte(txt,'FB-2026-118.pdf'); return {x,v:document.getElementById('view').innerText,al:admIaBilan('c1').alertes}; },fact);
  const c=r.x.champs;
  A(r.x.type==='Facture'&&c.numero==='FB-2026-118'&&c.ht===2500&&c.tvaM===500&&c.ttc===3000&&c.date===y+'-09-01'&&c.echeance===iso(ech),'facture lue : type, numéro, date, HT, TVA, TTC, échéance',JSON.stringify(c));
  A(c.sirens.join()==='443061841,552100554'&&c.siret==='44306184100005'&&c.tva==='FR21443061841'&&c.iban==='FR7630006000011234567890189'&&r.x.cat==='Clients & achats'&&!r.x.avert.length,'SIREN et SIRET contrôlés (clé), TVA intracom., IBAN, rubrique « Clients & achats », aucun avertissement',JSON.stringify({s:c.sirens,t:c.tva,i:c.iban,w:r.x.avert}));
  A(r.al.length===1&&r.al[0].niv==='o'&&/Facture FB-2026-118 — échéance dans 10 jours/.test(r.al[0].titre),'échéance à moins de 15 jours : alerte sur la Page Entreprise',JSON.stringify(r.al));
  A(/Facture, n° FB-2026-118, du 01\/09\/\d{4}, montant 3 000,00/.test(nb(r.v)),'résumé de la pièce affiché',(nb(r.v).match(/Facture, n°[^\n]*/)||[''])[0]);
  r=await ev(id=>{ admIaClasser(id); const d=DB.admin.c1.doc.docs.slice(-1)[0]; admIaTraite(id); return {d,al:admIaBilan('c1').alertes.length,x:DB.admin.c1.ia.lectures[0]}; },r.x.id);
  A(r.d.titre==='Facture FB-2026-118 — FB-2026-118.pdf'&&r.d.cat==='Clients & achats'&&/Total TTC 3 000,00/.test(r.d.texte)&&r.x.classe===r.d.id&&r.al===0,'classée au coffre ; marquée traitée, l’alerte disparaît',JSON.stringify({t:r.d.titre,al:r.al}));

  // 5. avertissements
  r=await ev(({y})=>{ const k=admIaLireTexte('Greffe du tribunal de commerce de Lille\nExtrait Kbis\nRegistre du commerce et des sociétés\nImmatriculation : 443 061 841 RCS Lille\nÀ jour au 02/01/'+(y-1),'kbis.pdf');
    const f=admIaLireTexte('Facture n° Z1 du 01/02/'+y+'\nTotal HT 100,00 €\nTVA 20,00 €\nTotal TTC 150,00 €','z.pdf'); return {k:k.avert,kt:k.type,f:f.avert}; },{y});
  A(r.kt==='Extrait K-bis'&&r.k.some(w=>/n’est pas celui de la société/.test(w))&&r.k.some(w=>/plus de trois mois/.test(w)),'K-bis d’une autre société et de plus de trois mois : signalé',JSON.stringify(r.k));
  A(r.f.some(w=>/HT \+ TVA ne donne pas le TTC/.test(w)),'montants incohérents signalés',JSON.stringify(r.f));

  // 6. attestation d'assurance → registre MARQ CONTROL
  const fin=D(200);
  r=await ev(({t})=>{ const x=admIaLireTexte(t,'decennale.pdf'); admIaAssurance(x.id); return {x,a:DB.admin.c1.control.assurances}; },{t:'Attestation d’assurance\nNous soussignés SMABTP attestons que BATI-NORD, SIREN 552100554, est titulaire du contrat n° DEC-88421 garantissant sa responsabilité décennale.\nValable jusqu’au '+frd(fin)});
  A(r.x.type==='Attestation d’assurance'&&r.x.champs.assurance==='Décennale'&&r.x.champs.police==='DEC-88421'&&r.x.cat==='Assurances'&&r.a.length===2&&r.a[1].type==='Décennale'&&r.a[1].echeance===iso(fin)&&r.x.traite,'attestation lue (décennale, police, validité) et mise au registre des assurances',JSON.stringify(r.a[1]));

  // 7. mise en demeure → réponse
  r=await ev(()=>{ const x=admIaLireTexte('Mise en demeure\nMonsieur, nous vous mettons en demeure de régler la somme de 1 250,00 € sous huit jours.','md.pdf'); go('mia'); admTab('mia','lire'); const acts=[...document.querySelectorAll('.ia-act button')].map(b=>b.textContent); admIaRepondre(x.id); const v=document.getElementById('adm-ia-recu').value; closeModal(); return {t:x.type,acts,v}; });
  A(r.t==='Mise en demeure'&&r.acts.includes('Rédiger une réponse')&&/mettons en demeure/.test(r.v),'mise en demeure : « Rédiger une réponse » reprend le courrier reçu',JSON.stringify(r.acts));

  // 8. analyse d'un appel d'offres
  const lim=D(20);
  const rc=['Règlement de la consultation','Procédure adaptée en application du Code de la commande publique.','Lot n° 1 : Gros œuvre. Lot n° 2 : Menuiseries extérieures.','Montant estimé : 480 000,00 € HT. Durée du marché : 8 mois.',
    'Critères de jugement : prix 40 % ; valeur technique 60 %.','Une visite du site est obligatoire. Les variantes ne sont pas autorisées.',
    'Pièces à fournir : DC1, DC2, extrait Kbis, attestation URSSAF, attestation d’assurance décennale, références des trois dernières années, mémoire technique.',
    'Date limite de réception des offres : '+frd(lim)+' à 12h00.'].join('\n');
  r=await ev(({rc})=>{ DB.admin.c1.control.assurances=DB.admin.c1.control.assurances.filter(a=>a.type!=='Décennale'); save(); go('mia'); admTab('mia','ao'); admIaAO('av1'); document.getElementById('adm-ia-rc').value=rc; admIaAOOk(); const x=DB.admin.c1.ia.ao[0]; return {x,av:DB.admin.c1.crm.boamp.avis[0],v:document.getElementById('view').innerText}; },{rc});
  const a=r.x.analyse;
  A(a.limite===iso(lim)&&a.heure==='12h00'&&a.procedure==='Procédure adaptée (MAPA)'&&a.lots.length===2&&/Lot 1 : Gros œuvre/.test(a.lots[0])&&a.montant===480000&&a.duree==='8 mois'&&a.visite==='obligatoire'&&a.variantes==='interdites','règlement lu : date et heure limites, procédure, lots, montant, durée, visite, variantes',JSON.stringify(a));
  A(a.criteres.map(c=>c.lib+c.poids).join()==='Prix40,Valeur technique60'&&a.pieces.join()==='dc1,dc2,kbis,urssaf,dec,refs,memoire','critères pondérés et pièces exigées',JSON.stringify({c:a.criteres,p:a.pieces}));
  A(/Extrait K-bis[^\n]*\n?\s*Prête/.test(r.v)&&/décennale[^\n]*\n?\s*Manquante/.test(r.v)&&/3 clients facturés en 5 ans/.test(r.v)&&/Mémoire technique[^\n]*\n?\s*À faire/.test(r.v),'pièces confrontées à Mar’q : K-bis et URSSAF au coffre, décennale absente, références du CRM, mémoire à rédiger',nb(r.v).match(/Pièces exigées[\s\S]{0,700}/)[0].replace(/\s+/g,' ').slice(0,400));
  A(r.x.verdict.neg.includes('décennale exigée et absente')&&r.x.verdict.pos.includes('pertinence forte (veille)')&&r.x.verdict.pos.includes('valeur technique prépondérante')&&r.x.verdict.avis==='À étudier'&&r.av.statut==='À étudier'&&r.av.analyse===r.x.id,'avis motivé (pour / contre, note) ; décennale exigée et absente : au mieux « À étudier » ; avis de la veille passé « À étudier »',JSON.stringify(r.x.verdict));
  r=await ev(id=>{ admIaRedac('memoire',{ao:id}); const sel_=document.getElementById('adm-ia-ao').value; admIaRediger('memoire'); return new Promise(res=>setTimeout(()=>{ const t=document.getElementById('adm-ia-doc').value; closeModal(); admIaAOStatut(id,'Go'); res({sel_,t,st:DB.admin.c1.crm.boamp.avis[0].statut}); },700)); },r.x.id);
  A(/^MÉMOIRE TECHNIQUE\n\nRéhabilitation du groupe scolaire/.test(r.t)&&/Lots visés : Lot 1 : Gros œuvre/.test(r.t)&&/Prix \(40 %\) ; Valeur technique \(60 %\)/.test(r.t)&&/Nexity — 10 000,00/.test(nb(r.t))&&/Durée du marché : 8 mois/.test(r.t)&&r.st==='Retenu','trame du mémoire : objet, lots, critères, références du CRM, durée ; « Go » reporté sur la veille (Retenu)',r.t.slice(0,200));

  // 9. alerte de remise proche
  r=await ev(({t})=>{ DB.admin.c1.control.assurances.push({id:'as9',type:'Décennale',echeance:'2099-01-01'}); save(); admIaAO(); document.getElementById('adm-ia-ao-o').value='Ravalement de façade'; document.getElementById('adm-ia-rc').value=t; admIaAOOk(); const x=DB.admin.c1.ia.ao.slice(-1)[0]; return {v:x.verdict,al:admIaBilan('c1').alertes.filter(a=>/Appel d’offres/.test(a.titre))}; },{t:'Procédure adaptée. Critères : prix 30 %, valeur technique 70 %. Pièces : Kbis, attestation URSSAF, décennale. Date limite de remise des offres : '+frd(D(5))});
  A(r.v.avis!=='Défavorable'&&r.al.length===1&&/remise dans 5 jours/.test(r.al[0].titre)&&r.al[0].niv==='o','remise dans moins de 7 jours : alerte sur la Page Entreprise',JSON.stringify({v:r.v,al:r.al}));

  // 10. historique et note au dirigeant
  r=await ev(()=>{ admTab('mia','hist'); const h=document.getElementById('view').innerText; const n=admIaBrouillon('note',{}); return {h,n}; });
  A(/Rédaction/.test(r.h)&&/Lecture/.test(r.h)&&/Appel d’offres/.test(r.h),'historique : rédactions, lectures, analyses',nb(r.h).slice(0,200));
  A(/^NOTE AU DIRIGEANT/.test(r.n)&&/À l’attention de Jean Martin/.test(r.n)&&/• \d\d\/\d\d\/\d{4} — /.test(r.n),'note au dirigeant : reprend les alertes des modules',r.n.slice(0,300));

  // 11. téléphone
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  for(const t of ['redac','lire','ao','hist']){ r=await ev(t=>{ go('mia'); admTab('mia',t); const o=[]; document.querySelectorAll('.adm-wrap *').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&q.right>innerWidth+1&&!e.closest('.adm-tw')) o.push(e.className&&e.className.baseVal!==undefined?e.className.baseVal:(e.className||e.tagName)); }); return {o:o.slice(0,5),hs:document.documentElement.scrollWidth>innerWidth}; },t);
    A(!r.o.length&&!r.hs,'téléphone : rien ne dépasse ('+t+')',JSON.stringify(r)); }
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
