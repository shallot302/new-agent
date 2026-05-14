// 对话组件 —— SSE 流式对话、多轮对话、Agent 追问引导

import { getState, setProfile, setOnboardingRound, escapeHtml } from './app.js';
import type { SSEComplete, OnboardingQuestion } from './types.js';

let currentStreamAbort: (() => void) | null = null;
let onboardingBannerDismissed = false;

function initChat(): void {
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
  const input = document.getElementById('chat-input') as HTMLTextAreaElement;

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 输入框自适应高度
  input?.addEventListener('input', function(this: HTMLTextAreaElement) {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // 停止按钮
  document.getElementById('stop-stream-btn')?.addEventListener('click', stopStream);

  // 追问横幅关闭
  document.getElementById('dismiss-banner')?.addEventListener('click', () => {
    onboardingBannerDismissed = true;
    const banner = document.getElementById('onboarding-banner') as HTMLElement;
    banner.classList.add('hidden');
  });
}

async function sendMessage(): Promise<void> {
  const s = getState();
  const input = document.getElementById('chat-input') as HTMLTextAreaElement;
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.style.height = 'auto';
  setInputDisabled(true);

  const time = new Date().toLocaleTimeString();
  addMessage('user', message, time);

  // 创建空的 assistant 消息气泡（用于流式填充）
  const assistantDiv = addMessage('assistant', '', time);
  const contentEl = assistantDiv.querySelector('.msg-content') as HTMLElement;
  const timeEl = assistantDiv.querySelector('.msg-time') as HTMLElement;

  try {
    const { reader, abort } = await s.api.chatStream({
      user_id: s.userId,
      message,
      use_memory: true,
      top_k: 5,
      use_llm: s.modelConfig.use_llm || undefined,
    });
    currentStreamAbort = abort;

    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          currentStreamAbort = null;
          setInputDisabled(false);
          timeEl.textContent = new Date().toLocaleTimeString();
          // 检查是否需要主动提问
          checkOnboardingBanner();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.done) {
            // 最终元数据
            if (parsed.profile_snapshot) {
              setProfile(parsed.profile_snapshot);
            }
            continue;
          }
          if (parsed.token) {
            fullReply += parsed.token;
            contentEl.textContent = fullReply;
            // 滚动到底部
            const container = document.getElementById('chat-messages') as HTMLElement;
            container.scrollTop = container.scrollHeight;
          }
        } catch {
          // 非 JSON 数据，跳过
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      contentEl.textContent = `错误: ${(err as Error).message}`;
      contentEl.className = 'msg-content text-red-400 text-sm';
    }
  } finally {
    currentStreamAbort = null;
    setInputDisabled(false);
    timeEl.textContent = new Date().toLocaleTimeString();
  }
}

function stopStream(): void {
  if (currentStreamAbort) {
    currentStreamAbort();
    currentStreamAbort = null;
    setInputDisabled(false);
  }
}

function setInputDisabled(disabled: boolean): void {
  (document.getElementById('chat-input') as HTMLTextAreaElement).disabled = disabled;
  (document.getElementById('send-btn') as HTMLButtonElement).disabled = disabled;

  const stopBtn = document.getElementById('stop-stream-btn') as HTMLElement;
  if (disabled) {
    stopBtn.classList.remove('hidden');
  } else {
    stopBtn.classList.add('hidden');
  }
}

function addMessage(role: 'user' | 'assistant', content: string, time: string): HTMLElement {
  const container = document.getElementById('chat-messages') as HTMLElement;
  const div = document.createElement('div');
  div.className = role === 'user'
    ? 'flex justify-end mb-3 msg-enter'
    : 'flex justify-start mb-3 msg-enter';

  const avatar = role === 'user' ? '👤' : '🤖';
  const bubbleClass = role === 'user'
    ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
    : 'bg-gray-700 text-gray-100 rounded-2xl rounded-bl-md';

  div.innerHTML = `
    <div class="flex items-start gap-2 max-w-[80%] ${role === 'user' ? 'flex-row-reverse' : ''}">
      <span class="text-xl mt-1 flex-shrink-0">${avatar}</span>
      <div class="min-w-0">
        <div class="${bubbleClass} px-4 py-2.5 text-sm leading-relaxed">
          <span class="msg-content whitespace-pre-wrap">${escapeHtml(content)}</span>
          ${role === 'assistant' && !content ? '<span class="typing-dots"><span></span><span></span><span></span></span>' : ''}
        </div>
        <span class="msg-time text-xs text-gray-500 mt-1 block ${role === 'user' ? 'text-right' : ''}">${time}</span>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

async function checkOnboardingBanner(): Promise<void> {
  if (onboardingBannerDismissed) return;
  const s = getState();
  if (Object.keys(s.profile).length >= 10) return; // 画像已足够丰富

  try {
    const q: OnboardingQuestion = await s.api.onboardingQuestion(s.userId, s.onboardingRound, s.profile);
    if (q.complete) return;

    const banner = document.getElementById('onboarding-banner') as HTMLElement;
    const titleEl = document.getElementById('banner-title') as HTMLElement;
    const reasonEl = document.getElementById('banner-reason') as HTMLElement;
    const questionsEl = document.getElementById('banner-questions') as HTMLElement;

    titleEl.textContent = `第${q.round}轮：${q.title}`;
    reasonEl.textContent = q.reasoning;
    questionsEl.innerHTML = q.questions.map(q => `
      <button class="banner-q-btn w-full text-left px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition-colors">
        ${escapeHtml(q)}
      </button>
    `).join('');

    // 点击问题即填入输入框
    banner.querySelectorAll('.banner-q-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('chat-input') as HTMLTextAreaElement;
        input.value = (btn as HTMLElement).textContent?.trim() || '';
        input.focus();
      });
    });

    banner.classList.remove('hidden');
    setOnboardingRound(q.round + 1);
  } catch {
    // 追问接口暂不可用
  }
}

export { initChat, addMessage };
