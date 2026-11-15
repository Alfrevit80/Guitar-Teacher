/* Metronomo del looper: lo senti solo tu; finisce nel loop solo se attivi «Registra il click» */
(function(){
const $=id=>document.getElementById(id);
const ls={get(k,d){try{const v=localStorage.getItem('qc_lpm_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('qc_lpm_'+k,JSON.stringify(v))}catch(e){}}};
let on=false,bpm=ls.get('bpm',90),vol=ls.get('vol',70),rec=ls.get('rec',false),beats=ls.get('beats',4);
let ac=null,monG=null,recG=null,recD=null,wired=null,timer=null,next=0,k=0,q=[];
const g=v=>v<=0?0:Math.pow(v/100,1.6)*1.8;
function nodes(){ac=QC.audio();if(!monG){monG=ac.createGain();monG.connect(ac.destination);recG=ac.createGain();recD=ac.createDelay(2);recG.connect(recD)}
  monG.gain.value=g(vol);recG.gain.value=rec?g(vol)*0.7:0;
  /* il looper anticipa quello che registra del ritardo misurato: il click iniettato va ritardato della stessa quantità */
  const lp=QC.looper;try{recD.delayTime.value=Math.max(0,Math.min(1.9,lp&&lp.lat?lp.lat():0))}catch(e){}
  const n=lp&&lp.node;if(n&&wired!==n){try{recD.disconnect()}catch(e){}recD.connect(n);wired=n}}
function click(t,acc){const o=ac.createOscillator(),e=ac.createGain();o.frequency.value=acc?1760:1100;
  e.gain.setValueAtTime(0.0001,t);e.gain.exponentialRampToValueAtTime(acc?0.7:0.4,t+0.002);e.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
  o.connect(e);e.connect(monG);e.connect(recG);o.start(t);o.stop(t+0.06)}
function sched(){while(next<ac.currentTime+0.12){click(next,k%beats===0);q.push({t:next,b:k%beats});k++;next+=60/bpm}}
function draw(){if(!on)return;let c=null;while(q.length&&q[0].t<=ac.currentTime)c=q.shift();
  if(c){const ds=$('lmDots').children;[...ds].forEach((d,i)=>d.classList.toggle('lit',i===c.b));setTimeout(()=>ds[c.b]&&ds[c.b].classList.remove('lit'),90)}requestAnimationFrame(draw)}
async function start(){nodes();if(QC.looper&&QC.looper.ensure){try{await QC.looper.ensure();nodes()}catch(e){}}
  if(ac.state!=='running')ac.resume().catch(()=>{});if(QC.stopMetro)QC.stopMetro();
  on=true;k=0;q=[];next=ac.currentTime+0.08;clearInterval(timer);timer=setInterval(sched,25);sched();requestAnimationFrame(draw);ui()}
function stop(){on=false;clearInterval(timer);timer=null;q=[];ui()}
function dots(){$('lmDots').innerHTML=Array.from({length:beats},(_,i)=>`<span class="${i===0?'first':''}"></span>`).join('')}
function ui(){$('lmOn').textContent=on?'■ Ferma il metronomo':'♩ Avvia il metronomo';$('lmOn').classList.toggle('on',on);$('lmOn').setAttribute('aria-pressed',on);
  $('lmBpm').textContent=bpm;$('lmVolV').textContent=vol;$('lmVol').value=vol;
  $('lmRec').textContent=rec?'Registra il click nel loop: sì':'Registra il click nel loop: no';$('lmRec').classList.toggle('rec',rec);$('lmRec').setAttribute('aria-pressed',rec);
  $('lmBeats').value=String(beats)}
const setBpm=v=>{bpm=Math.max(30,Math.min(250,Math.round(v)));ls.set('bpm',bpm);ui()};
$('lmOn').onclick=()=>on?stop():start();
$('lmMinus').onclick=()=>setBpm(bpm-1);$('lmPlus').onclick=()=>setBpm(bpm+1);
let taps=[];$('lmTap').onclick=()=>{const n=performance.now();taps=taps.filter(t=>n-t<2500);taps.push(n);if(taps.length>1)setBpm(60000/((taps[taps.length-1]-taps[0])/(taps.length-1)))};
$('lmVol').addEventListener('input',e=>{vol=+e.target.value;ls.set('vol',vol);if(monG)nodes();ui()});
$('lmRec').onclick=()=>{rec=!rec;ls.set('rec',rec);if(monG)nodes();ui()};
$('lmBeats').onchange=e=>{beats=+e.target.value;ls.set('beats',beats);k=0;dots();ui()};
document.addEventListener('qc-input',()=>{if(monG)setTimeout(nodes,300)});
setInterval(()=>{if(on&&monG)nodes()},2000); /* segue ricalibrazioni e riavvii del motore */
dots();ui();
window.QC=window.QC||{};QC.looperMetro={get on(){return on},start,stop};
})();
