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
        if (knob) knob.style.left = toolsVisible ? '23px' : '2px';
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

  // ========== 对话切换 ==========
  const recentItems = document.querySelectorAll('.recent-item[data-chat]');
  const chatPages = document.querySelectorAll('.chat-page');
  const rightPages = document.querySelectorAll('.right-page');
  const chatTitle = document.getElementById('chat-title');

  function switchChat(chatId) {
    // 更新左栏选中状态
    recentItems.forEach((item) => {
      const isTarget = item.dataset.chat === chatId;
      item.classList.toggle('active', isTarget);
      // 确保 active 项有背景元素
      let bg = item.querySelector('.recent-active-bg');
      if (isTarget && !bg) {
        bg = document.createElement('div');
        bg.className = 'recent-active-bg';
        item.insertBefore(bg, item.firstChild);
      } else if (!isTarget && bg) {
        bg.remove();
      }
    });

    // 切换对话内容
    chatPages.forEach((page) => {
      page.classList.toggle('hidden', page.dataset.page !== chatId);
    });

    // 切换右栏内容
    rightPages.forEach((page) => {
      page.classList.toggle('hidden', page.dataset.rightPage !== chatId);
    });

    // 更新顶栏标题
    if (chatTitle) {
      const activeItem = document.querySelector('.recent-item.active');
      if (activeItem) {
        const span = activeItem.querySelector('span');
        if (span) chatTitle.textContent = span.textContent;
      }
    }
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
    if (!e.target.closest('.right-view-switch') && !e.target.closest('.log-filter-dropdown') && !e.target.closest('.fav-star-btn')) {
      document.querySelectorAll('.right-view-switch.open, .log-filter-dropdown.open').forEach(d => d.classList.remove('open'));
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
      const progress = document.getElementById('guide-progress');
      if (progress) progress.textContent = '5/5 ✓';
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
})();
