/**
 * Mar'q — Toute fenêtre ouverte se referme ; chaque bouton appelle une fonction qui existe (v736)
 *
 * Un robot a cliqué chaque bouton de chaque page (et de chaque étape du
 * Traitement). Il a trouvé : le panneau des notifications impossible à
 * refermer (et dessiné en trait sur l'écran une fois « caché »), la pastille
 * de la cloche illisible, des fenêtres sans croix (recherche de modèle,
 * suggestion de fusion) ou sourdes à Échap (fiche de paie, aperçu de
 * l'espace client), des libellés sous 11 px. Ce test fige les corrections.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
  p.on('dialog',d=>d.accept());
  await p.goto(URL_APP);
  await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
  await p.waitForFunction(()=>window.marqPret&&window.marqPret()&&document.querySelector('#nav .nav-btn'),{timeout:30000});
  const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{ window.uiConfirm=(m,fn)=>fn&&fn(); window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'test'; window.__toasts=[]; const _t=window.toast; window.toast=function(m){ window.__toasts.push(''+m); try{ return _t&&_t.apply(this,arguments); }catch(e){} }; window.open=()=>({close(){},focus(){},document:{write(){},close(){}}}); try{ ['demandes','agenda','fiscal','formulaire','espace'].forEach(id=>modPauseSet(id,false)); }catch(e){}
  DB.demandes=[]; DB.dossiers=[]; DB.clients=[]; DB.factures=DB.factures||[]; DB.parametres.formDrafts=[];
  // fabrique de dossiers complets via le Formulaire
  window.__mk=function(type,extra){ formReset(); formNature('creation'); formType(type); const o=window.__formData; const den=(extra&&extra.den)||('SOC '+type.toUpperCase());
    Object.assign(o,{societe:{denomination:den,capital:'5000',objet:'Location de logements meublés',debut:'2026-10-01',regime:'IS'},titres:{nominal:'10',nbTitres:'500'},apports:{numeraire:'5000',nature:'0'},siege:{rue:'14 rue des Jacobins',cp:'80000',ville:'Amiens',type:'domiciliation'},direction:{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'14 rue des Jacobins 80000 Amiens',fonction:''},dirx:{pereNom:'Jean LAMBERT',mereNom:'Marie DURAND',secu:'288038002104512',typePiece:'cni'},contact:{email:'s.lambert@logis.fr',tel:'0612345678'},dates:{dateActe:'2026-09-14',villeSignature:'Amiens'},depot:{type:'Banque',banque:'Crédit Agricole',montant:'5000',date:'2026-09-10'},
      associes:(type==='sasu'||type==='eurl')?[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'500',apport:'5000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'}]:[{civilite:'Mme',prenom:'Sophie',nom:'LAMBERT',parts:'300',apport:'3000',naissance:'1988-03-12',lieuNaissance:'Amiens',pays:'France',nationalite:'Française',adresse:'Amiens'},{civilite:'M.',prenom:'Marc',nom:'LAMBERT',parts:'200',apport:'2000',naissance:'1985-07-02',lieuNaissance:'Lille',pays:'France',nationalite:'Française',adresse:'Lille'}]});
    const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id,ref:d&&(d.numeroDossier||d.ref)}; };
  window.__mkModif=function(kind){ formReset(); formNature('modification'); formModifKind(kind); const o=window.__formData; o.contact={email:'eric@garage-dupont.fr',tel:'0611223344'}; o.modif={kind,societe:{denomination:'GARAGE DUPONT',forme:'sarl',siren:'812345678',rcsVille:'Amiens',siege:'5 rue Neuve',cp:'80000',ville:'Amiens'},dates:{acte:'2026-09-14',effet:'2026-10-01',ville:'Amiens'},signataire:{prenom:'Éric',nom:'DUPONT'},nouveau:{siege:'3 quai du Canal',cp:'80000',ville:'Amiens',prenom:'Paul',nom:'DUPONT',naissance:'1990-01-01',adresse:'Amiens',denomination:'GARAGE DUPONT & FILS',objet:'Réparation automobile',capital:'20000',formeNouvelle:'sas',cedant:'Éric DUPONT',cessionnaire:'Paul DUPONT',nbTitres:'100',prix:'10000',liquidateur:'Éric DUPONT',siegeLiquidation:'Amiens',dateClotureLiq:'2026-12-31',ancienneCloture:'31/12',nouvelleCloture:'30/06'}}; const n0=DB.dossiers.length; const mq=formManques(); formCreerDossier(false); try{ closeModal(); }catch(e){} const d=DB.dossiers[0]; return {ok:DB.dossiers.length===n0+1,mq,id:d&&d.id}; };
});

  // ---------- 1. un dossier neuf ne part pas ----------
  const vis=()=>p.evaluate(()=>{ window.__v=e=>{ if(!e||!e.isConnected) return false; const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const r=e.getBoundingClientRect(); return r.width>1&&r.height>1; }; });
  await vis();
  const esc=async()=>{ await p.keyboard.press('Escape'); await p.waitForTimeout(150); };

  // 1. toutes les fonctions appelées par les boutons existent
  const cand=await ev(()=>{ const src=[...document.scripts].map(s=>s.textContent).join('\n'); const re=/\bon(?:click|change|input|submit|keydown)=\\?(["'])([^"']{1,300})/g; const n=new Set(); let m;
    while((m=re.exec(src))){ const b=m[2]; const r2=/(?<![\w.$'"])([A-Za-z_$][\w$]*)\s*\(/g; let k; while((k=r2.exec(b))) n.add(k[1]); }
    const KW=new Set('if for while switch return typeof function catch new try var let const void delete in of do else throw this parseInt parseFloat String Number Boolean Array Object Math JSON Date setTimeout clearTimeout setInterval encodeURIComponent decodeURIComponent confirm alert prompt isNaN RegExp Promise requestAnimationFrame fetch open print focus blur E esc jq PSroot'.split(' '));
    return [...n].filter(x=>!KW.has(x)&&typeof window[x]!=='function'&&!/^_/.test(x)&&src.indexOf('typeof '+x)<0); });
  A(cand.length===0,'chaque bouton appelle une fonction qui existe',cand.join(', '));

  // 2. panneau des notifications
  let r=await ev(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); const p=document.getElementById('nt-panel'); const avant=window.__v(p);
    document.getElementById('nt-bell').click(); await W(150); const ouvert=window.__v(p); return {avant,ouvert}; });
  await esc(); let r2=await ev(()=>window.__v(document.getElementById('nt-panel')));
  await ev(()=>ntToggle()); await p.waitForTimeout(100); await ev(()=>document.querySelector('#nt-panel [aria-label=Fermer]').click()); await p.waitForTimeout(100);
  let r3=await ev(()=>({v:window.__v(document.getElementById('nt-panel')),h:document.getElementById('nt-panel').getBoundingClientRect().height}));
  A(!r.avant&&r.ouvert&&!r2&&!r3.v&&r3.h===0,'notifications : fermé = invisible (plus de trait à l’écran), s’ouvre, se referme par Échap et par la croix',JSON.stringify([r,r2,r3]));
  r=await ev(()=>{ const b=document.getElementById('nt-badge')||document.querySelector('.nt-badge'); if(!b) return null; const c=getComputedStyle(b); return [c.webkitTextFillColor||c.color,c.backgroundColor]; });
  A(r&&r[0]!==r[1]&&/\(1[01], 1[12], 1[23]\)|\(11, 11, 12\)/.test(r[0]),'pastille de la cloche : chiffre sombre sur fond clair, lisible',JSON.stringify(r));

  // 3. fenêtre générique (#ov) : Échap
  await ev(()=>openModal('Essai','<p>corps</p>','<button class="btn" onclick="closeModal()">Fermer</button>')); await esc();
  A(await ev(()=>!document.getElementById('ov').classList.contains('show')),'fenêtre standard : Échap la referme','');

  // 4. recherche de modèle (Ctrl K) : croix + Échap
  await ev(()=>{ go('editions'); edkOpen(); }); await p.waitForTimeout(250);
  r=await ev(()=>{ const o=document.getElementById('edk-ov'); const x=o&&o.querySelector('.mqx-close'); return {o:!!o,x:!!x&&window.__v(x)}; });
  await ev(()=>document.querySelector('#edk-ov .mqx-close').click()); await p.waitForTimeout(150);
  let gone=await ev(()=>!document.getElementById('edk-ov'));
  await ev(()=>edkOpen()); await p.waitForTimeout(200); await esc(); gone=gone&&await ev(()=>!document.getElementById('edk-ov'));
  A(r.o&&r.x&&gone,'recherche de modèle : une croix apparaît, elle et Échap referment',JSON.stringify(r));

  // 5. fiche de paie (pf-ov) : Échap
  r=await ev(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); try{ edLibNew('fichepaie'); }catch(e){ return 'err '+e; } await W(400); const o=document.getElementById('pf-ov'); return !!o&&window.__v(o); });
  await esc(); await p.waitForTimeout(200); const choix=await ev(()=>{ const b=[...document.querySelectorAll('.pfcl-b,#pf-ov button,#ov.show button')].find(x=>/Garder en brouillon|Fermer \(garder/i.test(x.textContent)&&window.__v(x)); if(b){ b.click(); return true; } return false; }); await p.waitForTimeout(250);
  r2=await ev(()=>{ const o=document.getElementById('pf-ov'); return !o||!window.__v(o); });
  A(r===true&&choix&&r2,'éditeur de fiche de paie : Échap propose de garder ou non le document, puis le referme',JSON.stringify([r,choix,r2]));

  // 6. suggestion de fusion : croix « plus tard », reste rangée après un nouveau rendu, Échap aussi
  r=await ev(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); go('clients'); await W(150); try{ cliMergeNotifPaint(); }catch(e){} const b=document.getElementById('cli-merge-notif'); if(!b) return 'aucune';
    const x=b.querySelector('.cmn-x'); if(!x) return 'sans croix'; x.click(); await W(50); render(); try{ cliMergeNotifPaint(); }catch(e){} await W(100); return document.getElementById('cli-merge-notif')?'revenue':'ok'; });
  A(r==='ok'||r==='aucune','suggestion de fusion : « plus tard » la range et elle ne revient pas au rendu suivant',r);

  // 7. aperçu de l'espace client : Échap referme ; ouvert par le lien client : Échap ne déconnecte pas
  await ev(()=>{ go('clients'); svcPortPreview((DB.clients[0]||{}).nom||'ALPHA'); }); await p.waitForTimeout(300); await esc();
  r=await ev(()=>!document.getElementById('portail-ov'));
  await ev(()=>{ openPortail(''); }); await p.waitForTimeout(250); await esc();
  r2=await ev(()=>!!document.getElementById('portail-ov')); await ev(()=>closePortail());
  A(r&&r2,'espace client : l’aperçu du cabinet se referme par Échap, l’espace ouvert par le lien reste ouvert',JSON.stringify([r,r2]));

  // 8. menu déroulant : clic à l’extérieur
  r=await ev(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); go('formulaire'); await W(150); const b=[...document.querySelectorAll('main button')].find(x=>/Propositions/.test(x.textContent)); if(!b) return 'pas de bouton'; formPropositions(b); await W(150); return !!document.getElementById('fb-menu'); });
  await p.mouse.click(700,850); await p.waitForTimeout(200);
  r2=await ev(()=>{ const m=document.getElementById('fb-menu'); return !m||!window.__v(m); });
  A(r===true&&r2,'menu déroulant : un clic à l’extérieur le referme',JSON.stringify([r,r2]));

  // 9. filet commun : une fenêtre inconnue sans bouton reçoit une croix et se referme par Échap
  await ev(()=>{ const d=document.createElement('div'); d.id='essai-ov'; d.style.cssText='position:fixed;inset:10% 20%;background:#111;z-index:9999;padding:30px;color:#fff'; d.textContent='Fenêtre sans bouton'; document.body.appendChild(d); }); await p.waitForTimeout(200);
  r=await ev(()=>!!document.querySelector('#essai-ov .mqx-close'));
  await esc(); r2=await ev(()=>!document.getElementById('essai-ov'));
  A(r&&r2,'toute fenêtre sans bouton de fermeture reçoit une croix, et Échap la referme',JSON.stringify([r,r2]));

  // 10. un seul Échap ne ferme qu'une fenêtre
  await ev(()=>{ go('editions'); openModal('Dessous','<p>a</p>',''); edkOpen(); }); await p.waitForTimeout(250); await esc();
  r=await ev(()=>({edk:!!document.getElementById('edk-ov'),ov:document.getElementById('ov').classList.contains('show')})); await ev(()=>closeModal());
  A(!r.edk&&r.ov,'Échap referme la fenêtre du dessus seulement',JSON.stringify(r));

  // 11. libellés à 11 px minimum
  r=await ev(()=>{ const st=document.createElement('div'); st.innerHTML='<span class="cs-n">x</span><span class="edk-glabel">x</span><span class="fb-mi-sep">x</span><span class="dp-h">x</span><span class="ps-rh">x</span><span class="brand-sub">x</span>'; document.querySelector('main').appendChild(st);
    const v=[...st.children].map(e=>e.className+':'+parseFloat(getComputedStyle(e).fontSize)); st.remove(); return v; });
  A(r.every(x=>+x.split(':')[1]>=11),'libellés de l’interface à 11 px au minimum',r.join(' '));

  // 12. menu latéral du téléphone : Échap, croix, glissement ; le voile reste en place
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(250);
  const navOuvert=()=>ev(()=>document.getElementById('side').classList.contains('open'));
  await ev(()=>{ go('cockpit'); toggleNav(true); }); await p.waitForTimeout(350);
  r=await ev(()=>{ const x=document.querySelector('#side .mqx-navx'), br=document.querySelector('#side .brand').getBoundingClientRect(), xr=x&&x.getBoundingClientRect(); return {x:!!x&&getComputedStyle(x).display!=='none', w:xr&&xr.width, sep:xr&&(xr.left>=br.right-58), inScreen:xr&&xr.right<=232&&xr.left>=0}; });
  await esc(); await p.waitForTimeout(300); const e1=!(await navOuvert());
  await ev(()=>toggleNav(true)); await p.waitForTimeout(350); await p.click('#side .mqx-navx'); await p.waitForTimeout(300); const e2=!(await navOuvert());
  await ev(()=>toggleNav(true)); await p.waitForTimeout(350); await p.click('#scrim',{position:{x:360,y:400}}); await p.waitForTimeout(300); const e3=!(await navOuvert());
  const e4=await ev(()=>{ toggleNav(true); toggleNav(false); return !!document.getElementById('scrim')&&!!document.getElementById('side'); });
  A(r.x&&r.w>=44&&r.inScreen&&e1&&e2&&e3&&e4,'menu du téléphone : croix de 44 px, Échap, croix et voile le referment, sans rien détruire',JSON.stringify([r,e1,e2,e3,e4]));
  await ev(()=>toggleNav(true)); await p.waitForTimeout(350);
  r=await ev(()=>getComputedStyle(document.querySelector('#side .mqx-navx')).display); await ev(()=>toggleNav(false));
  await p.setViewportSize({width:1500,height:1000}); await p.waitForTimeout(250);
  const rDesk=await ev(()=>getComputedStyle(document.querySelector('#side .mqx-navx')).display);
  A(r==='flex'&&rDesk==='none','la croix du menu n’apparaît que sur téléphone, menu ouvert',r+' / '+rDesk);

  // 13. documents sur fond blanc : aucun texte blanc sur blanc ; petites mentions des étiquettes lisibles
  r=await ev(()=>{ const d=document.createElement('div'); d.innerHTML='<div id="ov-b"><div class="sy-doc" style="background:#fff"><ul class="sy-ul"><li class="sy-warn">Pièce manquante <small>(DOS-1)</small></li></ul><ul class="sy-ul sy-muted"><li>24/09 · Registre</li></ul><div class="hint">Aucun dossier</div></div></div><div class="pl-r"><div class="hint">À scanner</div><button class="btn btn-sm btn-ghost">QR</button></div><label>Message <small>(facultatif)</small></label>'; document.querySelector('main').appendChild(d);
    const blanc=[...d.querySelectorAll('.sy-doc li,.sy-doc small,.sy-doc .hint,.pl-r .hint,.pl-r button')].filter(e=>{ const c=getComputedStyle(e); const f=c.webkitTextFillColor; return /255, 255, 255/.test(f&&f!=='currentcolor'?f:c.color); }).map(e=>e.textContent.slice(0,20));
    const fs=parseFloat(getComputedStyle(d.querySelector('label small')).fontSize); d.remove(); return {blanc,fs}; });
  A(!r.blanc.length&&r.fs>=11,'documents sur fond blanc lisibles, mentions des étiquettes à 11 px au moins',JSON.stringify(r));

  r=await ev(()=>[...document.querySelectorAll('button')].filter(b=>/darkToggle/.test(b.getAttribute('onclick')||'')&&b.offsetParent).length);
  A(r===0,'aucun bouton sans effet : la bascule de thème (toujours nuit) n’est plus proposée',''+r);

  A(errs.length===0,'aucune erreur JavaScript',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko');
  await b.close(); process.exit(ko?1:0);
})();
