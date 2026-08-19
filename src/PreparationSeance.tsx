import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Volleyball,
  Lightbulb,
  WifiOff,
} from 'lucide-react';
import './App.css';
import { apiUrl, fetchJson } from './api';
import type { ApiMutationResult } from './types';
import ChargesSeance from './ChargesSeance';
import { chargerCharges, chargerTypesTravail, type Charge, type TypeTravail } from './charges';

// --- HELPERS SEMAINE ISO 8601 ---
const getISOWeek = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
};

// L'année ISO peut différer de l'année civile fin décembre / début janvier.
const getISOWeekYear = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  return date.getFullYear();
};

// Une année ISO compte 52 ou 53 semaines (2026 en compte 53).
// Le 28 décembre tombe toujours dans la dernière semaine ISO de l'année.
const isoWeeksInYear = (year: number) => getISOWeek(new Date(year, 11, 28));

interface PreparationSeanceProps {
  planifId: number;
  onBack: () => void;
}

interface SeanceObjectif {
  id: number;
  titre: string;
  description?: string;
  statut?: string | number;
  secteur_id: number;
  secteur_nom: string;
}

interface SeanceTheme {
  id: number;
  nom: string;
  statut?: string | number;
  secteur_id: number;
  secteur_nom: string;
  sous_themes_selectionnes: string[];
  conseil_coach?: string;
}

interface SeanceData {
  isVacances?: boolean;
  currentCycle?: number;
  currentWeek?: string;  // format « S1 », « S2 »…
  objectifs?: SeanceObjectif[];
  themes?: SeanceTheme[];
}

