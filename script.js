/**
 * Hermes WebUI —— 交互脚本
 * 功能：
 *   1. 左/右侧栏独立展开收起（点击顶栏的切换按钮）
 *   2. 键盘快捷键：Ctrl+[ 切换左栏，Ctrl+] 切换右栏
 *   3. 状态持久化：下次打开记住用户的侧栏状态
 *   4. 切换按钮的 aria-label 动态更新，方便无障碍识别
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'hermes-webui-sidebar-state';

  const app = document.querySelector('.app');
  if (!app) return;

  // 所有带 data-left-toggle / data-right-toggle 的按钮都能触发
  const leftToggles = document.querySelectorAll('[data-left-toggle]');
  const rightToggles = document.querySelectorAll('[data-right-toggle]');

  /** 读取已保存的状态 */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { left: 'open', right: 'open' };
      const parsed = JSON.parse(raw);
      return {
        left: parsed.left === 'closed' ? 'closed' : 'open',
        right: parsed.right === 'closed' ? 'closed' : 'open',
      };
    } catch (e) {
      return { left: 'open', right: 'open' };
    }
  }

  /** 写入状态 */
  function saveState(left, right) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
    } catch (e) { /* 忽略存储失败 */ }
  }

  /** 切换指定侧栏 */
  function toggleSide(side) {
    const key = side === 'left' ? 'data-left' : 'data-right';
    const current = app.getAttribute(key);
    const next = current === 'open' ? 'closed' : 'open';
    app.setAttribute(key, next);

    // 清除拖拽产生的行内样式，让 CSS 规则接管
    if (side === 'right' && rightPanel) {
      rightPanel.style.width = '';
      rightPanel.style.flexBasis = '';
      document.documentElement.style.removeProperty('--right-w');
    }

    const l = app.getAttribute('data-left');
    const r = app.getAttribute('data-right');
    saveState(l, r);

    updateLabels();
  }

  /** 更新按钮的 aria-label / title */
  function updateLabels() {
    const leftOpen = app.getAttribute('data-left') !== 'closed';
    const rightOpen = app.getAttribute('data-right') !== 'closed';

    leftToggles.forEach((btn) => {
      const label = leftOpen ? '收起左侧栏' : '展开左侧栏';
      btn.setAttribute('aria-label', label);
      if (btn.tagName === 'BUTTON') btn.title = label;
    });
    rightToggles.forEach((btn) => {
      const label = rightOpen ? '收起右侧栏' : '展开右侧栏';
      btn.setAttribute('aria-label', label);
      if (btn.tagName === 'BUTTON') btn.title = label;
    });
  }

  // 绑定点击事件
  leftToggles.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSide('left');
    });
  });
  rightToggles.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSide('right');
    });
  });

  // 键盘快捷键：Ctrl/Cmd + [ / ]
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    if (e.key === '[') {
      e.preventDefault();
      toggleSide('left');
    } else if (e.key === ']') {
      e.preventDefault();
      toggleSide('right');
    }
  });

  // ========== 右栏拖拽调整宽度 ==========
  const resizeHandle = document.querySelector('[data-resize-right]');
  const rightPanel = document.querySelector('.right-panel');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  if (resizeHandle && rightPanel) {
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = rightPanel.offsetWidth;
      resizeHandle.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const delta = startX - e.clientX;
      const newWidth = Math.max(240, Math.min(800, startWidth + delta));
      rightPanel.style.width = newWidth + 'px';
      rightPanel.style.flexBasis = newWidth + 'px';
      // 更新 CSS 变量供其他元素使用
      document.documentElement.style.setProperty('--right-w', newWidth + 'px');
    });

    window.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  // ========== 工具调用显示/隐藏开关 ==========
  const toolToggle = document.querySelector('[data-tool-toggle]');
  const toolCalls = document.querySelectorAll('[data-tool-call]');
  let toolsVisible = true;

  function updateToolVisibility() {
    toolCalls.forEach((el) => {
      el.style.display = toolsVisible ? '' : 'none';
    });
    if (toolToggle) {
      const bubble = toolToggle.querySelector('.tool-tip-bubble');
      if (bubble) bubble.textContent = toolsVisible ? '显示工具调用' : '隐藏工具调用';
      // 开关视觉状态
      const switchEl = toolToggle.querySelector('.switch');
      if (switchEl) {
        switchEl.style.background = toolsVisible ? '#686868' : '#c4c4c4';
        const knob = switchEl.querySelector('i');
        if (knob) knob.style.left = toolsVisible ? '16px' : '2px';
      }
    }
  }

  if (toolToggle) {
    toolToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toolsVisible = !toolsVisible;
      updateToolVisibility();
    });
    // 初始化
    updateToolVisibility();
  }

  // "最近对话" 条目切换
  const recentItems = document.querySelectorAll('.recent-item[data-chat]');
  const chatPages = document.querySelectorAll('.chat-page');
  const rightPages = document.querySelectorAll('.right-page');
  const chatTitle = document.getElementById('chat-title');

  // 主导航中带 data-chat 的链接也支持切换
  document.querySelectorAll('.left-nav .nav-hit[data-chat], .bottom-nav .nav-hit[data-chat]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchChat(link.dataset.chat);
    });
  });

  function switchChat(chatId) {
    // 关闭所有打开的下拉
    document.querySelectorAll('.ms-drop.open, .custom-select.open').forEach(d => d.classList.remove('open'));
    // 更新左栏选中状态
    recentItems.forEach((item) => {
      const isTarget = item.dataset.chat === chatId;
      item.classList.toggle('active', isTarget);
      let bg = item.querySelector('.recent-active-bg');
      if (isTarget && !bg) {
        bg = document.createElement('div');
        bg.className = 'recent-active-bg';
        item.insertBefore(bg, item.firstChild);
      } else if (!isTarget && bg) {
        bg.remove();
      }
    });
    // 导航链接选中态
    document.querySelectorAll('.left-nav .nav-hit, .bottom-nav .nav-hit').forEach(link => {
      link.classList.toggle('active', link.dataset.chat === chatId);
    });

    // 切换对话内容
    chatPages.forEach((page) => {
      page.classList.toggle('hidden', page.dataset.page !== chatId);
    });

    // 切换右栏内容
    rightPages.forEach((page) => {
      page.classList.toggle('hidden', page.dataset.rightPage !== chatId);
    });
    // 模型页无右侧栏，自动收起；且隐藏输入框
    if (chatId === 'models') {
      if (app.getAttribute('data-right') !== 'closed') {
        app.setAttribute('data-right', 'closed');
        if (rightPanel) { rightPanel.style.width = ''; rightPanel.style.flexBasis = ''; document.documentElement.style.removeProperty('--right-w'); }
        updateLabels();
      }
      const composer = document.querySelector('.composer-box');
      const disclaimer = document.querySelector('.disclaimer-bar');
      const disclaimerText = document.querySelector('.disclaimer-text');
      if (composer) composer.style.display = 'none';
      if (disclaimer) disclaimer.style.display = 'none';
      if (disclaimerText) disclaimerText.style.display = 'none';
      // 隐藏顶栏元素
      const modelPicker = document.querySelector('.model-picker');
      const titleText = document.getElementById('chat-title');
      const rightToggle = document.querySelector('.right-toggle');
      if (modelPicker) modelPicker.style.display = 'none';
      if (titleText) { titleText.style.display = ''; titleText.textContent = '模型'; }
      if (rightToggle) rightToggle.style.display = 'none';
      // 显示顶栏"添加模型"按钮，隐藏页面内的
      const topBtn = document.querySelector('.models-top-btn');
      const pageBtn = document.querySelector('.models-header .models-add-btn');
      const pageH1 = document.querySelector('.models-header h1');
      if (topBtn) topBtn.style.display = 'flex';
      if (pageBtn) pageBtn.style.display = 'none';
      if (pageH1) pageH1.style.display = 'none';
      // 模型页撑满宽度
      const chatInner = document.querySelector('.chat-inner');
      const mHeader = document.querySelector('.models-header');
      const chatScroll = document.querySelector('.chat-scroll');
      if (chatInner) chatInner.style.maxWidth = 'none';
      if (chatScroll) chatScroll.style.paddingBottom = '0';
      if (mHeader) { mHeader.style.padding = '0'; mHeader.style.margin = '0'; mHeader.style.minHeight = '0'; }
    } else {
      const composer = document.querySelector('.composer-box');
      const disclaimer = document.querySelector('.disclaimer-bar');
      const disclaimerText = document.querySelector('.disclaimer-text');
      if (composer) composer.style.display = '';
      if (disclaimer) disclaimer.style.display = '';
      if (disclaimerText) disclaimerText.style.display = '';
      // 恢复顶栏元素
      const modelPicker = document.querySelector('.model-picker');
      const titleText = document.getElementById('chat-title');
      const rightToggle = document.querySelector('.right-toggle');
      if (modelPicker) modelPicker.style.display = '';
      if (titleText) titleText.style.display = '';
      if (rightToggle) rightToggle.style.display = '';
      // 隐藏顶栏按钮，恢复页面内按钮
      const topBtn = document.querySelector('.models-top-btn');
      const pageBtn = document.querySelector('.models-header .models-add-btn');
      const pageH1 = document.querySelector('.models-header h1');
      if (topBtn) topBtn.style.display = 'none';
      if (pageBtn) pageBtn.style.display = '';
      if (pageH1) pageH1.style.display = '';
      // 恢复宽度限制
      const chatInner = document.querySelector('.chat-inner');
      if (chatInner) chatInner.style.maxWidth = '';
      // 恢复 padding
      const chatScroll = document.querySelector('.chat-scroll');
      if (chatScroll) chatScroll.style.paddingBottom = '';
      // 恢复 models-header
      const mHeader = document.querySelector('.models-header');
      if (mHeader) { mHeader.style.padding = ''; mHeader.style.margin = ''; mHeader.style.minHeight = ''; }
    }

    // 更新顶栏标题
    if (chatTitle) {
      const activeItem = document.querySelector('.recent-item.active');
      if (activeItem) {
        const span = activeItem.querySelector('span');
        if (span) chatTitle.textContent = span.textContent;
      }
    }

    // 恢复用量文本（非新对话页显示完整信息）
    if (chatId !== 'newchat') {
      const usage = document.querySelector('.usage-text');
      if (usage) usage.textContent = '20.2k / 1.0M  ·  剩余 979.8k';
    }
    // 新对话按钮的选中态
    const newChatBtn = document.querySelector('.new-chat');
    if (newChatBtn) newChatBtn.classList.toggle('active', chatId === 'newchat');
  }

  recentItems.forEach((item) => {
    item.addEventListener('click', () => {
      const chatId = item.dataset.chat;
      if (chatId) switchChat(chatId);
    });
  });

  // 初始化：应用已保存的状态
  const initial = loadState();
  app.setAttribute('data-left', initial.left);
  app.setAttribute('data-right', initial.right);
  updateLabels();

  // 点击空白处关闭所有下拉
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.right-view-switch') && !e.target.closest('.log-filter-dropdown') && !e.target.closest('.fav-star-btn') && !e.target.closest('.ms-filter-box') && !e.target.closest('.custom-select')) {
      document.querySelectorAll('.right-view-switch.open, .log-filter-dropdown.open, .ms-drop.open, .custom-select.open').forEach(d => { d.classList.remove('open'); });
    }
  });

  // ========== 文件卡片点击：自动打开右侧栏 ==========
  const fileCard = document.querySelector('.file-card');
  if (fileCard) {
    fileCard.addEventListener('click', () => {
      if (app.getAttribute('data-right') === 'closed') {
        app.setAttribute('data-right', 'open');
        saveState(app.getAttribute('data-left'), 'open');
        updateLabels();
      }
    });
  }

  // ========== 新手引导：步骤推进 ==========
  window.guideNext = function() {
    const steps = document.querySelectorAll('.guide-step');
    if (!steps.length) return;

    let current = 0;
    steps.forEach((step, i) => {
      if (step.classList.contains('active')) {
        current = i;
      }
    });

    // 标记当前为完成
    if (steps[current]) {
      steps[current].classList.remove('active');
      steps[current].classList.add('completed');
    }

    // 激活下一步
    const next = current + 1;
    if (next < steps.length) {
      steps[next].classList.add('active');
      const progress = document.getElementById('guide-progress');
      if (progress) progress.textContent = (next + 1) + '/5';
    } else {
      // 全部完成
      const btn = document.getElementById('guide-next-btn');
      if (btn) {
        btn.textContent = '✓ 完成';
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'default';
      }
      const guideBtn = document.getElementById('guide-guide-btn');
      if (guideBtn) {
        guideBtn.textContent = '再次体验';
        guideBtn.setAttribute('onclick', 'guideReset()');
      }
      const progress = document.getElementById('guide-progress');
      if (progress) progress.textContent = '5/5 ✓';
    }
  };

  // ========== 新手引导：重置 ==========
  window.guideReset = function() {
    const steps = document.querySelectorAll('.guide-step');
    if (!steps.length) return;
    steps.forEach((step, i) => {
      step.classList.remove('active', 'completed');
      if (i === 0) step.classList.add('active');
    });
    const progress = document.getElementById('guide-progress');
    if (progress) progress.textContent = '1/5';
    const btn = document.getElementById('guide-next-btn');
    if (btn) {
      btn.textContent = '下一步';
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
    }
    const guideBtn = document.getElementById('guide-guide-btn');
    if (guideBtn) {
      guideBtn.textContent = '操作引导';
    }
  };

  // ========== Figma 对话：日志/文件查看切换 ==========
  window.switchFigmaView = function(view, btn) {
    // 更新下拉菜单选中状态
    btn.parentElement.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    // 只在当前 right-page 内切换视图
    const page = btn.closest('.right-page');
    if (page) {
      page.querySelectorAll('.figma-view').forEach(el => {
        el.classList.toggle('hidden', el.dataset.figmaView !== view);
      });
    }
  };

  // ========== 日志筛选 ==========
  window.filterLogs = function(type, btn) {
    // 更新选中状态
    btn.parentElement.querySelectorAll('.log-filter-item').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    // 找到同一 right-page 内的日志列表
    const page = btn.closest('.right-page');
    if (!page) return;
    const items = page.querySelectorAll('.log-item');
    items.forEach(item => {
      const tag = item.querySelector('.log-tag');
      if (!tag) return;
      const level = tag.textContent.trim();
      if (type === 'all') {
        item.classList.remove('filtered-out');
      } else if (type === 'safe') {
        item.classList.toggle('filtered-out', level === 'ERROR');
      } else if (type === 'danger') {
        item.classList.toggle('filtered-out', level !== 'ERROR');
      }
    });
  };

  // ========== 新手引导：跳转到指定步骤 ==========
  window.jumpToStep = function(target) {
    const steps = document.querySelectorAll('.guide-step');
    if (!steps.length) return;
    steps.forEach((step, i) => {
      step.classList.remove('active', 'completed');
      if (i + 1 < target) step.classList.add('completed');
      if (i + 1 === target) step.classList.add('active');
    });
    const progress = document.getElementById('guide-progress');
    if (progress) progress.textContent = target + '/5';
    const btn = document.getElementById('guide-next-btn');
    if (btn) {
      btn.textContent = '下一步';
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
    }
    const guideBtn = document.getElementById('guide-guide-btn');
    if (guideBtn) {
      guideBtn.textContent = target === 5 ? '再次体验' : '操作引导';
    }
  };

  // ========== 右侧栏视图切换 ==========
  window.switchRightView = function(view, btn) {
    btn.parentElement.querySelectorAll('.view-switch-item').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const label = btn.closest('.right-view-switch').querySelector('.view-switch-label');
    if (label) label.textContent = btn.textContent;
    btn.closest('.right-view-switch').classList.remove('open');
    const page = btn.closest('.right-page');
    if (page) {
      page.querySelectorAll('[data-right-view]').forEach(el => {
        el.classList.toggle('hidden', el.dataset.rightView !== view);
      });
    }
  };

  // ========== 新对话 ==========
  window.switchToNewChat = function() {
    document.querySelectorAll('.chat-page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.right-page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.recent-item').forEach(r => r.classList.remove('active'));
    document.querySelectorAll('.left-nav .nav-hit, .bottom-nav .nav-hit').forEach(l => l.classList.remove('active'));
    const nc = document.querySelector('[data-page="newchat"]');
    const rc = document.querySelector('[data-right-page="newchat"]');
    const title = document.getElementById('chat-title');
    const btn = document.querySelector('.new-chat');
    if (nc) nc.classList.remove('hidden');
    if (rc) rc.classList.remove('hidden');
    if (title) title.textContent = '新对话';
    if (btn) btn.classList.add('active');
    const usage = document.querySelector('.usage-text');
    if (usage) usage.textContent = '1.0 M';

    // 自动收起右侧栏
    const app = document.querySelector('.app');
    if (app && app.getAttribute('data-right') === 'open') {
      const key = 'data-right';
      app.setAttribute(key, 'closed');
      const rightPanel = document.querySelector('.right-panel');
      if (rightPanel) {
        rightPanel.style.width = '';
        rightPanel.style.flexBasis = '';
        document.documentElement.style.removeProperty('--right-w');
      }
      // 更新按钮 label
      document.querySelectorAll('[data-right-toggle]').forEach(btn => {
        btn.setAttribute('aria-label', '展开右侧栏');
        if (btn.tagName === 'BUTTON') btn.title = '展开右侧栏';
      });
    }
  };

  // ========== 任务框架：点击选中 ==========
  document.querySelectorAll('.fw-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      const row = this.closest('.fw-row');
      if (row) {
        row.querySelectorAll('.fw-pill').forEach(p => p.classList.remove('active'));
      }
      this.classList.toggle('active');
    });
  });

  // ========== 文件卡片收藏切换 ==========
  window.toggleFileFav = function(btn) {
    const img = btn.querySelector('img');
    const isFav = btn.title === '取消收藏';
    if (isFav) {
      img.src = 'icon/source/Frame-2.svg';
      btn.title = '收藏';
      // 从收藏夹中移除
      const favList = document.querySelector('.fav-dd-list');
      if (favList) {
        const items = favList.querySelectorAll('.fav-item');
        items.forEach(item => {
          if (item.querySelector('.fav-name').textContent.includes('daily-insight')) {
            item.style.opacity = '0';
            item.style.transition = 'opacity .3s ease';
            setTimeout(() => item.remove(), 300);
          }
        });
      }
    } else {
      img.src = 'icon/source/Frame-3.svg';
      btn.title = '取消收藏';
      // 添加回收藏夹
      const favList = document.querySelector('.fav-dd-list');
      if (favList) {
        const div = document.createElement('div');
        div.className = 'fav-item';
        div.innerHTML = '<img class="fav-icon" src="icon/fav-code.svg" alt="" /><span class="fav-name">daily-insight-mockup.html</span><button class="fav-remove" onclick="this.closest(\'.fav-item\').remove()" title="取消收藏">×</button>';
        favList.appendChild(div);
      }
    }
  };
  // ========== 复制功能：点击复制图标 → 复制文本 → 显示对勾 ==========
  document.addEventListener('click', function(e) {
    const icon = e.target.closest('img[src*="Frame-12"], img[src*="source/Frame.svg"]');
    if (!icon) return;
    // 排除收藏按钮
    if (icon.closest('.fav-toggle-btn')) return;
    e.stopPropagation();
    let text = '';
    const container = icon.closest('.chat-row') || icon.closest('.file-card-wrapper');
    if (container) {
      const bubble = container.querySelector('.chat-bubble p');
      if (bubble) {
        text = bubble.innerText;
      } else {
        const path = container.querySelector('.file-path');
        if (path) text = path.textContent;
        else {
          const name = container.querySelector('.file-name');
          if (name) text = name.textContent;
        }
      }
    }
    if (text) {
      const copy = () => {
        if (navigator.clipboard) {
          return navigator.clipboard.writeText(text);
        }
        // 回退方案
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return Promise.resolve();
      };
      copy().then(() => {
        const original = icon.src;
        icon.src = icon.src.replace(/Frame-12\.svg$/, 'check.svg').replace(/source\/Frame\.svg$/, 'check.svg');
        icon.dataset.origSrc = original;
        setTimeout(() => { if (icon.dataset.origSrc) icon.src = icon.dataset.origSrc; }, 1500);
      }).catch(err => { console.log('复制失败:', err); });
    }
  });
  // ========== 来源筛选 ==========
  window.filterProvider = function(prov, btn) {
    const dropdown = btn.closest('.ms-drop');
    dropdown.querySelectorAll('span').forEach(s => s.style.background = '');
    btn.style.background = '#f5f5f5';
    dropdown.classList.remove('open');
    const rows = document.querySelectorAll('.mt-row');
    rows.forEach(row => {
      if (prov === 'all') { row.style.display = ''; return; }
      const provEl = row.querySelector('.mt-prov');
      if (!provEl) return;
      const text = provEl.textContent.trim();
      row.style.display = text.includes(prov) ? '' : 'none';
    });
  };

  // ========== 模型列表筛选 ==========
  window.filterModels = function(cap, btn) {
    const dropdown = btn.closest('.ms-drop');
    dropdown.querySelectorAll('span').forEach(s => s.style.background = '');
    btn.style.background = '#f5f5f5';
    dropdown.classList.remove('open');
    const rows = document.querySelectorAll('.mt-row');
    rows.forEach(row => {
      if (cap === 'all') { row.style.display = ''; return; }
      const stars = row.querySelectorAll('.mt-stars');
      let targetStars = null;
      stars.forEach(s => {
        const label = s.querySelector('.mt-label');
        if (label && label.textContent.trim() === cap) {
          targetStars = s;
        }
      });
      if (!targetStars) { row.style.display = ''; return; }
      const filled = targetStars.querySelectorAll('.dot.fill').length;
      row.style.display = filled >= 4 ? '' : 'none';
    });
  };
})();

