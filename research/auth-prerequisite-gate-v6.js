(() => {
"use strict";

if (window.__ranchAuthPrerequisiteGateV6) return;
window.__ranchAuthPrerequisiteGateV6 = true;

let homeParent = null;
let homeNextSibling = null;
let revealTimer = null;

function q(id) { return document.getElementById(id); }

function addStyles() {
  if (q("ranchAuthGateStyles")) return;
  const style = document.createElement("style");
  style.id = "ranchAuthGateStyles";
  style.textContent = `
    #ranchAuthGate{
      position:fixed;inset:0;z-index:10000;overflow:auto;
      display:grid;place-items:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom));
      background:
        radial-gradient(circle at 88% 4%,rgba(211,154,48,.18),transparent 30rem),
        linear-gradient(180deg,#fbf7ef 0%,#f5efe4 100%);
    }
    #ranchAuthGate[hidden]{display:none!important}
    .ranch-auth-gate-wrap{width:min(620px,100%)}
    .ranch-auth-gate-brand{display:flex;align-items:center;gap:14px;margin-bottom:16px}
    .ranch-auth-gate-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:15px;background:#a71f25;color:#fff;border:2px solid rgba(255,255,255,.24);box-shadow:inset 0 0 0 5px rgba(211,154,48,.18);font-size:1.5rem;font-weight:900;flex:0 0 auto}
    .ranch-auth-gate-brand strong{display:block;font-size:1.03rem;color:#2a231e}
    .ranch-auth-gate-brand small{display:block;margin-top:2px;color:#766a60;font-weight:700}
    .ranch-auth-gate-shell{padding:24px;border:1px solid #dfd1bd;border-radius:20px;background:#fffdf8;box-shadow:0 18px 46px rgba(74,50,30,.13)}
    .ranch-auth-gate-shell>h1{margin:0 0 7px;font-size:clamp(1.55rem,5vw,2.15rem);line-height:1.08;color:#2a231e}
    .ranch-auth-gate-shell>.ranch-auth-intro{margin:0 0 18px;color:#766a60;line-height:1.5}
    .ranch-auth-checking{padding:18px;border:1px solid #dfd1bd;border-radius:14px;background:#f9f3e9;color:#766a60;font-weight:800;text-align:center}
    #ranchAuthGateCardHost .complete-sync-card{margin:0;padding:18px;border-left:1px solid #c9d9bf;box-shadow:none}
    #ranchAuthGateCardHost .complete-sync-head{margin-bottom:2px}
    #ranchAuthGateCardHost .complete-sync-identity{display:none}
    .ranch-auth-gate-support{margin:15px 2px 0;color:#766a60;font-size:.78rem;text-align:center}
    @media(max-width:680px){
      #ranchAuthGate{place-items:start center;padding-top:calc(18px + env(safe-area-inset-top))}
      .ranch-auth-gate-shell{padding:19px;border-radius:17px}
      .ranch-auth-gate-brand{margin-bottom:12px}
    }
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
      <div class="ranch-auth-gate-brand">
        <div class="ranch-auth-gate-mark">R</div>
        <div><strong>Ranch Expense Tracker</strong><small>Personal business expense tracking</small></div>
      </div>
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

function signedIn() {
  const actions = q("completeSyncSignedInActions");
  return Boolean(actions && !actions.hidden);
}

function rememberHome(card) {
  if (homeParent) return;
  homeParent = card.parentNode;
  homeNextSibling = card.nextSibling;
}

function returnCardHome(card) {
  if (!homeParent || card.parentNode === homeParent) return;
  if (homeNextSibling && homeNextSibling.parentNode === homeParent) {
    homeParent.insertBefore(card, homeNextSibling);
  } else {
    const heading = q("settings")?.querySelector(".page-heading");
    if (heading && heading.parentNode === homeParent) heading.after(card);
    else homeParent.appendChild(card);
  }
}

function showSignedOutGate(card) {
  const gate = createGate();
  const host = q("ranchAuthGateCardHost");
  const checking = q("ranchAuthChecking");

  document.documentElement.classList.add("ranch-auth-pending");
  document.body.classList.add("ranch-auth-gated");
  gate.hidden = false;

  rememberHome(card);

  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    if (signedIn()) return;
    if (checking) checking.hidden = true;
    if (host && card.parentNode !== host) host.appendChild(card);
    const email = q("completeSyncEmail");
    if (email && !email.value) setTimeout(() => email.focus(), 50);
  }, 550);
}

function showAuthenticatedApp(card) {
  clearTimeout(revealTimer);
  const gate = createGate();
  const checking = q("ranchAuthChecking");
  if (checking) checking.hidden = false;

  returnCardHome(card);
  gate.hidden = true;
  document.body.classList.remove("ranch-auth-gated");
  document.documentElement.classList.remove("ranch-auth-pending");
  document.documentElement.classList.add("ranch-auth-ready");
}

function syncGate() {
  addStyles();
  createGate();

  const card = q("completeSyncCard");
  if (!card || card.dataset.accountPolished !== "true") return false;

  rememberHome(card);
  if (signedIn()) showAuthenticatedApp(card);
  else showSignedOutGate(card);
  return true;
}

// Put the privacy screen up before the existing sign-out handler clears local data.
document.addEventListener("click", event => {
  const button = event.target?.closest?.("#completeSyncSignOut");
  if (!button) return;
  document.documentElement.classList.add("ranch-auth-pending");
  const gate = createGate();
  gate.hidden = false;
  const checking = q("ranchAuthChecking");
  if (checking) {
    checking.hidden = false;
    checking.textContent = "Signing out and clearing this device…";
  }
}, true);

const observer = new MutationObserver(() => {
  const checking = q("ranchAuthChecking");
  if (checking && checking.textContent !== "Checking your account…" && !signedIn()) {
    checking.textContent = "Checking your account…";
  }
  syncGate();
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["hidden", "data-account-polished"]
});

let tries = 0;
const timer = setInterval(() => {
  tries += 1;
  if (syncGate() || tries > 120) clearInterval(timer);
}, 100);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", syncGate, { once: true });
} else {
  syncGate();
}
})();