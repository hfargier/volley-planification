/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Horodatage de mise en ligne, format AA.MM.JJ-HHMM (voir vite.config.ts). */
declare const __APP_VERSION__: string;

/** Même instant, en français lisible, pour les infobulles. */
declare const __BUILD_DATE__: string;
