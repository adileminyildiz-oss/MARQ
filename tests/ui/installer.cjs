/**
 * Mar'q — Installer sur tous les appareils (v764)
 *
 * Fige :
 *  - le manifeste : nom, identifiant, et chaque icône déclarée existe, au bon
 *    format et à la taille annoncée (192, 512, 512 « maskable », SVG) ;
 *  - les icônes de la page (Apple 180 px, favicon .ico) et le kit à télécharger
 *    (zip, PNG 1024, .ico, .icns, .svg) sont présents et valides ;
 *  - la page publique installer.html : système reconnu, code QR, étapes des
 *    cinq systèmes, transfert des données, liens de téléchargement valides ;
 *  - la carte « Installer Mar'q sur vos appareils » dans Paramètres, placée
 *    avant « Sauvegarde & restauration », avec son code QR et ses liens.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };

const RACINE = path.resolve(__dirname, '..', '..');
const lire = f => fs.readFileSync(path.join(RACINE, f));
function taillePng(buf){ if(buf.slice(1,4).toString()!=='PNG') return null; return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; }

/* 1. Fichiers */
const man = JSON.parse(lire('manifest.webmanifest').toString());
A(man.id && man.start_url==='./' && man.display==='standalone' && /Mar’q/.test(man.short_name),'manifeste : identifiant, démarrage et affichage en application');
for(const ic of man.icons){
  const f = path.join(RACINE, ic.src);
  if(!fs.existsSync(f)){ A(false,'icône du manifeste présente : '+ic.src); continue; }
  if(/png/.test(ic.type)){ const t=taillePng(fs.readFileSync(f)); A(t && ic.sizes===t[0]+'x'+t[1],'icône '+ic.src+' à la taille annoncée ('+ic.sizes+')', t&&t.join('x')); }
  else A(/<svg/.test(fs.readFileSync(f,'utf8')),'icône vectorielle '+ic.src+' valide');
}
A(man.icons.some(i=>i.purpose==='maskable'),'une icône « maskable » pour Android');
A((taillePng(lire('apple-touch-icon.png'))||[]).join('x')==='180x180','icône Apple 180 × 180');
A(lire('favicon.ico').readUInt16LE(2)===1 && lire('favicon.ico').readUInt16LE(4)>=5,'favicon .ico multi-tailles');
A(lire('icones/marq.icns').slice(0,4).toString()==='icns','icône macOS .icns valide');
A((taillePng(lire('icones/marq-1024.png'))||[]).join('x')==='1024x1024','PNG 1024 px pour le kit');
A(lire('icones/Marq-icones.zip').readUInt32LE(0)===0x04034b50,'kit d’icônes .zip valide');
const idx = lire('index.html').toString();
A(/rel="apple-touch-icon" href="apple-touch-icon\.png"/.test(idx),'Mar’q déclare l’icône Apple 180 px');
const sw = lire('sw.js').toString();
A(/'installer\.html'/.test(sw) && /'icon-192\.png'/.test(sw),'la page d’installation et les icônes sont gardées hors connexion');

/* 2. Serveur local pour les pages */
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.icns':'application/octet-stream','.zip':'application/zip'};
const serveur = http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/') p='/index.html';
  const f=path.join(RACINE,p);
  if(!f.startsWith(RACINE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(fs.readFileSync(f));
});

