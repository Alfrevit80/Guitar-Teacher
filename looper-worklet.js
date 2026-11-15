/* Looper: motore audio (AudioWorklet).
   Tutti i tempi sono in frame del contesto audio ("tempo di uscita": il frame che l'utente sente).
   Un campione d'ingresso che arriva al frame n corrisponde al tempo di uscita n - rt (rt = ritardo di andata e ritorno).
   Le tracce sono salvate a blocchi con copia su scrittura: undo/redo/mark costano solo i blocchi modificati. */
const CHS = 14, CH = 1 << CHS, CHM = CH - 1;          // blocchi da 16384 frame (~0,35 s)
const RING = 1 << 17, RM = RING - 1;                   // ~2,7 s di storia dell'ingresso
const NTR = 4;
const mod = (a, n) => { a %= n; return a < 0 ? a + n : a };

class Track {
  constructor() {
    this.chunks = []; this.len = 0; this.gen = 1; this.recLen = 0;
    this.st = 'empty';                                  // empty | rec | play | dub | stop
    this.anchor = 0;                                    // frame di uscita in cui la posizione vale 0
    this.playing = false; this.pg = 0; this.pt = 0;     // guadagno di riproduzione e obiettivo (rampe)
    this.mg = 1;                                        // muto durante REPLACE1
    this.ops = []; this.defer = [];
    this.undo = null; this.redo = null; this.mark = null; this.base = null; this.xf = null;
    this.vol = 1; this.vs = 1; this.pan = 0; this.dubMode = 'over'; this.peak = 0;
  }
}

class LooperProc extends AudioWorkletProcessor {
  constructor() {
    super();
    const sr = sampleRate; this.sr = sr;
    this.FADE = Math.round(0.006 * sr); this.XF = Math.round(0.012 * sr);
    this.MIN = Math.round(0.1 * sr); this.MAX = Math.round(300 * sr);
    this.rl = new Float32Array(RING); this.rr = new Float32Array(RING);
    this.rt = Math.round(0.03 * sr); this.mon = 0; this.ms = 0; this.recAction = 'play';
    this.tr = Array.from({ length: NTR }, () => new Track());
    this.cal = null; this.inPeak = 0; this.lastPost = 0; this.now = 0;
    this.port.onmessage = e => this.msg(e.data);
  }

  /* ---------- messaggi ---------- */
  msg(m) {
    this.now = currentFrame;
    const tr = this.tr[m.tr | 0];
    switch (m.t) {
      case 'rt': this.rt = Math.max(0, Math.round(m.v)); break;
      case 'mon': this.mon = m.v ? 1 : 0; break;
      case 'recAction': this.recAction = m.v === 'dub' ? 'dub' : 'play'; break;
      case 'vol': tr.vol = Math.max(0, m.v); break;
      case 'pan': tr.pan = Math.max(-1, Math.min(1, m.v)); break;
      case 'dubMode': tr.dubMode = m.v; break;
      case 'press': this.cmd(tr, { a: 'press', at: this.clampAt(m.at) }); break;
      case 'stop': this.cmd(tr, { a: 'stop', at: this.clampAt(m.at) }); break;
      case 'clear': this.clear(tr); break;
      case 'undo': this.cmd(tr, { a: 'undo' }); break;
      case 'markset': this.cmd(tr, { a: 'markset' }); break;
      case 'markback': this.cmd(tr, { a: 'markback' }); break;
      case 'markclear': tr.mark = null; break;
      case 'all': this.all(this.clampAt(m.at)); break;
      case 'bg': this.tr.forEach(t => this.stop(t, this.now)); break;
      case 'cal': this.startCal(m); break;
      case 'calstop': this.cal = null; break;
    }
    this.post(true);
  }
  /* un tocco non può essere nel futuro né più vecchio della storia dell'ingresso */
  clampAt(at) { const n = this.now; if (!(at > 0)) return n; return Math.max(n - RING + 4096, Math.min(n, Math.round(at))) }

