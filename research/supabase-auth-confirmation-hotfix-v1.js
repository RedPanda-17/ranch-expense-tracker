(() => {
"use strict";

if (window.__ranchAuthConfirmationHotfixV1) return;
window.__ranchAuthConfirmationHotfixV1 = true;

const SUPABASE_URL = "https://rdxzqudawzkqetooubee.supabase.co";
const SUPABASE_KEY = "sb_publishable_is8367xzMm8UckiRkyYAMw_jVy8Eyop";
const AUTH_KEY = "ranch-expense-supabase-complete-sync-v6-auth";
const REDIRECT_URL = "https://redpanda-17.github.io/ranch-expense-tracker/research/supabase-complete-sync-test-6.html";

function msg(text, type = "") {
  const el = document.getElementById("completeSyncMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "complete-sync-message" + (type ? " " + type : "");
}

function values() {
  return {
    email: String(document.getElementById("completeSyncEmail")?.value || "").trim(),
    password: document.getElementById("completeSyncPassword")?.value || ""
  };
}

function ensureResendButton() {
  const actions = document.getElementById("completeSyncAuthActions");
  if (!actions || document.getElementById("completeSyncResend")) return;
  const button = document.createElement("button");
  button.id = "completeSyncResend";
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Resend confirmation";
  button.hidden = true;
  actions.appendChild(button);
}

function showResend(show = true) {
  ensureResendButton();
  const button = document.getElementById("completeSyncResend");
  if (button) button.hidden = !show;
}

async function init() {
  for (let i = 0; i < 100; i++) {
    if (document.getElementById("completeSyncCreate") && document.getElementById("completeSyncSignIn")) break;
    await new Promise(r => setTimeout(r, 100));
  }

  ensureResendButton();

  const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const client = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_KEY
    }
  });

  const createBtn = document.getElementById("completeSyncCreate");
  const signInBtn = document.getElementById("completeSyncSignIn");
  const resendBtn = document.getElementById("completeSyncResend");

  if (createBtn) {
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
          msg("Account created and signed in. Loading your cloud data…", "ok");
          setTimeout(() => location.reload(), 500);
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
  }

  if (signInBtn) {
    signInBtn.onclick = async () => {
      const { email, password } = values();
      if (!email || !password) {
        msg("Enter your email and password.", "warn");
        return;
      }

      signInBtn.disabled = true;
      msg("Signing in…");
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message || "")) {
            msg("This account exists, but the email has not been confirmed yet. Check your inbox or use Resend confirmation below.", "warn");
            showResend(true);
            return;
          }
          throw error;
        }

        msg("Signed in. Loading your cloud data…", "ok");
        setTimeout(() => location.reload(), 500);
      } catch (error) {
        msg(error.message || String(error), "bad");
      } finally {
        signInBtn.disabled = false;
      }
    };
  }

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