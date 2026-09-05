(() => {
"use strict";

if (window.__ranchAuthPrerequisiteGateV3) return;
window.__ranchAuthPrerequisiteGateV3 = true;

let homeParent = null;
let homeNextSibling = null;
let revealTimer = null;
let syncQueued = false;
let signOutInProgress = false;

function q(id) { return document.getElementById(id); }
function isSignedIn() {
  const actions = q("completeSyncSignedInActions");
  return Boolean(actions && !actions.hidden);
}

function addStyles() {
  if (q("ranchAuthGateStylesV3")) return;
  const style = document.createElement("style");
  style.id = "ranchAuthGateStylesV3";
  style.textContent = `
    #ranchAuthGate{position:fixed;inset:0;z-index:10000;overflow:auto;display:grid;place-items:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom));background:radial-gradient(circle at 88% 4%,rgba(211,154,48,.18),transparent 30rem),linear-gradient(180deg,#fbf7ef 0%,#f5efe4 100%)}
    #ranchAuthGate[hidden]{display:none!important}
    .ranch-auth-gate-wrap{width:min(620px,100%)}
    .ranch-auth-gate-brand{display:flex;align-items:center;gap:14px;margin-bottom:16px}
    .ranch-auth-gate-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:15px;background:#a71f25;color:#fff;border:2px solid rgba(255,255,255,.24);box-shadow:inset 0 0 0 5px rgba(211,154,48,.18);font-size:1.5rem;font-weight:900;flex:0 0 auto}
    .ranch-auth-gate-brand strong{display:block;font-size:1.03rem;color:#2a231e}.ranch-auth-gate-brand small{display:block;margin-top:2px;color:#766a60;font-weight:700}
    .ranch-auth-gate-shell{padding:24px;border:1px solid #dfd1bd;border-radius:20px;background:#fffdf8;box-shadow:0 18px 46px rgba(74,50,30,.13)}
    .ranch-auth-gate-shell>h1{margin:0 0 7px;font-size:clamp(1.55rem,5vw,2.15rem);line-height:1.08;color:#2a231e}.ranch-auth-gate-shell>.ranch-auth-intro{margin:0 0 18px;color:#766a60;line-height:1.5}
    .ranch-auth-checking{padding:18px;border:1px solid #dfd1bd;border-radius:14px;background:#f9f3e9;color:#766a60;font-weight:800;text-align:center}
    #ranchAuthGateCardHost .complete-sync-card{margin:0;padding:18px;border-left:1px solid #c9d9bf;box-shadow:none}#ranchAuthGateCardHost .complete-sync-head{margin-bottom:2px}#ranchAuthGateCardHost .complete-sync-identity{display:none}
    .ranch-auth-gate-support{margin:15px 2px 0;color:#766a60;font-size:.78rem;text-align:center}
    @media(max-width:680px){#ranchAuthGate{place-items:start center;padding-top:calc(18px + env(safe-area-inset-top))}.ranch-auth-gate-shell{padding:19px;border-radius:17px}.ranch-auth-gate-brand{margin-bottom:12px}}
  `;
  document.head.appendChild(style);
}

function createGate() {
  let gate = q("ranchAuthGate");
  if (gate) return gate;
  gate = document.createElement("div");
  gate.id = "ranchAuthGate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-label", "Ranch Expense Tracker account sign in");
  gate.innerHTML = `
    <div class="ranch-auth-gate-wrap">
      <div class="ranch-auth-gate-brand"><div class="ranch-auth-gate-mark">R</div><div><strong>Ranch Expense Tracker</strong><small>Personal business expense tracking</small></div></div>
      <section class="ranch-auth-gate-shell">
        <h1>Sign in to continue</h1>
        <p class="ranch-auth-intro">Your expenses, receipts, reports, and saved defaults stay tied to your account and sync across your devices.</p>
        <div id="ranchAuthChecking" class="ranch-auth-checking">Checking your account…</div>
        <div id="ranchAuthGateCardHost"></div>
        <div class="ranch-auth-gate-support">Need help? Contact Saul Garcia.</div>
      </section>
    </div>`;
  document.body.appendChild(gate);
  return gate;
}

function rememberHome(card) {
  if (homeParent || !card?.parentNode) return;
  homeParent = card.parentNode;
  homeNextSibling = card.nextSibling;
}
function returnCardHome(card) {
  if (!card || !homeParent || card.parentNode === homeParent) return;
  if (homeNextSibling && homeNextSibling.parentNode === homeParent) homeParent.insertBefore(card, homeNextSibling);
  else {
    const heading = q("settings")?.querySelector(".page-heading");
    if (heading && heading.parentNode === homeParent) heading.after(card);
    else homeParent.appendChild(card);
  }
}
function setChecking(text, visible = true) {
  const checking = q("ranchAuthChecking");
  if (!checking) return;
  checking.textContent = text;
  checking.hidden = !visible;
}

function showSignedOut(card) {
  const gate = createGate();
  const host = q("ranchAuthGateCardHost");
  document.documentElement.classList.add("ranch-auth-pending");
  document.documentElement.classList.remove("ranch-auth-ready");
  document.body.classList.add("ranch-auth-gated");
  gate.hidden = false;

  if (!card || card.dataset.accountPolished !== "true") {
    setChecking("Preparing account sign in…", true);
    return;
  }

  rememberHome(card);
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    if (isSignedIn()) return queueSync();
    setChecking("Checking your account…", false);
    if (host && card.parentNode !== host) host.appendChild(card);
    const email = q("completeSyncEmail");
    if (email && !email.value) setTimeout(() => email.focus(), 50);
  }, 180);
}

function showSignedIn(card) {
  const gate = createGate();
  clearTimeout(revealTimer);
  if (card) {
    rememberHome(card);
    returnCardHome(card);
  }

  // Once authenticated, the account gate stays open. Background sync status,
  // focus changes, keyboard events, visibility changes, and render cycles must
  // never relock the app. Only an actual sign-out may show the gate again.
  if (signOutInProgress) return;

  gate.hidden = true;
  document.body.classList.remove("ranch-auth-gated");
  document.documentElement.classList.remove("ranch-auth-pending");
  document.documentElement.classList.add("ranch-auth-ready");
  setChecking("Checking your account…", true);
}

function runGate() {
  addStyles();
  createGate();
  const card = q("completeSyncCard");

  if (signOutInProgress) {
    if (!isSignedIn()) {
      signOutInProgress = false;
      showSignedOut(card);
    }
    return;
  }

  if (isSignedIn()) showSignedIn(card);
  else showSignedOut(card);
}
function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    runGate();
  });
}

// Privacy-cover immediately when an explicit sign-out starts. Keep it covered
// until the authenticated controls actually switch to signed-out state.
document.addEventListener("click", event => {
  if (!event.target?.closest?.("#completeSyncSignOut")) return;
  signOutInProgress = true;
  document.documentElement.classList.add("ranch-auth-pending");
  const gate = createGate();
  gate.hidden = false;
  setChecking("Signing out and clearing this device…", true);
}, true);

const observer = new MutationObserver(queueSync);
observer.observe(document.documentElement, {childList:true,subtree:true,attributes:true,attributeFilter:["hidden","data-account-polished"]});

let tries = 0;
const timer = setInterval(() => {
  tries += 1;
  queueSync();
  if (tries > 150 || (q("completeSyncCard") && q("ranchAuthGate"))) clearInterval(timer);
}, 100);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", queueSync, {once:true});
else queueSync();
})();