  cmd(tr, c) {
    if (c.a === 'press') return this.press(tr, c.at);
    if (c.a === 'stop') return this.stop(tr, c.at);
    if (tr.ops.length && (c.a === 'undo' || c.a === 'markback')) {
      if (tr.st === 'rec' && c.a === 'undo') return this.clear(tr);
      if (tr.st === 'dub') this.endDub(tr, this.now);
      tr.defer.push(c); return;
    }
    if (c.a === 'undo') this.undoRedo(tr);
    else if (c.a === 'markset') { if (tr.len && tr.st !== 'rec') tr.mark = this.snap(tr) }
    else if (c.a === 'markback') this.markBack(tr);
  }

  press(tr, H) {
    switch (tr.st) {
      case 'empty': this.startRec(tr, H); break;
      case 'rec': this.endRec(tr, H, this.recAction); break;
      case 'play': this.startDub(tr, H, false); break;
      case 'dub': this.endDub(tr, H); break;
      case 'stop': this.startPlay(tr, this.now); break;
    }
  }
  stop(tr, H) {
    if (tr.st === 'rec') this.endRec(tr, H, 'stop');
    else if (tr.st === 'dub') { this.endDub(tr, H); tr.pt = 0; tr.st = 'stop' }
    else if (tr.st === 'play') { tr.pt = 0; tr.st = 'stop' }
  }
  all(H) {
    const busy = this.tr.some(t => t.st === 'rec' || t.st === 'dub' || t.st === 'play');
    if (busy) this.tr.forEach(t => this.stop(t, H));
    else { const a = this.now; this.tr.forEach(t => { if (t.st === 'stop' && t.len) this.startPlay(t, a) }) }
  }

  startRec(tr, H) {
    tr.undo = { chunks: [], len: 0 }; tr.redo = null; tr.mark = null; tr.base = null;
    tr.chunks = []; tr.len = 0; tr.recLen = 0; tr.gen++; tr.playing = false; tr.xf = null;
    tr.ops.push({ k: 'rec', from: H, to: null, next: H + this.rt, tail: false });
    tr.st = 'rec';
  }
  endRec(tr, H, then) {
    const op = tr.ops.find(o => o.k === 'rec' && o.to == null); if (!op) return;
    if (H - op.from < this.MIN) H = op.from + this.MIN;
    op.to = H; tr.len = H - op.from; tr.anchor = op.from;
    op.next = Math.min(op.next, H + this.rt);          // rielabora dalla storia quello che è arrivato dopo il tocco
    if (then === 'dub') {
      op.tail = false; tr.st = 'dub'; this.playOn(tr);
      tr.ops.push({ k: 'dub', from: H, to: null, next: H + this.rt, nofade: true, anchor: tr.anchor, mode: tr.dubMode });
    } else {
      op.tail = true;
      if (then === 'play') { tr.st = 'play'; this.playOn(tr) } else tr.st = 'stop';
    }
  }
  startDub(tr, H) {
    tr.ops.push({ k: 'dub', from: H, to: null, next: H + this.rt, nofade: false, anchor: tr.anchor, mode: tr.dubMode });
    tr.st = 'dub';
  }
  endDub(tr, H) {
    for (let i = tr.ops.length - 1; i >= 0; i--) { const o = tr.ops[i]; if (o.k === 'dub' && o.to == null) { o.to = Math.max(H, o.from); break } }
    tr.st = 'play';
  }
  startPlay(tr, a) { tr.anchor = a; tr.playing = true; tr.pg = 0; tr.pt = 1; tr.st = 'play' }
  playOn(tr) { if (!tr.playing) { tr.playing = true; tr.pg = 0 } tr.pt = 1 }
  clear(tr) {
    if (tr.playing && tr.len) tr.xf = { chunks: tr.chunks, len: tr.len, n: this.XF };
    tr.ops = []; tr.defer = []; tr.chunks = []; tr.len = 0; tr.recLen = 0; tr.gen++;
    tr.undo = tr.redo = tr.mark = tr.base = null; tr.st = 'empty'; tr.pt = 0;
  }

