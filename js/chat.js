/**
 * chat.js — 对话页面交互模块
 * 引导步骤 / 日志筛选 / 右栏视图切换 / 复制 / 收藏
 */
(function () {
  'use strict';

  /* ========== 新手引导：步骤推进 ========== */
  window.guideNext = function() {
    var steps = document.querySelectorAll('.guide-step');
    if (!steps.length) return;
    var current = 0;
    steps.forEach(function(step, i) {
      if (step.classList.contains('active')) current = i;
    });
    if (steps[current]) {
      steps[current].classList.remove('active');
      steps[current].classList.add('completed');
    }
    var next = current + 1;
    if (next < steps.length) {
      steps[next].classList.add('active');
      var progress = document.getElementById('guide-progress');
      if (progress) progress.textContent = (next + 1) + '/5';
    } else {
      var btn = document.getElementById('guide-next-btn');
      if (btn) { btn.textContent = '✓ 完成'; btn.disabled = true; btn.style.opacity = '0.6'; btn.style.cursor = 'default'; }
      var resetBtn = document.getElementById('guide-reset-btn');
      if (resetBtn) { resetBtn.textContent = '再试一次'; }
      var progress = document.getElementById('guide-progress');
      if (progress) progress.textContent = '5/5 ✓';
    }
  };

  window.guideReset = function() {
    var steps = document.querySelectorAll('.guide-step');
    if (!steps.length) return;
    steps.forEach(function(step, i) {
      step.classList.remove('active', 'completed');
      if (i === 0) step.classList.add('active');
    });
    var progress = document.getElementById('guide-progress');
    if (progress) progress.textContent = '1/5';
    var btn = document.getElementById('guide-next-btn');
    if (btn) { btn.textContent = '下一步'; btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
    var resetBtn = document.getElementById('guide-reset-btn');
    if (resetBtn) resetBtn.textContent = '操作引导';
  };

  window.jumpToStep = function(target) {
    var steps = document.querySelectorAll('.guide-step');
    if (!steps.length) return;
    steps.forEach(function(step, i) {
      step.classList.remove('active', 'completed');
      if (i + 1 < target) step.classList.add('completed');
      if (i + 1 === target) step.classList.add('active');
    });
    var progress = document.getElementById('guide-progress');
    if (progress) progress.textContent = target + '/5';
    var btn = document.getElementById('guide-next-btn');
    if (btn) { btn.textContent = '下一步'; btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
    var resetBtn = document.getElementById('guide-reset-btn');
    if (resetBtn) resetBtn.textContent = (target === 5 ? '再试一次' : '操作引导');
  };

  /* ========== 日志筛选 ========== */
  window.filterLogs = function(type, btn) {
    btn.parentElement.querySelectorAll('.log-filter-item').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var page = btn.closest('.right-page');
    if (!page) return;
    page.querySelectorAll('.log-item').forEach(function(item) {
      var tag = item.querySelector('.log-tag');
      if (!tag) return;
      var level = tag.textContent.trim();
      if (type === 'all') { item.classList.remove('filtered-out'); }
      else if (type === 'safe') { item.classList.toggle('filtered-out', level === 'ERROR'); }
      else if (type === 'danger') { item.classList.toggle('filtered-out', level !== 'ERROR'); }
    });
  };

  /* ========== 右栏视图切换 ========== */
  window.switchRightView = function(view, btn) {
    btn.parentElement.querySelectorAll('.view-switch-item').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var label = btn.closest('.right-view-switch').querySelector('.view-switch-label');
    if (label) label.textContent = btn.textContent;
    btn.closest('.right-view-switch').classList.remove('open');
    var page = btn.closest('.right-page');
    if (page) {
      page.querySelectorAll('[data-right-view]').forEach(function(el) {
        el.classList.toggle('hidden', el.dataset.rightView !== view);
      });
    }
  };

  /* ========== 文件收藏切换 ========== */
  window.toggleFileFav = function(btn) {
    var img = btn.querySelector('img');
    var isFav = btn.title === '取消收藏';
    if (isFav) {
      img.src = 'icon/source/Frame-2.svg';
      btn.title = '收藏';
      var favList = document.querySelector('.fav-dd-list');
      if (favList) {
        favList.querySelectorAll('.fav-item').forEach(function(item) {
          if (item.querySelector('.fav-name').textContent.indexOf('daily-insight') !== -1) {
            item.style.opacity = '0';
            item.style.transition = 'opacity .3s ease';
            setTimeout(function() { item.remove(); }, 300);
          }
        });
      }
    } else {
      img.src = 'icon/source/Frame-3.svg';
      btn.title = '取消收藏';
      var favList = document.querySelector('.fav-dd-list');
      if (favList) {
        var div = document.createElement('div');
        div.className = 'fav-item';
        div.innerHTML = '<img class="fav-icon" src="icon/fav-code.svg" alt="" /><span class="fav-name">daily-insight-mockup.html</span><button class="fav-remove" onclick="this.closest(\'.fav-item\').remove()" title="取消收藏">×</button>';
        favList.appendChild(div);
      }
    }
  };

  /* ========== 复制功能 ========== */
  document.addEventListener('click', function(e) {
    var icon = e.target.closest('img[src*="Frame-12"]');
    if (!icon) return;
    if (icon.closest('.fav-toggle-btn')) return;
    e.stopPropagation();

    var text = '';
    var container = icon.closest('.chat-row');
    if (container) {
      var bubble = container.querySelector('.chat-bubble p');
      if (bubble) { text = bubble.innerText; }
      else {
        var path = container.querySelector('.file-path');
        if (path) { text = path.textContent; }
        else {
          var name = container.querySelector('.file-name');
          if (name) text = name.textContent;
        }
      }
    }
    if (text) {
      var doCopy = function() {
        if (navigator.clipboard) return navigator.clipboard.writeText(text);
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        return Promise.resolve();
      };
      doCopy().then(function() {
        var original = icon.src;
        icon.src = icon.src.replace(/Frame-12\.svg$/, 'check.svg');
        icon.dataset.origSrc = original;
        setTimeout(function() { if (icon.dataset.origSrc) icon.src = icon.dataset.origSrc; }, 1500);
      }).catch(function(err) { console.log('复制失败:', err); });
    }
  });
})();
