import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  base: '/volley-planif/', // Indique à Vite que le projet est dans ce sous-dossier
  // ... le reste de ta config
});
