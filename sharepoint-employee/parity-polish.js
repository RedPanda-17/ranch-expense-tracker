"use strict";

/*
  Visual/interaction parity layer for the SharePoint employee prototype.
  The underlying mock SharePoint adapter remains unchanged.
*/

function mockDocumentLabel(expense){
  return expense.category === "Mileage" ? "Route" : "Receipt";
}

function openMockDocument(expenseId){
  const expense = state.expenses.find(item => item.id === expenseId);
  if (!expense || !expense.hasReceipt) return;
  showToast(`${mockDocumentLabel(expense)} preview will use the SharePoint document library in the SPFx build.`);
}

expenseCard = function(expense, options = {}){
  const reported = Boolean(expense.submittedReportId);
  const selected = (state.currentReport.selectedExpenseIds || []).includes(expense.id);
  const issues = expenseIssues(expense);
  const isMileage = expense.category === "Mileage";
  const title = isMileage
    ? `${expense.details?.startLocation || "Mileage"} → ${expense.details?.destination || ""}`
    : (expense.merchant || expense.category);
  const documentText = expense.hasReceipt
    ? `${isMileage ? "Route document" : "Receipt"}: ${expense.receiptName || "Attached"}`
    : (isMileage ? "Route document not attached" : "Receipt missing");
  const validationClass = issues.blocking.length ? "blocked" : issues.warnings.length ? "warn" : "ok";
  const validationText = issues.blocking.length ? "Needs attention" : issues.warnings.length ? "Review" : "Ready";
  const showActions = expense.hasReceipt || !reported;

  return `
    <article class="expense-item ${options.selectable && !selected ? "not-selected" : ""}">
      ${options.selectable
        ? `<input class="expense-check report-select" type="checkbox" data-select-expense="${safe(expense.id)}" ${selected ? "checked" : ""} aria-label="Include expense">`
        : `<span class="pill ${reported ? "ok" : ""}">${reported ? "Reported" : "Draft"}</span>`}
      <div class="expense-main">
        <div class="expense-topline">
          <span class="expense-title">${safe(title)}</span>
          <span class="pill">${safe(expense.category)}</span>
          ${expense.tag ? `<span class="tag-chip">${safe(expense.tag)}</span>` : ""}
          ${options.showValidation ? `<span class="pill ${validationClass}">${validationText}</span>` : ""}
          <span class="amount">${money(expense.amount)}</span>
        </div>
        <div class="expense-meta">${displayDate(expense.date)} · ${safe(documentText)}</div>
        <div class="expense-purpose">${safe(expense.description || "No description entered")}</div>
        ${detailText(expense) ? `<div class="expense-details">${safe(detailText(expense))}</div>` : ""}
        ${expense.notes ? `<div class="expense-details">Notes: ${safe(expense.notes)}</div>` : ""}
      </div>
      ${showActions ? `<div class="expense-actions">
        ${expense.hasReceipt ? `<button class="secondary" type="button" data-open-document="${safe(expense.id)}">${mockDocumentLabel(expense)}</button>` : ""}
        ${!reported ? `<button class="secondary" type="button" data-edit-expense="${safe(expense.id)}">Edit</button><button class="danger" type="button" data-delete-expense="${safe(expense.id)}">Delete</button>` : ""}
      </div>` : "<div></div>"}
    </article>`;
};

renderCurrentReport = function(){
  if (!el("currentExpenseList")) return;

  const shown = filteredDraftExpenses();
  el("currentExpenseList").innerHTML = shown.length
    ? shown.map(expense => expenseCard(expense, { selectable:true, showValidation:true })).join("")
    : '<div class="empty-state">No unreported expenses match these filters.</div>';

  const selected = selectedExpenses();
  const total = selected.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  el("selectionSummary").innerHTML = `<span>${selected.length} expense${selected.length === 1 ? "" : "s"} selected</span><strong>${money(total)}</strong>`;

  const blocking = [];
  const warnings = [];
  if (!state.currentReport.title) blocking.push({ label:"Required", message:"Enter a report name." });
  if (!state.currentReport.periodStart || !state.currentReport.periodEnd) blocking.push({ label:"Required", message:"Enter the report period." });
  if (!selected.length) blocking.push({ label:"Required", message:"Select at least one expense." });

  selected.forEach(expense => {
    const issues = expenseIssues(expense);
    const name = expense.category === "Mileage"
      ? `${expense.details?.startLocation || "Mileage"} → ${expense.details?.destination || ""}`
      : (expense.merchant || expense.category);
    issues.blocking.forEach(message => blocking.push({ label:name, message }));
    issues.warnings.forEach(message => warnings.push({ label:name, message }));
  });

  const ready = blocking.length === 0;
  const badge = el("readinessBadge");
  badge.className = `status-badge ${ready ? (warnings.length ? "warning" : "ready") : "blocked"}`;
  badge.textContent = ready ? (warnings.length ? "Ready with warnings" : "Ready") : "Not ready";

  el("readinessSummary").textContent = ready
    ? `${selected.length} expense${selected.length === 1 ? "" : "s"} can be exported. ${warnings.length ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"} should be reviewed.` : "No required issues were found."}`
    : `${blocking.length} required item${blocking.length === 1 ? "" : "s"} must be fixed before exporting or finalizing.`;

  const combined = [
    ...blocking.map(item => ({...item, kind:"blocking"})),
    ...warnings.map(item => ({...item, kind:"warning"}))
  ];
  el("readinessIssues").innerHTML = combined.slice(0,8).map(issue => `
    <div class="issue-item ${issue.kind === "blocking" ? "blocking" : ""}">
      <strong>${safe(issue.label || (issue.kind === "blocking" ? "Required" : "Review"))}</strong>
      <span>${safe(issue.message)}</span>
    </div>`).join("");
  if (combined.length > 8) {
    el("readinessIssues").innerHTML += `<div class="muted" style="font-size:.78rem">${combined.length - 8} more item${combined.length - 8 === 1 ? "" : "s"} are listed on the affected expenses.</div>`;
  }

  el("currentReportTotal").textContent = money(total);
  el("downloadDraftPdfButton").disabled = !ready;
  el("finalizeReportButton").disabled = !ready;
};

renderPast = function(){
  el("pastReportsList").innerHTML = state.reports.length
    ? state.reports.map(report => `
      <article class="report-card">
        <div class="report-card-head">
          <div>
            <div class="eyebrow">Submitted report</div>
            <h3>${safe(report.title)}</h3>
            <div class="report-card-meta">${displayDate(report.periodStart)} – ${displayDate(report.periodEnd)} · ${report.expenseIds.length} expense${report.expenseIds.length === 1 ? "" : "s"}</div>
          </div>
          <strong>${money(report.amount)}</strong>
        </div>
        <div class="report-actions">
          <button class="primary small-button" type="button" data-past-pdf="${safe(report.id)}">Download PDF</button>
          <button class="secondary small-button" type="button" data-past-csv="${safe(report.id)}">Download CSV</button>
        </div>
      </article>`).join("")
    : '<div class="empty-state">No finalized reports yet.</div>';
};

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-open-document]");
  if (button) openMockDocument(button.dataset.openDocument);
});
