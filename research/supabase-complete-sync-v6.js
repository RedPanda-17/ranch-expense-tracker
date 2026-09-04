(() => {
"use strict";

if (window.__ranchCompleteSyncV6) return;
window.__ranchCompleteSyncV6 = true;

const SUPABASE_URL = "https://rdxzqudawzkqetooubee.supabase.co";
const SUPABASE_KEY = "sb_publishable_is8367xzMm8UckiRkyYAMw_jVy8Eyop";
const BUCKET = "expense-documents";
const AUTH_KEY = "ranch-expense-supabase-complete-sync-v6-auth";
const META_KEY = "ranchExpense.completeSyncV6.meta";
const SYNC_DELAY = 1200;
const PERIODIC_SYNC_MS = 20000;

let sb = null;
let user = null;
let busy = false;
let applyingRemote = false;
let syncTimer = null;
let localMutationGeneration = 0;
let observed = null;

const clone = value => typeof structuredClone === "function"
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

const stable = value => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
};

function hash(value) {
  const text = stable(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

const timeOf = value => {
  const n = Date.parse(value || "");
  return Number.isFinite(n) ? n : 0;
};

const expenseVersion = expense => timeOf(expense?.updatedAt || expense?.createdAt);
const reportVersion = report => timeOf(report?.statusUpdatedAt || report?.updatedAt || report?.finalizedAt || report?.createdAt);

const safeName = value => String(value || "document")
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "") || "document";

function defaultMeta() {
  return {
    userId: "",
    initialized: false,
    pending: false,
    knownExpenses: {},
    knownReports: {},
    expenseDeletes: [],
    reportDeletes: [],
    settingsKnownHash: "",
    settingsChangedAt: "",
    draftKnownHash: "",
    draftChangedAt: ""
  };
}

function loadMeta() {
  try {
    return { ...defaultMeta(), ...(JSON.parse(localStorage.getItem(META_KEY) || "{}")) };
  } catch {
    return defaultMeta();
  }
}

let meta = loadMeta();

function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function setMessage(text, type = "") {
  const el = document.getElementById("completeSyncMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "complete-sync-message" + (type ? " " + type : "");
}

function setPill(text, kind = "") {
  const el = document.getElementById("completeSyncPill");
  if (!el) return;
  el.textContent = text;
  el.className = "complete-sync-pill" + (kind ? " " + kind : "");
}

function hasPending() {
  return Boolean(
    meta.pending ||
    (meta.expenseDeletes || []).length ||
    (meta.reportDeletes || []).length
  );
}

function renderStatus() {
  if (!navigator.onLine) {
    setPill("Offline — will sync later", "wait");
  } else if (!user) {
    setPill("Cloud: signed out");
  } else if (busy) {
    setPill("Syncing…", "wait");
  } else if (hasPending()) {
    setPill("Changes waiting to sync", "wait");
  } else {
    setPill("Synced", "ok");
  }

  const signedIn = Boolean(user);
  const authFields = document.getElementById("completeSyncAuthFields");
  const signedInActions = document.getElementById("completeSyncSignedInActions");
  const authActions = document.getElementById("completeSyncAuthActions");
  const identity = document.getElementById("completeSyncIdentity");

  if (authFields) authFields.hidden = signedIn;
  if (authActions) authActions.hidden = signedIn;
  if (signedInActions) signedInActions.hidden = !signedIn;
  if (identity) identity.textContent = signedIn ? (user.email || user.id) : "Not signed in";

  if (signedIn && !busy && !hasPending()) {
    setMessage("Your expenses, receipts, reports, current report, profile, and saved defaults are synced.", "ok");
  } else if (!signedIn) {
    setMessage("Sign in to keep this device connected to your cloud account.");
  }
}

function addStyles() {
  if (document.getElementById("completeSyncStyles")) return;
  const style = document.createElement("style");
  style.id = "completeSyncStyles";
  style.textContent = `
    #dashboard .metric-grid{grid-template-columns:repeat(auto-fit,minmax(185px,1fr))}
    .complete-sync-row{display:flex;justify-content:flex-end;margin:-8px 0 10px}
    .complete-sync-pill{min-height:29px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--muted);font-size:.76rem;font-weight:900;cursor:pointer;box-shadow:var(--shadow-soft)}
    .complete-sync-pill::before{content:"●";font-size:.62rem;margin-right:6px}
    .complete-sync-pill.ok{background:var(--olive-soft);border-color:#c8d8bd;color:#315329}
    .complete-sync-pill.wait{background:var(--amber-soft);border-color:#ead29f;color:var(--warning)}
    .complete-sync-pill.err{background:var(--danger-soft);border-color:#efc9c7;color:var(--danger)}
    .complete-sync-card{margin:0 0 12px;padding:16px;border:1px solid #c9d9bf;border-left:5px solid var(--olive);border-radius:15px;background:linear-gradient(135deg,#f8fbf5,var(--olive-soft));box-shadow:var(--shadow-soft)}
    .complete-sync-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
    .complete-sync-head h2{font-size:1.08rem;margin:2px 0 3px}.complete-sync-head p{margin:0;color:var(--muted);font-size:.8rem}
    .complete-sync-identity{font-size:.76rem;font-weight:850;color:#315329;word-break:break-word;text-align:right}
    .complete-sync-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .complete-sync-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .complete-sync-message{margin-top:9px;min-height:18px;font-size:.78rem;line-height:1.4;color:var(--muted)}
    .complete-sync-message.ok{color:#315329}.complete-sync-message.warn{color:var(--warning)}.complete-sync-message.bad{color:var(--danger)}
    @media(max-width:680px){.complete-sync-head{flex-direction:column}.complete-sync-identity{text-align:left}.complete-sync-grid{grid-template-columns:1fr}.complete-sync-actions{display:grid;grid-template-columns:1fr 1fr}.complete-sync-actions button{width:100%}}
  `;
  document.head.appendChild(style);
}

function mountDashboardClarification() {
  const grid = document.querySelector("#dashboard .metric-grid");
  if (!grid) return;

  const currentCard = document.getElementById("dashTotal")?.closest(".metric-card");
  if (currentCard) {
    const label = currentCard.querySelector(".metric-label");
    if (label) label.textContent = "Current report total";
  }

  if (!document.getElementById("dashUnreported")) {
    const card = document.createElement("article");
    card.className = "metric-card";
    card.innerHTML = `
      <div class="metric-label">Unreported expenses</div>
      <div id="dashUnreported" class="metric-value">$0.00</div>
      <div id="dashUnreportedCount" class="metric-note">0 expenses stored</div>`;
    grid.insertBefore(card, grid.firstChild);
  }
}

function updateUnreportedDashboard() {
  mountDashboardClarification();
  const items = expenses.filter(expense => !expense.submittedReportId);
  const total = items.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const value = document.getElementById("dashUnreported");
  const note = document.getElementById("dashUnreportedCount");
  if (value) value.textContent = money(total);
  if (note) note.textContent = `${items.length} unreported expense${items.length === 1 ? "" : "s"} stored`;
}

function hookDashboard() {
  if (window.__completeSyncDashboardHook || typeof renderDashboard !== "function") return;
  window.__completeSyncDashboardHook = true;
  const original = renderDashboard;
  renderDashboard = function(...args) {
    const result = original.apply(this, args);
    updateUnreportedDashboard();
    return result;
  };
  updateUnreportedDashboard();
}

function mountSyncUi() {
  addStyles();

  const shell = document.querySelector(".app-shell");
  if (shell && !document.getElementById("completeSyncPill")) {
    const row = document.createElement("div");
    row.className = "complete-sync-row";
    row.innerHTML = '<button id="completeSyncPill" class="complete-sync-pill" type="button">Cloud: signed out</button>';
    shell.insertBefore(row, shell.firstChild);
    document.getElementById("completeSyncPill").onclick = () => typeof showView === "function" && showView("settings");
  }

  const settingsView = document.getElementById("settings");
  const heading = settingsView?.querySelector(".page-heading");
  if (heading && !document.getElementById("completeSyncCard")) {
    const card = document.createElement("section");
    card.id = "completeSyncCard";
    card.className = "complete-sync-card";
    card.innerHTML = `
      <div class="complete-sync-head">
        <div>
          <div class="eyebrow">Cloud account</div>
          <h2>Automatic device sync</h2>
          <p>Local-first while you work. Cloud sync keeps your devices aligned.</p>
        </div>
        <div id="completeSyncIdentity" class="complete-sync-identity">Not signed in</div>
      </div>
      <div id="completeSyncAuthFields" class="complete-sync-grid">
        <div class="field"><label for="completeSyncEmail">Email</label><input id="completeSyncEmail" type="email" autocomplete="email"></div>
        <div class="field"><label for="completeSyncPassword">Password</label><input id="completeSyncPassword" type="password" autocomplete="current-password"></div>
      </div>
      <div id="completeSyncAuthActions" class="complete-sync-actions">
        <button id="completeSyncSignIn" class="primary" type="button">Sign in</button>
        <button id="completeSyncCreate" class="secondary" type="button">Create account</button>
      </div>
      <div id="completeSyncSignedInActions" class="complete-sync-actions" hidden>
        <button id="completeSyncNow" class="secondary" type="button">Sync now</button>
        <button id="completeSyncSignOut" class="secondary" type="button">Sign out</button>
      </div>
      <div id="completeSyncMessage" class="complete-sync-message"></div>`;
    heading.after(card);

    document.getElementById("completeSyncSignIn").onclick = signIn;
    document.getElementById("completeSyncCreate").onclick = createAccount;
    document.getElementById("completeSyncNow").onclick = () => syncAll({ manual: true });
    document.getElementById("completeSyncSignOut").onclick = signOutSafely;
  }

  const badge = document.querySelector(".header-badge");
  if (badge) badge.textContent = "Complete Sync Test 6";
  renderStatus();
}

function currentSnapshot() {
  return {
    expenseIds: new Set(expenses.map(expense => String(expense.id))),
    reportIds: new Set(reports.map(report => String(report.id))),
    settingsHash: hash(settings),
    draftHash: hash(reportDraft)
  };
}

function resetObserved() {
  observed = currentSnapshot();
}

function hookSaveAll() {
  if (window.__completeSyncSaveHook || typeof saveAll !== "function") return;
  window.__completeSyncSaveHook = true;
  resetObserved();

  const original = saveAll;
  saveAll = function(...args) {
    const result = original.apply(this, args);
    const after = currentSnapshot();

    if (!applyingRemote) {
      localMutationGeneration += 1;
      const expenseDeletes = new Set((meta.expenseDeletes || []).map(String));
      const reportDeletes = new Set((meta.reportDeletes || []).map(String));

      for (const id of observed.expenseIds) if (!after.expenseIds.has(id)) expenseDeletes.add(id);
      for (const id of observed.reportIds) if (!after.reportIds.has(id)) reportDeletes.add(id);

      meta.expenseDeletes = [...expenseDeletes];
      meta.reportDeletes = [...reportDeletes];

      if (after.settingsHash !== observed.settingsHash) {
        meta.settingsChangedAt = new Date().toISOString();
      }
      if (after.draftHash !== observed.draftHash) {
        meta.draftChangedAt = new Date().toISOString();
      }

      meta.pending = true;
      saveMeta();
      renderStatus();
      if (navigator.onLine && user) scheduleSync();
    }

    observed = after;
    updateUnreportedDashboard();
    return result;
  };
}

async function waitForApp() {
  for (let i = 0; i < 80; i++) {
    if (
      typeof expenses !== "undefined" &&
      typeof reports !== "undefined" &&
      typeof settings !== "undefined" &&
      typeof reportDraft !== "undefined" &&
      typeof saveAll === "function" &&
      typeof renderAll === "function" &&
      typeof normalizeSettings === "function" &&
      typeof normalizeReportDraft === "function" &&
      typeof getAllReceipts === "function" &&
      typeof getReceipt === "function" &&
      typeof putReceipt === "function" &&
      typeof clearReceiptStore === "function"
    ) {
      try {
        await getAllReceipts();
        return;
      } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("The local Ranch Expense Tracker data layer did not finish loading.");
}

function scheduleSync(delay = SYNC_DELAY) {
  clearTimeout(syncTimer);
  if (user) syncTimer = setTimeout(() => syncAll(), delay);
}

async function refreshUser() {
  if (!sb) return null;

  const { data: sessionData } = await sb.auth.getSession();
  let nextUser = sessionData.session?.user || null;

  if (navigator.onLine && nextUser) {
    const { data, error } = await sb.auth.getUser();
    if (!error) nextUser = data.user || nextUser;
  }

  if (nextUser && meta.userId && meta.userId !== nextUser.id) {
    await clearLocalUserData();
    meta = defaultMeta();
    meta.userId = nextUser.id;
  } else if (nextUser && !meta.userId) {
    meta.userId = nextUser.id;
  }

  user = nextUser;
  saveMeta();
  renderStatus();
  return user;
}

async function signIn() {
  if (!sb || busy) return;
  const email = String(document.getElementById("completeSyncEmail")?.value || "").trim();
  const password = document.getElementById("completeSyncPassword")?.value || "";
  if (!email || !password) return setMessage("Enter your email and password.", "warn");

  busy = true;
  renderStatus();
  setMessage("Signing in…");
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshUser();
    await syncAll({ manual: true });
  } catch (error) {
    setMessage(error.message || String(error), "bad");
  } finally {
    busy = false;
    renderStatus();
  }
}

async function createAccount() {
  if (!sb || busy) return;
  const email = String(document.getElementById("completeSyncEmail")?.value || "").trim();
  const password = document.getElementById("completeSyncPassword")?.value || "";
  if (!email || password.length < 6) return setMessage("Enter an email and a password with at least 6 characters.", "warn");

  busy = true;
  renderStatus();
  setMessage("Creating account…");
  try {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      await refreshUser();
      await syncAll({ manual: true });
    } else {
      setMessage("Account created. Confirm the email if Supabase asks, then sign in.", "warn");
    }
  } catch (error) {
    setMessage(error.message || String(error), "bad");
  } finally {
    busy = false;
    renderStatus();
  }
}

async function clearLocalUserData() {
  await waitForApp();
  applyingRemote = true;
  try {
    await clearReceiptStore();
    expenses = [];
    reports = [];
    settings = normalizeSettings({});
    reportDraft = normalizeReportDraft({});
    saveAll();
    applyReferenceDataLists();
    renderAll();
    if (typeof showView === "function") showView("dashboard");
  } finally {
    applyingRemote = false;
    resetObserved();
  }
}

async function signOutSafely() {
  if (!sb || !user || busy) return;

  if (hasPending() && navigator.onLine) {
    setMessage("Syncing your latest changes before sign-out…", "warn");
    await syncAll({ manual: true });
  }

  if (hasPending()) {
    const proceed = confirm(
      "Some changes have not synced yet.\n\nSigning out now will clear this device's local copy, and unsynced changes may be lost.\n\nSign out anyway?"
    );
    if (!proceed) return;
  }

  busy = true;
  renderStatus();
  try {
    const { error } = await sb.auth.signOut({ scope: "local" });
    if (error && navigator.onLine) throw error;

    await clearLocalUserData();
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(META_KEY);
    meta = defaultMeta();
    user = null;

    const password = document.getElementById("completeSyncPassword");
    if (password) password.value = "";
    setMessage("Signed out. This user's local expenses and receipts were removed from this device.", "ok");
  } catch (error) {
    setMessage("Sign-out issue: " + (error.message || String(error)), "bad");
  } finally {
    busy = false;
    renderStatus();
  }
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
      name = safeName(file.name);
      type = file.type;
      size = file.blob.size;
      path = `${user.id}/expenses/${safeName(expense.id)}/${name}`;

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

async function tombstoneExpense(row) {
  if (row?.receipt_path) {
    const remove = await sb.storage.from(BUCKET).remove([row.receipt_path]);
    if (remove.error) throw remove.error;
  }

  const query = await sb.from("expenses").update({
    deleted_at: new Date().toISOString(),
    receipt_path: null,
    receipt_name: null,
    receipt_type: null,
    receipt_size: null
  }).eq("expense_id", row.expense_id);

  if (query.error) throw query.error;
}

async function pushReport(report) {
  const query = await sb.from("reports").upsert({
    user_id: user.id,
    report_id: String(report.id),
    payload: clone(report),
    deleted_at: null
  }, { onConflict: "user_id,report_id" });

  if (query.error) throw query.error;
}

async function tombstoneReport(row) {
  const query = await sb.from("reports")
    .update({ deleted_at: new Date().toISOString() })
    .eq("report_id", row.report_id);

  if (query.error) throw query.error;
}

function mergeUniqueText(a, b) {
  return [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]
    .map(value => String(value || "").trim())
    .filter(Boolean))]
    .sort((x, y) => x.localeCompare(y));
}

function mergeRoutes(a, b) {
  const map = new Map();
  for (const route of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const key = String(route?.id || `${route?.start || ""}|${route?.destination || ""}|${route?.miles || ""}`);
    if (!map.has(key)) map.set(key, clone(route));
  }
  return [...map.values()];
}

function settingsMeaningful(value) {
  if (!value) return false;
  return Boolean(
    String(value.employeeName || "").trim() ||
    String(value.defaultDepartment || "").trim() ||
    String(value.feedbackEmail || "").trim() ||
    ["savedPeople","savedOrganizations","savedLocations","savedVehicles","savedTags","savedRoutes"]
      .some(key => Array.isArray(value[key]) && value[key].length)
  );
}

function mergeSettings(localValue, cloudValue, preferLocalScalars = true) {
  const local = normalizeSettings(localValue || {});
  const cloud = normalizeSettings(cloudValue || {});
  const merged = { ...clone(preferLocalScalars ? cloud : local), ...clone(preferLocalScalars ? local : cloud) };

  for (const key of ["savedPeople","savedOrganizations","savedLocations","savedVehicles","savedTags"]) {
    merged[key] = mergeUniqueText(local[key], cloud[key]);
  }
  merged.savedRoutes = mergeRoutes(local.savedRoutes, cloud.savedRoutes);
  return normalizeSettings(merged);
}

function draftMeaningful(value) {
  if (!value) return false;
  return Boolean(
    String(value.title || "").trim() ||
    String(value.department || "").trim() ||
    String(value.periodStart || "").trim() ||
    String(value.periodEnd || "").trim() ||
    String(value.purpose || "").trim() ||
    (Array.isArray(value.selectedExpenseIds) && value.selectedExpenseIds.length)
  );
}

async function syncSettings(profileRow, startGeneration, localState) {
  const cloudSettingsRaw = profileRow?.app_settings && typeof profileRow.app_settings === "object"
    ? profileRow.app_settings
    : {};
  const localHash = hash(localState);
  const cloudHash = hash(normalizeSettings(cloudSettingsRaw));
  const known = meta.settingsKnownHash || "";

  if (!profileRow) {
    const upsert = await sb.from("profiles").upsert({
      user_id: user.id,
      email: user.email || null,
      employee_name: String(localState.employeeName || ""),
      department: String(localState.defaultDepartment || ""),
      app_settings: clone(localState)
    }, { onConflict: "user_id" });
    if (upsert.error) throw upsert.error;
    meta.settingsKnownHash = localHash;
    return { value: localState, changedLocal: false };
  }

  if (localHash === cloudHash) {
    meta.settingsKnownHash = localHash;
    return { value: localState, changedLocal: false };
  }

  const localChanged = known && localHash !== known;
  const cloudChanged = known && cloudHash !== known;

  let preferLocal;
  if (!known) {
    if (!settingsMeaningful(localState) && settingsMeaningful(cloudSettingsRaw)) preferLocal = false;
    else if (settingsMeaningful(localState) && !settingsMeaningful(cloudSettingsRaw)) preferLocal = true;
    else preferLocal = true;
  } else if (localChanged && !cloudChanged) {
    preferLocal = true;
  } else if (!localChanged && cloudChanged) {
    preferLocal = false;
  } else {
    preferLocal = timeOf(meta.settingsChangedAt) >= timeOf(profileRow.updated_at);
  }

  const merged = mergeSettings(localState, cloudSettingsRaw, preferLocal);
  const mergedHash = hash(merged);

  const upsert = await sb.from("profiles").upsert({
    user_id: user.id,
    email: user.email || null,
    employee_name: String(merged.employeeName || ""),
    department: String(merged.defaultDepartment || ""),
    app_settings: clone(merged)
  }, { onConflict: "user_id" });
  if (upsert.error) throw upsert.error;

  meta.settingsKnownHash = mergedHash;
  const changedLocal = mergedHash !== localHash;

  if (changedLocal && localMutationGeneration !== startGeneration) {
    return { value: localState, changedLocal: false, retry: true };
  }

  return { value: merged, changedLocal };
}

async function syncDraft(draftRow, startGeneration, localState) {
  const cloudValue = normalizeReportDraft(draftRow?.payload || {});
  const localValue = normalizeReportDraft(localState || {});
  const localHash = hash(localValue);
  const cloudHash = hash(cloudValue);
  const known = meta.draftKnownHash || "";

  if (!draftRow) {
    const upsert = await sb.from("report_drafts").upsert({
      user_id: user.id,
      payload: clone(localValue)
    }, { onConflict: "user_id" });
    if (upsert.error) throw upsert.error;
    meta.draftKnownHash = localHash;
    return { value: localValue, changedLocal: false };
  }

  if (localHash === cloudHash) {
    meta.draftKnownHash = localHash;
    return { value: localValue, changedLocal: false };
  }

  const localChanged = known && localHash !== known;
  const cloudChanged = known && cloudHash !== known;

  let localWins;
  if (!known) {
    if (!draftMeaningful(localValue) && draftMeaningful(cloudValue)) localWins = false;
    else if (draftMeaningful(localValue) && !draftMeaningful(cloudValue)) localWins = true;
    else localWins = timeOf(meta.draftChangedAt) > timeOf(draftRow.updated_at);
  } else if (localChanged && !cloudChanged) {
    localWins = true;
  } else if (!localChanged && cloudChanged) {
    localWins = false;
  } else {
    localWins = timeOf(meta.draftChangedAt) >= timeOf(draftRow.updated_at);
  }

  if (localWins) {
    const upsert = await sb.from("report_drafts").upsert({
      user_id: user.id,
      payload: clone(localValue)
    }, { onConflict: "user_id" });
    if (upsert.error) throw upsert.error;
    meta.draftKnownHash = localHash;
    return { value: localValue, changedLocal: false };
  }

  if (localMutationGeneration !== startGeneration) {
    return { value: localValue, changedLocal: false, retry: true };
  }

  meta.draftKnownHash = cloudHash;
  return { value: cloudValue, changedLocal: true };
}

async function syncAll({ manual = false } = {}) {
  if (busy || !user || !navigator.onLine) {
    renderStatus();
    return;
  }

  busy = true;
  const startGeneration = localMutationGeneration;
  renderStatus();
  if (manual) setMessage("Checking all cloud records…");

  try {
    await waitForApp();

    const localExpenses = expenses.map(clone);
    const localReports = reports.map(clone);
    const localSettings = clone(settings);
    const localDraft = clone(reportDraft);

    const [expenseQuery, reportQuery, profileQuery, draftQuery] = await Promise.all([
      sb.from("expenses").select("*").order("created_at", { ascending: true }),
      sb.from("reports").select("*").order("created_at", { ascending: true }),
      sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("report_drafts").select("*").eq("user_id", user.id).maybeSingle()
    ]);

    for (const result of [expenseQuery, reportQuery, profileQuery, draftQuery]) {
      if (result.error) throw result.error;
    }

    const cloudExpenses = new Map((expenseQuery.data || []).map(row => [String(row.expense_id), row]));
    const cloudReports = new Map((reportQuery.data || []).map(row => [String(row.report_id), row]));
    const expenseDeletes = new Set((meta.expenseDeletes || []).map(String));
    const reportDeletes = new Set((meta.reportDeletes || []).map(String));

    for (const id of [...expenseDeletes]) {
      const row = cloudExpenses.get(id);
      if (row && !row.deleted_at) await tombstoneExpense(row);
      if (row) cloudExpenses.set(id, { ...row, deleted_at: new Date().toISOString(), receipt_path: null });
      expenseDeletes.delete(id);
    }

    for (const id of [...reportDeletes]) {
      const row = cloudReports.get(id);
      if (row && !row.deleted_at) await tombstoneReport(row);
      if (row) cloudReports.set(id, { ...row, deleted_at: new Date().toISOString() });
      reportDeletes.delete(id);
    }

    const finalExpenses = new Map(localExpenses.map(expense => [String(expense.id), expense]));
    const expenseIds = new Set([...cloudExpenses.keys(), ...finalExpenses.keys()]);
    const nextExpenseKnown = {};
    let expensesChangedLocal = false;

    for (const id of expenseIds) {
      const localExpense = finalExpenses.get(id) || null;
      const row = cloudExpenses.get(id) || null;
      const activeCloud = row && !row.deleted_at;

      if (!localExpense && activeCloud) {
        const pulled = await pullExpense(row, null);
        finalExpenses.set(id, pulled);
        nextExpenseKnown[id] = hash(pulled);
        expensesChangedLocal = true;
        continue;
      }

      if (localExpense && !row) {
        await pushExpense(localExpense, null);
        nextExpenseKnown[id] = hash(localExpense);
        continue;
      }

      if (localExpense && row?.deleted_at) {
        if (expenseVersion(localExpense) > timeOf(row.deleted_at)) {
          await pushExpense(localExpense, row);
          nextExpenseKnown[id] = hash(localExpense);
        } else {
          if (localExpense.receiptId) {
            try { await deleteReceipt(localExpense.receiptId); } catch {}
          }
          finalExpenses.delete(id);
          nextExpenseKnown[id] = "__deleted__";
          expensesChangedLocal = true;
        }
        continue;
      }

      if (!localExpense && row?.deleted_at) {
        nextExpenseKnown[id] = "__deleted__";
        continue;
      }

      if (localExpense && activeCloud) {
        const localHash = hash(localExpense);
        const cloudHash = hash(row.payload || {});
        const known = meta.knownExpenses[id] || "";

        if (localHash === cloudHash) {
          nextExpenseKnown[id] = localHash;
          continue;
        }

        const localChanged = known && localHash !== known;
        const cloudChanged = known && cloudHash !== known;

        let localWins;
        if (known && localChanged && !cloudChanged) localWins = true;
        else if (known && !localChanged && cloudChanged) localWins = false;
        else localWins = expenseVersion(localExpense) > expenseVersion(row.payload);

        if (localWins) {
          await pushExpense(localExpense, row);
          nextExpenseKnown[id] = localHash;
        } else {
          const pulled = await pullExpense(row, localExpense);
          finalExpenses.set(id, pulled);
          nextExpenseKnown[id] = hash(pulled);
          expensesChangedLocal = true;
        }
      }
    }

    const finalReports = new Map(localReports.map(report => [String(report.id), report]));
    const reportIds = new Set([...cloudReports.keys(), ...finalReports.keys()]);
    const nextReportKnown = {};
    let reportsChangedLocal = false;

    for (const id of reportIds) {
      const localReport = finalReports.get(id) || null;
      const row = cloudReports.get(id) || null;
      const activeCloud = row && !row.deleted_at;

      if (!localReport && activeCloud) {
        const pulled = clone(row.payload || {});
        pulled.id = pulled.id || row.report_id;
        finalReports.set(id, pulled);
        nextReportKnown[id] = hash(pulled);
        reportsChangedLocal = true;
        continue;
      }

      if (localReport && !row) {
        await pushReport(localReport);
        nextReportKnown[id] = hash(localReport);
        continue;
      }

      if (localReport && row?.deleted_at) {
        if (reportVersion(localReport) > timeOf(row.deleted_at)) {
          await pushReport(localReport);
          nextReportKnown[id] = hash(localReport);
        } else {
          finalReports.delete(id);
          nextReportKnown[id] = "__deleted__";
          reportsChangedLocal = true;
        }
        continue;
      }

      if (!localReport && row?.deleted_at) {
        nextReportKnown[id] = "__deleted__";
        continue;
      }

      if (localReport && activeCloud) {
        const localHash = hash(localReport);
        const cloudHash = hash(row.payload || {});
        const known = meta.knownReports[id] || "";

        if (localHash === cloudHash) {
          nextReportKnown[id] = localHash;
          continue;
        }

        const localChanged = known && localHash !== known;
        const cloudChanged = known && cloudHash !== known;

        let localWins;
        if (known && localChanged && !cloudChanged) localWins = true;
        else if (known && !localChanged && cloudChanged) localWins = false;
        else localWins = reportVersion(localReport) > reportVersion(row.payload);

        if (localWins) {
          await pushReport(localReport);
          nextReportKnown[id] = localHash;
        } else {
          const pulled = clone(row.payload || {});
          pulled.id = pulled.id || row.report_id;
          finalReports.set(id, pulled);
          nextReportKnown[id] = hash(pulled);
          reportsChangedLocal = true;
        }
      }
    }

    const settingsResult = await syncSettings(profileQuery.data || null, startGeneration, localSettings);
    const draftResult = await syncDraft(draftQuery.data || null, startGeneration, localDraft);

    const needsLocalApply =
      expensesChangedLocal ||
      reportsChangedLocal ||
      settingsResult.changedLocal ||
      draftResult.changedLocal;

    if ((needsLocalApply || settingsResult.retry || draftResult.retry) &&
        localMutationGeneration !== startGeneration) {
      meta.pending = true;
      meta.expenseDeletes = [...expenseDeletes];
      meta.reportDeletes = [...reportDeletes];
      saveMeta();
      setMessage("A local change happened during sync. Keeping that change and running another safe pass…", "warn");
      scheduleSync(100);
      return;
    }

    if (needsLocalApply) {
      applyingRemote = true;
      try {
        expenses = [...finalExpenses.values()].sort((a, b) =>
          String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
        );
        reports = [...finalReports.values()].sort((a, b) =>
          String(a.createdAt || a.finalizedAt || "").localeCompare(String(b.createdAt || b.finalizedAt || ""))
        );
        if (settingsResult.changedLocal) settings = normalizeSettings(settingsResult.value);
        if (draftResult.changedLocal) reportDraft = normalizeReportDraft(draftResult.value);

        saveAll();
        applyReferenceDataLists();
        renderAll();
      } finally {
        applyingRemote = false;
        resetObserved();
      }
    }

    meta.knownExpenses = nextExpenseKnown;
    meta.knownReports = nextReportKnown;
    meta.expenseDeletes = [...expenseDeletes];
    meta.reportDeletes = [...reportDeletes];
    meta.initialized = true;
    meta.pending = localMutationGeneration !== startGeneration;
    saveMeta();

    renderStatus();

    if (meta.pending) {
      setMessage("A newer local change arrived during sync. Running one more pass…", "warn");
      scheduleSync(100);
    } else {
      setMessage(
        `Synced ${expenses.length} expense${expenses.length === 1 ? "" : "s"}, ${reports.length} completed report${reports.length === 1 ? "" : "s"}, current report, profile, and saved defaults.`,
        "ok"
      );
    }
  } catch (error) {
    meta.pending = true;
    saveMeta();
    setPill("Sync issue", "err");
    setMessage("Sync issue: " + (error.message || String(error)), "bad");
    console.error(error);
  } finally {
    busy = false;
    renderStatus();
  }
}

async function init() {
  await waitForApp();
  mountSyncUi();
  mountDashboardClarification();
  hookDashboard();
  hookSaveAll();

  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_KEY
      }
    });

    sb.auth.onAuthStateChange(() => setTimeout(async () => {
      await refreshUser();
      if (user) scheduleSync(100);
    }, 0));

    await refreshUser();
    if (user) await syncAll();

    window.addEventListener("online", () => {
      renderStatus();
      if (user) scheduleSync(100);
    });
    window.addEventListener("offline", renderStatus);
    window.addEventListener("focus", () => user && scheduleSync(200));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && user) scheduleSync(200);
    });

    setInterval(() => {
      if (user && navigator.onLine) syncAll();
    }, PERIODIC_SYNC_MS);
  } catch (error) {
    setPill("Cloud unavailable", "err");
    setMessage("Supabase could not initialize: " + (error.message || String(error)), "bad");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();