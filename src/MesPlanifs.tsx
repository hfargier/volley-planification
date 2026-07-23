import React, { useState, useEffect } from 'react';
import { Users, ArrowRight, Loader2, Calendar } from 'lucide-react';
import './App.css';

const MesPlanifs: React.FC<any> = ({ user, onEdit, onView }) => {
  const [planifs, setPlanifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fonction de chargement des planifications
  const fetchMyPlanifs = async () => {
    try {
      const response = await fetch(
        `https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_equipe_planifs&coach_id=${user.id}&t=${Date.now()}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      const data = await response.json();
      setPlanifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement MesPlanifs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchMyPlanifs();
  }, [user.id]);

  // Fonction pour sauvegarder la date de début en BDD
  const updateStartDate = async (id: number, date: string) => {
    try {
      const res = await fetch(`https://seme-et-tisse.fr/API/api_volley_seance.php?action=update_planif_date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, date_debut: date })
      });
      const result = await res.json();
      if (result.success) {
        // Optionnel : On met à jour l'état local pour refléter le changement sans recharger
        setPlanifs(prev => prev.map(p => p.id === id ? { ...p, date_debut: date } : p));
      }
    } catch (e) {
      console.error("Erreur sauvegarde date:", e);
    }
  };

  if (loading) return <div className="loading-state"><Loader2 className="spinner" /> CHARGEMENT...</div>;

  return (
    <div className="bibliotheque-container fade-in">
      <div className="biblio-header">
        <h2 className="biblio-title">📍 MON ÉQUIPE</h2>
      </div>

      <div className="modeles-grid">
        {planifs.length === 0 ? (
          <div className="no-data-box">
            <p>Aucune planification active.</p>
            <small>Copiez un modèle depuis la bibliothèque.</small>
          </div>
        ) : (
          planifs.map((p: any) => (
            <div key={p.id} className="modele-card-simple" onClick={() => onView(p.id)}>
              <div className="modele-card-content">
                <div className="modele-icon-wrapper s-1">
                  <Users size={28} className="text-yellow" />
                </div>
                <div className="modele-info">
                  <h3>{p.nom_equipe}</h3>
                  
                  
                  <div className="team-badges-stack" onClick={(e) => e.stopPropagation()}>
                    <span className="niveau-badge">{p.saison}</span>
                    
                    {/* INPUT DATE DE DÉBUT DE SAISON */}
                    <div className="start-date-picker-group">
                      <Calendar size={12} className="text-yellow" />
                      <label>DÉBUT :</label>
                      <input 
                        type="date" 
                        className="input-date-minimal"
                        defaultValue={p.date_debut || ''}
                        onBlur={(e) => updateStartDate(p.id, e.target.value)}
                      />
                    </div>
                  </div>
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
    </div>
  );
};

export default MesPlanifs;