(async()=>{
  await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
  const BASE='http://127.0.0.1:'+serveur.address().port+'/';
  const b=await chromium.launch(); const errs=[];

  /* installer.html vu depuis un iPhone et depuis Windows */
  for(const [ua,attendu,sys] of [
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1','iPhone','ios'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0','Windows','windows']]){
    const c=await b.newContext({viewport:{width:sys==='ios'?390:1280,height:900},userAgent:ua}); const p=await c.newPage();
    p.on('pageerror',e=>errs.push(''+e));
    await p.goto(BASE+'installer.html'); await p.waitForTimeout(600);
    const r=await p.evaluate(()=>({sys:document.getElementById('sys-nom').textContent, actif:(document.querySelector('.sys.actif')||{dataset:{}}).dataset.sys,
      qr:document.getElementById('qr').naturalWidth, adr:document.getElementById('adresse').textContent, systemes:document.querySelectorAll('.sys').length,
      etapes:document.getElementById('ici-etapes').textContent, liens:[...document.querySelectorAll('.fichiers a')].map(a=>a.getAttribute('href')),
      large:document.documentElement.scrollWidth<=innerWidth+1}));
    A(r.sys.includes(attendu) && r.actif===sys,'installer.html reconnaît '+attendu,r.sys);
    A(r.qr>0 && /installer\.html$/.test(r.adr),'code QR vers la page d’installation ('+attendu+')');
    A(r.systemes===5,'étapes pour les cinq systèmes');
    A(r.etapes.length>20,'étapes adaptées à l’appareil affichées ('+attendu+')');
    A(r.large,'pas de défilement horizontal ('+attendu+')');
    if(sys==='ios'){
      for(const h of r.liens){ const st=await p.evaluate(u=>fetch(u).then(x=>x.status),h); A(st===200,'téléchargement disponible : '+h,String(st)); }
      A(await p.evaluate(()=>/Exporter une sauvegarde/.test(document.body.textContent)&&/Restaurer une sauvegarde/.test(document.body.textContent)),'transfert des données expliqué');
    }
    await c.close();
  }

  /* Carte dans Paramètres */
  const p=await b.newPage({viewport:{width:1300,height:950}}); p.on('pageerror',e=>errs.push(''+e));
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} }); await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
  const h=await p.evaluate(()=>window.pageParams());
  A(h.indexOf('Installer Mar’q sur vos appareils')>=0 && (h.match(/mq-inst"/g)||[]).length===1,'carte « Installer Mar’q sur vos appareils » dans Paramètres, une seule fois');
  /* Rubrique réelle dans le menu de Paramètres : Données › Installer sur vos appareils */
  await p.evaluate(()=>{ state.page='params'; render(); });
  await p.waitForTimeout(400);
  const rub=await p.evaluate(()=>{ const b=document.querySelector('.sp-item[data-p="dat/install"]'); if(!b) return {menu:false};
    b.click(); const s=document.querySelector('.sp-slot.on[data-slot="dat/install"]');
    return {menu:true, libelle:b.textContent, visible:!!(s&&s.offsetParent&&/Installer Mar’q sur vos appareils/.test(s.textContent))}; });
  A(rub.menu && /Installer sur vos appareils/.test(rub.libelle),'rubrique « Données › Installer sur vos appareils » dans le menu',JSON.stringify(rub));
  A(rub.visible,'la carte s’affiche quand on ouvre la rubrique');
  const carte=await p.evaluate(()=>{ const d=document.createElement('div'); d.innerHTML=window.marqInstallerCard(); document.body.appendChild(d);
    const r={qr:!!d.querySelector('.mq-inst-q img[src^="data:image"]'), btn:!!d.querySelector('button[onclick="marqInstallerIci()"]'),
      page:(d.querySelector('a[href$="installer.html"]')||{}).href||'', zip:(d.querySelector('a[href$="Marq-icones.zip"]')||{}).href||''}; d.remove(); return r; });
  A(carte.qr,'code QR dans la carte');
  A(carte.btn,'bouton « Installer sur cet appareil »');
  A(/installer\.html$/.test(carte.page) && /Marq-icones\.zip$/.test(carte.zip),'liens vers la page d’installation et le kit d’icônes');
  A(await p.evaluate(()=>{ let ouvert=''; const o=window.open; window.open=u=>{ ouvert=u; return null; }; try{ marqInstallerIci(); } finally{ window.open=o; } return /installer\.html$/.test(ouvert); }),
    'sans invite d’installation du navigateur, le bouton ouvre la page d’installation');

  A(errs.length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));
  await b.close(); serveur.close();
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); try{serveur.close();}catch(_){} process.exit(1); });
