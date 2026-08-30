import type { Email, EmailStats, SchedulePayload, SlackStatus, User } from '../types';

export const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function token() {
  return localStorage.getItem('reachinbox_token');
}

export function setToken(value: string) {
  localStorage.setItem('reachinbox_token', value);
}

export function clearToken() {
  localStorage.removeItem('reachinbox_token');
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  me: () => request<User>('/me'),
  emails: (status?: 'scheduled' | 'sent' | 'failed') =>
    request<Email[]>(`/emails${status ? `?status=${status}` : ''}`),
  searchEmails: (q: string) => request<Email[]>(`/emails/search?q=${encodeURIComponent(q)}`),
  stats: () => request<EmailStats>('/emails/stats'),
  schedule: (payload: SchedulePayload) =>
    request<{ count: number }>('/emails/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  connectSlack: () => request<{ url: string }>('/integrations/slack/connect', { method: 'POST' }),
  slackStatus: () => request<SlackStatus>('/integrations/slack/status'),
  disconnectSlack: () => request<{ ok: boolean }>('/integrations/slack', { method: 'DELETE' })
};
