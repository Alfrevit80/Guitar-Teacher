/* Looper: interfaccia e collegamento con il resto dell'app (vedi LOOPER-SPEC.md) */
(function(){
const $=id=>document.getElementById(id);
const ls={get(k,d){try{const v=localStorage.getItem('qc_lp_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
          set(k,v){try{localStorage.setItem('qc_lp_'+k,JSON.stringify(v))}catch(e){}}};
const NT=1;                       /* F1: una traccia visibile (il motore ne ha già 4) */
const S={rt:ls.get('rt',null),mon:ls.get('mon',false),chan:ls.get('chan','sum'),inDb:ls.get('indb',0),master:ls.get('master',100),
  recAction:ls.get('recAction','play'),tr:ls.get('tr',null)};
if(!Array.isArray(S.tr)||S.tr.length<4)S.tr=Array.from({length:4},()=>({vol:100,pan:0,dub:'over'}));
S.tr=S.tr.slice(0,4);
const saveTr=()=>ls.set('tr',S.tr);
let ac=null,node=null,loading=null,outG=null,inA=null,inB=null,last=null,undoMode=false,calMode=null;

const say=t=>{$('lpMsg').textContent=t||''};
const mod=(a,n)=>{a%=n;return a<0?a+n:a};
const mGain=()=>{const v=S.master;return v<=0?0:Math.pow(v/100,1.6)};

/* ---------- motore ---------- */
function ensure(){
  if(node)return Promise.resolve(node);if(loading)return loading;
  loading=(async()=>{
    ac=QC.audio();
    if(!ac.audioWorklet||typeof AudioWorkletNode==='undefined')throw new Error('noworklet');
    await ac.audioWorklet.addModule('looper-worklet.js');
    node=new AudioWorkletNode(ac,'qc-looper',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:1,channelCountMode:'explicit',channelInterpretation:'speakers'});
    outG=ac.createGain();outG.gain.value=mGain();
    const lim=ac.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=0.001;lim.release.value=0.1;
    node.connect(outG).connect(lim).connect(ac.destination);
    node.port.onmessage=e=>onMsg(e.data);
    sendCfg();connectIn();return node})().catch(e=>{loading=null;
      say(e&&e.message==='noworklet'?'Questo browser non ha AudioWorklet: aggiorna Safari (iPhone/iPad con iOS 14.5 o successivo) o usa Chrome/Edge aggiornati.':
        'Non riesco ad avviare il motore del looper ('+(e&&e.message||e)+'). Ricarica la pagina; il looper deve essere aperto da https.');throw e});
  return loading}
const post=m=>{if(node)node.port.postMessage(m)};
function estLat(){if(!ac)return 0.03;let i=0;try{const s=QC.stream&&QC.stream();i=(s&&s.getAudioTracks()[0].getSettings().latency)||0}catch(e){}
  return (ac.outputLatency||0)+(ac.baseLatency||0)+(i||0.005)}
const curLat=()=>S.rt!=null?S.rt:estLat();
function sendRt(){if(ac)post({t:'rt',v:curLat()*ac.sampleRate});latUI()}
function sendCfg(){sendRt();post({t:'mon',v:S.mon});post({t:'recAction',v:S.recAction});
  S.tr.forEach((x,i)=>{post({t:'vol',tr:i,v:x.vol/100});post({t:'pan',tr:i,v:x.pan/50});post({t:'dubMode',tr:i,v:x.dub})})}
function connectIn(){
  if(!node)return;try{inA&&inA.disconnect();inB&&inB.disconnect()}catch(e){}inA=inB=null;
  const sp=QC.inSplit&&QC.inSplit();if(!sp)return;
  inA=ac.createGain();inB=ac.createGain();sp.connect(inA,0);sp.connect(inB,1);inA.connect(node);inB.connect(node);inLevel();sendRt()}
function inLevel(){const g=Math.pow(10,S.inDb/20);if(inA)inA.gain.value=S.chan==='2'?0:g;if(inB)inB.gain.value=S.chan==='1'?0:g}
document.addEventListener('qc-input',()=>{if(node)connectIn();else if(!$('pageLooper').hidden)ensure().catch(()=>{})});

/* istante del tocco -> frame che l'utente stava ascoltando */
function heard(evT){const sr=ac.sampleRate,now=performance.now();if(!(evT>0)||Math.abs(now-evT)>2000)evT=now;let ct=null;
  try{if(ac.getOutputTimestamp){const ts=ac.getOutputTimestamp();if(ts&&ts.contextTime>0&&ts.performanceTime>0)ct=ts.contextTime+(evT-ts.performanceTime)/1000}}catch(e){}
  if(ct==null||!isFinite(ct))ct=ac.currentTime-(ac.outputLatency||ac.baseLatency||0)-(now-evT)/1000;
  return Math.round(ct*sr)}
function act(a,t,evT){
  if(a==='press'&&last&&last.tr[t].st==='empty'&&!QC.hasInput()&&!window.__qcTest){say('Prima attiva l’ingresso: tocca «Attiva ingresso» in alto.');return}
  ensure().then(()=>{if(ac.state!=='running')ac.resume().catch(()=>{});post({t:a,tr:t,at:heard(evT)})}).catch(()=>{})}

/* ---------- tracce ---------- */
const RC=2*Math.PI*54;
const ST_IT={empty:'vuota',rec:'registrazione',play:'riproduzione',dub:'sovraincisione',stop:'ferma'};
function trackHTML(i){const x=S.tr[i];return `<div class="lp-tr" data-t="${i}">
  <div class="lp-trh"><span class="qn">${i+1}</span><span class="lp-st">vuota</span><span class="sp"></span><span class="lp-len mono small"></span></div>
  <div class="lp-ringwrap">
    <svg class="lp-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="54"/><circle class="pr" cx="60" cy="60" r="54" stroke-dasharray="${RC}" stroke-dashoffset="${RC}" transform="rotate(-90 60 60)"/><circle class="lv" cx="60" cy="60" r="44"/></svg>
    <button class="lp-rp" data-a="press" aria-label="Registra, riproduci o sovraincidi la traccia ${i+1}">REC</button>
  </div>
  <div class="lp-btns"><button class="btn lp-stop" data-a="stop" title="Ferma. Tieni premuto 2 secondi per cancellare la traccia">■ STOP<i></i></button><button class="btn small" data-a="track" title="Impostazioni della traccia">TRACK</button><button class="btn small" data-a="fx" title="Effetti della traccia (in arrivo)">FX</button></div>
  <label class="lp-sl"><span class="small muted">Volume</span><input type="range" min="0" max="200" step="1" value="${x.vol}" data-p="vol" aria-label="Volume della traccia ${i+1}"><span class="mono small lp-v">${x.vol}</span></label>
  <label class="lp-sl"><span class="small muted">Pan</span><input type="range" min="-50" max="50" step="1" value="${x.pan}" data-p="pan" aria-label="Pan della traccia ${i+1}"><span class="mono small lp-v">${panTxt(x.pan)}</span></label>
  <div class="lp-trset" hidden>
    <label class="small muted">Sovraincisione<select data-p="dub"><option value="over">OVERDUB · si somma</option><option value="rep1">REPLACE1 · sostituisce, non senti il vecchio</option><option value="rep2">REPLACE2 · sostituisce, senti il vecchio</option></select></label>
  </div>
</div>`}
const panTxt=p=>p===0?'C':p<0?'L'+(-p):'R'+p;
function buildTracks(){const box=$('lpTracks');box.innerHTML=Array.from({length:NT},(_,i)=>trackHTML(i)).join('');
  box.querySelectorAll('.lp-tr').forEach(el=>{const i=+el.dataset.t;el.querySelector('[data-p="dub"]').value=S.tr[i].dub})}

let hold=null,holdEl=null;
function endHold(){if(hold){clearTimeout(hold);hold=null}if(holdEl){holdEl.classList.remove('hold');holdEl=null}}
function trackAct(el,a,evT){const i=+el.closest('.lp-tr').dataset.t;
  if(undoMode){const m={press:'undo',stop:'markback',track:'markset',fx:'markclear'}[a];if(m)act(m,i,evT);return}
  if(a==='press')act('press',i,evT);
  else if(a==='stop'){act('stop',i,evT);endHold();holdEl=el;el.classList.add('hold');
    hold=setTimeout(()=>{hold=null;el.classList.remove('hold');act('clear',i);say('Traccia '+(i+1)+' cancellata.')},2000)}
  else if(a==='track'){const p=el.closest('.lp-tr').querySelector('.lp-trset');p.hidden=!p.hidden;el.classList.toggle('on',!p.hidden)}
  else if(a==='fx')say('Gli effetti arrivano nella fase 5.')}
$('lpTracks').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-a]');if(!b||e.button>0)return;e.preventDefault();trackAct(b,b.dataset.a,e.timeStamp)});
$('lpTracks').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||e.detail!==0)return;trackAct(b,b.dataset.a,performance.now());if(b.dataset.a==='stop')endHold()});
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,endHold));
$('lpTracks').addEventListener('input',e=>{const r=e.target,p=r.dataset.p;if(!p)return;const i=+r.closest('.lp-tr').dataset.t,v=+r.value;
  if(p==='vol'){S.tr[i].vol=v;r.nextElementSibling.textContent=v;post({t:'vol',tr:i,v:v/100})}
  if(p==='pan'){S.tr[i].pan=v;r.nextElementSibling.textContent=panTxt(v);post({t:'pan',tr:i,v:v/50})}
  saveTr()});
