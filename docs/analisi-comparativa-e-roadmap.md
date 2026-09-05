# AquaPilot — Analisi comparativa vs. teoria moderna dei depuratori & Roadmap migliorativa

> Documento di riferimento per l'evoluzione del modello di processo di AquaPilot.
> Confronta la logica di simulazione/controllo attuale con i "sacri testi" della
> teoria del trattamento delle acque reflue (ASM/IWA, BSM1/BSM2, Metcalf & Eddy,
> Ekama/Wentzel, ASCE, Olsson) e definisce un piano di miglioramento a fasi.
>
> Stato: **Fase 1 in implementazione** (denitrificazione T-dipendente + effetto
> temperatura). Fasi 2 e 3 da proporre quando opportuno.

---

## Analisi comparativa (sintesi)

| # | Area | Cosa fa AquaPilot | Teoria di riferimento | Gap |
|---|------|-------------------|------------------------|-----|
| 1 | **Cinetica biologica** | Rimozione = funzione lineare di O₂ con efficienze base fisse, indipendente da temperatura e substrato | Monod: `μ = μmax·S/(Ks+S)·O2/(KO+O2)·θ^(T-20)` (ASM1/ASM2d, Henze et al.) | No saturazione di substrato, **no effetto temperatura** |
| 2 | **Controllo aerazione** | Singolo loop P+I sull'uscita finale → soffianti | Controllo **a cascata** (NH₄→DO→aria→inverter) + feedforward ingresso (BSM1, Åmand & Olsson 2013) | Solo retroazione su uscita finale; nessuna cascata né feedforward |
| 3 | **Rimozione nutrienti** | NH₄→NO₃ (nitrificazione); NO₃ prodotto ma storicamente non rimosso/esposto | Bardenpho, A²/O, UCT; D.Lgs. 152/2006 e Dir. 91/271/CEE su N_tot/P_tot (Metcalf & Eddy) | **Denitrificazione non attiva di default**, N_tot non tracciato |
| 4 | **Trasferimento O₂** | `O2t = blower% × 8 mg/L` (lineare) | SOTR·α·β·θ^(T-20)·(Cs−C)/Cs (ASCE 2-06) | Niente α/β/θ/fouling → capacità aerobica sovrastimata |
| 5 | **Età del fango** | RAS insegue MLSS (P); spurgo WAS non modellato | **SRT** parametro di progetto; SRT≥8-10 gg a 15°C per nitrificazione (Ekama/Wentzel) | Nessun controllo SRT né attuatore WAS |
| 6 | **Sedimentazione** | TSS = rimozione fissa + coagulante | State Point Analysis / flusso solidi di Kynch; SVI; blanket level (Ekama, Secondary Settling Tanks) | Coagulante come unico controllo; no SVI/blanket |
| 7 | **Diagnostica** | Euristica: attuatore saturo + parametro fuori per N tick → causa probabile | FDI con osservatori (Kalman), PCA multivariata, prognosi fouling (Olsson, ICA) | Approccio euristico, non FDI formale |

---

## Roadmap a fasi

Le proposte non sono alternative: sono strati complementari, implementabili in
modo incrementale senza stravolgere l'architettura del motore
(`simTick` → `STAGE_PROCESSORS` → `applyAutoCorrect`).

### Fase 1 — Realismo normativo *(completata)*
- **A — Denitrificazione anossica**: lo stadio `Denitrificazione` (post-denit, dopo
  il Biologico) è ora **incluso nell'impianto di default** (6 stadi). Modello MLE:
  rimozione NO₃ governata da operazione (ricircolo nitrati/carbonio donatore) e
  temperatura; il carbonio è in parte influente (cap `COD_MAX_FRAC`) e in parte
  dosato. NO₃ e N-tot esposti in uscita e nel pannello QUALITÀ USCITA. A 20 °C
  l'N-tot rientra in zona verde (~9-10 mg/L, limite 15 — D.Lgs. 152/2006).
  *Verifica:* default N-tot≈9.5 ✓ ; ondata di freddo ~9 °C → N-tot≈27 (nitrif.
  crollata). NO₃/N-tot sono informativi nel pannello (NON collegati ai popup).
- **B — Effetto temperatura (Arrhenius)**: correzione `θ^(T−20)` sulle cinetiche
  di Biologico, Nitrificazione e Denitrificazione. La nitrificazione è molto
  sensibile (θ≈1.10): a ~9 °C crolla, generando allarmi NH₄ realistici in inverno.
  Aggiunto evento "❄️ Ondata di freddo" (`cold_weather`, `inlet.T_delta`).
