import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Registrazione del service worker: rende l'app installabile e avviabile
// anche senza connessione. Disattivato in sviluppo per evitare cache fastidiose.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Se la registrazione fallisce l'app funziona comunque online.
    })
  })
}
