// 模型参数面板

import { getState } from './app.js';
import type { ModelConfig } from './types.js';

function initModelPanel(): void {
  const toggle = document.getElementById('model-panel-toggle') as HTMLElement;
  const panel = document.getElementById('model-panel') as HTMLElement;

  toggle?.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    const icon = toggle.querySelector('span') as HTMLElement;
    icon.textContent = panel.classList.contains('hidden') ? '▶' : '▼';
  });

  document.getElementById('llm-toggle')?.addEventListener('change', function(this: HTMLInputElement) {
    getState().modelConfig.use_llm = this.checked;
    updateDisplay();
  });

  updateDisplay();
}

function updateDisplay(): void {
  const config = getState().modelConfig;

  const fields: Array<[string, keyof ModelConfig, string]> = [
    ['模型名称', 'model_name', 'text'],
    ['推理设备', 'device', 'text'],
    ['Temperature', 'temperature', 'number'],
    ['Top-P', 'top_p', 'number'],
    ['Max Tokens', 'max_new_tokens', 'number'],
  ];

  const container = document.getElementById('model-params-display') as HTMLElement;
  container.innerHTML = fields.map(([label, key]) => `
    <div class="flex justify-between items-center text-xs py-1">
      <span class="text-gray-500">${label}</span>
      <span class="text-gray-300 font-mono">${config[key]}</span>
    </div>
  `).join('');

  // LLM 开关
  const llmToggle = document.getElementById('llm-toggle') as HTMLInputElement;
  if (llmToggle) llmToggle.checked = config.use_llm;
}

function updateModelPanel(): void {
  updateDisplay();
}

export { initModelPanel, updateModelPanel };
