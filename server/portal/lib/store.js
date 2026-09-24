'use strict';
/*
 * store.js — Couche de stockage sur disque, simple et portable (aucun service tiers).
 *
 * Arborescence sous DATA_DIR :
 *   clients.json   → { "<ckey>": { name, codeHash, message?, suivi? } }  (codes HASHÉS, jamais en clair ;
 *                    suivi = avancement public des dossiers, voir nettoyerSuivi)
 *   docs.json      → { "<ckey>": [ { id, nom, cat, date, type, size } ] }  (docs PARTAGÉS)
 *   meta.json      → { cabinet: "AEM CONSEIL" }               (paramètres d'affichage)
 *   files/<id>     → contenu binaire du fichier
 *
 *  - ckey = nom du client normalisé (minuscule + trim), identique à la logique front.
 *  - On ne stocke QUE les documents partagés (shared:true) poussés par le cabinet.
 *  - Les fichiers sont stockés hors-JSON (dossier files/), servis avec leur Content-Type.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hasherCode } = require('./crypto');

let DIR = null;
let FILES_DIR = null;
let BACKUPS_DIR = null;

function init(dataDir) {
  DIR = dataDir;
  FILES_DIR = path.join(DIR, 'files');
  BACKUPS_DIR = path.join(DIR, 'backups');
  fs.mkdirSync(FILES_DIR, { recursive: true });
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  // Crée les JSON manquants.
  for (const f of ['clients.json', 'docs.json', 'meta.json', 'backups.json']) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) fs.writeFileSync(p, f === 'meta.json' ? '{"cabinet":""}' : (f === 'backups.json' ? '[]' : '{}'));
  }
}

/* ---- Normalisation identique au front (ckey) ---- */
function ckey(c) { return String(c == null ? '' : c).trim().toLowerCase(); }

/* ---- Lecture/écriture JSON atomique ---- */
function lireJSON(nom) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, nom), 'utf8')) || {}; }
  catch (e) { return {}; }
}
function ecrireJSON(nom, obj) {
  const p = path.join(DIR, nom);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p); // remplacement atomique
}

