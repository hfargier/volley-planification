import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2,  
  Target, Volleyball, Lightbulb, Loader2, Info, MessageSquare 
} from 'lucide-react';
import './App.css';

const MasterAdmin: React.FC = () => {
  const [secteurs, setSecteurs] = useState<any[]>([]);
  const [selectedSecteur, setSelectedSecteur] = useState<any>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<number | null>(null);
  const [selectedSubThemeId, setSelectedSubThemeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Synchronisation des états lors du rafraîchissement des données
  const fetchData = async () => {
    setLoading(true);
    try {
      const url = `https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_admin_full_data&t=${Date.now()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSecteurs(data);
        if (selectedSecteur) {
          const updatedS = data.find(s => s.id === selectedSecteur.id);
          setSelectedSecteur(updatedS || null);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (table: string, item: any) => {
    try {
      const res = await fetch(`https://seme-et-tisse.fr/API/api_volley_seance.php?action=admin_save_item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, item })
      });
      const result = await res.json();
      if (result.success) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (table: string, id: number, label: string) => {
    if (!window.confirm(`Supprimer définitivement "${label}" ?`)) return;
    try {
      const res = await fetch(`https://seme-et-tisse.fr/API/api_volley_seance.php?action=admin_delete_item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id })
      });
      const result = await res.json();
      if (result.success) fetchData();
    } catch (e) { console.error(e); }
  };

  // Trouver le thème sélectionné dans le secteur pour la colonne 3
  const selectedTheme = selectedSecteur?.themes?.find((t: any) => t.id === selectedThemeId);

  if (loading && secteurs.length === 0) return <div className="loading-state"><Loader2 className="spinner" size={40} /></div>;

  return (
    <div className="admin-master-container fade-in">
      <div className="admin-grid-layout">
        
        {/* COLONNE 1 : SECTEURS */}
        <div className="admin-col">
          <div className="col-header-premium">
            <span>SECTEURS</span>
            <button className="btn-add-circle" onClick={() => handleSave('jsa_secteurs', { nom: 'Nouveau Secteur', code: 'NEW' })}>
                <Plus size={18} strokeWidth={3} />
            </button>
          </div>
          <div className="items-list">
            {secteurs.map(s => (
              <div key={s.id} className={`admin-item-card ${selectedSecteur?.id === s.id ? 'active' : ''} s-border-${s.id}`}>
                <div className="item-main-info" onClick={() => { setSelectedSecteur(s); setSelectedThemeId(null); setSelectedObjId(null); setSelectedSubThemeId(null); }}>
                  <input 
                    defaultValue={s.nom} 
                    onBlur={(e) => e.target.value !== s.nom && handleSave('jsa_secteurs', { id: s.id, nom: e.target.value })}
                  />
                </div>
                <button className="btn-del-mini" onClick={() => handleDelete('jsa_secteurs', s.id, s.nom)}><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE 2 : OBJECTIFS & THÈMES */}
        <div className="admin-col">
          <div className="col-header-premium">CONTENU : {selectedSecteur?.nom.toUpperCase() || '...'}</div>
          {selectedSecteur && (
            <div className="items-list">
              <div className="sub-group-label-premium">
                <div className="label-with-icon"><Target size={16}/> OBJECTIFS</div>
                <button className="btn-add-rect" onClick={() => handleSave('jsa_objectifs', { secteur_id: selectedSecteur.id, titre: 'Nouvel Objectif', description: '' })}>
                   <Plus size={14} strokeWidth={3} /> AJOUTER
                </button>
              </div>
              
              {selectedSecteur.objectifs?.map((obj: any) => (
                <div key={obj.id} className={`admin-obj-node ${selectedObjId === obj.id ? 'expanded' : ''}`}>
                  <div className="admin-sub-item-premium" onClick={() => setSelectedObjId(selectedObjId === obj.id ? null : obj.id)}>
                    {obj.description && obj.description.trim().length > 0 && (
                        <div className="desc-indicator-pill">
                           <MessageSquare size={10} fill="currentColor" />
                        </div>
                    )}
                    <input 
                      defaultValue={obj.titre} 
                      onBlur={(e) => e.target.value !== obj.titre && handleSave('jsa_objectifs', { id: obj.id, titre: e.target.value })} 
                    />
                    <button className="btn-del-mini" onClick={(e) => { e.stopPropagation(); handleDelete('jsa_objectifs', obj.id, obj.titre); }}><Trash2 size={12}/></button>
                  </div>
                  
                  {selectedObjId === obj.id && (
                    <div className="obj-description-editor-premium fade-in">
                      <label><Info size={12} /> DESCRIPTION TECHNIQUE</label>
                      <textarea 
                        autoFocus
                        defaultValue={obj.description}
                        onBlur={(e) => e.target.value !== obj.description && handleSave('jsa_objectifs', { id: obj.id, description: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              <div className="sub-group-label-premium" style={{marginTop:'30px'}}>
                <div className="label-with-icon"><Volleyball size={16}/> THÈMES PRINCIPAUX</div>
                <button className="btn-add-rect" onClick={() => handleSave('jsa_themes', { secteur_id: selectedSecteur.id, nom_theme: 'Nouveau Thème', description: '' })}>
                   <Plus size={14} strokeWidth={3} /> AJOUTER
                </button>
              </div>
              {selectedSecteur.themes?.map((th: any) => (
                <div key={th.id} className={`admin-obj-node ${selectedThemeId === th.id ? 'active' : ''}`}>
                  <div className={`admin-sub-item-premium ${selectedThemeId === th.id ? 'selected' : ''}`} onClick={() => { setSelectedThemeId(th.id); setSelectedObjId(null); }}>
                    {th.description && th.description.trim().length > 0 && (
                        <div className="desc-indicator-pill">
                           <MessageSquare size={10} fill="currentColor" />
                        </div>
                    )}
                    <input 
                      defaultValue={th.nom_theme} 
                      onBlur={(e) => e.target.value !== th.nom_theme && handleSave('jsa_themes', { id: th.id, nom_theme: e.target.value })} 
                    />
                    <button className="btn-del-mini" onClick={(e) => { e.stopPropagation(); handleDelete('jsa_themes', th.id, th.nom_theme); }}><Trash2 size={12}/></button>
                  </div>
                  
                  {/* Éditeur de description pour le Thème */}
                  {selectedThemeId === th.id && (
                     <div className="obj-description-editor-premium theme-desc fade-in">
                        <label><Info size={12} /> DÉFINITION DU THÈME</label>
                        <textarea 
                          defaultValue={th.description}
                          placeholder="Expliquez ce que travaille ce thème..."
                          onBlur={(e) => e.target.value !== th.description && handleSave('jsa_themes', { id: th.id, description: e.target.value })}
                        />
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLONNE 3 : POINTS CLÉS & CONSEILS */}
        <div className="admin-col">
          <div className="col-header-premium">DÉTAILS : {selectedTheme?.nom_theme.toUpperCase() || '...'}</div>
          {selectedTheme && (
            <div className="items-list">
              <div className="sub-group-label-premium">
                <div className="label-with-icon">POINTS CLÉS (CRITÈRES)</div>
                <button className="btn-add-rect" onClick={() => handleSave('jsa_sous_themes', { theme_id: selectedTheme.id, nom_sous_theme: 'Nouveau point clé', description: '' })}>
                   <Plus size={14} strokeWidth={3} /> AJOUTER
                </button>
              </div>
              {selectedTheme.sous_themes?.map((st: any) => (
                <div key={st.id} className={`admin-obj-node ${selectedSubThemeId === st.id ? 'expanded' : ''}`}>
                  <div className="admin-sub-item-premium" onClick={() => setSelectedSubThemeId(selectedSubThemeId === st.id ? null : st.id)}>
                    {st.description && st.description.trim().length > 0 && (
                        <div className="desc-indicator-pill">
                           <MessageSquare size={10} fill="currentColor" />
                        </div>
                    )}
                    <input 
                      defaultValue={st.nom_sous_theme} 
                      onBlur={(e) => e.target.value !== st.nom_sous_theme && handleSave('jsa_sous_themes', { id: st.id, nom_sous_theme: e.target.value })} 
                    />
                    <button className="btn-del-mini" onClick={(e) => { e.stopPropagation(); handleDelete('jsa_sous_themes', st.id, st.nom_sous_theme); }}><Trash2 size={12}/></button>
                  </div>

                  {/* Éditeur de description pour le Sous-Thème */}
                  {selectedSubThemeId === st.id && (
                    <div className="obj-description-editor-premium fade-in">
                      <label><Info size={12} /> CONSIGNE TECHNIQUE</label>
                      <textarea 
                        autoFocus
                        defaultValue={st.description}
                        placeholder="Détaillez la réalisation technique attendue..."
                        onBlur={(e) => e.target.value !== st.description && handleSave('jsa_sous_themes', { id: st.id, description: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="sub-group-label-premium" style={{marginTop:'30px'}}>
                <div className="label-with-icon"><Lightbulb size={16}/> CONSEILS COACH</div>
                <button className="btn-add-rect" onClick={() => handleSave('jsa_themes_conseil', { theme_id: selectedTheme.id, conseil: 'Nouveau conseil...' })}>
                   <Plus size={14} strokeWidth={3} /> AJOUTER
                </button>
              </div>
              {selectedTheme.conseils?.map((cons: any) => (
                <div key={cons.id} className="admin-sub-item-premium no-expand">
                  <textarea 
                    defaultValue={cons.conseil} 
                    onBlur={(e) => e.target.value !== cons.conseil && handleSave('jsa_themes_conseil', { id: cons.id, conseil: e.target.value })}
                  />
                  <button className="btn-del-mini" onClick={() => handleDelete('jsa_themes_conseil', cons.id, 'Conseil')}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterAdmin;