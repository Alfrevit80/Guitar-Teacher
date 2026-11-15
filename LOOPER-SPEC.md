# Looper — specifica

Pagina **Looper** di Quadranti Chitarra. Riprende le funzioni e il flusso di lavoro di una loop station
a 5 tracce da tavolo (modello di riferimento: Manuale dell'Utente RC-505mkII, versione italiana),
con nome e grafica originali: nessun logo, marchio o nome commerciale nell'interfaccia.

**Scelta di progetto: il looper ha 4 tracce, non 5.** Tutto quello che il manuale riferisce alle
tracce 1–5 qui vale per le tracce 1–4.

**Fonte**: il Manuale dell'Utente (26 pagine) descrive il flusso e i parametri, ma per i valori
rimanda alla *Parameter Guide*, che non è nel PDF. Dove mi baso sulla Parameter Guide o sul
comportamento noto dell'apparecchio lo scrivo con **[PG]**: sono da verificare. Se mi carichi
anche la Parameter Guide, correggo questi punti.

Legenda: ✅ replicata fedelmente · ≈ approssimata (il motivo è scritto accanto) · ✗ esclusa · Fn = fase.

---

## 1. Organizzazione (manuale p. 3)

| Manuale | Looper | |
|---|---|---|
| 5 tracce stereo | **4 tracce stereo** per scelta (F1: solo la traccia 1 nell'interfaccia, il motore ne ha già 4) | ≈ |
| Memoria = impostazioni di tracce 1–4 + Input FX/Track FX + ritmo + nome | Uguale, frasi audio comprese | ✅ F6 |
| 99 memorie | Numero libero, limitato dallo spazio di IndexedDB del browser | ≈ |
| Impostazioni di sistema (comuni) | Pannello «Impostazioni» del looper, salvato in `localStorage` | ✅ |
| Input FX e Track FX: 4 banchi × 4 effetti (16 per lato) | Uguale | ✅ F5 |
| Rhythm | Ritmi generati in tempo reale (sintesi Web Audio) | ≈ F6 |

«Registrazione» è la prima incisione su una traccia vuota; «sovraincisione» (overdub) è ogni
registrazione successiva. Uso la stessa distinzione.

## 2. Pannello e flusso dei tasti (p. 4–5, 9–10)

### Per traccia
- **Tasto REC/PLAY** (✅ F1). Su una traccia vuota: REC → PLAY → DUB → PLAY → DUB… (p. 4 e p. 9).
  Su una traccia con una frase: PLAY → DUB → PLAY…
  Opzione **REC ACTION** [PG]: «REC→PLAY» (predefinita, come nel manuale) oppure «REC→DUB».
- **STOP** (✅ F1): ferma registrazione, riproduzione e sovraincisione. **Tenuto premuto 2 s
  cancella la traccia (CLEAR).** In F4 c'è anche una funzione CLEAR separata da assegnare a un pedale;
  nell'interfaccia non c'è un tasto CLEAR, per non cancellare una ripresa con un tocco sbagliato.
- **Colori** (✅ F1): rosso = registrazione, verde = riproduzione, giallo = sovraincisione,
  spento = vuota o ferma. Una traccia ferma che contiene una frase ha l'anello acceso tenue.
  I colori si possono cambiare (LOOP STATUS COLOR, p. 18; F6).
- **Indicatore loop** (✅ F1): anello attorno al tasto con stato, posizione nel loop e livello.
- **Cursore di volume** (✅ F1): PLAY LEVEL [PG] 0–200, dove 100 = livello originale.
- **Tasto FX** (✅ F5): applica o toglie il Track FX alla traccia.
- **Tasto TRACK** (✅ F2): apre le impostazioni della traccia e la rende «traccia corrente».

### Globali
- **ALL START/STOP** (✅ F1 su 1 traccia, F2 su 4): avvia insieme tutte le tracce scelte
  (ALL START TRK, impostabile per memoria) e le ferma tutte.
- **UNDO/REDO** (✅ F1). Il tasto attiva la modalità undo; in questa modalità i tasti di traccia cambiano funzione (p. 5):
  | Tasto | Funzione |
  |---|---|
  | REC/PLAY | UNDO/REDO dell'ultima registrazione o sovraincisione |
  | TRACK | MARK SET: segna lo stato attuale |
  | STOP | MARK BACK: torna allo stato segnato; senza segno, torna alla prima registrazione |
  | FX | MARK CLEAR |

  Colore del tasto REC/PLAY in modalità undo: verde = undo disponibile, rosso = redo disponibile,
  spento = niente da annullare. L'undo è a **un livello** (undo ↔ redo), come sull'apparecchio.
- **TAP TEMPO** (✅ F2): tocchi ripetuti; tenuto premuto riporta il tempo al valore predefinito.
  BPM da 40.0 a 300.0 con un decimale (p. 11).
- **RHYTHM START/STOP** (✅ F6): ogni pressione passa da acceso a spento a pronto (lampeggiante).

## 3. Parametri della traccia (p. 14)

| Parametro | Valori | Fase | |
|---|---|---|---|
| REVERSE | OFF/ON | F2 | ✅ |
| 1SHOT | OFF/ON: suona una volta sola | F2 | ✅ |
| PAN | L50 – CENTRO – R50 [PG] | F1 | ✅ |
| PLAY LEVEL | 0–200 | F1 | ✅ |
| START MODE | IMMEDIATE / FADE IN [PG] | F2 | ✅ |
| STOP MODE | IMMEDIATE / FADE OUT / LOOP END [PG] | F2 | ✅ |
| DUB MODE | OVERDUB (si somma) / REPLACE1 (sostituisce, il vecchio non si sente) / REPLACE2 (sostituisce, il vecchio si sente) [PG] | F1 | ✅ |
| FX | OFF/ON | F5 | ✅ |
| PLAY MODE | MULTI / SINGLE [PG] | F2 | ✅ |
| MEASURE | AUTO / FREE / 1… misure [PG] (solo con LOOP SYNC ON) | F2 | ✅ |
| LOOP SYNC SW | OFF/ON | F2 | ✅ |
| LOOP SYNC MODE | IMMEDIATE / MEASURE / LOOP LENGTH [PG] | F2 | ✅ |
| TEMPO SYNC SW | OFF/ON | F2 | ✅ |
| TEMPO SYNC MODE | PITCH (l'intonazione segue il tempo) / XFADE (intonazione fissa) [PG] | F2 | ≈ vedi §8 |
| SPEED | HALF / NORMAL / DOUBLE [PG] | F2 | ✅ |
| BOUNCE IN | OFF/ON: registra anche le altre tracce | F2 | ✅ |
| INPUT | ingresso e RHYTHM ON/OFF per traccia | F2 | ≈ ingresso unico (la chitarra) + ritmo |

## 4. Impostazioni REC/PLAY della memoria (p. 13) [PG]

| Voce | Valori | Fase |
|---|---|---|
| REC ACTION | REC→DUB / REC→PLAY | F1 |
| QUANTIZE | REC END: OFF (libero) / MEASURE / BEAT | F2 |
| AUTO REC | OFF/ON + sensibilità: la registrazione parte quando suoni | F2 |
| COUNT-IN | battute di attacco prima della registrazione. Sull'apparecchio è INTRO REC del ritmo; qui vale anche col solo metronomo | F2 ≈ |
| PLAY MODE | MULTI (più tracce insieme) / SINGLE (ne suona una alla volta) | F2 |
| SINGLE CHANGE | IMMEDIATE / LOOP END | F2 |
| FADE TIME | durata di FADE IN e FADE OUT, in misure | F2 |
| ALL START TRK | tracce che partono con ALL START | F2 |
| LOOP LENGTH | AUTO / misure fisse | F2 |
| Contatore misure | battuta e misura correnti sul display | F2 |
| NAME | massimo 12 caratteri | F6 |

## 5. Ritmo (p. 15)

| Parametro | Valori | Fase | |
|---|---|---|---|
| GENRE / PATTERN | Generi per chitarra: rock, pop, blues shuffle, funk, ballata, reggae, bossa, jazz swing, metal, country, latin, elettronica, guida | F6 | ≈ pochi pattern fatti a mano per genere, non la libreria originale |
| VARIATION | A/B | F6 | ✅ |
| KIT | 3–4 kit sintetizzati | F6 | ≈ |
| BEAT | 2/4, 3/4, 4/4, 5/4, 6/8, 7/8… | F2 tempo, F6 ritmo | ✅ |
| START TRIG | LOOP START / REC END / BEFORE LOOP | F6 | ✅ |
| STOP TRIG | OFF / LOOP STOP / REC END | F6 | ✅ |
| INTRO REC / INTRO PLAY | ON/OFF | F6 | ✅ |
| ENDING | ON/OFF | F6 | ✅ |
| FILL | ON/OFF | F6 | ✅ |
| VARI. CHANGE | MEASURE / LOOP END | F6 | ✅ |

## 6. Effetti (p. 11, 16) — F5

Input FX sul suono in ingresso (finisce nella registrazione), Track FX sulla riproduzione di una traccia.
Ogni lato ha 4 banchi (A–D) × 4 tasti; la manopola FX comanda il parametro principale in tempo reale.
Scelti per la chitarra, con sincronia al tempo dove ha senso:

| Effetto | Lato | Sync |
|---|---|---|
| Delay (anche ping-pong / panning) | In, Track | ✅ |
| Riverbero | In, Track | — |
| Chorus | In, Track | ✅ velocità opzionale |
| Phaser | In, Track | ✅ |
| Flanger | In, Track | ✅ |
| Filtro (passa-basso/alto/banda, risonanza, LFO) | In, Track | ✅ |
| Octave / pitch shifter | In, Track | — ≈ granulare, con un po' di artefatti |
| Tremolo | In, Track | ✅ |
| Slicer (pattern) | In, Track | ✅ |
| Distorsione / overdrive | In | — |
| EQ a 4 bande | In, Track | — |
| Beat repeat / roll | Track | ✅ |

Esclusi, perché pensati per la voce o con poco senso per la chitarra: vocoder, harmonist,
robot, osc-voc/bot, lo-fi radio e simili ✗. Si possono aggiungere più avanti.

## 7. Memoria e sistema (p. 12, 17–18)

| Manuale | Looper | |
|---|---|---|
| WRITE / CLEAR | «Salva» con nome e «Cancella» | ✅ F6 |
| Audio delle memorie | IndexedDB (Float32, per traccia) | ✅ F6 |
| Backup via USB | Esporta WAV del mix e delle singole tracce | ≈ F6 |
| MIXER, livelli I/O | Livello d'ingresso, monitor, volume master | ✅ F1 |
| INPUT EQ / DYNAMICS | — | ✗ (c'è l'EQ come Input FX) |
| MASTER FX (comp/riverbero) | Limitatore sull'uscita | ≈ |
| OUTPUT ROUTING, prese SUB, cuffie separate | Un'unica uscita stereo del dispositivo | ✗ il browser dà una sola uscita |
| Phantom, contrasto, Auto Off, knob lock | — | ✗ hardware |
| CTL/EXP, PANEL PLAY/UNDO, ASSIGN 1–16 | Sistema ASSIGN: MIDI + tastiera / pedaliera BT | ✅ F4 (vedi §9) |
| LOOP STATUS COLOR | Scelta dei colori | ✅ F6 |

## 8. Approssimazioni tecniche

1. **Latenza.** L'apparecchio è hardware a latenza quasi nulla; un browser ha 10–60 ms tra uscita e
   ritorno. Ogni sovraincisione viene scritta indietro di quel ritardo (*round-trip*), misurato
   con una calibrazione guidata in due modi:
   - **Suonando a tempo**: senti 12 click e dai una pennata secca su ognuno.
     Misura proprio quello che serve: il ritardo tra quello che senti e quello che arriva.
   - **Con cavo di ritorno o microfono**: l'app ascolta i propri click. Più precisa, ma serve un
     cavo dall'uscita all'ingresso della scheda, oppure un microfono vicino all'altoparlante.

   Il valore del looper è separato da quello degli esercizi, perché questo si misura dentro
   l'AudioWorklet al campione, mentre quello degli esercizi comprende anche la finestra di analisi.
2. **Tempi dei tasti.** Uso l'istante del tocco (`event.timeStamp`) convertito nel tempo
   dell'audio, e un buffer dell'ingresso degli ultimi 2 s. Così l'inizio e la fine del loop
   cadono dove hai premuto, anche se il messaggio arriva al motore audio qualche ms dopo.
3. **Niente click.** Assolvenza di 6 ms a inizio registrazione. Quando il loop si chiude, i 12 ms
   suonati dopo la fine vengono sfumati sopra l'inizio. Rampe di 6 ms su ogni ingresso e uscita
   dalla sovraincisione, su avvio e arresto e su undo/redo (dissolvenza incrociata tra le due versioni).
4. **Undo.** Memoria a blocchi (circa 0,35 s) con copia su scrittura: undo, redo e mark costano
   solo i blocchi modificati, non la copia di tutta la traccia.
5. **TEMPO SYNC MODE.** Cambiare velocità *mantenendo l'intonazione* in tempo reale (XFADE) è
   costoso e introduce artefatti: lo farò con uno stretch granulare semplice (F2). Con
   variazioni di tempo grandi la qualità sarà inferiore all'originale.
6. **Ingresso.** La chitarra arriva sul canale 1, sul 2 o sulla loro somma (si sceglie).
   echoCancellation, noiseSuppression e autoGainControl sono disattivati. Il guadagno
   automatico del rilevatore di note **non** tocca la registrazione: il looper ha il suo livello fisso.
7. **Ascolto dell'ingresso (monitor).** Spento di default: con la chitarra nella scheda audio
   conviene il monitor diretto della scheda, che non ha ritardo. Acceso, senti la chitarra
   dall'app (serve con gli Input FX, F5).
8. **Durata massima.** Circa 5 minuti per traccia (l'apparecchio arriva a 1,5 ore), per non
   esaurire la memoria su iPhone e iPad.
9. **iPhone e iPad.** L'audio si sblocca al primo tocco, e la sessione audio passa a
   «play-and-record» con l'ingresso attivo. Quando l'app va in background, una registrazione in
   corso viene chiusa e passa in riproduzione, poi tutto si ferma. Al rientro riprende l'audio
   e, se iOS ha chiuso l'ingresso, chiede di riattivarlo con un tocco.

## 9. Controllo esterno — F4

- **ASSIGN**: ogni funzione (REC/PLAY, STOP e CLEAR di ogni traccia, ALL START/STOP, UNDO/REDO,
  TAP, ritmo, effetti, memoria su/giù, volumi…) si collega a Note, CC o Program Change, con
  canale, comportamento *momentaneo* o *toggle*, e valori min/max per i comandi continui.
- **MIDI Learn**: tocchi la funzione, muovi il controller, il collegamento è fatto.
- **Profili** di mapping salvati con nome.
- **Tastiera e pedaliera Bluetooth**: le stesse funzioni si collegano a tasti, con il relativo
  Learn. Su iPhone e iPad Safari non ha Web MIDI, quindi lì si usano solo i tasti, che
  funzionano con le pedaliere voltapagina BT (frecce, PagSu/PagGiù, spazio).
- MIDI Clock in uscita e in ingresso (SYNC CLOCK, p. 18–21): ≈, solo in uscita su Chrome/Edge, se resta tempo.

## 10. Integrazione con l'app

- **Clock unico**: metronomo, esercizi e looper usano lo stesso BPM e la stessa griglia di battute.
  Cambiare il BPM in uno lo cambia negli altri (F2).
- **Manico e scala**: nella pagina Looper c'è il manico con la scala scelta nel circolo delle
  quinte e la nota che stai suonando (F3).
- **Nota suonata**: il rilevatore analizza solo l'ingresso della chitarra, mai l'uscita del loop (F3).
- **Esercizi**: «Registra la base e suonaci sopra», ed esercizi del maestro che usano il looper (F3).
- **Tasto fisso**: la scheda «Looper» nella barra in alto. Il looper continua a suonare quando
  cambi pagina, e gli altri quadranti conservano il loro stato.

## 11. Fasi

| Fase | Contenuto |
|---|---|
| F1 | Motore AudioWorklet, traccia 1: rec/dub/play/stop/clear, undo/redo/mark, volume/pan, nessun click, calibrazione della latenza |
| F2 | 4 tracce, loop sync, quantize, tempo sync, parametri di traccia, auto-rec, count-in, play mode, contatore, clock condiviso col metronomo |
| F3 | Manico, nota suonata ed esercizi |
| F4 | MIDI (ASSIGN, Learn, profili) e tastiera/pedaliera BT |
| F5 | Input FX e Track FX |
| F6 | Ritmi, memorie in IndexedDB, export WAV, uso offline (service worker) |
