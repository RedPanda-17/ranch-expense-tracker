(() => {
  "use strict";

  if (window.__ranchMileageEfficiencyHotfix) return;
  window.__ranchMileageEfficiencyHotfix = true;

  const removedMessages = new Set([
    "Choose one way or round trip.",
    "One-way or round-trip selection is missing."
  ]);

  if (typeof minimalExpenseValidation === "function") {
    const originalMinimalExpenseValidation = minimalExpenseValidation;
    minimalExpenseValidation = function(candidate) {
      const errors = originalMinimalExpenseValidation(candidate);
      return Array.isArray(errors)
        ? errors.filter(message => !removedMessages.has(String(message || "").trim()))
        : errors;
    };
  }
})();
