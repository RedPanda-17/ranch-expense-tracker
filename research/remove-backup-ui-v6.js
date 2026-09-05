(() => {
"use strict";

if (window.__ranchRemoveBackupUiV6) return;
window.__ranchRemoveBackupUiV6 = true;

function q(id) { return document.getElementById(id); }
function textOf(el) { return String(el?.textContent || "").trim(); }

function findDataSection() {
  return [...document.querySelectorAll("#settings .compact-settings-item")]
    .find(item => {
      const title = textOf(item.querySelector("summary strong"));
      return ["Data & backups", "Data, backups & support", "Data & support"].includes(title);
    }) || null;
}

// Cloud account sync replaces the old employee-facing manual backup reminder.
try {
  if (typeof renderBackupReminder === "function") {
    renderBackupReminder = function() {
      const reminder = q("backupReminder");
      if (reminder) reminder.hidden = true;
    };
  }
} catch {}

function removeBackupUi() {
  const reminder = q("backupReminder");
  if (reminder) reminder.hidden = true;

  const section = findDataSection();
  if (!section) return false;

  const summaryStrong = section.querySelector("summary strong");
  const summarySmall = section.querySelector("summary small");
  if (summaryStrong) summaryStrong.textContent = "Data & support";
  if (summarySmall) summarySmall.textContent = "Data export, cloud sync information, and help";

  const body = section.querySelector(".compact-settings-body") || section;
  const dataCard = body.querySelector(".data-card") || body.querySelector(".card") || body;

  const eyebrow = dataCard.querySelector(".eyebrow");
  const heading = dataCard.querySelector("h2");
  if (eyebrow) eyebrow.textContent = "Data & support";
  if (heading && /protect|move|backup/i.test(heading.textContent || "")) heading.textContent = "Your data and support";

  q("backupStatus")?.remove();
  q("backupImportInput")?.remove();
  q("consolidatedPreferences")?.remove();

  // Remove only backup-specific actions. Full-history CSV remains a data export.
  [...dataCard.querySelectorAll("button")].forEach(button => {
    const onclick = String(button.getAttribute("onclick") || "");
    const label = textOf(button).toLowerCase();
    if (
      onclick.includes("exportBackup") ||
      onclick.includes("backupImportInput") ||
      label === "download backup" ||
      label === "import backup" ||
      label === "save backup preference"
    ) button.remove();
  });

  const actionGrid = dataCard.querySelector(".data-action-grid");
  if (actionGrid) {
    actionGrid.style.gridTemplateColumns = "minmax(0, 1fr)";
    const remaining = [...actionGrid.children].filter(el => el.tagName === "BUTTON");
    if (!remaining.length) actionGrid.remove();
  }

  const privacy = dataCard.querySelector(".privacy-note");
  if (privacy) {
    privacy.innerHTML = "<strong>Cloud sync:</strong> your signed-in account automatically keeps expenses, receipts, reports, and saved defaults synchronized across your devices.";
  }

  // Remove any leftover backup reminder field that may have been moved by an earlier patch.
  q("backupReminderDays")?.closest(".field")?.remove();

  section.dataset.backupUiRemoved = "true";
  return true;
}

const style = document.createElement("style");
style.id = "removeBackupUiV6Styles";
style.textContent = "#backupReminder{display:none!important}";
document.head.appendChild(style);

const observer = new MutationObserver(() => removeBackupUi());
observer.observe(document.documentElement, { childList: true, subtree: true });

let tries = 0;
const timer = setInterval(() => {
  tries += 1;
  if (removeBackupUi() || tries > 100) clearInterval(timer);
}, 120);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", removeBackupUi, { once: true });
else removeBackupUi();
})();