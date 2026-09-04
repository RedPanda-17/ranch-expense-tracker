(() => {
"use strict";

const META_KEY = "ranchExpense.autoSyncTest2.patch";
const PUSH_DELAY = 2600;
const PULL_REFRESH_MS = 60000;
let syncTimer = null;
let suppressLocalDirty = false;
let autoConfirmText = "";
let meta = loadMeta();

function loadMeta() {
  try {
    return {
      initialized: false,
      dirty: false,
      lastPullAt: 0,
      ...(JSON.parse(localStorage.getItem(META_KEY) || "{}"))
    };
  } catch {
    return { initialized: false, dirty: false, lastPullAt: 0 };
  }
}
function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
function localHasData() {
  const draft = typeof reportDraft !== "undefined" ? reportDraft : {};
  return Boolean(
    (typeof expenses !== "undefined" && expenses.length) ||
    (typeof reports !== "undefined" && reports.length) ||
    String(typeof settings !== "undefined" ? settings.employeeName || "" : "").trim() ||
    String(draft.title || draft.periodStart || draft.periodEnd || "").trim()
  );
}
function signedIn() {
  return document.getElementById("cloudSyncState")?.textContent?.trim() === "Signed in";
}
function cloudBusy() {
  return [...document.querySelectorAll("[data-cloud-action]")].some(button => button.disabled);
}

function addUi() {
  if (document.getElementById("autoSyncPatchStyles")) return;
  const style = document.createElement("style");
  style.id = "autoSyncPatchStyles";
  style.textContent = `
    .auto-sync-row{display:flex;justify-content:flex-end;margin:-8px 0 10px}
    .auto-sync-pill{min-height:29px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--muted);font-size:.76rem;font-weight:900;cursor:pointer;box-shadow:var(--shadow-soft)}
    .auto-sync-pill::before{content:"●";font-size:.62rem;margin-right:6px}
    .auto-sync-pill.synced{background:var(--olive-soft);border-color:#c8d8bd;color:#315329}
    .auto-sync-pill.syncing,.auto-sync-pill.pending{background:var(--amber-soft);border-color:#ead29f;color:var(--warning)}
    .auto-sync-pill.offline{background:#eee8df;color:#655b53}
    .auto-sync-pill.error{background:var(--danger-soft);border-color:#efc9c7;color:var(--danger)}
  `;
  document.head.appendChild(style);

  const shell = document.querySelector(".app-shell");
  if (shell && !document.getElementById("autoSyncPill")) {
    const row = document.createElement("div");
    row.className = "auto-sync-row";
    row.innerHTML = `<button id="autoSyncPill" class="auto-sync-pill" type="button">Cloud: signed out</button>`;
    shell.insertBefore(row, shell.firstChild);
    document.getElementById("autoSyncPill").onclick = () => {
      if (typeof showView === "function") showView("settings");
    };
  }

  const badge = document.querySelector(".header-badge");
  if (badge) badge.textContent = "Auto Sync Test · 1.5.0 base";

  const card = document.getElementById("cloudSyncCard");
  if (card) {
    const heading = card.querySelector("h2");
    const copy = card.querySelector(".cloud-sync-top p");
    if (heading) heading.textContent = "Account & automatic sync";
    if (copy) copy.textContent = "Expenses save locally first, then sync in the background whenever this device is online.";
    const push = document.getElementById("cloudPush");
    const pull = document.getElementById("cloudPull");
    if (push) push.textContent = "Use this device copy";
    if (pull) pull.textContent = "Use cloud copy";
    const strong = document.querySelector("#cloudTransfer > strong");
    const small = document.querySelector("#cloudTransfer > small");
    if (strong) strong.textContent = "Recovery tools";
    if (small) small.textContent = "Normal syncing is automatic. Use these only when you intentionally want one copy to replace the other.";
  }
}

function state(kind, text) {
  const pill = document.getElementById("autoSyncPill");
  if (!pill) return;
  pill.textContent = text;
  pill.className = "auto-sync-pill " + (kind || "");
}
function refreshState() {
  if (!navigator.onLine) return state("offline", "Offline — will sync later");
  if (!signedIn()) return state("", "Cloud: signed out");
  if (cloudBusy()) return state("syncing", "Syncing…");
  if (meta.dirty) return state("pending", "Changes waiting to sync");
  if (meta.initialized) return state("synced", "Synced");
  state("syncing", "Connecting cloud…");
}

const nativeConfirm = window.confirm.bind(window);
window.confirm = message => {
  if (autoConfirmText && String(message || "").includes(autoConfirmText)) {
    autoConfirmText = "";
    return true;
  }
  return nativeConfirm(message);
};

function triggerCloudButton(id, confirmText, { suppressDirty = false } = {}) {
  const button = document.getElementById(id);
  if (!button || button.disabled || !navigator.onLine || !signedIn()) return false;
  if (suppressDirty) suppressLocalDirty = true;
  autoConfirmText = confirmText;
  button.click();
  refreshState();
  return true;
}

function schedulePush(delay = PUSH_DELAY) {
  clearTimeout(syncTimer);
  if (!meta.initialized || !signedIn()) return;
  syncTimer = setTimeout(() => {
    if (!navigator.onLine || !meta.dirty || cloudBusy()) return refreshState();
    state("syncing", "Syncing…");
    triggerCloudButton("cloudPush", "Upload this device to the cloud?");
  }, delay);
}

function markDirty() {
  if (suppressLocalDirty) return;
  meta.dirty = true;
  saveMeta();
  refreshState();
  schedulePush();
}

function hookSaveAll() {
  if (window.__autoSyncTest2SaveHook || typeof saveAll !== "function") return;
  window.__autoSyncTest2SaveHook = true;
  const original = saveAll;
  saveAll = function(...args) {
    const result = original.apply(this, args);
    markDirty();
    return result;
  };
}

function watchCloudMessages() {
  const message = document.getElementById("cloudSyncMessage");
  const auth = document.getElementById("cloudSyncState");
  if (!message || !auth) return false;

  new MutationObserver(() => {
    const text = message.textContent || "";

    if (text.includes("Cloud snapshot complete")) {
      meta.initialized = true;
      meta.dirty = false;
      saveMeta();
      suppressLocalDirty = false;
      state("synced", "Synced");
    } else if (text.includes("Cloud restore complete")) {
      meta.initialized = true;
      meta.dirty = false;
      meta.lastPullAt = Date.now();
      saveMeta();
      suppressLocalDirty = false;
      state("synced", "Synced");
    } else if (/failed|error/i.test(text)) {
      suppressLocalDirty = false;
      state("error", "Sync issue");
    } else {
      refreshState();
    }
  }).observe(message, { childList: true, characterData: true, subtree: true });

  new MutationObserver(() => {
    refreshState();
    if (signedIn()) setTimeout(bootstrap, 150);
  }).observe(auth, { childList: true, characterData: true, subtree: true });

  return true;
}

function bootstrap() {
  addUi();
  refreshState();
  if (!signedIn() || cloudBusy() || !navigator.onLine) return;

  if (!meta.initialized) {
    if (!localHasData()) {
      state("syncing", "Restoring cloud…");
      triggerCloudButton("cloudPull", "Replace this test device from the cloud?", { suppressDirty: true });
    } else {
      meta.dirty = true;
      saveMeta();
      state("pending", "Choose first sync copy");
      const msg = document.getElementById("cloudSyncMessage");
      if (msg) msg.textContent = "This device already has local test data. Choose Use this device copy or Use cloud copy once; syncing becomes automatic after that.";
    }
    return;
  }

  if (meta.dirty) return schedulePush(500);

  if (Date.now() - Number(meta.lastPullAt || 0) >= PULL_REFRESH_MS) {
    state("syncing", "Checking cloud…");
    triggerCloudButton("cloudPull", "Replace this test device from the cloud?", { suppressDirty: true });
  }
}

function init() {
  addUi();
  hookSaveAll();

  let attempts = 0;
  const wait = setInterval(() => {
    attempts += 1;
    addUi();
    hookSaveAll();
    if (watchCloudMessages()) {
      clearInterval(wait);
      bootstrap();
    } else if (attempts > 100) {
      clearInterval(wait);
      state("error", "Cloud controls unavailable");
    }
  }, 100);

  window.addEventListener("online", () => {
    refreshState();
    setTimeout(bootstrap, 300);
  });
  window.addEventListener("offline", refreshState);
  window.addEventListener("focus", () => setTimeout(bootstrap, 300));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(bootstrap, 300);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();