import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Volleyball,
  Lightbulb,
} from 'lucide-react';
import './App.css';

interface PreparationSeanceProps {
  planifId: number;
  onBack: () => void;
}

const PreparationSeance: React.FC<PreparationSeanceProps> = ({ planifId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- LOGIQUE SEMAINE ISO ---
  const getISOWeek = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };

  const [calState, setCalState] = useState({
    week: getISOWeek(new Date()),
    year: new Date().getFullYear(),
  });
/*
  const getWeekRangeLabel = (w: number, y: number) => {
    const d = new Date(y, 0, 1 + (w - 1) * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `Du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  };*/

  // --- CHARGEMENT ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const url = `https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_current_focus&id=${planifId}&semaine_cible=${calState.week}&annee_cible=${calState.year}&t=${Date.now()}`;
      const res = await fetch(url);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (planifId) fetchData(); }, [planifId, calState]);

  const navigateWeek = (direction: number) => {
    let newWeek = calState.week + direction;
    let newYear = calState.year;
    if (newWeek > 52) { newWeek = 1; newYear++; }
    else if (newWeek < 1) { newWeek = 52; newYear--; }
    setCalState({ week: newWeek, year: newYear });
  };

  const handleScoreChange = async (type: 'objectif' | 'theme', itemId: number, score: number) => {
    const newData = { ...data };
    const list = type === 'objectif' ? newData.objectifs : newData.themes;
    const idx = list.findIndex((i: any) => i.id === itemId);
    if (idx !== -1) {
      list[idx].statut = score;
      setData(newData);
    }

    try {
      await fetch(`https://seme-et-tisse.fr/API/api_volley_seance.php?action=save_seance_score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planif_id: planifId, type, item_id: itemId, score }),
      });
    } catch (e) { console.error(e); }
  };

  const groupedObjectives = data?.objectifs?.reduce((acc: any, obj: any) => {
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
          <span className="badge-cycle">Cycle {data?.currentCycle} / S{data?.currentWeek}</span>
        </div>
      </header>

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

                  {groupedObjectives[secteur].map((obj: any) => {
                    const score = parseInt(obj.statut) || 0;
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
              {data.themes?.map((th: any) => {
                const score = parseInt(th.statut) || 0;
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PreparationSeance;