const PreparationSeance: React.FC<PreparationSeanceProps> = ({ planifId, onBack }) => {
  const [data, setData] = useState<SeanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, number>>({});
  const [charges, setCharges] = useState<Charge[]>([]);
  const [typesTravail, setTypesTravail] = useState<TypeTravail[]>([]);
  // La durée de séance varie d'une équipe à l'autre : on retient le choix.
  const [dureeSeance, setDureeSeance] = useState<number>(() => {
    const v = Number(localStorage.getItem('dureeSeance'));
    return v >= 30 && v <= 240 ? v : 90;
  });

  const changerDuree = (m: number) => {
    setDureeSeance(m);
    localStorage.setItem('dureeSeance', String(m));
  };

  const [calState, setCalState] = useState(() => {
    const now = new Date();
    return { week: getISOWeek(now), year: getISOWeekYear(now) };
  });

  // Annulation des envois de score en attente si on quitte la vue
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // --- CHARGEMENT ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = apiUrl(
        'get_current_focus',
        {
          id: planifId,
          semaine_cible: calState.week,
          annee_cible: calState.year,
        },
        { cacheBust: true }
      );
      const result = await fetchJson<SeanceData>(url);
      setData(result);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [planifId, calState.week, calState.year]);

  useEffect(() => { if (planifId) fetchData(); }, [planifId, fetchData]);

  // Répartition du temps : indépendante de la semaine affichée, on la charge
  // une seule fois. Silencieux en cas d'échec, la séance reste consultable.
  useEffect(() => {
    if (!planifId) return;
    let annule = false;
    Promise.all([chargerTypesTravail(), chargerCharges(planifId, 'equipe')])
      .then(([t, c]) => {
        if (annule) return;
        setTypesTravail(Array.isArray(t) ? t : []);
        setCharges(Array.isArray(c) ? c : []);
      })
      .catch((e) => console.error('Charges indisponibles :', e));
    return () => { annule = true; };
  }, [planifId]);

  const navigateWeek = (direction: number) => {
    let newWeek = calState.week + direction;
    let newYear = calState.year;
    if (newWeek > isoWeeksInYear(newYear)) {
      newWeek = 1;
      newYear++;
    } else if (newWeek < 1) {
      newYear--;
      newWeek = isoWeeksInYear(newYear);
    }
    setCalState({ week: newWeek, year: newYear });
  };

  const persistScore = async (
    type: 'objectif' | 'theme',
    itemId: number,
    score: number
  ) => {
    try {
      const res = await fetchJson<ApiMutationResult>(apiUrl('save_seance_score'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planif_id: planifId, type, item_id: itemId, score }),
      });
      // On ne bloque pas si l'API ne renvoie pas de champ "success".
      if (res && res.success === false) {
        throw new Error(res.error ?? 'refus du serveur');
      }
      setScoreError(null);
    } catch (e) {
      console.error(e);
      setScoreError(
        'Dernière note NON enregistrée (serveur injoignable). Rebougez le curseur pour réessayer.'
      );
    }
  };

  const handleScoreChange = (
    type: 'objectif' | 'theme',
    itemId: number,
    score: number
  ) => {
    // Mise à jour immuable : on ne modifie jamais l'objet du state en place.
    setData((current) => {
      if (!current) return current;
      if (type === 'objectif') {
        return {
          ...current,
          objectifs: current.objectifs?.map((o) =>
            o.id === itemId ? { ...o, statut: score } : o
          ),
        };
      }
      return {
        ...current,
        themes: current.themes?.map((t) =>
          t.id === itemId ? { ...t, statut: score } : t
        ),
      };
    });

    // Le curseur émet un onChange par pixel : on n'envoie qu'après la pause.
    const key = `${type}-${itemId}`;
    window.clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = window.setTimeout(() => {
      void persistScore(type, itemId, score);
    }, 400);
  };

  // currentWeek arrive au format « S1 » : on en extrait le numéro pour
  // retrouver la bonne ligne de répartition.
  const numSemaineCycle =
    Number(String(data?.currentWeek ?? '').replace(/\D/g, '')) || 0;

  // Les charges désignent les thèmes par identifiant ; on affiche leur nom,
  // préfixé du secteur : plusieurs secteurs ont un thème « Contact » ou
  // « Technique », le nom seul serait ambigu sur le terrain.
  const nomThemes = useMemo(() => {
    const m: Record<number, string> = {};
    for (const t of data?.themes ?? []) {
      m[t.id] = t.secteur_nom ? `${t.secteur_nom} · ${t.nom}` : t.nom;
    }
    return m;
  }, [data?.themes]);

  // Le secteur d'un thème décide qui le travaille : sans lui, pas de vue par poste.
  const secteurThemes = useMemo(() => {
    const m: Record<number, string> = {};
    for (const t of data?.themes ?? []) {
      if (t.secteur_nom) m[t.id] = t.secteur_nom;
    }
    return m;
  }, [data?.themes]);

  const groupedObjectives = data?.objectifs?.reduce<Record<string, SeanceObjectif[]>>((acc, obj) => {
    const key = obj.secteur_nom || "AUTRE";
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {});

  if (loading) return <div className="loading-state"><Loader2 className="spinner" /></div>;

  return (
    <div className="viewer-container fade-in">
      <header className="viewer-header-bar-premium mobile-header-compact">
        <button className="nav-pill-back" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>

        <div className="week-nav-mini">
          <button className="btn-nav-arrow" onClick={() => navigateWeek(-1)}>
            <ChevronLeft size={20} />
          </button>
          <div className="week-info-stack">
            <span className="week-num-label">SEM. {calState.week}</span>
          </div>
          <button className="btn-nav-arrow" onClick={() => navigateWeek(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="focus-meta-pills-mini">
          <span className="badge-cycle">Cycle {data?.currentCycle} / {data?.currentWeek}</span>
        </div>
      </header>

      {scoreError && (
        <div className="score-sync-error" role="alert">
          <WifiOff size={16} />
          <span>{scoreError}</span>
        </div>
      )}

      <div className="viewer-content-layout">
        {data?.isVacances ? (
          <div className="vacances-full-screen fade-in">
             <div className="vacances-alert-box-large">
                <span className="vacances-emoji">🌴</span>
                <h2>Trêve Scolaire</h2>
                <p>La semaine {calState.week} est une période de repos.</p>
             </div>
          </div>
        ) : (
          <div className="mobile-vertical-layout fade-in">
            {/* --- SECTION OBJECTIFS --- */}
            <section className="viewer-section">
              <h2 className="section-title">
                <Crosshair size={18} className="text-yellow" /> RAPPEL DES OBJECTIFS <Crosshair size={18} className="text-yellow" />
              </h2>
              {groupedObjectives && Object.keys(groupedObjectives).map((secteur) => (
                <div key={secteur} className="secteur-block">
                  {/* Badge de secteur aligné à gauche (Correction demandée) */}
                  <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                    <span className={`mini-secteur-label s-${groupedObjectives[secteur][0].secteur_id}`}>
                      {secteur}
                    </span>
                  </div>

                  {groupedObjectives[secteur].map((obj) => {
                    const score = Number(obj.statut ?? 0) || 0;
                    return (
                      <div key={obj.id} className={`obj-group-card mobile-v2-card s-border-${obj.secteur_id}`}>
                        <div className="card-header-row">
                          <strong className="title-main">{obj.titre}</strong>
                          <div className="score-control-box">
                            <span className="score-label">{score}/10</span>
                            <input type="range" min="0" max="10" value={score} className="input-range-jsa"
                                   onChange={(e) => handleScoreChange('objectif', obj.id, parseInt(e.target.value))} />
                          </div>
                        </div>
                        
                        {obj.description && (
                          <div className="card-detail-block">
                            <p>{obj.description}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>

            {/* --- SECTION THEME --- */}
            <section className="viewer-section">
              <h2 className="section-title">
                <Volleyball size={18} className="text-yellow" /> THEME DE LA SÉANCE <Volleyball size={18} className="text-yellow" />
              </h2>
              {data?.themes?.map((th) => {
                const score = Number(th.statut ?? 0) || 0;
                return (
                  <div key={th.id} className={`theme-viewer-detail-card mobile-v2-card s-border-${th.secteur_id}`}>
                    {/* Badge aligné à gauche avec largeur auto (Correction demandée) */}
                    <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                      <span className={`mini-secteur-label s-${th.secteur_id}`} style={{ display: 'inline-block', width: 'auto' }}>
                        {th.secteur_nom}
                      </span>
                    </div>

                    <div className="card-header-row">
                      <div className="title-area-stack">
                        <strong className="card-title-main">{th.nom}</strong>
                      </div>
                      <div className="score-control-box">
                        <span className="score-label">{score}/10</span>
                        <input type="range" min="0" max="10" value={score} className="input-range-jsa"
                               onChange={(e) => handleScoreChange('theme', th.id, parseInt(e.target.value))} />
                      </div>
                    </div>
                    <div className="tags-container">
                      {th.sous_themes_selectionnes?.map((st: string, idx: number) => (
                        <span key={idx} className="subtheme-pill-micro">{st}</span>
                      ))}
                    </div>
                    {th.conseil_coach && (
                      <div className="advice-box-compact">
                        <Lightbulb size={20} className="text-yellow" />
                        <p>{th.conseil_coach}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* --- RÉPARTITION DU TEMPS --- */}
            <ChargesSeance
              charges={charges}
              types={typesTravail}
              cycleOrdre={Number(data?.currentCycle ?? 0)}
              numSemaine={numSemaineCycle}
              dureeMinutes={dureeSeance}
              onChangerDuree={changerDuree}
              nomThemes={nomThemes}
              secteurThemes={secteurThemes}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PreparationSeance;