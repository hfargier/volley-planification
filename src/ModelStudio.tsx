import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Square,
  ChevronRight,
  Volleyball,
  Target,
  Check,
  Loader2,
} from 'lucide-react';
import './App.css';

interface Secteur {
  id: number;
  nom: string;
  code: string;
}
interface SousTheme {
  id: number;
  nom_sous_theme: string;
}
interface ThemeComplet {
  id: number;
  nom_theme: string;
  conseils: string[];
  sous_themes: SousTheme[];
  secteur_id: number;
  secteur_code: string;
}
interface ThemeChoisi {
  id: number;
  nom: string;
  secteur_id: number;
  sous_themes_dispo: SousTheme[];
  sous_themes_selectionnes: number[];
}
interface Semaine {
  num: number;
  themes_details: ThemeChoisi[];
}
interface ObjectifBDD {
  id: number;
  titre: string;
  description: string;
  secteur_id: number;
  secteur_code: string;
}
interface Cycle {
  id: string;
  ordre: number;
  secteur_ids: number[];
  objectifs_selectionnes: ObjectifBDD[];
  semaines: Semaine[];
  themes_disponibles: ThemeComplet[];
  objectifs_disponibles: ObjectifBDD[];
  activeWeek: number;
  isValidated: boolean;
}

interface ModelStudioProps {
  modeleId?: number | null;
  onSaveSuccess?: () => void;
  isTeamPlanif?: boolean;
}

