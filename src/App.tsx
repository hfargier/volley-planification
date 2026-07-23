import React, { useState, useEffect } from 'react';
import ModelStudio from './ModelStudio';
import Bibliotheque from './Bibliotheque';
import PlanifViewer from './PlanifViewer';
import MesPlanifs from './MesPlanifs';
import LoginPage from './LoginPage';
import MasterAdmin from './MasterAdmin';
import PreparationSeance from './PreparationSeance'; // Nouvel import
import { Library, PlusCircle, LogOut, Layout, BookOpen, Settings } from 'lucide-react';
import './App.css';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'studio' | 'viewer' | 'adminMaster' | 'prepSeance'>('list');
  const [coachTab, setCoachTab] = useState<'active' | 'catalog'>('active');
  const [selectedModeleId, setSelectedModeleId] = useState<number | null>(null);
  const [isTeamMode, setIsTeamMode] = useState<boolean>(false);
  const [initialized, setInitialized] = useState(false);

  // Initialisation Session
  useEffect(() => {
    const savedUser = localStorage.getItem('coachData');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setInitialized(true);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Se déconnecter de JSA Studio ?")) {
      localStorage.removeItem('coachData');
      setUser(null);
      setView('list');
      setIsTeamMode(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  if (!initialized) return null;

  if (!user) {
    return <LoginPage onLogin={(userData) => setUser(userData)} />;
  }

  // --- LOGIQUE DE NAVIGATION ---
  
  // Ouverture d'un Master (Catalogue)
  const openMaster = (id: number, targetView: 'studio' | 'viewer') => {
    setSelectedModeleId(id);
    setIsTeamMode(false);
    setView(targetView);
  };

  // Ouverture d'une Planification d'Équipe (Mode Terrain ou Edition)
  const openTeamPlanif = (id: number, targetView: 'studio' | 'viewer' | 'prepSeance') => {
    setSelectedModeleId(id);
    setIsTeamMode(true);
    setView(targetView);
  };

  return (
    <div className="app-container">
      <header className="main-app-header">
        <div className="logo-container">
          <img src="/logo_jsa_tigre.png" alt="JSA Logo" className="jsa-tigre-logo" />
          <div className="logo-text-stack">
            <span className="jsa-brand">JSA</span>
            <span className="jsa-subtitle">PLANNIF</span>
          </div>
        </div>
        
        <nav className="main-nav-actions">
          {isAdmin ? (
            <>
              <button className={`nav-pill ${view === 'list' && coachTab === 'active' ? 'active' : ''}`} onClick={() => { setCoachTab('active'); setView('list'); setIsTeamMode(false); }}>
                <Library size={18} /> CATALOGUE MASTER
              </button>
              <button className={`nav-pill ${view === 'studio' ? 'active' : ''}`} onClick={() => { setSelectedModeleId(null); setIsTeamMode(false); setView('studio'); }}>
                <PlusCircle size={18} /> CRÉER UN MODÈLE
              </button>
              <button className={`nav-pill ${view === 'adminMaster' ? 'active' : ''}`} onClick={() => { setView('adminMaster'); setIsTeamMode(false); }}>
                <Settings size={18} /> CONFIG MASTER
              </button>
            </>
          ) : (
            <>
              <button className={`nav-pill ${coachTab === 'active' ? 'active' : ''}`} onClick={() => { setCoachTab('active'); setView('list'); }}>
                <Layout size={18} /> MES ÉQUIPE
              </button>
              <button className={`nav-pill ${coachTab === 'catalog' ? 'active' : ''}`} onClick={() => { setCoachTab('catalog'); setView('list'); }}>
                <BookOpen size={18} /> MODELE
              </button>
            </>
          )}

          <div className="user-profile-nav">
            <span className="user-name-tag">{user.prenom} <small>({user.role})</small></span>
            <button className="nav-pill btn-logout" onClick={handleLogout} title="Déconnexion">
              <LogOut color="#ff0000" size={18} />
            </button>
          </div>
        </nav>
      </header>

      <main className="main-viewport">
        {/* VUE : PRÉPARATION DE SÉANCE (MODE TERRAIN) */}
        {view === 'prepSeance' && selectedModeleId && (
          <PreparationSeance 
            planifId={selectedModeleId} 
            onBack={() => setView('list')} 
          />
        )}

        {/* VUE : ADMIN MASTER */}
        {view === 'adminMaster' && isAdmin && (
          <MasterAdmin />
        )}

        {/* VUE : VIEWER (CONSULTATION GLOBALE) */}
        {view === 'viewer' && selectedModeleId && (
          <PlanifViewer 
            planifId={selectedModeleId} 
            isTeamPlanif={isTeamMode} 
            onBack={() => setView('list')} 
          />
        )}

        {/* VUE : STUDIO (ÉDITION) */}
        {view === 'studio' && (
          <ModelStudio 
            modeleId={selectedModeleId} 
            isTeamPlanif={isTeamMode} 
            onSaveSuccess={() => setView('list')} 
          />
        )}

        {/* VUE : LISTES */}
        {view === 'list' && (
          <div className="content-fade">
            {!isAdmin && coachTab === 'active' ? (
              <MesPlanifs 
                user={user}
                onEdit={(id: number) => openTeamPlanif(id, 'studio')}
                onView={(id: number) => openTeamPlanif(id, 'prepSeance')} // Clic carte -> Terrain
              />
            ) : (
              <Bibliotheque 
                user={user}
                mode={!isAdmin || coachTab === 'catalog' ? 'viewer' : 'admin'}
                onEdit={(id: number) => openMaster(id, 'studio')}
                onView={(id: number) => openMaster(id, 'viewer')}
                onCreateNew={() => { 
                  setSelectedModeleId(null); 
                  setIsTeamMode(false); 
                  setView('studio'); 
                }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;