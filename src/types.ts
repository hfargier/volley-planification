export interface UserData {
  id: number;
  prenom: string;
  role: 'admin' | string;
}

export interface ApiMutationResult {
  success: boolean;
  error?: string;
}
