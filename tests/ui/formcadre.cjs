/**
 * Mar'q — Formulaire : cadrage, lisibilité et boutons sans saut de page (v759)
 *
 * Fige : barre d'actions calée sur le cadre des cartes ; panneau « Dossier en
 * direct » visible sur téléphone (plus repoussé hors écran) ; aucune carte
 * plus large que la page ; sommaire (première colonne) sur fond blanc ;
 * valeurs du résumé non tronquées ; badges et en-têtes lisibles ; un clic
 * sur un bouton ne ramène pas la page en haut ; un clic dont le bouton est
 * redessiné entre l'appui et le relâchement est bien exécuté, une seule
 * fois ; effectif prévu reporté sur la société créée.
 */
const { chromium, URL_APP } = require('./_socle.cjs');
let ok=0,ko=0; const A=(c,m,d)=>{ if(c){ok++;console.log('  ok  '+m);} else {ko++;console.log('  KO  '+m+(d?(' — '+d):''));} };
const FORM=(Y)=>({type:'sas',nature:'creation',numeroDossier:'',
  societe:{denomination:'ATELIER DES QUAIS DE LA MÉDITERRANÉE',sigle:'ADQ',capital:'5000',objet:'Menuiserie, agencement intérieur et pose de cuisines sur mesure',regime:'IS',debut:Y+'-10-01'},
  siege:{rue:'12 boulevard de la Libération',cp:'13001',ville:'Marseille',type:'Local commercial',bailleur:'SCI Horizon'},
  direction:{civilite:'Mme',prenom:'Claire',nom:'Martin-Delacroix',naissance:'1988-02-03',lieuNaissance:'Nice',pays:'France',nationalite:'Française',adresse:'3 rue Sainte',fonction:'Présidente'},
  dirx:{cp:'13001',ville:'Marseille'},titres:{nominal:'10',nbTitres:'500'},
  dates:{dateActe:Y+'-09-20',villeSignature:'Marseille',anneeExo:String(Y),finExo:(Y+1)+'-12-31',duree:'99'},
  associes:[{civilite:'Mme',prenom:'Claire',nom:'Martin-Delacroix',apport:'5000',parts:'500',role:'Présidente'}],
  contact:{email:'c.martin@adq.fr',tel:'0600000000'},apports:{numeraire:'5000'},conjoint:{},cac:{},extra:{},
  profil:{nbSalaries:'3',activiteType:'artisanale',caPrev:'180000'}});
