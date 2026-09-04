(() => {
"use strict";
if (window.__ranchSafeExpenseSyncV5) return;
window.__ranchSafeExpenseSyncV5 = true;

const URL = "https://rdxzqudawzkqetooubee.supabase.co";
const KEY = "sb_publishable_is8367xzMm8UckiRkyYAMw_jVy8Eyop";
const BUCKET = "expense-documents";
const AUTH_KEY = "ranch-expense-supabase-sync-test-auth";
const META_KEY = "ranchExpense.safeExpenseSyncV5.meta";
const SYNC_DELAY = 1200;

let sb = null;
let user = null;
let busy = false;
let applying = false;
let timer = null;
let lastLocalIds = new Set();
let localMutationGeneration = 0;

const clone = v => typeof structuredClone === "function"
  ? structuredClone(v)
  : JSON.parse(JSON.stringify(v));
const stable = v => v === null || typeof v !== "object"
  ? JSON.stringify(v)
  : Array.isArray(v)
    ? "[" + v.map(stable).join(",") + "]"
    : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
function hash(v) {
  const s = stable(v);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
function version(v) {
  const n = Date.parse(v?.updatedAt || v?.createdAt || "");
  return Number.isFinite(n) ? n : 0;
}
function safe(v) {
  return String(v || "document")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}
function loadMeta() {
  try {
    return {
      userId: "",
      known: {},
      pendingDeletes: [],
      pending: false,
      ...(JSON.parse(localStorage.getItem(META_KEY) || "{}"))
    };
  } catch {
    return { userId: "", known: {}, pendingDeletes: [], pending: false };
  }
}
let meta = loadMeta();
function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
function pendingDeleteSet() {
  return new Set((meta.pendingDeletes || []).map(String));
}

function addUi() {
  if (!document.getElementById("safeSyncV5Style")) {
    const s = document.createElement("style");
    s.id = "safeSyncV5Style";
    s.textContent = `
      .safe-v5-row{display:flex;justify-content:flex-end;margin:-8px 0 10px}
      .safe-v5-pill{min-height:29px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--muted);font-size:.76rem;font-weight:900;cursor:pointer;box-shadow:var(--shadow-soft)}
      .safe-v5-pill.ok{background:var(--olive-soft);color:#315329}
      .safe-v5-pill.wait{background:var(--amber-soft);color:var(--warning)}
      .safe-v5-pill.err{background:var(--danger-soft);color:var(--danger)}
    `;
    document.head.appendChild(s);
  }
  const shell = document.querySelector(".app-shell");
  if (shell && !document.getElementById("safeSyncV5Pill")) {
    const row = document.createElement("div");
    row.className = "safe-v5-row";
    row.innerHTML = '<button id="safeSyncV5Pill" class="safe-v5-pill" type="button">Cloud: signed out</button>';
    shell.insertBefore(row, shell.firstChild);
    document.getElementById("safeSyncV5Pill").onclick = () => typeof showView === "function" && showView("settings");
  }
  const badge = document.querySelector(".header-badge");
  if (badge) badge.textContent = "Safe Merge Sync Test 5";

  const transfer = document.getElementById("cloudTransfer");
  if (transfer) {
    const strong = transfer.querySelector("strong");
    const small = transfer.querySelector("small");
    if (strong) strong.textContent = "Recovery tools";
    if (small) small.textContent = "Normal expense/receipt syncing is automatic. These overwrite tools are only for recovery.";
  }
}
function pill(text, kind = "") {
  const el = document.getElementById("safeSyncV5Pill");
  if (!el) return;
  el.textContent = text;
  el.className = "safe-v5-pill " + kind;
}
function status() {
  if (!navigator.onLine) return pill("Offline — will sync later", "wait");
  if (!user) return pill("Cloud: signed out");
  if (busy) return pill("Syncing…", "wait");
  if (meta.pending || (meta.pendingDeletes || []).length) return pill("Changes waiting to sync", "wait");
  pill("Synced", "ok");
}
function cloudMessage(text, type = "ok") {
  const el = document.getElementById("cloudSyncMessage");
  if (!el) return;
  el.textContent = text;
  el.className = "cloud-sync-message " + type;
}

async function waitForApp() {
  for (let i = 0; i < 80; i++) {
    if (
      typeof expenses !== "undefined" &&
      typeof saveAll === "function" &&
      typeof renderAll === "function" &&
      typeof getReceipt === "function" &&
      typeof putReceipt === "function" &&
      typeof getAllReceipts === "function"
    ) {
      try {
        await getAllReceipts();
        return;
      } catch {}
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("The local Ranch Expense Tracker data layer did not finish loading.");
}

async function refreshUser() {
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  user = error ? null : (data.user || null);

  if (user && meta.userId && meta.userId !== user.id) {
    meta = { userId: user.id, known: {}, pendingDeletes: [], pending: false };
  }
  if (user && !meta.userId) meta.userId = user.id;
  saveMeta();
  status();
  return user;
}

function schedule(ms = SYNC_DELAY) {
  clearTimeout(timer);
  if (user) timer = setTimeout(sync, ms);
}

function installSaveHook() {
  if (window.__safeV5SaveHook || typeof saveAll !== "function") return;
  window.__safeV5SaveHook = true;
  lastLocalIds = new Set(expenses.map(e => String(e.id)));

  const original = saveAll;
  saveAll = function(...args) {
    const result = original.apply(this, args);

    if (!applying) {
      localMutationGeneration += 1;
      const nowIds = new Set(expenses.map(e => String(e.id)));
      const deletes = pendingDeleteSet();

      for (const id of lastLocalIds) {
        if (!nowIds.has(id)) deletes.add(id);
      }

      meta.pendingDeletes = [...deletes];
      meta.pending = true;
      saveMeta();
      lastLocalIds = nowIds;
      status();
      if (navigator.onLine) schedule();
    } else {
      lastLocalIds = new Set(expenses.map(e => String(e.id)));
    }

    return result;
  };
}

async function localReceipt(expense) {
  if (!expense?.receiptId) return null;
  const record = await getReceipt(expense.receiptId);
  if (!record) return null;
  const blob = record.blob || (record.bytes
    ? new Blob([record.bytes], { type: record.type || "application/octet-stream" })
    : null);
  return blob ? {
    blob,
    name: record.name || expense.receiptName || "document",
    type: record.type || blob.type || "application/octet-stream"
  } : null;
}

async function pushExpense(expense, row) {
  const file = await localReceipt(expense);
  let path = null, name = null, type = null, size = null;

  const sameReceipt = file && row?.receipt_path &&
    String(row.payload?.receiptFingerprint || "") === String(expense.receiptFingerprint || "") &&
    Number(row.receipt_size || 0) === Number(file.blob.size || 0);

  if (file) {
    if (sameReceipt) {
      path = row.receipt_path;
      name = row.receipt_name;
      type = row.receipt_type;
      size = row.receipt_size;
    } else {
      name = safe(file.name);
      type = file.type;
      size = file.blob.size;
      path = `${user.id}/expenses/${safe(expense.id)}/${name}`;

      if (row?.receipt_path && row.receipt_path !== path) {
        const remove = await sb.storage.from(BUCKET).remove([row.receipt_path]);
        if (remove.error) throw remove.error;
      }

      const upload = await sb.storage.from(BUCKET).upload(path, file.blob, {
        upsert: true,
        contentType: type || undefined,
        cacheControl: "3600"
      });
      if (upload.error) throw upload.error;
    }
  } else if (row?.receipt_path) {
    const remove = await sb.storage.from(BUCKET).remove([row.receipt_path]);
    if (remove.error) throw remove.error;
  }

  const query = await sb.from("expenses").upsert({
    user_id: user.id,
    expense_id: String(expense.id),
    payload: clone(expense),
    receipt_path: path,
    receipt_name: name,
    receipt_type: type,
    receipt_size: size,
    deleted_at: null
  }, { onConflict: "user_id,expense_id" });

  if (query.error) throw query.error;
}

async function pullExpense(row, oldExpense) {
  const expense = clone(row.payload || {});
  expense.id = expense.id || row.expense_id;

  const sameReceipt = oldExpense?.receiptId &&
    String(oldExpense.receiptFingerprint || "") === String(expense.receiptFingerprint || "");

  if (row.receipt_path) {
    if (sameReceipt && await getReceipt(oldExpense.receiptId)) {
      expense.receiptId = oldExpense.receiptId;
    } else {
      const download = await sb.storage.from(BUCKET).download(row.receipt_path);
      if (download.error) throw download.error;

      const receiptId = expense.receiptId || oldExpense?.receiptId || ("receipt-cloud-" + row.expense_id);
      await putReceipt({
        id: receiptId,
        name: row.receipt_name || expense.receiptName || "document",
        type: row.receipt_type || download.data.type || "application/octet-stream",
        blob: download.data,
        originalName: row.receipt_name || expense.receiptName || "document",
        originalSize: Number(row.receipt_size || download.data.size || 0),
        optimized: true,
        savedAt: new Date().toISOString()
      });
      expense.receiptId = receiptId;
      expense.receiptName = row.receipt_name || expense.receiptName || "document";
      expense.receiptType = row.receipt_type || download.data.type || "";
    }
  } else if (oldExpense?.receiptId) {
    try { await deleteReceipt(oldExpense.receiptId); } catch {}
    expense.receiptId = "";
    expense.receiptName = "";
    expense.receiptType = "";
    expense.receiptFingerprint = "";
  }

  return expense;
}

async function deleteCloudExpense(row) {
  if (row?.receipt_path) {
    const remove = await sb.storage.from(BUCKET).remove([row.receipt_path]);
    if (remove.error) throw remove.error;
  }
  const query = await sb.from("expenses")
    .update({
      deleted_at: new Date().toISOString(),
      receipt_path: null,
      receipt_name: null,
      receipt_type: null,
      receipt_size: null
    })
    .eq("expense_id", row.expense_id);

  if (query.error) throw query.error;
}

async function sync() {
  if (busy || !user || !navigator.onLine) return status();

  busy = true;
  status();
  const syncStartGeneration = localMutationGeneration;

  try {
    await waitForApp();

    const query = await sb.from("expenses").select("*").order("created_at", { ascending: true });
    if (query.error) throw query.error;

    const cloud = new Map((query.data || []).map(row => [String(row.expense_id), row]));
    const local = new Map(expenses.map(expense => [String(expense.id), expense]));
    const deletes = pendingDeleteSet();

    for (const id of [...deletes]) {
      const row = cloud.get(id);
      if (row && !row.deleted_at) await deleteCloudExpense(row);
      cloud.set(id, row ? { ...row, deleted_at: new Date().toISOString(), receipt_path: null } : row);
      deletes.delete(id);
    }

    const final = new Map(local);
    const allIds = new Set([...cloud.keys(), ...local.keys()]);
    let changedLocal = false;
    const nextKnown = {};

    for (const id of allIds) {
      const localExpense = final.get(id) || null;
      const row = cloud.get(id) || null;
      const cloudActive = row && !row.deleted_at;

      if (!localExpense && cloudActive) {
        const pulled = await pullExpense(row, null);
        final.set(id, pulled);
        nextKnown[id] = hash(pulled);
        changedLocal = true;
        continue;
      }

      if (localExpense && !row) {
        await pushExpense(localExpense, null);
        nextKnown[id] = hash(localExpense);
        continue;
      }

      if (localExpense && row?.deleted_at) {
        const localVersion = version(localExpense);
        const deletedVersion = Date.parse(row.deleted_at) || 0;

        if (localVersion > deletedVersion) {
          await pushExpense(localExpense, row);
          nextKnown[id] = hash(localExpense);
        } else {
          if (localExpense.receiptId) {
            try { await deleteReceipt(localExpense.receiptId); } catch {}
          }
          final.delete(id);
          nextKnown[id] = "__deleted__";
          changedLocal = true;
        }
        continue;
      }

      if (!localExpense && row?.deleted_at) {
        nextKnown[id] = "__deleted__";
        continue;
      }

      if (localExpense && cloudActive) {
        const localHash = hash(localExpense);
        const cloudHash = hash(row.payload || {});

        if (localHash === cloudHash) {
          nextKnown[id] = localHash;
          continue;
        }

        const localVersion = version(localExpense);
        const cloudVersion = version(row.payload);

        if (localVersion > cloudVersion) {
          await pushExpense(localExpense, row);
          nextKnown[id] = localHash;
        } else {
          const pulled = await pullExpense(row, localExpense);
          final.set(id, pulled);
          nextKnown[id] = hash(pulled);
          changedLocal = true;
        }
      }
    }

    if (changedLocal) {
      if (localMutationGeneration !== syncStartGeneration) {
        meta.pending = true;
        saveMeta();
        cloudMessage("A local change happened during sync. Keeping the local change and checking cloud again…", "warn");
        schedule(100);
        return;
      }

      applying = true;
      try {
        expenses = [...final.values()].sort((a, b) =>
          String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
        );
        saveAll();
        renderAll();
      } finally {
        applying = false;
      }
    }

    meta.known = nextKnown;
    meta.pendingDeletes = [...deletes];
    meta.pending = localMutationGeneration !== syncStartGeneration;
    saveMeta();
    lastLocalIds = new Set(expenses.map(e => String(e.id)));

    status();
    if (meta.pending) {
      cloudMessage("Local changes arrived during sync. Running one more safe pass…", "warn");
      schedule(100);
    } else {
      cloudMessage(
        `Synced ${expenses.length} expense${expenses.length === 1 ? "" : "s"} by record. Missing local records were restored from cloud.`,
        "ok"
      );
    }
  } catch (error) {
    meta.pending = true;
    saveMeta();
    pill("Sync issue", "err");
    cloudMessage("Safe sync issue: " + (error.message || String(error)), "bad");
    console.error(error);
  } finally {
    busy = false;
    status();
  }
}

async function init() {
  addUi();
  await waitForApp();
  installSaveHook();

  const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  sb = mod.createClient(URL, KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_KEY
    }
  });

  sb.auth.onAuthStateChange(() => setTimeout(async () => {
    await refreshUser();
    if (user) schedule(100);
  }, 0));

  await refreshUser();
  if (user) await sync();

  window.addEventListener("online", () => {
    status();
    schedule(100);
  });
  window.addEventListener("offline", status);
  window.addEventListener("focus", () => user && schedule(200));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && user) schedule(200);
  });

  setInterval(() => {
    if (user && navigator.onLine) sync();
  }, 20000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();