/**
 * Mar'q — Lot sécurité v766 (recette 2.9, 2.10, 8.8, 8.11)
 *
 * 1. Plus aucune empreinte du mot de passe dans le code : au premier lancement
 *    sur un appareil, on CRÉE le mot de passe (qui chiffre aussitôt les données).
 * 2. Verrouillage après inactivité : la session est fermée, la clé oubliée.
 * 3. La sauvegarde exportée est chiffrée quand les données le sont…
 * 4. …et se restaure sur un autre appareil avec le mot de passe d'origine.
 * 5. Le portail refuse un fichier qui n'est pas une pièce (type réel vérifié).
 */
const { chromium } = require('./_socle.cjs');
const http = require('http'), fs = require('fs'), path = require('path');
const RACINE = path.resolve(__dirname, '..', '..');
const serveur = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/') p='/index.html';
  const f=path.join(RACINE,p); if(!f.startsWith(RACINE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json'})[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(fs.readFileSync(f)); });
let URL_APP='';
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const MDP='Appareil-Un-2026', MDP2='Appareil-Deux-2026';

async function appareil(b){
  const ctx=await b.newContext({viewport:{width:1360,height:900},acceptDownloads:true});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  return {ctx,p,errs,ev:(f,a)=>p.evaluate(f,a)};
}
const ouvert=p=>p.waitForFunction(()=>!document.getElementById('last-gate')&&!document.getElementById('mqsec-lock')&&typeof DB==='object'&&DB&&Array.isArray(DB.clients)&&window.marqPret&&window.marqPret(),{timeout:30000}).then(()=>true,()=>false);
async function creer(p,mdp){ await p.waitForSelector('#lg-newpwd',{timeout:15000}); await p.fill('#lg-newpwd',mdp); await p.fill('#lg-newpwd2',mdp); await p.click('#last-gate button[type=submit]'); }
async function fermerCle(p){ await p.waitForSelector('#ms-key',{timeout:10000}).catch(()=>{}); await p.evaluate(()=>{ try{ closeModal(); }catch(e){} }); }

(async()=>{
  await new Promise(r=>serveur.listen(0,'127.0.0.1',r)); URL_APP='http://127.0.0.1:'+serveur.address().port+'/index.html';
  const src=fs.readFileSync(path.join(RACINE,'index.html'),'utf8');
  A(!/LAST_PWD_HASH\s*=\s*['"][0-9a-f]{64}/.test(src),'aucune empreinte de mot de passe n’est inscrite dans le code publié');
  const b=await chromium.launch();

  /* ---------- 1. premier lancement : création du mot de passe ---------- */
  const U=await appareil(b); await U.p.goto(URL_APP);
  A(await U.p.waitForSelector('#lg-newpwd',{timeout:15000}).then(()=>true,()=>false) && !(await U.ev(()=>!!document.getElementById('lg-pwd'))),
    'premier lancement : Mar’q demande de CRÉER le mot de passe (aucun mot de passe par défaut)');
  await U.p.fill('#lg-newpwd','court'); await U.p.fill('#lg-newpwd2','court'); await U.p.click('#last-gate button[type=submit]'); await U.p.waitForTimeout(300);
  A(await U.ev(()=>!!document.getElementById('last-gate')&&/10 caractères/.test(document.getElementById('lg-err').textContent)),'un mot de passe trop court est refusé');
  await U.p.fill('#lg-newpwd',MDP); await U.p.fill('#lg-newpwd2','autre-saisie-xx'); await U.p.click('#last-gate button[type=submit]'); await U.p.waitForTimeout(300);
  A(await U.ev(()=>!!document.getElementById('last-gate')&&/diffèrent/.test(document.getElementById('lg-err').textContent)),'deux saisies différentes sont refusées');
  await creer(U.p,MDP);
  A(await ouvert(U.p),'le mot de passe créé ouvre Mar’q');
  await U.p.waitForFunction(()=>window.mqSec.actif()&&window.mqSec.lie(),{timeout:20000}).catch(()=>{});
  A(await U.ev(()=>window.mqSec.actif()&&window.mqSec.lie()),'les données sont chiffrées avec ce mot de passe');
  await fermerCle(U.p);
  A(await U.ev(()=>!localStorage.getItem('last-pwd')&&!localStorage.getItem('last-pwd2')),'aucune empreinte du mot de passe n’est gardée sur l’appareil');
  await U.ev(()=>{ DB.clients.push({id:'s766',clientType:'entreprise',denomination:'CLIENT SAUVEGARDE 766',associes:[],docVars:{}}); save(); });
  await U.p.waitForTimeout(1200);

  /* ---------- 3. export chiffré ---------- */
  const [dl]=await Promise.all([U.p.waitForEvent('download',{timeout:15000}),U.ev(()=>marqExport())]);
  const paquet=fs.readFileSync(await dl.path(),'utf8');
  A(paquet.slice(0,5)==='MQS1.' && !/CLIENT SAUVEGARDE 766/.test(paquet),'la sauvegarde exportée est chiffrée (aucun nom de client lisible)',dl.suggestedFilename());
  A(await U.ev(t=>window.mqSec.estPortable(t),paquet),'la sauvegarde embarque de quoi s’ouvrir sur un autre appareil (avec le mot de passe)');

  /* ---------- 2. verrouillage après inactivité ---------- */
  await U.ev(()=>window.mqInactivite.regler(0.05));
  A(await U.ev(()=>Math.abs(window.mqInactivite.delai()-0.05)<1e-9),'le délai d’inactivité est réglable');
  const verrou=await U.p.waitForSelector('#lg-pwd',{timeout:25000}).then(()=>true,()=>false);
  A(verrou && !(await U.ev(()=>window.mqSec.pret())) && !(await U.ev(()=>typeof DB==='object'&&DB!==null&&Array.isArray(DB.clients))),
    'après l’inactivité, Mar’q se verrouille : clé oubliée, données fermées');
  await U.p.waitForFunction(()=>/inactivité/.test((document.getElementById('lg-err')||{}).textContent||''),{timeout:8000}).catch(()=>{});
  A(await U.ev(()=>/inactivité/.test((document.getElementById('lg-err')||{}).textContent||'')),'l’écran d’accès explique le verrouillage');
  await U.ev(()=>{ try{ localStorage.setItem('marq-verrou-min','60'); }catch(e){} });
  await U.p.fill('#lg-pwd','mauvais-mot-de-passe'); await U.p.press('#lg-pwd','Enter'); await U.p.waitForTimeout(800);
  A(await U.ev(()=>!!document.getElementById('last-gate')),'un mauvais mot de passe ne rouvre pas');
  await U.ev(()=>{ localStorage.removeItem('last-auth-fails'); localStorage.removeItem('last-auth-lock'); });
  await U.p.fill('#lg-pwd',MDP); await U.p.press('#lg-pwd','Enter');
  A(await ouvert(U.p) && await U.ev(()=>DB.clients.some(c=>c.id==='s766')),'le mot de passe rouvre les données après le verrouillage');
  await U.ev(()=>window.mqInactivite.regler(60));

  /* ---------- 4. restauration sur un autre appareil ---------- */
  const D=await appareil(b); await D.p.goto(URL_APP); await creer(D.p,MDP2);
  A(await ouvert(D.p),'second appareil : son propre mot de passe');
  await D.p.waitForFunction(()=>window.mqSec.actif()&&window.mqSec.lie(),{timeout:20000}).catch(()=>{}); await fermerCle(D.p);
  A(!(await D.ev(()=>DB.clients.some(c=>c.id==='s766'))),'le second appareil ne contient pas encore le client');
  await D.ev(t=>window.mqSauvAppliquer(t),paquet);
  await D.p.waitForSelector('#mqds-in',{timeout:10000});
  await D.p.fill('#mqds-in','pas-le-bon-mot'); await D.p.click('#mqds-ok'); await D.p.waitForTimeout(1200);
  A(await D.ev(()=>!!document.getElementById('mqds-in')),'un mot de passe erroné est refusé, la saisie est redemandée');
  await D.p.fill('#mqds-in',MDP); await Promise.all([D.p.waitForNavigation({timeout:20000}).catch(()=>{}),D.p.click('#mqds-ok')]);
  await D.p.waitForSelector('#lg-pwd, #ms-in',{timeout:15000}).catch(()=>{});
  const champ=await D.ev(()=>document.getElementById('lg-pwd')?'#lg-pwd':'#ms-in');
  await D.p.fill(champ,MDP2); if(champ==='#ms-in') await D.p.click('#ms-go'); else await D.p.press(champ,'Enter');
  A(await ouvert(D.p) && await D.ev(()=>DB.clients.some(c=>c.id==='s766')),'restaurée avec le mot de passe d’origine, la sauvegarde rouvre ses données sur le second appareil');
  A(await D.ev(()=>{ const v=localStorage.getItem('last-db-v1')||''; return v.indexOf('MQS1.')===0 && !/CLIENT SAUVEGARDE 766/.test(JSON.stringify(localStorage)); }),
    'sur le second appareil, les données restaurées restent chiffrées (clé du second appareil)');

  /* ---------- 6. clé de chiffrement effacée : pas de faux « premier lancement » ---------- */
  await D.ev(()=>sessionStorage.clear()); await D.p.reload(); await D.p.waitForSelector('#lg-pwd, #ms-in',{timeout:15000});
  const avant=await D.ev(()=>localStorage.getItem('last-db-v1'));
  await D.ev(()=>localStorage.removeItem('last-sec')); await D.p.reload(); await D.p.waitForTimeout(5000);
  const o=await D.ev(()=>({orph:!!document.getElementById('lg-orph-ok'), creer:!!document.getElementById('lg-newpwd'), base:localStorage.getItem('last-db-v1')}));
  A(o.orph && !o.creer,'état de chiffrement effacé : Mar’q ne propose pas de « premier lancement » (qui écraserait la base)');
  A(o.base===avant,'la base chiffrée reste intacte tant que l’utilisateur n’a pas confirmé la réinitialisation');
  await D.p.check('#lg-orph-ok'); await D.p.click('text=Réinitialiser cet appareil'); await D.p.waitForTimeout(500);
  A(await D.ev(()=>!!document.getElementById('lg-newpwd')&&!localStorage.getItem('last-db-v1')),'réinitialisation confirmée : l’appareil repart de zéro (la sauvegarde se restaure ensuite)');

  A(U.errs.length===0&&D.errs.length===0,'aucune erreur de page',U.errs.concat(D.errs).slice(0,3).join(' | '));
  await b.close(); serveur.close();
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); try{ serveur.close(); }catch(_){} process.exit(1); });
