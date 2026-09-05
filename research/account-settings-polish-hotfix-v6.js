(() => {
"use strict";

if (window.__ranchAccountSettingsPolishV6) return;
window.__ranchAccountSettingsPolishV6 = true;

const SUPPORT_CONTACT = "Saul Garcia";

function q(id) { return document.getElementById(id); }
function textOf(el) { return String(el?.textContent || "").trim(); }

function findCompactSection(title) {
  return [...document.querySelectorAll("#settings .compact-settings-item")]
    .find(item => textOf(item.querySelector("summary strong")) === title) || null;
}

function saveAccountInfo(showToastMessage = true) {
  const name = String(q("employeeName")?.value || "").trim();
  const department = String(q("defaultDepartment")?.value || "").trim();

  if (!name) {
    if (typeof showToast === "function") showToast("Add your name first.", "error");
    q("employeeName")?.focus();
    return false;
  }

  settings.employeeName = name;
  settings.defaultDepartment = department;
  settings.mileageRate = typeof FIXED_MILEAGE_RATE !== "undefined" ? FIXED_MILEAGE_RATE : settings.mileageRate;
  if (!reportDraft.department && department) reportDraft.department = department;
  saveAll();
  renderAll();

  if (showToastMessage && typeof showToast === "function") {
    showToast("Account information saved.", "success");
  }
  return true;
}

function polishAccountCard() {
  const card = q("completeSyncCard");
  if (!card || card.dataset.accountPolished === "true") return false;

  const nameInput = q("employeeName");
  const departmentInput = q("defaultDepartment");
  if (!nameInput || !departmentInput) return false;

  card.dataset.accountPolished = "true";

  const eyebrow = card.querySelector(".eyebrow");
  const heading = card.querySelector("h2");
  const intro = card.querySelector(".complete-sync-head p");
  if (eyebrow) eyebrow.textContent = "Account";
  if (heading) heading.textContent = "Your account";
  if (intro) intro.textContent = "Sign in to sync your records across devices. Your name and department belong to this account.";

  const profileCard = nameInput.closest(".card");
  const profileGrid = nameInput.closest(".form-grid");
  const mileageCard = profileCard?.querySelector(".fixed-rate-card") || null;

  const info = document.createElement("div");
  info.id = "accountProfileInfo";
  info.style.marginTop = "14px";
  info.innerHTML = `
    <div style="font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);margin-bottom:8px">Your information</div>
    <p style="margin:0 0 10px;color:var(--muted);font-size:.8rem;line-height:1.45">New account? Add your name before creating it. Existing account? Sign in and your saved information loads automatically.</p>`;

  if (profileGrid) info.appendChild(profileGrid);

  const saveButton = document.createElement("button");
  saveButton.id = "saveAccountInfoButton";
  saveButton.className = "secondary";
  saveButton.type = "button";
  saveButton.textContent = "Save account info";
  saveButton.style.marginTop = "10px";
  saveButton.addEventListener("click", () => saveAccountInfo(true));
  info.appendChild(saveButton);

  const authFields = q("completeSyncAuthFields");
  if (authFields) authFields.after(info);
  else card.appendChild(info);

  const signOut = q("completeSyncSignOut");
  if (signOut) signOut.textContent = "Sign out";

  const create = q("completeSyncCreate");
  if (create && !create.dataset.accountWrapped) {
    create.dataset.accountWrapped = "true";
    create.textContent = "Create account";
    const originalCreate = create.onclick;
    create.onclick = async function(event) {
      if (!saveAccountInfo(false)) return;
      if (typeof originalCreate === "function") return originalCreate.call(this, event);
    };
  }

  if (profileCard) profileCard.remove();

  const aboutSection = findCompactSection("About this app");
  const aboutBody = aboutSection?.querySelector(".compact-settings-body");
  if (mileageCard && aboutBody) {
    mileageCard.style.marginTop = "12px";
    aboutBody.appendChild(mileageCard);
  }

  return true;
}

function polishDataSupport() {
  const dataSection = findCompactSection("Data & backups");
  const prefsSection = findCompactSection("Preferences & support");
  if (!dataSection || dataSection.dataset.supportPolished === "true") return false;

  const dataCard = dataSection.querySelector(".data-card") || dataSection.querySelector(".compact-settings-body > .card") || dataSection.querySelector(".compact-settings-body");
  if (!dataCard) return false;

  dataSection.dataset.supportPolished = "true";

  const summaryStrong = dataSection.querySelector("summary strong");
  const summarySmall = dataSection.querySelector("summary small");
  if (summaryStrong) summaryStrong.textContent = "Data, backups & support";
  if (summarySmall) summarySmall.textContent = "Backups, import/export, reminders, and help";

  const cardEyebrow = dataCard.querySelector(".eyebrow");
  if (cardEyebrow) cardEyebrow.textContent = "Data, backups & support";

  const feedbackInput = q("feedbackEmail");
  const feedbackField = feedbackInput?.closest(".field") || null;
  feedbackField?.remove();

  const reminderSelect = q("backupReminderDays");
  const reminderField = reminderSelect?.closest(".field") || null;

  const preferencesBlock = document.createElement("div");
  preferencesBlock.id = "consolidatedPreferences";
  preferencesBlock.style.cssText = "margin-top:16px;padding-top:14px;border-top:1px solid var(--border);";
  preferencesBlock.innerHTML = '<div style="font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);margin-bottom:10px">Backup preference</div>';
  if (reminderField) preferencesBlock.appendChild(reminderField);

  const savePref = document.createElement("button");
  savePref.className = "secondary small-button";
  savePref.type = "button";
  savePref.textContent = "Save backup preference";
  savePref.style.marginTop = "10px";
  savePref.addEventListener("click", () => {
    settings.backupReminderDays = Number(q("backupReminderDays")?.value || 7);
    saveAll();
    renderAll();
    if (typeof showToast === "function") showToast("Backup preference saved.", "success");
  });
  preferencesBlock.appendChild(savePref);

  const supportPanel = document.createElement("div");
  supportPanel.id = "supportContactPanel";
  supportPanel.style.cssText = "margin-top:14px;padding:13px 14px;border:1px solid var(--border);border-radius:12px;background:var(--panel-alt);";
  supportPanel.innerHTML = `
    <div style="font-size:.76rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Support contact</div>
    <strong style="display:block;margin-top:4px">${SUPPORT_CONTACT}</strong>
    <small style="display:block;margin-top:3px;color:var(--muted)">Questions, feedback, or app issues should be directed here.</small>`;

  dataCard.appendChild(preferencesBlock);
  dataCard.appendChild(supportPanel);

  if (prefsSection) prefsSection.remove();

  return true;
}

function updateSignedInPresentation() {
  const signedInActions = q("completeSyncSignedInActions");
  if (!signedInActions) return;

  const signedIn = !signedInActions.hidden;
  const saveButton = q("saveAccountInfoButton");
  const helper = q("accountProfileInfo")?.querySelector("p");
  const desiredHelper = signedIn
    ? "Your name and department are tied to this cloud account. Update them here anytime."
    : "New account? Add your name before creating it. Existing account? Sign in and your saved information loads automatically.";

  if (saveButton && saveButton.hidden !== !signedIn) saveButton.hidden = !signedIn;
  if (helper && helper.textContent !== desiredHelper) helper.textContent = desiredHelper;
}

function run() {
  polishAccountCard();
  polishDataSupport();
  updateSignedInPresentation();
}

const observer = new MutationObserver(() => run());
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

let tries = 0;
const timer = setInterval(() => {
  tries += 1;
  run();
  if ((q("completeSyncCard")?.dataset.accountPolished === "true" && findCompactSection("Data, backups & support")) || tries > 100) {
    clearInterval(timer);
  }
}, 120);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run, { once: true });
} else {
  run();
}
})();