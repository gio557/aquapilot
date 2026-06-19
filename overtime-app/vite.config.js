import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Percorsi relativi: l'app funziona sia in locale sia ospitata in una
// sottocartella (es. GitHub Pages) senza modifiche.
export default defineConfig({
  plugins: [react()],
  base: './',
})
