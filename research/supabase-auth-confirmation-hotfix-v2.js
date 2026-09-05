(() => {
"use strict";

if (window.__ranchAuthConfirmationHotfixV2) return;
window.__ranchAuthConfirmationHotfixV2 = true;

const SUPABASE_URL = "https://rdxzqudawzkqetooubee.supabase.co";
const SUPABASE_KEY = "sb_publishable_is8367xzMm8UckiRkyYAMw_jVy8Eyop";
const AUTH_KEY = "ranch-expense-supabase-complete-sync-v6-auth";
const REDIRECT_URL = "https://redpanda-17.github.io/ranch-expense-tracker/research/supabase-complete-sync-test-6.html";

function q(id) { return document.getElementById(id); }
function msg(text, type = "") {
  const el = q("completeSyncMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "complete-sync-message" + (type ? " " + type : "");
}
function values() {
  return {
    email: String(q("completeSyncEmail")?.value || "").trim(),
    password: q("completeSyncPassword")?.value || ""
  };
}
function ensureResendButton() {
  const actions = q("completeSyncAuthActions");
  if (!actions || q("completeSyncResend")) return q("completeSyncResend");
  const button = document.createElement("button");
  button.id = "completeSyncResend";
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Resend confirmation";
  button.hidden = true;
  actions.appendChild(button);
  return button;
}
function showResend(show = true) {
  const button = ensureResendButton();
  if (button) button.hidden = !show;
}

async function init() {
  for (let i = 0; i < 100; i++) {
    if (q("completeSyncCreate") && q("completeSyncSignIn")) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const createBtn = q("completeSyncCreate");
  const signInBtn = q("completeSyncSignIn");
  const resendBtn = ensureResendButton();
  if (!createBtn || !signInBtn) throw new Error("Account controls did not finish loading.");

  // IMPORTANT: Do not replace the Sign in handler. The main sync bridge owns
  // password sign-in so it can update the authenticated user and unlock the
  // app in-place. The old hotfix forced location.reload(), which could collide
  // with the privacy gate and leave mobile browsers on a blank screen.

  const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const client = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_KEY
    }
  });

  createBtn.onclick = async () => {
    const { email, password } = values();
    if (!email || password.length < 6) {
      msg("Enter an email and a password with at least 6 characters.", "warn");
      return;
    }

    createBtn.disabled = true;
    msg("Creating account…");
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: REDIRECT_URL }
      });
      if (error) throw error;

      if (data.session) {
        msg("Account created and signed in. Finishing account setup…", "ok");
        // No reload. Supabase clients sharing this storage key broadcast the
        // auth change; the main bridge will update the gate and sync state.
      } else {
        msg("Account created. Check your email and confirm the account before signing in. If the first link fails, use Resend confirmation below.", "warn");
        showResend(true);
      }
    } catch (error) {
      msg(error.message || String(error), "bad");
    } finally {
      createBtn.disabled = false;
    }
  };

  if (resendBtn) {
    resendBtn.onclick = async () => {
      const { email } = values();
      if (!email) {
        msg("Enter the email address for the account first.", "warn");
        return;
      }

      resendBtn.disabled = true;
      msg("Sending a new confirmation email…");
      try {
        const { error } = await client.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: REDIRECT_URL }
        });
        if (error) throw error;
        msg("A new confirmation email was sent. Use the newest email only, then return here and sign in.", "ok");
      } catch (error) {
        msg(error.message || String(error), "bad");
      } finally {
        resendBtn.disabled = false;
      }
    };
  }
}

init().catch(error => msg("Auth setup issue: " + (error.message || String(error)), "bad"));
})();