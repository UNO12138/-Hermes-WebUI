/**
 * models.js — 模型管理模块
 * 模型筛选 / 提供商筛选 / 弹窗管理
 */

/* ========== 模型筛选 ========== */
window.filterProvider = function(prov, btn) {
  var dropdown = btn.closest('.ms-drop');
  dropdown.querySelectorAll('span').forEach(function(s) { s.style.background = ''; });
  btn.style.background = '#f5f5f5';
  dropdown.classList.remove('open');
  document.querySelectorAll('.mt-row').forEach(function(row) {
    if (prov === 'all') { row.style.display = ''; return; }
    var provEl = row.querySelector('.mt-prov');
    if (!provEl) return;
    row.style.display = provEl.textContent.trim().indexOf(prov) !== -1 ? '' : 'none';
  });
};

window.filterModels = function(cap, btn) {
  var dropdown = btn.closest('.ms-drop');
  dropdown.querySelectorAll('span').forEach(function(s) { s.style.background = ''; });
  btn.style.background = '#f5f5f5';
  dropdown.classList.remove('open');
  document.querySelectorAll('.mt-row').forEach(function(row) {
    if (cap === 'all') { row.style.display = ''; return; }
    var stars = row.querySelectorAll('.mt-stars');
    var targetStars = null;
    stars.forEach(function(s) {
      var label = s.querySelector('.mt-label');
      if (label && label.textContent.trim() === cap) targetStars = s;
    });
    if (!targetStars) { row.style.display = ''; return; }
    var filled = targetStars.querySelectorAll('.dot.fill').length;
    row.style.display = filled >= 4 ? '' : 'none';
  });
};

/* ========== 模型管理弹窗 ========== */
function openManageModal() { document.getElementById('manage-model-modal').classList.add('open'); }
function closeManageModal(e) {
  if (e && e.target !== document.getElementById('manage-model-modal')) return;
  document.getElementById('manage-model-modal').classList.remove('open');
}
function selectManageProvider(el) {
  var cs = el.closest('.custom-select');
  var icon = el.querySelector('.cs-icon');
  var trigger = cs.querySelector('.cs-trigger');
  var textSpan = trigger.querySelector('.cs-text');
  var oldIcon = trigger.querySelector('.cs-selected-icon');
  if (oldIcon) oldIcon.remove();
  if (icon) {
    var clone = icon.cloneNode(true); clone.className = 'cs-selected-icon';
    clone.style.cssText = 'width:20px;height:20px;flex-shrink:0;';
    trigger.insertBefore(clone, textSpan);
  }
  textSpan.textContent = el.textContent.trim();
  textSpan.classList.add('selected');
  cs.classList.remove('open');
}
function selectOption(el) {
  var cs = el.closest('.custom-select');
  cs.querySelector('.cs-text').textContent = el.textContent.trim();
  cs.querySelector('.cs-text').classList.add('selected');
  cs.classList.remove('open');
}
function toggleKeyIcon(id, btn) {
  var input = document.getElementById(id);
  var img = btn.querySelector('img');
  if (input.value.indexOf('*') !== -1) {
    input.value = 'sk-d68bd7a2c9f43e18b5d2a9f1141';
    img.src = 'icon/eye-on.svg';
  } else {
    input.value = input.value.slice(0,7) + '***********************' + input.value.slice(-4);
    img.src = 'icon/eye-off.svg';
  }
}

/* ========== 添加模型弹窗 ========== */
function openAddModel() {
  document.getElementById('add-model-modal').classList.add('open');
}
function closeAddModel(e) {
  if (e && e.target !== document.getElementById('add-model-modal')) return;
  document.getElementById('add-model-modal').classList.remove('open');
}
function switchAddMode(btn) {
  document.querySelectorAll('.mtab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  var isCustom = btn.textContent.trim() === '自定义';
  document.getElementById('preset-body').style.display = isCustom ? 'none' : 'flex';
  document.getElementById('custom-body').style.display = isCustom ? 'flex' : 'none';
}
function selectModel(el) {
  var cs = el.closest('.custom-select');
  cs.querySelector('.cs-text').textContent = el.textContent.trim();
  cs.querySelector('.cs-text').classList.add('selected');
  cs.classList.remove('open');
}

function updateModelOptions() {
  var prov = (document.getElementById('custom-provider').dataset.value || '');
  var drop = document.getElementById('custom-model-drop');
  var cs = document.getElementById('custom-model');
  drop.innerHTML = '';
  var models = {
    openai: ['gpt-5.5/pro','gpt-5.4','gpt-5.3-codex','gpt-image-2'],
    anthropic: ['claude-opus-5','claude-sonnet-5','claude-haiku-5','claude-opus-4.8'],
    deepseek: ['deepseek-v4-pro','deepseek-v4-flash'],
    google: ['gemini-3.5-pro','gemini-3.5-flash','gemini-3.1-pro'],
    moonshot: ['kimi-2.6'],
    alibaba: ['qwen3.1-max','qwen3.1-plus'],
    tencent: ['hunyuan-turbo']
  };
  if (models[prov]) {
    models[prov].forEach(function(m) {
      var d = document.createElement('div');
      d.className = 'cs-option'; d.textContent = m;
      d.onclick = function() { selectModel(d); };
      drop.appendChild(d);
    });
    cs.querySelector('.cs-text').textContent = models[prov][0];
    cs.querySelector('.cs-text').classList.add('selected');
  } else {
    cs.querySelector('.cs-text').textContent = '请先选择提供商';
    cs.querySelector('.cs-text').classList.remove('selected');
  }
}

function selectProvider(el) {
  var cs = el.closest('.custom-select');
  var icon = el.querySelector('.cs-icon');
  var name = el.textContent.trim();
  var trigger = cs.querySelector('.cs-trigger');
  var textSpan = trigger.querySelector('.cs-text');
  var oldIcon = trigger.querySelector('.cs-selected-icon');
  if (oldIcon) oldIcon.remove();
  if (icon) {
    var clone = icon.cloneNode(true);
    clone.className = 'cs-selected-icon';
    clone.style.cssText = 'width:20px;height:20px;flex-shrink:0;';
    trigger.insertBefore(clone, textSpan);
  }
  textSpan.textContent = name;
  textSpan.classList.add('selected');
  cs.dataset.value = el.dataset.value;
  cs.classList.remove('open');
  updateModelOptions();
}

// 暴露到全局
window.openManageModal = openManageModal;
window.closeManageModal = closeManageModal;
window.selectManageProvider = selectManageProvider;
window.selectOption = selectOption;
window.toggleKeyIcon = toggleKeyIcon;
window.openAddModel = openAddModel;
window.closeAddModel = closeAddModel;
window.switchAddMode = switchAddMode;
window.selectModel = selectModel;
window.updateModelOptions = updateModelOptions;
window.selectProvider = selectProvider;
