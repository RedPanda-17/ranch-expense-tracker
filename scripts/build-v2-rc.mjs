import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'v2-rc');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const must = (value, message) => { if (!value) throw new Error(message); };

let html = read('index.html');

function replaceRequired(before, after, label) {
  must(html.includes(before), `Missing build marker: ${label}`);
  html = html.replace(before, after);
}
function replaceRequiredRe(re, after, label) {
  must(re.test(html), `Missing build pattern: ${label}`);
  html = html.replace(re, after);
}

// ---------------------------------------------------------------------------
// Version + V2 offline cache namespace. Legacy V1 keys are read only by the
// one-time migration module appended below.
// ---------------------------------------------------------------------------
html = html.replaceAll('Version 1.5.0', 'Version 2.0.0 RC');
html = html.replaceAll('PDF Accounting Review Update', 'Cloud Sync Release Candidate');
replaceRequired('const APP_VERSION = "1.5.0";', 'const APP_VERSION = "2.0.0";', 'app version');
replaceRequired('const RELEASE_NAME = "PDF Accounting Review Update";', 'const RELEASE_NAME = "Cloud Sync";', 'release name');
replaceRequired('const EXPENSE_KEY = "workExpenseTool.expenses.v1";', 'const EXPENSE_KEY = "workExpenseTool.expenses.v2";', 'expense cache key');
replaceRequired('const REPORT_KEY = "workExpenseTool.reports.v1";', 'const REPORT_KEY = "workExpenseTool.reports.v2";', 'report cache key');
replaceRequired('const SETTINGS_KEY = "workExpenseTool.settings.v1";', 'const SETTINGS_KEY = "workExpenseTool.settings.v2";', 'settings cache key');
replaceRequired('const REPORT_DRAFT_KEY = "workExpenseTool.reportDraft.v1";', 'const REPORT_DRAFT_KEY = "workExpenseTool.reportDraft.v2";', 'draft cache key');
replaceRequired('const DB_NAME = "workExpenseReceiptDB";', 'const DB_NAME = "workExpenseReceiptDB_v2";', 'receipt cache DB');
html = html.replace('href="icon-192.png"', 'href="../icon-192.png"');

// ---------------------------------------------------------------------------
// Approved expense-entry efficiency changes.
// ---------------------------------------------------------------------------
replaceRequired(
  'return category === "Education" || category === "Supplies" || category === "Other" || isOtherSubcategory(subcategory);',
  'return category === "Education" || category === "Other" || isOtherSubcategory(subcategory);',
  'description requirement'
);
replaceRequired(
  'Required for Education, Supplies, Other, and any subcategory beginning with Other.',
  'Required for Education, Other, and broad Other subcategories.',
  'description helper'
);
html = html.replaceAll('Expense descriptions are required for Education, Supplies, Other, and broad Other subcategories.', 'Expense descriptions are required for Education, Other, and broad Other subcategories.');

replaceRequired('      ${select("detailRoundTrip", "Trip type", ["Round trip", "One way"], details.roundTrip || "Round trip", true)}\n', '', 'mileage trip type UI');
replaceRequired('["detailMiles", "detailStartLocation", "detailDestination", "detailRoundTrip"].forEach(id => document.getElementById(id)?.addEventListener("input", () => { updateMileagePreview(); updateExpenseSubmitButton(); }));', '["detailMiles", "detailStartLocation", "detailDestination"].forEach(id => document.getElementById(id)?.addEventListener("input", () => { updateMileagePreview(); updateExpenseSubmitButton(); }));', 'mileage listeners');
replaceRequired('  document.getElementById("detailRoundTrip").value = route.tripType;\n', '', 'apply route trip type');
replaceRequired('    details.roundTrip = readField("detailRoundTrip");\n', '', 'collect trip type');
replaceRequired('    if (!candidate.details.roundTrip) errors.push("Choose one way or round trip.");\n', '', 'minimal trip validation');
replaceRequired('    missing(!details.roundTrip, "One-way or round-trip selection is missing.");\n', '', 'report trip validation');
replaceRequired('    if (details.roundTrip) pieces.push(details.roundTrip);\n', '', 'trip detail text');

replaceRequired('      <div class="field"><label for="routeTripType">Trip type</label><select id="routeTripType"><option>Round trip</option><option>One way</option></select></div>\n', '', 'saved route trip type field');
replaceRequired('    tripType: readField("routeTripType") || "Round trip"\n', '', 'saved route trip type object');
replaceRequired('<small>${route.miles} miles · ${safe(route.tripType)} · ${money(route.miles * FIXED_MILEAGE_RATE)}</small>', '<small>${route.miles} miles · ${money(route.miles * FIXED_MILEAGE_RATE)}</small>', 'saved route rendering');
replaceRequired('<option value="${safe(route.id)}" ${selectedRoute?.id === route.id ? "selected" : ""}>${safe(route.start)} → ${safe(route.destination)} · ${route.miles} miles · ${safe(route.tripType)}</option>', '<option value="${safe(route.id)}" ${selectedRoute?.id === route.id ? "selected" : ""}>${safe(route.start)} → ${safe(route.destination)} · ${route.miles} miles</option>', 'saved route picker');

