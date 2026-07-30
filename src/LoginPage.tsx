import React, { useState } from 'react';
import { UserCircle, Lock, LogIn, Download } from 'lucide-react';
import type { UserData } from './types';
import { apiUrl, fetchJson } from './api';

interface LoginPageProps {
  onLogin: (userData: UserData) => void;
  version?: string;
  dateBuild?: string;
  peutInstaller?: boolean;
  onInstaller?: () => void;
}

interface LoginResponse {
  success: boolean;
  user: UserData;
}

export default function LoginPage({
  onLogin,
  version,
  dateBuild,
  peutInstaller,
  onInstaller,
}: LoginPageProps) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // On vide l'erreur avant de tenter une nouvelle connexion
    
    try {
      const data = await fetchJson<LoginResponse>(apiUrl('login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password }),
      });

      if (data.success) {
        localStorage.setItem('coachData', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError("Identifiants incorrects");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={`${import.meta.env.BASE_URL}logo_jsa_tigre.png`} className="login-logo" alt="Logo JSA" />
        {/* TITRE CORRIGÉ ICI */}
        <h1 className="text-yellow">JSA PLANIFICATION</h1>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-jsa-group">
            <UserCircle className="input-icon" size={20} />
            <input 
              type="text" 
              placeholder="PSEUDO" 
              value={pseudo} 
              onChange={(e) => setPseudo(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-jsa-group">
            <Lock className="input-icon" size={20} />
            <input 
              type="password" 
              placeholder="MOT DE PASSE" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          {error && <p className="error-msg">{error}</p>}
          
          <button type="submit" className="btn-login-submit full-width">
            SE CONNECTER <LogIn size={18} />
          </button>
        </form>

        {peutInstaller && (
          <button className="btn-install-login" onClick={onInstaller}>
            <Download size={16} /> INSTALLER L'APPLICATION
          </button>
        )}

        {version && (
          <p className="login-version" title={dateBuild ? `Build du ${dateBuild}` : undefined}>
            v{version}
          </p>
        )}
      </div>
    </div>
  );
}