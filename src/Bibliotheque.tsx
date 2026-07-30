import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Loader2, Copy, X, Check, Users, CalendarDays, Pencil } from 'lucide-react';
import './App.css';
import { apiUrl, fetchJson } from './api';
import { showToast } from './toast';
import type { ApiMutationResult, UserData } from './types';

interface ModeleListe {
  id: number;
  nom: string;
  niveau: string;
}

interface Team {
  id: number;
  name: string;
}

// duplicate_to_team renvoie l'id de la planification créée.
interface DuplicateResult extends ApiMutationResult {
  id?: number | string;
}

interface BibliothequeProps {
  onEdit: (id: number) => void;
  onView: (id: number) => void;
  onCreateNew: () => void;
  user: UserData;
  mode?: 'admin' | 'viewer';
}

const saisonLabel = (startYear: number) => `${startYear}-${startYear + 1}`;

// Une saison démarre en août : avant août, on est encore sur celle entamée
// l'année civile précédente.
const getSaisonStartYear = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month < 8 ? now.getFullYear() - 1 : now.getFullYear();
};

// On propose la saison précédente (saisie tardive), la courante et la suivante.
const getAvailableSaisons = () => {
  const start = getSaisonStartYear();
  return [saisonLabel(start - 1), saisonLabel(start), saisonLabel(start + 1)];
};

// En juin/juillet la saison est terminée : par défaut le coach prépare la suivante.
const getDefaultSaison = () => {
  const start = getSaisonStartYear();
  const month = new Date().getMonth() + 1;
  const isIntersaison = month === 6 || month === 7;
  return saisonLabel(isIntersaison ? start + 1 : start);
};