(async()=>{
  const b=await chromium.launch(); const errs=[];
  const ouvrir=async(W,H)=>{ const p=await b.newPage({viewport:{width:W,height:H}}); p.on('pageerror',e=>{ if(!/ServiceWorker/.test(''+e)) errs.push(''+e); });
    await p.goto(URL_APP); await p.evaluate(()=>{ try{_authGranted();}catch(e){} });
    await p.waitForFunction(()=>window.marqPret&&window.marqPret(),{timeout:30000});
    await p.evaluate((f)=>{ window.toast=()=>{}; window.open=()=>null; window.uiConfirm=(m,fn)=>fn&&fn(); window.__formData=f; state.page='formulaire'; render(); },FORM(new Date().getFullYear()));
    await p.waitForTimeout(900); return p; };

  for(const [W,H] of [[1500,950],[1024,800],[390,844]]){
    const p=await ouvrir(W,H);
    const r=await p.evaluate(()=>{
      const wrap=document.querySelector('#view .fi-wrap'), bar=document.querySelector('.fi-actions');
      const w=wrap.getBoundingClientRect(), bb=bar?bar.getBoundingClientRect():null;
      const vw=document.documentElement.clientWidth;
      const larges=[...document.querySelectorAll('#view .fi-wrap .card, #view .fi-wrap .fi-card, #view .ff-rail, #view .ff-fiche, #view .ff-side')].filter(e=>e.offsetParent).filter(e=>{ const r=e.getBoundingClientRect(); return r.left<w.left-1||r.right>w.right+1; }).map(e=>e.className);
      const side=document.querySelector('#view aside.ff-side'), sr=side?side.getBoundingClientRect():null;
      const rail=document.querySelector('#view .ff-rail');
      const kv=[...document.querySelectorAll('#view .ff-kv b')].filter(b=>b.scrollWidth>b.clientWidth+1).length;
      const bad=[...document.querySelectorAll('#view .ff-rail small, .fi-actions .btn:disabled, #view .frs-badge')].filter(e=>e.offsetParent).filter(e=>{ const c=getComputedStyle(e); return c.webkitTextFillColor!==c.color; }).map(e=>e.textContent.trim());
      return {vw,sw:document.documentElement.scrollWidth,bar:bb?{l:Math.round(bb.left-w.left),r:Math.round(bb.right-w.right)}:null,larges,
        side:sr?{l:Math.round(sr.left),r:Math.round(sr.right),t:getComputedStyle(side).transform,bg:getComputedStyle(side).backgroundColor}:null,
        rail:rail?getComputedStyle(rail).backgroundColor:null,kv,bad};
    });
    A(r.sw<=r.vw+1,W+' px : aucun défilement horizontal de la page',r.sw+' > '+r.vw);
    A(r.bar&&Math.abs(r.bar.l)<=2&&Math.abs(r.bar.r)<=2,W+' px : barre d’actions calée sur le cadre des cartes',JSON.stringify(r.bar));
    A(!r.larges.length,W+' px : aucune carte plus large que le cadre',r.larges.join(', '));
    A(r.side&&r.side.l>=0&&r.side.r<=r.vw+1&&r.side.t==='none',W+' px : panneau « Dossier en direct » dans l’écran',JSON.stringify(r.side));
    A(r.rail==='rgb(255, 255, 255)',W+' px : sommaire sur fond blanc',r.rail);
    A(r.kv===0,W+' px : valeurs du résumé affichées en entier',String(r.kv));
    A(!r.bad.length,W+' px : pastilles du sommaire et bouton grisé dans leur vraie couleur',r.bad.join(', '));
    if(W===1500){
      /* un bouton ne ramène pas la page en haut */
      const s=await p.evaluate(async()=>{
        const sc=document.querySelector('main')&&getComputedStyle(document.querySelector('main')).overflowY!=='visible'&&document.querySelector('main').scrollHeight>document.querySelector('main').clientHeight?document.querySelector('main'):document.scrollingElement;
        const bt=document.querySelector('[onclick="formAssocAdd()"]'); bt.scrollIntoView({block:'center',behavior:'instant'});
        await new Promise(r=>setTimeout(r,150)); const y0=bt.getBoundingClientRect().top, st0=sc.scrollTop; return {y0,st0}; });
      const bb=await p.locator('[onclick="formAssocAdd()"]').first().boundingBox();
      await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(900);
      const s2=await p.evaluate(()=>{ const bt=document.querySelector('[onclick="formAssocAdd()"]'); return {y:bt.getBoundingClientRect().top,n:window.__formData.associes.length}; });
      A(s.st0>100&&Math.abs(s2.y-s.y0)<=4,'clic sur « Ajouter un associé » : la page ne bouge pas',JSON.stringify([s,s2]));
      A(s2.n===2,'clic normal : un seul associé ajouté',String(s2.n));
      /* clic dont le bouton est redessiné entre l'appui et le relâchement */
      const b2=await p.locator('[onclick="formAssocAdd()"]').first().boundingBox();
      await p.mouse.move(b2.x+b2.width/2,b2.y+b2.height/2); await p.mouse.down();
      await p.evaluate(()=>render()); await p.mouse.up(); await p.waitForTimeout(400);
      const n3=await p.evaluate(()=>window.__formData.associes.length);
      A(n3===3,'bouton redessiné pendant l’appui : l’action est exécutée une fois',String(n3));
      /* lisibilité : badges et fiche technique */
      const c=await p.evaluate(()=>{ const out={}; const b=document.querySelector('.frs-badge'); if(b) out.badge=getComputedStyle(b).color;
        formFicheOuvrir(); const th=document.querySelector('#ov .sy-doc .sy-t th'); if(th){ const cs=getComputedStyle(th); out.th=[cs.color,cs.backgroundColor]; } closeModal(); return out; });
      A(!c.badge||c.badge==='rgb(10, 11, 13)','badge « Conseil fiscal » en texte foncé',c.badge);
      A(c.th&&c.th[0]==='rgb(17, 17, 17)'&&c.th[1]==='rgb(238, 240, 243)','fiche technique : en-têtes de tableau lisibles (foncé sur clair)',JSON.stringify(c.th));
      /* effectif prévu reporté sur la société créée */
      const e=await p.evaluate(()=>{ DB.clients=[]; DB.dossiers=[]; formDoCreate(false); closeModal(); const c=DB.clients[0]||{}; const d=DB.dossiers[0]||{}; return {c:c.effectif,d:((d.intake||{}).societe||{}).effectif}; });
      A(String(e.c)==='3'&&String(e.d)==='3','effectif prévu (3) reporté sur la société et le dossier',JSON.stringify(e));
    }
    await p.close();
  }
  A(!errs.length,'aucune erreur de page',errs.join(' | '));
  console.log('TOTAL '+ok+' ok / '+ko+' ko'); await b.close(); process.exit(ko?1:0);
})();
