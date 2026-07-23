import React, { useState } from 'react';
import { UserCircle, Lock, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLogin: (userData: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // On vide l'erreur avant de tenter une nouvelle connexion
    
    try {
      const response = await fetch('https://seme-et-tisse.fr/API/api_volley_seance.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password }),
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('coachData', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError("Identifiants incorrects");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="./logo_jsa_tigre.png" className="login-logo" alt="Logo JSA" />
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
      </div>
    </div>
  );
}