  /* ---------- undo / redo / mark ---------- */
  snap(tr) { const s = { chunks: tr.chunks.slice(), len: tr.len }; tr.gen++; return s }
  setSnap(tr, s) {
    if (tr.playing && tr.len) tr.xf = { chunks: tr.chunks, len: tr.len, n: this.XF };
    tr.chunks = s.chunks.slice(); tr.len = s.len; tr.gen++;
  }
  fixState(tr) {
    if (!tr.len) { tr.st = 'empty'; tr.pt = 0 }
    else if (tr.st === 'empty') { tr.st = 'stop'; tr.pt = 0 }
  }
  undoRedo(tr) {
    if (tr.undo) { const c = this.snap(tr); this.setSnap(tr, tr.undo); tr.redo = c; tr.undo = null }
    else if (tr.redo) { const c = this.snap(tr); this.setSnap(tr, tr.redo); tr.undo = c; tr.redo = null }
    else return;
    this.fixState(tr);
  }
  markBack(tr) {
    const tg = tr.mark || tr.base; if (!tg) return;
    const c = this.snap(tr); this.setSnap(tr, tg); tr.undo = c; tr.redo = null; this.fixState(tr);
  }

  /* ---------- scrittura ---------- */
  wchunk(tr, ci) {
    let c = tr.chunks[ci];
    if (!c) { c = { L: new Float32Array(CH), R: new Float32Array(CH), g: tr.gen }; tr.chunks[ci] = c }
    else if (c.g !== tr.gen) { c = { L: c.L.slice(), R: c.R.slice(), g: tr.gen }; tr.chunks[ci] = c }
    return c;
  }
  runOps(tr, nEnd) {
    while (tr.ops.length) {
      const op = tr.ops[0];
      const done = op.k === 'rec' ? this.runRec(tr, op, nEnd) : this.runDub(tr, op, nEnd);
      if (!done) break;
      tr.ops.shift(); if (op.k === 'rec') this.finRec(tr, op);
    }
    if (!tr.ops.length && tr.defer.length) { const d = tr.defer; tr.defer = []; d.forEach(c => this.cmd(tr, c)) }
  }
  runRec(tr, op, nEnd) {
    const rt = this.rt, XF = this.XF;
    let n = Math.max(op.next, nEnd - RING + 256);
    for (; n < nEnd; n++) {
      const t = n - rt;
      if (op.to != null && t >= op.to + (op.tail ? XF : 0)) { op.next = n; return true }
      const p = t - op.from; if (p < 0) continue;
      const ri = n & RM, l = this.rl[ri], r = this.rr[ri];
      if (op.to == null || t < op.to) {
        if (p >= this.MAX) { this.endRec(tr, t, 'play'); n--; continue }
        const c = this.wchunk(tr, p >> CHS), k = p & CHM, g = p < XF ? p / XF : 1;
        c.L[k] = l * g; c.R[k] = r * g; if (p >= tr.recLen) tr.recLen = p + 1;
      } else {                                          // coda: sfuma sopra l'inizio del loop
        const q = t - op.to; if (q < tr.len) { const c = this.wchunk(tr, q >> CHS), k = q & CHM, g = 1 - q / XF; c.L[k] += l * g; c.R[k] += r * g }
      }
    }
    op.next = n;
    return op.to != null && n - rt >= op.to + (op.tail ? XF : 0);
  }
  finRec(tr) {
    const nc = Math.ceil(tr.len / CH); tr.chunks.length = nc;
    const k0 = tr.len - (nc - 1) * CH;
    if (nc && k0 < CH) { const c = this.wchunk(tr, nc - 1); c.L.fill(0, k0); c.R.fill(0, k0) }
    tr.base = this.snap(tr);
  }
  runDub(tr, op, nEnd) {
    const len = tr.len; if (!len) return true;
    if (!op.begun) { tr.undo = this.snap(tr); tr.redo = null; op.begun = true }
    const rt = this.rt, F = this.FADE, rep = op.mode === 'rep1' || op.mode === 'rep2';
    let n = Math.max(op.next, nEnd - RING + 256);
    for (; n < nEnd; n++) {
      const t = n - rt;
      if (op.to != null && t >= op.to + F) { op.next = n; return true }
      if (t < op.from) continue;
      let g = op.nofade ? 1 : Math.min(1, (t - op.from) / F);
      if (op.to != null && t >= op.to) g *= 1 - (t - op.to) / F;
      const p = mod(t - op.anchor, len), c = this.wchunk(tr, p >> CHS), k = p & CHM, ri = n & RM;
      if (rep) { c.L[k] = c.L[k] * (1 - g) + this.rl[ri] * g; c.R[k] = c.R[k] * (1 - g) + this.rr[ri] * g }
      else { c.L[k] += this.rl[ri] * g; c.R[k] += this.rr[ri] * g }
    }
    op.next = n;
    return op.to != null && n - rt >= op.to + F;
  }

  /* ---------- calibrazione ---------- */
  startCal(m) {
    const sr = this.sr, s = this.now + Math.round(0.5 * sr), iv = Math.round(m.iv * sr), clicks = [];
    for (let k = 0; k < m.n; k++) clicks.push(s + k * iv);
    this.cal = { clicks, acc: m.acc || 4, end: clicks[clicks.length - 1] + Math.round(0.7 * sr), onsets: [], nf: 0, nfN: 0,
      fe: 0, se: 0, last: -1e9, pre: s - Math.round(0.05 * sr) };
  }
  calIn(n, x) {
    const c = this.cal, sr = this.sr;
    if (n < c.pre) { c.nf += x; c.nfN++; }
    c.fe = Math.max(x, c.fe * 0.9958);                 // inviluppo veloce (~5 ms)
    c.se += (c.fe - c.se) * (1 / (0.08 * sr));         // inviluppo lento (~80 ms)
    const floor = c.nfN ? c.nf / c.nfN : 0, th = Math.max(0.006, floor * 6);
    if (c.fe > th && c.fe > c.se * 2.5 && n - c.last > 0.15 * sr && n >= c.pre) { c.onsets.push(n); c.last = n }
  }
  calOut(f) {
    const c = this.cal, sr = this.sr, CL = Math.round(0.03 * sr); let s = 0;
    for (let i = 0; i < c.clicks.length; i++) {
      const j = f - c.clicks[i]; if (j < 0 || j >= CL) continue;
      const fr = i % c.acc === 0 ? 1760 : 1100;
      s += Math.sin(2 * Math.PI * fr * j / sr) * Math.exp(-j / (0.004 * sr)) * 0.7;
    }
    return s;
  }

