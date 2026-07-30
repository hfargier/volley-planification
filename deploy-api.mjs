import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import FtpDeploy from 'ftp-deploy';
import { loadConfig, runDeploy } from './deploy.lib.mjs';

const cfg = loadConfig();

const apiDir = fileURLToPath(new URL('./api', import.meta.url));
const apiFile = fileURLToPath(new URL('./api/api_volley_seance.php', import.meta.url));
const configFile = fileURLToPath(new URL('./api/config.php', import.meta.url));

if (!existsSync(apiFile)) {
  console.error('❌ api/api_volley_seance.php est introuvable.');
  process.exit(1);
}

// config.php porte les identifiants BDD : sans lui l'API renvoie une erreur 500.
if (!existsSync(configFile)) {
  console.error(
    '❌ api/config.php est absent.\n' +
      '   Créez-le depuis le modèle :\n' +
      '     cp api/config.example.php api/config.php'
  );
  process.exit(1);
}

// Sauvegarde horodatée de ce qu'on envoie, pour garder une trace des versions.
const horodatage = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
const backupDir = fileURLToPath(new URL('./backups', import.meta.url));
mkdirSync(backupDir, { recursive: true });
const backupFile = `${backupDir}/api_volley_seance.${horodatage}.deployed.php`;
copyFileSync(apiFile, backupFile);
console.log(`💾 Sauvegarde : backups/${backupFile.split(/[\\/]/).pop()}`);

console.log(`🚀 Déploiement de l'API → ${cfg.remoteRootApi}`);

await runDeploy(
  new FtpDeploy(),
  {
    user: cfg.user,
    password: cfg.password,
    host: cfg.host,
    port: cfg.port,
    localRoot: apiDir,
    remoteRoot: cfg.remoteRootApi,
    // config.example.php reste local : inutile sur le serveur.
    include: ['api_volley_seance.php', 'config.php'],
    deleteRemote: false,
    forcePasv: true,
  },
  'API'
);
