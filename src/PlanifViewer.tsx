import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ListCheck, Crosshair, Info, ArrowLeft, Loader2 } from 'lucide-react';
import './App.css';
import { apiUrl, fetchJson } from './api';

interface PlanifViewerProps {
  planifId: number;
  onBack: () => void;
  isTeamPlanif?: boolean;
}

interface ViewerObjectif {
  id: number;
  titre: string;
  description?: string;
  secteur_id: number;
  nom_secteur: string;
}

interface ViewerTheme {
  id: number;
  nom: string;
  nom_secteur: string;
  secteur_id: number;
  sous_themes_selectionnes: string[];
  conseil_coach?: string;
}

interface ViewerSemaine {
  num: number | string;
  themes_details: ViewerTheme[];
}

interface ViewerCycle {
  objectifs_selectionnes: ViewerObjectif[];
  semaines: ViewerSemaine[];
}

interface ViewerData {
  nom: string;
  nom_equipe?: string;
  saison?: string;
  niveau?: string;
  cycles: ViewerCycle[];
  error?: string;
}

interface GroupedObjectifs {
  secteur_id: number;
  nom_secteur: string;
  items: ViewerObjectif[];
}

const PlanifViewer: React.FC<PlanifViewerProps> = ({ planifId, onBack, isTeamPlanif = true }) => {
  const [data, setData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCycleIndex, setActiveCycleIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFullData = async () => {
      setLoading(true);
      try {
        const action = isTeamPlanif ? 'get_full_planif_equipe' : 'get_full_modele';
        const url = apiUrl(action, { id: planifId }, { cacheBust: true });
        const result = await fetchJson<ViewerData>(url);
        if (result && !result.error) setData(result);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (planifId) fetchFullData();
  }, [planifId, isTeamPlanif]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  if (loading) return <div className="loading-state"><Loader2 className="spinner" /></div>;
  if (!data || !data.cycles) return <div className="no-data-box">Données introuvables.</div>;

  const currentCycle = data.cycles[activeCycleIndex];

  // --- LOGIQUE DE REGROUPEMENT DES OBJECTIFS ---
  const groupedObjectifs = currentCycle.objectifs_selectionnes?.reduce<Record<number, GroupedObjectifs>>((acc, obj) => {
    const key = obj.secteur_id;
    if (!acc[key]) {
      acc[key] = {
        secteur_id: obj.secteur_id,
        nom_secteur: obj.nom_secteur,
        items: []
      };
    }
    acc[key].items.push(obj);
    return acc;
  }, {});

  const objectifsSecteurs = Object.values(groupedObjectifs || {});

  return (
    <div className="viewer-container fade-in">
      {/* HEADER : Adapté Mobile */}
      <header className="viewer-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <button className="nav-pill" onClick={onBack}><ArrowLeft size={18} /> RETOUR</button>
          <div className="viewer-title-area">
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{data.nom_equipe || "PLANIFICATION"}</h1>
            <p className="text-dim" style={{ margin: 0, fontSize: '0.8rem' }}>{data.nom} — {data.saison || data.niveau}</p>
          </div>
        </div>
      </header>

      {/* NAVIGATION CYCLES */}
      <div className="tabs-wrapper">
        <button className="nav-arrow left" onClick={() => scroll('left')}><ChevronLeft size={20} /></button>
        <div className="cycles-nav-tabs" ref={scrollRef}>
          {data.cycles.map((_, idx: number) => (
            <button 
              key={idx} 
              className={`cycle-tab-btn ${activeCycleIndex === idx ? 'active' : ''}`} 
              onClick={() => setActiveCycleIndex(idx)}
            >
              <span className="tab-index">CYCLE {idx + 1}</span>
            </button>
          ))}
        </div>
        <button className="nav-arrow right" onClick={() => scroll('right')}><ChevronRight size={20} /></button>
      </div>

      <div className="viewer-content-layout">
        
        {/* SYNTHÈSE DES OBJECTIFS GROUPÉS */}
        <section className="viewer-section" style={{ marginBottom: '30px' }}>
            <h2 className="section-title"><Crosshair size={22} className="text-yellow" /> OBJECTIFS DU CYCLE <Crosshair size={22} className="text-yellow" /></h2>
          <div className="objectifs-by-sector-container">
            {objectifsSecteurs.map((group, idx: number) => (
              <div key={idx} className={`obj-group-card s-border-${group.secteur_id}`}>
                <span className={`mini-secteur-label s-${group.secteur_id}`}>
                  {group.nom_secteur}
                </span>
                <div >
                  {group.items.map((item, i: number) => (
                    <div key={i} className="obj-group-item">
                      <strong>• {item.titre}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DÉTAIL DES SEMAINES (Une par ligne) */}
        <section className="viewer-section">
          <h2 className="section-title"><ListCheck size={22} className="text-yellow" /> DÉTAIL DES SEMAINES <ListCheck size={22} className="text-yellow" /></h2>
          <div className="weeks-vertical-list">
            {[1, 2, 3].map((numSem) => {
              const semaine = currentCycle.semaines?.find((s) => Number(s.num) === numSem);
              const mainSecteurId = semaine?.themes_details?.[0]?.secteur_id || 0;

              return (
                <div key={numSem} className={`week-full-row s-border-${mainSecteurId}`}>
<div className="week-sidebar-vertical">
  <div className="week-label-letters">
    <span>S</span><span>E</span><span>M</span><span>A</span><span>I</span><span>N</span><span>E</span>
  </div>
  <div className="week-num-large">{numSem}</div>
</div>
                  <div className="week-main-content">
                    {semaine?.themes_details?.map((th, tIdx: number) => {
                      const objectifLie = currentCycle.objectifs_selectionnes?.find((o) => o.secteur_id === th.secteur_id);

                      return (
                        <div key={tIdx} className={`theme-viewer-detail-card s-border-${th.secteur_id}`}>
                          <div className="theme-name-row">
                            <span className={`mini-secteur-label s-${th.secteur_id}`}>{th.nom_secteur}</span>
                            <strong className="theme-title">{th.nom}</strong>
                          </div>

                          {objectifLie?.description && (
                            <div className="obj-detail-reminder">
                              <p>{objectifLie.description}</p>
                            </div>
                          )}

                          <div className="viewer-subthemes-list">
                            {th.sous_themes_selectionnes?.map((st: string, idx: number) => (
                              <span key={idx} className="subtheme-pill">{st}</span>
                            ))}
                          </div>

                          {th.conseil_coach && (
                            <div className="coach-advice-box">
                              <Info size={14} />
                              <div className="advice-content">
                                <strong>CONSEIL COACH :</strong>
                                <p>{th.conseil_coach}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlanifViewer;