import React, { useMemo } from 'react';
import { Clock, Timer } from 'lucide-react';
import {
  calculerBlocs,
  totauxParFamille,
  type Charge,
  type TypeTravail,
} from './charges';

interface ChargesSeanceProps {
  charges: Charge[];
  types: TypeTravail[];
  cycleOrdre: number;
  numSemaine: number;
  dureeMinutes: number;
  onChangerDuree: (minutes: number) => void;
  /** Pour afficher le nom du thème plutôt que son identifiant. */
  nomThemes: Record<number, string>;
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
}) => {
  const blocs = useMemo(
    () => calculerBlocs(charges, cycleOrdre, numSemaine, dureeMinutes, types),
    [charges, cycleOrdre, numSemaine, dureeMinutes, types]
  );

  if (blocs.length === 0) return null;

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

      <div className="charges-familles">
        {familles.map(([famille, minutes]) => (
          <span key={famille} className={`charge-famille-pill famille-${famille.toLowerCase()}`}>
            {famille} <strong>{arrondi(minutes)} min</strong>
          </span>
        ))}
      </div>

      <div className="charges-blocs">
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

      {masques > 0 && (
        <p className="charges-note">
          {masques} bloc{masques > 1 ? 's' : ''} de moins de 3 minutes non affiché
          {masques > 1 ? 's' : ''}.
        </p>
      )}
    </section>
  );
};

export default ChargesSeance;
