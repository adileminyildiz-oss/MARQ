/**
 * Mar'q — Hors connexion (v763)
 *
 * Fige, sur un vrai serveur HTTP local (le service worker n'existe pas en
 * file://) :
 *  - le service worker s'installe et garde une copie de l'application ;
 *  - réseau coupé, Mar'q se rouvre (page d'accueil, avec ou sans paramètres),
 *    les données saisies sont toujours là, l'indicateur « Hors connexion »
 *    s'affiche et disparaît au retour du réseau ;
 *  - hors connexion, le rechargement « dur » et le cliquet anti-retour ne
 *    vident PAS la copie locale (sinon Mar'q ne s'ouvrirait plus) ;
 *  - réseau d'abord : dès qu'une nouvelle version est publiée, l'ouverture
 *    en ligne la charge immédiatement, et c'est elle qui s'ouvre ensuite
 *    hors connexion ;
 *  - version.json n'est jamais mis en cache.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };

const RACINE = path.resolve(__dirname, '..', '..');
const VER = +(fs.readFileSync(path.join(RACINE,'index.html'),'utf8').match(/var LAST_VER=(\d+)/)||[])[1];
let publiee = VER;   /* version « publiée » par le serveur de test */
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};

const serveur = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]); if(p==='/') p='/index.html';
  const f = path.join(RACINE, p);
  if(!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end('introuvable'); }
  let corps = fs.readFileSync(f);
  if(p==='/index.html') corps = Buffer.from(corps.toString('utf8').replace(/var LAST_VER=\d+;/, 'var LAST_VER='+publiee+';'));
  if(p==='/version.json') corps = Buffer.from(JSON.stringify({version:publiee}));
  res.writeHead(200, {'Content-Type': TYPES[path.extname(f)]||'application/octet-stream', 'Cache-Control':'no-cache'});
  res.end(corps);
});

