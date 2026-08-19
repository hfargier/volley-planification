import React, { useMemo, useState } from 'react';
import { Clock, Timer, Users } from 'lucide-react';
import {
  calculerBlocs,
  famillesSansTravail,
  matriceEquipe,
  totauxParFamille,
  type Charge,
  type TypeTravail,
} from './charges';
import { PROFILS, ORDRE_COLONNES, plageColonnes, type Profil } from './profils';

interface ChargesSeanceProps {
  charges: Charge[];
  types: TypeTravail[];
  cycleOrdre: number;
  numSemaine: number;
  dureeMinutes: number;
  onChangerDuree: (minutes: number) => void;
  /** Pour afficher le nom du thème plutôt que son identifiant. */
  nomThemes: Record<number, string>;
  /** Secteur de chaque thème : sans lui, pas de vue par poste. */
  secteurThemes?: Record<number, string>;
}

const DUREES = [60, 75, 90, 105, 120];

const arrondi = (m: number) => Math.round(m);

const ChargesSeance: React.FC<ChargesSeanceProps> = ({
  charges,
  types,
  cycleOrdre,
  numSemaine,
  dureeMinutes,
  onChangerDuree,
  nomThemes,
  secteurThemes,
}) => {
  // « Toute l'équipe » reste la vue par défaut : c'est l'occupation du terrain.
  const [profil, setProfil] = useState<Profil | ''>('');

  const blocs = useMemo(
    () =>
      calculerBlocs(charges, cycleOrdre, numSemaine, dureeMinutes, types,
        profil || undefined, secteurThemes),
    [charges, cycleOrdre, numSemaine, dureeMinutes, types, profil, secteurThemes]
  );

  // Vue d'ensemble : qui travaille quoi, et combien de temps chacun.
  const matrice = useMemo(
    () =>
      !profil && secteurThemes
        ? matriceEquipe(charges, cycleOrdre, numSemaine, dureeMinutes, types, secteurThemes)
        : [],
    [charges, cycleOrdre, numSemaine, dureeMinutes, types, profil, secteurThemes]
  );

  const sansTravail = useMemo(
    () =>
      profil && secteurThemes
        ? famillesSansTravail(charges, cycleOrdre, numSemaine, profil, secteurThemes)
        : [],
    [charges, cycleOrdre, numSemaine, profil, secteurThemes]
  );

  if (blocs.length === 0 && sansTravail.length === 0) return null;

  const familles = totauxParFamille(blocs);
  // Sous 3 minutes, un bloc n'est pas réalisable sur le terrain : on le masque
  // pour ne pas noyer l'essentiel, tout en le comptant dans le total.
  const visibles = blocs.filter((b) => arrondi(b.minutes) >= 3);
  const masques = blocs.length - visibles.length;

  return (
    <section className="viewer-section charges-section">
      <h2 className="section-title">
        <Clock size={18} className="text-yellow" /> RÉPARTITION DU TEMPS
        <Clock size={18} className="text-yellow" />
      </h2>

      <div className="charges-duree">
        <Timer size={14} className="text-yellow" />
        <label htmlFor="duree-seance">DURÉE DE SÉANCE</label>
        <select
          id="duree-seance"
          className="copy-select charges-duree-select"
          value={dureeMinutes}
          onChange={(e) => onChangerDuree(Number(e.target.value))}
        >
          {DUREES.map((d) => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </select>
      </div>

      {secteurThemes && (
        <div className="charges-duree">
          <Users size={14} className="text-yellow" />
          <label htmlFor="profil-seance">POSTE</label>
          <select
            id="profil-seance"
            className="copy-select charges-duree-select"
            value={profil}
            onChange={(e) => setProfil(e.target.value as Profil | '')}
          >
            <option value="">Toute l'équipe</option>
            {PROFILS.map((p) => (
              <option key={p.cle} value={p.cle}>
                {p.libelle}
              </option>
            ))}
          </select>
        </div>
      )}

      {sansTravail.length > 0 && (
        <p className="charges-note">
          Rien à travailler en {sansTravail.join(', ').toLowerCase()} pour ce poste
          cette semaine.
        </p>
      )}

      <div className="charges-familles">
        {familles.map(([famille, minutes]) => (
          <span key={famille} className={`charge-famille-pill famille-${famille.toLowerCase()}`}>
            {famille} <strong>{arrondi(minutes)} min</strong>
          </span>
        ))}
      </div>

      {!profil && matrice.length > 0 && (
        <div className="charges-matrice">
          <div className="charges-matrice-entete">
            {ORDRE_COLONNES.map((p) => (
              <span key={p} className="charges-matrice-poste">
                {PROFILS.find((x) => x.cle === p)?.libelle}
              </span>
            ))}
          </div>
          {matrice.map((l) => {
            const plage = plageColonnes(l.postes);
            // Sans plage contiguë, on ne fusionne pas : une cellule étendue
            // laisserait croire qu'un poste travaille ce qu'il ne travaille pas.
            const style = plage
              ? { gridColumn: `${plage[0]} / ${plage[1]}` }
              : { gridColumn: '1 / -1' };
            return (
              <div key={l.themeId} className="charges-matrice-ligne">
                <div
                  className={`charges-matrice-bloc famille-${l.famille.toLowerCase()}`}
                  style={style}
                >
                  <span className="charges-matrice-nom">
                    {nomThemes[l.themeId] ?? `Thème ${l.themeId}`}
                  </span>
                  {l.minutesCommunes !== undefined ? (
                    <span className="charges-matrice-min">{arrondi(l.minutesCommunes)}′</span>
                  ) : (
                    <span className="charges-matrice-detail">
                      {l.postes.map((p) => (
                        <span key={p}>
                          {PROFILS.find((x) => x.cle === p)?.court}{' '}
                          <strong>{arrondi(l.minutes[p] ?? 0)}′</strong>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* La matrice remplace la liste des blocs : elle dit la même chose,
          en montrant en plus qui fait quoi. */}
      <div className="charges-blocs" hidden={matrice.length > 0}>
        {visibles.map((b) => (
          <div key={`${b.themeId}-${b.typeId}`} className="charge-bloc">
            <div className="charge-bloc-tete">
              <span className="charge-bloc-minutes">{arrondi(b.minutes)}′</span>
              <div className="charge-bloc-libelle">
                <strong>{nomThemes[b.themeId] ?? `Thème ${b.themeId}`}</strong>
                <small>{b.nomType}</small>
              </div>
              <span className="charge-bloc-code">{b.code}</span>
            </div>
            <div className="charge-bloc-jauge">
              <div
                className="charge-bloc-jauge-remplie"
                style={{ width: `${Math.min(100, (b.minutes / dureeMinutes) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {masques > 0 && matrice.length === 0 && (
        <p className="charges-note">
          {masques} bloc{masques > 1 ? 's' : ''} de moins de 3 minutes non affiché
          {masques > 1 ? 's' : ''}.
        </p>
      )}
    </section>
  );
};

export default ChargesSeance;
