# Ragionamento architettura SaaS AquaPilot
_Documento scritto da Claude per preservare il contesto tra sessioni._

## Contesto del progetto
AquaPilot è un sistema di supervisione impianti di depurazione acqua (React + Vite SPA).
L'obiettivo è evolvere il prodotto in un SaaS rivendibile da GreenEco a clienti industriali.

## Stato attuale del codice
- Tutto client-side: `simTick` gira nel browser ogni 500 ms
- Stato in memoria + localStorage
- Control Room comunica via BroadcastChannel (solo stesso browser, stessa macchina)
- `useSimulation.js` ha già un commento predittivo: _"In futuro, sostituire con useWebSocket(url)"_
- `applyCommand` e `CONTROL_FIELDS` sono funzioni pure → si spostano sul server senza modifiche

## Decisioni architetturali già prese

### 1. Deployment
- Il server **non** è in cloud: deve stare **on-premise presso ogni cliente** perché deve
  interagire direttamente con il PLC tramite protocolli industriali (Modbus TCP, OPC-UA, ecc.)
- La rete OT (dove sta il PLC) è isolata e non deve mai essere esposta su internet.

### 2. Architettura "edge + cloud" (ibrida)
- **Edge on-premise** (presso ogni cliente): motore di simulazione/acquisizione, driver PLC,
  resilienza offline. Parla col PLC sulla LAN. Apre connessione OUTBOUND verso il cloud.
- **Cloud GreenEco** (hub centrale): autenticazione, registro tenant, relay per accesso remoto.
  NON è il cervello dell'impianto — è il livello di gestione e accesso remoto.
- **Stesso client React** per tutti: operatori in sede (parlano direttamente all'edge sulla LAN),
  operatori fuori sede e GreenEco admin (passano dal cloud relay).

### 3. Multi-tenant
- Ogni cliente ha la propria installazione edge isolata.
- Il cloud GreenEco gestisce tutti i tenant da un punto centrale.
- Ruoli: GreenEco admin (vede tutto) / Admin cliente / Operatore.
- Isolamento DB: opzione pragmatica iniziale = `tenant_id` su tabelle condivise.

### 4. Sicurezza OT
- L'edge apre la connessione verso il cloud (outbound), mai viceversa.
- Zero porte da aprire nel firewall del cliente.
- PLC invisibile da internet.

### 5. Simulazione attuale = asset, non codice da buttare
- `simTick` diventa la **modalità demo/training/offline**:
  utile per dimostrare il prodotto senza impianto reale e per addestrare operatori.
- Con PLC reale, il motore sull'edge legge registri PLC (input) e scrive comandi (output).

## Il bivio aperto (da riprendere)
La domanda su cui si era fermata la conversazione:

> **Cloud GreenEco come hub centrale** (gestisci tutti i clienti da un punto, accesso remoto
> unificato — più lavoro infrastrutturale, vero SaaS) **oppure installazioni on-prem
> totalmente indipendenti** (più semplice da avviare, entri via VPN per manutenzione,
> niente regia centrale)?

L'utente non ha ancora risposto. Ripartire da qui.

## Prossimi passi tecnici (non ancora pianificati)
Quando la direzione sarà chiara, pianificare in plan mode:
1. Stack backend edge (Node.js + driver PLC)
2. Protocollo WebSocket edge ↔ client
3. Layer cloud relay (se opzione hub centrale)
4. Autenticazione e gestione ruoli
5. Migrazione `useSimulation` → `useWebSocket`
