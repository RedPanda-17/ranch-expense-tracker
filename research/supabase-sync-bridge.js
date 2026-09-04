(() => {
"use strict";

const SUPABASE_URL = "https://rdxzqudawzkqetooubee.supabase.co";
const SUPABASE_KEY = "sb_publishable_is8367xzMm8UckiRkyYAMw_jVy8Eyop";
const BUCKET = "expense-documents";
let sb = null, user = null, busy = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = value => typeof structuredClone === "function"
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));
const safeName = value => String(value || "document")
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "") || "document";
const $c = id => document.getElementById(id);

function addStyles() {
  if ($c("cloudSyncStyles")) return;
  const style = document.createElement("style");
  style.id = "cloudSyncStyles";
  style.textContent = `
    .cloud-sync-card{margin-bottom:12px;padding:17px;border:1px solid #c9d9bf;border-left:5px solid var(--olive);border-radius:15px;background:linear-gradient(135deg,#f8fbf5,var(--olive-soft));box-shadow:var(--shadow-soft)}
    .cloud-sync-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
    .cloud-sync-top h2{margin:2px 0 4px;font-size:1.15rem}.cloud-sync-top p{margin:0;color:var(--muted);font-size:.82rem}
    .cloud-sync-state{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eee7df;color:var(--muted);font-size:.76rem;font-weight:900;white-space:nowrap}
    .cloud-sync-state.on{background:var(--olive-soft);color:#315329}
    .cloud-sync-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
    .cloud-sync-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .cloud-sync-message{margin-top:10px;min-height:18px;font-size:.79rem;line-height:1.4;color:var(--muted);white-space:pre-wrap}
    .cloud-sync-message.ok{color:#315329}.cloud-sync-message.warn{color:var(--warning)}.cloud-sync-message.bad{color:var(--danger)}
    .cloud-transfer{display:none;margin-top:13px;padding-top:13px;border-top:1px solid #c9d9bf}.cloud-transfer.on{display:block}
    .cloud-transfer small{display:block;color:var(--muted);line-height:1.4}.cloud-transfer .button-row{margin-top:10px}
    @media(max-width:680px){.cloud-sync-top{flex-direction:column}.cloud-sync-grid{grid-template-columns:1fr}.cloud-sync-actions{display:grid;grid-template-columns:1fr 1fr}.cloud-sync-actions button,.cloud-transfer .button-row button{width:100%}.cloud-transfer .button-row{display:grid}}
  `;
  document.head.appendChild(style);
}

function message(text, type="") {
  const el = $c("cloudSyncMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "cloud-sync-message" + (type ? " " + type : "");
}
function setBusy(value) {
  busy = !!value;
  document.querySelectorAll("[data-cloud-action]").forEach(b => b.disabled = busy);
}
function renderAuth() {
  const state = $c("cloudSyncState"), transfer = $c("cloudTransfer"), email = $c("cloudEmail");
  if (!state || !transfer) return;
  if (user) {
    state.textContent = "Signed in";
    state.className = "cloud-sync-state on";
    transfer.classList.add("on");
    if (email && !email.value) email.value = user.email || "";
    message("Cloud account: " + (user.email || user.id), "ok");
  } else {
    state.textContent = "Not signed in";
    state.className = "cloud-sync-state";
    transfer.classList.remove("on");
    message("Sign in to test moving expenses and receipts between devices.");
  }
}
function mount() {
  if ($c("cloudSyncCard")) return;
  addStyles();
  const settingsView = document.getElementById("settings");
  const heading = settingsView?.querySelector(".page-heading");
  if (!heading) return;
  const card = document.createElement("section");
  card.id = "cloudSyncCard";
  card.className = "cloud-sync-card";
  card.innerHTML = `
    <div class="cloud-sync-top">
      <div><div class="eyebrow">Supabase sync test</div><h2>Cloud account & device sync</h2>
      <p>Expenses still save locally first. Cloud transfer is manual while we validate device switching.</p></div>
      <span id="cloudSyncState" class="cloud-sync-state">Loading…</span>
    </div>
    <div class="cloud-sync-grid">
      <div class="field"><label for="cloudEmail">Email</label><input id="cloudEmail" type="email" autocomplete="email"></div>
      <div class="field"><label for="cloudPassword">Password</label><input id="cloudPassword" type="password" autocomplete="current-password"></div>
    </div>
    <div class="cloud-sync-actions">
      <button id="cloudSignIn" data-cloud-action class="primary" type="button">Sign in</button>
      <button id="cloudCreate" data-cloud-action class="secondary" type="button">Create account</button>
      <button id="cloudSignOut" data-cloud-action class="secondary" type="button">Sign out</button>
    </div>
    <div id="cloudSyncMessage" class="cloud-sync-message">Loading Supabase…</div>
    <div id="cloudTransfer" class="cloud-transfer">
      <strong>Device transfer test</strong>
      <small>Choose which copy should win. This prevents silent conflict merging while we test.</small>
      <div class="button-row">
        <button id="cloudPush" data-cloud-action class="primary" type="button">Upload this device to cloud</button>
        <button id="cloudPull" data-cloud-action class="secondary" type="button">Replace this device from cloud</button>
      </div>
    </div>`;
  heading.after(card);
  $c("cloudSignIn").onclick = signIn;
  $c("cloudCreate").onclick = createAccount;
  $c("cloudSignOut").onclick = signOut;
  $c("cloudPush").onclick = pushCloud;
  $c("cloudPull").onclick = pullCloud;

  const badge = document.querySelector(".header-badge");
  if (badge) badge.textContent = "Supabase Sync Test · 1.5.0 base";
}

async function refreshUser() {
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  user = error ? null : (data.user || null);
  renderAuth();
  return user;
}
async function signIn() {
  if (busy) return;
  const email = ($c("cloudEmail")?.value || "").trim(), password = $c("cloudPassword")?.value || "";
  if (!email || !password) return message("Enter your email and password.", "warn");
  setBusy(true); message("Signing in…");
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshUser();
  } catch (e) { message(e.message || String(e), "bad"); }
  finally { setBusy(false); }
}
async function createAccount() {
  if (busy) return;
  const email = ($c("cloudEmail")?.value || "").trim(), password = $c("cloudPassword")?.value || "";
  if (!email || password.length < 6) return message("Enter an email and password with at least 6 characters.", "warn");
  setBusy(true); message("Creating account…");
  try {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) await refreshUser();
    else message("Account created. Confirm the email if Supabase asks, then sign in.", "warn");
  } catch (e) { message(e.message || String(e), "bad"); }
  finally { setBusy(false); }
}
async function signOut() {
  if (!sb || busy) return;
  setBusy(true);
  try {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    user = null; renderAuth();
  } catch (e) { message(e.message || String(e), "bad"); }
  finally { setBusy(false); }
}

