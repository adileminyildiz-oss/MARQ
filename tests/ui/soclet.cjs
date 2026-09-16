const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m);} };
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; pg.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await pg.goto(URL_APP); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ try{_authGranted();}catch(e){} }); await pg.waitForTimeout(2000);

  const r=await pg.evaluate(()=>{ const M=window.MQ; if(!M) return null; return {
    present:!!M.__socle,
    E:M.E('<a & "b">'),
    txt:M.txt('  x  '),
    nz:M.nz('Résidence DE  Picardie'),
    mots:M.mots('Résidence DE  Picardie'),
    coupe:M.coupe('abcdefghij',5),
    nb:[M.nb('1 234,56'),M.nb('12€'),M.nb(null),M.nb('abc')],
    eur:M.eur('1234.5'),
    octets:[M.octets(500),M.octets(2048),M.octets(3*1048576)],
    pct:M.pct(12.345),
    iso:[M.iso('12/04/1985'),M.iso('1985-04-12'),M.iso('')],
    jour:M.jour('1985-04-12'),
    ts:M.ts('12/04/1985')>0,
    jd:M.joursDepuis(Date.now()-3*86400000),
    plus:M.plusJours('2026-01-30',3),
    lundi:M.lundi('2026-09-16').toISOString().slice(0,10),
    db:!!M.db().parametres!==undefined,
    par:typeof M.par()==='object',
    clients:Array.isArray(M.clients()),
    nomC:[M.nomClient({denomination:'X SAS'}),M.nomClient({prenom:'Jean',nom:'Dupont'}),M.nomClient(null)],
    uid:/^t[a-z0-9]+$/.test(M.uid('t')),
    sur:[M.sur(()=>{throw new Error('x')},'repli'),M.sur(()=>42,0)],
    style:M.style('mq-essai','.x{color:red}'),
    style2:M.style('mq-essai','.x{color:blue}')
  }; });
  A(r&&r.present,'socle disponible sous MQ');
  A(r.E==='&lt;a &amp; &quot;b&quot;&gt;','échappement du texte');
  A(r.txt==='x','nettoyage des espaces');
  A(r.nz==='residencedepicardie','normalisation sans accents ni espaces');
  A(r.mots==='residence de picardie','normalisation en mots');
  A(r.coupe.length===5,'troncature');
  A(r.nb[0]===1234.56&&r.nb[1]===12&&r.nb[2]===0&&r.nb[3]===0,'lecture des nombres, y compris à la française');
  A(/1\s?234,50/.test(r.eur)&&/€$/.test(r.eur),'montant en euros au format français');
  A(r.octets[0]==='500 o'&&r.octets[1]==='2 Ko'&&r.octets[2]==='3,0 Mo','tailles de fichier');
  A(r.pct==='12,3 %','pourcentage');
  A(r.iso[0]==='1985-04-12'&&r.iso[1]==='1985-04-12'&&r.iso[2]==='','dates converties dans les deux sens');
  A(r.jour==='12/04/1985','date affichée à la française');
  A(r.ts,'horodatage d\'une date française');
  A(r.jd===3,'ancienneté en jours');
  A(r.plus==='2026-02-02','décalage de jours par-dessus un changement de mois');
  A(r.lundi==='2026-09-14','lundi de la semaine trouvé');
  A(r.par&&r.clients,'accès à la base et aux paramètres');
  A(r.nomC[0]==='X SAS'&&r.nomC[1]==='Jean Dupont'&&r.nomC[2]==='','nom du client, société ou particulier');
  A(r.uid,'identifiant unique préfixé');
  A(r.sur[0]==='repli'&&r.sur[1]===42,'exécution protégée avec valeur de repli');
  A(r.style===true&&r.style2===false,'une feuille de style n\'est posée qu\'une fois');

  // journaux
  const j=await pg.evaluate(()=>{ const M=window.MQ; delete DB.parametres.essaiChaine;
    for(let i=0;i<5;i++) M.noter('essaiChaine',{action:'essai '+i,detail:'d'+i});
    M.journal('essaiChaine',3); M.noter('essaiChaine',{action:'dernier'});
    const c=DB.parametres.essaiChaine;
    const au=(window.auditEntrees()||[]).filter(x=>x.src==='essaiChaine');
    return {n:c.journal.length, premier:c.journal[0].action, ok:c.journal[0].ok, au:au.length}; });
  A(j.premier==='dernier'&&j.ok===true,'le journal garde la dernière action en tête');
  A(j.n===3,'le journal est plafonné');
  A(j.au>0,'le journal est repris par le journal d\'audit');

  // bulles
  const t=await pg.evaluate(()=>{ const el=document.getElementById('toast'); const out=[];
    ['ok','ko','warn','info','inconnu'].forEach(k=>{ el.className=''; el.innerHTML='';
      window.MQ.dire('essai',k); const ic=el.querySelector('.tst-ic');
      out.push({k:k,ic:ic?ic.textContent:'',cl:el.className}); }); return out; });
  A(t.every(x=>x.ic&&x.ic!=='undefined'),'aucune bulle ne montre « undefined »');
  A(t[0].cl.indexOf('tst-success')>=0&&t[1].cl.indexOf('tst-error')>=0,'types ok et ko traduits');
  A(t[4].cl.indexOf('tst-')>=0,'type inconnu : repli sur la détection automatique');

  // greffes
  const g=await pg.evaluate(()=>{ window.__n=0; window.essaiFn=function(x){ return x*2; };
    const a=window.MQ.greffe('essaiFn',function(r){ window.__n++; return r+1; },'ess');
    const b2=window.MQ.greffe('essaiFn',function(r){ window.__n++; return r+1; },'ess');
    const v=window.essaiFn(5); return {a:a,b:b2,v:v,n:window.__n}; });
  A(g.a===true&&g.b===false,'une greffe ne s\'applique qu\'une fois');
  A(g.v===11&&g.n===1,'la greffe enveloppe la fonction sans la casser');

  // fichiers
  const f=await pg.evaluate(()=>{ let nom=null; const _c=document.createElement.bind(document);
    document.createElement=function(t){ const el=_c(t); if(t==='a') el.click=function(){ nom=el.download; }; return el; };
    window.MQ.csv(['A','B'],[['1','deux; trois'],['3','"guillemets"']],'essai.csv');
    document.createElement=_c; return nom; });
  A(f==='essai.csv','export CSV produit un fichier nommé');

  A(errs.length===0,'aucune erreur de page'+(errs.length?(' : '+errs[0]):''));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
