const API_BASE_URL = 'https://seme-et-tisse.fr/API/api_volley_seance.php';

type ApiQueryValue = string | number | boolean | null | undefined;

export const apiUrl = (
  action: string,
  params: Record<string, ApiQueryValue> = {},
  options?: { cacheBust?: boolean }
): string => {
  const searchParams = new URLSearchParams({ action });

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  if (options?.cacheBust) {
    searchParams.set('t', Date.now().toString());
  }

  return `${API_BASE_URL}?${searchParams.toString()}`;
};

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
};