/* ---- Fichiers ---- */
// id sûr : uniquement lettres/chiffres/-/_/. (empêche toute traversée de chemin).
function idSur(id) { return /^[A-Za-z0-9._-]{1,128}$/.test(String(id || '')); }
function cheminFichier(id) {
  if (!idSur(id)) return null;
  return path.join(FILES_DIR, id);
}
function ecrireFichier(id, buffer) {
  const p = cheminFichier(id);
  if (!p) throw new Error('id de fichier invalide');
  fs.writeFileSync(p, buffer);
}
function lireFichier(id) {
  const p = cheminFichier(id);
  if (!p || !fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}
function supprimerFichier(id) {
  const p = cheminFichier(id);
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
}

/* ---- Décodage d'un fichier fourni en dataURL ou base64 brut ---- */
function decoderContenu(data) {
  if (Buffer.isBuffer(data)) return data;
  let s = String(data || '');
  const m = s.match(/^data:([^;]*);base64,(.*)$/); // data:<type>;base64,<b64>
  if (m) s = m[2];
  return Buffer.from(s, 'base64');
}

/* =========================================================================
 * API métier
 * ========================================================================= */

// Métadonnées cabinet (nom affiché sur le portail).
function getMeta() { return lireJSON('meta.json'); }
function setMeta(m) { ecrireJSON('meta.json', Object.assign(getMeta(), m || {})); }

// Récupère la fiche d'un client par son nom (ou ckey).
function getClient(nomOuKey) {
  const clients = lireJSON('clients.json');
  return clients[ckey(nomOuKey)] || null;
}

// Documents partagés d'un client (métadonnées uniquement).
function docsClient(nomOuKey) {
  const docs = lireJSON('docs.json');
  return docs[ckey(nomOuKey)] || [];
}

// Vérifie qu'un fichier (par id) appartient bien au client donné ET est partagé.
function docAppartientAuClient(nomOuKey, fileId) {
  return docsClient(nomOuKey).some(function (d) { return d.id === fileId; });
}

/* -------------------------------------------------------------------------
 * Journal de consultation : trace des connexions et accès aux documents.
 * events.json = [ { ts, client, name, type, docId?, docNom?, ip? }, ... ]
 * (plafonné aux MAX_EVENTS plus récents pour rester léger).
 * ------------------------------------------------------------------------- */
const MAX_EVENTS = 3000;
function logEvent(clientKey, type, opts) {
  opts = opts || {};
  const k = ckey(clientKey);
  const fiche = getClient(k);
  const ev = { ts: Date.now(), client: k, name: (fiche && fiche.name) || k, type: type };
  if (opts.docId) ev.docId = String(opts.docId);
  if (opts.docNom) ev.docNom = String(opts.docNom);
  if (opts.ip) ev.ip = String(opts.ip);
  let arr = lireJSON('events.json');
  if (!Array.isArray(arr)) arr = [];
  arr.push(ev);
  if (arr.length > MAX_EVENTS) arr = arr.slice(arr.length - MAX_EVENTS);
  ecrireJSON('events.json', arr);
  return ev;
}
// Événements récents (les plus récents d'abord), filtrables par client.
function getEvents(limit, clientKey) {
  let arr = lireJSON('events.json');
  if (!Array.isArray(arr)) arr = [];
  if (clientKey) { const k = ckey(clientKey); arr = arr.filter(function (e) { return e.client === k; }); }
  arr = arr.slice().reverse();
  const n = Math.max(1, Math.min(parseInt(limit || 200, 10) || 200, 1000));
  return arr.slice(0, n);
}

/* -------------------------------------------------------------------------
 * Dépôts client (le client envoie une pièce au cabinet depuis le portail).
 * uploads.json = [ { id, client, name, nom, type, size, ts } ] ; les octets
 * sont stockés via ecrireFichier(id) (préfixe up_ pour ne pas collisionner
 * avec les documents partagés du cabinet).
 * ------------------------------------------------------------------------- */
function enregistrerUpload(clientKey, meta, data) {
  const k = ckey(clientKey);
  const fiche = getClient(k);
  const id = 'up_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  ecrireFichier(id, decoderContenu(data)); // lève si data invalide
  const buf = lireFichier(id);
  const entree = {
    id: id,
    client: k,
    name: (fiche && fiche.name) || k,
    nom: String((meta && meta.nom) || 'document').slice(0, 180).replace(/[\r\n]/g, ''),
    type: String((meta && meta.type) || 'application/octet-stream').slice(0, 120),
    size: buf ? buf.length : 0,
    ts: Date.now(),
  };
  let arr = lireJSON('uploads.json');
  if (!Array.isArray(arr)) arr = [];
  arr.push(entree);
  ecrireJSON('uploads.json', arr);
  return entree;
}
function getUploads(clientKey) {
  let arr = lireJSON('uploads.json');
  if (!Array.isArray(arr)) arr = [];
  if (clientKey) { const k = ckey(clientKey); arr = arr.filter(function (u) { return u.client === k; }); }
  return arr.slice().reverse(); // plus récents d'abord
}
function getUpload(id) {
  let arr = lireJSON('uploads.json');
  if (!Array.isArray(arr)) arr = [];
  return arr.find(function (u) { return u.id === id; }) || null;
}

// Révoque l'accès d'un client : supprime son empreinte de code (login impossible)
// tout en conservant sa fiche/documents (restaurés à la prochaine synchronisation).
function revokeClient(nomOuKey) {
  const k = ckey(nomOuKey);
  const clients = lireJSON('clients.json');
  if (clients[k]) { delete clients[k].codeHash; ecrireJSON('clients.json', clients); return true; }
  return false;
}
function supprimerUpload(id) {
  let arr = lireJSON('uploads.json');
  if (!Array.isArray(arr)) arr = [];
  const avant = arr.length;
  arr = arr.filter(function (u) { return u.id !== id; });
  ecrireJSON('uploads.json', arr);
  try { supprimerFichier(id); } catch (e) {}
  return avant !== arr.length;
}

/* -------------------------------------------------------------------------
 * Déclarations du client (v748) : absence, demande d'achat, embauche, sinistre.
 *   declarations.json → [ { id, client, name, ts, type, champs, statut, motif, maj } ]
 * Le client ne dépose que des champs connus, nettoyés et bornés ; le cabinet
 * les relève, les valide dans Mar'q et renvoie l'état (reçue, en cours,
 * validée, refusée + motif) que le client voit dans son espace.
 * ------------------------------------------------------------------------- */
const DECL_CHAMPS = {
  Absence: ['salarieId', 'salarieNom', 'type', 'debut', 'fin', 'commentaire'],
  Achat: ['objet', 'fournisseur', 'montant', 'commentaire'],
  Embauche: ['prenom', 'nom', 'poste', 'contrat', 'entree', 'fin', 'commentaire'],
  Sinistre: ['date', 'nature', 'lieu', 'description', 'commentaire'],
};
const DECL_STATUTS = { recue: 1, examen: 1, accord: 1, validee: 1, refusee: 1 };
const MAX_DECL = 5000;
function nettoyerAdmin(a) {
  const txt = function (v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, n); };
  return {
    inscrit: !!a.inscrit,
    salaries: (Array.isArray(a.salaries) ? a.salaries : []).slice(0, 300).filter(function (x) { return x && x.id; })
      .map(function (x) { return { id: txt(x.id, 60), nom: txt(x.nom, 80) }; }),
  };
}
function nettoyerDeclaration(type, champs) {
  const L = DECL_CHAMPS[type];
  if (!L) return null;
  const out = {};
  L.forEach(function (k) {
    const v = champs && champs[k];
    if (v == null || v === '') return;
    out[k] = String(v).replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').slice(0, k === 'description' || k === 'commentaire' ? 1500 : 160);
  });
  return out;
}
function lireDecl() { const a = lireJSON('declarations.json'); return Array.isArray(a) ? a : []; }
function enregistrerDeclaration(clientKey, type, champs) {
  const k = ckey(clientKey);
  const fiche = getClient(k);
  const c = nettoyerDeclaration(type, champs);
  if (!c) throw new Error('type');
  let arr = lireDecl();
  const d = { id: 'dcl_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex'), client: k, name: (fiche && fiche.name) || k,
    ts: Date.now(), type: type, champs: c, statut: 'recue', motif: '', maj: Date.now() };
  arr.push(d);
  if (arr.length > MAX_DECL) arr = arr.slice(arr.length - MAX_DECL);
  ecrireJSON('declarations.json', arr);
  return d;
}
function getDeclarations(clientKey) {
  let arr = lireDecl();
  if (clientKey) { const k = ckey(clientKey); arr = arr.filter(function (d) { return d.client === k; }); }
  return arr.slice().reverse();
}
function majDeclaration(id, statut, motif) {
  if (!DECL_STATUTS[statut]) return null;
  const arr = lireDecl();
  const d = arr.find(function (x) { return x.id === id; });
  if (!d) return null;
  d.statut = statut; d.motif = String(motif || '').slice(0, 600); d.maj = Date.now();
  ecrireJSON('declarations.json', arr);
  return d;
}
function supprimerDeclaration(id) {
  const arr = lireDecl();
  const reste = arr.filter(function (x) { return x.id !== id; });
  ecrireJSON('declarations.json', reste);
  return reste.length !== arr.length;
}

