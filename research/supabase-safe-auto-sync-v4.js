(() => {
"use strict";
if (window.__ranchSafeExpenseSyncV4) return;
window.__ranchSafeExpenseSyncV4 = true;

const BUCKET = "expense-documents";
const AUTH_KEY = "ranch-expense-supabase-sync-test-auth";
const META_KEY = "ranchExpense.safeExpenseSyncV4.meta";
let sb = null, user = null, busy = false, applying = false, timer = null;
let lastIds = new Set();
let meta = loadMeta();

const clone = v => typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
const stable = v => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? "[" + v.map(stable).join(",") + "]" : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
function hash(v){ const s=stable(v); let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(16); }
function version(v){ const n=Date.parse(v?.updatedAt || v?.createdAt || ""); return Number.isFinite(n) ? n : 0; }
function safe(v){ return String(v || "document").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"") || "document"; }
function loadMeta(){ try { return {userId:"",pending:false,pendingDeletes:[],known:{},...(JSON.parse(localStorage.getItem(META_KEY)||"{}"))}; } catch { return {userId:"",pending:false,pendingDeletes:[],known:{}}; } }
function saveMeta(){ localStorage.setItem(META_KEY,JSON.stringify(meta)); }

async function readProjectConfig(){
  const text = await fetch("./supabase-sync-bridge.js?v=1",{cache:"no-store"}).then(r => { if(!r.ok) throw new Error("Could not read Supabase bridge configuration."); return r.text(); });
  const url = text.match(/const SUPABASE_URL = ["']([^"']+)["']/)?.[1];
  const key = text.match(/const SUPABASE_KEY = ["']([^"']+)["']/)?.[1];
  if(!url || !key) throw new Error("Supabase browser configuration was not found.");
  return {url,key};
}

function ui(){
  if(!document.getElementById("safeV4Style")){
    const s=document.createElement("style"); s.id="safeV4Style"; s.textContent=`.safe-v4-row{display:flex;justify-content:flex-end;margin:-8px 0 10px}.safe-v4-pill{min-height:29px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--muted);font-size:.76rem;font-weight:900;cursor:pointer;box-shadow:var(--shadow-soft)}.safe-v4-pill.ok{background:var(--olive-soft);color:#315329}.safe-v4-pill.wait{background:var(--amber-soft);color:var(--warning)}.safe-v4-pill.err{background:var(--danger-soft);color:var(--danger)}`; document.head.appendChild(s);
  }
  const shell=document.querySelector(".app-shell");
  if(shell&&!document.getElementById("safeV4Pill")){
    const row=document.createElement("div"); row.className="safe-v4-row"; row.innerHTML='<button id="safeV4Pill" class="safe-v4-pill" type="button">Cloud: signed out</button>'; shell.insertBefore(row,shell.firstChild);
    document.getElementById("safeV4Pill").onclick=()=>typeof showView==="function"&&showView("settings");
  }
  const badge=document.querySelector(".header-badge"); if(badge) badge.textContent="Safe Merge Sync Test 4";
  const transfer=document.getElementById("cloudTransfer");
  if(transfer){ const strong=transfer.querySelector("strong"),small=transfer.querySelector("small"); if(strong) strong.textContent="Recovery tools"; if(small) small.textContent="Normal expense and receipt syncing is automatic. These overwrite buttons are only for recovery."; }
}
function pill(text,kind=""){ const e=document.getElementById("safeV4Pill"); if(e){ e.textContent=text; e.className="safe-v4-pill "+kind; } }
function message(text,type="ok"){ const e=document.getElementById("cloudSyncMessage"); if(e){ e.textContent=text; e.className="cloud-sync-message "+type; } }
function status(){ if(!navigator.onLine) return pill("Offline — will sync later","wait"); if(!user) return pill("Cloud: signed out"); if(busy) return pill("Syncing…","wait"); if(meta.pending || (meta.pendingDeletes||[]).length) return pill("Changes waiting to sync","wait"); pill("Synced","ok"); }

async function waitApp(){
  for(let i=0;i<80;i++){
    if(typeof expenses!=="undefined" && typeof saveAll==="function" && typeof renderAll==="function" && typeof getReceipt==="function" && typeof putReceipt==="function" && typeof getAllReceipts==="function"){
      try{ await getAllReceipts(); return; }catch{}
    }
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error("The local expense database did not finish loading.");
}
async function refreshUser(){
  if(!sb) return null;
  const {data,error}=await sb.auth.getUser(); user=error?null:(data.user||null);
  if(user && meta.userId && meta.userId!==user.id) meta={userId:user.id,pending:false,pendingDeletes:[],known:{}};
  if(user && !meta.userId) meta.userId=user.id;
  saveMeta(); status(); return user;
}
function schedule(ms=1200){ clearTimeout(timer); if(user) timer=setTimeout(sync,ms); }

function hookSave(){
  if(window.__safeV4SaveHook || typeof saveAll!=="function") return;
  window.__safeV4SaveHook=true; lastIds=new Set(expenses.map(e=>String(e.id)));
  const original=saveAll;
  saveAll=function(...args){
    const result=original.apply(this,args);
    if(!applying){
      const nowIds=new Set(expenses.map(e=>String(e.id))); const deletes=new Set((meta.pendingDeletes||[]).map(String));
      for(const id of lastIds) if(!nowIds.has(id)) deletes.add(id);
      meta.pendingDeletes=[...deletes]; meta.pending=true; saveMeta(); lastIds=nowIds; status(); if(navigator.onLine) schedule();
    }else lastIds=new Set(expenses.map(e=>String(e.id)));
    return result;
  };
}

async function receipt(exp){
  if(!exp?.receiptId) return null;
  const r=await getReceipt(exp.receiptId); if(!r) return null;
  const blob=r.blob || (r.bytes ? new Blob([r.bytes],{type:r.type||"application/octet-stream"}) : null);
  return blob ? {blob,name:r.name||exp.receiptName||"document",type:r.type||blob.type||"application/octet-stream"} : null;
}
async function push(exp,row){
  const f=await receipt(exp); let path=null,name=null,type=null,size=null;
  const same=f && row?.receipt_path && String(row.payload?.receiptFingerprint||"")===String(exp.receiptFingerprint||"") && Number(row.receipt_size||0)===Number(f.blob.size||0);
  if(f){
    if(same){ path=row.receipt_path; name=row.receipt_name; type=row.receipt_type; size=row.receipt_size; }
    else{
      name=safe(f.name); type=f.type; size=f.blob.size; path=`${user.id}/expenses/${safe(exp.id)}/${name}`;
      if(row?.receipt_path && row.receipt_path!==path){ const d=await sb.storage.from(BUCKET).remove([row.receipt_path]); if(d.error) throw d.error; }
      const u=await sb.storage.from(BUCKET).upload(path,f.blob,{upsert:true,contentType:type||undefined,cacheControl:"3600"}); if(u.error) throw u.error;
    }
  }else if(row?.receipt_path){ const d=await sb.storage.from(BUCKET).remove([row.receipt_path]); if(d.error) throw d.error; }
  const q=await sb.from("expenses").upsert({user_id:user.id,expense_id:String(exp.id),payload:clone(exp),receipt_path:path,receipt_name:name,receipt_type:type,receipt_size:size,deleted_at:null},{onConflict:"user_id,expense_id"}); if(q.error) throw q.error;
}
async function pull(row,old){
  const exp=clone(row.payload||{}); exp.id=exp.id||row.expense_id;
  const same=old?.receiptId && String(old.receiptFingerprint||"")===String(exp.receiptFingerprint||"");
  if(row.receipt_path){
    if(same && await getReceipt(old.receiptId)) exp.receiptId=old.receiptId;
    else{
      const d=await sb.storage.from(BUCKET).download(row.receipt_path); if(d.error) throw d.error;
      const id=exp.receiptId||old?.receiptId||("receipt-cloud-"+row.expense_id);
      await putReceipt({id,name:row.receipt_name||exp.receiptName||"document",type:row.receipt_type||d.data.type||"application/octet-stream",blob:d.data,originalName:row.receipt_name||exp.receiptName||"document",originalSize:Number(row.receipt_size||d.data.size||0),optimized:true,savedAt:new Date().toISOString()});
      exp.receiptId=id; exp.receiptName=row.receipt_name||exp.receiptName||"document"; exp.receiptType=row.receipt_type||d.data.type||"";
    }
  }else if(old?.receiptId){ try{ await deleteReceipt(old.receiptId); }catch{} exp.receiptId=""; exp.receiptName=""; exp.receiptType=""; exp.receiptFingerprint=""; }
  return exp;
}
async function tomb(row){
  if(row?.receipt_path){ const d=await sb.storage.from(BUCKET).remove([row.receipt_path]); if(d.error) throw d.error; }
  const q=await sb.from("expenses").update({deleted_at:new Date().toISOString(),receipt_path:null,receipt_name:null,receipt_type:null,receipt_size:null}).eq("expense_id",row.expense_id); if(q.error) throw q.error;
}

async function sync(){
  if(busy || !user || !navigator.onLine) return status();
  busy=true; status();
  try{
    await waitApp();
    const q=await sb.from("expenses").select("*").order("created_at",{ascending:true}); if(q.error) throw q.error;
    const cloud=new Map((q.data||[]).map(r=>[String(r.expense_id),r]));
    const local=new Map(expenses.map(e=>[String(e.id),e]));
    const deletes=new Set((meta.pendingDeletes||[]).map(String));

    for(const id of [...deletes]){
      const row=cloud.get(id); if(row && !row.deleted_at) await tomb(row); deletes.delete(id);
    }

    const final=new Map(local); const ids=new Set([...cloud.keys(),...local.keys()]); const next={}; let changed=false;
    for(const id of ids){
      const l=final.get(id)||null, r=cloud.get(id)||null, active=r&&!r.deleted_at;
      if(!l && active){ const p=await pull(r,null); final.set(id,p); next[id]=hash(p); changed=true; continue; }
      if(l && !r){ await push(l,null); next[id]=hash(l); continue; }
      if(l && r?.deleted_at){
        const lv=version(l), dv=Date.parse(r.deleted_at)||0;
        if(lv>dv){ await push(l,r); next[id]=hash(l); }
        else{ if(l.receiptId) try{ await deleteReceipt(l.receiptId); }catch{} final.delete(id); next[id]="__deleted__"; changed=true; }
        continue;
      }
      if(!l && r?.deleted_at){ next[id]="__deleted__"; continue; }
      if(l && active){
        const lh=hash(l), rh=hash(r.payload||{}); if(lh===rh){ next[id]=lh; continue; }
        if(version(l)>version(r.payload)){ await push(l,r); next[id]=lh; }
        else{ const p=await pull(r,l); final.set(id,p); next[id]=hash(p); changed=true; }
      }
    }

    if(changed){ applying=true; try{ expenses=[...final.values()].sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||""))); saveAll(); renderAll(); } finally{ applying=false; } }
    meta.known=next; meta.pendingDeletes=[...deletes]; meta.pending=false; saveMeta(); lastIds=new Set(expenses.map(e=>String(e.id))); status();
    message(`Synced ${expenses.length} expense${expenses.length===1?"":"s"}. Missing local records were restored from cloud.`,"ok");
  }catch(e){ meta.pending=true; saveMeta(); pill("Sync issue","err"); message("Safe sync issue: "+(e.message||String(e)),"bad"); console.error(e); }
  finally{ busy=false; status(); }
}

async function init(){
  ui(); await waitApp(); hookSave();
  const config=await readProjectConfig();
  const mod=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  sb=mod.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:AUTH_KEY}});
  sb.auth.onAuthStateChange(()=>setTimeout(async()=>{ await refreshUser(); if(user) schedule(100); },0));
  await refreshUser(); if(user) await sync();
  window.addEventListener("online",()=>{ status(); schedule(100); }); window.addEventListener("offline",status); window.addEventListener("focus",()=>user&&schedule(200));
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&user) schedule(200); });
  setInterval(()=>{ if(user&&navigator.onLine) sync(); },20000);
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();