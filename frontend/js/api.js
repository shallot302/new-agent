// API 客户端 —— 支持 REST + SSE 流式
class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }
    async request(path, options) {
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
    health() {
        return this.request('/api/health');
    }
    chat(data) {
        return this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    // SSE 流式对话：返回一个 ReadableStream reader
    async chatStream(data) {
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
            reader: res.body.getReader(),
            abort: () => controller.abort(),
        };
    }
    getProfile(userId) {
        return this.request(`/api/users/${userId}/profile`);
    }
    getProfileRecords(userId) {
        return this.request(`/api/users/${userId}/profile/records`);
    }
    updateProfile(userId, profile) {
        return this.request(`/api/users/${userId}/profile`, {
            method: 'PATCH',
            body: JSON.stringify({ profile }),
        });
    }
    getProfileSchema() {
        return this.request(`/api/users/_/profile/schema`);
    }
    getMemories(userId, limit = 50, offset = 0) {
        return this.request(`/api/users/${userId}/memories?limit=${limit}&offset=${offset}`);
    }
    createMemory(userId, text, metadata = {}) {
        return this.request(`/api/users/${userId}/memories`, {
            method: 'POST',
            body: JSON.stringify({ text, metadata }),
        });
    }
    updateMemory(userId, recordId, text, metadata) {
        return this.request(`/api/users/${userId}/memories/${recordId}`, {
            method: 'PATCH',
            body: JSON.stringify({ text, metadata }),
        });
    }
    deleteMemory(userId, recordId) {
        return this.request(`/api/users/${userId}/memories/${recordId}`, {
            method: 'DELETE',
        });
    }
    onboardingQuestion(userId, round, profile) {
        return this.request('/api/chat/onboarding-question', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, round, profile }),
        });
    }
    createSession(userId) {
        return this.request('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId }),
        });
    }
    listSessions(userId) {
        const query = userId ? `?user_id=${userId}` : '';
        return this.request(`/api/sessions${query}`);
    }
}
export { ApiClient };