replaceRequiredRe(/  if \(category === "Auto"\) \{[\s\S]*?  \} else if \(category === "Education"\) \{/, `  if (category === "Auto") {\n    if (["Oil change", "Tires", "Car wash", "Vehicle maintenance"].includes(subcategory)) {\n      fields = \`\${input("detailVehicle", "Vehicle", details.vehicle, { optional: true, list: "savedVehiclesList" })}\`;\n    } else {\n      fields = "";\n    }\n  } else if (category === "Education") {`, 'Auto followups');
replaceRequiredRe(/  \} else if \(category === "Education"\) \{[\s\S]*?  \} else if \(category === "Meals & Snacks"\) \{/, `  } else if (category === "Education") {\n    fields = "";\n  } else if (category === "Meals & Snacks") {`, 'Education followups');
replaceRequiredRe(/  \} else if \(category === "Meals & Snacks"\) \{[\s\S]*?  \} else if \(category === "Meetings \(PR Employees\)"\) \{/, `  } else if (category === "Meals & Snacks") {\n    if (subcategory === "Meeting meal") {\n      fields = \`\${input("detailAttendees", "Attendees", details.attendees, { optional: true, list: "savedPeopleList" })}\`;\n    } else if (["Vendor meal", "Franchisee meal"].includes(subcategory)) {\n      fields = \`\${input("detailOrganization", "Vendor, franchise, or organization", details.organization, { optional: true, list: "savedOrganizationsList" })}\`;\n    } else {\n      fields = "";\n    }\n  } else if (category === "Meetings (PR Employees)") {`, 'Meals followups');
replaceRequiredRe(/  \} else if \(category === "Meetings \(PR Employees\)"\) \{[\s\S]*?  \} else if \(category === "Supplies"\) \{/, `  } else if (category === "Meetings (PR Employees)") {\n    fields = \`\${input("detailAttendees", "PR employee names", details.attendees, { optional: true, list: "savedPeopleList" })}\`;\n  } else if (category === "Supplies") {`, 'Meeting followups');
replaceRequiredRe(/  \} else if \(category === "Supplies"\) \{[\s\S]*?  \} else if \(category === "Travel"\) \{/, `  } else if (category === "Supplies") {\n    fields = "";\n  } else if (category === "Travel") {`, 'Supplies followups');
replaceRequiredRe(/  \} else if \(category === "Travel"\) \{[\s\S]*?  \}\n\n  container\.innerHTML = fields/, `  } else if (category === "Travel") {\n    fields = "";\n  }\n\n  container.innerHTML = fields`, 'Travel followups');

replaceRequired('    showView("current");\n  } catch (error) {', '    showView("add");\n  } catch (error) {', 'post-save Add Expense destination');

// ---------------------------------------------------------------------------
// Clean V2 settings. The cloud account card is static in the source; it moves
// into the account gate while signed out and back into Settings while signed in.
// ---------------------------------------------------------------------------
const settingsStart = html.indexOf('    <section id="settings" class="view">');
const mainEnd = html.indexOf('  </main>', settingsStart);
must(settingsStart >= 0 && mainEnd > settingsStart, 'Could not locate Settings view');
const settingsHtml = `    <section id="settings" class="view compact-settings">
      <div class="page-heading">
        <div>
          <div class="eyebrow">Account & preferences</div>
          <h2>Settings</h2>
          <p>Manage your account, saved defaults, data exports, and app information.</p>
        </div>
      </div>

      <section id="completeSyncCard" class="complete-sync-card" data-account-polished="true">
        <div class="complete-sync-head">
          <div>
            <div class="eyebrow">Account</div>
            <h2>Your account</h2>
            <p>Your expenses, receipts, reports, and saved defaults stay tied to this account and sync across your devices.</p>
          </div>
          <div id="completeSyncIdentity" class="complete-sync-identity">Not signed in</div>
        </div>
        <div id="completeSyncAuthFields" class="complete-sync-grid">
          <div class="field"><label for="completeSyncEmail">Email</label><input id="completeSyncEmail" type="email" autocomplete="email"></div>
          <div class="field"><label for="completeSyncPassword">Password</label><input id="completeSyncPassword" type="password" autocomplete="current-password"></div>
        </div>
        <div id="accountProfileInfo" class="account-profile-info">
          <div class="account-profile-label">Your information</div>
          <p>New account? Add your name before creating it. Existing account? Sign in and your saved information loads automatically.</p>
          <div class="form-grid">
            <div class="field"><label class="required" for="employeeName">Your name</label><input id="employeeName" type="text" placeholder="Your name"></div>
            <div class="field"><label for="defaultDepartment">Department</label><input id="defaultDepartment" type="text" placeholder="Department"></div>
          </div>
          <button id="saveAccountInfoButton" class="secondary" type="button" hidden>Save account info</button>
        </div>
        <div id="completeSyncAuthActions" class="complete-sync-actions">
          <button id="completeSyncSignIn" class="primary" type="button">Sign in</button>
          <button id="completeSyncCreate" class="secondary" type="button">Create account</button>
          <button id="completeSyncResend" class="secondary" type="button" hidden>Resend confirmation</button>
        </div>
        <div id="completeSyncSignedInActions" class="complete-sync-actions" hidden>
          <button id="completeSyncNow" class="secondary" type="button">Sync now</button>
          <button id="completeSyncSignOut" class="secondary" type="button">Sign out</button>
        </div>
        <div id="completeSyncMessage" class="complete-sync-message"></div>
      </section>

      <div class="compact-settings-stack">
        <details class="card compact-settings-item">
          <summary><div class="compact-settings-summary-copy"><strong>Saved defaults</strong><small>People, merchants, locations, vehicles, tags, and mileage routes</small></div><span class="compact-settings-chevron">+</span></summary>
          <div class="compact-settings-body">
            <div class="reference-grid">
              <div class="field"><label for="savedPeopleText">People</label><textarea id="savedPeopleText" placeholder="One name per line"></textarea></div>
              <div class="field"><label for="savedOrganizationsText">Organizations and merchants</label><textarea id="savedOrganizationsText" placeholder="One organization per line"></textarea></div>
              <div class="field"><label for="savedLocationsText">Locations</label><textarea id="savedLocationsText" placeholder="One location per line"></textarea></div>
              <div class="field"><label for="savedVehiclesText">Vehicles</label><textarea id="savedVehiclesText" placeholder="One vehicle per line"></textarea></div>
            </div>
            <div class="button-row"><button class="primary" type="button" onclick="saveReferenceLists()">Save defaults</button></div>
            <div class="subsection">
              <h3>Saved mileage routes</h3>
              <div class="form-grid">
                <div class="field"><label for="routeStart">Starting location</label><div class="saved-picker" data-saved-picker data-kind="locations" data-input-id="routeStart"><div class="saved-picker-control"><input id="routeStart" type="text" placeholder="Select or add a location" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="routeStartSavedMenu"><button class="saved-picker-toggle" type="button" aria-label="Show saved locations">⌄</button></div><div id="routeStartSavedMenu" class="saved-picker-menu" hidden></div></div></div>
                <div class="field"><label for="routeDestination">Destination</label><div class="saved-picker" data-saved-picker data-kind="locations" data-input-id="routeDestination"><div class="saved-picker-control"><input id="routeDestination" type="text" placeholder="Select or add a location" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="routeDestinationSavedMenu"><button class="saved-picker-toggle" type="button" aria-label="Show saved locations">⌄</button></div><div id="routeDestinationSavedMenu" class="saved-picker-menu" hidden></div></div></div>
                <div class="field"><label for="routeMiles">Total miles</label><input id="routeMiles" type="number" min="0" step="0.1"></div>
              </div>
              <div class="button-row"><button class="primary" type="button" onclick="addSavedRoute()">Add route</button></div>
              <div id="savedRoutesList" class="saved-route-list"></div>
            </div>
          </div>
        </details>

        <details class="card compact-settings-item">
          <summary><div class="compact-settings-summary-copy"><strong>Data & support</strong><small>Data export, cloud sync information, and help</small></div><span class="compact-settings-chevron">+</span></summary>
          <div class="compact-settings-body">
            <section class="data-card">
              <div class="privacy-note"><strong>Cloud sync:</strong> your signed-in account automatically keeps expenses, receipts, reports, and saved defaults synchronized across your devices. Local storage is used only as an offline working cache.</div>
              <div class="data-action-grid"><button class="secondary" type="button" onclick="exportAllExpensesCSV()">Download Full History CSV</button></div>
              <div class="support-contact"><span>Support contact</span><strong>Saul Garcia</strong><small>Questions, feedback, or app issues should be directed here.</small></div>
            </section>
          </div>
        </details>

        <details class="card compact-settings-item">
          <summary><div class="compact-settings-summary-copy"><strong>About this app</strong><small>Version, storage, mileage rate, and release details</small></div><span class="compact-settings-chevron">+</span></summary>
          <div class="compact-settings-body">
            <section class="about-card">
              <div class="section-heading"><div><div class="eyebrow">About</div><h2>Ranch Expense Tracker</h2></div><span class="version-chip">Version 2.0.0 RC</span></div>
              <div class="about-grid">
                <div><span>Release</span><strong>Cloud Sync</strong></div>
                <div><span>Storage</span><strong>Cloud + offline cache</strong></div>
                <div><span>Mileage rate</span><strong id="aboutMileageRate">$0.40 per mile</strong></div>
              </div>
              <div class="fixed-rate-card"><div><strong>Company mileage rate</strong><small>This rate is fixed for this release.</small></div><span id="fixedMileageRateDisplay">$0.40 / mile</span></div>
              <div class="privacy-note"><strong>Submitted history:</strong> finalized reports and their expenses are locked. A future Accounting return-for-correction workflow can reopen a report when needed.</div>
            </section>
          </div>
        </details>
      </div>
    </section>
`;
html = html.slice(0, settingsStart) + settingsHtml + html.slice(mainEnd);

