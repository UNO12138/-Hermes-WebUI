/**
 * tour.js — 新手引导遮罩+弹窗系统
 * 每步配置: { target, title, desc, position, padding, vOffset, heightAdjust }
 * target 可为 CSS 选择器字符串或元素数组（多元素合围成一个挖洞）
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'tour-overlay';
  var CUTOUT_ID = 'tour-cutout';
  var POPUP_ID = 'tour-popup';
  var PADDING = 0;

  var steps = [];
  var currentStep = 0;

  /** 合围矩形 */
  function unionRect(rects) {
    if (!rects || !rects.length) return null;
    var r = { left: rects[0].left, top: rects[0].top, right: rects[0].right, bottom: rects[0].bottom, width: rects[0].width, height: rects[0].height };
    for (var i = 1; i < rects.length; i++) {
      var c = rects[i];
      r.left = Math.min(r.left, c.left);
      r.top = Math.min(r.top, c.top);
      r.right = Math.max(r.right, c.right);
      r.bottom = Math.max(r.bottom, c.bottom);
      r.width = r.right - r.left;
      r.height = r.bottom - r.top;
    }
    return r;
  }

  function resolveTargets(target) {
    if (Array.isArray(target)) {
      var els = target.map(function (s) { return document.querySelector(s); }).filter(Boolean);
      if (!els.length) return null;
      return { els: els, rect: unionRect(els.map(function (el) { return el.getBoundingClientRect(); })) };
    }
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    return { els: [el], rect: el.getBoundingClientRect() };
  }

  function ensureOverlay() {
    var el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = OVERLAY_ID;
      el.className = 'tour-overlay';
      var cutout = document.createElement('div');
      cutout.id = CUTOUT_ID;
      cutout.className = 'tour-cutout';
      el.appendChild(cutout);
      var popup = document.createElement('div');
      popup.id = POPUP_ID;
      popup.className = 'tour-popup';
      el.appendChild(popup);
      document.body.appendChild(el);
    }
    return el;
  }

  function updateCutout(rect, padding, vOffset, heightAdjust) {
    vOffset = vOffset || 0;
    heightAdjust = heightAdjust || 0;
    var cutout = document.getElementById(CUTOUT_ID);
    if (!cutout) return;
    cutout.style.left = (rect.left - padding) + 'px';
    cutout.style.top = (rect.top - padding + vOffset) + 'px';
    cutout.style.width = (rect.width + padding * 2) + 'px';
    cutout.style.height = (rect.height + padding * 2 + heightAdjust) + 'px';
    cutout.style.borderRadius = '10px';
  }

  function updatePopup(rect, position) {
    var popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    var ph = popup.offsetHeight || 120;

    popup.classList.remove('arrow-down', 'arrow-up');

    if (position === 'top') {
      popup.style.left = Math.max(16, rect.left) + 'px';
      popup.style.top = Math.max(16, rect.top - PADDING - ph - 12) + 'px';
      popup.classList.add('arrow-down');
    } else if (position === 'bottom') {
      popup.style.left = Math.max(16, rect.left) + 'px';
      popup.style.top = (rect.bottom + PADDING + 12) + 'px';
      popup.classList.add('arrow-up');
    } else if (position === 'right') {
      popup.style.left = (rect.right + PADDING + 12) + 'px';
      popup.style.top = Math.max(16, rect.top + rect.height / 2 - ph / 2) + 'px';
    } else {
      popup.style.left = Math.max(16, rect.left) + 'px';
      popup.style.top = Math.max(16, rect.top - PADDING - ph - 12) + 'px';
      popup.classList.add('arrow-down');
    }
  }

  function showStep(index) {
    if (index >= steps.length) { destroy(); return; }
    currentStep = index;
    var step = steps[index];

    var resolved = resolveTargets(step.target);
    if (!resolved) { console.warn('tour: target not found', step.target); destroy(); return; }

    ensureOverlay();
    updateCutout(resolved.rect, step.padding || PADDING, step.vOffset || 0, step.heightAdjust || 0);

    var popup = document.getElementById(POPUP_ID);
    popup.innerHTML =
      '<div class="tour-popup-title">' + step.title + '</div>' +
      '<div class="tour-popup-desc">' + step.desc + '</div>' +
      '<div class="tour-popup-footer">' +
      '<button class="tour-popup-skip" onclick="window.tourSkip()">跳过</button>' +
      '<button class="tour-popup-next" onclick="window.tourNext()">' +
      (index === steps.length - 1 ? '完成' : '下一步') +
      '</button></div>';

    requestAnimationFrame(function () {
      updatePopup(resolved.rect, step.position || 'top');
    });

    if (step.onEnter) step.onEnter();
  }

  function destroy() {
    var el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
    currentStep = 0;
  }

  window.tourNext = function () {
    var step = steps[currentStep];
    if (step && step.onNext) step.onNext();
    showStep(currentStep + 1);
  };

  window.tourSkip = function () {
    destroy();
  };

  window.startTour = function (tourSteps) {
    steps = tourSteps;
    currentStep = 0;
    showStep(0);
  };

  window.closeTour = destroy;

  // ========== 完整引导流程 ==========
  window.startTourStep1 = function () {
    startTour([
      {
        target: '[data-page="newchat"] .task-frameworks',
        title: '任务启动',
        desc: '通过任务框架与身份细分选择快速启动会话',
        position: 'top',
        padding: 18,
        heightAdjust: -24
      },
      {
        target: ['#tour-tool-toggle-area', '.switch-label[data-tool-toggle]'],
        title: '显示工具调用',
        desc: '显示/隐藏对话页面中AI的工具调用情况',
        position: 'top',
        padding: 10
      },
      {
        target: '.new-chat',
        title: '新对话',
        desc: '换个话题，开一个新的任务吧',
        position: 'right'
      },
      {
        target: '.nav-hit[data-chat="models"]',
        title: '模型管理',
        desc: '在这里进行模型接入和切换，也可以了解各个模型的能力擅长',
        position: 'right'
      },
      {
        target: ['.recent-section', '.recent-list', '.all-chat'],
        title: '最近对话/历史记录',
        desc: '找回之前的对话记录，接着过去的话题继续讨论',
        position: 'right',
        padding: 8
      },
      {
        target: '.nav-hit[data-chat="usage"]',
        title: '用量监控',
        desc: '各模型用量总结和统计，了解使用情况',
        position: 'right'
      },
      {
        target: '.tour-step-memory',
        title: '记忆',
        desc: '各模型用量总结和统计，了解使用情况',
        position: 'right'
      },
      {
        target: '.tour-step-logs',
        title: '日志',
        desc: '查看Hermes 工作运行日志，',
        position: 'right'
      },
      {
        target: '.tour-step-docs',
        title: 'Hermes文档',
        desc: '前往官网，查看最新动态与教程',
        position: 'right'
      }
    ]);
  };
})();
