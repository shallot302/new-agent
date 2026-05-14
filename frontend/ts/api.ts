// API 客户端 —— 支持 REST + SSE 流式

import type {
  ChatRequest, ChatResponse, ProfileData, ProfileRecord,
  MemoryItem, OnboardingQuestion,
} from './types.js';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  health(): Promise<{ status: string; time: string }> {
    return this.request('/api/health');
  }

  chat(data: ChatRequest): Promise<ChatResponse> {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // SSE 流式对话：返回一个 ReadableStream reader
  async chatStream(data: ChatRequest): Promise<{
    reader: ReadableStreamDefaultReader<Uint8Array>;
    abort: () => void;
  }> {
    const controller = new AbortController();
    const url = `${this.baseUrl}/api/chat/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return {
      reader: res.body!.getReader(),
      abort: () => controller.abort(),
    };
  }

  getProfile(userId: string): Promise<{ user_id: string; profile: ProfileData }> {
    return this.request(`/api/users/${userId}/profile`);
  }

  getProfileRecords(userId: string): Promise<{ user_id: string; records: ProfileRecord[] }> {
    return this.request(`/api/users/${userId}/profile/records`);
  }

  updateProfile(userId: string, profile: ProfileData): Promise<{ ok: boolean }> {
    return this.request(`/api/users/${userId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify({ profile }),
    });
  }

  getProfileSchema(): Promise<{ fields: string[] }> {
    return this.request(`/api/users/_/profile/schema`);
  }

  getMemories(userId: string, limit = 50, offset = 0): Promise<{ items: MemoryItem[] }> {
    return this.request(`/api/users/${userId}/memories?limit=${limit}&offset=${offset}`);
  }

  createMemory(userId: string, text: string, metadata: Record<string, string> = {}): Promise<{ ok: boolean }> {
    return this.request(`/api/users/${userId}/memories`, {
      method: 'POST',
      body: JSON.stringify({ text, metadata }),
    });
  }

  updateMemory(userId: string, recordId: string, text?: string, metadata?: Record<string, string>): Promise<{ ok: boolean }> {
    return this.request(`/api/users/${userId}/memories/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text, metadata }),
    });
  }

  deleteMemory(userId: string, recordId: string): Promise<{ ok: boolean }> {
    return this.request(`/api/users/${userId}/memories/${recordId}`, {
      method: 'DELETE',
    });
  }

  onboardingQuestion(userId: string, round: number, profile: ProfileData): Promise<OnboardingQuestion> {
    return this.request('/api/chat/onboarding-question', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, round, profile }),
    });
  }

  createSession(userId: string): Promise<{ session_id: string }> {
    return this.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  listSessions(userId?: string): Promise<{ sessions: Array<{ session_id: string; user_id: string; created_at: string }> }> {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/sessions${query}`);
  }
}

export { ApiClient };