// Past reports are employee history, not an editable archive.
html = html.replace('Download a PDF or CSV, then print it or attach it to an email using your device. You can also track whether a report is Submitted or Reimbursed and reopen it when corrections are needed.', 'Download a PDF or CSV, then print it or attach it to an email using your device. Submitted reports stay locked; reimbursement status can still be tracked.');
html = html.replace('          <button class="secondary" type="button" onclick="reopenReport(\'${report.id}\')">Reopen Report</button>\n', '');
html = html.replace('if (expense.submittedReportId) return showToast("Reopen the past report before editing this expense.");', 'if (expense.submittedReportId) return showToast("Submitted expenses are locked.", "error");');
replaceRequiredRe(/function currentReportHasWork\(\) \{[\s\S]*?\n\}\n\nfunction renderSettings\(\)/, 'function renderSettings()', 'remove employee report reopen functions');

// ---------------------------------------------------------------------------
// Clean settings data model and old backup architecture.
// ---------------------------------------------------------------------------
replaceRequiredRe(/function normalizeSettings\(value = \{\}\) \{[\s\S]*?\n\}\n\nfunction normalizeReportDraft/, `function normalizeSettings(value = {}) {\n  const unique = items => [...new Set((Array.isArray(items) ? items : []).map(item => String(item || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));\n  return {\n    employeeName: String(value.employeeName || ""),\n    defaultDepartment: String(value.defaultDepartment || value.department || ""),\n    savedPeople: unique(value.savedPeople),\n    savedOrganizations: unique(value.savedOrganizations),\n    savedLocations: unique(value.savedLocations),\n    savedVehicles: unique(value.savedVehicles),\n    savedTags: unique(value.savedTags),\n    savedRoutes: (Array.isArray(value.savedRoutes) ? value.savedRoutes : []).map(route => ({\n      id: route.id || makeId("route"),\n      start: String(route.start || route.startLocation || "").trim(),\n      destination: String(route.destination || "").trim(),\n      miles: Number(route.miles || 0)\n    })).filter(route => route.start && route.destination && route.miles > 0),\n    mileageRate: FIXED_MILEAGE_RATE\n  };\n}\n\nfunction normalizeReportDraft`, 'clean settings model');

