/**
 * Mar'q — MARQ DOC : signature électronique par Yousign quand il est configuré (v749)
 *
 * Fige (proxy Yousign simulé, aucun appel réel) : sans Yousign, seul le
 * circuit Mar'q est proposé ; avec Yousign, e-mail et téléphone de chaque
 * signataire pré-remplis (fiche société, MARQ RH), contrôlés, un envoi par
 * signataire avec le texte du document ; « Vérifier » marque signé ce que
 * Yousign confirme (document versé signé au coffre quand tous ont signé) ;
 * refus signalé et renvoi possible ; vérification automatique à
 * l'ouverture de l'onglet Signatures.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  p.on('dialog',d=>d.accept());
  await p.goto(URL_APP);
  await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} };
    window.__ys={post:[],get:[],st:{}}; const _f=window.fetch;
    window.fetch=function(u,o){ u=String(u); if(u.indexOf('https://proxy.test/exec')!==0) return _f.apply(this,arguments);
      if(o&&o.method==='POST'){ const b=JSON.parse(o.body); window.__ys.post.push(b); const id='sr-'+window.__ys.post.length; return Promise.resolve(new Response(JSON.stringify(b.signerTel==='0600000000'?{error:'refus'}:{signatureRequestId:id,signerUrl:'https://yousign.test/'+id}))); }
      const id=decodeURIComponent((u.match(/[?&]id=([^&]+)/)||[])[1]||''); window.__ys.get.push(id); return Promise.resolve(new Response(JSON.stringify({status:window.__ys.st[id]||'ongoing'}))); };
    DB.clients=[{id:'c1',clientType:'entreprise',denomination:'BATI-NORD',forme:'sas',president:'Jean Martin',email:'direction@bati-nord.fr',telephone:'06 11 22 33 44'}];
    DB.admin={c1:{rh:{salaries:[{id:'s1',prenom:'Paul',nom:'Durand',email:'paul.durand@mail.fr',tel:'07 55 66 77 88',actif:true}],absences:[],notes:[]},
      doc:{docs:[{id:'d1',titre:'Contrat de travail — Paul Durand',cat:'Social',date:'2026-09-01',texte:'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE\n\nEntre BATI-NORD et Paul Durand.',sigId:'g1'}],
        sig:[{id:'g1',docId:'d1',titre:'Contrat de travail — Paul Durand',envoye:'2026-09-01',statut:'en cours',signataires:[{nom:'Jean Martin (Président)',email:'',statut:'attente'},{nom:'Paul Durand',email:'',statut:'attente'}],relances:[],canal:'Mar’q'}]}}};
    DB.parametres.adminInscrits=['c1']; DB.parametres.yousign={enabled:false}; DB.parametres.mailSync={url:'https://proxy.test/exec',key:'cle-test'}; save(); });
  let r;
  const vue=()=>ev(()=>{ go('mdoc'); admEntChoisir('c1'); go('mdoc'); admTab('mdoc','sig'); return {t:document.getElementById('view').innerText,b:[...document.querySelectorAll('#view .adm-t button')].map(x=>x.textContent)}; });

  // 1. sans Yousign
  r=await vue();
  A(/Yousign non configuré/.test(r.t)&&!r.b.includes('Yousign')&&r.b.includes('Marquer signé'),'Yousign non configuré : seul le circuit Mar’q est proposé',JSON.stringify(r.b));

  // 2. Yousign configuré : pré-remplissage
  await ev(()=>{ DB.parametres.yousign.enabled=true; save(); window.__admDocYsTs=Date.now(); });
  r=await vue();
  A(/signature électronique Yousign/.test(r.t)&&r.b.includes('Yousign')&&!r.b.includes('Vérifier'),'Yousign configuré : bouton « Yousign » sur le document en signature',JSON.stringify(r.b));
  r=await ev(()=>{ admDocYs('g1'); return ['ys-m-0','ys-t-0','ys-m-1','ys-t-1'].map(id=>document.getElementById(id).value); });
  A(r.join('|')==='direction@bati-nord.fr|06 11 22 33 44|paul.durand@mail.fr|07 55 66 77 88','e-mail et téléphone pré-remplis (fiche société pour le dirigeant, MARQ RH pour le salarié)',r.join('|'));

  // 3. contrôle du téléphone
  r=await ev(async()=>{ document.getElementById('ys-t-1').value='07'; const n=await admDocYsEnvoyer('g1'); return {n,t:window.__toasts.slice(-1)[0],post:window.__ys.post.length,open:document.querySelector('#ov').classList.contains('show')}; });
  A(r.n===0&&/Téléphone portable requis pour Paul Durand/.test(r.t)&&r.post===0&&r.open,'téléphone manquant : rien n’est envoyé',JSON.stringify(r));

  // 4. envoi
  r=await ev(async()=>{ document.getElementById('ys-t-1').value='07 55 66 77 88'; const n=await admDocYsEnvoyer('g1'); const g=DB.admin.c1.doc.sig[0]; return {n,post:window.__ys.post,g}; });
  const P=r.post;
  A(r.n===2&&P.length===2&&P[0].action==='yousign'&&P[0].key==='cle-test'&&P[0].signerPrenom==='Jean'&&P[0].signerNom==='Martin'&&P[0].signerEmail==='direction@bati-nord.fr'&&P[1].signerPrenom==='Paul'&&/^Contrat_de_travail_/.test(P[0].filename)&&/CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE/.test(P[0].html),'un envoi par signataire : nom, e-mail, téléphone et texte du document',JSON.stringify(P.map(x=>[x.signerPrenom,x.signerNom,x.filename])));
  A(r.g.canal==='Yousign'&&r.g.signataires[0].ys.srId==='sr-1'&&r.g.signataires[1].ys.srId==='sr-2'&&r.g.signataires[1].tel==='07 55 66 77 88','suivi Yousign enregistré sur chaque signataire',JSON.stringify(r.g.signataires));
  r=await vue();
  A(/Yousign : lien envoyé/.test(r.t)&&r.b.includes('Vérifier')&&!r.b.includes('Yousign'),'tableau : « lien envoyé », bouton « Vérifier »',JSON.stringify(r.b));

  // 5. vérification : un puis deux signés
  r=await ev(async()=>{ window.__ys.st['sr-1']='done'; const n=await admDocYsVerif('g1'); const g=DB.admin.c1.doc.sig[0]; return {n,s:g.signataires.map(s=>s.statut),st:g.statut}; });
  A(r.n===1&&r.s.join()==='signé,attente'&&r.st==='en cours','« Vérifier » : le dirigeant a signé, le salarié pas encore',JSON.stringify(r));
  r=await ev(async()=>{ window.__ys.st['sr-2']='completed'; await admDocYsVerif('g1'); const g=DB.admin.c1.doc.sig[0], d=DB.admin.c1.doc.docs[0]; return {st:g.statut,signe:d.signe,t:window.__toasts.slice(-3).join(' | ')}; });
  A(r.st==='signé'&&!!r.signe&&/versé signé au coffre/.test(r.t),'tous signés : document versé signé au coffre',JSON.stringify(r));

  // 6. refus et renvoi
  r=await ev(async()=>{ const d=DB.admin.c1.doc; d.docs.push({id:'d2',titre:'Avenant — Paul Durand',cat:'Social',date:'2026-09-10',texte:'AVENANT',sigId:'g2'}); d.sig.push({id:'g2',docId:'d2',titre:'Avenant — Paul Durand',envoye:'2026-09-10',statut:'en cours',signataires:[{nom:'Paul Durand',email:'',statut:'attente'}],relances:[]}); save();
    admDocYs('g2'); await admDocYsEnvoyer('g2'); const id=d.sig[1].signataires[0].ys.srId; window.__ys.st[id]='declined'; await admDocYsVerif('g2'); return {id,ys:d.sig[1].signataires[0].ys}; });
  const rv=await vue();
  A(r.ys.statut==='refusé'&&/Yousign : refusé/.test(rv.t)&&rv.b.filter(x=>x==='Yousign').length===1,'refus Yousign : signalé, renvoi proposé',JSON.stringify({ys:r.ys,b:rv.b}));

  // 7. échec du proxy
  r=await ev(async()=>{ admDocYs('g2'); document.getElementById('ys-t-0').value='0600000000'; const n=await admDocYsEnvoyer('g2'); return {n,t:window.__toasts.slice(-1)[0]}; });
  A(r.n===0&&/Envoi impossible/.test(r.t),'réponse invalide du proxy : échec annoncé',JSON.stringify(r));

  // 8. vérification automatique à l'ouverture de l'onglet Signatures
  r=await ev(async()=>{ const d=DB.admin.c1.doc; d.sig[1].signataires[0].ys={srId:'sr-9',statut:'envoyé'}; window.__ys.st['sr-9']='done'; save(); window.__admDocYsTs=0; window.__ys.get=[]; go('mdoc'); admTab('mdoc','sig'); await new Promise(r=>setTimeout(r,400)); return {get:window.__ys.get,st:d.sig[1].statut}; });
  A(r.get.includes('sr-9')&&r.st==='signé','ouverture de l’onglet Signatures : vérification automatique auprès de Yousign',JSON.stringify(r));
  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