const Bibliotheque: React.FC<BibliothequeProps> = ({ onEdit, onView, onCreateNew, user, mode }) => {
  const [modeles, setModeles] = useState<ModeleListe[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showSelectorId, setShowSelectorId] = useState<number | null>(null);
  const [planifName, setPlanifName] = useState<string>("");

  const saisons = getAvailableSaisons();
  const [selectedSaison, setSelectedSaison] = useState<string>(() =>
    getDefaultSaison()
  );

  const isEffectiveAdmin = user?.role === 'admin' && mode !== 'viewer';

  const fetchModeles = useCallback(async () => {
    setLoading(true);
    try {
      // CACHE BUSTER OBLIGATOIRE : t=timestamp
      const data = await fetchJson<ModeleListe[]>(apiUrl('get_modeles_liste', {}, { cacheBust: true }), {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      setModeles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur API Modèles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyTeams = useCallback(async () => {
    try {
      const data = await fetchJson<Team[]>(apiUrl('get_coach_teams', { coach_id: user.id }, { cacheBust: true }), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const teams = Array.isArray(data) ? data : [];
      setMyTeams(teams);
      if (teams.length > 0) setSelectedTeam(teams[0].id.toString());
    } catch (err) {
      console.error("Erreur API Teams:", err);
    }
  }, [user.id]);

  useEffect(() => {
    fetchModeles();
    fetchMyTeams();
  }, [fetchModeles, fetchMyTeams]);

  // Le nom de la planif reprend par défaut celui du modèle : c'est la valeur
  // que le serveur utilise, le coach peut ensuite la personnaliser.
  const openCopyPanel = (modele: ModeleListe) => {
    setShowSelectorId(modele.id);
    setPlanifName(modele.nom);
  };

  const handleDuplicate = async (modele: ModeleListe) => {
    if (!selectedTeam) {
      showToast('error', "Veuillez sélectionner une équipe.");
      return;
    }
    const nom = planifName.trim();
    if (!nom) {
      showToast('error', "Le nom de la planification ne peut pas être vide.");
      return;
    }
    try {
      const result = await fetchJson<DuplicateResult>(apiUrl('duplicate_to_team'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modele_id: modele.id,
          equipe_id: parseInt(selectedTeam),
          saison: selectedSaison,
          coach_id: user.id
        })
      });

      if (!result.success) {
        showToast('error', `Copie refusée : ${result.error ?? 'erreur inconnue'}`);
        return;
      }

      // duplicate_to_team nomme toujours la copie d'après le modèle : on
      // applique ensuite le nom choisi. On omet volontairement "cycles" pour
      // que save_planif_equipe ne réécrive pas les cycles fraîchement copiés.
      const newId = result.id != null ? Number(result.id) : null;
      if (newId && nom !== modele.nom) {
        const renamed = await fetchJson<ApiMutationResult>(apiUrl('save_planif_equipe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newId, nom, niveau: modele.niveau })
        });
        if (!renamed.success) {
          showToast(
            'error',
            `Planification créée mais nommée « ${modele.nom} » : le renommage a échoué. Renommez-la depuis « Modifier ma planification ».`
          );
          setShowSelectorId(null);
          return;
        }
      }

      showToast('success', `Planification « ${nom} » copiée (${selectedSaison}).`);
      setShowSelectorId(null);
    } catch (err) {
      console.error(err);
      showToast('error', "Copie impossible (serveur injoignable). Vérifiez dans « Mes équipes » si la planification a été créée.");
    }
  };

  if (loading) return <div className="loading-state"><Loader2 className="spinner" /> <span>Chargement...</span></div>;

  return (
    <div className="bibliotheque-container fade-in" style={{padding: '20px'}}>
      <div className="biblio-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '30px'}}>
        <h2 className="biblio-title">{isEffectiveAdmin ? "Catalogue Master" : "Modèles Disponibles"}</h2>
        {isEffectiveAdmin && (
          <button className="btn-premium-yellow" onClick={onCreateNew}><Plus size={18} /> NOUVEAU MODÈLE</button>
        )}
      </div>

      <div className="modeles-grid">
        {modeles.length === 0 ? (
          <div className="no-data-box">Aucun modèle disponible dans le catalogue.</div>
        ) : (
          modeles.map((m) => (
            <div key={m.id} className="modele-card-simple">
              <div className="modele-card-content" onClick={() => isEffectiveAdmin ? onEdit(m.id) : onView(m.id)}>
                <div className="modele-icon-wrapper"><FileText size={28} className="text-yellow" /></div>
                <div className="modele-info">
                  <h3>{m.nom}</h3>
                  <span className={`niveau-badge niveau-${m.niveau?.toLowerCase()}`}>{m.niveau}</span>
                </div>
              </div>
              <div className="modele-card-footer">
                {!isEffectiveAdmin && (
                  showSelectorId === m.id ? (
                    <div className="team-selector-premium">
                      <div className="copy-field">
                        <label className="copy-field-label">
                          <Users size={12} /> ÉQUIPE
                        </label>
                        <select
                          className="copy-select"
                          value={selectedTeam}
                          onChange={(e) => setSelectedTeam(e.target.value)}
                        >
                          {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div className="copy-field">
                        <label className="copy-field-label">
                          <Pencil size={12} /> NOM DE LA PLANIFICATION
                        </label>
                        <input
                          type="text"
                          className="copy-input"
                          value={planifName}
                          placeholder="Ex : ELITE F 2026-2027"
                          onChange={(e) => setPlanifName(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="copy-field">
                        <label className="copy-field-label">
                          <CalendarDays size={12} /> SAISON
                        </label>
                        <select
                          className="copy-select"
                          value={selectedSaison}
                          onChange={(e) => setSelectedSaison(e.target.value)}
                        >
                          {saisons.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="copy-actions">
                        <button className="btn-copy-confirm" onClick={() => handleDuplicate(m)}>
                          <Check size={16} /> COPIER
                        </button>
                        <button
                          className="btn-copy-cancel"
                          onClick={() => setShowSelectorId(null)}
                          title="Annuler"
                          aria-label="Annuler"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-use-model" onClick={() => openCopyPanel(m)}><Copy size={16} /> UTILISER</button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Bibliotheque;