// 模型管理弹窗
function openManageModal() { document.getElementById('manage-model-modal').classList.add('open'); }
function closeManageModal(e) {
  if (e && e.target !== document.getElementById('manage-model-modal')) return;
  document.getElementById('manage-model-modal').classList.remove('open');
}
function selectManageProvider(el) {
  const cs = el.closest('.custom-select');
  const icon = el.querySelector('.cs-icon');
  const trigger = cs.querySelector('.cs-trigger');
  const textSpan = trigger.querySelector('.cs-text');
  const oldIcon = trigger.querySelector('.cs-selected-icon');
  if (oldIcon) oldIcon.remove();
  if (icon) { const clone = icon.cloneNode(true); clone.className = 'cs-selected-icon'; clone.style.cssText = 'width:20px;height:20px;flex-shrink:0;'; trigger.insertBefore(clone, textSpan); }
  textSpan.textContent = el.textContent.trim();
  textSpan.classList.add('selected');
  cs.classList.remove('open');
}
function selectOption(el) {
  const cs = el.closest('.custom-select');
  cs.querySelector('.cs-text').textContent = el.textContent.trim();
  cs.querySelector('.cs-text').classList.add('selected');
  cs.classList.remove('open');
}
function toggleKeyIcon(id, btn) {
  const input = document.getElementById(id);
  const img = btn.querySelector('img');
  if (input.value.includes('*')) {
    input.value = 'sk-d68bd7a2c9f43e18b5d2a9f1141';
    img.src = 'icon/eye-on.svg';
  } else {
    input.value = input.value.slice(0,7) + '***********************' + input.value.slice(-4);
    img.src = 'icon/eye-off.svg';
  }
}

