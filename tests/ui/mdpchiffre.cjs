/**
 * Mar'q — Chiffrement lié au mot de passe de connexion (v765)
 *
 * La recette a montré que l'écran d'accès se contournait (drapeau posé à la
 * main, empreinte du mot de passe remplacée) : il n'était tenu que par le
 * navigateur. Désormais, à la première connexion, les données sont chiffrées
 * avec le mot de passe ; l'accès se vérifie en ouvrant la clé de données.
 * Ce test fige : activation à la première connexion, clé de secours montrée,
 * données illisibles au repos, contournements sans effet, mot de passe
 * oublié via la clé de secours, réglages sans désactivation.
 */
const crypto = require('crypto');
const { chromium } = require('./_socle.cjs');
/* Servi en http (comme en production) : sous file://, Chromium perd parfois tout le
   stockage local au rechargement d'un contexte de test — artefact sans rapport avec Mar'q. */
const http = require('http'), fs = require('fs'), path = require('path');
const RACINE = path.resolve(__dirname, '..', '..');
const serveur = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/') p='/index.html';
  const f=path.join(RACINE,p); if(!f.startsWith(RACINE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(fs.readFileSync(f)); });
let URL_APP='';
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const MDP='Recette-Marq-2026', NOUV='Nouveau-mdp-2026';

