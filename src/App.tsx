import React, { useState } from 'react';
import ModelStudio from './ModelStudio';
import Bibliotheque from './Bibliotheque';
import PlanifViewer from './PlanifViewer';
import MesPlanifs from './MesPlanifs';
import LoginPage from './LoginPage';
import MasterAdmin from './MasterAdmin';
import PreparationSeance from './PreparationSeance'; // Nouvel import
import ToastHost from './ToastHost';
import { Library, PlusCircle, LogOut, Layout, BookOpen, Settings, Download, Shield, ShieldCheck } from 'lucide-react';
import './App.css';
import type { UserData } from './types';
import { getStoredUser, getModeAdmin, setModeAdmin } from './session';
import { usePwa } from './usePwa';

const App: React.FC = () => {
  // Appelé avant tout retour anticipé : les hooks doivent s'exécuter à chaque rendu.
  const { peutInstaller, installer, version, dateBuild } = usePwa();
  const [user, setUser] = useState<UserData | null>(() => getStoredUser());
  const [view, setView] = useState<'list' | 'studio' | 'viewer' | 'adminMaster' | 'prepSeance'>('list');
  const [coachTab, setCoachTab] = useState<'active' | 'catalog'>('active');
  const [selectedModeleId, setSelectedModeleId] = useState<number | null>(null);
  const [isTeamMode, setIsTeamMode] = useState<boolean>(false);
  const [modeAdmin, setModeAdminState] = useState<boolean>(() => getModeAdmin());

  const handleLogout = () => {
    if (window.confirm("Se déconnecter de JSA Studio ?")) {
      localStorage.removeItem('coachData');
      setUser(null);
      setView('list');
      setIsTeamMode(false);
    }
  };

  const estAdminDeDroit = user?.role === 'admin';
  // Un admin peut se mettre en mode normal pour voir ce que voient ses coachs.
  const isAdmin = estAdminDeDroit && modeAdmin;

  const basculerMode = () => {
    const suivant = !modeAdmin;
    setModeAdmin(suivant);
    setModeAdminState(suivant);
    // Les vues ne se recouvrent pas d'un mode à l'autre : Config Master n'existe
    // pas côté coach, et Mes Équipes n'existe pas côté admin. On repart de la liste.
    setView('list');
    setCoachTab('active');
    setSelectedModeleId(null);
    setIsTeamMode(false);
  };

  if (!user) {
    return (
      <>
        <LoginPage
          onLogin={(userData) => setUser(userData)}
          version={version}
          dateBuild={dateBuild}
          peutInstaller={peutInstaller}
          onInstaller={installer}
        />
        <ToastHost />
      </>
    );
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
          <img src={`${import.meta.env.BASE_URL}logo_jsa_tigre.png`} alt="JSA Logo" className="jsa-tigre-logo" />
          <div className="logo-text-stack">
            <span className="jsa-brand">JSA</span>
            <span className="jsa-subtitle">PLANIF</span>
            <span className="app-version" title={`Version mise en ligne le ${dateBuild}`}>
              v{version}
            </span>
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
                <Layout size={18} /> MES ÉQUIPES
              </button>
              <button className={`nav-pill ${coachTab === 'catalog' ? 'active' : ''}`} onClick={() => { setCoachTab('catalog'); setView('list'); }}>
                <BookOpen size={18} /> MODÈLES
              </button>
            </>
          )}

          <div className="user-profile-nav">
            {peutInstaller && (
              <button
                className="nav-pill btn-install-app"
                onClick={installer}
                title="Installer JSA Planif sur cet appareil"
              >
                <Download size={18} /> INSTALLER
              </button>
            )}
            {estAdminDeDroit && (
              <button
                className={`nav-pill btn-mode-admin ${modeAdmin ? '' : 'en-mode-coach'}`}
                onClick={basculerMode}
                title={modeAdmin
                  ? "Voir l'application comme un coach"
                  : 'Revenir en mode administrateur'}
              >
                {modeAdmin ? <ShieldCheck size={18} /> : <Shield size={18} />}
                {modeAdmin ? 'MODE ADMIN' : 'MODE COACH'}
              </button>
            )}
            <span className="user-name-tag">
              {user.prenom}{' '}
              <small>({estAdminDeDroit && !modeAdmin ? 'admin · vue coach' : user.role})</small>
            </span>
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

      <ToastHost />
    </div>
  );
};

export default App;