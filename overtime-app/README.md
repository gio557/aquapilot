# Gestione Straordinari — App (PWA)

Applicazione per la gestione delle **richieste di ore straordinarie** da parte
dei dipendenti, con **approvazione/rifiuto** da parte dei manager abilitati.

È una **PWA** (Progressive Web App): un'unica app web installabile sul telefono
**sia Android sia iPhone**, senza passare dagli store. Si apre da browser e si
può aggiungere alla schermata Home come una normale app.

> **Stato attuale: PROTOTIPO funzionante.**
> I dati sono salvati localmente sul dispositivo (`localStorage`) e ci sono
> utenti/richieste di esempio. Il livello dati è già predisposto per essere
> collegato al database centrale **Supabase** (vedi sotto) senza riscrivere
> l'interfaccia.

## Avvio in locale

```bash
cd overtime-app
npm install
npm run dev        # sviluppo, apri l'indirizzo mostrato nel terminale
npm run build      # crea la versione di produzione in dist/
npm run preview    # prova la versione di produzione (con service worker/PWA)
```

Per provarla sul telefono nella stessa rete Wi-Fi:
`npm run dev -- --host` e apri dal telefono l'indirizzo IP mostrato.

## Come si usa il prototipo

1. Nella schermata di accesso scegli un profilo demo.
2. **Dipendente** (es. *Giulia Rossi*): vede le proprie richieste e ne crea di
   nuove (data, ore, motivo).
3. **Manager** (es. *Laura Bianchi*): vede le richieste del proprio team divise
   in *Da approvare* e *Storico*, e può approvarle/rifiutarle con una nota.

I dati restano salvati sul dispositivo. Per ripartire da zero, dalla console del
browser: `localStorage.clear()` e ricarica.

## Struttura del progetto

```
overtime-app/
├─ index.html                 # pagina + manifest PWA
├─ public/
│  ├─ manifest.webmanifest    # configurazione installazione su telefono
│  ├─ sw.js                   # service worker (avvio offline)
│  └─ icon.svg                # icona app
└─ src/
   ├─ App.jsx                 # stato sessione + instradamento per ruolo
   ├─ data/
   │  ├─ api.js               # ⭐ UNICO punto di accesso ai dati (ora demo)
   │  ├─ seed.js              # dati di esempio
   │  └─ supabaseClient.js    # connessione al DB reale (pronta, non ancora usata)
   ├─ components/             # schermate e componenti UI
   └─ utils.js                # formattazioni in italiano
```

Tutta l'interfaccia legge/scrive **solo** tramite `src/data/api.js`. Per passare
al database reale basta reimplementare quelle funzioni con Supabase: i
componenti non cambiano.

## Collegare il database centrale (Supabase)

Quando vorrai passare dai dati demo al database vero:

1. Crea un progetto gratuito su <https://supabase.com>.
2. Esegui lo **schema SQL** qui sotto (SQL Editor di Supabase).
3. Copia `.env.example` in `.env` e inserisci `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (le trovi in *Project Settings → API*).
4. Riscriviamo `src/data/api.js` usando il client di `supabaseClient.js`
   (login con email/password tramite **Supabase Auth**).

### Schema SQL proposto

```sql
-- Profili utente (collegati all'autenticazione di Supabase)
create table profiles (
  id          uuid primary key references auth.users (id),
  full_name   text not null,
  role        text not null check (role in ('employee','manager')),
  department  text,
  manager_id  uuid references profiles (id),
  created_at  timestamptz default now()
);

-- Richieste di straordinario
create table overtime_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references profiles (id),
  manager_id    uuid references profiles (id),
  work_date     date not null,
  hours         numeric(4,1) not null check (hours > 0),
  reason        text not null,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  decision_note text,
  decided_by    uuid references profiles (id),
  created_at    timestamptz default now(),
  decided_at    timestamptz
);

-- Sicurezza a livello di riga: ognuno vede solo ciò che gli compete
alter table overtime_requests enable row level security;

create policy "Il dipendente vede le proprie richieste"
  on overtime_requests for select
  using (employee_id = auth.uid());

create policy "Il manager vede le richieste del team"
  on overtime_requests for select
  using (manager_id = auth.uid());

create policy "Il dipendente crea le proprie richieste"
  on overtime_requests for insert
  with check (employee_id = auth.uid());

create policy "Solo il manager decide sulle proprie richieste"
  on overtime_requests for update
  using (manager_id = auth.uid());
```

Supabase offre anche aggiornamenti in **tempo reale**: il manager può vedere le
nuove richieste comparire senza ricaricare.

## Pubblicazione

- **PWA su web (consigliato per partire):** pubblica la cartella `dist/` su un
  hosting statico (Netlify, Vercel, GitHub Pages…). Gli utenti aprono il link e
  *Aggiungi a Home* dal browser.
- **Negli store (opzionale):** la stessa PWA può essere impacchettata per Google
  Play (Android, tramite TWA/Bubblewrap) e per l'App Store (iOS, tramite un
  contenitore). Richiede i tuoi account sviluppatore.

## Prossimi passi possibili

- Notifiche push al manager quando arriva una richiesta.
- Login reale con email/password e ruoli su Supabase.
- Report mensili e riepilogo ore per dipendente/reparto.
- Limiti/regole aziendali (es. tetto ore settimanali) e turni.