async function waitDb() {
  for (let i=0;i<50;i++) {
    try { await getAllReceipts(); return; } catch { await sleep(100); }
  }
  throw new Error("Local receipt storage did not finish loading.");
}
async function receiptFile(expense) {
  if (!expense?.receiptId) return null;
  const r = await getReceipt(expense.receiptId);
  if (!r) return null;
  const blob = r.blob || (r.bytes ? new Blob([r.bytes], {type:r.type || "application/octet-stream"}) : null);
  return blob ? {blob, name:r.name || expense.receiptName || "document", type:r.type || blob.type || "application/octet-stream"} : null;
}

async function pushCloud() {
  if (busy) return;
  const u = await refreshUser();
  if (!u) return message("Sign in first.", "warn");
  if (!confirm("Upload this device to the cloud?\n\nThis test treats this device as the source of truth. Cloud expenses/reports not on this device will be removed.")) return;
  setBusy(true);
  try {
    await waitDb();
    message("Preparing cloud snapshot…");

    let result = await sb.from("profiles").upsert({
      user_id:u.id,email:u.email || null,employee_name:String(settings.employeeName || ""),
      department:String(settings.defaultDepartment || ""),app_settings:clone(settings)
    }, {onConflict:"user_id"});
    if (result.error) throw result.error;

    result = await sb.from("expenses").select("expense_id,receipt_path");
    if (result.error) throw result.error;
    const oldRows = result.data || [], oldById = new Map(oldRows.map(r=>[String(r.expense_id),r]));
    const localIds = new Set(expenses.map(e=>String(e.id)));
    const stale = oldRows.filter(r=>!localIds.has(String(r.expense_id)));
    const stalePaths = stale.map(r=>r.receipt_path).filter(Boolean);
    if (stalePaths.length) {
      const x = await sb.storage.from(BUCKET).remove(stalePaths); if (x.error) throw x.error;
    }
    if (stale.length) {
      const x = await sb.from("expenses").delete().in("expense_id", stale.map(r=>r.expense_id)); if (x.error) throw x.error;
    }

    for (let i=0;i<expenses.length;i++) {
      const expense = expenses[i], old = oldById.get(String(expense.id));
      message(`Uploading expense ${i+1} of ${expenses.length}…`);
      const f = await receiptFile(expense);
      let path=null,name=null,type=null,size=null;
      if (f) {
        name=safeName(f.name); type=f.type; size=f.blob.size;
        path=`${u.id}/expenses/${safeName(expense.id)}/${name}`;
        if (old?.receipt_path && old.receipt_path !== path) {
          const x=await sb.storage.from(BUCKET).remove([old.receipt_path]); if(x.error) throw x.error;
        }
        const x=await sb.storage.from(BUCKET).upload(path,f.blob,{upsert:true,cacheControl:"3600",contentType:type || undefined});
        if(x.error) throw x.error;
      } else if (old?.receipt_path) {
        const x=await sb.storage.from(BUCKET).remove([old.receipt_path]); if(x.error) throw x.error;
      }
      const x=await sb.from("expenses").upsert({
        user_id:u.id,expense_id:String(expense.id),payload:clone(expense),
        receipt_path:path,receipt_name:name,receipt_type:type,receipt_size:size,deleted_at:null
      },{onConflict:"user_id,expense_id"});
      if(x.error) throw x.error;
    }

    result=await sb.from("reports").select("report_id");
    if(result.error) throw result.error;
    const reportIds=new Set(reports.map(r=>String(r.id)));
    const staleReports=(result.data || []).filter(r=>!reportIds.has(String(r.report_id))).map(r=>r.report_id);
    if(staleReports.length) {
      const x=await sb.from("reports").delete().in("report_id",staleReports); if(x.error) throw x.error;
    }
    for(let i=0;i<reports.length;i++) {
      message(`Uploading report ${i+1} of ${reports.length}…`);
      const report=reports[i], x=await sb.from("reports").upsert({
        user_id:u.id,report_id:String(report.id),payload:clone(report),deleted_at:null
      },{onConflict:"user_id,report_id"});
      if(x.error) throw x.error;
    }
    result=await sb.from("report_drafts").upsert({user_id:u.id,payload:clone(reportDraft)},{onConflict:"user_id"});
    if(result.error) throw result.error;

    message(`Cloud snapshot complete: ${expenses.length} expense${expenses.length===1?"":"s"}, ${reports.length} report${reports.length===1?"":"s"}, settings, and receipt files.`, "ok");
  } catch(e) {
    console.error(e); message("Cloud upload failed: "+(e.message || String(e)), "bad");
  } finally { setBusy(false); }
}