/* -------------------------------------------------------------------------
 * Synchronisation depuis le cabinet (endpoint /admin/sync).
 * payload = {
 *   cabinet?: string,
 *   clients: [ { name, code } ],   // code EN CLAIR -> haché ici, jamais stocké en clair
 *   docs:    [ { id, client, nom, cat, date, type, size } ],  // uniquement shared:true
 *   files?:  { "<id>": { name, type, data } }   // data = dataURL ou base64 (optionnel)
 * }
 * mode = 'replace' (défaut, remplace tout l'état) | 'merge' (fusionne/complète)
 * ------------------------------------------------------------------------- */
/* Avancement des dossiers visible par le client : uniquement des libellés
 * publics, nettoyés et bornés (le serveur ne garde rien d'autre). */
function nettoyerSuivi(L) {
  const txt = function (v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, n); };
  const ETATS = { fait: 1, encours: 1, avenir: 1 };
  return (L || []).slice(0, 10).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) {
    return {
      ref: txt(x.ref, 40), formalite: txt(x.formalite, 80), phrase: txt(x.phrase, 160), enCours: txt(x.enCours, 60),
      maj: /^\d{4}-\d{2}-\d{2}$/.test(String(x.maj || '')) ? String(x.maj) : '',
      fait: Math.max(0, Math.min(20, parseInt(x.fait, 10) || 0)), total: Math.max(0, Math.min(20, parseInt(x.total, 10) || 0)),
      termine: !!x.termine,
      etapes: (Array.isArray(x.etapes) ? x.etapes : []).slice(0, 15).map(function (e) {
        return { lbl: txt(e && e.lbl, 60), etat: ETATS[e && e.etat] ? e.etat : 'avenir' }; }),
      attendu: (Array.isArray(x.attendu) ? x.attendu : []).slice(0, 8).map(function (a) { return txt(a, 120); }),
    };
  });
}

