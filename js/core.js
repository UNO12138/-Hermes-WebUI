/**
 * core.js — 核心交互模块
 * 侧栏切换 / 导航 / 对话切换 / 状态持久化 / 右栏拖拽
 * 不涉及具体页面内容
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'hermes-webui-sidebar-state';
  const app = document.querySelector('.app');
  if (!app) return;

  const leftToggles = document.querySelectorAll('[data-left-toggle]');
  const rightToggles = document.querySelectorAll('[data-right-toggle]');
  const rightPanel = document.querySelector('.right-panel');

  /* ========== 状态管理 ========== */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { left: 'open', right: 'open' };
      const parsed = JSON.parse(raw);
      return {
        left: parsed.left === 'closed' ? 'closed' : 'open',
        right: parsed.right === 'closed' ? 'closed' : 'open',
      };
    } catch (e) { return { left: 'open', right: 'open' }; }
  }

  function saveState(left, right) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right })); } catch (e) {}
  }

  function updateLabels() {
    const leftOpen = app.getAttribute('data-left') !== 'closed';
    const rightOpen = app.getAttribute('data-right') !== 'closed';
    leftToggles.forEach(function(btn) {
      var label = leftOpen ? '收起左侧栏' : '展开左侧栏';
      btn.setAttribute('aria-label', label);
      if (btn.tagName === 'BUTTON') btn.title = label;
    });
    rightToggles.forEach(function(btn) {
      var label = rightOpen ? '收起右侧栏' : '展开右侧栏';
      btn.setAttribute('aria-label', label);
      if (btn.tagName === 'BUTTON') btn.title = label;
    });
  }

  /* ========== 侧栏切换 ========== */
  function toggleSide(side) {
    var key = side === 'left' ? 'data-left' : 'data-right';
    var current = app.getAttribute(key);
    var next = current === 'open' ? 'closed' : 'open';
    app.setAttribute(key, next);

    if (side === 'right' && rightPanel) {
      rightPanel.style.width = '';
      rightPanel.style.flexBasis = '';
      document.documentElement.style.removeProperty('--right-w');
    }
    saveState(app.getAttribute('data-left'), app.getAttribute('data-right'));
    updateLabels();
  }

  leftToggles.forEach(function(btn) {
    btn.addEventListener('click', function(e) { e.preventDefault(); toggleSide('left'); });
  });
  rightToggles.forEach(function(btn) {
    btn.addEventListener('click', function(e) { e.preventDefault(); toggleSide('right'); });
  });

  // 键盘快捷键
  window.addEventListener('keydown', function(e) {
    var ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (e.key === '[') { e.preventDefault(); toggleSide('left'); }
    else if (e.key === ']') { e.preventDefault(); toggleSide('right'); }
  });

  /* ========== 右栏拖拽 ========== */
  var resizeHandle = document.querySelector('[data-resize-right]');
  var isResizing = false, startX = 0, startWidth = 0;

  if (resizeHandle && rightPanel) {
    resizeHandle.addEventListener('mousedown', function(e) {
      isResizing = true;
      startX = e.clientX;
      startWidth = rightPanel.offsetWidth;
      resizeHandle.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', function(e) {
      if (!isResizing) return;
      var delta = startX - e.clientX;
      var newWidth = Math.max(240, Math.min(800, startWidth + delta));
      rightPanel.style.width = newWidth + 'px';
      rightPanel.style.flexBasis = newWidth + 'px';
      document.documentElement.style.setProperty('--right-w', newWidth + 'px');
    });
    window.addEventListener('mouseup', function() {
      if (!isResizing) return;
      isResizing = false;
      resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  /* ========== 工具调用显示/隐藏 ========== */
  var toolToggle = document.querySelector('[data-tool-toggle]');
  var toolCalls = document.querySelectorAll('[data-tool-call]');
  var toolsVisible = true;

  function updateToolVisibility() {
    toolCalls.forEach(function(el) { el.style.display = toolsVisible ? '' : 'none'; });
    if (toolToggle) {
      var switchEl = toolToggle.querySelector('.switch');
      if (switchEl) {
        switchEl.style.background = toolsVisible ? '#686868' : '#c4c4c4';
        var knob = switchEl.querySelector('i');
        if (knob) knob.style.left = toolsVisible ? '16px' : '2px';
      }
    }
  }

  if (toolToggle) {
    toolToggle.addEventListener('click', function(e) {
      e.preventDefault();
      toolsVisible = !toolsVisible;
      updateToolVisibility();
    });
    updateToolVisibility();
  }

  /* ========== 对话页面切换 ========== */
  var recentItems = document.querySelectorAll('.recent-item[data-chat]');
  var chatPages = document.querySelectorAll('.chat-page');
  var rightPages = document.querySelectorAll('.right-page');
  var chatTitle = document.getElementById('chat-title');

  // 主导航带 data-chat 的链接
  document.querySelectorAll('.left-nav .nav-hit[data-chat], .bottom-nav .nav-hit[data-chat]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchChat(link.dataset.chat);
    });
  });

  function switchChat(chatId) {
    // 关闭所有下拉
    document.querySelectorAll('.ms-drop.open, .custom-select.open, .right-view-switch.open, .log-filter-dropdown.open').forEach(function(d) {
      d.classList.remove('open');
    });

    // 左栏最近对话选中（新手引导不关联对话记录）
    recentItems.forEach(function(item) {
      var isTarget = item.dataset.chat === chatId && chatId !== 'guide';
      item.classList.toggle('active', isTarget);
      var bg = item.querySelector('.recent-active-bg');
      if (isTarget && !bg) {
        bg = document.createElement('div'); bg.className = 'recent-active-bg';
        item.insertBefore(bg, item.firstChild);
      } else if (!isTarget && bg) { bg.remove(); }
    });

    // 导航链接选中
    document.querySelectorAll('.left-nav .nav-hit, .bottom-nav .nav-hit').forEach(function(link) {
      link.classList.toggle('active', link.dataset.chat === chatId);
    });

    // 切换对话内容
    chatPages.forEach(function(page) {
      page.classList.toggle('hidden', page.dataset.page !== chatId);
    });

    // 切换右栏内容
    rightPages.forEach(function(page) {
      page.classList.toggle('hidden', page.dataset.rightPage !== chatId);
    });

    // 模型页 / 用量页特殊处理
    handleSpecialPages(chatId);

    // 新对话按钮选中
    var newChatBtn = document.querySelector('.new-chat');
    if (newChatBtn) newChatBtn.classList.toggle('active', chatId === 'newchat');

    // 更新标题
    updateTitle(chatId);
  }

  function handleSpecialPages(chatId) {
    var composer = document.querySelector('.composer-box');
    var disclaimer = document.querySelector('.disclaimer-bar');
    var disclaimerText = document.querySelector('.disclaimer-text');
    var modelPicker = document.querySelector('.model-picker');
    var titleText = document.getElementById('chat-title');
    var rightToggle = document.querySelector('.right-toggle');
    var topBtn = document.querySelector('.models-top-btn');
    var usageTopBar = document.querySelector('.usage-top-bar');
    var chatInner = document.querySelector('.chat-inner');
    var chatScroll = document.querySelector('.chat-scroll');

    // 清除旧的 data-current-page
    app.removeAttribute('data-current-page');

    var isSpecial = (chatId === 'models' || chatId === 'usage');
    var isGuide = (chatId === 'guide');

    if (isGuide) {
      // 引导页：隐藏顶栏、输入框、右栏，全屏
      app.setAttribute('data-current-page', 'guide');
      app.setAttribute('data-hide-right', 'true');
      if (titleText) titleText.style.display = 'none';
      if (rightToggle) rightToggle.style.display = 'none';
      if (topBtn) topBtn.style.display = 'none';
      if (usageTopBar) usageTopBar.style.display = 'none';
    } else if (isSpecial) {
      app.setAttribute('data-hide-right', 'true');
      if (composer) composer.style.display = 'none';
      if (disclaimer) disclaimer.style.display = 'none';
      if (disclaimerText) disclaimerText.style.display = 'none';
      if (modelPicker) modelPicker.style.display = 'none';
      if (rightToggle) rightToggle.style.display = 'none';
      if (titleText) { titleText.style.display = ''; titleText.textContent = (chatId === 'models' ? '模型' : '用量监控'); }
      if (topBtn) topBtn.style.display = (chatId === 'models') ? 'flex' : 'none';
      if (usageTopBar) usageTopBar.style.display = (chatId === 'usage') ? 'flex' : 'none';
      if (chatInner) chatInner.style.maxWidth = 'none';
      if (chatScroll) chatScroll.style.paddingBottom = '0';

      // 隐藏页面内标题
      var pageH1 = document.querySelector('.models-header h1');
      var usageH1 = document.querySelector('.usage-header h1');
      var usageHeaderRight = document.querySelector('.usage-header-right');
      var pageBtn = document.querySelector('.models-header .models-add-btn');
      if (pageH1) pageH1.style.display = 'none';
      if (pageBtn) pageBtn.style.display = 'none';
      if (usageH1) usageH1.style.display = 'none';
      if (usageHeaderRight) usageHeaderRight.style.display = 'none';
    } else {
      app.removeAttribute('data-hide-right');
      if (composer) composer.style.display = '';
      if (disclaimer) disclaimer.style.display = '';
      if (disclaimerText) disclaimerText.style.display = '';
      if (modelPicker) modelPicker.style.display = '';
      if (rightToggle) rightToggle.style.display = '';
      if (titleText) titleText.style.display = '';
      if (topBtn) topBtn.style.display = 'none';
      if (usageTopBar) usageTopBar.style.display = 'none';
      if (chatInner) chatInner.style.maxWidth = '';
      if (chatScroll) chatScroll.style.paddingBottom = '';

      var pageH1 = document.querySelector('.models-header h1');
      var usageH1 = document.querySelector('.usage-header h1');
      var usageHeaderRight = document.querySelector('.usage-header-right');
      var pageBtn = document.querySelector('.models-header .models-add-btn');
      if (pageH1) pageH1.style.display = '';
      if (pageBtn) pageBtn.style.display = '';
      if (usageH1) usageH1.style.display = '';
      if (usageHeaderRight) usageHeaderRight.style.display = '';
    }
  }

  function updateTitle(chatId) {
    if (chatTitle) {
      if (chatId === 'models') { chatTitle.textContent = '模型'; return; }
      if (chatId === 'usage') { chatTitle.textContent = '用量监控'; return; }
      var activeItem = document.querySelector('.recent-item.active');
      if (activeItem) {
        var span = activeItem.querySelector('span');
        if (span) chatTitle.textContent = span.textContent;
      }
    }
    var usage = document.querySelector('.usage-text');
    if (chatId !== 'newchat' && usage) {
      usage.textContent = '20.2k / 1.0M  ·  剩余 979.8k';
    }
  }

  recentItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var cid = item.dataset.chat;
      if (cid) switchChat(cid);
    });
  });

  /* ========== 新对话 ========== */
  window.switchToNewChat = function() {
    document.querySelectorAll('.chat-page').forEach(function(p) { p.classList.add('hidden'); });
    document.querySelectorAll('.right-page').forEach(function(p) { p.classList.add('hidden'); });
    document.querySelectorAll('.recent-item').forEach(function(r) { r.classList.remove('active'); });
    document.querySelectorAll('.left-nav .nav-hit, .bottom-nav .nav-hit').forEach(function(l) { l.classList.remove('active'); });
    if (app) { app.removeAttribute('data-hide-right'); app.removeAttribute('data-current-page'); }

    var nc = document.querySelector('[data-page="newchat"]');
    var rc = document.querySelector('[data-right-page="newchat"]');
    var title = document.getElementById('chat-title');
    var btn = document.querySelector('.new-chat');
    if (nc) nc.classList.remove('hidden');
    if (rc) rc.classList.remove('hidden');
    if (title) { title.textContent = '新对话'; title.style.display = ''; }
    if (btn) btn.classList.add('active');

    var usage = document.querySelector('.usage-text');
    if (usage) usage.textContent = '1.0 M';

    // 恢复 UI
    var composer = document.querySelector('.composer-box');
    var disclaimer = document.querySelector('.disclaimer-bar');
    var disclaimerText = document.querySelector('.disclaimer-text');
    var modelPicker = document.querySelector('.model-picker');
    var rightToggle = document.querySelector('.right-toggle');
    var topBtn = document.querySelector('.models-top-btn');
    var usageTopBar = document.querySelector('.usage-top-bar');
    var chatInner = document.querySelector('.chat-inner');
    var chatScroll = document.querySelector('.chat-scroll');
    if (composer) composer.style.display = '';
    if (disclaimer) disclaimer.style.display = '';
    if (disclaimerText) disclaimerText.style.display = '';
    if (modelPicker) modelPicker.style.display = '';
    if (rightToggle) rightToggle.style.display = '';
    if (topBtn) topBtn.style.display = 'none';
    if (usageTopBar) usageTopBar.style.display = 'none';
    if (chatInner) chatInner.style.maxWidth = '';
    if (chatScroll) chatScroll.style.paddingBottom = '';

    var pageH1 = document.querySelector('.models-header h1');
    var usageH1 = document.querySelector('.usage-header h1');
    var usageHeaderRight = document.querySelector('.usage-header-right');
    var pageBtn = document.querySelector('.models-header .models-add-btn');
    if (pageH1) pageH1.style.display = '';
    if (pageBtn) pageBtn.style.display = '';
    if (usageH1) usageH1.style.display = '';
    if (usageHeaderRight) usageHeaderRight.style.display = '';

    // 自动收起右侧栏
    if (app && app.getAttribute('data-right') === 'open') {
      app.setAttribute('data-right', 'closed');
      if (rightPanel) { rightPanel.style.width = ''; rightPanel.style.flexBasis = ''; }
      document.documentElement.style.removeProperty('--right-w');
      document.querySelectorAll('[data-right-toggle]').forEach(function(b) {
        b.setAttribute('aria-label', '展开右侧栏');
        if (b.tagName === 'BUTTON') b.title = '展开右侧栏';
      });
    }
  };

  /* ========== 任务框架点击 ========== */
  document.querySelectorAll('.fw-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var row = pill.closest('.fw-row');
      if (row) { row.querySelectorAll('.fw-pill').forEach(function(p) { p.classList.remove('active'); }); }
      pill.classList.toggle('active');
    });
  });

  /* ========== 文件卡片点击 → 打开右栏 ========== */
  var fileCard = document.querySelector('.file-card');
  if (fileCard) {
    fileCard.addEventListener('click', function() {
      if (app.getAttribute('data-right') === 'closed') {
        app.setAttribute('data-right', 'open');
        saveState(app.getAttribute('data-left'), 'open');
        updateLabels();
      }
    });
  }

  /* ========== 点击空白关闭下拉 ========== */
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.right-view-switch') &&
        !e.target.closest('.log-filter-dropdown') &&
        !e.target.closest('.fav-star-btn') &&
        !e.target.closest('.ms-filter-box') &&
        !e.target.closest('.custom-select')) {
      document.querySelectorAll('.right-view-switch.open, .log-filter-dropdown.open, .ms-drop.open, .custom-select.open').forEach(function(d) {
        d.classList.remove('open');
      });
    }
  });

  /* ========== 初始化 ========== */
  var initial = loadState();
  app.setAttribute('data-left', initial.left);
  app.setAttribute('data-right', initial.right);
  updateLabels();

  // 初始页面为新手引导，应用引导页的隐藏规则
  switchChat('guide');
})();
