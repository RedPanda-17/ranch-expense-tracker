(() => {
"use strict";

if (window.__ranchSubmittedHistoryLockV6) return;
window.__ranchSubmittedHistoryLockV6 = true;

function toast(message, type = "error") {
  if (typeof showToast === "function") showToast(message, type);
}

function removeBulkClearHistory() {
  // Compact Settings Test layout.
  const compact = [...document.querySelectorAll("#settings .compact-settings-item")]
    .find(item => String(item.querySelector("summary strong")?.textContent || "").trim() === "Clear expense history");
  if (compact) compact.remove();

  // Original 1.5 settings layout fallback.
  const clearButton = document.querySelector('#settings button[onclick*="clearExpenseHistory"]');
  const section = clearButton?.closest("section");
  if (section) section.remove();
  else clearButton?.remove();
}

function lockPastReportActions() {
  // Employees may download/view submitted history, but may not reopen it themselves.
  document.querySelectorAll('#past button[onclick*="reopenReport"], #pastReports button[onclick*="reopenReport"]').forEach(button => button.remove());

  // Add one quiet explanation to Past Reports rather than repeating it on every report.
  const pastView = document.getElementById("past") || document.getElementById("pastReports");
  const heading = pastView?.querySelector(".page-heading");
  if (heading && !document.getElementById("submittedHistoryLockNote")) {
    const note = document.createElement("div");
    note.id = "submittedHistoryLockNote";
    note.style.cssText = "margin:0 0 16px;padding:12px 14px;border-left:4px solid var(--olive);border-radius:0 12px 12px 0;background:var(--olive-soft);color:#405a33;font-size:.82rem;line-height:1.45";
    note.innerHTML = "<strong>Submitted reports are locked.</strong> They stay available for viewing and downloads. A future returned-report workflow can reopen a report when Accounting sends it back for correction.";
    heading.after(note);
  }
}

function installSafetyBackstops() {
  // These functions exist in the base app. Disable them even if an old/stale UI
  // manages to surface one of the buttons again.
  window.clearExpenseHistory = function() {
    toast("Bulk history deletion is disabled. Delete only an unsubmitted expense if you need to correct a mistake.", "error");
  };

  window.reopenReport = function() {
    toast("Submitted reports are locked. They can only be reopened through a returned-report workflow.", "error");
  };
}

function run() {
  removeBulkClearHistory();
  lockPastReportActions();
  installSafetyBackstops();
}

// Past Reports and Settings are re-rendered frequently, so keep the protections
// attached to the DOM without touching normal expense editing behavior.
let queued = false;
const observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    run();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
else run();
})();
