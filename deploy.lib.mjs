import { readFileSync, existsSync } from 'node:fs';

const CONFIG_PATH = new URL('./deploy.config.json', import.meta.url);

/**
 * Charge les identifiants FTP depuis deploy.config.json (non versionné).
 * Les variables d'environnement FTP_USER / FTP_PASSWORD / FTP_HOST
 * prennent le dessus, pratique pour une CI.
 */
export const loadConfig = () => {
  let file = {};

  if (existsSync(CONFIG_PATH)) {
    try {
      file = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch (err) {
      console.error('❌ deploy.config.json est illisible :', err.message);
      process.exit(1);
    }
  }

  // L'app est publiée à plusieurs emplacements : on accepte une liste
  // (remoteRootsApp) tout en restant compatible avec l'ancienne clé unique.
  let cibles = file.remoteRootsApp ?? file.remoteRootApp ?? ['/volley-planif/'];
  if (typeof cibles === 'string') cibles = [cibles];

  const config = {
    user: process.env.FTP_USER ?? file.user,
    password: process.env.FTP_PASSWORD ?? file.password,
    host: process.env.FTP_HOST ?? file.host,
    port: Number(process.env.FTP_PORT ?? file.port ?? 21),
    remoteRootsApp: cibles,
    remoteRootApi: file.remoteRootApi ?? '/API/',
  };

  const manquants = ['user', 'password', 'host'].filter((k) => !config[k]);
  if (manquants.length > 0) {
    console.error(
      `❌ Identifiants FTP manquants : ${manquants.join(', ')}.\n` +
        '   Créez deploy.config.json à partir de deploy.config.example.json :\n' +
        '     cp deploy.config.example.json deploy.config.json'
    );
    process.exit(1);
  }

  return config;
};

/** Branche les logs de progression et attend la fin du transfert. */
export const runDeploy = async (ftpDeploy, config, label) => {
  ftpDeploy.on('uploaded', (info) =>
    console.log(
      `  ↑ ${info.filename} (${info.transferredFileCount}/${info.totalFilesCount})`
    )
  );
  ftpDeploy.on('upload-error', (err) =>
    console.error('  ✗ Échec :', err.err ?? err)
  );

  try {
    await ftpDeploy.deploy(config);
    console.log(`✅ ${label} déployé.`);
  } catch (err) {
    console.error('❌ Erreur FTP :', err?.message ?? err);
    process.exit(1);
  }
};
