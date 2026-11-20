/* Pagina Canzoni: il maestro cerca in rete gli accordi di una canzone (Gemini + ricerca Google),
   l'app li mostra originali o semplificati e calcola se conviene il capotasto e su che tasto. */
(function(){
const $=id=>document.getElementById(id);
const ls={get(k,d){try{const v=localStorage.getItem('qc_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('qc_'+k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const it=()=>ls.get('it',true);

/* ---------- nomi e trasposizione ---------- */
const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const GUIT=['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B'];
const ITN={C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'};
function rootName(pc,pref){const n=(pref==='b'?FLAT:pref==='#'?SHARP:GUIT)[((pc%12)+12)%12];
  const l=n[0],acc=n.slice(1).replace('#','♯').replace('b','♭');return (it()?ITN[l]:l)+acc}
/* qualità riconosciute → famiglia per le forme */
function parse(sym){
  const s=String(sym||'').trim().replace(/♯/g,'#').replace(/♭/g,'b').replace(/\s+/g,'');
  if(!s||/^(n\.?c\.?|nc|-|—|%)$/i.test(s))return {nc:true,raw:sym};
  const m=s.match(/^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/);
  if(!m)return {bad:true,raw:sym};
  const pc=(PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12;
  let q=m[3]||'';
  q=q.replace(/^min(?!or)/,'m').replace(/^-(?=\d|$)/,'m').replace(/^M(?=7|9)/,'maj').replace(/^Maj/,'maj').replace(/^Δ/,'maj').replace(/^maj$/,'').replace(/^major$/i,'').replace(/^minor$/i,'m').replace(/^ø/,'m7b5').replace(/^°/,'dim').replace(/^\+/,'aug');
  const bass=m[4]?(PC[m[4]]+(m[5]==='#'?1:m[5]==='b'?-1:0)+12)%12:null;
  return {pc,q,bass,acc:m[2]||'',raw:sym}}
/* famiglia per gli originali (forme vere) e per i semplificati (triadi / settime facili) */
function family(q){
  if(/^m7b5|^mi7b5|^m7\(b5\)/.test(q))return 'm7b5';
  if(/^dim/.test(q))return 'dim';
  if(/^aug/.test(q))return 'maj';
  if(/^5$/.test(q))return '5';
  if(/^m(?!aj)/.test(q)){if(/^m(7|9|11)/.test(q))return 'm7';return 'm'}
  if(/^maj(7|9|13)/.test(q))return 'maj7';
  if(/^7sus|^9sus|^11|^sus/.test(q))return /^sus2/.test(q)?'sus2':'sus4';
  if(/^(7|9|13)/.test(q))return '7';
  if(/^add9|^2$|^add2/.test(q))return 'add9';
  if(/^6/.test(q))return 'maj';
  return 'maj'}
function simpleFam(f){return f==='m'||f==='m7'||f==='m7b5'?'m':f==='7'?'7':f==='dim'?'m':f==='5'?'5':'maj'}
const SUF={maj:'',m:'m','7':'7',m7:'m7',maj7:'maj7',sus2:'sus2',sus4:'sus4',add9:'add9',dim:'dim',m7b5:'m7♭5','5':'5'};
function nameOf(pc,suf,pref,bass){return rootName(pc,pref)+suf+(bass!=null&&bass!==pc?'/'+rootName(bass,pref):'')}

/* ---------- forme sul manico (6ª → 1ª corda, -1 = non suonare) ---------- */
const O={ // forme aperte: [tasti, dita, costo]
 'C':[[-1,3,2,0,1,0],[0,3,2,0,1,0],1],'C7':[[-1,3,2,3,1,0],[0,3,2,4,1,0],1.3],'Cmaj7':[[-1,3,2,0,0,0],[0,3,2,0,0,0],1],'Cadd9':[[-1,3,2,0,3,3],[0,2,1,0,3,4],1.2],'Csus4':[[-1,3,3,0,1,0],[0,3,4,0,1,0],1.3],
 'D':[[-1,-1,0,2,3,2],[0,0,0,1,3,2],1],'Dm':[[-1,-1,0,2,3,1],[0,0,0,2,3,1],1],'D7':[[-1,-1,0,2,1,2],[0,0,0,2,1,3],1],'Dmaj7':[[-1,-1,0,2,2,2],[0,0,0,1,1,1],1.2],'Dm7':[[-1,-1,0,2,1,1],[0,0,0,2,1,1],1.2],'Dsus2':[[-1,-1,0,2,3,0],[0,0,0,1,3,0],1],'Dsus4':[[-1,-1,0,2,3,3],[0,0,0,1,3,4],1.1],'Dadd9':[[-1,-1,0,2,3,0],[0,0,0,1,3,0],1],
 'E':[[0,2,2,1,0,0],[0,2,3,1,0,0],1],'Em':[[0,2,2,0,0,0],[0,2,3,0,0,0],1],'E7':[[0,2,0,1,0,0],[0,2,0,1,0,0],1],'Em7':[[0,2,0,0,0,0],[0,2,0,0,0,0],1],'Emaj7':[[0,2,1,1,0,0],[0,3,1,2,0,0],1.2],'Esus4':[[0,2,2,2,0,0],[0,2,3,4,0,0],1.1],'Eadd9':[[0,2,2,1,0,2],[0,2,3,1,0,4],1.4],
 'F':[[1,3,3,2,1,1],[1,3,4,2,1,1],3.2],'Fmaj7':[[-1,-1,3,2,1,0],[0,0,3,2,1,0],1.4],
 'G':[[3,2,0,0,0,3],[2,1,0,0,0,3],1],'G7':[[3,2,0,0,0,1],[3,2,0,0,0,1],1.1],'Gmaj7':[[3,2,0,0,0,2],[3,2,0,0,0,1],1.2],'Gadd9':[[3,2,0,2,0,3],[2,1,0,3,0,4],1.4],
 'A':[[-1,0,2,2,2,0],[0,0,1,2,3,0],1],'Am':[[-1,0,2,2,1,0],[0,0,2,3,1,0],1],'A7':[[-1,0,2,0,2,0],[0,0,2,0,3,0],1],'Am7':[[-1,0,2,0,1,0],[0,0,2,0,1,0],1],'Amaj7':[[-1,0,2,1,2,0],[0,0,2,1,3,0],1.2],'Asus2':[[-1,0,2,2,0,0],[0,0,1,2,0,0],1],'Asus4':[[-1,0,2,2,3,0],[0,0,1,2,3,0],1.1],'Aadd9':[[-1,0,2,2,0,0],[0,0,1,2,0,0],1],
 'B7':[[-1,2,1,2,0,2],[0,2,1,3,0,4],1.6],
 'E5':[[0,2,2,-1,-1,-1],[0,1,2,0,0,0],1],'A5':[[-1,0,2,2,-1,-1],[0,0,1,2,0,0],1],'D5':[[-1,-1,0,2,3,-1],[0,0,0,1,2,0],1]
};
const EASY={ // versioni facili usate solo nei semplificati
 'F':[[-1,-1,3,2,1,1],[0,0,3,2,1,1],2,'versione facile, senza barré'],
 'Bm':[[-1,-1,4,4,3,2],[0,0,3,4,2,1],2.2,'versione facile, senza barré'],
 'F#m':[[-1,-1,4,2,2,2],[0,0,3,1,1,1],2.2,'versione facile, piccolo barré sulle 3 corde alte'],
 'B':[[-1,-1,4,4,4,2],[0,0,2,3,4,1],2.6,'versione facile sulle 4 corde alte'],
 'Bb':[[-1,-1,3,3,3,1],[0,0,2,3,4,1],2.6,'versione facile sulle 4 corde alte'],
 'C#m':[[-1,-1,2,1,2,0],[0,0,2,1,3,0],2.4,'versione facile (C#m7 senza barré)']
};
const EB={maj:[[0,2,2,1,0,0],[1,3,4,2,1,1]],m:[[0,2,2,0,0,0],[1,3,4,1,1,1]],'7':[[0,2,0,1,0,0],[1,3,1,2,1,1]],m7:[[0,2,0,0,0,0],[1,3,1,1,1,1]],maj7:[[0,-9,1,1,0,-9],[1,0,3,4,2,0]],sus4:[[0,2,2,2,0,0],[1,2,3,4,1,1]],'5':[[0,2,2,-9,-9,-9],[1,3,4,0,0,0]],add9:[[0,2,2,1,0,0],[1,3,4,2,1,1]],sus2:[[0,2,2,1,0,0],[1,3,4,2,1,1]]};
const AB={maj:[[-9,0,2,2,2,0],[0,1,3,3,3,1]],m:[[-9,0,2,2,1,0],[0,1,3,4,2,1]],'7':[[-9,0,2,0,2,0],[0,1,3,1,4,1]],m7:[[-9,0,2,0,1,0],[0,1,3,1,2,1]],maj7:[[-9,0,2,1,2,0],[0,1,3,2,4,1]],sus2:[[-9,0,2,2,0,0],[0,1,3,4,1,1]],sus4:[[-9,0,2,2,3,0],[0,1,2,3,4,1]],dim:[[-9,0,1,2,1,-9],[0,1,2,4,3,0]],m7b5:[[-9,0,1,0,1,-9],[0,1,2,1,3,0]],'5':[[-9,0,2,2,-9,-9],[0,1,3,4,0,0]],add9:[[-9,0,2,2,0,0],[0,1,3,4,1,1]]};
const KEYSUF={maj:'',m:'m','7':'7',m7:'m7',maj7:'maj7',sus2:'sus2',sus4:'sus4',add9:'add9','5':'5',dim:'dim',m7b5:'m7b5'};
/* forma per un accordo (pc + famiglia) vista come la suonano le dita */
function shapeFor(pc,fam,easy){
  const key=GUIT[pc]+KEYSUF[fam];
  if(easy&&EASY[key])return {fr:EASY[key][0],fi:EASY[key][1],cost:EASY[key][2],note:EASY[key][3]};
  if(O[key])return {fr:O[key][0],fi:O[key][1],cost:O[key][2]};
  if(fam==='add9'&&O[GUIT[pc]])return shapeFor(pc,'maj',easy);
  if(fam==='sus2'&&!AB.sus2)return shapeFor(pc,'maj',easy);
  const c=[];
  if(EB[fam]&&!['dim','m7b5'].includes(fam)){const f=((pc-4)%12+12)%12;c.push({f,t:EB[fam]})}
  if(AB[fam]){const f=((pc-9)%12+12)%12;c.push({f,t:AB[fam]})}
  if(!c.length)return shapeFor(pc,'maj',easy);
  c.sort((a,b)=>a.f-b.f);const b=c[0].f>9&&c[1]?c[1]:c[0];
  const fr=b.t[0].map(x=>x<-1?-1:x+b.f),fi=b.t[1].map((x,i)=>fr[i]===0?0:b.f===0?Math.max(1,x-1):x);
  return {fr,fi,barre:b.f,cost:b.f===0?1.4:fam==='5'?1.6:3.6+(b.f>7?0.4:0)}}

/* ---------- canzone → accordi da mostrare ---------- */
let SONG=null,MODE=ls.get('songmode','orig'),CAPO=null,PLAY=null;
function chordsOf(song){const out=[];(song.sections||[]).forEach(s=>(s.bars||[]).forEach(b=>String(b).split(/\s+/).filter(Boolean).forEach(c=>out.push(c))));return out}
/* accordi reali (come suonano): tab con capotasto → + capo */
function sounding(song){const k=song.tab_capo|0;return x=>{const p=parse(x);if(p.nc||p.bad)return p;return {...p,pc:(p.pc+k)%12,bass:p.bass==null?null:(p.bass+k)%12}}}
function prefOf(song){const k=String(song.key||'');return /b|♭/.test(k.slice(1,2))||/^(F|Dm|Gm|Cm|Fm|Bbm?)$/.test(k.replace('♭','b'))?'b':''}
function plan(song,mode,capo){
  const snd=sounding(song),simp=mode==='simp';
  const conv=x=>{const p=snd(x);if(p.nc)return {nc:true};if(p.bad)return {bad:true,raw:p.raw};
    const fam0=family(p.q),fam=simp?simpleFam(fam0):fam0;const bass=simp?null:p.bass;
    const spc=((p.pc-capo)%12+12)%12;const sh=shapeFor(spc,fam,simp);
    return {pc:p.pc,fam,bass,spc,sh,suf:simp?SUF[fam]:(p.q?p.q.replace(/^maj$/,''):''),fullSuf:SUF[fam]}};
  return conv}
function costAt(song,mode,capo){const cv=plan(song,mode,capo);let t=0,n=0,hard=new Set();
  chordsOf(song).forEach(c=>{const r=cv(c);if(!r.sh)return;t+=r.sh.cost;n++;if(r.sh.cost>=3)hard.add(r.spc+r.fam)});
  return {avg:n?t/n:0,hard:hard.size,n}}
function bestCapo(song,mode){let best={c:0,s:1e9},base=null;
  for(let c=0;c<=7;c++){const k=costAt(song,mode,c);const s=k.avg+c*0.04+k.hard*0.25;if(c===0)base={...k,s};if(s<best.s-0.001)best={c,s,k}}
  if(best.c&&base&&base.s-best.s<0.18)best={c:0,s:base.s,k:base};
  return {capo:best.c,base}}

/* ---------- diagramma ---------- */
function diag(sh,label,sub,data){
  const fr=sh.fr,pos=fr.filter(f=>f>0),mx=pos.length?Math.max(...pos):0,base=mx>4?Math.min(...pos):1;
  const W=104,sx=15,x0=15,y0=28,fy=19;let h='';
  for(let i=0;i<6;i++)h+=`<line x1="${x0+i*sx}" x2="${x0+i*sx}" y1="${y0}" y2="${y0+4*fy}" stroke="var(--muted)" stroke-width="${1+((5-i)*.15)}"/>`;
  for(let j=0;j<=4;j++)h+=`<line x1="${x0}" x2="${x0+5*sx}" y1="${y0+j*fy}" y2="${y0+j*fy}" stroke="${j===0&&base===1?'var(--fg)':'#2b3e44'}" stroke-width="${j===0&&base===1?4:1.2}"/>`;
  if(base>1)h+=`<text x="${x0+5*sx+5}" y="${y0+fy*.65}" fill="var(--muted)" font-size="10" font-family="JetBrains Mono,monospace">${base}°</text>`;
  if(sh.barre&&sh.barre>=base){const strs=fr.map((f,i)=>f===sh.barre&&sh.fi[i]===1?i:-1).filter(i=>i>=0);
    if(strs.length>1){const y=y0+(sh.barre-base+.5)*fy;h+=`<rect x="${x0+strs[0]*sx-6}" y="${y-6}" width="${(strs[strs.length-1]-strs[0])*sx+12}" height="12" rx="6" fill="var(--green)" opacity=".85"/>`}}
  fr.forEach((f,i)=>{const x=x0+i*sx;
    if(f<0)h+=`<text x="${x}" y="${y0-8}" text-anchor="middle" fill="var(--red)" font-size="11">×</text>`;
    else if(f===0)h+=`<circle cx="${x}" cy="${y0-11}" r="4" fill="none" stroke="var(--green)" stroke-width="1.3"/>`;
    else{const y=y0+(f-base+.5)*fy;h+=`<circle cx="${x}" cy="${y}" r="7" fill="var(--green)"/><text x="${x}" y="${y+.5}" text-anchor="middle" dominant-baseline="central" fill="#03140c" font-size="9.5" font-weight="600">${sh.fi[i]||''}</text>`}});
  return `<button class="sg-ch" ${data}><span class="sg-chn">${esc(label)}</span>${sub?`<span class="sg-chs">${esc(sub)}</span>`:''}<svg viewBox="0 0 ${W} ${y0+4*fy+6}" width="${W}" aria-hidden="true">${h}</svg>${sh.note?`<span class="sg-chs">${esc(sh.note)}</span>`:''}</button>`}

/* ---------- suono ---------- */
const LOWS=[40,45,50,55,59,64];
function strum(sh,capo,t,dir,v){if(!window.QC||!QC.pluckAt||!sh)return;const a=QC.audio();t=t||a.currentTime+0.02;
  let idx=[0,1,2,3,4,5].filter(i=>sh.fr[i]>=0);if(dir==='U')idx=idx.filter(i=>i>=2).reverse();
  idx.forEach((i,j)=>QC.pluckAt(LOWS[i]+sh.fr[i]+capo,t+j*0.012,(v||0.32)*(dir==='U'?0.75:1)))}
function stopPlay(){if(PLAY){PLAY.stop=true;clearTimeout(PLAY.tm);PLAY=null}
  document.querySelectorAll('.sg-bar.cur').forEach(e=>e.classList.remove('cur'));
  document.querySelectorAll('.sg-play').forEach(b=>{b.textContent='▶ Ascolta';b.classList.remove('on')})}
function playSection(si,btn){const was=PLAY&&PLAY.si===si;stopPlay();if(was)return;
  const sec=SONG.sections[si],bpm=Math.max(50,Math.min(180,SONG.bpm|0||90)),beat=60/bpm,cv=plan(SONG,MODE,CAPO);
  const bars=[...document.querySelectorAll(`.sg-sec[data-si="${si}"] .sg-bar`)];if(!bars.length)return;
  btn.textContent='■ Ferma';btn.classList.add('on');
  const a=QC.audio();let t0=a.currentTime+0.12;const P={si,stop:false};PLAY=P;let bi=0;
  const step=()=>{if(P.stop)return;if(bi>=bars.length){stopPlay();return}
    const cs=String(sec.bars[bi]).split(/\s+/).filter(Boolean),per=4/cs.length;
    bars.forEach(e=>e.classList.remove('cur'));bars[bi].classList.add('cur');
    cs.forEach((c,ci)=>{const r=cv(c);if(!r.sh)return;for(let k=0;k<per;k++){const t=t0+(ci*per+k)*beat;strum(r.sh,CAPO,t,'D',k===0&&ci===0?0.36:0.26);strum(r.sh,CAPO,t+beat/2,'U',0.2)}});
    t0+=4*beat;bi++;P.tm=setTimeout(step,Math.max(0,(t0-a.currentTime-0.15)*1000))};
  step()}

/* ---------- interfaccia ---------- */
function render(){const box=$('sgOut');stopPlay();
  if(!SONG){box.innerHTML=`<div class="sg-empty"><h2 class="sg-title">Quale canzone vuoi suonare?</h2>
    <p>Scrivi qui sopra titolo e artista. Il maestro cerca gli accordi in rete, confronta più fonti e te li mostra parte per parte: intro, strofa, ritornello.</p>
    <ul><li><b>Originali</b>: gli accordi come sul disco, con settime, sus e bassi.</li><li><b>Semplificati</b>: gli stessi accordi ridotti alle forme più facili, con le versioni senza barré quando servono.</li><li><b>Capotasto</b>: l’app prova tutte le posizioni e ti dice se conviene metterlo e su che tasto, per suonare nella tonalità del disco con forme più comode.</li></ul>
    <p class="muted small">Tocca un accordo per sentirlo, oppure “Ascolta” per sentire una parte intera al tempo della canzone. Serve la chiave gratuita di Gemini, la stessa del maestro.</p></div>`;return}
  const pref=prefOf(SONG),rec=bestCapo(SONG,MODE);if(CAPO==null)CAPO=rec.capo;
  const cv=plan(SONG,MODE,CAPO),all=chordsOf(SONG),seen=new Map();
  all.forEach(c=>{const r=cv(c);if(r.sh){const k=r.spc+'|'+r.fam+'|'+(MODE==='orig'?r.suf+'|'+r.bass:'');if(!seen.has(k))seen.set(k,{r,c})}});
  const lab=r=>{const shape=nameOf(r.spc,MODE==='simp'?r.fullSuf:prettySuf(r.suf),CAPO?'':pref,r.bass==null?null:((r.bass-CAPO)%12+12)%12);const real=nameOf(r.pc,MODE==='simp'?r.fullSuf:prettySuf(r.suf),pref,r.bass);return {shape,real}};
  const cost0=costAt(SONG,MODE,0),costC=costAt(SONG,MODE,rec.capo);
  const hard0=[...new Set(all.map(c=>cv0(c)).filter(r=>r&&r.sh&&r.sh.cost>=3).map(r=>lab0(r)))];
  function cv0(c){return plan(SONG,MODE,0)(c)}
  function lab0(r){return nameOf(r.pc,MODE==='simp'?r.fullSuf:prettySuf(r.suf),pref,null)}
  let why;
  if(rec.capo===0)why=cost0.hard?`Senza capotasto restano ${cost0.hard===1?'un accordo con barré':cost0.hard+' accordi con barré'} (${hard0.join(', ')}), ma spostando il capotasto non diventerebbe più semplice: suonala così.`:'Tutti gli accordi si fanno già con forme aperte: il capotasto non serve.';
  else{const hc=[...new Set(all.map(c=>plan(SONG,MODE,rec.capo)(c)).filter(r=>r&&r.sh&&r.sh.cost>=3).map(r=>nameOf(r.spc,MODE==='simp'?r.fullSuf:prettySuf(r.suf),pref,null)))];
    why=`Senza capotasto dovresti fare ${hard0.length?hard0.length===1?'il barré di '+hard0[0]:'i barré di '+hard0.join(', '):'forme più scomode'}. Con il capotasto al ${rec.capo}° tasto la tonalità resta quella del disco ma le dita fanno forme ${hc.length?'quasi tutte senza barré (resta '+hc.join(', ')+')':'tutte senza barré'}.`}
  const tabNote=SONG.tab_capo?`<p class="small muted">Nella versione originale il chitarrista usa il capotasto al ${SONG.tab_capo}° tasto.</p>`:'';
  let h=`<div class="sg-head"><div><h2 class="sg-title">${esc(SONG.title||'')}</h2><div class="muted">${esc(SONG.artist||'')}</div></div>
    <div class="sg-meta">${SONG.key?`<span>Tonalità <b>${esc(keyIt(SONG.key))}</b></span>`:''}${SONG.bpm?`<span><b>${SONG.bpm|0}</b> bpm</span>`:''}${SONG.time?`<span>${esc(SONG.time)}</span>`:''}</div></div>
   <div class="sg-capo ${rec.capo?'yes':''}"><div class="sg-capo-l"><div class="sg-lbl">Capotasto consigliato</div><div class="sg-capo-v">${rec.capo?rec.capo+'° tasto':'Non serve'}</div></div><p>${why}</p>${tabNote}</div>
   <div class="sg-ctrl"><div class="segc" role="group" aria-label="Versione"><button class="btn ${MODE==='orig'?'on':''}" data-mode="orig">Originali</button><button class="btn ${MODE==='simp'?'on':''}" data-mode="simp">Semplificati</button></div>
    <div class="sg-cap"><span class="muted">Capotasto</span><button class="btn small" id="sgCm" aria-label="Capotasto un tasto più giù">−</button><b id="sgCv">${CAPO?CAPO+'°':'no'}</b><button class="btn small" id="sgCp" aria-label="Capotasto un tasto più su">+</button>${CAPO!==rec.capo?`<button class="btn small" id="sgCr">Usa il consigliato</button>`:''}</div></div>
   ${CAPO?`<p class="small muted sg-hint">Nomi grandi: la forma che fanno le dita con il capotasto al ${CAPO}° tasto. Nome piccolo: l’accordo che suona davvero.</p>`:''}
   ${SONG.strum?`<p class="sg-strum"><span class="sg-lbl">Ritmo</span> ${esc(SONG.strum)}</p>`:''}
   <div class="sg-chords">${[...seen.values()].map(({r})=>{const l=lab(r);return diag(r.sh,l.shape,CAPO?'suona '+l.real:'',`data-k="${esc(r.spc+'|'+r.fam)}" data-c="${esc(JSON.stringify(r.sh))}"`)}).join('')}</div>
   <div class="sg-secs">${(SONG.sections||[]).map((s,si)=>`<section class="sg-sec" data-si="${si}"><div class="sg-sech"><b>${esc(s.name||'Parte '+(si+1))}</b>${s.repeat>1?`<span class="muted">× ${s.repeat|0}</span>`:''}<button class="btn small sg-play" data-si="${si}">▶ Ascolta</button></div>
     <div class="sg-bars">${(s.bars||[]).map(b=>`<div class="sg-bar">${String(b).split(/\s+/).filter(Boolean).map(c=>{const r=cv(c);if(r.nc)return '<span class="muted">—</span>';if(r.bad)return `<span>${esc(r.raw)}</span>`;const l=lab(r);return `<span class="sg-c" data-c="${esc(JSON.stringify(r.sh))}">${esc(l.shape)}</span>`}).join('')}</div>`).join('')}</div></section>`).join('')}</div>
   ${SONG.notes?`<p class="sg-notes">${esc(SONG.notes)}</p>`:''}
   <p class="small muted sg-src">${SONG.conf?`Affidabilità secondo il maestro: ${esc(SONG.conf)}. `:''}Gli accordi li trova il maestro in rete: controllali a orecchio sul disco.${SONG.sources&&SONG.sources.length?' Fonti: '+SONG.sources.slice(0,4).map(s=>`<a href="${esc(s.uri)}" target="_blank" rel="noopener">${esc(s.title||'link')}</a>`).join(', '):''}</p>`;
  box.innerHTML=h;
  box.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{MODE=b.dataset.mode;ls.set('songmode',MODE);CAPO=null;render()});
  $('sgCm').onclick=()=>{CAPO=Math.max(0,CAPO-1);render()};$('sgCp').onclick=()=>{CAPO=Math.min(9,CAPO+1);render()};
  if($('sgCr'))$('sgCr').onclick=()=>{CAPO=null;render()};
  box.querySelectorAll('.sg-ch,.sg-c').forEach(b=>b.addEventListener('click',()=>{try{strum(JSON.parse(b.dataset.c),CAPO)}catch(e){}}));
  box.querySelectorAll('.sg-play').forEach(b=>b.onclick=()=>playSection(+b.dataset.si,b))}
function prettySuf(q){return String(q||'').replace(/b5/g,'♭5').replace(/#/g,'♯')}
function keyIt(k){const p=parse(String(k).replace(/\s*(major|maggiore)$/i,'').replace(/\s*(minor|minore)$/i,'m'));if(p.nc||p.bad)return k;return rootName(p.pc,/b/.test(p.acc)?'b':p.acc==='#'?'#':'')+(family(p.q)==='m'?' minore':' maggiore')}

/* ---------- ricerca con Gemini ---------- */
const MODELS=['gemini-3.6-flash','gemini-3.5-flash','gemini-flash-latest','gemini-3.5-flash-lite','gemini-flash-lite-latest','gemini-2.5-flash'];
/* chiede a Google quali modelli può usare questa chiave, così quando Google ritira un modello l'app non si rompe */
async function liveModels(key){const c=ls.get('gemmodels',null);if(c&&Date.now()-c.t<6*3600e3&&c.list&&c.list.length)return c.list;
  try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':key}});if(!r.ok)return [];
    const j=await r.json();const v=n=>{const m=n.match(/gemini-(\d+(?:\.\d+)?)/);return m?parseFloat(m[1]):0};
    const list=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace(/^models\//,''))
      .filter(n=>/^gemini-.*flash/.test(n)&&!/tts|image|live|audio|embed|vision|thinking|exp|computer|robot|native/.test(n))
      .sort((a,b)=>(/lite/.test(a)-/lite/.test(b))||(/preview/.test(a)-/preview/.test(b))||(v(b)-v(a))||(/latest/.test(b)-/latest/.test(a))).slice(0,12);
    if(list.length)ls.set('gemmodels',{t:Date.now(),list});return list}catch(e){return []}}
const PROMPT=q=>`Cerca in rete gli accordi per chitarra della canzone: «${q}».
Usa più fonti affidabili (Ultimate Guitar, Songsterr, siti di accordi, libri di canzoni) e confrontale: scegli la versione più fedele al disco originale.
NON scrivere il testo della canzone, nemmeno una riga: servono solo gli accordi.
Rispondi SOLO con un oggetto JSON (niente altro testo), con questa forma:
{"found":true,"title":"titolo esatto","artist":"artista","key":"tonalità reale del disco, es. G o Em","bpm":numero,"time":"4/4","tab_capo":numero,
 "strum":"ritmo di pennata consigliato, in italiano, breve (es. giù giù-su su-giù-su)",
 "sections":[{"name":"Intro|Strofa|Pre-ritornello|Ritornello|Ponte|Assolo|Finale","repeat":numero,"bars":["G","D","Em C"]}],
 "notes":"una o due frasi in italiano utili per suonarla (niente testo della canzone)","conf":"alta|media|bassa"}
Regole: accordi in notazione inglese (C, Am, F#m, Bb7, Cadd9, D/F#). In "bars" ogni elemento è UNA battuta; se in una battuta ci sono due accordi separali con uno spazio.
"tab_capo" è il capotasto che usa la versione originale: se le fonti scrivono gli accordi come forme con il capotasto, riporta le forme così come sono scritte e metti il tasto del capotasto in tab_capo; altrimenti 0.
Elenca le sezioni nell'ordine della canzone, senza ripetere identiche sezioni consecutive (usa repeat).
Se il titolo è ambiguo scegli la versione più famosa (se il titolo è in italiano preferisci la canzone italiana). Se le fonti non sono chiare usa quello che sai della canzone e metti "conf":"bassa": è meglio una risposta approssimata che nessuna.
Solo se la canzone proprio non esiste rispondi {"found":false,"why":"motivo in italiano"}.`;
function looseJSON(t){t=String(t).replace(/```(?:json)?/gi,'');const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)return null;
  let x=t.slice(a,b+1);try{return JSON.parse(x)}catch(e){}
  x=x.replace(/[\u201C\u201D]/g,'"').replace(/\[(?:cite|\d)[^\]]*\]/g,'').replace(/,\s*([}\]])/g,'$1').replace(/\/\/[^\n"]*$/gm,'');
  try{return JSON.parse(x)}catch(e){return null}}
async function gem(key,model,q,signal,noSearch){
  const ctl=new AbortController(),stop=()=>ctl.abort();signal.addEventListener('abort',stop);const to=setTimeout(()=>ctl.abort(),75000);
  let r,j;
  try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:PROMPT(q)}]}],...(noSearch?{}:{tools:[{google_search:{}}]}),generationConfig:{maxOutputTokens:16384}})});
    j=await r.json().catch(()=>({}))}
  catch(err){if(signal.aborted)throw err;const e=new Error(ctl.signal.aborted?'nessuna risposta in 75 secondi':'rete: '+(err&&err.message||''));e.status=0;throw e}
  finally{clearTimeout(to);signal.removeEventListener('abort',stop)}
  if(!r.ok){const e=new Error((j.error&&j.error.message)||'errore '+r.status);e.status=r.status;throw e}
  const c=j.candidates&&j.candidates[0];
  if(!c){const e=new Error('risposta bloccata'+(j.promptFeedback&&j.promptFeedback.blockReason?' ('+j.promptFeedback.blockReason+')':''));e.status=200;throw e}
  const t=c.content&&c.content.parts?c.content.parts.filter(p=>!p.thought).map(p=>p.text||'').join(''):'';
  const d=looseJSON(t);
  if(!d){const e=new Error(c.finishReason&&c.finishReason!=='STOP'?'risposta interrotta ('+c.finishReason+')':t?'risposta non leggibile':'risposta vuota');e.status=200;throw e}
  const g=c.groundingMetadata&&c.groundingMetadata.groundingChunks||[];
  d.sources=g.map(x=>x.web).filter(Boolean).map(w=>({uri:w.uri,title:w.title}));
  return d}
let busy=null;
async function search(q){
  q=q.trim();if(!q||busy)return;
  const cache=ls.get('songs',[]),hit=cache.find(s=>s.q.toLowerCase()===q.toLowerCase());
  if(hit){show(hit.d);return}
  const key=ls.get('gemkey','');if(!key){keyForm(q);return}
  const st=$('sgStat');st.className='sg-stat';st.innerHTML='<span class="sg-spin"></span> Il maestro sta cercando gli accordi in rete… <span id="sgTry"></span>';
  $('sgGo').disabled=true;busy=new AbortController();const to=setTimeout(()=>busy&&busy.abort(),240000);
  const live=await liveModels(key);
  const fix=ls.get('songmodelfix','');
  const order=fix?[fix]:[...new Set([ls.get('songmodel','')].concat(live.length?live:MODELS))].filter(m=>m&&(!live.length||live.includes(m)));
  let last;const errs=[];
  const tries=order.map(m=>[m,false]).concat(order.slice(0,3).map(m=>[m,true]));fillModels();
  const log=[];let notFound=null;
  try{for(const [m,ns] of tries){if(ns&&errs.some(e=>e.status===401||e.status===403||e.name==='AbortError'))break;
      const tr=$('sgTry');if(tr)tr.textContent=`(${nice(m)}${ns?', senza ricerca':''}…)`;
      try{const d=await gem(key,m,q,busy.signal,ns);if(ns){d.nosearch=true;d.conf='da verificare: trovati senza la ricerca in rete'}
        if(d.found===false){notFound=d.why||'';log.push(`${m}${ns?' senza ricerca':''}: dice che non esiste${d.why?' ('+d.why+')':''}`);continue}
        if(!d.sections||!d.sections.length||!d.sections.some(x=>x.bars&&x.bars.length))throw Object.assign(new Error('nessun accordo nella risposta'),{status:200});
        ls.set('songmodel',m);cache.unshift({q,d,t:Date.now()});ls.set('songs',cache.slice(0,25));st.textContent='';show(d);return}
      catch(e){errs.push(e);last=e;log.push(`${m}${ns?' senza ricerca':''}: ${e.status?e.status+' ':''}${e.message}`);if(e.name==='AbortError')break;if(e.status===401||e.status===403||(e.status===400&&/API key/i.test(e.message)))break}}
    st.className='sg-stat err';
    if(notFound!==null&&!errs.some(e=>e.status===429||e.status===401||e.status===403)){st.textContent='Il maestro non ha trovato questa canzone'+(notFound?': '+notFound:'')+'. Prova a scrivere titolo e artista per intero, oppure incolla gli accordi da un sito (qui sotto).';diag(log);return}
    st.textContent=last&&last.name==='AbortError'?'La ricerca ci ha messo troppo: riprova.':
      last&&(last.status===401||last.status===403||/API key/i.test(last.message))?'La chiave Gemini non è valida: incollane una nuova.':
      errs.some(e=>e.status===429)?'Hai raggiunto il limite gratuito di Gemini: riprova tra un minuto (o domani se è il limite giornaliero).':
      errs.some(e=>e.status>=500)?'I server di Gemini sono sovraccarichi in questo momento: riprova tra qualche minuto.':
      errs.length&&errs.every(e=>e.status===404||/no longer available|not found|not supported/i.test(e.message))?'Google ha cambiato i modelli di Gemini e nessuno di quelli provati risponde a questa chiave: riprova più tardi.':
      errs.length&&errs.every(e=>e.status===200)?'Gemini ha risposto ma senza accordi utilizzabili: a volte blocca le risposte sulle canzoni protette da copyright. Riprova scrivendo titolo e artista in modo diverso.':
      'Non sono riuscito a trovare gli accordi ('+((last&&last.status)||'rete')+'). Riprova tra poco.';
    if(fix&&!(last&&(last.status===401||last.status===403)))st.textContent+=` Hai scelto il modello ${fix}: prova con “Automatico” o con un altro modello.`;
    st.textContent+=' In alternativa puoi incollare gli accordi da un sito (qui sotto).';diag(log);
    if(!fix)ls.set('gemmodels',null);
    if(last&&(last.status===401||last.status===403||/API key/i.test(last.message||''))){ls.set('gemkey','');keyForm(q)}}
  finally{clearTimeout(to);busy=null;$('sgGo').disabled=false;recent()}}
function show(d){SONG=d;CAPO=null;$('sgStat').textContent='';render();recent();const o=$('sgOut');o.scrollTop=0;o.classList.remove('sg-in');void o.offsetWidth;o.classList.add('sg-in')}
function keyForm(q){const st=$('sgStat');st.className='sg-stat';
  st.innerHTML=`Per cercare gli accordi serve la chiave gratuita di Google Gemini (la stessa del maestro). Vai su <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>, tocca “Create API key”, copiala e incollala qui. Resta solo su questo dispositivo.
   <span class="sg-key"><input id="sgKey" type="password" autocomplete="off" placeholder="Incolla la chiave"><button class="btn" id="sgKeyOk">Salva</button></span>`;
  const ok=()=>{const k=$('sgKey').value.trim().replace(/\s+/g,'');if(!k)return;ls.set('gemkey',k);st.textContent='';search(q)};
  $('sgKeyOk').onclick=ok;$('sgKey').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ok()}})}
function recent(){const c=ls.get('songs',[]),el=$('sgRecent');
  el.innerHTML=c.length?'<span class="muted small">Recenti</span>'+c.slice(0,8).map((s,i)=>`<button class="btn small ${SONG===s.d?'on':''}" data-i="${i}">${esc(s.d.title||s.q)}${s.d.artist?' · '+esc(s.d.artist):''}</button>`).join('')+(SONG?'<button class="btn small" id="sgAgain" title="Rifai la ricerca in rete">↻ Cerca di nuovo</button>':''):'';
  el.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{show(c[+b.dataset.i].d)});
  const ag=$('sgAgain');if(ag)ag.onclick=()=>{const i=c.findIndex(s=>s.d===SONG);if(i<0)return;const q=c[i].q;c.splice(i,1);ls.set('songs',c);SONG=null;render();search(q)}}

function diag(log){if(!log.length)return;const d=document.createElement('details');d.className='sg-diag';d.innerHTML='<summary>Dettagli tecnici (se mi mandi una schermata, mostrali)</summary>'+log.map(l=>`<div>${esc(l)}</div>`).join('');$('sgStat').appendChild(d)}

/* ---------- accordi incollati da un sito: tengo solo gli accordi, il testo viene scartato ---------- */
const SECN=[[/intro/i,'Intro'],[/pre-?(chorus|rit)/i,'Pre-ritornello'],[/verse|strofa/i,'Strofa'],[/chorus|ritornello|^rit\b/i,'Ritornello'],[/bridge|ponte/i,'Ponte'],[/solo|assolo/i,'Assolo'],[/interlud|instrument|strumental/i,'Strumentale'],[/outro|finale|coda|ending/i,'Finale']];
function secName(l){const x=l.replace(/[\[\]():]/g,' ').trim();if(x.length>30)return null;for(const [re,n] of SECN)if(re.test(x)&&/^[a-zàèéìòù\s\-.\d]+$/i.test(x))return n;return null}
function isChord(t){const p=parse(t);return !p.bad&&!p.nc}
function parsePaste(txt,title){
  txt=String(txt).replace(/\[\/?ch\]/g,'').replace(/\r/g,'');let capo=0;const secs=[];let cur=null;
  const push=c=>{if(!cur){cur={name:'Strofa',bars:[]};secs.push(cur)}cur.bars.push(c)};
  for(let line of txt.split('\n')){const raw=line.trim();if(!raw)continue;
    const cm=raw.match(/capo(?:tasto)?\s*(?:al|on|:|-)?\s*(\d{1,2})/i);if(cm&&raw.length<40){capo=+cm[1];continue}
    const sn=secName(raw);if(sn){cur={name:sn,bars:[]};secs.push(cur);continue}
    const br=[...raw.matchAll(/\[([^\]]{1,12})\]/g)].map(m=>m[1]).filter(isChord);
    if(br.length){br.forEach(push);continue}
    const toks=raw.split(/[\s|]+/).filter(t=>t&&!/^(\(?x\s?\d+\)?|\d+x|-+|%|\/|\.+|N\.?C\.?)$/i.test(t)).map(t=>t.replace(/^\(|\)$/g,''));
    if(toks.length&&toks.every(isChord))toks.forEach(push)}
  const sections=[];secs.filter(x=>x.bars.length).forEach(x=>{const p=sections[sections.length-1];if(p&&p.name===x.name&&p.bars.join()===x.bars.join())p.repeat=(p.repeat||1)+1;else sections.push({name:x.name,repeat:1,bars:x.bars})});
  if(!sections.length)return null;
  const first=parse(sections[0].bars[0]);
  return {found:true,pasted:true,title:title||'Canzone incollata',artist:'',key:first&&!first.bad?SHARP[(first.pc+capo)%12]+(family(first.q)==='m'?'m':''):'',tab_capo:capo,sections,
    conf:'accordi incollati da te',notes:'Ogni accordo è mostrato come una battuta: la durata reale la senti sul disco.'}}
function pasteUI(){const b=$('sgPasteBtn'),box=$('sgPaste');if(!b)return;
  b.onclick=()=>{box.hidden=!box.hidden;if(!box.hidden)$('sgPasteTx').focus()};
  $('sgPasteGo').onclick=()=>{const tx=$('sgPasteTx').value;const d=parsePaste(tx,$('sgQ').value.trim());
    if(!d){$('sgStat').className='sg-stat err';$('sgStat').textContent='Non ho riconosciuto accordi nel testo incollato.';return}
    const c=ls.get('songs',[]);c.unshift({q:'incollata:'+Date.now(),d,t:Date.now()});ls.set('songs',c.slice(0,25));$('sgPasteTx').value='';box.hidden=true;show(d)}}

/* menu per scegliere il modello di Gemini */
function nice(m){const v=m.match(/gemini-(\d+(?:\.\d+)?)/);return 'Gemini '+(v?v[1]+' ':'')+(/flash-lite/.test(m)?'Flash-Lite':/flash/.test(m)?'Flash':/pro/.test(m)?'Pro':'')+(/latest/.test(m)?' (ultima versione)':'')+(/preview/.test(m)?' (anteprima)':'')}
function fillModels(){const sel=$('sgModel');if(!sel)return;const fix=ls.get('songmodelfix',''),used=ls.get('songmodel','');
  const live=(ls.get('gemmodels',null)||{}).list||[];const list=[...new Set((live.length?live:MODELS).concat(fix?[fix]:[]))];
  sel.innerHTML=`<option value="">Automatico${!fix&&used?' (ora: '+esc(nice(used))+')':''}</option>`+list.map(m=>`<option value="${esc(m)}" ${m===fix?'selected':''}>${esc(nice(m))} · ${esc(m)}</option>`).join('');
  $('sgModelNote').textContent=fix?(/lite/.test(fix)?'Flash-Lite: più veloce e con più richieste gratuite al giorno, a volte meno preciso.':'Flash: più preciso, un po’ più lento e con meno richieste gratuite.'):'L’app prova il modello più recente e, se non risponde, passa al successivo.'}
async function refreshModels(){const k=ls.get('gemkey','');if(!k)return;const c=ls.get('gemmodels',null);if(!c||Date.now()-c.t>6*3600e3){ls.set('gemmodels',null);await liveModels(k)}fillModels()}
function init(){const f=$('sgForm');if(!f)return;pasteUI();
  const sel=$('sgModel');if(sel){sel.addEventListener('change',()=>{ls.set('songmodelfix',sel.value);fillModels()});fillModels();refreshModels()}
  f.addEventListener('submit',e=>{e.preventDefault();search($('sgQ').value)});
  const c=ls.get('songs',[]);if(c.length){SONG=c[0].d}recent();render()}
window.QCsongs={open(){if(SONG)render();else recent();refreshModels()},close:stopPlay,
  _test:{parsePaste,looseJSON,parse,family,shapeFor,bestCapo,show,set:d=>show(d)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
