/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Version issue de package.json, injectée au build par vite.config.ts. */
declare const __APP_VERSION__: string;

/** Date et heure du build, injectées au build par vite.config.ts. */
declare const __BUILD_DATE__: string;