// 添加模型弹窗
function openAddModel() {
  document.getElementById('add-model-modal').classList.add('open');
}
function closeAddModel(e) {
  if (e && e.target !== document.getElementById('add-model-modal')) return;
  document.getElementById('add-model-modal').classList.remove('open');
}
function switchAddMode(btn) {
  document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const isCustom = btn.textContent.trim() === '自定义';
  document.getElementById('preset-body').style.display = isCustom ? 'none' : 'flex';
  document.getElementById('custom-body').style.display = isCustom ? 'flex' : 'none';
}
function selectModel(el) {
  const cs = el.closest('.custom-select');
  cs.querySelector('.cs-text').textContent = el.textContent.trim();
  cs.querySelector('.cs-text').classList.add('selected');
  cs.classList.remove('open');
}

function updateModelOptions() {
  const prov = document.getElementById('custom-provider').dataset.value || '';
  const drop = document.getElementById('custom-model-drop');
  const cs = document.getElementById('custom-model');
  drop.innerHTML = '';
  const models = {
    openai: ['gpt-5.5/pro','gpt-5.4','gpt-5.3-codex','gpt-image-2'],
    anthropic: ['claude-opus-5','claude-sonnet-5','claude-haiku-5','claude-opus-4.8'],
    deepseek: ['deepseek-v4-pro','deepseek-v4-flash'],
    google: ['gemini-3.5-pro','gemini-3.5-flash','gemini-3.1-pro'],
    moonshot: ['kimi-2.6'],
    alibaba: ['qwen3.1-max','qwen3.1-plus'],
    tencent: ['hunyuan-turbo']
  };
  if (models[prov]) {
    models[prov].forEach(m => { 
      const d = document.createElement('div'); 
      d.className = 'cs-option'; 
      d.textContent = m; 
      d.onclick = function() { selectModel(this); }; 
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
  const cs = el.closest('.custom-select');
  const icon = el.querySelector('.cs-icon');
  const name = el.textContent.trim();
  // 更新触发区：插入图标 + 名称
  const trigger = cs.querySelector('.cs-trigger');
  const textSpan = trigger.querySelector('.cs-text');
  // 移除旧图标
  const oldIcon = trigger.querySelector('.cs-selected-icon');
  if (oldIcon) oldIcon.remove();
  if (icon) {
    const clone = icon.cloneNode(true);
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
