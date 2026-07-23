import React, { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, Copy, X, Check } from 'lucide-react';
import './App.css';

interface ModeleListe {
  id: number;
  nom: string;
  niveau: string;
}

interface Team {
  id: number;
  name: string;
}

interface BibliothequeProps {
  onEdit: (id: number) => void;
  onView: (id: number) => void;
  onCreateNew: () => void;
  user: any; 
  mode?: 'admin' | 'viewer'; 
}

const Bibliotheque: React.FC<BibliothequeProps> = ({ onEdit, onView, onCreateNew, user, mode }) => {
  const [modeles, setModeles] = useState<ModeleListe[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showSelectorId, setShowSelectorId] = useState<number | null>(null);

  const getAvailableSaisons = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month < 8 ? year - 1 : year;
    return [`${startYear}-${startYear + 1}`, `${startYear + 1}-${startYear + 2}`];
  };

  const saisons = getAvailableSaisons();
 // const [selectedSaison, setSelectedSaison] = useState<string>(saisons[0]);
 const selectedSaison = saisons[0]; // On garde la valeur, on vire le setter
 
  const isEffectiveAdmin = user?.role === 'admin' && mode !== 'viewer';

  useEffect(() => {
    fetchModeles();
    fetchMyTeams();
  }, [user.id]);

  const fetchModeles = async () => {
    setLoading(true);
    try {
      // CACHE BUSTER OBLIGATOIRE : t=timestamp
      const res = await fetch(`https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_modeles_liste&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const data = await res.json();
      console.log("Bibliothèque - Modèles reçus:", data);
      setModeles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur API Modèles:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    try {
      const res = await fetch(`https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_coach_teams&coach_id=${user.id}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      setMyTeams(data);
      if (data && data.length > 0) setSelectedTeam(data[0].id.toString());
    } catch (err) {
      console.error("Erreur API Teams:", err);
    }
  };

  const handleDuplicate = async (modeleId: number) => {
    if (!selectedTeam) return alert("Veuillez sélectionner une équipe.");
    try {
      const res = await fetch('https://seme-et-tisse.fr/API/api_volley_seance.php?action=duplicate_to_team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modele_id: modeleId,
          equipe_id: parseInt(selectedTeam),
          saison: selectedSaison,
          coach_id: user.id
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("✅ Planification copiée !");
        setShowSelectorId(null);
      }
    } catch (err) { console.error(err); }
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
                      <select className="studio-level-select" style={{width: '100%', marginBottom: '10px'}} value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
                        {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <div style={{display: 'flex', gap: '5px'}}>
                        <button className="btn-premium-yellow" style={{flex: 1}} onClick={() => handleDuplicate(m.id)}><Check size={16} /></button>
                        <button className="btn-premium-grey" onClick={() => setShowSelectorId(null)}><X size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-use-model" onClick={() => setShowSelectorId(m.id)}><Copy size={16} /> UTILISER</button>
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