html = html.replace('let preparedBackupFile = null;\nlet preparedBackupEmail = "";\n', '');
html = html.replace('  document.getElementById("backupImportInput").addEventListener("change", importBackupFile);\n\n', '');
html = html.replace('  document.getElementById("setupBanner").hidden = Boolean(settings.employeeName.trim());\n', '');
html = html.replace('  renderBackupReminder();\n', '');
replaceRequiredRe(/function reportFeedbackEmail\(kind\) \{[\s\S]*?\n\}\n\nfunction releaseActiveReceiptUrl\(\)/, 'function releaseActiveReceiptUrl()', 'remove backup / feedback / clear-history functions');

replaceRequiredRe(/function renderSettings\(\) \{[\s\S]*?\n\}\n\nfunction saveSettings\(\) \{[\s\S]*?\n\}\n\nfunction linesToUnique/, `function renderSettings() {\n  const values = {\n    employeeName: settings.employeeName,\n    defaultDepartment: settings.defaultDepartment,\n    savedPeopleText: settings.savedPeople.join("\\n"),\n    savedOrganizationsText: settings.savedOrganizations.join("\\n"),\n    savedLocationsText: settings.savedLocations.join("\\n"),\n    savedVehiclesText: settings.savedVehicles.join("\\n")\n  };\n  Object.entries(values).forEach(([id, value]) => {\n    const field = document.getElementById(id);\n    if (field && document.activeElement !== field) field.value = value;\n  });\n  const rateText = \`\${money(FIXED_MILEAGE_RATE)} / mile\`;\n  const fixed = document.getElementById("fixedMileageRateDisplay");\n  const about = document.getElementById("aboutMileageRate");\n  if (fixed) fixed.textContent = rateText;\n  if (about) about.textContent = \`\${money(FIXED_MILEAGE_RATE)} per mile\`;\n  renderSavedRoutes();\n}\n\nfunction saveSettings() {\n  settings.employeeName = readField("employeeName");\n  settings.defaultDepartment = readField("defaultDepartment");\n  settings.mileageRate = FIXED_MILEAGE_RATE;\n  if (!reportDraft.department && settings.defaultDepartment) reportDraft.department = settings.defaultDepartment;\n  saveAll();\n  renderAll();\n}\n\nfunction linesToUnique`, 'clean render/save settings');

html = html.replace(/function addSavedRoute\(\) \{[\s\S]*?\n\}\n\nfunction removeSavedRoute/, match => match
  .replace(',\n    tripType: readField("routeTripType") || "Round trip"', '')
  .replace('function removeSavedRoute', 'function removeSavedRoute'));
html = html.replace('<small>${route.miles} miles · ${safe(route.tripType)} · ${money(route.miles * FIXED_MILEAGE_RATE)}</small>', '<small>${route.miles} miles · ${money(route.miles * FIXED_MILEAGE_RATE)}</small>');

// PDF language now reflects cloud architecture.
html = html.replace('Created with Ranch Expense Tracker v${APP_VERSION} - data stored locally on the user\'s device.', 'Created with Ranch Expense Tracker v${APP_VERSION} - cloud synchronized with an offline device cache.');
html = html.replace('Local receipt', 'Supporting document');
html = html.replace('Review draft and previously reported expenses stored on this device.', 'Review your draft and previously submitted expenses.');

// ---------------------------------------------------------------------------
// Dashboard clarity: total stored/unreported expenses is distinct from the
// currently selected report total.
// ---------------------------------------------------------------------------
replaceRequired('<div class="metric-label">Selected report total</div>', '<div class="metric-label">Current report total</div>', 'dashboard current-report label');
replaceRequired('<div class="metric-grid">\n        <article class="metric-card">', `<div class="metric-grid">\n        <article class="metric-card">\n          <div class="metric-label">Unreported expenses</div>\n          <div id="dashUnreported" class="metric-value">$0.00</div>\n          <div id="dashUnreportedCount" class="metric-note">0 unreported expenses stored</div>\n        </article>\n        <article class="metric-card">`, 'dashboard unreported card');
replaceRequired('  const outstanding = reports.filter(report => normalizeReportStatus(report.status) === "Submitted").reduce((sum, report) => sum + reportTotal(report), 0);\n\n  document.getElementById("dashTotal").textContent = money(total);', `  const outstanding = reports.filter(report => normalizeReportStatus(report.status) === "Submitted").reduce((sum, report) => sum + reportTotal(report), 0);\n  const unreportedItems = expenses.filter(expense => !expense.submittedReportId);\n  const unreportedTotal = unreportedItems.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);\n\n  document.getElementById("dashUnreported").textContent = money(unreportedTotal);\n  document.getElementById("dashUnreportedCount").textContent = \`\${unreportedItems.length} unreported expense\${unreportedItems.length === 1 ? "" : "s"} stored\`;\n  document.getElementById("dashTotal").textContent = money(total);`, 'dashboard unreported render');

