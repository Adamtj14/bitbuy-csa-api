import type { BoardConfig, RotationSettings, Slide } from '@vestaboard/core';

export interface Me {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: string;
}

export interface InviteRow {
  id: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: string;
  usedAt: string | null;
}

export interface PushStatus {
  pushEnabled: boolean;
  lastPushedSlide: string | null;
  lastPushAt: string | null;
  lastError: string | null;
}

export interface SettingsInfo {
  vestaboard: { keySet: boolean; apiUrl: string | null; authHeader: string | null };
  coingecko: { keySet: boolean };
  push: PushStatus | null;
}

export interface SettingsPatch {
  vestaboardKey?: string | null;
  vestaboardApiUrl?: string | null;
  vestaboardAuthHeader?: string | null;
  coingeckoApiKey?: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      // keep statusText
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  me: () => request<Me>('/api/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  getConfig: () => request<BoardConfig>('/api/config'),
  putConfig: (config: BoardConfig) =>
    request<BoardConfig>('/api/config', { method: 'PUT', body: JSON.stringify(config) }),
  putRotation: (rotation: RotationSettings) =>
    request<BoardConfig>('/api/rotation', { method: 'PUT', body: JSON.stringify(rotation) }),

  createSlide: (slide: Slide) =>
    request<Slide>('/api/slides', { method: 'POST', body: JSON.stringify(slide) }),
  updateSlide: (slide: Slide) =>
    request<Slide>(`/api/slides/${slide.id}`, { method: 'PUT', body: JSON.stringify(slide) }),
  deleteSlide: (id: string) =>
    request<{ ok: boolean }>(`/api/slides/${id}`, { method: 'DELETE' }),

  listUsers: () => request<UserRow[]>('/api/users'),
  setUserRole: (id: string, role: 'admin' | 'member') =>
    request<{ ok: boolean }>(`/api/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),

  listInvites: () => request<InviteRow[]>('/api/invites'),
  createInvite: (email: string, role: 'admin' | 'member') =>
    request<InviteRow>('/api/invites', { method: 'POST', body: JSON.stringify({ email, role }) }),
  deleteInvite: (id: string) =>
    request<{ ok: boolean }>(`/api/invites/${id}`, { method: 'DELETE' }),

  getSettings: () => request<SettingsInfo>('/api/settings'),
  putSettings: (patch: SettingsPatch) =>
    request<SettingsInfo>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),
};
