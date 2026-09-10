/* Ranch Expense Tracker — premium interaction layer
   Enhances the existing UI without replacing its state, auth, sync, storage or report logic. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 760px)');
  let lastNonAddView = 'dashboard';
  let returnFocus = null;
  let enhanceFrame = 0;

  const svg = (paths, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    dashboard: svg('<path d="M4 13h6V4H4v9Z"/><path d="M14 20h6V11h-6v9Z"/><path d="M4 20h6v-3H4v3Z"/><path d="M14 7h6V4h-6v3Z"/>'),
    add: svg('<path d="M12 5v14M5 12h14"/>'),
    current: svg('<path d="M7 3h10a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h4"/>'),
    history: svg('<path d="M4 6h16M4 12h16M4 18h16"/><path d="M7 4v4M12 10v4M17 16v4"/>'),
    past: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/>'),
    close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
    chevron: svg('<path d="m6 9 6 6 6-6"/>')
  };

  function activeViewId() {
    return document.querySelector('.view.active')?.id || 'dashboard';
  }

  function scheduleEnhance() {
    if (enhanceFrame) return;
    enhanceFrame = requestAnimationFrame(() => {
      enhanceFrame = 0;
      enhanceNavigation();
      enhanceGreeting();
      enhanceDashboardSummary();
      enhanceRecentExpenses();
      enhanceExpenseCards(document.getElementById('historyList'));
      enhanceExpenseCards(document.getElementById('currentExpenseList'));
      enhanceReadiness();
      syncSheetState();
      syncReceiptDropState();
    });
  }

  function enhanceNavigation() {
    document.querySelectorAll('.nav-btn').forEach(button => {
      const view = button.dataset.view;
      if (view && !button.querySelector('.nav-icon')) {
        const icon = document.createElement('span');
        icon.className = 'nav-icon';
        icon.innerHTML = icons[view] || '';
        button.prepend(icon);
      }
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function enhanceGreeting() {
    const heading = document.getElementById('dashboardGreeting');
    if (!heading) return;
    const match = heading.textContent.trim().match(/^(.+)'s current report$/i);
    if (!match) return;
    const firstName = match[1].trim().split(/\s+/)[0];
    const hour = new Date().getHours();
    const daypart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    heading.textContent = `Good ${daypart}, ${firstName}`;
  }

  function moneyValue(text) {
    const number = Number(String(text || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(number) ? number : 0;
  }

  function enhanceDashboardSummary() {
    const summary = document.getElementById('dashboardSummary');
    if (!summary) return;
    const rows = [...summary.querySelectorAll('.summary-row')];
    if (!rows.length) return;
    const max = Math.max(...rows.map(row => moneyValue(row.querySelector('strong')?.textContent)), 1);
    rows.forEach(row => {
      let track = row.querySelector('.ui-category-track');
      if (!track) {
        track = document.createElement('span');
        track.className = 'ui-category-track';
        track.innerHTML = '<span class="ui-category-fill"></span>';
        row.appendChild(track);
      }
      const value = moneyValue(row.querySelector('strong')?.textContent);
      const fill = track.querySelector('.ui-category-fill');
      fill?.style.setProperty('--ui-fill', `${Math.max(4, Math.round((value / max) * 100))}%`);
    });
  }

  function cloneExpenseForDashboard(source) {
    const clone = source.cloneNode(true);
    clone.classList.remove('ui-collapsed');
    clone.querySelectorAll('.ui-expense-toggle').forEach(node => node.remove());
    return clone;
  }

  function enhanceRecentExpenses() {
    const dashboard = document.getElementById('dashboard');
    const historyList = document.getElementById('historyList');
    const anchor = dashboard?.querySelector('.two-column');
    if (!dashboard || !historyList || !anchor) return;

    let card = dashboard.querySelector('.ui-recent-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'card ui-recent-card';
      card.innerHTML = `
        <div class="section-heading">
          <div><div class="eyebrow">Latest activity</div><h2>Recent expenses</h2></div>
          <button class="text-button ui-view-all-expenses" type="button">View all →</button>
        </div>
        <div class="ui-recent-list"></div>`;
      card.querySelector('.ui-view-all-expenses')?.addEventListener('click', () => window.showView?.('history'));
      anchor.insertAdjacentElement('afterend', card);
    }

    const target = card.querySelector('.ui-recent-list');
    if (!target) return;
    const expenses = [...historyList.querySelectorAll('.expense-item')].slice(0, 3);
    if (!expenses.length) {
      target.innerHTML = '<div class="empty-state">Your latest expenses will appear here as you add them.</div>';
      return;
    }
    target.replaceChildren(...expenses.map(cloneExpenseForDashboard));
  }

  function enhanceExpenseCards(container) {
    if (!container) return;
    container.querySelectorAll('.expense-item').forEach(card => {
      if (card.querySelector('.ui-expense-toggle')) return;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'ui-expense-toggle';
      toggle.setAttribute('aria-label', 'Show or hide expense details');
      toggle.setAttribute('aria-expanded', mobile.matches ? 'false' : 'true');
      toggle.innerHTML = icons.chevron;
      if (mobile.matches) card.classList.add('ui-collapsed');
      toggle.addEventListener('click', event => {
        event.stopPropagation();
        const collapsed = card.classList.toggle('ui-collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
      });
      card.appendChild(toggle);
    });
  }

  function ensureReadinessSteps() {
    const card = document.querySelector('#current .report-sidebar .sticky-card');
    const header = card?.querySelector('.readiness-header');
    if (!card || !header) return null;
    let steps = card.querySelector('.ui-readiness-steps');
    if (!steps) {
      steps = document.createElement('div');
      steps.className = 'ui-readiness-steps';
      steps.setAttribute('aria-label', 'Report readiness progress');
      steps.innerHTML = `
        <div class="ui-readiness-step" data-step="details"><span class="ui-readiness-track"></span><span>Details</span></div>
        <div class="ui-readiness-step" data-step="expenses"><span class="ui-readiness-track"></span><span>Expenses</span></div>
        <div class="ui-readiness-step" data-step="ready"><span class="ui-readiness-track"></span><span>Ready</span></div>`;
      header.insertAdjacentElement('afterend', steps);
    }
    return steps;
  }

  function enhanceReadiness() {
    const steps = ensureReadinessSteps();
    if (!steps) return;
    const detailsDone = Boolean(
      document.getElementById('reportTitle')?.value?.trim() &&
      document.getElementById('reportPeriodStart')?.value &&
      document.getElementById('reportPeriodEnd')?.value
    );
    const summary = document.getElementById('selectionSummary')?.textContent || '';
    const selectionMatch = summary.match(/(\d+)\s+of\s+\d+\s+expenses selected/i);
    const expenseDone = Number(selectionMatch?.[1] || 0) > 0;
    const badge = document.getElementById('readinessBadge');
    const readyDone = Boolean(badge && !badge.classList.contains('blocked') && /ready/i.test(badge.textContent || ''));
    steps.querySelector('[data-step="details"]')?.classList.toggle('is-done', detailsDone);
    steps.querySelector('[data-step="expenses"]')?.classList.toggle('is-done', expenseDone);
    steps.querySelector('[data-step="ready"]')?.classList.toggle('is-done', readyDone);
  }

  function setupExpenseSheet() {
    const add = document.getElementById('add');
    const heading = add?.querySelector('.quick-page-heading');
    if (!add || !heading) return;

    let backdrop = document.querySelector('.ui-sheet-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'ui-sheet-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', closeExpenseSheet);
    }

    if (!heading.querySelector('.ui-sheet-close')) {
      const existingReset = [...heading.children].find(child => child.tagName === 'BUTTON');
      const actions = document.createElement('div');
      actions.className = 'ui-sheet-actions';
      if (existingReset) actions.appendChild(existingReset);
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'ui-sheet-close';
      close.setAttribute('aria-label', 'Close Add Expense');
      close.innerHTML = icons.close;
      close.addEventListener('click', closeExpenseSheet);
      actions.appendChild(close);
      heading.appendChild(actions);
    }
    add.setAttribute('role', 'dialog');
    add.setAttribute('aria-label', 'Add or edit expense');
  }

  function syncSheetState() {
    const add = document.getElementById('add');
    if (!add) return;
    const open = add.classList.contains('active');
    document.body.classList.toggle('ui-expense-sheet-open', open);
    add.setAttribute('aria-hidden', String(!open));
    if (open) add.setAttribute('aria-modal', 'true');
    else add.removeAttribute('aria-modal');
  }

  function closeExpenseSheet() {
    if (document.getElementById('receiptViewer')?.classList.contains('open')) return;
    const target = lastNonAddView === 'add' ? 'dashboard' : lastNonAddView;
    if (typeof window.showView === 'function') window.showView(target || 'dashboard');
    if (returnFocus && typeof returnFocus.focus === 'function') setTimeout(() => returnFocus.focus(), 80);
  }

  function setupReceiptDrop() {
    const zone = document.getElementById('receiptField');
    const input = document.getElementById('receipt');
    if (!zone || !input || zone.dataset.uiDropReady === 'true') return;
    zone.dataset.uiDropReady = 'true';

    ['dragenter', 'dragover'].forEach(type => zone.addEventListener(type, event => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      zone.classList.add('ui-drag-active');
    }));
    ['dragleave', 'dragend'].forEach(type => zone.addEventListener(type, () => zone.classList.remove('ui-drag-active')));
    zone.addEventListener('drop', event => {
      event.preventDefault();
      zone.classList.remove('ui-drag-active');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const allowed = file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!allowed) {
        window.showToast?.('Choose an image or PDF receipt.', 'error');
        return;
      }
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        zone.classList.add('ui-has-file');
      } catch (error) {
        console.warn('Drag-and-drop receipt assignment was not available.', error);
      }
    });
    input.addEventListener('change', syncReceiptDropState);
  }

  function syncReceiptDropState() {
    const zone = document.getElementById('receiptField');
    const input = document.getElementById('receipt');
    if (!zone || !input) return;
    const hasFile = Boolean(input.files?.[0] || document.getElementById('receiptInlinePreview')?.hidden === false);
    zone.classList.toggle('ui-has-file', hasFile);
  }

  function setupKeyboard() {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && activeViewId() === 'add' && !document.getElementById('receiptViewer')?.classList.contains('open')) {
        closeExpenseSheet();
        return;
      }
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      const active = activeViewId();
      const search = active === 'history' ? document.getElementById('historySearch') : active === 'current' ? document.getElementById('reportExpenseSearch') : null;
      if (search) {
        event.preventDefault();
        search.focus();
      }
    });
  }

  function setupNavigationTracking() {
    document.addEventListener('click', event => {
      const target = event.target.closest('button, [role="button"]');
      if (!target) return;
      const current = activeViewId();
      const intent = target.getAttribute('onclick') || '';
      const goesToAdd = /showView\(['"]add['"]\)/.test(intent) || /editExpense\(/.test(intent) || target.dataset.view === 'add';
      if (goesToAdd && current !== 'add') {
        lastNonAddView = current;
        returnFocus = target;
      } else if (target.dataset.view && target.dataset.view !== 'add') {
        lastNonAddView = target.dataset.view;
      }
    }, true);
  }

  function setupSubmitFeedback() {
    const form = document.getElementById('expenseForm');
    const button = document.getElementById('saveExpenseButton');
    if (!form || !button) return;
    form.addEventListener('submit', () => {
      button.setAttribute('aria-busy', 'true');
      button.classList.add('ui-saving');
      setTimeout(() => {
        button.removeAttribute('aria-busy');
        button.classList.remove('ui-saving');
      }, 900);
    }, true);

    const toast = document.getElementById('toast');
    if (toast) {
      new MutationObserver(() => {
        if (!toast.classList.contains('show')) return;
        if (/saved|finalized|updated|created/i.test(toast.textContent || '')) {
          button.classList.add('ui-saved-pulse');
          setTimeout(() => button.classList.remove('ui-saved-pulse'), 720);
        }
      }).observe(toast, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  function setupMutationEnhancement() {
    const watched = [
      document.querySelector('.app-nav'),
      document.getElementById('dashboard'),
      document.getElementById('historyList'),
      document.getElementById('currentExpenseList'),
      document.getElementById('readinessBadge'),
      document.getElementById('selectionSummary'),
      document.getElementById('add')
    ].filter(Boolean);
    const observer = new MutationObserver(scheduleEnhance);
    watched.forEach(node => observer.observe(node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] }));

    ['reportTitle', 'reportPeriodStart', 'reportPeriodEnd'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', enhanceReadiness);
      document.getElementById(id)?.addEventListener('change', enhanceReadiness);
    });
  }

  function setupMobileBehavior() {
    const update = () => {
      document.querySelectorAll('.expense-item').forEach(card => {
        const toggle = card.querySelector('.ui-expense-toggle');
        if (!toggle) return;
        if (!mobile.matches) {
          card.classList.remove('ui-collapsed');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
      scheduleEnhance();
    };
    mobile.addEventListener?.('change', update);
  }

  function init() {
    setupExpenseSheet();
    setupReceiptDrop();
    setupKeyboard();
    setupNavigationTracking();
    setupSubmitFeedback();
    setupMutationEnhancement();
    setupMobileBehavior();
    scheduleEnhance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
