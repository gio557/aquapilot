# AquaPilot — Architettura Server ↔ PLC (decisione di progetto)

> Documento di riferimento per il passaggio dallo sviluppo simulato (frontend-only)
> all'implementazione reale con PLC fisico o PLC simulato.
> Concordata il 2026-06-01.

## Principio guida

**Il PLC non deve mai dipendere dal server per la sicurezza del processo.**
Il server (AquaPilot) è il livello *supervisory*; il PLC è il livello di *controllo*.

```
┌─────────────────────────────────────────┐
│  SERVER  (AQUAPILOT)                     │
│  - ottimizzazione AI, trend, storico     │
│  - HMI web, allarmi, report              │
│  - auto-correzione, calcolo setpoint     │
└───────────────┬──────────────────────────┘
                │  OPC-UA / Modbus TCP
                │  (heartbeat ogni 5–10 s)
┌───────────────▼──────────────────────────┐
│  PLC / Edge controller                   │
│  - logica di sicurezza LOCALE            │
│  - esegue i setpoint ricevuti dal server │
│  - opera in autonomia se server offline  │
└───────┬────────────────────┬──────────────┘
        │                    │
   Sensori               Attuatori
   (O2, TSS, pH…)        (soffianti, pompe…)
```

## Separazione delle responsabilità

| Livello | Responsabilità |
|---|---|
| **Server (AquaPilot)** | Ottimizzazione, AI, trend/storico, HMI avanzata, calcolo setpoint, report, allarmi supervisory |
| **PLC** | Sicurezza del processo, esecuzione setpoint, fail-safe, autonomia in caso di disconnessione |

## Comportamento in caso di perdita connessione

### Sul PLC (autonomo)
- Continua la logica locale con gli ultimi setpoint ricevuti.
- Mantiene gli attuatori in stato sicuro (es. soffianti all'ultimo % comandato, **non** li spegne).
- Attiva un allarme locale (lampada/sirena/HMI locale se presente).
- Se la disconnessione supera una soglia (es. 60 s) → passa a setpoint conservativi predefiniti (**fail-safe mode**), hard-coded nel PLC.
- Salva in memoria non volatile l'ultimo setpoint valido ricevuto.

### Sul server (AquaPilot)
- Watchdog rileva la mancanza di heartbeat entro 10–15 s.
- Tutti i valori dei sensori marcati come **stale**, con timestamp dell'ultimo dato valido.
- L'auto-correzione si **disabilita automaticamente** (smette di inviare comandi).
- Allarme critico agli operatori: "Connessione PLC persa – modalità degradata".
- HMI mostra gli ultimi valori noti con indicazione visiva (sfondo grigio, icona warning).

## Raccomandazioni implementative

| Aspetto | Scelta |
|---|---|
| **Protocollo** | OPC-UA (standard IEC, sicurezza integrata, dati strutturati). Modbus TCP solo se il PLC è datato. |
| **Heartbeat** | Bidirezionale ogni 5–10 s; timeout a 30 s. |
| **HMI locale** | Pannello touch direttamente sul PLC per operare in emergenza senza server. |
| **Ridondanza rete** | Due percorsi fisici (ethernet primario + 4G/LTE backup). |
| **Logica fail-safe** | Nel PLC: nessun setpoint da >60 s → setpoint conservativi hard-coded. |
| **Persistenza setpoint** | PLC salva in memoria non volatile l'ultimo setpoint valido. |

## Note per la migrazione dal simulatore attuale

- Il motore di simulazione attuale (`src/simulation/engine.js`) modella già la fisica del processo: in un contesto reale diventa o (a) un **PLC simulato** che espone gli stessi tag via OPC-UA/Modbus, oppure (b) viene sostituito da letture reali dei sensori.
- I "setpoint" calcolati oggi da `autoCorrect.js` corrispondono ai comandi che il server invierebbe al PLC.
- La "modalità degradata" descritta sopra va aggiunta come stato esplicito dell'HMI quando si introdurrà la comunicazione reale (oggi non esiste perché la simulazione è in-process).
