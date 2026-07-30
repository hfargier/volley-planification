# JSA Planif

Application de planification des entraînements (JSA Volley Bordeaux).
Front React + Vite, API PHP/MySQL hébergée sur `seme-et-tisse.fr`.

## Structure

| Chemin | Rôle |
|---|---|
| `src/` | Application React (TypeScript) |
| `api/api_volley_seance.php` | API : toutes les actions (`?action=...`) |
| `api/config.php` | **Non versionné** — identifiants MySQL |
| `api/config.example.php` | Modèle à copier en `config.php` |
| `deploy.config.json` | **Non versionné** — identifiants FTP |
| `backups/` | Copies horodatées des API déployées (non versionné) |

`vite.config.ts` utilise `base: './'` (chemins **relatifs**) : le même build
fonctionne à n'importe quelle profondeur, sans rebuild par destination. Ne pas
remettre une base absolue, sinon le déploiement sous `/jsawebapp/` cherchera ses
assets à la racine du domaine.

Pour la même raison, les images de `public/` doivent être référencées via
`import.meta.env.BASE_URL` et jamais en `/mon-image.png`.

## Installation

```bash
npm install --legacy-peer-deps
```

Puis créer les deux fichiers de secrets (jamais commités) :

```bash
cp api/config.example.php api/config.php
```
```bash
cp deploy.config.example.json deploy.config.json
```

## Développement

```bash
npm run dev
```

## Déploiement

| Commande | Effet |
|---|---|
| `npm run deploy` | Build puis envoi de `dist/` vers **toutes** les cibles app |
| `npm run deploy:api` | Envoi de `api/` vers `/API/` (avec sauvegarde) |
| `npm run deploy:all` | Les deux, app puis API |

```bash
npm run deploy:all
```

L'app est publiée à deux emplacements, listés dans `remoteRootsApp` :

- <https://seme-et-tisse.fr/volley-planif/>
- <https://seme-et-tisse.fr/jsawebapp/volley-planif/>

Ajouter ou retirer une destination = éditer ce tableau, rien d'autre. Les envois
sont séquentiels (le FTP mutualisé supporte mal le parallélisme).

Le déploiement n'efface jamais le distant (`deleteRemote: false`), il écrase
les fichiers envoyés. `deploy:api` archive au préalable le PHP dans `backups/`.

Les identifiants FTP peuvent aussi venir de l'environnement — pratique en CI,
et prioritaire sur `deploy.config.json` :

```bash
FTP_USER=... FTP_PASSWORD=... FTP_HOST=... npm run deploy
```

## Points de vigilance

- **Aucune authentification côté API** : n'importe quel appel peut lire ou
  écrire. Le rôle `admin` n'est vérifié que dans le navigateur, donc
  contournable. À traiter avant toute ouverture plus large de l'accès.
- Les mots de passe des coachs sont stockés **en clair** dans `coachs`.
- `npm install` sans `--legacy-peer-deps` échoue : `eslint@10` est incompatible
  avec `eslint-plugin-react-hooks@7` (qui accepte eslint 9 au maximum).
- Il n'existe **aucune action de suppression** d'une planification d'équipe.