$('lpTracks').addEventListener('change',e=>{const r=e.target;if(r.dataset.p!=='dub')return;const i=+r.closest('.lp-tr').dataset.t;S.tr[i].dub=r.value;post({t:'dubMode',tr:i,v:r.value});saveTr()});

/* ---------- comandi globali ---------- */
$('lpAll').addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();act('all',0,e.timeStamp)});
$('lpAll').addEventListener('click',e=>{if(e.detail===0)act('all',0,performance.now())});
$('lpUndo').onclick=()=>{undoMode=!undoMode;$('lpUndo').classList.toggle('on',undoMode);$('lpUndo').setAttribute('aria-pressed',undoMode);
  say(undoMode?'Modalità UNDO: il tasto grande annulla o ripristina, STOP = MARK BACK, TRACK = MARK SET, FX = MARK CLEAR. Tocca di nuovo UNDO/REDO per uscire.':'')};
const recA=$('lpRecAction');recA.value=S.recAction;recA.onchange=()=>{S.recAction=recA.value;ls.set('recAction',S.recAction);post({t:'recAction',v:S.recAction})};
const monB=$('lpMon');function monUI(){monB.classList.toggle('on',S.mon);monB.setAttribute('aria-pressed',S.mon);monB.textContent=S.mon?'Ascolto ingresso: sì':'Ascolto ingresso: no'}
monB.onclick=()=>{S.mon=!S.mon;ls.set('mon',S.mon);monUI();ensure().then(()=>post({t:'mon',v:S.mon})).catch(()=>{})};monUI();
const chS=$('lpChan');chS.value=S.chan;chS.onchange=()=>{S.chan=chS.value;ls.set('chan',S.chan);inLevel()};
const inR=$('lpInDb');inR.value=S.inDb;const inTxt=()=>{$('lpInDbV').textContent=(S.inDb>0?'+':'')+S.inDb+' dB'};inTxt();
inR.oninput=()=>{S.inDb=+inR.value;ls.set('indb',S.inDb);inTxt();inLevel()};
const mR=$('lpMaster');mR.value=S.master;$('lpMasterV').textContent=S.master;
mR.oninput=()=>{S.master=+mR.value;ls.set('master',S.master);$('lpMasterV').textContent=S.master;if(outG)outG.gain.setTargetAtTime(mGain(),ac.currentTime,0.02)};

