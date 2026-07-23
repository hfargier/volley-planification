import React from 'react';
import { Calendar } from 'lucide-react';

const PlanningAnnuel: React.FC = () => {
  return (
    <div className="fade-in" style={{ padding: '20px', textAlign: 'center' }}>
      <Calendar size={48} className="text-yellow" style={{ marginBottom: '15px', opacity: 0.5 }} />
      <h2>Planning Annuel</h2>
      <p style={{ color: '#666' }}>
        Cette section affichera prochainement votre calendrier de progression annuelle basé sur vos cursus enregistrés.
      </p>
    </div>
  );
};

export default PlanningAnnuel;