function syncCabinet(payload, mode) {
  mode = mode || 'replace';
  payload = payload || {};

  if (typeof payload.cabinet === 'string') setMeta({ cabinet: payload.cabinet });

  // 1) Clients + codes (hachés).
  const clientsOut = mode === 'merge' ? lireJSON('clients.json') : {};
  (payload.clients || []).forEach(function (c) {
    const k = ckey(c.name);
    if (!k) return;
    const entree = clientsOut[k] || { name: (c.name || '').trim() };
    entree.name = (c.name || '').trim() || entree.name;
    // Le code n'est haché que s'il est fourni (permet de resynchroniser les docs
    // sans changer le code existant en mode merge).
    if (c.code) entree.codeHash = hasherCode(c.code);
    if (typeof c.message === 'string') entree.message = c.message.slice(0, 600);
    if (Array.isArray(c.suivi)) entree.suivi = nettoyerSuivi(c.suivi);
    if (c.admin && typeof c.admin === 'object') entree.admin = nettoyerAdmin(c.admin); else if (mode !== 'merge') delete entree.admin;
    if (entree.codeHash) clientsOut[k] = entree;
  });
  ecrireJSON('clients.json', clientsOut);

  // 2) Documents partagés (métadonnées), regroupés par client.
  const docsOut = mode === 'merge' ? lireJSON('docs.json') : {};
  const idsConserves = {}; // pour le nettoyage des fichiers en mode replace
  (payload.docs || []).forEach(function (d) {
    if (!d || d.shared === false || !d.id) return; // on n'accepte QUE le partagé
    const k = ckey(d.client);
    if (!k) return;
    if (!docsOut[k]) docsOut[k] = [];
    // Évite les doublons d'id lors d'un merge.
    docsOut[k] = docsOut[k].filter(function (x) { return x.id !== d.id; });
    docsOut[k].push({
      id: String(d.id),
      nom: d.nom || d.name || 'Document',
      cat: d.cat || 'Divers',
      date: d.date || '',
      type: d.type || d.ftype || 'application/octet-stream',
      size: d.size || d.fsize || 0,
    });
    idsConserves[String(d.id)] = true;
  });
  ecrireJSON('docs.json', docsOut);

  // 3) Fichiers inline éventuels.
  let fichiersEcrits = 0;
  if (payload.files && typeof payload.files === 'object') {
    Object.keys(payload.files).forEach(function (id) {
      if (!idSur(id)) return;
      const f = payload.files[id];
      // Tolère les deux formes : { name, type, data } OU une dataURL/base64 en chaîne directe.
      const data = (f && typeof f === 'object') ? f.data : f;
      if (!data) return;
      try { ecrireFichier(id, decoderContenu(data)); fichiersEcrits++; } catch (e) {}
    });
  }

  // 4) Nettoyage : en mode replace, supprime les fichiers orphelins (non référencés).
  let fichiersSupprimes = 0;
  if (mode === 'replace') {
    // Recense tous les ids réellement référencés après écriture.
    const refs = {};
    Object.keys(docsOut).forEach(function (k) {
      docsOut[k].forEach(function (d) { refs[d.id] = true; });
    });
    try {
      fs.readdirSync(FILES_DIR).forEach(function (nom) {
        if (!refs[nom]) { supprimerFichier(nom); fichiersSupprimes++; }
      });
    } catch (e) {}
  }

  return {
    clients: Object.keys(clientsOut).length,
    docs: Object.keys(docsOut).reduce(function (n, k) { return n + docsOut[k].length; }, 0),
    fichiersEcrits: fichiersEcrits,
    fichiersSupprimes: fichiersSupprimes,
  };
}