// ---------------------------------------------------------------------------
// Mobile polish identified in final Test 6 review.
// ---------------------------------------------------------------------------
const v2Css = `<style id="v2RcStyles">
html.ranch-auth-pending .site-header,html.ranch-auth-pending .app-nav,html.ranch-auth-pending .app-shell,html.ranch-auth-pending .site-footer{visibility:hidden!important}
.complete-sync-row{display:flex;justify-content:flex-end;margin:-8px 0 10px}.complete-sync-pill{min-height:29px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--muted);font-size:.76rem;font-weight:900;cursor:pointer;box-shadow:var(--shadow-soft)}.complete-sync-pill::before{content:"●";font-size:.62rem;margin-right:6px}.complete-sync-pill.ok{background:var(--olive-soft);border-color:#c8d8bd;color:#315329}.complete-sync-pill.wait{background:var(--amber-soft);border-color:#ead29f;color:var(--warning)}.complete-sync-pill.err{background:var(--danger-soft);border-color:#efc9c7;color:var(--danger)}
.complete-sync-card{margin:0 0 12px;padding:18px;border:1px solid #c9d9bf;border-left:5px solid var(--olive);border-radius:15px;background:linear-gradient(135deg,#f8fbf5,var(--olive-soft));box-shadow:var(--shadow-soft)}.complete-sync-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.complete-sync-head h2{font-size:1.08rem;margin:2px 0 3px}.complete-sync-head p{margin:0;color:var(--muted);font-size:.8rem}.complete-sync-identity{font-size:.76rem;font-weight:850;color:#315329;word-break:break-word;text-align:right}.complete-sync-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.complete-sync-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.complete-sync-message{margin-top:9px;min-height:18px;font-size:.78rem;line-height:1.4;color:var(--muted)}.complete-sync-message.ok{color:#315329}.complete-sync-message.warn{color:var(--warning)}.complete-sync-message.bad{color:var(--danger)}
.account-profile-info{margin-top:14px}.account-profile-info>p{margin:0 0 10px;color:var(--muted);font-size:.8rem;line-height:1.45}.account-profile-label{font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);margin-bottom:8px}#saveAccountInfoButton{margin-top:10px}
.compact-settings-stack{display:grid;gap:9px}.compact-settings-item{margin:0;padding:0;overflow:hidden;border-radius:14px;box-shadow:none}.compact-settings-item>summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:62px;padding:13px 16px;cursor:pointer;list-style:none;background:var(--panel)}.compact-settings-item>summary::-webkit-details-marker{display:none}.compact-settings-summary-copy strong,.compact-settings-summary-copy small{display:block}.compact-settings-summary-copy small{margin-top:2px;color:var(--muted);font-size:.76rem;line-height:1.3}.compact-settings-chevron{flex:0 0 auto;color:var(--brand-dark);font-size:1.2rem;font-weight:900;transition:transform .14s ease}.compact-settings-item[open] .compact-settings-chevron{transform:rotate(45deg)}.compact-settings-body{padding:16px;border-top:1px solid var(--border);background:var(--panel)}.compact-settings-body .about-card,.compact-settings-body .data-card{margin:0}.support-contact{margin-top:14px;padding:13px 14px;border:1px solid var(--border);border-radius:12px;background:var(--panel-alt)}.support-contact span,.support-contact strong,.support-contact small{display:block}.support-contact span{font-size:.76rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.support-contact strong{margin-top:4px}.support-contact small{margin-top:3px;color:var(--muted)}
#dashboard .metric-grid{grid-template-columns:repeat(auto-fit,minmax(175px,1fr))}.date-field-compact,#date{min-width:0;max-width:100%}
@media(max-width:760px){#history .filter-grid{grid-template-columns:1fr 1fr!important}.report-filter-grid{grid-template-columns:1fr}.expense-topline{row-gap:7px}.complete-sync-head{flex-direction:column}.complete-sync-identity{text-align:left}.complete-sync-grid{grid-template-columns:1fr}.complete-sync-actions{display:grid;grid-template-columns:1fr 1fr}.complete-sync-actions button{width:100%}}
@media(max-width:520px){#history .filter-grid{grid-template-columns:1fr!important}#history .filter-grid .field{min-width:0}.expense-title{flex:1 1 100%}.expense-topline .amount{margin-left:0}.expense-item{overflow:hidden}.expense-item>div{min-width:0}input[type="date"]{width:100%;min-width:0}}
</style>`;
html = html.replace('</head>', `${v2Css}\n</head>`);
html = html.replace('<html lang="en">', '<html lang="en" class="ranch-auth-pending">');

// Footer cleanup.
html = html.replace('Ranch Expense Tracker · Version 2.0.0 RC · Cloud Sync Release Candidate', 'Ranch Expense Tracker · Version 2.0.0 RC · Cloud Sync');

// ---------------------------------------------------------------------------
// V2 cloud module: based on the record-level merge logic proven in Test 6,
// with report deletion removed and account setup integrated directly.
// ---------------------------------------------------------------------------
let cloud = read('research/supabase-complete-sync-v6.js');
cloud = cloud
  .replaceAll('__ranchCompleteSyncV6', '__ranchCloudSyncV2')
  .replaceAll('ranch-expense-supabase-complete-sync-v6-auth', 'ranch-expense-v2-auth')
  .replaceAll('ranchExpense.completeSyncV6.meta', 'ranchExpense.v2.syncMeta')
  .replaceAll('Complete Sync Test 6', 'Version 2.0.0 RC');
cloud = cloud.replace('    reportDeletes: [],\n', '');
cloud = cloud.replace('    (meta.expenseDeletes || []).length ||\n    (meta.reportDeletes || []).length\n', '    (meta.expenseDeletes || []).length\n');
cloud = cloud.replace('      const reportDeletes = new Set((meta.reportDeletes || []).map(String));\n\n', '');
cloud = cloud.replace('      for (const id of observed.reportIds) if (!after.reportIds.has(id)) reportDeletes.add(id);\n\n', '');
cloud = cloud.replace('      meta.reportDeletes = [...reportDeletes];\n\n', '');
cloud = cloud.replace(/async function tombstoneReport\(row\) \{[\s\S]*?\n\}\n\nfunction mergeUniqueText/, 'function mergeUniqueText');
cloud = cloud.replace('    String(value.feedbackEmail || "").trim() ||\n', '');
cloud = cloud.replace('    const reportDeletes = new Set((meta.reportDeletes || []).map(String));\n\n', '');
cloud = cloud.replace(/\n    for \(const id of \[\.\.\.reportDeletes\]\) \{[\s\S]*?\n    \}\n\n    const finalExpenses/, '\n\n    const finalExpenses/');
cloud = cloud.replaceAll('      meta.reportDeletes = [...reportDeletes];\n', '');
cloud = cloud.replaceAll('    meta.reportDeletes = [...reportDeletes];\n', '');

