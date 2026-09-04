(() => {
"use strict";
if (window.__ranchSafeExpenseSyncV3) return;
window.__ranchSafeExpenseSyncV3 = true;

const URL="https://rdxzqudawzkqetooubee.supabase.co";
const KEY="sb_publishable_is8367xzMm8UckiRkyYAMw_jVy8Eyop";
const BUCKET="expense-documents";
const AUTH_KEY="ranch-expense-supabase-sync-test-auth";
const META_KEY="ranchExpense.safeExpenseSyncV3.meta";
let sb=null,user=null,busy=false,applying=false,timer=null;

const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const stable=v=>v===null||typeof v!=="object"?JSON.stringify(v):Array.isArray(v)?"["+v.map(stable).join(",")+"]":"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
function hash(v){const s=stable(v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function ver(v){const n=Date.parse(v?.updatedAt||v?.createdAt||"");return Number.isFinite(n)?n:0}
function safe(v){return String(v||"document").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"document"}
function loadMeta(){try{return{userId:"",pending:false,known:{},...(JSON.parse(localStorage.getItem(META_KEY)||"{}"))}}catch{return{userId:"",pending:false,known:{}}}}
let meta=loadMeta();
const saveMeta=()=>localStorage.setItem(META_KEY,JSON.stringify(meta));

function ui(){
  if(!document.getElementById("safeSyncStyle")){
    const s=document.createElement("style");s.id="safeSyncStyle";s.textContent=`
      .safe-sync-row{display:flex;justify-content:flex-end;margin:-8px 0 10px}
      .safe-sync-pill{min-height:29px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--muted);font-size:.76rem;font-weight:900;cursor:pointer;box-shadow:var(--shadow-soft)}
      .safe-sync-pill.ok{background:var(--olive-soft);color:#315329}.safe-sync-pill.wait{background:var(--amber-soft);color:var(--warning)}.safe-sync-pill.err{background:var(--danger-soft);color:var(--danger)}
    `;document.head.appendChild(s);
  }
  const shell=document.querySelector(".app-shell");
  if(shell&&!document.getElementById("safeSyncPill")){
    const row=document.createElement("div");row.className="safe-sync-row";row.innerHTML='<button id="safeSyncPill" class="safe-sync-pill" type="button">Cloud: signed out</button>';shell.insertBefore(row,shell.firstChild);
    document.getElementById("safeSyncPill").onclick=()=>typeof showView==="function"&&showView("settings");
  }
  const badge=document.querySelector(".header-badge");if(badge)badge.textContent="Safe Merge Sync Test 3";
  const transfer=document.getElementById("cloudTransfer");
  if(transfer){
    const strong=transfer.querySelector("strong"),small=transfer.querySelector("small");
    if(strong)strong.textContent="Recovery tools";
    if(small)small.textContent="Normal expense/receipt syncing is automatic and non-destructive. These buttons still replace one side and should only be used for recovery.";
  }
}
function pill(text,kind=""){const e=document.getElementById("safeSyncPill");if(e){e.textContent=text;e.className="safe-sync-pill "+kind}}
function status(){
  if(!navigator.onLine)return pill("Offline — will sync later","wait");
  if(!user)return pill("Cloud: signed out","");
  if(busy)return pill("Syncing…","wait");
  if(meta.pending)return pill("Changes waiting to sync","wait");
  pill("Synced","ok");
}
async function refreshUser(){
  if(!sb)return null;
  const {data,error}=await sb.auth.getUser();user=error?null:data.user||null;
  if(user&&meta.userId&&meta.userId!==user.id)meta={userId:user.id,pending:false,known:{}};
  if(user&&!meta.userId)meta.userId=user.id;
  saveMeta();status();return user;
}
function schedule(ms=1400){clearTimeout(timer);if(user)timer=setTimeout(sync,ms)}
function hook(){
  if(window.__safeSyncSaveHook||typeof saveAll!=="function")return;
  window.__safeSyncSaveHook=true;
  const orig=saveAll;
  saveAll=function(...a){const r=orig.apply(this,a);if(!applying){meta.pending=true;saveMeta();status();if(navigator.onLine)schedule()}return r};
}
async function receipt(exp){
  if(!exp?.receiptId)return null;
  const r=await getReceipt(exp.receiptId);if(!r)return null;
  const blob=r.blob||(r.bytes?new Blob([r.bytes],{type:r.type||"application/octet-stream"}):null);
  return blob?{blob,name:r.name||exp.receiptName||"document",type:r.type||blob.type||"application/octet-stream"}:null;
}
async function push(exp,row){
  const f=await receipt(exp);let path=null,name=null,type=null,size=null;
  const same=f&&row?.receipt_path&&String(row.payload?.receiptFingerprint||"")===String(exp.receiptFingerprint||"")&&Number(row.receipt_size||0)===Number(f.blob.size||0);
  if(f){
    if(same){path=row.receipt_path;name=row.receipt_name;type=row.receipt_type;size=row.receipt_size}
    else{
      name=safe(f.name);type=f.type;size=f.blob.size;path=`${user.id}/expenses/${safe(exp.id)}/${name}`;
      if(row?.receipt_path&&row.receipt_path!==path){const d=await sb.storage.from(BUCKET).remove([row.receipt_path]);if(d.error)throw d.error}
      const u=await sb.storage.from(BUCKET).upload(path,f.blob,{upsert:true,contentType:type||undefined,cacheControl:"3600"});if(u.error)throw u.error;
    }
  }else if(row?.receipt_path){const d=await sb.storage.from(BUCKET).remove([row.receipt_path]);if(d.error)throw d.error}
  const q=await sb.from("expenses").upsert({user_id:user.id,expense_id:String(exp.id),payload:clone(exp),receipt_path:path,receipt_name:name,receipt_type:type,receipt_size:size,deleted_at:null},{onConflict:"user_id,expense_id"});
  if(q.error)throw q.error;
}
async function pull(row,old){
  const exp=clone(row.payload||{});exp.id=exp.id||row.expense_id;
  const same=old?.receiptId&&String(old.receiptFingerprint||"")===String(exp.receiptFingerprint||"");
  if(row.receipt_path){
    if(same&&await getReceipt(old.receiptId)){exp.receiptId=old.receiptId}
    else{
      const d=await sb.storage.from(BUCKET).download(row.receipt_path);if(d.error)throw d.error;
      const id=exp.receiptId||old?.receiptId||("receipt-cloud-"+row.expense_id);
      await putReceipt({id,name:row.receipt_name||exp.receiptName||"document",type:row.receipt_type||d.data.type||"application/octet-stream",blob:d.data,originalName:row.receipt_name||exp.receiptName||"document",originalSize:Number(row.receipt_size||d.data.size||0),optimized:true,savedAt:new Date().toISOString()});
      exp.receiptId=id;exp.receiptName=row.receipt_name||exp.receiptName||"document";exp.receiptType=row.receipt_type||d.data.type||"";
    }
  }else if(old?.receiptId){try{await deleteReceipt(old.receiptId)}catch{};exp.receiptId="";exp.receiptName="";exp.receiptType="";exp.receiptFingerprint=""}
  return exp;
}
async function tomb(row){
  if(row.receipt_path){const d=await sb.storage.from(BUCKET).remove([row.receipt_path]);if(d.error)throw d.error}
  const q=await sb.from("expenses").update({deleted_at:new Date().toISOString(),receipt_path:null,receipt_name:null,receipt_type:null,receipt_size:null}).eq("expense_id",row.expense_id);if(q.error)throw q.error;
}
async function sync(){
  if(busy||!user||!navigator.onLine)return status();
  busy=true;status();
  try{
    const q=await sb.from("expenses").select("*").order("created_at",{ascending:true});if(q.error)throw q.error;
    const cloud=new Map((q.data||[]).map(r=>[String(r.expense_id),r]));
    const local=new Map(expenses.map(e=>[String(e.id),e]));
    const ids=new Set([...cloud.keys(),...local.keys(),...Object.keys(meta.known||{})]);
    const final=new Map(local),next={};let changed=false;

    for(const id of ids){
      const l=final.get(id)||null,r=cloud.get(id)||null,known=meta.known[id]||"",active=r&&!r.deleted_at;
      const lh=l?hash(l):"",rh=active?hash(r.payload||{}):"";
      if(l&&active){
        if(lh===rh){next[id]=lh;continue}
        const lc=known&&lh!==known,rc=known&&rh!==known;
        const localWins=known?(lc&&!rc?true:!lc&&rc?false:ver(l)>ver(r.payload)):ver(l)>ver(r.payload);
        if(localWins){await push(l,r);next[id]=lh}
        else{const p=await pull(r,l);final.set(id,p);next[id]=hash(p);changed=true}
      }else if(l&&!r){await push(l,null);next[id]=lh}
      else if(l&&r?.deleted_at){
        if(known&&lh!==known){await push(l,r);next[id]=lh}
        else{if(l.receiptId)try{await deleteReceipt(l.receiptId)}catch{};final.delete(id);next[id]="__deleted__";changed=true}
      }else if(!l&&active){
        if(known&&known!=="__deleted__"&&rh===known){await tomb(r);next[id]="__deleted__"}
        else{const p=await pull(r,null);final.set(id,p);next[id]=hash(p);changed=true}
      }else if(!l&&r?.deleted_at)next[id]="__deleted__";
    }

    if(changed){
      applying=true;
      try{expenses=[...final.values()].sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));saveAll();renderAll()}
      finally{applying=false}
    }
    meta.known=next;meta.pending=false;saveMeta();status();
    const m=document.getElementById("cloudSyncMessage");if(m){m.textContent="Expense and receipt records synced safely by record. No whole-device replacement occurred.";m.className="cloud-sync-message ok"}
  }catch(e){
    meta.pending=true;saveMeta();pill("Sync issue","err");
    const m=document.getElementById("cloudSyncMessage");if(m){m.textContent="Safe sync issue: "+(e.message||String(e));m.className="cloud-sync-message bad"}
    console.error(e);
  }finally{busy=false;status()}
}
async function init(){
  ui();hook();
  const mod=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  sb=mod.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:AUTH_KEY}});
  sb.auth.onAuthStateChange(()=>setTimeout(async()=>{await refreshUser();if(user)schedule(200)},0));
  await refreshUser();if(user)await sync();
  window.addEventListener("online",()=>{status();schedule(200)});
  window.addEventListener("offline",status);
  window.addEventListener("focus",()=>user&&schedule(300));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&user)schedule(300)});
  setInterval(()=>{if(user&&navigator.onLine)sync()},30000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();