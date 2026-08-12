import { apiUrl, fetchJson } from './api';

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
 */
export const calculerBlocs = (
  charges: Charge[],
  cycleOrdre: number,
  numSemaine: number,
  dureeMinutes: number,
  types: TypeTravail[]
): BlocTravail[] => {
  const semaine = charges.filter(
    (c) => Number(c.cycle_ordre) === cycleOrdre && Number(c.num_semaine) === numSemaine
  );
  if (semaine.length === 0) return [];

  const parType = new Map(types.map((t) => [t.id, t]));

  const n1 = new Map<string, number>();
  const n2 = new Map<string, number>();
  for (const c of semaine) {
    if (Number(c.niveau) === 1) n1.set(c.famille, nombre(c.pourcentage));
    else if (Number(c.niveau) === 2)
      n2.set(`${c.famille}|${c.theme_id}`, nombre(c.pourcentage));
  }

  const blocs: BlocTravail[] = [];
  for (const c of semaine) {
    if (Number(c.niveau) !== 3) continue;
    const pFamille = n1.get(c.famille) ?? 0;
    const pTheme = n2.get(`${c.famille}|${c.theme_id}`) ?? 0;
    const pForme = nombre(c.pourcentage);
    const t = parType.get(Number(c.type_travail_id));
    blocs.push({
      famille: c.famille,
      themeId: Number(c.theme_id),
      typeId: Number(c.type_travail_id),
      code: t?.code ?? '?',
      nomType: t?.nom ?? 'Forme inconnue',
      pourcentage: pFamille * pTheme * pForme / 10000,
      minutes: (dureeMinutes * pFamille * pTheme * pForme) / 1000000,
    });
  }

  // Les blocs les plus longs d'abord : c'est l'ossature de la séance.
  return blocs.sort((a, b) => b.minutes - a.minutes);
};

/** Temps total par famille, pour la vue d'ensemble de la semaine. */
export const totauxParFamille = (blocs: BlocTravail[]) => {
  const m = new Map<string, number>();
  for (const b of blocs) m.set(b.famille, (m.get(b.famille) ?? 0) + b.minutes);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
