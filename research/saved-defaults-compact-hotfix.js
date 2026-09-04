(() => {
  "use strict";

  if (window.__savedDefaultsCompactHotfix) return;
  window.__savedDefaultsCompactHotfix = true;

  function applyFix() {
    const settingsView = document.getElementById("settings");
    if (!settingsView) return false;

    const savedDefaults = settingsView.querySelector(".compact-settings-body .settings-details") || settingsView.querySelector(".settings-details");
    if (!savedDefaults) return false;

    // Compact Settings wraps the original Saved Defaults <details> inside a new
    // outer accordion and hides the original summary. Keep that inner details
    // permanently open so the editable fields are visible whenever the outer
    // Saved Defaults section is expanded.
    savedDefaults.open = true;
    savedDefaults.setAttribute("open", "");
    return true;
  }

  if (!applyFix()) {
    const observer = new MutationObserver(() => {
      if (applyFix()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  }
})();