(async()=>{
  await new Promise(r=>serveur.listen(0,'127.0.0.1',r)); URL_APP='http://127.0.0.1:'+serveur.address().port+'/index.html';
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1360,height:900}});
  await ctx.addInitScript(h=>{ try{ if(!localStorage.getItem('mdp-init')){ localStorage.setItem('mdp-init','1');
    localStorage.setItem('last-authreset-505','1'); localStorage.setItem('last-pwd',h); } }catch(e){} }, sha(MDP));
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  const ev=(f,a)=>p.evaluate(f,a);
  /* « ouvert » = données réellement accessibles : le menu, lui, ne nomme que des rubriques */
  const nav=()=>p.waitForFunction(()=>!document.getElementById('last-gate')&&!document.getElementById('mqsec-lock')&&typeof DB==='object'&&DB&&Array.isArray(DB.clients)&&window.marqPret&&window.marqPret(),{timeout:30000}).then(()=>true,()=>false);
  const donnees=()=>ev(()=>typeof DB==='object'&&DB!==null&&Array.isArray(DB.clients));
  async function saisir(v){ await p.waitForSelector('#lg-pwd',{timeout:15000}); await p.fill('#lg-pwd',v); await p.press('#lg-pwd','Enter'); }
  async function rouvrir(){ await ev(()=>sessionStorage.clear()); await p.reload(); }

  await p.goto(URL_APP);
  A(await ev(()=>document.getElementById('lg-pwd').type)==='password','le champ du mot de passe masque la saisie');
  await saisir('mauvais-mot');
  await p.waitForTimeout(600);
  A(await ev(()=>!!document.getElementById('last-gate') && /incorrect/i.test(document.getElementById('lg-err').textContent)),'un mauvais mot de passe est refusé');

  /* 1. Première connexion : chiffrement posé sous le mot de passe, clé de secours montrée */
  await saisir(MDP);
  A(await nav(),'le bon mot de passe ouvre Mar’q');
  await p.waitForFunction(()=>window.mqSec.actif()&&window.mqSec.lie(),{timeout:20000}).catch(()=>{});
  A(await ev(()=>window.mqSec.actif()&&window.mqSec.lie()),'les données sont chiffrées avec le mot de passe dès la première connexion');
  await p.waitForSelector('#ms-key',{timeout:8000}).catch(()=>{});
  const cle=await ev(()=>((document.getElementById('ms-key')||{}).textContent||'').trim());
  A(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){5}$/.test(cle),'la clé de secours est montrée une fois',cle);
  await ev(()=>{ try{ closeModal(); }catch(e){} DB.clients=DB.clients||[]; DB.clients.push({id:'mdp-c',clientType:'entreprise',denomination:'CLIENT TRES SECRET',associes:[],docVars:{}}); save(); });
  await p.waitForTimeout(1500);
  const repos=await ev(()=>{ const v=localStorage.getItem('last-db-v1')||''; return {env:v.indexOf('MQS1.')===0, clair:/CLIENT TRES SECRET/.test(JSON.stringify(localStorage))}; });
  A(repos.env && !repos.clair,'au repos, la base est illisible (aucun nom de client en clair)',JSON.stringify(repos));
  A(await ev(()=>(DB.parametres.secJournal||[]).some(j=>/liée au mot de passe/.test(j.action))),'l’activation figure au journal de sécurité');

  /* 2. Contournements : drapeau d'accès, empreinte remplacée */
  await ev(()=>localStorage.setItem('last-gate-ok','1')); await rouvrir(); await p.waitForTimeout(1500);
  const c1=await ev(()=>({pret:!!(window.marqPret&&window.marqPret()), verrou:!!document.getElementById('mqsec-lock'), base:(typeof DB==='object'&&DB!==null&&Array.isArray(DB.clients)), cle:window.mqSec.pret()}));
  A(!c1.pret && !c1.base && !c1.cle && c1.verrou,'drapeau « last-gate-ok » posé à la main : données fermées, mot de passe redemandé',JSON.stringify(c1));
  await ev(h=>{ localStorage.removeItem('last-gate-ok'); localStorage.setItem('last-pwd',h); }, sha('pirate')); await rouvrir();
  await saisir('pirate'); await p.waitForTimeout(1500);
  A(!(await donnees()) && await ev(()=>!!document.getElementById('last-gate')),'empreinte remplacée par un intrus : son mot de passe n’ouvre rien');
  await ev(()=>{ localStorage.removeItem('last-auth-fails'); localStorage.removeItem('last-auth-lock'); });

  /* 3. Le vrai mot de passe rouvre les données */
  await rouvrir(); await saisir(MDP);
  A(await nav() && await ev(()=>DB.clients.some(c=>c.denomination==='CLIENT TRES SECRET')),'le vrai mot de passe rouvre les données');
  A(await ev(()=>!localStorage.getItem('last-pwd')&&!localStorage.getItem('last-pwd2')),'aucune empreinte du mot de passe n’est conservée : seule la clé chiffrée en tient lieu (v766)');

  /* 4. Réglages : changer le mot de passe, pas de désactivation */
  const carte=await ev(()=>window.mqSecCarte());
  A(/Changer le mot de passe/.test(carte) && !/mqSecDesactiver\(\)/.test(carte),'réglages : « Changer le mot de passe », plus de désactivation');

  /* 5. Mot de passe oublié : clé de secours, puis nouveau mot de passe */
  await rouvrir(); await p.waitForSelector('#lg-pwd');
  await ev(()=>lgForgot()); await p.waitForSelector('#ms-n1',{timeout:8000}).catch(()=>{});
  A(await ev(()=>!!document.getElementById('ms-n1')),'« mot de passe oublié » propose la clé de secours et un nouveau mot de passe');
  await p.fill('#ms-in',cle); await p.fill('#ms-n1','court'); await p.fill('#ms-n2','court'); await p.click('#ms-go'); await p.waitForTimeout(300);
  A(await ev(()=>/10 caractères/.test(document.getElementById('ms-err').textContent)),'un nouveau mot de passe trop court est refusé');
  await p.fill('#ms-in',cle); await p.fill('#ms-n1',NOUV); await p.fill('#ms-n2',NOUV); await p.click('#ms-go');
  A(await nav() && await ev(()=>DB.clients.some(c=>c.denomination==='CLIENT TRES SECRET')),'la clé de secours rouvre les données');
  await rouvrir(); await saisir(MDP); await p.waitForTimeout(1500);
  A(!(await donnees()),'l’ancien mot de passe n’ouvre plus');
  await ev(()=>{ localStorage.removeItem('last-auth-fails'); localStorage.removeItem('last-auth-lock'); });
  await rouvrir(); await saisir(NOUV);
  A(await nav(),'le nouveau mot de passe ouvre Mar’q');

  A(errs.length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));
  await b.close(); serveur.close();
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); try{ serveur.close(); }catch(_){} process.exit(1); });