/* ---------- calibrazione ---------- */
function latUI(){const ms=Math.round(curLat()*1000);$('lpLatChip').textContent=`Ritardo ${ms} ms${S.rt==null?' (stimato)':''}`;$('lpRtVal').textContent=ms+' ms'}
function calView(on){$('lpCal').hidden=!on;$('lpMain').hidden=on}
$('lpCalOpen').onclick=()=>{calView(true);ensure().catch(()=>{});
  $('lpCalRes').innerHTML=S.rt!=null?`<p>Ritardo attuale: ${Math.round(S.rt*1000)} ms (misurato).</p>`:`<p>Ritardo stimato dal browser: ${Math.round(estLat()*1000)} ms. Di solito quello vero è più alto: misuralo.</p>`;
  $('lpCalDots').innerHTML=''};
$('lpCalBack').onclick=()=>{post({t:'calstop'});calMode=null;calView(false)};
function calStart(mode){
  if(!QC.hasInput()&&!window.__qcTest){$('lpCalRes').innerHTML='<p>Prima attiva l’ingresso: tocca «Attiva ingresso» in alto.</p>';return}
  ensure().then(()=>{calMode=mode;post({t:'bg'});
    const n=mode==='play'?16:8;$('lpCalDots').innerHTML=Array.from({length:n},(_,k)=>`<span class="${mode==='play'&&k<4?'ci':''}"></span>`).join('');
    $('lpCalRes').innerHTML=mode==='play'?'<p>Ascolta i 4 click di attacco, poi dai una pennata secca su ognuno dei 12 click.</p>':'<p>Sto ascoltando i miei click… non suonare.</p>';
    post({t:'cal',n,iv:mode==='play'?0.6:0.5,acc:mode==='play'?4:8})}).catch(()=>{})}
