import { apiClient } from './client';

const API_BASE = apiClient.defaults.baseURL ?? 'http://localhost:3001';

/** Returns the Riot OAuth login URL that redirects to our callback page. */
export function getRiotLoginUrl(): string {
  const callbackUri = encodeURIComponent(window.location.origin + '/auth/callback');
  return `${API_BASE}/auth/riot/login?redirect_uri=${callbackUri}`;
}

/** GET /auth/me — returns the authenticated user's identity. */
export async function fetchMe(
  token: string
): Promise<{ puuid: string; gameName: string; tagLine: string }> {
  const res = await apiClient.get<{
    puuid: string;
    gameName: string;
    tagLine: string;
  }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