/* Upload d'un fichier isolé (endpoint /admin/file). */
function enregistrerFichier(id, data) {
  if (!idSur(id)) throw new Error('id invalide');
  ecrireFichier(id, decoderContenu(data));
}

/* =====================================================================
 * SAUVEGARDES HORS MACHINE (v714)
 * Le cabinet dépose ici une copie de sa base. Le serveur ne stocke qu'un
 * BLOC OPAQUE : quand le chiffrement au repos est actif côté cabinet, ce
 * bloc est une enveloppe AES-256-GCM dont la clé ne quitte jamais le
 * poste — le serveur ne peut donc pas lire ce qu'il conserve, et n'a
 * aucun besoin de le pouvoir.
 * Index dans backups.json (métadonnées seules), contenu dans backups/.
 * ===================================================================== */
const BACKUPS_MAX = parseInt(process.env.BACKUPS_MAX || '30', 10);

function lireIndexSauvegardes() {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(DIR, 'backups.json'), 'utf8'));
    return Array.isArray(t) ? t : [];
  } catch (e) { return []; }
}
function ecrireIndexSauvegardes(liste) {
  const tmp = path.join(DIR, 'backups.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(liste, null, 2));
  fs.renameSync(tmp, path.join(DIR, 'backups.json'));
}
function cheminSauvegarde(id) {
  if (!idSur(id)) throw new Error('identifiant de sauvegarde invalide');
  return path.join(BACKUPS_DIR, id + '.blob');
}

function enregistrerSauvegarde(meta, blob) {
  const texte = String(blob == null ? '' : blob);
  if (!texte) throw new Error('sauvegarde vide');
  const ts = parseInt(meta && meta.ts, 10) || Date.now();
  const id = String(ts) + '-' + crypto.randomBytes(6).toString('hex');
  fs.writeFileSync(cheminSauvegarde(id), texte, 'utf8');

  const entree = {
    id: id,
    ts: ts,
    iso: new Date(ts).toISOString(),
    taille: Buffer.byteLength(texte, 'utf8'),
    ver: parseInt(meta && meta.ver, 10) || 0,
    chiffre: !!(meta && meta.chiffre),
    poste: String((meta && meta.poste) || '').slice(0, 80),
  };
  let liste = lireIndexSauvegardes();
  liste.unshift(entree);
  liste.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

  /* Rotation : au-delà du plafond, les plus anciennes sont effacées —
     index et fichier ensemble, pour ne jamais laisser d'orphelin. */
  const trop = liste.slice(BACKUPS_MAX);
  liste = liste.slice(0, BACKUPS_MAX);
  trop.forEach(function (e) { try { fs.unlinkSync(cheminSauvegarde(e.id)); } catch (_) {} });
  ecrireIndexSauvegardes(liste);
  return { entree: entree, total: liste.length, purgees: trop.length };
}

function listerSauvegardes(limit) {
  const n = Math.min(Math.max(parseInt(limit, 10) || BACKUPS_MAX, 1), 200);
  return lireIndexSauvegardes().slice(0, n);
}
function lireSauvegarde(id) {
  const e = lireIndexSauvegardes().filter(function (x) { return x.id === id; })[0];
  if (!e) return null;
  try { return { entree: e, blob: fs.readFileSync(cheminSauvegarde(id), 'utf8') }; }
  catch (err) { return null; }
}
function supprimerSauvegarde(id) {
  const liste = lireIndexSauvegardes();
  const reste = liste.filter(function (x) { return x.id !== id; });
  if (reste.length === liste.length) return false;
  try { fs.unlinkSync(cheminSauvegarde(id)); } catch (_) {}
  ecrireIndexSauvegardes(reste);
  return true;
}

module.exports = {
  init, ckey,
  getMeta, setMeta,
  getClient, docsClient, docAppartientAuClient, nettoyerSuivi,
  lireFichier, enregistrerFichier,
  syncCabinet,
  logEvent, getEvents,
  enregistrerUpload, getUploads, getUpload, supprimerUpload,
  enregistrerDeclaration, getDeclarations, majDeclaration, supprimerDeclaration, DECL_CHAMPS,
  revokeClient,
  enregistrerSauvegarde, listerSauvegardes, lireSauvegarde, supprimerSauvegarde,
};