  /* ---------- stato verso l'interfaccia ---------- */
  post(force) {
    const f = currentFrame;
    if (!force && f - this.lastPost < this.sr / 30) return;
    this.lastPost = f;
    this.port.postMessage({ t: 'st', f, rt: this.rt, inPeak: this.inPeak, cal: this.cal ? { clicks: this.cal.clicks, n: this.cal.onsets.length } : null,
      tr: this.tr.map(t => ({ st: t.st, len: t.len, recLen: t.recLen, anchor: t.anchor, from: t.st === 'rec' && t.ops[0] ? t.ops[0].from : 0,
        peak: t.peak, undo: !!t.undo, redo: !!t.redo, mark: !!t.mark, base: !!t.base, busy: t.ops.length > 0 })) });
    this.inPeak = 0; this.tr.forEach(t => t.peak = 0);
  }

  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0], oL = out[0], oR = out[1] || out[0], N = oL.length, f0 = currentFrame;
    const iL = inp && inp[0], iR = inp && (inp[1] || inp[0]);
    /* 1. ingresso nella storia */
    let ip = this.inPeak;
    for (let i = 0; i < N; i++) {
      const n = f0 + i, ri = n & RM, l = iL ? iL[i] : 0, r = iR ? iR[i] : 0;
      this.rl[ri] = l; this.rr[ri] = r; const a = Math.abs(l); if (a > ip) ip = a;
      if (this.cal) this.calIn(n, a);
    }
    this.inPeak = ip;
    /* 2. registrazioni e sovraincisioni */
    for (const tr of this.tr) if (tr.ops.length || tr.defer.length) this.runOps(tr, f0 + N);
    /* 3. riproduzione */
    oL.fill(0); if (oR !== oL) oR.fill(0);
    const step = 1 / this.FADE;
    for (const tr of this.tr) {
      if (!tr.playing) { tr.xf = null; continue }
      if (!tr.len && !tr.xf) { tr.playing = false; tr.pg = 0; continue }
      const v0 = tr.vs, v1 = tr.vol; tr.vs = v1;
      const gl = tr.pan > 0 ? 1 - tr.pan : 1, gr = tr.pan < 0 ? 1 + tr.pan : 1;
      const mt = tr.st === 'dub' && tr.dubMode === 'rep1' ? 0 : 1;
      let pk = tr.peak;
      for (let i = 0; i < N; i++) {
        const f = f0 + i;
        if (tr.pg < tr.pt) tr.pg = Math.min(tr.pt, tr.pg + step); else if (tr.pg > tr.pt) tr.pg = Math.max(tr.pt, tr.pg - step);
        if (tr.mg < mt) tr.mg = Math.min(1, tr.mg + step); else if (tr.mg > mt) tr.mg = Math.max(0, tr.mg - step);
        let l = 0, r = 0;
        if (tr.len) { const p = mod(f - tr.anchor, tr.len), c = tr.chunks[p >> CHS]; if (c) { l = c.L[p & CHM]; r = c.R[p & CHM] } }
        const x = tr.xf;
        if (x) {
          const w = x.n / this.XF; let ol = 0, or = 0;
          if (x.len) { const p = mod(f - tr.anchor, x.len), c = x.chunks[p >> CHS]; if (c) { ol = c.L[p & CHM]; or = c.R[p & CHM] } }
          l = l * (1 - w) + ol * w; r = r * (1 - w) + or * w;
          if (--x.n <= 0) tr.xf = null;
        }
        const g = tr.pg * tr.mg * (v0 + (v1 - v0) * i / N);
        l *= g * gl; r *= g * gr; oL[i] += l; if (oR !== oL) oR[i] += r;
        const a = Math.max(Math.abs(l), Math.abs(r)); if (a > pk) pk = a;
      }
      tr.peak = pk;
      if (tr.pg === 0 && tr.pt === 0 && !tr.xf) tr.playing = false;
    }
    /* 4. ascolto dell'ingresso e click della calibrazione */
    const monT = this.cal ? 0 : this.mon;
    for (let i = 0; i < N; i++) {
      if (this.ms < monT) this.ms = Math.min(1, this.ms + step); else if (this.ms > monT) this.ms = Math.max(0, this.ms - step);
      let l = 0, r = 0;
      if (this.ms > 0) { l = (iL ? iL[i] : 0) * this.ms; r = (iR ? iR[i] : 0) * this.ms }
      if (this.cal) { const c = this.calOut(f0 + i); l += c; r += c }
      oL[i] += l; if (oR !== oL) oR[i] += r;
    }
    if (this.cal && f0 > this.cal.end) { const c = this.cal; this.cal = null; this.port.postMessage({ t: 'cal', clicks: c.clicks, onsets: c.onsets, acc: c.acc }) }
    this.post(false);
    return true;
  }
}
registerProcessor('qc-looper', LooperProc);
