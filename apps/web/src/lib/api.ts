/**
 * API client for ECHO Arena backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';

export async function fetchAPI(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Config
  getConfig: () => fetchAPI('/config'),

  // Auth
  getNonce: (address: string) =>
    fetchAPI('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  verifySignature: (address: string, signature: string, nonce: string) =>
    fetchAPI('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, signature, nonce }),
    }),

  // Burn
  getBurnPrice: () => fetchAPI('/burn/price'),

  verifyBurn: (txHash: string, address: string) =>
    fetchAPI('/burn/verify', {
      method: 'POST',
      body: JSON.stringify({ txHash, address }),
    }),

  checkBurn: (address: string) => fetchAPI(`/burn/check/${address}`),

  // Bot
  previewBot: (prompt: string) =>
    fetchAPI('/bot/preview', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  checkEligibility: (address: string) => fetchAPI(`/bot/check-eligibility/${address}`),

  createBot: (prompt: string, address: string) =>
    fetchAPI('/bot', {
      method: 'POST',
      body: JSON.stringify({ prompt, address }),
    }),

  getBot: (id: string) => fetchAPI(`/bot/${id}`),

  getBotsByOwner: (address: string) => fetchAPI(`/bot/by-owner/${address}`),

  // Match
  getCurrentMatch: () => fetchAPI('/match/current'),

  getMatch: (id: string) => fetchAPI(`/match/${id}`),

  // Leaderboard
  getLeaderboard: () => fetchAPI('/leaderboard'),

  getMatchResults: (matchId: string) => fetchAPI(`/leaderboard/${matchId}`),

  // Admin (requires auth header)
  admin: {
    createMatch: (startTs?: number, durationHours?: number) =>
      fetchAPI('/admin/match/create', {
        method: 'POST',
        body: JSON.stringify({ startTs, durationHours }),
      }),

    startMatch: (matchId: string) =>
      fetchAPI(`/admin/match/${matchId}/start`, {
        method: 'POST',
      }),

    settleMatch: (matchId: string) =>
      fetchAPI(`/admin/match/${matchId}/settle`, {
        method: 'POST',
      }),

    markPaid: (winnerId: string, txHash: string) =>
      fetchAPI(`/admin/winner/${winnerId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({ txHash }),
      }),

    getUnpaidWinners: () => fetchAPI('/admin/winners/unpaid'),
  },
};
