import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  // Base RELATIVE : le même build fonctionne quel que soit le sous-dossier
  // d'hébergement (/volley-planif/ comme /jsawebapp/volley-planif/).
  // Avec une base absolue, les assets étaient cherchés à la racine du domaine.
  base: './',
});
