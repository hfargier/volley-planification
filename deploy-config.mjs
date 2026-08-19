import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import FtpDeploy from 'ftp-deploy';
import { loadConfig, runDeploy } from './deploy.lib.mjs';

/**
 * Déploie api/config.php, et rien d'autre.
 *
 * Ce fichier porte les identifiants de la base. L'envoyer écrase la
 * configuration de production : si la copie locale est périmée, l'API renvoie
 * une erreur 500 et le site est coupé. C'est pour ça qu'il ne part plus avec
 * `deploy:api` et qu'il faut confirmer explicitement.
 *
 *   npm run deploy:config -- --confirmer
 */
const cfg = loadConfig();

const apiDir = fileURLToPath(new URL('./api', import.meta.url));
const configFile = fileURLToPath(new URL('./api/config.php', import.meta.url));

if (!existsSync(configFile)) {
  console.error(
    '❌ api/config.php est absent.\n' +
      '   Créez-le depuis le modèle :\n' +
      '     cp api/config.example.php api/config.php'
  );
  process.exit(1);
}

if (!process.argv.includes('--confirmer')) {
  console.error(
    '⚠️  Cette commande écrase la configuration de la base EN PRODUCTION.\n' +
      "   Vérifiez que api/config.php contient bien les identifiants à jour,\n" +
      '   puis relancez :\n' +
      '     npm run deploy:config -- --confirmer'
  );
  process.exit(1);
}

console.log(`🚀 Déploiement de config.php → ${cfg.remoteRootApi}`);

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
    include: ['config.php'],
    deleteRemote: false,
    forcePasv: true,
  },
  'config.php'
);

console.log("ℹ️  Vérifiez que l'API répond avant de fermer :");
console.log('   https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_modeles_liste');
