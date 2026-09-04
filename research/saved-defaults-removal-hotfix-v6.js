(() => {
"use strict";

if (window.__savedDefaultsRemovalHotfixV6) return;
window.__savedDefaultsRemovalHotfixV6 = true;

const TOMBSTONE_KEY = "_deletedSavedDefaults";
const LIST_KEYS = ["savedPeople", "savedOrganizations", "savedLocations", "savedVehicles", "savedTags"];

const clean = value => String(value || "").trim();
const unique = values => [...new Set((values || []).map(clean).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
const routeKey = route => String(route?.id || `${route?.start || ""}|${route?.destination || ""}|${route?.miles || ""}`);

function normalizeTombstones(value) {
  const raw = value && typeof value === "object" ? value : {};
  const out = {};
  for (const key of LIST_KEYS) out[key] = unique(raw[key]);
  out.savedRoutes = unique(raw.savedRoutes);
  return out;
}

function snapshot(value) {
  const s = value || {};
  const result = {};
  for (const key of LIST_KEYS) result[key] = unique(s[key]);
  result.savedRoutes = (Array.isArray(s.savedRoutes) ? s.savedRoutes : []).map(routeKey).filter(Boolean);
  return result;
}

function applyTombstones(settingsValue) {
  const tombstones = normalizeTombstones(settingsValue?.[TOMBSTONE_KEY]);
  for (const key of LIST_KEYS) {
    const deleted = new Set(tombstones[key]);
    settingsValue[key] = unique(settingsValue[key]).filter(value => !deleted.has(value));
  }
  const deletedRoutes = new Set(tombstones.savedRoutes);
  settingsValue.savedRoutes = (Array.isArray(settingsValue.savedRoutes) ? settingsValue.savedRoutes : [])
    .filter(route => !deletedRoutes.has(routeKey(route)));
  settingsValue[TOMBSTONE_KEY] = tombstones;
  return settingsValue;
}

function installNormalizePatch() {
  if (window.__savedDefaultsNormalizePatched || typeof normalizeSettings !== "function") return false;
  window.__savedDefaultsNormalizePatched = true;
  const originalNormalizeSettings = normalizeSettings;

  normalizeSettings = function(value = {}) {
    const normalized = originalNormalizeSettings(value);
    normalized[TOMBSTONE_KEY] = normalizeTombstones(value?.[TOMBSTONE_KEY]);
    return applyTombstones(normalized);
  };

  settings = normalizeSettings(settings || {});
  return true;
}

function installSavePatch() {
  if (window.__savedDefaultsSavePatched || typeof saveAll !== "function" || typeof settings === "undefined") return false;
  window.__savedDefaultsSavePatched = true;

  let previous = snapshot(settings);
  let internalSave = false;
  const originalSaveAll = saveAll;

  saveAll = function(...args) {
    const result = originalSaveAll.apply(this, args);

    if (internalSave) {
      previous = snapshot(settings);
      return result;
    }

    const current = snapshot(settings);
    const tombstones = normalizeTombstones(settings?.[TOMBSTONE_KEY]);
    let changed = false;

    for (const key of LIST_KEYS) {
      const before = new Set(previous[key] || []);
      const after = new Set(current[key] || []);
      const deleted = new Set(tombstones[key]);

      for (const value of before) {
        if (!after.has(value) && !deleted.has(value)) {
          deleted.add(value);
          changed = true;
        }
      }
      for (const value of after) {
        if (deleted.delete(value)) changed = true;
      }
      tombstones[key] = [...deleted].sort((a,b)=>a.localeCompare(b));
    }

    const beforeRoutes = new Set(previous.savedRoutes || []);
    const afterRoutes = new Set(current.savedRoutes || []);
    const deletedRoutes = new Set(tombstones.savedRoutes || []);

    for (const key of beforeRoutes) {
      if (!afterRoutes.has(key) && !deletedRoutes.has(key)) {
        deletedRoutes.add(key);
        changed = true;
      }
    }
    for (const key of afterRoutes) {
      if (deletedRoutes.delete(key)) changed = true;
    }
    tombstones.savedRoutes = [...deletedRoutes].sort((a,b)=>a.localeCompare(b));

    settings[TOMBSTONE_KEY] = tombstones;
    applyTombstones(settings);
    previous = snapshot(settings);

    if (changed) {
      internalSave = true;
      try { originalSaveAll.apply(this, args); }
      finally { internalSave = false; }
    }

    return result;
  };

  return true;
}

function init() {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    installNormalizePatch();
    installSavePatch();
    if ((window.__savedDefaultsNormalizePatched && window.__savedDefaultsSavePatched) || attempts > 100) {
      clearInterval(timer);
      if (window.__savedDefaultsNormalizePatched && typeof renderSettings === "function") {
        try { renderSettings(); } catch {}
      }
    }
  }, 50);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
})();
