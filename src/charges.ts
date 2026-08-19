import { apiUrl, fetchJson } from './api';
import { travaille, ORDRE_COLONNES, type Profil } from './profils';

/** Une des 9 formes de travail (TI, TII, Collectifs, Préventifs…). */
export interface TypeTravail {
  id: number;
  famille: string; // Technique | Tactique | Physique
  nom: string;
  code: string;
  ordre: number;
}

/**
 * Une ligne de répartition. Le niveau dit à quoi elle s'applique :
 *   1 → poids d'une famille dans la semaine
 *   2 → poids d'un thème dans sa famille
 *   3 → poids d'une forme de travail dans son thème
 */
export interface Charge {
  cycle_id: number;
  cycle_ordre: number;
  num_semaine: number;
  niveau: number;
  famille: string;
  theme_id: number;
  type_travail_id: number;
  pourcentage: number | string;
}

export interface BlocTravail {
  famille: string;
  themeId: number;
  typeId: number;
  code: string;
  nomType: string;
  pourcentage: number;
  minutes: number;
}

export const chargerTypesTravail = () =>
  fetchJson<TypeTravail[]>(apiUrl('get_types_travail', {}, { cacheBust: true }));

export const chargerCharges = (id: number, mode: 'modele' | 'equipe') =>
  fetchJson<Charge[]>(apiUrl('get_charges', { id, mode }, { cacheBust: true }));

const nombre = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v) || 0);

/**
 * Convertit la répartition d'une semaine en minutes réelles.
 * Le temps d'un bloc est le produit des trois niveaux :
 *   durée × famille% × thème% × forme%
 *
 * `profil` restreint le calcul à ce qu'une joueuse de ce poste travaille
 * réellement : les thèmes techniques des secteurs qui ne la concernent pas
 * sont écartés, et les autres repondérés entre eux. Sans profil, on obtient la
 * vue d'ensemble du terrain. `secteurParTheme` n'est utile qu'avec un profil.
 */
export const calculerBlocs = (
  charges: Charge[],
  cycleOrdre: number,
  numSemaine: number,
  dureeMinutes: number,
  types: TypeTravail[],
  profil?: Profil,
  secteurParTheme?: Record<number, string>
): BlocTravail[] => {
  const semaine = charges.filter(
    (c) => Number(c.cycle_ordre) === cycleOrdre && Number(c.num_semaine) === numSemaine
  );
  if (semaine.length === 0) return [];

  const parType = new Map(types.map((t) => [t.id, t]));
  const secteurDe = (themeId: number) => secteurParTheme?.[themeId];
  const retenu = (themeId: number) =>
    !profil || travaille(secteurDe(themeId), profil);

  const n1 = new Map<string, number>();
  const n2 = new Map<string, number>();
  for (const c of semaine) {
    if (Number(c.niveau) === 1) n1.set(c.famille, nombre(c.pourcentage));
    else if (Number(c.niveau) === 2)
      n2.set(`${c.famille}|${c.theme_id}`, nombre(c.pourcentage));
  }

  // Le temps d'une famille ne change pas selon le poste ; seule sa découpe
  // change. On repondère donc les thèmes retenus pour qu'ils fassent 100 %.
  const totalRetenu = new Map<string, number>();
  if (profil) {
    for (const [cle, pct] of n2) {
      const [famille, id] = cle.split('|');
      if (!retenu(Number(id))) continue;
      totalRetenu.set(famille, (totalRetenu.get(famille) ?? 0) + pct);
    }
  }

  const blocs: BlocTravail[] = [];
  for (const c of semaine) {
    if (Number(c.niveau) !== 3) continue;
    const themeId = Number(c.theme_id);
    if (!retenu(themeId)) continue;

    const pFamille = n1.get(c.famille) ?? 0;
    let pTheme = n2.get(`${c.famille}|${themeId}`) ?? 0;
    if (profil) {
      const total = totalRetenu.get(c.famille) ?? 0;
      pTheme = total > 0 ? (pTheme / total) * 100 : 0;
    }
    const pForme = nombre(c.pourcentage);
    const t = parType.get(Number(c.type_travail_id));
    blocs.push({
      famille: c.famille,
      themeId,
      typeId: Number(c.type_travail_id),
      code: t?.code ?? '?',
      nomType: t?.nom ?? 'Forme inconnue',
      pourcentage: (pFamille * pTheme * pForme) / 10000,
      minutes: (dureeMinutes * pFamille * pTheme * pForme) / 1000000,
    });
  }

  // Les blocs les plus longs d'abord : c'est l'ossature de la séance.
  return blocs.sort((a, b) => b.minutes - a.minutes);
};

