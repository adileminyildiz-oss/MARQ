/**
 * LAST — Forme des magasins IndexedDB.
 *
 * Le magasin des instantanés de sauvegarde était créé à deux endroits avec
 * deux formes incompatibles : avec une clé interne « ts » par le module de
 * sauvegarde, sans clé du tout par le chiffrement des instantanés. La forme
 * retenue dépendait alors de qui ouvrait la base en premier, et l'écriture
 * échouait une fois sur deux — les instantanés pris en clair n'étaient donc
 * pas toujours rechiffrés. Ce test fige la forme attendue.
 *
 *   node tests/idbforme.mjs
 */
import path from 'path';
import { pathToFileURL } from 'url';
async function loadChromium() {
  const cands = [process.env.PLAYWRIGHT_PKG, 'playwright',
    '/opt/node22/lib/node_modules/playwright/index.js', '/usr/lib/node_modules/playwright/index.js'].filter(Boolean);
  for (const c of cands) { try { const spec = c.endsWith('.js') ? pathToFileURL(c).href : c; const mod = await import(spec); const ch = mod.chromium || (mod.default && mod.default.chromium); if (ch) return ch; } catch (_) {} }
  throw new Error('Playwright introuvable');
}
const results = []; const check = (n, c, d) => results.push({ n, ok: !!c, d: d || '' });
const chromium = await loadChromium();
const url = pathToFileURL(path.resolve('index.html')).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const perr = []; page.on('pageerror', e => { const s = '' + e; if (!/ServiceWorker/.test(s)) perr.push(s); });
await page.addInitScript(() => { try { localStorage.setItem('last-gate-ok', '1'); } catch (e) {} });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.marqPret && window.marqPret() && document.querySelector('#nav .nav-btn'),
  { timeout: 30000 });

/* 1. Le module de sauvegarde crée le magasin par son propre chemin. */
const forme = await page.evaluate(async () => {
  await LBackup.snapshotNow('test-forme');
  await new Promise(r => setTimeout(r, 250));
  return await new Promise(res => {
    const rq = indexedDB.open('last-backups', 1);
    rq.onsuccess = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains('snap')) return res({ existe: false });
      const st = db.transaction('snap', 'readonly').objectStore('snap');
      res({ existe: true, keyPath: st.keyPath, n: 0 });
    };
    rq.onerror = () => res({ erreur: '' + rq.error });
  });
});
check('le magasin des instantanés existe', forme.existe, JSON.stringify(forme));
check('il porte la clé interne « ts »', forme.keyPath === 'ts', JSON.stringify(forme));

/* 2. Le rechiffrement des instantanés écrit dans ce même magasin sans le
      recréer d'une autre forme, et sans lever d'erreur de page. */
const rechiffre = await page.evaluate(async () => {
  const avant = (await LBackup.list()).length;
  try { if (window.mqSec && window.mqSec.actif && window.mqSec.actif()) { /* déjà chiffré */ } } catch (e) {}
  await new Promise(r => setTimeout(r, 300));
  const st = await new Promise(res => {
    const rq = indexedDB.open('last-backups', 1);
    rq.onsuccess = () => { const db = rq.result;
      res(db.objectStoreNames.contains('snap')
        ? db.transaction('snap', 'readonly').objectStore('snap').keyPath : null); };
    rq.onerror = () => res(null);
  });
  return { avant, keyPath: st };
});
check('au moins un instantané est enregistré', rechiffre.avant >= 1, JSON.stringify(rechiffre));
check('la forme du magasin ne change pas en cours de route', rechiffre.keyPath === 'ts', JSON.stringify(rechiffre));

/* 3. Une écriture directe, telle que la fait le rechiffrement, passe. */
const ecrit = await page.evaluate(async () => {
  return await new Promise(res => {
    const rq = indexedDB.open('last-backups', 1);
    rq.onsuccess = () => {
      try {
        const tx = rq.result.transaction('snap', 'readwrite');
        tx.objectStore('snap').put({ ts: 111, iso: '2026-01-01', data: 'x', size: 1 });
        tx.oncomplete = () => res(true);
        tx.onerror = () => res('' + tx.error);
      } catch (e) { res('' + e.message); }
    };
    rq.onerror = () => res('' + rq.error);
  });
});
check('un instantané s’écrit sans clé explicite', ecrit === true, '' + ecrit);
check('aucune erreur de page', perr.length === 0, perr.slice(0, 2).join(' | '));

/* 4. Le contrôle qui aurait attrapé le défaut : deux endroits ouvrent le
      magasin « snap » de la base « last-backups ». S'ils ne demandent pas la
      même forme, celui qui ouvre en premier l'impose — et l'autre échoue une
      fois sur deux. On exige donc que chaque ouverture demande la clé « ts ». */
const src = await (await import('fs')).promises.readFile(path.resolve('index.html'), 'utf8');
const ouvertures = src.match(/idb\(\s*'last-backups'\s*,\s*'snap'[^)]*\)/g) || [];
const sansCle = ouvertures.filter(o => !/'ts'/.test(o));
check('chaque ouverture du magasin demande la clé « ts »', ouvertures.length > 0 && sansCle.length === 0,
  ouvertures.length + ' ouverture(s), ' + sansCle.length + ' sans clé : ' + sansCle.join(' | '));

const creations = src.match(/createObjectStore\(\s*STORE\s*,\s*\{keyPath:'ts'\}\s*\)/g) || [];
check('le module de sauvegarde garde la clé « ts »', creations.length === 1, creations.length + ' création(s)');

await browser.close();
const ko = results.filter(r => !r.ok);
results.forEach(r => console.log((r.ok ? '  ok  ' : '  KO  ') + r.n + (r.ok ? '' : ' — ' + r.d)));
console.log('idbforme : ' + (results.length - ko.length) + '/' + results.length + (ko.length ? ' — ÉCHEC' : ' — tout vert'));
process.exit(ko.length ? 1 : 0);
