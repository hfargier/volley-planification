/**
 * Les profils de joueuses et les secteurs que chacun travaille.
 *
 * Un pourcentage de secteur est une allocation de terrain, pas le programme
 * d'une joueuse. Chaque profil ne retient que les secteurs qu'il peut
 * travailler et les repondère entre eux pour retomber sur 100 %.
 *
 * Concrètement : une semaine à passe 50 / attaque 50 donne 100 % de passe à la
 * passeuse, 100 % d'attaque à la centrale, et rien au libéro qui ne peut faire
 * ni l'une ni l'autre.
 *
 * Ce fichier doit rester aligné sur `scripts_modele/profils_joueurs.py`, qui
 * sert à construire les modèles.
 */

export type Profil = 'PASSEUR' | 'RECEPTIONNEUR/ATTAQUANT' | 'CENTRALE' | 'POINTU' | 'LIBERO';

export const PROFILS: { cle: Profil; libelle: string; court: string }[] = [
  { cle: 'PASSEUR', libelle: 'Passeuse', court: 'PASS' },
  { cle: 'RECEPTIONNEUR/ATTAQUANT', libelle: 'Réceptionneuse-attaquante', court: 'R/A' },
  { cle: 'CENTRALE', libelle: 'Centrale', court: 'CENT' },
  { cle: 'POINTU', libelle: 'Pointue', court: 'PTU' },
  { cle: 'LIBERO', libelle: 'Libéro', court: 'LIB' },
];

/**
 * Ordre des colonnes de la vue d'ensemble.
 *
 * Il n'est pas décoratif : pour qu'un thème puisse occuper une plage de
 * colonnes d'un seul tenant, les postes qui le travaillent doivent être
 * voisins. Sur les 120 ordres possibles, 4 seulement y parviennent — dans
 * l'ordre par défaut, RÉCEPTION concerne le R/A et le libéro, séparés par la
 * centrale et la pointue, et la fusion laisse un trou.
 *
 * Le R/A fait ici charnière entre l'attaque et la réception, ce qui est aussi
 * son rôle sur le terrain.
 */
export const ORDRE_COLONNES: Profil[] = [
  'PASSEUR', 'CENTRALE', 'POINTU', 'RECEPTIONNEUR/ATTAQUANT', 'LIBERO',
];

/** Secteur technique → profils qui le travaillent. */
const PAR_SECTEUR: Record<string, Profil[]> = {
  ATTAQUE: ['RECEPTIONNEUR/ATTAQUANT', 'CENTRALE', 'POINTU'],
  CONTRE: ['PASSEUR', 'RECEPTIONNEUR/ATTAQUANT', 'CENTRALE', 'POINTU'],
  DEFENSE: ['PASSEUR', 'RECEPTIONNEUR/ATTAQUANT', 'CENTRALE', 'POINTU', 'LIBERO'],
  PASSE: ['PASSEUR'],
  RECEPTION: ['RECEPTIONNEUR/ATTAQUANT', 'LIBERO'],
  SERVICE: ['PASSEUR', 'RECEPTIONNEUR/ATTAQUANT', 'CENTRALE', 'POINTU'],
};

/**
 * Les secteurs hors technique (Jeux, Physique, Mental, Social) sont travaillés
 * par tout le monde : ils ne créent jamais de trou et ne sont pas listés.
 */
export const travaille = (secteur: string | undefined, profil: Profil): boolean => {
  if (!secteur) return true;
  const liste = PAR_SECTEUR[secteur.toUpperCase()];
  return liste ? liste.includes(profil) : true;
};

/** Vrai si le secteur relève du travail technique, donc réparti par profil. */
export const estTechnique = (secteur: string | undefined): boolean =>
  !!secteur && secteur.toUpperCase() in PAR_SECTEUR;

/**
 * Plage de colonnes occupée par un ensemble de postes, en indices de grille CSS
 * (1 = première colonne, la borne de fin étant exclusive).
 *
 * Renvoie null si les postes ne sont pas voisins : la fusion serait alors
 * mensongère, et l'appelant doit se rabattre sur des cellules séparées.
 */
export const plageColonnes = (postes: Profil[]): [number, number] | null => {
  const idx = postes
    .map((p) => ORDRE_COLONNES.indexOf(p))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (idx.length === 0) return null;
  const contigu = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  return contigu ? [idx[0] + 1, idx[idx.length - 1] + 2] : null;
};