- **Provenienza del dato**: classificatore centralizzato `src/constants/dataSource.js`
  con tre nature — 📡 sensore (misura diretta), 🔬 analizzatore (strumento analitico
  online/laboratorio, es. COD), 🧮 stimato (correlazione/derivato/%); ⚙️ comando per
  gli attuatori. Applicato a: QUALITÀ USCITA (live), Storico, dettaglio stadio
  (params + parametro di riferimento + controlli), tessere dashboard, pannello IMPIANTO.
  Il tipo è **configurabile** dall'utente (Configurazione → PROVENIENZA DATI) sia
  per i parametri di QUALITÀ USCITA sia per i **segnali di stadio** (Redox/ORP,
  portata, livello/ΔH, pressione differenziale, interfaccia fanghi); persistito in
  `aquapilot.qualitySources.v1`. Un resolver (`resolveSource` + `SENSOR_ID_TO_SOURCE_KEY`)
  applica la scelta anche ai dettagli di stadio e alle tessere dashboard.
- **AI Advisor**: reso consapevole di NO₃/N-tot. L'azoto totale non è correggibile
  con le leve automatiche (aerazione/dosaggi) — richiede la denitrificazione — quindi
  l'advisor lo segnala onestamente come "oltre soglia" invece di dichiarare
  "tutti i parametri nei target".

### Fase 2 — Controllo avanzato *(da proporre)*
- **C — Controllo a cascata aerazione**: loop lento NH₄→setpoint DO + loop
  veloce DO_error→soffianti; predisposizione per feedforward NH₄ ingresso.
  Atteso −15÷25% sui consumi a pari qualità.
- **F — Modello α trasferimento O₂**: `O2t = blower% · O2_SAT · α(carico)` con α
  che peggiora col carico organico.

### Fase 3 — Gestione fanghi *(da proporre)*
- **D — SRT e spurgo WAS**: attuatore di spurgo con controllo dell'età del fango;
  la diagnostica "MLSS elevato non correggibile" diventa un vero allarme di SRT.
- **E — SVI / rigonfiamento filamentoso**: SVI (sano 80-150 mL/g; bulking >200)
  che degrada la capacità del sedimentatore → nuova causa diagnostica.

> **Promemoria operativo (Claude):** quando opportuno, proporre proattivamente al
> committente l'avvio della Fase 2 e poi della Fase 3.

---

## Promemoria per la versione reale (collegamento PLC)

> **DA RICORDARE AL COMMITTENTE quando si svilupperà la versione reale connessa a un PLC.**

Nella configurazione della **provenienza dato** (Configurazione → PROVENIENZA DATI),
oggi ogni parametro di qualità è classificato come *sensore*, *analizzatore* o
*stimato*. Nella versione reale collegata al PLC, per i segnali dichiarati come
**sensore** o **analizzatore** dovrà essere aggiunto un **campo di configurazione**
che indichi se l'informazione di quell'oggetto **proviene dal PLC** (e con quale
riferimento: tag/indirizzo del segnale, es. nodo OPC-UA / registro Modbus / DB-DBX
Siemens). In pratica, per ogni oggetto "sensore"/"analizzatore":
- flag "origine dato": PLC ↔ inserimento manuale/simulato;
- riferimento del segnale sul PLC (tag/indirizzo) quando l'origine è PLC;
- eventuale scala/ingegnerizzazione e stato di qualità del segnale (valido/guasto).

Questo dettaglio si integra con il documento `docs/architettura-server-plc.md`.

---

## Riferimenti bibliografici
- Henze, Gujer, Mino, van Loosdrecht — *Activated Sludge Models ASM1, ASM2, ASM2d, ASM3* (IWA)
- Copp (ed.) — *The COST Simulation Benchmark BSM1 / BSM2*
- Åmand, Olsson — *Aeration control — a review* (Water Science & Technology, 2013)
- Metcalf & Eddy — *Wastewater Engineering: Treatment and Resource Recovery*, 6ª ed.
- Ekama, Wentzel et al. — *Activated Sludge Theory and Application*; *Secondary Settling Tanks* (IWA)
- ASCE Standard 2-06 — *Measurement of Oxygen Transfer in Clean Water*
- Olsson et al. — *Instrumentation, Control and Automation in Wastewater Systems* (IWA)
- D.Lgs. 152/2006 (Parte III, Tab. 3 Allegato 5) — limiti allo scarico
</content>
</invoke>
