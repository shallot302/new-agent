// 记忆管理 —— 列表、新增、编辑、删除
import { getState, escapeHtml } from './app.js';
let currentPage = 0;
const pageSize = 20;
let editingId = null;
async function initMemory() {
    currentPage = 0;
    await loadMemories();
    bindEvents();
}
async function loadMemories() {
    const s = getState();
    const container = document.getElementById('memory-list');
    const countEl = document.getElementById('memory-count');
    try {
        const data = await s.api.getMemories(s.userId, pageSize, currentPage * pageSize);
        countEl.textContent = `共 ${data.items.length} 条`;
        if (data.items.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-8">暂无记忆数据</p>';
            return;
        }
        container.innerHTML = data.items.map((m) => `
      <div class="bg-gray-800 rounded-xl p-3 mb-2 group" data-id="${m.id}">
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-100 whitespace-pre-wrap memory-text-${m.id}">${escapeHtml(m.text)}</p>
            <div class="flex gap-3 mt-1">
              <span class="text-xs text-gray-500">${new Date(m.timestamp).toLocaleString()}</span>
              ${m.metadata && Object.keys(m.metadata).length ? `<span class="text-xs text-blue-400">${Object.values(m.metadata).join(', ')}</span>` : ''}
            </div>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button class="edit-mem-btn text-xs text-blue-400 hover:text-blue-300 px-2 py-1" data-id="${m.id}">编辑</button>
            <button class="del-mem-btn text-xs text-red-400 hover:text-red-300 px-2 py-1" data-id="${m.id}">删除</button>
          </div>
        </div>
      </div>
    `).join('');
        // 绑定编辑/删除
        container.querySelectorAll('.edit-mem-btn').forEach(btn => {
            btn.addEventListener('click', () => startEdit(btn.dataset.id));
        });
        container.querySelectorAll('.del-mem-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteMemory(btn.dataset.id));
        });
    }
    catch (err) {
        container.innerHTML = `<p class="text-red-400">加载失败: ${err.message}</p>`;
    }
    updatePager();
}
function updatePager() {
    const prevBtn = document.getElementById('mem-prev');
    const nextBtn = document.getElementById('mem-next');
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = false; // Will be disabled when we get fewer items than pageSize
}
function startEdit(id) {
    editingId = id;
    const textEl = document.querySelector(`.memory-text-${id}`);
    const currentText = textEl?.textContent || '';
    const container = document.getElementById('memory-edit-panel');
    container.classList.remove('hidden');
    document.getElementById('edit-memory-text').value = currentText;
    document.getElementById('edit-memory-id-display').textContent = id;
}
function bindEvents() {
    document.getElementById('refresh-memory-btn')?.addEventListener('click', initMemory);
    document.getElementById('mem-prev')?.addEventListener('click', () => { if (currentPage > 0) {
        currentPage--;
        loadMemories();
    } });
    document.getElementById('mem-next')?.addEventListener('click', () => { currentPage++; loadMemories(); });
    document.getElementById('new-memory-btn')?.addEventListener('click', () => {
        const panel = document.getElementById('memory-new-panel');
        panel.classList.toggle('hidden');
    });
    document.getElementById('save-new-memory')?.addEventListener('click', async () => {
        const s = getState();
        const text = document.getElementById('new-memory-text').value.trim();
        if (!text) {
            alert('请输入记忆内容');
            return;
        }
        const btn = document.getElementById('save-new-memory');
        btn.disabled = true;
        try {
            await s.api.createMemory(s.userId, text, { source: 'manual' });
            document.getElementById('new-memory-text').value = '';
            document.getElementById('memory-new-panel').classList.add('hidden');
            await loadMemories();
        }
        catch (err) {
            alert(`创建失败: ${err.message}`);
        }
        finally {
            btn.disabled = false;
        }
    });
    document.getElementById('save-edit-memory')?.addEventListener('click', async () => {
        if (!editingId)
            return;
        const s = getState();
        const text = document.getElementById('edit-memory-text').value.trim();
        if (!text) {
            alert('内容不能为空');
            return;
        }
        const btn = document.getElementById('save-edit-memory');
        btn.disabled = true;
        try {
            await s.api.updateMemory(s.userId, editingId, text);
            editingId = null;
            document.getElementById('memory-edit-panel').classList.add('hidden');
            await loadMemories();
        }
        catch (err) {
            alert(`更新失败: ${err.message}`);
        }
        finally {
            btn.disabled = false;
        }
    });
    document.getElementById('cancel-edit-memory')?.addEventListener('click', () => {
        editingId = null;
        document.getElementById('memory-edit-panel').classList.add('hidden');
    });
}
async function deleteMemory(id) {
    if (!confirm('确定删除这条记忆？'))
        return;
    const s = getState();
    try {
        await s.api.deleteMemory(s.userId, id);
        await loadMemories();
    }
    catch (err) {
        alert(`删除失败: ${err.message}`);
    }
}
export { initMemory };