/** Une ligne de la vue d'ensemble : un thème, et qui le travaille. */
export interface LigneEquipe {
  themeId: number;
  famille: string;
  secteur?: string;
  /** Postes concernés, dans l'ordre d'affichage des colonnes. */
  postes: Profil[];
  /** Minutes par poste. Identiques partout pour un thème commun à tous. */
  minutes: Partial<Record<Profil, number>>;
  /** Renseigné quand tous les postes concernés font la même durée. */
  minutesCommunes?: number;
}

/**
 * Vue d'ensemble de la semaine : une ligne par thème, avec les postes qui le
 * travaillent et le temps de chacun.
 *
 * Un thème commun à tout le monde — Jeux, Physique, Mental, Social — occupe la
 * largeur entière et porte une durée unique. Un thème technique n'occupe que
 * les colonnes des postes concernés, et les durées y diffèrent : le libéro
 * passe bien plus de temps en réception que le réceptionneur-attaquant, qui a
 * d'autres secteurs à se partager.
 */
export const matriceEquipe = (
  charges: Charge[],
  cycleOrdre: number,
  numSemaine: number,
  dureeMinutes: number,
  types: TypeTravail[],
  secteurParTheme: Record<number, string>
): LigneEquipe[] => {
  const parTheme = new Map<number, LigneEquipe>();

  for (const profil of ORDRE_COLONNES) {
    const blocs = calculerBlocs(
      charges, cycleOrdre, numSemaine, dureeMinutes, types, profil, secteurParTheme
    );
    const cumul = new Map<number, number>();
    for (const b of blocs) cumul.set(b.themeId, (cumul.get(b.themeId) ?? 0) + b.minutes);

    for (const b of blocs) {
      let ligne = parTheme.get(b.themeId);
      if (!ligne) {
        ligne = {
          themeId: b.themeId,
          famille: b.famille,
          secteur: secteurParTheme[b.themeId],
          postes: [],
          minutes: {},
        };
        parTheme.set(b.themeId, ligne);
      }
      if (!ligne.postes.includes(profil)) ligne.postes.push(profil);
      ligne.minutes[profil] = cumul.get(b.themeId);
    }
  }

  const lignes = [...parTheme.values()];
  for (const l of lignes) {
    const valeurs = l.postes.map((p) => l.minutes[p] ?? 0);
    const toutesEgales = valeurs.every((v) => Math.abs(v - valeurs[0]) < 0.05);
    if (toutesEgales) l.minutesCommunes = valeurs[0];
  }

  // Les blocs les plus longs d'abord, comme dans la vue par poste.
  return lignes.sort(
    (a, b) => Math.max(...Object.values(b.minutes as Record<string, number>))
            - Math.max(...Object.values(a.minutes as Record<string, number>))
  );
};

/**
 * Familles pour lesquelles le poste n'a rien à travailler cette semaine.
 * En pratique seule la technique peut se retrouver vide : Jeux, Physique,
 * Mental et Social sont communs à tout le monde.
 */
export const famillesSansTravail = (
  charges: Charge[],
  cycleOrdre: number,
  numSemaine: number,
  profil: Profil,
  secteurParTheme: Record<number, string>
): string[] => {
  const semaine = charges.filter(
    (c) => Number(c.cycle_ordre) === cycleOrdre && Number(c.num_semaine) === numSemaine
  );
  const presentes = new Set<string>();
  const servies = new Set<string>();
  for (const c of semaine) {
    if (Number(c.niveau) !== 2) continue;
    presentes.add(c.famille);
    if (travaille(secteurParTheme[Number(c.theme_id)], profil)) servies.add(c.famille);
  }
  return [...presentes].filter((f) => !servies.has(f));
};

/** Temps total par famille, pour la vue d'ensemble de la semaine. */
export const totauxParFamille = (blocs: BlocTravail[]) => {
  const m = new Map<string, number>();
  for (const b of blocs) m.set(b.famille, (m.get(b.famille) ?? 0) + b.minutes);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
