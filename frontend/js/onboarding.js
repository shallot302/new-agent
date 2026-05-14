// 3步画像导入表单
import { getState, setProfile, showView } from './app.js';
let currentStep = 1;
const totalSteps = 3;
function initOnboarding() {
    currentStep = 1;
    renderStep();
    updateProgress();
    document.getElementById('onboarding-prev')?.addEventListener('click', prevStep);
    document.getElementById('onboarding-next')?.addEventListener('click', nextStep);
    document.getElementById('onboarding-submit')?.addEventListener('click', submitProfile);
    document.getElementById('onboarding-skip')?.addEventListener('click', () => showView('chat'));
}
function updateProgress() {
    const bar = document.getElementById('onboarding-progress');
    bar.style.width = `${(currentStep / totalSteps) * 100}%`;
    document.getElementById('step-indicator').textContent = `${currentStep}/${totalSteps}`;
    const prevBtn = document.getElementById('onboarding-prev');
    const nextBtn = document.getElementById('onboarding-next');
    const submitBtn = document.getElementById('onboarding-submit');
    prevBtn.classList.toggle('hidden', currentStep === 1);
    nextBtn.classList.toggle('hidden', currentStep === totalSteps);
    submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
}
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        renderStep();
        updateProgress();
    }
}
function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        renderStep();
        updateProgress();
    }
}
function renderStep() {
    const container = document.getElementById('onboarding-content');
    if (currentStep === 1) {
        container.innerHTML = `
      <h3 class="text-lg font-bold mb-3">先来点基础的，让我了解你的身体</h3>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label class="text-xs text-gray-400">身高 (cm)</label>
          <input id="o-height_cm" type="number" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white mt-1" placeholder="165" />
        </div>
        <div>
          <label class="text-xs text-gray-400">当前体重 (kg)</label>
          <input id="o-weight_kg" type="number" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white mt-1" placeholder="62" />
        </div>
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-400">出生年份</label>
        <input id="o-age" type="number" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white mt-1" placeholder="1998" min="1940" max="2010" />
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-400">性别</label>
        <div class="flex gap-3 mt-1">
          ${['男', '女', '非二元性别'].map(g => `<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="gender" value="${g}" class="accent-blue-500" /><span class="text-sm">${g}</span></label>`).join('')}
        </div>
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-400">目标（多选）</label>
        <div class="flex flex-wrap gap-2 mt-1">
          ${['减脂', '增肌', '塑形', '提升体能', '释放压力', '更健康'].map(g => `<label class="goal-chip cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm" data-val="${g}">${g}</label>`).join('')}
        </div>
      </div>
      <div class="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-3">
        <h4 class="text-sm font-bold text-yellow-400 mb-2">🛡️ 健康告知</h4>
        <p class="text-xs text-yellow-500/80 mb-2">请勾选你有的情况（多选）：</p>
        <div class="flex flex-wrap gap-2 mb-2">
          ${['高血压', '心脏病', '糖尿病', '哮喘', '腰椎间盘突出', '膝关节损伤', '肩颈伤病', '其他慢性疼痛', '近半年有手术史'].map(c => `<label class="health-chip cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs" data-val="${c}">${c}</label>`).join('')}
        </div>
        <textarea id="o-health-status" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white mt-1" rows="2" placeholder="如果方便，请简要描述，这能让我更好地保护你"></textarea>
      </div>
      <p class="text-xs text-gray-500 italic">这些信息是绝对的隐私，只为确保你的训练绝对安全。</p>
    `;
        initChipToggle();
    }
    else if (currentStep === 2) {
        container.innerHTML = `
      <h3 class="text-lg font-bold mb-3">告诉我，你的准备程度如何？</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="text-xs text-gray-400 font-medium mb-2">训练经验</h4>
          <div class="space-y-1">
            ${['纯小白', '0-6个月', '6个月-2年', '2年以上'].map(o => `<label class="flex items-center gap-2 cursor-pointer py-1"><input type="radio" name="training_years" value="${o}" class="accent-blue-500" /><span class="text-sm">${o}</span></label>`).join('')}
          </div>
          <h4 class="text-xs text-gray-400 font-medium mt-4 mb-2">标准俯卧撑能力</h4>
          <div class="space-y-1">
            ${['0', '1-5', '6-15', '15+'].map(o => `<label class="flex items-center gap-2 cursor-pointer py-1"><input type="radio" name="movement_skill_level" value="${o}" class="accent-blue-500" /><span class="text-sm">${o} 个</span></label>`).join('')}
          </div>
        </div>
        <div>
          <h4 class="text-xs text-gray-400 font-medium mb-2">训练场地</h4>
          <div class="space-y-1">
            ${['家里', '健身房', '户外', '随时可练'].map(o => `<label class="flex items-center gap-2 cursor-pointer py-1"><input type="radio" name="available_place" value="${o}" class="accent-blue-500" /><span class="text-sm">${o}</span></label>`).join('')}
          </div>
          <h4 class="text-xs text-gray-400 font-medium mt-4 mb-2">可用器械（多选）</h4>
          <div class="flex flex-wrap gap-2">
            ${['无', '瑜伽垫', '弹力带', '哑铃', '杠铃', '龙门架'].map(e => `<label class="equip-chip cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs" data-val="${e}">${e}</label>`).join('')}
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label class="text-xs text-gray-400">每周训练天数</label>
          <select id="o-available_days_per_week" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white mt-1">
            ${['2天', '3天', '4天', '5天'].map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-400">每次时长</label>
          <select id="o-session_duration_minutes" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white mt-1">
            ${['15分钟', '30分钟', '45分钟', '60分钟', '90分钟'].map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="text-xs text-gray-500 italic mt-3">没有好坏，只有真实。这决定我们从哪开始。</p>
    `;
        initChipToggle();
    }
    else if (currentStep === 3) {
        container.innerHTML = `
      <h3 class="text-lg font-bold mb-3">最后，让我更懂你</h3>
      <div class="mb-4">
        <label class="text-xs text-gray-400">你的职业或主要状态</label>
        <div class="flex flex-wrap gap-2 mt-1">
          ${['久坐上班族', '体力工作者', '自由职业', '学生', '带娃家长', '退休'].map(o => `<label class="occ-chip cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs" data-val="${o}">${o}</label>`).join('')}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label class="text-xs text-gray-400">睡眠质量</label>
          <div class="flex gap-1 mt-1 text-xl">
            ${['😫', '😟', '😐', '😊', '😄'].map((emoji, i) => `<span class="sleep-emoji cursor-pointer hover:scale-125 transition-transform" data-val="${i + 1}">${emoji}</span>`).join('')}
          </div>
        </div>
        <div>
          <label class="text-xs text-gray-400">压力水平</label>
          <div class="flex gap-1 mt-1 text-xl">
            ${['😫', '😟', '😐', '😊', '😄'].map((emoji, i) => `<span class="stress-emoji cursor-pointer hover:scale-125 transition-transform" data-val="${5 - i}">${emoji}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-400">最大驱动力</label>
        <textarea id="o-motivation" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white mt-1" rows="2" placeholder="那个让你想改变的决定性瞬间是什么？"></textarea>
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-400">最大障碍（多选）</label>
        <div class="flex flex-wrap gap-2 mt-1">
          ${['没时间', '没精力', '怕受伤', '不懂怎么练', '没人陪', '见效慢'].map(b => `<label class="barrier-chip cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs" data-val="${b}">${b}</label>`).join('')}
        </div>
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-400">教练风格偏好</label>
        <div class="flex items-center gap-3 mt-2">
          <span class="text-xs text-gray-400">温柔鼓励</span>
          <input id="o-personality_and_motivation" type="range" min="1" max="5" value="3" class="flex-1 accent-blue-500" />
          <span class="text-xs text-gray-400">直击要害</span>
        </div>
      </div>
      <p class="text-xs text-gray-500 italic">可选：上传站姿照片做体态分析（暂未开放）</p>
    `;
        initEmojiToggle();
        initChipToggle();
    }
}
// Chip 多选逻辑
function initChipToggle() {
    document.querySelectorAll('.goal-chip, .health-chip, .equip-chip, .occ-chip, .barrier-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('bg-blue-600');
            chip.classList.toggle('bg-gray-700');
        });
    });
}
// Emoji 选择
function initEmojiToggle() {
    document.querySelectorAll('.sleep-emoji').forEach(emoji => {
        emoji.addEventListener('click', function () {
            document.querySelectorAll('.sleep-emoji').forEach(e => e.style.opacity = '0.4');
            this.style.opacity = '1';
            this._selected = this.dataset.val;
        });
    });
    document.querySelectorAll('.stress-emoji').forEach(emoji => {
        emoji.addEventListener('click', function () {
            document.querySelectorAll('.stress-emoji').forEach(e => e.style.opacity = '0.4');
            this.style.opacity = '1';
            this._selected = this.dataset.val;
        });
    });
}
// 收集表单数据
function collectFormData() {
    const profile = {};
    // 文本/数字输入
    const fields = ['o-height_cm', 'o-weight_kg', 'o-age', 'o-health-status', 'o-motivation'];
    const keyMap = {
        'o-height_cm': 'height_cm', 'o-weight_kg': 'weight_kg', 'o-age': 'age',
        'o-health-status': 'health_status', 'o-motivation': 'motivation',
    };
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el?.value.trim())
            profile[keyMap[id]] = el.value.trim();
    });
    // Radio buttons
    const genderRadio = document.querySelector('input[name="gender"]:checked');
    if (genderRadio)
        profile['gender'] = genderRadio.value;
    const trainingRadio = document.querySelector('input[name="training_years"]:checked');
    if (trainingRadio)
        profile['training_years'] = trainingRadio.value;
    const skillRadio = document.querySelector('input[name="movement_skill_level"]:checked');
    if (skillRadio)
        profile['movement_skill_level'] = skillRadio.value;
    const placeRadio = document.querySelector('input[name="available_place"]:checked');
    if (placeRadio)
        profile['available_place'] = placeRadio.value;
    // Chip 多选
    const goals = [];
    document.querySelectorAll('.goal-chip.bg-blue-600').forEach(c => goals.push(c.dataset.val || ''));
    if (goals.length)
        profile['exercise_habits'] = goals.join(', ');
    const healths = [];
    document.querySelectorAll('.health-chip.bg-blue-600').forEach(c => healths.push(c.dataset.val || ''));
    if (healths.length)
        profile['injuries'] = healths.join(', ');
    const equips = [];
    document.querySelectorAll('.equip-chip.bg-blue-600').forEach(c => equips.push(c.dataset.val || ''));
    if (equips.length)
        profile['available_equipment'] = equips.join(', ');
    const occs = [];
    document.querySelectorAll('.occ-chip.bg-blue-600').forEach(c => occs.push(c.dataset.val || ''));
    if (occs.length)
        profile['occupation'] = occs.join(', ');
    const barriers = [];
    document.querySelectorAll('.barrier-chip.bg-blue-600').forEach(c => barriers.push(c.dataset.val || ''));
    if (barriers.length)
        profile['biggest_barrier'] = barriers.join(', ');
    // Emoji
    const sleepEl = document.querySelector('.sleep-emoji[style*="opacity: 1"]');
    if (sleepEl && sleepEl._selected)
        profile['sleep_quality'] = sleepEl._selected;
    const stressEl = document.querySelector('.stress-emoji[style*="opacity: 1"]');
    if (stressEl && stressEl._selected)
        profile['stress_level'] = stressEl._selected;
    // 下拉框
    ['o-available_days_per_week', 'o-session_duration_minutes'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel?.value) {
            const k = id === 'o-available_days_per_week' ? 'available_days_per_week' : 'session_duration_minutes';
            profile[k] = sel.value;
        }
    });
    // 滑块
    const slider = document.getElementById('o-personality_and_motivation');
    if (slider?.value)
        profile['personality_and_motivation'] = slider.value;
    return profile;
}
async function submitProfile() {
    const s = getState();
    const profile = collectFormData();
    if (Object.keys(profile).length === 0) {
        alert('请至少填写一些信息');
        return;
    }
    const submitBtn = document.getElementById('onboarding-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    try {
        await s.api.updateProfile(s.userId, profile);
        setProfile({ ...s.profile, ...profile });
        alert('画像已保存！系统将根据你的信息生成个性化训练计划。');
        showView('chat');
    }
    catch (err) {
        alert(`保存失败: ${err.message}`);
    }
    finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交并生成我的初计划';
    }
}
export { initOnboarding };
