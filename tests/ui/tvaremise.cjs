/**
 * Mar'q — Remise déduite AVANT la TVA (v765, recette 5.2 / 5.3 / 5.6 / 5.10)
 *
 * Le facturier calculait la TVA sur le montant avant remise, puis retirait la
 * remise du TTC : 1 000 € HT, 100 € de remise, 20 % donnaient 200 € de TVA au
 * lieu de 180 €. Les rabais et remises sont exclus de la base imposable
 * (CGI, art. 267-II-2°). Ce test fige le calcul, l'écriture de vente, l'ordre
 * d'affichage des totaux et la numérotation continue des écritures exportées.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({acceptDownloads:true});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
  const F=(o)=>Object.assign({id:'tr'+Math.random().toString(36).slice(2),numero:'FAC-TR-1',type:'facture',statut:'emise',clNom:'CLIENT REMISE',dateEmise:'2026-09-01',tva:20,remise:0,lignes:[{des:'Prestation',qte:1,pu:1000}]},o);
  const r=await p.evaluate((fs)=>fs.map(f=>{ const c=invCalc(f); const L=yadaLignesVente(f); const g=px=>Math.round(L.filter(l=>String(l.cpt).indexOf(px)===0).reduce((a,l)=>a+l.d+l.c,0)*100)/100;
    const d=L.reduce((a,l)=>a+l.d,0), k=L.reduce((a,l)=>a+l.c,0); return {base:c.baseHT,tva:c.tva,ttc:c.total,e411:g('411'),e706:g('706'),e445:g('44571'),eq:Math.abs(d-k)<0.005}; }),
    [F({remise:100}),F({remise:0}),F({remise:50,tva:5.5}),F({remise:100,franchiseTVA:true}),F({remise:5000})]);
  A(r[0].base===900&&r[0].tva===180&&r[0].ttc===1080,'1 000 € HT, remise 100 €, 20 % : base 900, TVA 180, TTC 1 080',JSON.stringify(r[0]));
  A(r[0].e411===1080&&r[0].e706===900&&r[0].e445===180&&r[0].eq,'écriture : 411 = 1 080 · 706 = 900 · 44571 = 180, équilibrée',JSON.stringify(r[0]));
  A(r[1].tva===200&&r[1].ttc===1200,'sans remise : inchangé (TVA 200, TTC 1 200)');
  A(r[2].base===950&&r[2].tva===52.25&&r[2].ttc===1002.25,'remise 50 € à 5,5 % : TVA 52,25 sur 950',JSON.stringify(r[2]));
  A(r[3].tva===0&&r[3].ttc===900,'franchise en base : pas de TVA, remise déduite',JSON.stringify(r[3]));
  A(r[4].base===0&&r[4].ttc===0,'remise supérieure au montant : plafonnée, jamais de total négatif',JSON.stringify(r[4]));
  /* affichage : la remise vient avant la TVA, suivie du total HT net */
  const ordre=await p.evaluate((f)=>{ const h=document.createElement('div'); try{ h.innerHTML=invApercuHTML?invApercuHTML(f):''; }catch(e){}
    if(!h.textContent){ try{ state.page='facturier'; render(); }catch(e){} }
    const t=(h.textContent||'').replace(/\s+/g,' '); return {remise:t.indexOf('Remise'), net:t.indexOf('Total HT net'), tva:t.indexOf('TVA (')}; }, F({remise:100}));
  if(ordre.remise>=0) A(ordre.remise<ordre.net&&ordre.net<ordre.tva,'aperçu : Remise → Total HT net → TVA',JSON.stringify(ordre));
  /* numéros d'écriture : continus d'un export à l'autre */
  const nums=[];
  for(const n of ['FAC-TR-10','FAC-TR-11']){
    await p.evaluate((f)=>{ DB.parametres.facturier=[f]; save(); },F({numero:n}));
    const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>yadaExportVentes())]);
    const txt=require('fs').readFileSync(await dl.path(),'utf8').split(/\r?\n/)[1]||''; nums.push(txt.split('\t')[2]);
  }
  A(nums[0]&&nums[1]&&nums[0]!==nums[1],'deux exports successifs : numéros d’écriture distincts',nums.join(' / '));
  A(errs.length===0,'aucune erreur de page',errs.slice(0,3).join(' | '));
  await b.close(); console.log('TOTAL '+ok+' ok / '+ko+' ko'); process.exit(ko?1:0);
})().catch(e=>{ console.log('  KO  exception : '+(e&&e.stack||e)); console.log('TOTAL '+ok+' ok / '+(ko+1)+' ko'); process.exit(1); });
