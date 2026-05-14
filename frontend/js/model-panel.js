// 模型参数面板
import { getState } from './app.js';
function initModelPanel() {
    const toggle = document.getElementById('model-panel-toggle');
    const panel = document.getElementById('model-panel');
    toggle?.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        const icon = toggle.querySelector('span');
        icon.textContent = panel.classList.contains('hidden') ? '▶' : '▼';
    });
    document.getElementById('llm-toggle')?.addEventListener('change', function () {
        getState().modelConfig.use_llm = this.checked;
        updateDisplay();
    });
    updateDisplay();
}
function updateDisplay() {
    const config = getState().modelConfig;
    const fields = [
        ['模型名称', 'model_name', 'text'],
        ['推理设备', 'device', 'text'],
        ['Temperature', 'temperature', 'number'],
        ['Top-P', 'top_p', 'number'],
        ['Max Tokens', 'max_new_tokens', 'number'],
    ];
    const container = document.getElementById('model-params-display');
    container.innerHTML = fields.map(([label, key]) => `
    <div class="flex justify-between items-center text-xs py-1">
      <span class="text-gray-500">${label}</span>
      <span class="text-gray-300 font-mono">${config[key]}</span>
    </div>
  `).join('');
    // LLM 开关
    const llmToggle = document.getElementById('llm-toggle');
    if (llmToggle)
        llmToggle.checked = config.use_llm;
}
function updateModelPanel() {
    updateDisplay();
}
export { initModelPanel, updateModelPanel };
