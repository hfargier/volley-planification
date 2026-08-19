import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  /** Nom à recopier pour débloquer la suppression. */
  nom: string;
  /** Sous-titre du récapitulatif : équipe et saison pour une planification,
   *  niveau pour un modèle. Absent, la ligne n'est pas affichée. */
  sousTitre?: string;
  /** Titre de la modale, si l'objet supprimé n'est pas une planification. */
  titre?: string;
  /** Ce qui sera perdu, listé pour que la décision soit prise en connaissance. */
  perte?: React.ReactNode;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  nom,
  sousTitre,
  titre = 'SUPPRIMER CETTE PLANIFICATION',
  perte,
  busy = false,
  onCancel,
  onConfirm,
}) => {
  const [saisie, setSaisie] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Comparaison tolérante : casse, espaces de bord et accents ignorés.
  // Le but est une confirmation délibérée, pas une dictée à l'accent près.
  const normalise = (v: string) =>
    v
      .trim()
      .toLocaleUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const correspond = normalise(saisie) === normalise(nom);
  const peutSupprimer = correspond && !busy;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Échap ferme la fenêtre (sauf pendant la suppression).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="modal-backdrop"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        className="modal-danger"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-suppression"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-danger-header">
          <AlertTriangle size={20} />
          <h3 id="titre-suppression">{titre}</h3>
          <button
            className="modal-close"
            onClick={onCancel}
            disabled={busy}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        <div className="modal-danger-body">
          <div className="modal-target-recap">
            <strong>{nom}</strong>
            {sousTitre && <span>{sousTitre}</span>}
          </div>

          <p className="modal-danger-warning">
            Cette action est <strong>irréversible</strong>.{' '}
            {perte ?? (
              <>
                Seront définitivement perdus : les cycles, les objectifs, les
                thèmes de chaque semaine et
                <strong> toutes les notes saisies sur le terrain</strong>.
              </>
            )}
          </p>

          <label className="modal-confirm-label" htmlFor="confirm-nom">
            Pour confirmer, recopiez le nom : <code>{nom}</code>
          </label>
          <input
            id="confirm-nom"
            ref={inputRef}
            type="text"
            className="modal-confirm-input"
            value={saisie}
            disabled={busy}
            autoComplete="off"
            placeholder={nom}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && peutSupprimer) onConfirm();
            }}
          />
        </div>

        <footer className="modal-danger-footer">
          <button className="btn-modal-cancel" onClick={onCancel} disabled={busy}>
            ANNULER
          </button>
          <button
            className="btn-modal-delete"
            onClick={onConfirm}
            disabled={!peutSupprimer}
            title={correspond ? undefined : 'Recopiez le nom pour débloquer'}
          >
            {busy ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
            {busy ? 'SUPPRESSION…' : 'SUPPRIMER'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
