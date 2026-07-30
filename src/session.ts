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
