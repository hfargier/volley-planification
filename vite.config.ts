import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

const buildDate = new Date().toLocaleString('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default defineConfig({
  // Base RELATIVE : le même build fonctionne quel que soit le sous-dossier
  // d'hébergement (/volley-planif/ comme /jsawebapp/volley-planif/).
  // Avec une base absolue, les assets étaient cherchés à la racine du domaine.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Le service worker se met à jour tout seul ; App.tsx écoute
      // onNeedRefresh pour prévenir le coach et recharger.
      registerType: 'autoUpdate',
      // On utilise le manifest.json de public/ (mêmes chemins relatifs).
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        // L'API PHP est déployée à part et ne doit jamais être mise en cache.
        globIgnores: ['**/*.php'],
        navigateFallbackDenylist: [/^\/API\//],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsa-planif-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
});