(async()=>{
  await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
  const URL = 'http://127.0.0.1:'+serveur.address().port+'/';
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:1300,height:900}});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  const pret = ()=>p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
  const ev = (f,a)=>p.evaluate(f,a);

  /* 1. Première ouverture en ligne : installation et copie locale */
  await p.goto(URL); await ev(()=>{ try{_authGranted();}catch(e){} }); await pret();
  for(let i=0;i<60;i++){ if(await ev(async()=>{ const r=await navigator.serviceWorker.getRegistration(); return !!(r&&r.active&&window.marqHorsLigne&&window.marqHorsLigne.pret); })) break; await p.waitForTimeout(500); }
  const inst = await ev(async()=>{ const r=await navigator.serviceWorker.getRegistration(); const c=await caches.open('marq-hors-ligne-v1');
    return {actif:!!(r&&r.active), index:!!(await c.match('index.html')), pret:!!(window.marqHorsLigne&&window.marqHorsLigne.pret)}; });
  A(inst.actif,'le service worker hors connexion est installé et actif');
  A(inst.index,'une copie de l’application est gardée sur l’appareil');
  A(inst.pret,'la page sait que Mar’q est prêt hors connexion');
  await p.waitForTimeout(1800);
  A(await ev(()=>!!localStorage.getItem('marq-hors-ligne-annonce')),'l’annonce « disponible hors connexion » n’est faite qu’une fois (drapeau posé)');

  /* Une donnée saisie en ligne, qu'on doit retrouver hors connexion */
  await ev(()=>{ DB.clients=DB.clients||[]; DB.clients.push({id:'hl-test',nom:'CLIENT HORS LIGNE',denomination:'CLIENT HORS LIGNE'}); save(); });
  /* Une ouverture contrôlée par le worker, pour qu'il garde aussi la page telle qu'on la navigue */
  await p.reload(); await pret();
  A(await ev(()=>!!navigator.serviceWorker.controller),'la page est servie par le service worker');

  /* 2. Réseau coupé : Mar'q se rouvre */
  await ctx.setOffline(true);
  let rouvert=true; try{ await p.reload({waitUntil:'load'}); await pret(); }catch(e){ rouvert=false; }
  A(rouvert,'réseau coupé, Mar’q se rouvre');
  const hl = await ev(()=>({ver:LAST_VER, client:(DB.clients||[]).some(c=>c.id==='hl-test'),
    pastille:!!document.querySelector('#mq-hl.on'), texte:(document.querySelector('#mq-hl')||{}).textContent||''}));
  A(hl.ver===VER,'hors connexion, c’est la dernière version chargée qui s’ouvre',hl.ver+' ≠ '+VER);
  A(hl.client,'les données saisies sont toujours là hors connexion');
  A(hl.pastille && /Hors connexion/.test(hl.texte),'l’indicateur « Hors connexion » s’affiche',hl.texte);
  let avecParam=true; try{ await p.goto(URL+'?page=cockpit'); await pret(); }catch(e){ avecParam=false; }
  A(avecParam,'hors connexion, l’adresse avec paramètres s’ouvre aussi');

  /* 3. Hors connexion, rien ne vide la copie locale */
  await ev(()=>{ try{ _lastHardReload(); }catch(e){} });
  await p.waitForTimeout(900);
  const garde = await ev(async()=>{ const ks=await caches.keys(); const c=await caches.open('marq-hors-ligne-v1'); return {ks, index:!!(await c.match('index.html')), reg:!!(await navigator.serviceWorker.getRegistration())}; });
  A(garde.index && garde.reg,'hors connexion, le rechargement « dur » ne vide pas la copie locale',JSON.stringify(garde));
  await ev(()=>{ localStorage.setItem('marq-ver-max',String(LAST_VER+5)); sessionStorage.removeItem('marq-ratchet-try'); });
  let cliquet=true; try{ await p.reload({waitUntil:'load'}); await pret(); await p.waitForTimeout(900); }catch(e){ cliquet=false; }
  const apres = await ev(async()=>{ const c=await caches.open('marq-hors-ligne-v1'); return !!(await c.match('index.html')); });
  A(cliquet && apres,'hors connexion, le cliquet anti-retour ne boucle pas et garde la copie');
  await ev((v)=>localStorage.setItem('marq-ver-max',String(v)),VER);

  /* 4. Retour du réseau puis nouvelle version publiée : réseau d'abord */
  await ctx.setOffline(false);
  await ev(()=>window.dispatchEvent(new Event('online')));
  await p.waitForTimeout(300);
  A(await ev(()=>!document.querySelector('#mq-hl.on')),'au retour du réseau, l’indicateur disparaît');
  publiee = VER+1;
  await p.reload(); await ev(()=>{ try{_authGranted();}catch(e){} }); await pret();
  A(await ev(()=>LAST_VER)===VER+1,'en ligne, une nouvelle version publiée est chargée immédiatement (jamais la copie)');
  /* Attendre que la copie locale soit à jour (écriture asynchrone du worker) avant de couper le réseau. */
  for(let i=0;i<40;i++){ if(await ev(async v=>{ const c=await caches.open('marq-hors-ligne-v1'); const r=await c.match(location.href,{ignoreSearch:true}); return !!r && (await r.text()).indexOf('var LAST_VER='+v+';')>=0; },VER+1)) break; await p.waitForTimeout(250); }
  await ctx.setOffline(true);
  try{ await p.reload({waitUntil:'load'}); await pret(); }catch(e){}
  A(await ev(()=>LAST_VER)===VER+1,'hors connexion ensuite, c’est cette nouvelle version qui s’ouvre');
  const vj = await ev(async()=>{ for(const k of await caches.keys()){ const c=await caches.open(k); for(const r of await c.keys()) if(/version\.json/.test(r.url)) return r.url; } return ''; });
  A(!vj,'version.json n’est jamais mis en cache',vj);
  await ctx.setOffline(false);

  A(errs.filter(e=>!/ServiceWorker|Failed to fetch|NetworkError|net::/i.test(e)).length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));
  await b.close(); serveur.close();
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); try{ serveur.close(); }catch(_){} process.exit(1); });
