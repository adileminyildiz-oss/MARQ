/* ============================================================================
   Mar'q — Service worker « hors connexion », réseau d'abord
   ----------------------------------------------------------------------------
   But : ouvrir Mar'q même sans connexion, SANS jamais servir une version
   périmée quand le réseau est là.

   • Fichiers du site (index.html, manifeste, icônes…) : RÉSEAU D'ABORD.
     En ligne, chaque ouverture redemande le fichier au serveur (revalidation
     forcée) et garde la copie reçue. Le cache ne sert QUE si le réseau échoue
     (hors connexion, serveur injoignable). La version en ligne l'emporte donc
     toujours.
   • version.json et sw.js : jamais mis en cache (la détection des mises à
     jour doit toujours interroger le serveur).
   • Polices et bibliothèques (Google Fonts, cdnjs, jsDelivr, drapeaux) : leurs
     adresses sont figées par version → cache d'abord, rempli à l'installation
     puis au fil de l'eau.
   • Tout le reste (API, envois, synchronisations) passe par le réseau sans
     intervention.

   Remplace le kill-switch précédent (v504), dont les anciens caches « last-… »
   sont supprimés à l'activation.
   ============================================================================ */
var APP = 'marq-hors-ligne-v1';        /* copie de la dernière version chargée */
var LIB = 'marq-bibliotheques-v1';     /* polices et bibliothèques figées */

var COEUR = ['./', 'index.html', 'installer.html', 'manifest.webmanifest', 'icon-app.png', 'icon-192.png', 'icon-512.png',
             'icon-512-maskable.png', 'apple-touch-icon.png', 'favicon.ico', 'icones/marq.svg', 'icones/marq-512.png'];
var BIBLIOS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
var POLICES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];
var STATIQUES = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|flagcdn\.com)$/;

function garder(cache, url){
  return fetch(url, {cache: 'no-cache'}).then(function(r){ if(r && r.ok) return cache.put(url, r); }).catch(function(){});
}
/* Garde l'adresse si elle manque encore, et renvoie son texte (utile pour les feuilles de polices). */
function garderSiAbsent(cache, url){
  var lire = function(){ return cache.match(url).then(function(x){ return x ? x.text() : ''; }); };
  return cache.match(url).then(function(h){ return h ? h.text() : garder(cache, url).then(lire); }).catch(function(){ return ''; });
}

self.addEventListener('install', function(e){
  e.waitUntil(Promise.all([
    caches.open(APP).then(function(c){ return Promise.all(COEUR.map(function(u){ return garder(c, u); })); }),
    caches.open(LIB).then(function(c){
      var libs = BIBLIOS.map(function(u){ return garderSiAbsent(c, u); });
      /* Les feuilles Google Fonts pointent vers les fichiers de police : on les garde aussi. */
      var pol = POLICES.map(function(u){
        return garderSiAbsent(c, u).then(function(css){
          var urls = (css || '').match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [];
          return Promise.all(urls.map(function(f){ return garderSiAbsent(c, f); }));
        });
      });
      return Promise.all(libs.concat(pol));
    })
  ]).catch(function(){}).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('message', function(e){ if(e && e.data === 'skipWaiting'){ try{ self.skipWaiting(); }catch(_){} } });

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== APP && k !== LIB; }).map(function(k){ return caches.delete(k); }));
  }).catch(function(){}));
});

/* Une réponse issue d'une redirection ne peut pas servir une navigation : on la recopie. */
function propre(r){
  if(!r || !r.redirected) return r;
  return r.blob().then(function(b){ return new Response(b, {status: r.status, statusText: r.statusText, headers: r.headers}); });
}

function estAccueil(url){ return /\/(index\.html)?$/.test(url.pathname); }

function secours(req, url){
  return caches.open(APP).then(function(c){
    return c.match(req, {ignoreSearch: true}).then(function(r){
      if(r) return r;
      if(req.mode === 'navigate' && estAccueil(url))
        return c.match('index.html').then(function(x){ return x || c.match('./'); });
      return null;
    });
  }).then(function(r){
    return r || new Response('Hors connexion — cette page n’a pas encore été ouverte sur cet appareil.',
      {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
  });
}

/* STRATÉGIE : réseau d'abord pour les fichiers du site. */
function reseauDabord(req, url, garder){
  var nav = req.mode === 'navigate';
  var demande = nav ? fetch(url.href, {cache: 'no-cache', credentials: 'same-origin'})
                    : fetch(req, {cache: 'no-cache'});
  return demande.then(propre).then(function(r){
    if(r && r.ok && r.type === 'basic'){
      var a = r.clone(), b = nav && estAccueil(url) ? r.clone() : null;
      /* L'écriture de la copie locale doit aboutir même si le navigateur endort le worker : waitUntil. */
      var ecrit = caches.open(APP).then(function(c){
        return Promise.all([c.put(req, a), b ? c.put('index.html', b) : null]);
      }).catch(function(){});
      if(garder) garder(ecrit);
    }
    return r;
  }).catch(function(){ return secours(req, url); });
}

function cacheDabord(req){
  return caches.open(LIB).then(function(c){
    return c.match(req).then(function(h){
      if(h) return h;
      return fetch(req).then(function(r){
        if(r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(function(){});
        return r;
      });
    });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url; try{ url = new URL(req.url); }catch(_){ return; }
  if(url.origin === self.location.origin){
    if(/\/(version\.json|sw\.js)$/.test(url.pathname)) return;   /* toujours le réseau */
    e.respondWith(reseauDabord(req, url, function(p){ try{ e.waitUntil(p); }catch(_){} }));
    return;
  }
  if(url.protocol === 'https:' && STATIQUES.test(url.hostname)) e.respondWith(cacheDabord(req));
});
