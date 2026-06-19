// ---------------------------------------------------------------------------
// Connessione al database reale (Supabase) - PRONTA PER IL FUTURO.
//
// Nel prototipo NON viene usata: l'app gira con i dati demo di ./api.js.
// Quando avrai creato il progetto su https://supabase.com, crea un file
// `.env` (copiando `.env.example`) con le tue chiavi e poi riscriveremo
// ./api.js per usare questo client. Lo schema SQL delle tabelle è nel README.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null