const mountRe = /function mountSyncUi\(\) \{[\s\S]*?\n\}\n\nfunction currentSnapshot/;
must(mountRe.test(cloud), 'Cloud mountSyncUi pattern changed');
cloud = cloud.replace(mountRe, `function mountSyncUi() {\n  addStyles();\n  const shell = document.querySelector(".app-shell");\n  if (shell && !document.getElementById("completeSyncPill")) {\n    const row = document.createElement("div");\n    row.className = "complete-sync-row";\n    row.innerHTML = '<button id="completeSyncPill" class="complete-sync-pill" type="button">Cloud: signed out</button>';\n    shell.insertBefore(row, shell.firstChild);\n    document.getElementById("completeSyncPill").onclick = () => typeof showView === "function" && showView("settings");\n  }\n  const signInButton = document.getElementById("completeSyncSignIn");\n  const createButton = document.getElementById("completeSyncCreate");\n  const resendButton = document.getElementById("completeSyncResend");\n  const syncButton = document.getElementById("completeSyncNow");\n  const signOutButton = document.getElementById("completeSyncSignOut");\n  const saveInfoButton = document.getElementById("saveAccountInfoButton");\n  if (signInButton) signInButton.onclick = signIn;\n  if (createButton) createButton.onclick = createAccount;\n  if (resendButton) resendButton.onclick = resendConfirmation;\n  if (syncButton) syncButton.onclick = () => syncAll({ manual: true });\n  if (signOutButton) signOutButton.onclick = signOutSafely;\n  if (saveInfoButton) saveInfoButton.onclick = () => saveAccountInfo(true);\n  const badge = document.querySelector(".header-badge");\n  if (badge) badge.textContent = "Version 2.0.0 RC";\n  renderStatus();\n}\n\nfunction currentSnapshot`);

const authFnsRe = /async function signIn\(\) \{[\s\S]*?\n\}\n\nasync function clearLocalUserData/;
must(authFnsRe.test(cloud), 'Cloud auth functions pattern changed');
cloud = cloud.replace(authFnsRe, `function showResend(show = true) {\n  const button = document.getElementById("completeSyncResend");\n  if (button) button.hidden = !show;\n}\n\nfunction saveAccountInfo(showToastMessage = true) {\n  const name = String(document.getElementById("employeeName")?.value || "").trim();\n  const department = String(document.getElementById("defaultDepartment")?.value || "").trim();\n  if (!name) {\n    setMessage("Add your name first.", "warn");\n    document.getElementById("employeeName")?.focus();\n    return false;\n  }\n  settings.employeeName = name;\n  settings.defaultDepartment = department;\n  settings.mileageRate = typeof FIXED_MILEAGE_RATE !== "undefined" ? FIXED_MILEAGE_RATE : settings.mileageRate;\n  if (!reportDraft.department && department) reportDraft.department = department;\n  saveAll();\n  renderAll();\n  if (showToastMessage && typeof showToast === "function") showToast("Account information saved.", "success");\n  return true;\n}\n\nasync function signIn() {\n  if (!sb || busy) return;\n  const email = String(document.getElementById("completeSyncEmail")?.value || "").trim();\n  const password = document.getElementById("completeSyncPassword")?.value || "";\n  if (!email || !password) return setMessage("Enter your email and password.", "warn");\n  busy = true; renderStatus(); setMessage("Signing in…");\n  try {\n    const { error } = await sb.auth.signInWithPassword({ email, password });\n    if (error) throw error;\n    showResend(false);\n    await refreshUser();\n    await syncAll({ manual: true });\n  } catch (error) {\n    const text = error.message || String(error);\n    if (/email not confirmed/i.test(text)) showResend(true);\n    setMessage(text, "bad");\n  } finally { busy = false; renderStatus(); }\n}\n\nasync function createAccount() {\n  if (!sb || busy) return;\n  const email = String(document.getElementById("completeSyncEmail")?.value || "").trim();\n  const password = document.getElementById("completeSyncPassword")?.value || "";\n  const name = String(document.getElementById("employeeName")?.value || "").trim();\n  const department = String(document.getElementById("defaultDepartment")?.value || "").trim();\n  if (!name) { setMessage("Add your name before creating the account.", "warn"); document.getElementById("employeeName")?.focus(); return; }\n  if (!email || password.length < 6) return setMessage("Enter an email and a password with at least 6 characters.", "warn");\n  settings.employeeName = name; settings.defaultDepartment = department; saveAll();\n  busy = true; renderStatus(); setMessage("Creating account…");\n  try {\n    const redirect = location.origin + location.pathname;\n    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { employee_name: name, department } } });\n    if (error) throw error;\n    if (data.session) {\n      await refreshUser();\n      await syncAll({ manual: true });\n    } else {\n      showResend(true);\n      setMessage("Account created. Check your email and confirm the account before signing in.", "warn");\n    }\n  } catch (error) { setMessage(error.message || String(error), "bad"); }\n  finally { busy = false; renderStatus(); }\n}\n\nasync function resendConfirmation() {\n  if (!sb || busy) return;\n  const email = String(document.getElementById("completeSyncEmail")?.value || "").trim();\n  if (!email) return setMessage("Enter the email address for the account first.", "warn");\n  const button = document.getElementById("completeSyncResend");\n  if (button) button.disabled = true;\n  try {\n    setMessage("Sending a new confirmation email…");\n    const redirect = location.origin + location.pathname;\n    const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirect } });\n    if (error) throw error;\n    setMessage("A new confirmation email was sent. Use the newest email, then return here and sign in.", "ok");\n  } catch (error) { setMessage(error.message || String(error), "bad"); }\n  finally { if (button) button.disabled = false; }\n}\n\nasync function clearLocalUserData`);

