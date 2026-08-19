import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import FtpDeploy from 'ftp-deploy';
import { loadConfig, runDeploy } from './deploy.lib.mjs';

const cfg = loadConfig();

const apiDir = fileURLToPath(new URL('./api', import.meta.url));
const apiFile = fileURLToPath(new URL('./api/api_volley_seance.php', import.meta.url));

if (!existsSync(apiFile)) {
  console.error('❌ api/api_volley_seance.php est introuvable.');
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

// config.php n'est PAS envoyé ici : il porte les identifiants de la base et sa
// copie locale peut être périmée. L'écraser par inadvertance coupe le site.
// Il se déploie à part, délibérément : npm run deploy:config
await runDeploy(
  new FtpDeploy(),
  {
    user: cfg.user,
    password: cfg.password,
    host: cfg.host,
    port: cfg.port,
    localRoot: apiDir,
    remoteRoot: cfg.remoteRootApi,
    include: ['api_volley_seance.php'],
    exclude: ['config.php', 'config.example.php', 'migrations/**'],
    deleteRemote: false,
    forcePasv: true,
  },
  'API'
);

console.log('ℹ️  config.php non touché. Pour le déployer : npm run deploy:config');
