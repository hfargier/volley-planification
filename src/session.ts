import type { UserData } from './types';

export const getStoredUser = (): UserData | null => {
  const raw = localStorage.getItem('coachData');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<UserData>;
    if (
      typeof parsed.id === 'number' &&
      typeof parsed.prenom === 'string' &&
      typeof parsed.role === 'string'
    ) {
      return parsed as UserData;
    }
  } catch {
    // Ignore malformed session payload and return null.
  }

  return null;
};

/**
 * Un admin peut basculer en mode normal pour voir l'application comme un coach.
 * Le choix est conservé d'une session à l'autre : sans ça, tester une équipe
 * obligerait à rebasculer à chaque rechargement.
 *
 * Ce n'est qu'un confort d'affichage, pas une sécurité : le rôle réel reste
 * celui du compte, et les contrôles doivent rester côté serveur.
 */
const CLE_MODE = 'modeAdmin';

export const getModeAdmin = (): boolean => localStorage.getItem(CLE_MODE) !== 'off';

export const setModeAdmin = (actif: boolean): void => {
  if (actif) localStorage.removeItem(CLE_MODE);
  else localStorage.setItem(CLE_MODE, 'off');
};