// Render the account profile save action only while authenticated.
cloud = cloud.replace('  if (identity) identity.textContent = signedIn ? (user.email || user.id) : "Not signed in";\n', '  if (identity) identity.textContent = signedIn ? (user.email || user.id) : "Not signed in";\n  const saveInfo = document.getElementById("saveAccountInfoButton");\n  if (saveInfo) saveInfo.hidden = !signedIn;\n  const accountHelp = document.querySelector("#accountProfileInfo > p");\n  if (accountHelp) accountHelp.textContent = signedIn ? "Your name and department are tied to this cloud account. Update them here anytime." : "New account? Add your name before creating it. Existing account? Sign in and your saved information loads automatically.";\n');

// V2 dashboard already includes the unreported card directly.
cloud = cloud.replace('  mountDashboardClarification();\n  hookDashboard();\n', '  hookDashboard();\n');

// ---------------------------------------------------------------------------
// Saved-default deletion markers: this is now V2 sync architecture rather than
// a test hotfix. It prevents an item removed on one device from being unioned
// back into Settings by another device.
// ---------------------------------------------------------------------------
let savedDefaults = read('research/saved-defaults-removal-hotfix-v6.js')
  .replaceAll('__savedDefaultsRemovalHotfixV6', '__ranchSavedDefaultsSyncV2')
  .replaceAll('__savedDefaultsNormalizePatched', '__savedDefaultsV2NormalizePatched')
  .replaceAll('__savedDefaultsSavePatched', '__savedDefaultsV2SavePatched');

let gate = read('research/auth-prerequisite-gate-v3.js')
  .replaceAll('__ranchAuthPrerequisiteGateV3', '__ranchAuthGateV2')
  .replaceAll('ranchAuthGateStylesV3', 'ranchAuthGateStylesV2');

// ---------------------------------------------------------------------------
// One-time V1 migration. The old V1 cache remains untouched after import.
// ---------------------------------------------------------------------------
const migration = `(() => {\n"use strict";\nif (window.__ranchLegacyMigrationV2) return;\nwindow.__ranchLegacyMigrationV2 = true;\nconst V1 = { expenses:"workExpenseTool.expenses.v1", reports:"workExpenseTool.reports.v1", settings:"workExpenseTool.settings.v1", draft:"workExpenseTool.reportDraft.v1", db:"workExpenseReceiptDB" };\nconst parse = (key, fallback) => { try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };\nconst meaningfulDraft = d => d && (String(d.title||"").trim() || String(d.periodStart||"").trim() || String(d.periodEnd||"").trim() || (Array.isArray(d.selectedExpenseIds)&&d.selectedExpenseIds.length));\nfunction signedIn(){const a=document.getElementById("completeSyncSignedInActions");return Boolean(a&&!a.hidden)}\nfunction identity(){return String(document.getElementById("completeSyncIdentity")?.textContent||"").trim()}\nfunction legacyData(){return {expenses:parse(V1.expenses,[]),reports:parse(V1.reports,[]),settings:parse(V1.settings,{}),draft:parse(V1.draft,{})}}\nfunction hasLegacy(d){return (Array.isArray(d.expenses)&&d.expenses.length)||(Array.isArray(d.reports)&&d.reports.length)||String(d.settings?.employeeName||"").trim()||meaningfulDraft(d.draft)}\nfunction openOldDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(V1.db,1);req.onupgradeneeded=()=>{};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}\nasync function oldReceipts(){let database=null;try{database=await openOldDb();if(!database.objectStoreNames.contains("receipts"))return[];return await new Promise((resolve,reject)=>{const tx=database.transaction("receipts","readonly");const req=tx.objectStore("receipts").getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}catch{return[]}finally{try{database?.close()}catch{}}}\nfunction mergeById(current, legacy, versionField){const map=new Map((Array.isArray(current)?current:[]).map(x=>[String(x.id),x]));for(const item of (Array.isArray(legacy)?legacy:[])){if(!item?.id)continue;const old=map.get(String(item.id));if(!old){map.set(String(item.id),item);continue}const a=Date.parse(old?.[versionField]||old?.updatedAt||old?.createdAt||"")||0;const b=Date.parse(item?.[versionField]||item?.updatedAt||item?.createdAt||"")||0;if(b>a)map.set(String(item.id),item)}return[...map.values()]}\nfunction mergeText(a,b){return[...new Set([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].map(v=>String(v||"").trim()).filter(Boolean))].sort((x,y)=>x.localeCompare(y))}\nasync function migrate(){if(!signedIn())return;const email=identity();if(!email||email==="Not signed in")return;const marker="ranchExpense.v2.legacyMigration."+email.toLowerCase();if(localStorage.getItem(marker))return;const legacy=legacyData();if(!hasLegacy(legacy)){localStorage.setItem(marker,"none");return}const count=(legacy.expenses?.length||0);if(!confirm(\`Existing Ranch Expense Tracker 1.x data was found on this device.\\n\\nSigned in as: \${email}\\nLegacy expenses found: \${count}\\n\\nImport this data into this cloud account? The original 1.x copy will remain untouched.\`)){localStorage.setItem(marker,"declined");return}\ntry{expenses=mergeById(expenses,legacy.expenses,"updatedAt");reports=mergeById(reports,legacy.reports,"statusUpdatedAt");const ls=legacy.settings||{};settings=normalizeSettings({...settings,employeeName:settings.employeeName||ls.employeeName||"",defaultDepartment:settings.defaultDepartment||ls.defaultDepartment||ls.department||"",savedPeople:mergeText(settings.savedPeople,ls.savedPeople),savedOrganizations:mergeText(settings.savedOrganizations,ls.savedOrganizations),savedLocations:mergeText(settings.savedLocations,ls.savedLocations),savedVehicles:mergeText(settings.savedVehicles,ls.savedVehicles),savedTags:mergeText(settings.savedTags,ls.savedTags),savedRoutes:[...(settings.savedRoutes||[]),...(Array.isArray(ls.savedRoutes)?ls.savedRoutes:[])]});if(!meaningfulDraft(reportDraft)&&meaningfulDraft(legacy.draft))reportDraft=normalizeReportDraft(legacy.draft);else if(Array.isArray(legacy.draft?.selectedExpenseIds)){reportDraft.selectedExpenseIds=[...new Set([...(reportDraft.selectedExpenseIds||[]),...legacy.draft.selectedExpenseIds])]}const receipts=await oldReceipts();for(const record of receipts){try{await putReceipt(record)}catch(error){console.warn("Legacy receipt could not be copied",record?.id,error)}}saveAll();renderAll();localStorage.setItem(marker,new Date().toISOString());showToast(\`Imported \${count} legacy expense\${count===1?"":"s"}. Cloud sync will keep uploading any remaining records automatically.\`,"success");setTimeout(()=>document.getElementById("completeSyncNow")?.click(),150)}catch(error){console.error(error);showToast("Legacy data could not be imported. Your original 1.x data was not changed.","error")}}\nlet queued=false;const check=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;migrate()},250)};new MutationObserver(check).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["hidden"]});window.addEventListener("focus",check);document.addEventListener("DOMContentLoaded",check,{once:true});setTimeout(check,1200);\n})();`;