async function pullCloud() {
  if (busy) return;
  const u=await refreshUser();
  if(!u) return message("Sign in first.","warn");
  if(!confirm("Replace this test device from the cloud?\n\nOnly this isolated Efficiency Test data will be replaced. Production Ranch Expense Tracker data is untouched.")) return;
  setBusy(true);
  try {
    await waitDb(); message("Downloading cloud records…");
    const [p,e,r,d]=await Promise.all([
      sb.from("profiles").select("*").eq("user_id",u.id).maybeSingle(),
      sb.from("expenses").select("*").is("deleted_at",null).order("created_at",{ascending:true}),
      sb.from("reports").select("*").is("deleted_at",null).order("created_at",{ascending:true}),
      sb.from("report_drafts").select("*").eq("user_id",u.id).maybeSingle()
    ]);
    for(const x of [p,e,r,d]) if(x.error) throw x.error;

    await clearReceiptStore();
    const restored=[];
    const rows=e.data || [];
    for(let i=0;i<rows.length;i++) {
      const row=rows[i], expense=clone(row.payload || {});
      message(`Restoring expense ${i+1} of ${rows.length}…`);
      expense.id=expense.id || row.expense_id;
      if(row.receipt_path) {
        const x=await sb.storage.from(BUCKET).download(row.receipt_path);
        if(x.error) throw x.error;
        const rid=expense.receiptId || ("receipt-cloud-"+row.expense_id);
        await putReceipt({id:rid,name:row.receipt_name || "document",type:row.receipt_type || x.data.type || "application/octet-stream",blob:x.data,originalName:row.receipt_name || "document",originalSize:Number(row.receipt_size || x.data.size || 0),optimized:true,savedAt:new Date().toISOString()});
        expense.receiptId=rid; expense.receiptName=row.receipt_name || expense.receiptName || "document"; expense.receiptType=row.receipt_type || x.data.type || "";
      }
      restored.push(expense);
    }

    expenses=restored;
    reports=(r.data || []).map(row=>{const v=clone(row.payload || {});v.id=v.id || row.report_id;return v});
    const profile=p.data || {}, s=(profile.app_settings && typeof profile.app_settings==="object") ? clone(profile.app_settings) : {};
    s.employeeName=profile.employee_name || s.employeeName || "";
    s.defaultDepartment=profile.department || s.defaultDepartment || "";
    settings=normalizeSettings(s);
    reportDraft=normalizeReportDraft(d.data?.payload || {});
    saveAll(); applyReferenceDataLists(); renderAll(); showView("dashboard");
    message(`Cloud restore complete: ${expenses.length} expense${expenses.length===1?"":"s"} and ${reports.length} report${reports.length===1?"":"s"} restored.`, "ok");
  } catch(e) {
    console.error(e); message("Cloud restore failed: "+(e.message || String(e)), "bad");
  } finally { setBusy(false); }
}

async function init() {
  mount();
  try {
    const mod=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"ranch-expense-supabase-sync-test-auth"}});
    sb.auth.onAuthStateChange(()=>setTimeout(refreshUser,0));
    await refreshUser();
  } catch(e) {
    message("Supabase failed to initialize: "+(e.message || String(e)),"bad");
  }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();