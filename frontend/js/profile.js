// 画像查看与编辑
import { getState, setProfile, escapeHtml } from './app.js';
import { PROFILE_FIELD_LABELS } from './types.js';
async function initProfile() {
    const s = getState();
    try {
        const data = await s.api.getProfile(s.userId);
        setProfile(data.profile);
    }
    catch {
        // use existing
    }
    renderProfile();
    bindEvents();
}
function renderProfile() {
    const s = getState();
    const container = document.getElementById('profile-display');
    const editContainer = document.getElementById('profile-edit');
    if (!s.profile || Object.keys(s.profile).length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8"><p class="text-3xl mb-2">📋</p><p>尚无画像数据</p><p class="text-xs mt-1">发送消息会让 Agent 自动提取偏好，或前往画像导入填写</p></div>';
    }
    else {
        const entries = Object.entries(s.profile).filter(([k]) => PROFILE_FIELD_LABELS[k]);
        container.innerHTML = entries.map(([k, v]) => `
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-sm text-gray-400">${PROFILE_FIELD_LABELS[k] || k}</span>
        <span class="text-sm text-white font-medium">${escapeHtml(v)}</span>
      </div>
    `).join('');
    }
    // 编辑表单
    editContainer.innerHTML = `
    <h3 class="text-sm font-medium text-gray-400 mb-3">手动添加/编辑字段</h3>
    <div class="space-y-2">
      <div class="flex gap-2">
        <select id="edit-profile-key" class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">选择字段...</option>
          ${Object.entries(PROFILE_FIELD_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
        <input id="edit-profile-value" class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="值" />
      </div>
      <button id="add-profile-field" class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm transition-colors">添加/更新字段</button>
    </div>
  `;
}
function bindEvents() {
    document.getElementById('add-profile-field')?.addEventListener('click', async () => {
        const s = getState();
        const key = document.getElementById('edit-profile-key').value;
        const value = document.getElementById('edit-profile-value').value.trim();
        if (!key || !value) {
            alert('请选择字段并填写值');
            return;
        }
        const btn = document.getElementById('add-profile-field');
        btn.disabled = true;
        try {
            await s.api.updateProfile(s.userId, { [key]: value });
            s.profile[key] = value;
            setProfile({ ...s.profile });
            renderProfile();
            document.getElementById('edit-profile-value').value = '';
        }
        catch (err) {
            alert(`保存失败: ${err.message}`);
        }
        finally {
            btn.disabled = false;
        }
    });
    document.getElementById('refresh-profile-btn')?.addEventListener('click', initProfile);
}
export { initProfile };