// Inject architecture modules into the generated static page. There is no
// runtime fetch/patch of index.html in the RC.
const modules = [savedDefaults, cloud, gate, migration]
  .map(source => `<script>\n${source.replaceAll('</script>', '<\\/script>')}\n</script>`)
  .join('\n');
html = html.replace('</body>', `${modules}\n</body>`);

// ---------------------------------------------------------------------------
// Static audit checks.
// ---------------------------------------------------------------------------
const forbidden = [
  'Download Backup', 'Import Backup', 'buildBackupFile(', 'renderBackupReminder(',
  'dismissBackupReminder(', 'clearExpenseHistory(', 'reopenReport(',
  'routeTripType', 'detailRoundTrip', 'Choose one way or round trip.',
  'One-way or round-trip selection is missing.', 'Feedback recipient',
  'Backup reminder', 'Local to device', 'Complete Sync Test 6',
  'Expense Entry Efficiency Test'
];
for (const phrase of forbidden) must(!html.includes(phrase), `V2 audit failed: obsolete architecture remains: ${phrase}`);
must(html.includes('Version 2.0.0 RC'), 'V2 version label missing');
must(html.includes('workExpenseTool.expenses.v2'), 'V2 cache key missing');
must(html.includes('workExpenseTool.expenses.v1'), 'Legacy migration reader missing');
must(html.includes('ranchExpense.v2.legacyMigration.'), 'Legacy migration marker missing');
must(!html.includes('research/supabase'), 'Research runtime dependency remains');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);

const manifest = {
  name: 'Ranch Expense Tracker',
  short_name: 'Expense Tracker',
  description: 'Personal business expense and mileage tracking with secure cloud sync.',
  start_url: './', scope: './', display: 'standalone',
  background_color: '#f7f1e8', theme_color: '#7a171b',
  icons: [
    { src: '../icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '../icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
};
fs.writeFileSync(path.join(OUT_DIR, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

const sw = `/* Ranch Expense Tracker 2.0.0 RC - app shell only. User records are never stored in the service-worker cache. */\nconst CACHE='ranch-expense-tracker-v2-rc-1';\nconst APP='./index.html';\nconst SUPABASE='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';\nself.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(new Request(APP,{cache:'reload'}));if(r.ok)await c.put(APP,r.clone())}catch{}try{const r=await fetch(SUPABASE);if(r.ok)await c.put(SUPABASE,r.clone())}catch{}await self.skipWaiting()})()));\nself.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('ranch-expense-tracker-v2-rc-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));\nself.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});\nself.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(req.mode==='navigate'){event.respondWith((async()=>{try{const r=await fetch(new Request(req,{cache:'no-store'}));if(r.ok)(await caches.open(CACHE)).put(APP,r.clone());return r}catch{const r=await caches.match(APP,{cacheName:CACHE});if(r)return r;throw new Error('Offline app shell unavailable')}})());return}if(req.url===SUPABASE){event.respondWith((async()=>{try{const r=await fetch(req);if(r.ok)(await caches.open(CACHE)).put(SUPABASE,r.clone());return r}catch{const r=await caches.match(SUPABASE,{cacheName:CACHE});if(r)return r;throw new Error('Supabase client unavailable offline')}})());return}if(url.origin===self.location.origin){event.respondWith((async()=>{try{const r=await fetch(new Request(req,{cache:'no-store'}));if(r.ok)(await caches.open(CACHE)).put(req,r.clone());return r}catch{const r=await caches.match(req,{cacheName:CACHE});if(r)return r;throw new Error('Cached asset unavailable')}})())}});\n`;
fs.writeFileSync(path.join(OUT_DIR, 'service-worker.js'), sw);

// Syntax-check every inline script from the generated file.
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean);
for (let i = 0; i < scripts.length; i++) {
  const tmp = path.join(OUT_DIR, `.syntax-${i}.js`);
  fs.writeFileSync(tmp, scripts[i]);
  const result = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (result.status !== 0) throw new Error(`Inline JavaScript ${i + 1} failed syntax check:\n${result.stderr}`);
}
const swCheck = spawnSync(process.execPath, ['--check', path.join(OUT_DIR, 'service-worker.js')], { encoding: 'utf8' });
if (swCheck.status !== 0) throw new Error(`Service worker syntax check failed:\n${swCheck.stderr}`);

console.log(`Built Ranch Expense Tracker 2.0.0 RC: ${html.length.toLocaleString()} bytes`);
console.log(`Inline scripts checked: ${scripts.length}`);
console.log('Obsolete-architecture static audit: passed');
