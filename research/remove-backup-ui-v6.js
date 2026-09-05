(() => {
"use strict";

if (window.__ranchRemoveBackupUiV6V2) return;
window.__ranchRemoveBackupUiV6V2 = true;

function q(id) { return document.getElementById(id); }
function textOf(el) { return String(el?.textContent || "").trim(); }

function findDataSection() {
  return [...document.querySelectorAll("#settings .compact-settings-item")]
    .find(item => {
      const title = textOf(item.querySelector("summary strong"));
      return ["Data & backups", "Data, backups & support", "Data & support"].includes(title);
    }) || null;
}

// IMPORTANT: The Version 1.5 base app still references several backup DOM
// elements during render/startup. Do not remove those elements here. Keep the
// legacy hooks in the DOM and hide the employee-facing backup workflow instead.
try {
  if (typeof renderBackupReminder === "function") {
    renderBackupReminder = function() {
      const reminder = q("backupReminder");
      if (reminder) reminder.hidden = true;
    };
  }
} catch {}

function polishDataSupport() {
  const reminder = q("backupReminder");
  if (reminder) reminder.hidden = true;

  const section = findDataSection();
  if (!section) return false;

  const summaryStrong = section.querySelector("summary strong");
  const summarySmall = section.querySelector("summary small");
  if (summaryStrong && summaryStrong.textContent !== "Data & support") summaryStrong.textContent = "Data & support";
  if (summarySmall && summarySmall.textContent !== "Data export, cloud sync information, and help") {
    summarySmall.textContent = "Data export, cloud sync information, and help";
  }

  const body = section.querySelector(".compact-settings-body") || section;
  const dataCard = body.querySelector(".data-card") || body.querySelector(".card") || body;

  const eyebrow = dataCard.querySelector(".eyebrow");
  const heading = dataCard.querySelector("h2");
  if (eyebrow && eyebrow.textContent !== "Data & support") eyebrow.textContent = "Data & support";
  if (heading && /protect|move|backup/i.test(heading.textContent || "") && heading.textContent !== "Your data and support") {
    heading.textContent = "Your data and support";
  }

  // Preserve the original nodes for compatibility; CSS below hides them.
  const privacy = dataCard.querySelector(".privacy-note");
  const cloudCopy = "<strong>Cloud sync:</strong> your signed-in account automatically keeps expenses, receipts, reports, and saved defaults synchronized across your devices.";
  if (privacy && privacy.innerHTML !== cloudCopy) privacy.innerHTML = cloudCopy;

  section.dataset.backupUiRemoved = "true";
  return true;
}

const style = document.createElement("style");
style.id = "removeBackupUiV6StylesV2";
style.textContent = `
  #backupReminder{display:none!important}
  #backupStatus{display:none!important}
  #backupImportInput{display:none!important}
  #consolidatedPreferences{display:none!important}
  #settings #backupReminderDays{display:none!important}
  #settings #backupReminderDays.closest{display:none!important}
  #settings button[onclick*="exportBackup"]{display:none!important}
  #settings button[onclick*="backupImportInput"]{display:none!important}
  #settings button[onclick*="shareBackup"]{display:none!important}
`;
document.head.appendChild(style);

// Hide the wrapper field for the old reminder selector without deleting it.
function hideLegacyWrappers() {
  const reminderSelect = q("backupReminderDays");
  const reminderField = reminderSelect?.closest(".field");
  if (reminderField) reminderField.style.display = "none";

  const prefs = q("consolidatedPreferences");
  if (prefs) prefs.style.display = "none";

  // Hide backup-specific buttons in-place. Do not remove them, because older
  // event/setup code can retain references to these controls.
  const section = findDataSection();
  const card = section?.querySelector(".data-card") || section?.querySelector(".compact-settings-body");
  if (card) {
    [...card.querySelectorAll("button")].forEach(button => {
      const onclick = String(button.getAttribute("onclick") || "");
      const label = textOf(button).toLowerCase();
      const backupOnly =
        onclick.includes("exportBackup") ||
        onclick.includes("backupImportInput") ||
        onclick.includes("shareBackup") ||
        label === "download backup" ||
        label === "import backup" ||
        label === "save backup preference";
      if (backupOnly) button.style.display = "none";
    });
  }
}

function run() {
  polishDataSupport();
  hideLegacyWrappers();
}

const observer = new MutationObserver(() => run());
observer.observe(document.documentElement, { childList: true, subtree: true });

let tries = 0;
const timer = setInterval(() => {
  tries += 1;
  run();
  if ((findDataSection()?.dataset.backupUiRemoved === "true") || tries > 100) clearInterval(timer);
}, 120);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
else run();
})();