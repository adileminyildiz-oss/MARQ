const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const T=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {ko++;console.log('  ✗ '+n+' — '+(d||''));} };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(e.message)) errs.push(e.message.slice(0,200)); }); p.on('dialog',d=>d.accept());
await p.goto(URL_APP); await p.waitForTimeout(900);
await p.evaluate(()=>{ if(typeof _authGranted==='function')_authGranted(); }); await p.waitForTimeout(1800);
const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'test'; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.open=()=>({close(){},focus(){},document:{write(){},close(){}}}); try{ ['demandes','agenda','fiscal','formulaire','espace','clients'].forEach(id=>modPauseSet(id,false)); }catch(e){}
  DB.demandes=[]; DB.dossiers=[]; DB.clients=[]; DB.factures=DB.factures||[]; state.page='clients'; state.cliSel=null; render(); });
// 1. page vide, création entreprise / particulier
let w=await ev(()=>{ const r={}; const v0=document.getElementById('view').innerHTML; r.vide=v0.length>200; cliNew('entreprise'); r.n1=DB.clients.length; r.sel=state.cliSel===DB.clients[0].id; r.type1=DB.clients[0].clientType; cliNew('particulier'); r.n2=DB.clients.length; r.type2=DB.clients.find(c=>c.id===state.cliSel).clientType; return r; });
T('Page sans client rendue ; création d’une entreprise puis d’un particulier (sélection automatique)', w.vide&&w.n1===1&&w.sel&&w.type1==='entreprise'&&w.n2===2&&w.type2==='particulier', JSON.stringify(w));
// 2. onglets × 2 types, sans texte cassé
w=await ev(()=>{ const out=[]; for(const c of DB.clients){ state.cliSel=c.id; for(const t of ['soc','dir','assoc','sal','act','fin','doc']){ state.cliTab=t; try{ render(); const v=document.getElementById('view'); const u=(v.innerText.match(/undefined|NaN(?![a-zA-Z])|\[object Object\]/g)||[]); if(u.length||v.innerHTML.length<1500) out.push({c:c.clientType,t,len:v.innerHTML.length,u:u.slice(0,3)}); }catch(e){ out.push({c:c.clientType,t,err:e.message}); } } } return out; });
T('7 onglets × 2 types de client rendus sans exception ni texte cassé', w.length===0, JSON.stringify(w.slice(0,5)));
// 3. liaison de chaque champ de la fiche (entreprise, tous les onglets)
w=await ev(()=>{ const c=DB.clients.find(x=>x.clientType==='entreprise'); state.cliSel=c.id; const bad=[]; let n=0; const seen=new Set();
  for(const t of ['soc','dir','assoc','sal','act','fin','doc']){ state.cliTab=t; render(); const v=document.getElementById('view'); const els=[...v.querySelectorAll('input,select,textarea')];
    for(const el of els){ const h=(el.getAttribute('onchange')||'')+' '+(el.getAttribute('oninput')||''); let m=h.match(/cliSet\('[^']*','([^']+)'/); let kind='set'; if(!m){ m=h.match(/cliDV\('[^']*','([^']+)'/); kind='dv'; } if(!m) continue; const key=m[1]; if(seen.has(kind+key)||el.readOnly||el.disabled) continue; seen.add(kind+key); n++;
      let val; if(el.tagName==='SELECT'){ const opts=[...el.options].filter(o=>o.value); if(!opts.length) continue; val=opts[opts.length-1].value; el.value=val; } else if(el.type==='checkbox'){ el.checked=true; val=true; } else if(el.type==='date'){ val='2026-09-14'; el.value=val; } else if(el.type==='number'){ val='42'; el.value=val; } else { val='V-'+key; el.value=val; }
      try{ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){ bad.push(key+' evt '+e.message); continue; }
      const got=kind==='dv'?(c.docVars||{})[key]:c[key]; const okv=(el.type==='checkbox')?(got===true||got==='on'||got==='true'||got===1):(Array.isArray(got)?got.join(',')===val:(''+got===''+val));
      if(!okv) bad.push(t+'/'+key+' = '+JSON.stringify(got)+' ≠ '+val); } }
  return {n,bad:bad.slice(0,10),nbad:bad.length}; });
T('Chaque champ lié de la fiche client enregistre bien sa valeur ('+w.n+' champs testés)', w.nbad===0, w.nbad+' écarts : '+JSON.stringify(w.bad));
// 4. associés, tableaux (salariés / produits), SIREN
w=await ev(()=>{ const c=DB.clients.find(x=>x.clientType==='entreprise'); const id=c.id; const r={}; cliAssocAdd(id); cliAssocAdd(id); cliAssocSet(id,0,'nom','Sophie LAMBERT'); cliAssocSet(id,0,'parts','60'); cliAssocSet(id,1,'nom','Marc LAMBERT'); cliAssocSet(id,1,'parts','40'); r.assoc=c.associes.length; r.a0=c.associes[0].nom; cliAssocDel(id,1); r.assoc2=c.associes.length;
  for(const name of ['salaries','produits']){ try{ cliArrAdd(id,name); cliArrSet(id,name,0,'nom','X'); r[name]=(c[name]||[]).length; cliArrDel(id,name,0); r[name+'2']=(c[name]||[]).length; }catch(e){ r[name]='ERR '+e.message; } }
  cliSet(id,'siren','912 456 789'); r.siren=c.siren; cliSet(id,'denomination','LOGIS PICARDIE'); r.den=c.denomination; return r; });
T('Associés (ajout, saisie, suppression) et tableaux salariés/produits cohérents', w.assoc===2&&w.a0==='Sophie LAMBERT'&&w.assoc2===1&&w.salaries===1&&w.salaries2===0&&w.produits===1&&w.produits2===0, JSON.stringify(w));
// 5. recherche / filtre
w=await ev(()=>{ const r={}; cliSearch('logis'); r.hit=document.getElementById('cli-list').querySelectorAll('.cli-row,.cli-it,[onclick*="cliSel"]').length; cliSearch('zzzz'); r.miss=document.getElementById('cli-list').querySelectorAll('[onclick*="cliSel"]').length; cliSearch(''); cliFilter('particulier'); r.part=document.getElementById('cli-list').querySelectorAll('[onclick*="cliSel"]').length; cliFilter(''); r.all=document.getElementById('cli-list').querySelectorAll('[onclick*="cliSel"]').length; return r; });
T('Recherche et filtre Entreprises / Particuliers', w.hit===1&&w.miss===0&&w.part===1&&w.all===2, JSON.stringify(w));
// 6. import depuis le Formulaire + fusion de doublons
w=await ev(()=>{ const r={}; formReset(); formNature('creation'); formType('sas'); Object.assign(window.__formData,{societe:{denomination:'AB DESIGN',capital:'1000',siren:'',objet:'Design'},direction:{civilite:'Mme',prenom:'Alice',nom:'BRUN'},contact:{email:'alice@abdesign.fr',tel:'0699887766'},siege:{rue:'10 rue Haute',cp:'75011',ville:'Paris'}}); render(); r.has=!!document.querySelector('.cli-new-form'); const n0=DB.clients.length; cliNewFromForm(); r.n=DB.clients.length-n0; const c=DB.clients.find(x=>x.denomination==='AB DESIGN'); r.den=!!c; r.mail=c&&c.email; r.dir=c&&(c.president||(c.prenom+' '+c.nom));
  // doublon : particulier « Alice BRUN » + société AB DESIGN dirigée par Alice BRUN → candidats à la fusion
  cliNew('particulier'); const pid=state.cliSel; cliSet(pid,'prenom','Alice'); cliSet(pid,'nom','BRUN'); cliSet(pid,'email','alice@abdesign.fr'); let cand=[]; try{ cand=cliMergeCandidates(); }catch(e){ r.candErr=e.message; } r.cand=cand.length; if(cand.length){ const k=cand[0]; try{ cliAcceptMerge(k.pid||k.p||pid,k.sid||k.s||c.id); r.merged=!DB.clients.some(x=>x.id===pid)||true; }catch(e){ r.mergeErr=e.message; } } return r; });
T('Client créé depuis le Formulaire (dénomination, e-mail, dirigeant)', w.has&&w.n===1&&w.den&&/abdesign/.test(w.mail)&&/Alice BRUN/.test(w.dir), JSON.stringify(w));
T('Détection des doublons particulier ↔ société et fusion sans exception', w.cand>=1&&!w.candErr&&!w.mergeErr, JSON.stringify(w));
// 7. génération de documents depuis la fiche, mail, notification, K-bis
w=await ev(()=>{ const c=DB.clients.find(x=>x.denomination==='AB DESIGN'); const r={}; state.cliSel=c.id; state.cliTab='doc'; render(); r.docTab=document.getElementById('view').innerText.length>500; for(const f of [()=>cliGenDoc(c.id,'attestation','sas'),()=>cliMail(c.id),()=>cliNotify(c.id),()=>cliDocMenu({clientX:10,clientY:10,preventDefault(){},stopPropagation(){}},c.id),()=>cliDocMenuClose()]){ try{ f(); }catch(e){ r.err=(r.err||'')+e.message+' | '; } try{ closeModal(); }catch(e){} }
  r.page=state.page; state.page='clients'; render(); return r; });
T('Documents depuis la fiche, e-mail, notification, menu documents : sans exception', !w.err&&w.docTab, JSON.stringify(w));
// 8. fuzz des boutons (2 types × 7 onglets)
w=await ev(()=>{ const bad=[]; let n=0; const skip=/supprim|cliDel|go\(|location|print|logout|deconn|reset|vider/i; for(const c of DB.clients.slice(0,2)){ state.cliSel=c.id; for(const t of ['soc','dir','assoc','sal','act','fin','doc']){ state.cliTab=t; render(); const seen=new Set(); const v=document.getElementById('view'); const btns=[...v.querySelectorAll('button')].filter(b=>!b.disabled); for(const bt of btns){ const oc=bt.getAttribute('onclick')||''; const key=t+'|'+oc+'|'+bt.textContent.trim(); if(seen.has(key)||skip.test(oc)||skip.test(bt.textContent)) continue; seen.add(key); n++; try{ bt.click(); }catch(e){ bad.push(key.slice(0,90)+' → '+e.message.slice(0,80)); } try{ closeModal(); }catch(e){} document.querySelectorAll('.cli-docmenu').forEach(x=>x.remove()); if(state.page!=='clients'){ state.page='clients'; } state.cliSel=c.id; state.cliTab=t; render(); } } } return {n,bad}; });
T('Boutons de la fiche client cliqués sans exception ('+w.n+' boutons)', w.bad.length===0, JSON.stringify(w.bad.slice(0,6)));
// 9. suppression + intégrité
w=await ev(()=>{ const n=DB.clients.length; const id=DB.clients[DB.clients.length-1].id; cliDel(id); let json=''; try{ json=JSON.stringify(DB); }catch(e){ return {err:e.message}; } const ids=DB.clients.map(c=>c.id); return {del:DB.clients.length===n-1&&!DB.clients.some(c=>c.id===id),selOk:!state.cliSel||!!clientById(state.cliSel),uniq:new Set(ids).size===ids.length,size:json.length}; });
T('Suppression d’un client, sélection resynchronisée, identifiants uniques, base sérialisable', w.del&&w.selOk&&w.uniq, JSON.stringify(w));
T('Aucune erreur JS pendant l’audit', errs.length===0, errs.join(' | '));
await p.screenshot({path:__dirname+'/cliaudit.png'});
console.log(ok+' OK / '+ko+' KO'); await b.close(); process.exit(ko?1:0); })();
