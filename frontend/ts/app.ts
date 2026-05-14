// 主应用 —— 路由、全局状态、导航

import { ApiClient } from './api.js';
import type { ProfileData, MemoryItem, ModelConfig } from './types.js';
import { initChat, addMessage } from './chat.js';
import { initOnboarding } from './onboarding.js';
import { initProfile } from './profile.js';
import { initMemory } from './memory.js';
import { initModelPanel, updateModelPanel } from './model-panel.js';

// 全局状态
const state = {
  api: new ApiClient(),
  userId: 'u_001',
  sessionId: '',
  profile: {} as ProfileData,
  modelConfig: {
    model_name: 'GLM-4-9B-Chat',
    device: 'cpu',
    temperature: 0.7,
    top_p: 0.9,
    max_new_tokens: 256,
    use_llm: false,
  } as ModelConfig,
  onboardingRound: 1,
  currentView: 'chat' as string,
};

function getState() { return state; }
function setProfile(p: ProfileData) { state.profile = p; }
function setOnboardingRound(r: number) { state.onboardingRound = r; }

// 视图切换
function showView(view: string): void {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${view}`);
  if (navBtn) navBtn.classList.add('active');

  state.currentView = view;

  // 切换时刷新数据
  if (view === 'profile') initProfile();
  if (view === 'memory') initMemory();
}

// 用户 ID 变更
function setUserId(id: string): void {
  state.userId = id;
  const el = document.getElementById('current-user-display') as HTMLElement;
  if (el) el.textContent = id;
  (document.getElementById('user-id-input') as HTMLInputElement).value = id;
  loadProfile();
}

async function loadProfile(): Promise<void> {
  try {
    const data = await state.api.getProfile(state.userId);
    state.profile = data.profile;
  } catch {
    state.profile = {};
  }
}

// 初始化
async function init(): Promise<void> {
  // 健康检查
  try {
    const health = await state.api.health();
    console.log('Backend:', health);
    const statusEl = document.getElementById('connection-status') as HTMLElement;
    statusEl.textContent = '已连接';
    statusEl.className = 'text-xs text-green-400 mt-2';
  } catch {
    const statusEl = document.getElementById('connection-status') as HTMLElement;
    statusEl.textContent = '未连接';
    statusEl.className = 'text-xs text-red-400 mt-2';
  }

  await loadProfile();

  // 绑定导航
  document.getElementById('nav-chat')?.addEventListener('click', () => showView('chat'));
  document.getElementById('nav-onboarding')?.addEventListener('click', () => { showView('onboarding'); initOnboarding(); });
  document.getElementById('nav-profile')?.addEventListener('click', () => showView('profile'));
  document.getElementById('nav-memory')?.addEventListener('click', () => showView('memory'));

  // 用户 ID 变更
  document.getElementById('user-id-input')?.addEventListener('change', (e) => {
    setUserId((e.target as HTMLInputElement).value);
  });

  // 初始化子模块
  initChat();
  initModelPanel();

  // 默认显示对话
  showView('chat');

  // 移动端菜单
  initMobileMenu();
}

function initMobileMenu(): void {
  const sidebar = document.getElementById('sidebar') as HTMLElement;
  const overlay = document.getElementById('sidebar-overlay') as HTMLElement;
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('hidden');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  });
}

// 工具函数
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 导出供子模块使用
export { state, getState, setProfile, setOnboardingRound, showView, setUserId, loadProfile, escapeHtml };

// 启动
init();

