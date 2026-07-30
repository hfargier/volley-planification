import React, { useState, useEffect, useCallback } from 'react';
import { Users, ArrowRight, Loader2, Calendar, Trash2 } from 'lucide-react';
import './App.css';
import { apiUrl, fetchJson } from './api';
import { showToast } from './toast';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import type { ApiMutationResult, UserData } from './types';

interface TeamPlanif {
  id: number;
  nom: string;          // Nom de la planification (ex: JEUNE_1, MY_PNF)
  nom_equipe: string;   // Libellé de l'équipe (ex: ELITE_F, PNF)
  saison: string;
  niveau?: string;
  date_debut?: string;
  date_creation?: string;
}

// La BDD peut renvoyer '0000-00-00' : invalide pour <input type="date">.
const dateOuVide = (d?: string) =>
  !d || d.startsWith('0000') ? '' : d;

// L'heure est nécessaire : deux copies faites le même jour seraient sinon
// impossibles à distinguer dans la liste.
const formatCreation = (d?: string) => {
  if (!d) return null;
  const parsed = new Date(d.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return null;
  const date = parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const heure = parsed.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} à ${heure}`;
};

interface MesPlanifsProps {
  user: UserData;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
}

const MesPlanifs: React.FC<MesPlanifsProps> = ({ user, onEdit, onView }) => {
  const [planifs, setPlanifs] = useState<TeamPlanif[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Planif en attente de confirmation de suppression (null = fenêtre fermée)
  const [aConfirmer, setAConfirmer] = useState<TeamPlanif | null>(null);

  // Fonction de chargement des planifications
  const fetchMyPlanifs = useCallback(async () => {
    try {
      const data = await fetchJson<TeamPlanif[]>(
        apiUrl('get_equipe_planifs', { coach_id: user.id }, { cacheBust: true }),
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      setPlanifs(Array.isArray(data) ? (data as TeamPlanif[]) : []);
    } catch (err) {
      console.error("Erreur chargement MesPlanifs:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (user?.id) fetchMyPlanifs();
    // Sans coach_id valide, on ne charge rien mais on évite le spinner infini.
    else setLoading(false);
  }, [user?.id, fetchMyPlanifs]);

  const deletePlanif = async (p: TeamPlanif) => {
    const nom = p.nom || p.nom_equipe;
    setDeletingId(p.id);
    try {
      const result = await fetchJson<ApiMutationResult>(apiUrl('delete_planif_equipe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, coach_id: user.id })
      });
      if (result.success) {
        setPlanifs(prev => prev.filter(x => x.id !== p.id));
        setAConfirmer(null);
        showToast('success', `Planification « ${nom} » supprimée.`);
      } else {
        showToast('error', `Suppression refusée : ${result.error ?? 'erreur inconnue'}`);
      }
    } catch (e) {
      console.error("Erreur suppression planif:", e);
      showToast('error', "Suppression impossible (serveur injoignable). Rien n'a été supprimé.");
    } finally {
      setDeletingId(null);
    }
  };

  // Fonction pour sauvegarder la date de début en BDD
  const updateStartDate = async (id: number, date: string) => {
    try {
      const result = await fetchJson<ApiMutationResult>(apiUrl('update_planif_date'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, date_debut: date })
      });
      if (result.success) {
        // Optionnel : On met à jour l'état local pour refléter le changement sans recharger
        setPlanifs(prev => prev.map(p => p.id === id ? { ...p, date_debut: date } : p));
      } else {
        showToast('error', `Date de début non enregistrée : ${result.error ?? 'erreur inconnue'}`);
      }
    } catch (e) {
      console.error("Erreur sauvegarde date:", e);
      showToast('error', "Date de début non enregistrée (serveur injoignable). Le calcul du cycle en cours resterait faux.");
    }
  };

  if (loading) return <div className="loading-state"><Loader2 className="spinner" /> CHARGEMENT...</div>;

  return (
    <div className="bibliotheque-container fade-in">
      <div className="biblio-header">
        <h2 className="biblio-title">📍 MES ÉQUIPES</h2>
      </div>

      <div className="modeles-grid">
        {planifs.length === 0 ? (
          <div className="no-data-box">
            <p>Aucune planification active.</p>
            <small>Copiez un modèle depuis la bibliothèque.</small>
          </div>
        ) : (
          planifs.map((p) => (
            <div key={p.id} className="modele-card-simple planif-card" onClick={() => onView(p.id)}>
              {/* Suppression : hors du flux de clic de la carte */}
              <button
                className="btn-delete-planif"
                title="Supprimer cette planification"
                aria-label={`Supprimer la planification ${p.nom || p.nom_equipe}`}
                disabled={deletingId === p.id}
                onClick={(e) => { e.stopPropagation(); setAConfirmer(p); }}
              >
                {deletingId === p.id ? (
                  <Loader2 size={14} className="spinner" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>

              <div className="modele-card-content">
                <div className="modele-icon-wrapper s-1">
                  <Users size={28} className="text-yellow" />
                </div>
                <div className="modele-info">
                  {/* Nom de la planification : c'est lui qui distingue deux
                      planifs d'une même équipe sur une même saison. */}
                  <h3>{p.nom || p.nom_equipe}</h3>

                  <div className="planif-identity">
                    <span className="planif-team-tag">
                      <Users size={11} /> {p.nom_equipe}
                    </span>
                    <span className="niveau-badge">{p.saison}</span>
                  </div>

                  <div className="team-badges-stack" onClick={(e) => e.stopPropagation()}>
                    {/* INPUT DATE DE DÉBUT DE SAISON */}
                    <div className="start-date-picker-group">
                      <Calendar size={12} className="text-yellow" />
                      <label>DÉBUT :</label>
                      <input
                        type="date"
                        className="input-date-minimal"
                        defaultValue={dateOuVide(p.date_debut)}
                        onBlur={(e) => updateStartDate(p.id, e.target.value)}
                      />
                    </div>
                  </div>

                  {formatCreation(p.date_creation) && (
                    <span className="planif-created">
                      Créée le {formatCreation(p.date_creation)}
                    </span>
                  )}
                </div>
              </div>
              <div className="modele-card-footer">
                <button className="btn-use-model" onClick={(e) => { e.stopPropagation(); onEdit(p.id); }}>
                  MODIFIER MA PLANIFICATION <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {aConfirmer && (
        <ConfirmDeleteModal
          nom={aConfirmer.nom || aConfirmer.nom_equipe}
          equipe={aConfirmer.nom_equipe}
          saison={aConfirmer.saison}
          busy={deletingId === aConfirmer.id}
          onCancel={() => setAConfirmer(null)}
          onConfirm={() => deletePlanif(aConfirmer)}
        />
      )}
    </div>
  );
};

export default MesPlanifs;