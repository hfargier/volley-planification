import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import FtpDeploy from 'ftp-deploy';
import { loadConfig, runDeploy } from './deploy.lib.mjs';

const cfg = loadConfig();

if (!existsSync(new URL('./dist/index.html', import.meta.url))) {
  console.error(
    "❌ Aucun build trouvé dans ./dist.\n   Lancez d'abord : npm run build"
  );
  process.exit(1);
}

const localRoot = fileURLToPath(new URL('./dist', import.meta.url));

console.log(
  `🚀 Déploiement de l'app vers ${cfg.remoteRootsApp.length} emplacement(s) :`
);
cfg.remoteRootsApp.forEach((r) => console.log(`   • ${r}`));

// Une cible après l'autre : le serveur FTP mutualisé supporte mal les
// transferts concurrents. deleteRemote reste false, on écrase sans effacer.
for (const remoteRoot of cfg.remoteRootsApp) {
  console.log(`\n── ${remoteRoot}`);
  await runDeploy(
    new FtpDeploy(),
    {
      user: cfg.user,
      password: cfg.password,
      host: cfg.host,
      port: cfg.port,
      localRoot,
      remoteRoot,
      include: ['*', '**/*', '.*'],
      deleteRemote: false,
      forcePasv: true,
    },
    `App → ${remoteRoot}`
  );
}
