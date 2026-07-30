import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Version dérivée de l'instant du build. Comme `npm run deploy` reconstruit
// systématiquement, elle correspond à l'heure de mise en ligne : plus rien à
// incrémenter à la main, et le coach lit directement de quand date sa version.
const maintenant = new Date();
const deuxChiffres = (n: number) => String(n).padStart(2, '0');

// Format compact et triable : AA.MM.JJ-HHMM
const appVersion = [
  `${deuxChiffres(maintenant.getFullYear() % 100)}.${deuxChiffres(maintenant.getMonth() + 1)}.${deuxChiffres(maintenant.getDate())}`,
  `${deuxChiffres(maintenant.getHours())}${deuxChiffres(maintenant.getMinutes())}`,
].join('-');

// Format lisible pour l'infobulle
const buildDate = maintenant.toLocaleString('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
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
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
});