const ModelStudio: React.FC<ModelStudioProps> = ({
  modeleId,
  onSaveSuccess,
  isTeamPlanif = false,
}) => {
  const [modelName, setModelName] = useState('CHARGEMENT...');
  const [niveau, setNiveau] = useState('débutant');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [listeSecteurs, setListeSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(false);
  const userData = JSON.parse(localStorage.getItem('coachData') || '{}');

  // 1. Chargement Secteurs
  // 1. Chargement initial : Secteurs ET Données du modèle
  // 1. Chargement initial : Secteurs ET Données du modèle
  // 1. Chargement initial : Secteurs ET Données du modèle
  useEffect(() => {
    const initStudio = async () => {
      console.log('Studio - Initialisation avec modeleId:', modeleId);
      setLoading(true);
      try {
        // A. Charger les secteurs
        const resSec = await fetch(
          `https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_secteurs&t=${Date.now()}`
        );
        const secteurs = await resSec.json();

        if (Array.isArray(secteurs)) {
          setListeSecteurs(secteurs);
          console.log('Studio - Secteurs chargés:', secteurs.length);

          if (modeleId) {
            console.log('Studio - Lancement loadFullData pour ID:', modeleId);
            await loadFullData(modeleId, secteurs);
          } else {
            console.log('Studio - Mode création (Reset)');
            setModelName('');
            setNiveau('débutant');
            setCycles([]);
          }
        } else {
          console.error('Studio - Format secteurs invalide:', secteurs);
        }
      } catch (err) {
        console.error('Studio - Erreur FATALE initialisation:', err);
      } finally {
        setLoading(false);
      }
    };

    initStudio();
  }, [modeleId]);

  // 2. Fonction de chargement du modèle complet
  const loadFullData = async (id: number, secteursActuels: Secteur[]) => {
    try {
      const action = isTeamPlanif
        ? 'get_full_planif_equipe'
        : 'get_full_modele';
      const url = `https://seme-et-tisse.fr/API/api_volley_seance.php?action=${action}&id=${id}&t=${Date.now()}`;
      console.log('Studio - Fetching URL:', url);

      const response = await fetch(url);
      const data = await response.json();
      console.log('Studio - Données brutes reçues:', data);

      if (data && !data.error) {
        setModelName(isTeamPlanif ? data.nom_equipe || data.nom : data.nom);
        setNiveau(data.niveau || 'débutant');

        if (!data.cycles || !Array.isArray(data.cycles)) {
          console.warn('Studio - Aucun cycle trouvé dans les données');
          setCycles([]);
          return;
        }

        const formattedCycles = await Promise.all(
          data.cycles.map(async (c: any) => {
            // On s'assure que les secteur_ids sont un tableau
            let sIds: number[] = [];
            try {
              sIds =
                typeof c.secteur_ids === 'string'
                  ? JSON.parse(c.secteur_ids)
                  : c.secteur_ids || [];
            } catch (e) {
              sIds = [];
            }

            console.log(
              `Studio - Traitement Cycle ${c.ordre}, Secteurs:`,
              sIds
            );

            // Récupération des options disponibles pour ce cycle
            const { objectifs, themes } = await loadCombinedData(
              sIds,
              secteursActuels
            );

            return {
              ...c,
              id: c.id.toString(),
              secteur_ids: sIds,
              objectifs_disponibles: objectifs || [],
              themes_disponibles: themes || [],
              activeWeek: 1,
              isValidated: true,
              objectifs_selectionnes: c.objectifs_selectionnes || [],
              semaines: (c.semaines || []).map((s: any) => ({
                ...s,
                themes_details: (s.themes_details || []).map((t: any) => ({
                  ...t,
                  sous_themes_dispo:
                    themes.find((td: any) => td.id === t.id)?.sous_themes || [],
                  sous_themes_selectionnes: Array.isArray(
                    t.sous_themes_selectionnes
                  )
                    ? t.sous_themes_selectionnes
                    : [],
                })),
              })),
            };
          })
        );

        console.log('Studio - Cycles formattés prêts:', formattedCycles);
        setCycles(formattedCycles);
      } else {
        console.error('Studio - Erreur API ou donnée vide:', data?.error);
      }
    } catch (e) {
      console.error('Studio - Erreur loadFullData:', e);
    }
  };

  // 3. Fonction de récupération des thèmes/objectifs par secteurs
  const loadCombinedData = async (
    secteurIds: number[],
    secteursActuels: Secteur[]
  ) => {
    let allObj: ObjectifBDD[] = [];
    let allThemes: ThemeComplet[] = [];

    for (const sId of secteurIds) {
      const currentSecteur = secteursActuels.find((s) => s.id === sId);
      try {
        const [resObj, resThemes] = await Promise.all([
          fetch(
            `https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_objectifs_pedago&secteur_id=${sId}&t=${Date.now()}`
          ),
          fetch(
            `https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_themes_complet&secteur_id=${sId}&t=${Date.now()}`
          ),
        ]);

        const obj = await resObj.json();
        const themes = await resThemes.json();

        allObj = [
          ...allObj,
          ...(Array.isArray(obj) ? obj : []).map((o) => ({
            ...o,
            secteur_id: sId,
            secteur_code: currentSecteur?.code,
          })),
        ];

        allThemes = [
          ...allThemes,
          ...(Array.isArray(themes) ? themes : []).map((t) => ({
            ...t,
            secteur_id: sId,
            secteur_code: currentSecteur?.code,
          })),
        ];
      } catch (e) {
        console.error(`Studio - Erreur secteur ${sId}:`, e);
      }
    }
    return { objectifs: allObj, themes: allThemes };
  };

  // 4. Gestion des clics secteurs
  const handleSecteurToggle = async (cycleId: string, secteurId: number) => {
    const cycle = cycles.find((c) => c.id === cycleId);
    if (!cycle) return;

    const isSelected = cycle.secteur_ids.includes(secteurId);
    const newIds = isSelected
      ? cycle.secteur_ids.filter((id) => id !== secteurId)
      : [...cycle.secteur_ids, secteurId];

    setLoading(true);
    const { objectifs, themes } = await loadCombinedData(newIds, listeSecteurs);

    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              secteur_ids: newIds,
              objectifs_disponibles: objectifs,
              themes_disponibles: themes,
              objectifs_selectionnes: c.objectifs_selectionnes.filter((o) =>
                newIds.includes(o.secteur_id)
              ),
            }
          : c
      )
    );
    setLoading(false);
  };

  const saveFullCursus = async () => {
    // SÉCURITÉ : Seul l'admin peut modifier un modèle MASTER
    if (!isTeamPlanif && userData.role !== 'admin') {
      alert('Droit refusé : Vous ne pouvez pas modifier un modèle Master.');
      return;
    }
    setLoading(true);
    const action = isTeamPlanif ? 'save_planif_equipe' : 'save_modele';
    const payload = {
      id: modeleId,
      nom: modelName,
      niveau: niveau,
      coach_id: userData.id, // Ajout de l'ID du coach
      cycles: cycles.map((c) => ({
        id: c.id, // Important pour l'update
        secteur_ids: c.secteur_ids,
        ordre: c.ordre,
        objectifs: c.objectifs_selectionnes.map((o) => o.id),
        semaines: c.semaines.map((s) => ({
          num: s.num,
          themes: s.themes_details.map((t) => ({
            id: t.id,
            sous_themes: t.sous_themes_selectionnes,
          })),
        })),
      })),
    };

    try {
      const res = await fetch(
        `https://seme-et-tisse.fr/API/api_volley_seance.php?action=${action}&t=${Date.now()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (result.success) {
        alert('✅ Enregistrement réussi !');
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ... (Garder toggleThemeInWeek, toggleSousTheme et addCycle identiques)

  const addCycle = () => {
    setCycles([
      ...cycles.map((c) => ({ ...c, isValidated: true })),
      {
        id: 'new_' + Date.now(),
        ordre: cycles.length + 1,
        secteur_ids: [],
        objectifs_selectionnes: [],
        objectifs_disponibles: [],
        themes_disponibles: [],
        activeWeek: 1,
        isValidated: false,
        semaines: [1, 2, 3].map((n) => ({ num: n, themes_details: [] })),
      },
    ]);
  };

  const toggleThemeInWeek = (
    cycleId: string,
    weekNum: number,
    themeData: ThemeComplet
  ) => {
    setCycles((prev) =>
      prev.map((c) => {
        if (c.id !== cycleId) return c;
        return {
          ...c,
          semaines: c.semaines.map((s) => {
            if (s.num !== weekNum) return s;
            const exists = s.themes_details.find((t) => t.id === themeData.id);
            return {
              ...s,
              themes_details: exists
                ? s.themes_details.filter((t) => t.id !== themeData.id)
                : [
                    ...s.themes_details,
                    {
                      id: themeData.id,
                      nom: themeData.nom_theme,
                      secteur_id: themeData.secteur_id,
                      sous_themes_dispo: themeData.sous_themes || [],
                      sous_themes_selectionnes:
                        themeData.sous_themes?.length === 1
                          ? [themeData.sous_themes[0].id]
                          : [],
                    },
                  ],
            };
          }),
        };
      })
    );
  };

  const toggleSousTheme = (
    cycleId: string,
    weekNum: number,
    themeId: number,
    stId: number
  ) => {
    setCycles((prev) =>
      prev.map((c) => {
        if (c.id !== cycleId) return c;
        return {
          ...c,
          semaines: c.semaines.map((s) => {
            if (s.num !== weekNum) return s;
            return {
              ...s,
              themes_details: s.themes_details.map((t) => {
                if (t.id !== themeId) return t;
                const stExists = t.sous_themes_selectionnes.includes(stId);
                return {
                  ...t,
                  sous_themes_selectionnes: stExists
                    ? t.sous_themes_selectionnes.filter((id) => id !== stId)
                    : [...t.sous_themes_selectionnes, stId],
                };
              }),
            };
          }),
        };
      })
    );
  };

  if (loading && cycles.length === 0)
    return (
      <div className="loading-state">
        <Loader2 className="spinner" size={40} /> CHARGEMENT...
      </div>
    );

  return (
    <div className="studio-main-container fade-in">
      <header className="studio-header-bar">
        <div className="header-inputs-group">
          {/* BADGE DE CONTEXTE */}
          <span className="badge-cycle" style={{ marginRight: '10px' }}>
            {isTeamPlanif ? 'MODIF PLANIF EQUIPE' : 'MODIF PLANIF MODELE'}
          </span>
          <input
            className="studio-title-input"
            value={modelName}
            onChange={(e) => setModelName(e.target.value.toUpperCase())}
            placeholder="NOM DE L'EQUIPE"
          />
          <div className="header-sub-inputs">
            <select
              className="studio-level-select"
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
            >
              <option value="débutant">DÉBUTANT</option>
              <option value="intermédiaire">INTERMÉDIAIRE</option>
              <option value="confirmé">CONFIRMÉ</option>
            </select>
          </div>
        </div>
        <button className="btn-premium-yellow" onClick={addCycle}>
          <Plus size={20} /> AJOUTER UN CYCLE
        </button>
      </header>

      <main className="studio-content-scroll">
        {cycles.map((cycle) => {
          const mainSecteur = cycle.secteur_ids[0] || 0;
          return (
            <div key={cycle.id} className="cycle-item-container">
              {!cycle.isValidated ? (
                <div
                  className={`edition-card-premium s-border-${mainSecteur} fade-in`}
                >
                  <div className="edition-cycle-header">
                    <span className="cycle-index">
                      CONFIGURATION CYCLE {cycle.ordre}
                    </span>
                    <button
                      className="btn-delete-minimal"
                      onClick={() =>
                        setCycles(cycles.filter((c) => c.id !== cycle.id))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="studio-section">
                    <div className="section-title-centered">
                      <Volleyball size={20} className="text-yellow" /> SECTEURS
                      DE TRAVAIL
                      <Volleyball size={20} className="text-yellow" />
                    </div>
                    <div className="secteurs-pills-container">
                      {listeSecteurs.map((s) => {
                        const isSelected = cycle.secteur_ids.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            className={`secteur-pill-btn ${
                              isSelected ? 'active' : ''
                            } ${isSelected ? `s-bg-${s.id}` : ''}`}
                            onClick={() => handleSecteurToggle(cycle.id, s.id)}
                          >
                            {s.nom}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {cycle.secteur_ids?.map((sId) => {
                    const secteur = listeSecteurs.find((s) => s.id === sId);
                    const objectifsSecteur =
                      cycle.objectifs_disponibles?.filter(
                        (o) => o.secteur_id === sId
                      ) || [];
                    if (objectifsSecteur.length === 0) return null;
                    return (
                      <div
                        key={sId}
                        className={`obj-group-card s-border-${sId} fade-in`}
                      >
                        <span className={`mini-secteur-label s-${sId}`}>
                          {secteur?.nom}
                        </span>
                        <div className="obj-group-list">
                          {objectifsSecteur.map((obj) => {
                            const isActive = cycle.objectifs_selectionnes.some(
                              (o) => o.id === obj.id
                            );
                            return (
                              <div
                                key={obj.id}
                                className={`obj-group-item-clickable ${
                                  isActive ? 'active' : ''
                                }`}
                                onClick={() => {
                                  const newSel = isActive
                                    ? cycle.objectifs_selectionnes.filter(
                                        (o) => o.id !== obj.id
                                      )
                                    : [...cycle.objectifs_selectionnes, obj];
                                  setCycles((prev) =>
                                    prev.map((c) =>
                                      c.id === cycle.id
                                        ? {
                                            ...c,
                                            objectifs_selectionnes: newSel,
                                          }
                                        : c
                                    )
                                  );
                                }}
                              >
                                {isActive ? (
                                  <CheckSquare
                                    size={16}
                                    className="text-yellow"
                                  />
                                ) : (
                                  <Square size={16} className="text-dim" />
                                )}
                                <span>{obj.titre}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="studio-section">
                    <div className="section-title-centered">
                      <Target size={20} className="text-yellow" />{' '}
                      <span>PLANIFICATION DES SÉANCES</span>
                    </div>
                    <div className="weeks-vertical-list">
                      {[1, 2, 3].map((numSem) => {
                        const semaine = cycle.semaines.find(
                          (s) => s.num === numSem
                        );
                        const mainSecteurId =
                          semaine?.themes_details[0]?.secteur_id || 0;
                        return (
                          <div
                            key={numSem}
                            className={`week-full-row s-border-${mainSecteurId} studio-week-editor`}
                          >
                            <div className="week-sidebar-vertical">
                              <div className="week-label-letters">
                                <span>S</span>
                                <span>E</span>
                                <span>M</span>
                                <span>A</span>
                                <span>I</span>
                                <span>N</span>
                                <span>E</span>
                              </div>
                              <div className="week-num-large">{numSem}</div>
                            </div>
                            <div className="week-main-content">
                              {semaine?.themes_details.map((th, tIdx) => (
                                <div
                                  key={tIdx}
                                  className={`theme-viewer-detail-card s-border-${th.secteur_id} studio-theme-card-edit`}
                                >
                                  <div className="theme-name-row">
                                    <span
                                      className={`mini-secteur-label s-${th.secteur_id}`}
                                    >
                                      {
                                        listeSecteurs.find(
                                          (ls) => ls.id === th.secteur_id
                                        )?.nom
                                      }
                                    </span>
                                    <strong className="theme-title">
                                      {th.nom}
                                    </strong>
                                    <button
                                      className="btn-remove-theme"
                                      onClick={() =>
                                        toggleThemeInWeek(
                                          cycle.id,
                                          numSem,
                                          cycle.themes_disponibles.find(
                                            (td) => td.id === th.id
                                          )!
                                        )
                                      }
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div className="viewer-subthemes-list-edit">
                                    {th.sous_themes_dispo?.map((st) => {
                                      const isStActive =
                                        th.sous_themes_selectionnes.includes(
                                          st.id
                                        );
                                      return (
                                        <button
                                          key={st.id}
                                          className={`subtheme-pill-edit ${
                                            isStActive ? 'active' : ''
                                          }`}
                                          onClick={() =>
                                            toggleSousTheme(
                                              cycle.id,
                                              numSem,
                                              th.id,
                                              st.id
                                            )
                                          }
                                        >
                                          {isStActive ? (
                                            <CheckSquare size={12} />
                                          ) : (
                                            <Plus size={12} />
                                          )}
                                          {st.nom_sous_theme}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}

                              <div className="add-themes-actions">
                                {cycle.secteur_ids?.map((sId) => (
                                  <div key={sId} className="secteur-add-block">
                                    <div
                                      className="secteur-add-label"
                                      style={{ color: `var(--s-${sId}-color)` }}
                                    >
                                      {
                                        listeSecteurs.find((s) => s.id === sId)
                                          ?.nom
                                      }
                                    </div>
                                    <div className="add-themes-grid">
                                      {cycle.themes_disponibles
                                        ?.filter((t) => t.secteur_id === sId)
                                        .map((tData) => {
                                          const isPicked =
                                            semaine?.themes_details.some(
                                              (td) => td.id === tData.id
                                            );
                                          return (
                                            <button
                                              key={tData.id}
                                              className={`theme-pick-btn ${
                                                isPicked ? 'active' : ''
                                              }`}
                                              onClick={() =>
                                                toggleThemeInWeek(
                                                  cycle.id,
                                                  numSem,
                                                  tData
                                                )
                                              }
                                            >
                                              {tData.nom_theme}
                                            </button>
                                          );
                                        })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cycle-action-footer">
                    <button
                      className="btn-validate-cycle"
                      onClick={() =>
                        setCycles(
                          cycles.map((c) =>
                            c.id === cycle.id ? { ...c, isValidated: true } : c
                          )
                        )
                      }
                    >
                      <Check size={18} /> VALIDER LE CYCLE {cycle.ordre}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`cycle-summary-card s-border-${mainSecteur} fade-in`}
                  onClick={() =>
                    setCycles(
                      cycles.map((c) =>
                        c.id === cycle.id ? { ...c, isValidated: false } : c
                      )
                    )
                  }
                >
                  <div className="summary-left-side">
                    <div className="summary-content-text">
                      <span className="summary-badge">CYCLE {cycle.ordre}</span>
                      <h3 className="summary-title">
                        {listeSecteurs
                          .filter((ls) => cycle.secteur_ids.includes(ls.id))
                          .map((s) => s.nom)
                          .join(' + ') || 'VIDE'}
                      </h3>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-yellow" />
                </div>
              )}
            </div>
          );
        })}
      </main>
      <footer className="studio-footer-floating">
        <button
          className="btn-save-full-premium"
          onClick={saveFullCursus}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="spinner" size={20} />
          ) : (
            <Save size={20} />
          )}
          ENREGISTRER TOUTE LA PLANIFICATION
        </button>
      </footer>
    </div>
  );
};

export default ModelStudio;