$('lpCalPlay').onclick=()=>calStart('play');$('lpCalLoop').onclick=()=>calStart('loop');
function calDone(m){const sr=ac.sampleRate,play=calMode==='play',skip=play?4:0,ds=[];calMode=null;
  m.clicks.slice(skip).forEach(c=>{const lo=c-(play?0.12:0)*sr,hi=c+0.45*sr;const o=m.onsets.find(x=>x>=lo&&x<=hi);if(o!=null)ds.push(o-c)});
  const need=play?8:6,tot=m.clicks.length-skip;
  if(ds.length<need){$('lpCalRes').innerHTML=`<p>Ho sentito solo ${ds.length} colpi su ${tot}: non basta per una misura affidabile.</p><p class="muted">${play?'Suona più forte e secco, una corda a vuoto, esattamente sul click. Controlla che la barra del livello si muova.':'Serve un cavo dall’uscita della scheda al suo ingresso, oppure un microfono vicino all’altoparlante, con il volume alto.'}</p>`;return}
  ds.sort((a,b)=>a-b);const med=ds[ds.length>>1],dev=ds.map(d=>Math.abs(d-med)).sort((a,b)=>a-b)[ds.length>>1];
  S.rt=Math.max(0,Math.min(0.5,med/sr));ls.set('rt',S.rt);sendRt();
  const spread=Math.round(dev/sr*1000);
  $('lpCalRes').innerHTML=`<p>Ritardo misurato: <b>${Math.round(S.rt*1000)} ms</b> su ${ds.length} colpi (variazione ±${spread} ms). Il browser ne dichiarava ${Math.round(estLat()*1000)}.</p>`+
    (play&&spread>15?'<p class="muted">I colpi erano poco regolari: ripeti la misura con pennate più secche, oppure usa il cavo di ritorno.</p>':'<p class="muted">Da ora ogni sovraincisione viene spostata indietro di questo ritardo, così cade a tempo.</p>')}
$('lpRtM').onclick=()=>{S.rt=Math.max(0,curLat()-0.001);ls.set('rt',S.rt);sendRt()};
$('lpRtP').onclick=()=>{S.rt=Math.min(0.5,curLat()+0.001);ls.set('rt',S.rt);sendRt()};
$('lpRtR').onclick=()=>{S.rt=null;ls.set('rt',null);sendRt()};

/* ---------- messaggi dal motore e disegno ---------- */
function onMsg(m){if(m.t==='st')last=m;else if(m.t==='cal')calDone(m)}
const dbW=p=>{const db=p>0?20*Math.log10(p):-90;return Math.max(0,Math.min(100,(db+60)/60*100))};
let tabSt='';
function draw(){requestAnimationFrame(draw);if(!last||!ac)return;
  const any=k=>last.tr.some(t=>t.st===k),g=any('rec')?'rec':any('dub')?'dub':any('play')?'play':'';
  if(g!==tabSt){tabSt=g;$('lpDot').className='lp-dot '+g}
  if($('pageLooper').hidden)return;
  const sr=ac.sampleRate,hn=(ac.currentTime-(ac.outputLatency||0))*sr;
  const iv=$('lpInVu');iv.style.width=dbW(last.inPeak)+'%';iv.className=last.inPeak>0.9?'hot':last.inPeak>0.01?'ok':'';
  document.querySelectorAll('.lp-tr').forEach(el=>{const i=+el.dataset.t,s=last.tr[i];if(!s)return;
    const cls='lp-tr st-'+s.st+(undoMode?' um':'');if(el.className!==cls)el.className=cls;
    el.querySelector('.lp-st').textContent=ST_IT[s.st];
    const rp=el.querySelector('.lp-rp');let lab;
    if(undoMode){lab=s.undo?'UNDO':s.redo?'REDO':'—';rp.dataset.u=s.undo?'u':s.redo?'r':''}
    else{rp.dataset.u='';lab={empty:'REC',rec:S.recAction==='dub'?'DUB':'PLAY',play:'DUB',dub:'PLAY',stop:'PLAY'}[s.st]}
    if(rp.textContent!==lab)rp.textContent=lab;
    const sb=el.querySelector('.lp-stop');const sl=undoMode?'MARK BACK':'■ STOP';if(sb.firstChild.nodeValue!==sl)sb.firstChild.nodeValue=sl;
    el.querySelector('[data-a="track"]').textContent=undoMode?'MARK SET'+(s.mark?' ✓':''):'TRACK';
    el.querySelector('[data-a="fx"]').textContent=undoMode?'MARK CLEAR':'FX';
    let p=0,txt='';
    if(s.st==='rec'){const e=Math.max(0,(hn-s.from)/sr);p=(e%2)/2;txt=e.toFixed(1)+' s'}
    else if(s.len){p=(s.st==='play'||s.st==='dub')?mod(hn-s.anchor,s.len)/s.len:0;txt=(s.len/sr).toFixed(2)+' s'}
    el.querySelector('.pr').setAttribute('stroke-dashoffset',(RC*(1-p)).toFixed(1));
    el.querySelector('.lv').style.opacity=Math.min(1,dbW(s.peak)/100).toFixed(2);
    const ln=el.querySelector('.lp-len');if(ln.textContent!==txt)ln.textContent=txt});
  if(last.cal){const dots=$('lpCalDots').children;last.cal.clicks.forEach((c,k)=>{if(dots[k])dots[k].classList.toggle('on',hn>=c)})}}
requestAnimationFrame(draw);

/* ---------- iPhone/iPad: background e interruzioni ---------- */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(node&&last&&last.tr.some(t=>t.st!=='empty'&&t.st!=='stop'))post({t:'bg'});return}
  setTimeout(()=>{const s=QC.stream&&QC.stream();const tk=s&&s.getAudioTracks()[0];
    if(tk&&tk.readyState==='ended')say('Il sistema ha chiuso l’ingresso audio mentre l’app era in background: tocca «Attiva ingresso» due volte per riattivarlo.');
    else if(ac&&ac.state!=='running'&&!$('pageLooper').hidden)say('Audio in pausa: tocca lo schermo per riprenderlo.')},400)});

document.addEventListener('qc-looper-open',()=>{ensure().then(()=>{if(ac.state!=='running')say('Tocca un tasto qualsiasi per sbloccare l’audio.');else if($('lpMsg').textContent.startsWith('Tocca'))say('')}).catch(()=>{})});
buildTracks();latUI();
window.QC=window.QC||{};QC.looper={ensure,act,get state(){return last},get node(){return node},lat:()=>curLat()};
})();
