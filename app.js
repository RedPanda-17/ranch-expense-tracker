
    const EXPENSE_KEY = "workExpenseTool.expenses.v1";
    const REPORT_KEY = "workExpenseTool.reports.v1";
    const SETTINGS_KEY = "workExpenseTool.settings.v1";
    const REPORT_DRAFT_KEY = "workExpenseTool.reportDraft.v1";
    const DB_NAME = "workExpenseReceiptDB";
    const DB_STORE = "receipts";

    let expenses = loadJSON(EXPENSE_KEY, []);
    let reports = loadJSON(REPORT_KEY, []);
    let settings = normalizeSettings(loadJSON(SETTINGS_KEY, {}));
    let reportDraft = loadJSON(REPORT_DRAFT_KEY, {
      title: "",
      department: "",
      manager: "",
      periodStart: "",
      periodEnd: "",
      purpose: "",
      selectedExpenseIds: [],
      selectionInitialized: false
    });
    let db;
    let activeReceiptUrl = null;
    let activeReceiptRecord = null;

    function normalizeSettings(value = {}) {
      const unique = items => [...new Set((Array.isArray(items) ? items : [])
        .map(item => String(item || "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

      return {
        employeeName: value.employeeName || "",
        mileageRate: Number(value.mileageRate ?? 0.40),
        reimbursementEmail: value.reimbursementEmail || "",
        backupEmail: value.backupEmail || "",
        backupReminderDays: Number(value.backupReminderDays || 7),
        lastBackupAt: value.lastBackupAt || null,
        backupDismissedAt: value.backupDismissedAt || null,
        savedPeople: unique(value.savedPeople),
        savedOrganizations: unique(value.savedOrganizations),
        savedLocations: unique(value.savedLocations),
        savedVehicles: unique(value.savedVehicles),
        savedRoutes: (Array.isArray(value.savedRoutes) ? value.savedRoutes : [])
          .filter(route => route && route.start && route.destination && Number(route.miles) > 0)
          .map(route => ({
            id: route.id || uid("route"),
            start: String(route.start).trim(),
            destination: String(route.destination).trim(),
            miles: Number(route.miles),
            tripType: route.tripType === "One way" ? "One way" : "Round trip"
          }))
      };
    }

    function splitReferenceText(value) {
      return [...new Set(String(value || "")
        .split(/\n|;/)
        .map(item => item.trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    }

    function addUniqueReference(listName, values) {
      const current = new Set(settings[listName] || []);
      (Array.isArray(values) ? values : [values])
        .flatMap(value => String(value || "").split(/,|;|\band\b/i))
        .map(value => value.trim())
        .filter(Boolean)
        .forEach(value => current.add(value));
      settings[listName] = [...current].sort((a, b) => a.localeCompare(b));
    }

    function savedRouteSelect() {
      const options = (settings.savedRoutes || []).map(route =>
        `<option value="${safe(route.id)}">${safe(route.start)} → ${safe(route.destination)} · ${safe(route.miles)} miles · ${safe(route.tripType)}</option>`
      ).join("");
      return `<div class="field full">
        <label for="savedRoute">Saved route</label>
        <select id="savedRoute">
          <option value="">Enter route manually</option>
          ${options}
        </select>
      </div>`;
    }

    function applySavedRoute() {
      const routeId = document.getElementById("savedRoute")?.value;
      const route = (settings.savedRoutes || []).find(item => item.id === routeId);
      if (!route) return;
      document.getElementById("startLocation").value = route.start;
      document.getElementById("destination").value = route.destination;
      document.getElementById("miles").value = route.miles;
      document.getElementById("roundTrip").value = route.tripType;
      calculateMileage();
    }

    function applyReferenceDataLists() {
      let container = document.getElementById("referenceDatalists");
      if (!container) {
        container = document.createElement("div");
        container.id = "referenceDatalists";
        container.style.display = "none";
        document.body.appendChild(container);
      }

      const options = items => (items || []).map(item => `<option value="${safe(item)}"></option>`).join("");
      container.innerHTML = `
        <datalist id="savedPeopleList">${options(settings.savedPeople)}</datalist>
        <datalist id="savedOrganizationsList">${options(settings.savedOrganizations)}</datalist>
        <datalist id="savedLocationsList">${options(settings.savedLocations)}</datalist>
        <datalist id="savedVehiclesList">${options(settings.savedVehicles)}</datalist>
      `;

      const mappings = {
        attendees: "savedPeopleList",
        organization: "savedOrganizationsList",
        merchant: "savedOrganizationsList",
        reportManager: "savedPeopleList",
        meetingLocation: "savedLocationsList",
        tripLocation: "savedLocationsList",
        startLocation: "savedLocationsList",
        destination: "savedLocationsList",
        vehicle: "savedVehiclesList",
        routeStart: "savedLocationsList",
        routeDestination: "savedLocationsList"
      };

      Object.entries(mappings).forEach(([id, list]) => {
        const field = document.getElementById(id);
        if (field) field.setAttribute("list", list);
      });
    }

    function learnReferenceDataFromExpense(expense) {
      const d = expense.details || {};
      addUniqueReference("savedPeople", d.attendees || []);
      addUniqueReference("savedOrganizations", [d.organization, expense.merchant]);
      addUniqueReference("savedLocations", [
        d.meetingLocation, d.tripLocation, d.startLocation, d.destination
      ]);
      addUniqueReference("savedVehicles", d.vehicle || []);

      if (expense.category === "Mileage" && d.startLocation && d.destination && Number(d.miles) > 0) {
        const existing = (settings.savedRoutes || []).some(route =>
          route.start.toLowerCase() === d.startLocation.toLowerCase() &&
          route.destination.toLowerCase() === d.destination.toLowerCase() &&
          route.tripType === d.roundTrip &&
          Math.abs(Number(route.miles) - Number(d.miles)) < 0.1
        );
        if (!existing) {
          settings.savedRoutes.push({
            id: uid("route"),
            start: d.startLocation,
            destination: d.destination,
            miles: Number(d.miles),
            tripType: d.roundTrip || "Round trip"
          });
        }
      }
      settings = normalizeSettings(settings);
    }

    async function sha256Hex(buffer) {
      if (!window.crypto?.subtle) return "";
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    async function fingerprintFile(file) {
      if (!file) return "";
      return sha256Hex(await file.arrayBuffer());
    }

    function normalizedMatch(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    function findDuplicateCandidates(candidate, excludeId = "") {
      return expenses.filter(expense => {
        if (expense.id === excludeId) return false;
        const exactReceipt = candidate.receiptFingerprint &&
          expense.receiptFingerprint &&
          candidate.receiptFingerprint === expense.receiptFingerprint;
        const sameCore = candidate.date &&
          candidate.date === expense.date &&
          Math.abs(Number(candidate.amount) - Number(expense.amount)) < 0.01 &&
          normalizedMatch(merchantText(candidate)) &&
          normalizedMatch(merchantText(candidate)) === normalizedMatch(merchantText(expense));
        const sameMileage = candidate.category === "Mileage" &&
          expense.category === "Mileage" &&
          candidate.date === expense.date &&
          normalizedMatch(candidate.details?.startLocation) === normalizedMatch(expense.details?.startLocation) &&
          normalizedMatch(candidate.details?.destination) === normalizedMatch(expense.details?.destination) &&
          Math.abs(Number(candidate.details?.miles || 0) - Number(expense.details?.miles || 0)) < 0.1;
        return exactReceipt || sameCore || sameMileage;
      });
    }

    function reportForExpense(expense) {
      return reports.find(report => report.id === expense.submittedReportId) || null;
    }

    function expenseStatus(expense) {
      const report = reportForExpense(expense);
      return report?.status || expense.reimbursementStatus || (expense.submittedReportId ? "Submitted" : "Draft");
    }

    function getAllReceipts() {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const request = tx.objectStore(DB_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = event => reject(event.target.error);
      });
    }

    function clearReceiptStore() {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        const request = tx.objectStore(DB_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = event => reject(event.target.error);
      });
    }

    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunk = 0x8000;
      for (let index = 0; index < bytes.length; index += chunk) {
        binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)));
      }
      return btoa(binary);
    }

    function base64ToBlob(base64, type = "application/octet-stream") {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return new Blob([bytes], { type });
    }

    async function buildBackupFile() {
      const receiptRecords = await getAllReceipts();
      const backupReceipts = [];
      for (const record of receiptRecords) {
        backupReceipts.push({
          id: record.id,
          name: record.name,
          type: record.type,
          data: arrayBufferToBase64(
            record.bytes ||
            (record.blob ? await record.blob.arrayBuffer() : new ArrayBuffer(0))
          )
        });
      }

      const exportedAt = new Date().toISOString();
      const payload = {
        app: "Ranch Expense Tracker",
        version: "1.1.0",
        exportedAt,
        expenses,
        reports,
        settings,
        reportDraft,
        receipts: backupReceipts
      };
      return new File(
        [JSON.stringify(payload)],
        `ranch-expense-backup-${exportedAt.slice(0, 10)}.json`,
        { type: "application/json" }
      );
    }

    function markBackupComplete() {
      settings.lastBackupAt = new Date().toISOString();
      settings.backupDismissedAt = null;
      saveAll();
      renderBackupReminder();
      const status = document.getElementById("backupStatus");
      if (status) status.textContent = `Last complete backup: ${new Date(settings.lastBackupAt).toLocaleString()}`;
    }

    async function shareBackup() {
      try {
        const file = await buildBackupFile();
        const email = settings.backupEmail || settings.reimbursementEmail || "";
        const shareData = {
          title: "Ranch Expense Tracker Backup",
          text: email
            ? `Ranch Expense Tracker backup. Suggested recipient: ${email}`
            : "Ranch Expense Tracker backup. Save or email this file somewhere secure.",
          files: [file]
        };

        if (
          navigator.share &&
          (!navigator.canShare || navigator.canShare({ files: [file] }))
        ) {
          await navigator.share(shareData);
          markBackupComplete();
          return;
        }

        downloadBlob(file, file.name);
        markBackupComplete();
        alert(email
          ? `The backup was saved. Email the file to ${email}.`
          : "The backup was saved. Email or store it somewhere secure."
        );
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error(error);
        alert(`The backup could not be shared: ${error.message || error}`);
      }
    }

    async function exportBackup() {
      try {
        const file = await buildBackupFile();
        downloadBlob(file, file.name);
        markBackupComplete();
      } catch (error) {
        console.error(error);
        alert(`The backup could not be created: ${error.message || error}`);
      }
    }

    async function importBackupFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.expenses) || !Array.isArray(data.reports) || !Array.isArray(data.receipts)) {
          throw new Error("This is not a valid expense tool backup.");
        }
        if (!confirm(`Restore ${data.expenses.length} expenses, ${data.reports.length} reports, and ${data.receipts.length} receipts? Current local data will be replaced.`)) {
          event.target.value = "";
          return;
        }

        await clearReceiptStore();
        for (const receipt of data.receipts) {
          const restoredBlob = base64ToBlob(receipt.data, receipt.type);
          await putReceipt({
            id: receipt.id,
            name: receipt.name || "receipt",
            type: receipt.type || "application/octet-stream",
            size: restoredBlob.size,
            bytes: await restoredBlob.arrayBuffer()
          });
        }

        expenses = data.expenses;
        reports = data.reports;
        settings = normalizeSettings(data.settings || {});
        reportDraft = { ...emptyReportDraft(), ...(data.reportDraft || {}) };
        saveAll();
        loadSettings();
        resetForm();
        renderAll();
        showView("dashboard");
        alert("Backup restored successfully.");
      } catch (error) {
        console.error(error);
        alert(`The backup could not be restored: ${error.message || error}`);
      } finally {
        event.target.value = "";
      }
    }

    function renderBackupReminder() {
      const reminder = document.getElementById("backupReminder");
      const text = document.getElementById("backupReminderText");
      if (!reminder || !text) return;

      const hasData = expenses.length > 0 || reports.length > 0;
      const days = Number(settings.backupReminderDays || 7);
      const reference = settings.lastBackupAt || settings.backupDismissedAt;
      const due = !reference || (Date.now() - new Date(reference).getTime()) >= days * 86400000;

      reminder.classList.toggle("active", hasData && due);
      if (!hasData || !due) return;

      text.textContent = settings.lastBackupAt
        ? `Your last complete backup was ${new Date(settings.lastBackupAt).toLocaleDateString()}. Share or save a new backup to protect receipts and report history.`
        : "No complete backup has been created yet. Share or save one now to protect receipts and report history.";
    }

    function dismissBackupReminder() {
      settings.backupDismissedAt = new Date().toISOString();
      saveAll();
      renderBackupReminder();
    }

    function renderReferenceSettings() {
      const values = {
        savedPeopleText: (settings.savedPeople || []).join("\n"),
        savedOrganizationsText: (settings.savedOrganizations || []).join("\n"),
        savedLocationsText: (settings.savedLocations || []).join("\n"),
        savedVehiclesText: (settings.savedVehicles || []).join("\n")
      };
      Object.entries(values).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
      });

      const routes = document.getElementById("savedRoutesList");
      if (routes) {
        routes.innerHTML = (settings.savedRoutes || []).length
          ? settings.savedRoutes.map(route => `
              <div class="route-row">
                <div><strong>${safe(route.start)} → ${safe(route.destination)}</strong><div class="hint">${safe(route.miles)} miles · ${safe(route.tripType)}</div></div>
                <button class="danger" onclick="removeSavedRoute('${safe(route.id)}')">Remove</button>
              </div>
            `).join("")
          : `<div class="empty">No saved routes yet.</div>`;
      }
      applyReferenceDataLists();
    }

    function saveReferenceLists() {
      settings.savedPeople = splitReferenceText(document.getElementById("savedPeopleText")?.value);
      settings.savedOrganizations = splitReferenceText(document.getElementById("savedOrganizationsText")?.value);
      settings.savedLocations = splitReferenceText(document.getElementById("savedLocationsText")?.value);
      settings.savedVehicles = splitReferenceText(document.getElementById("savedVehiclesText")?.value);
      settings = normalizeSettings(settings);
      saveAll();
      renderReferenceSettings();
      alert("Saved reference lists updated.");
    }

    function addSavedRoute() {
      const start = document.getElementById("routeStart")?.value.trim();
      const destination = document.getElementById("routeDestination")?.value.trim();
      const miles = Number(document.getElementById("routeMiles")?.value || 0);
      const tripType = document.getElementById("routeTripType")?.value || "Round trip";
      if (!start || !destination || miles <= 0) {
        return alert("Enter a starting location, destination, and mileage.");
      }
      settings.savedRoutes.push({ id: uid("route"), start, destination, miles, tripType });
      addUniqueReference("savedLocations", [start, destination]);
      settings = normalizeSettings(settings);
      saveAll();
      document.getElementById("routeStart").value = "";
      document.getElementById("routeDestination").value = "";
      document.getElementById("routeMiles").value = "";
      renderReferenceSettings();
    }

    function removeSavedRoute(routeId) {
      settings.savedRoutes = (settings.savedRoutes || []).filter(route => route.id !== routeId);
      saveAll();
      renderReferenceSettings();
    }

    function clearHistoryFilters() {
      ["historySearch", "historyCategory", "historyStatus", "historyReport", "historyDateFrom", "historyDateTo", "historyMinAmount", "historyMaxAmount"]
        .forEach(id => {
          const field = document.getElementById(id);
          if (field) field.value = "";
        });
      renderHistory();
    }

    function filteredHistoryExpenses() {
      const field = id => document.getElementById(id)?.value || "";
      const query = field("historySearch").trim().toLowerCase();
      const category = field("historyCategory");
      const status = field("historyStatus");
      const reportId = field("historyReport");
      const from = field("historyDateFrom");
      const to = field("historyDateTo");
      const minimum = field("historyMinAmount") === "" ? null : Number(field("historyMinAmount"));
      const maximum = field("historyMaxAmount") === "" ? null : Number(field("historyMaxAmount"));

      return [...expenses]
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .filter(expense => {
          const report = reportForExpense(expense);
          const searchable = [
            expense.merchant,
            expense.purpose,
            expense.notes,
            expense.category,
            detailText(expense),
            report?.name,
            expenseStatus(expense)
          ].join(" ").toLowerCase();

          return (!query || searchable.includes(query)) &&
            (!category || expense.category === category) &&
            (!status || expenseStatus(expense) === status) &&
            (!reportId || expense.submittedReportId === reportId) &&
            (!from || expense.date >= from) &&
            (!to || expense.date <= to) &&
            (minimum === null || Number(expense.amount) >= minimum) &&
            (maximum === null || Number(expense.amount) <= maximum);
        });
    }

    function renderHistory() {
      const table = document.getElementById("historyTable");
      const count = document.getElementById("historyCount");
      const reportFilter = document.getElementById("historyReport");
      if (!table || !count || !reportFilter) return;

      const selectedReport = reportFilter.value;
      reportFilter.innerHTML = `<option value="">All reports</option>` +
        reports.map(report => `<option value="${safe(report.id)}">${safe(report.name)}</option>`).join("");
      reportFilter.value = selectedReport;

      const items = filteredHistoryExpenses();
      const total = items.reduce((sum, expense) => sum + Number(expense.amount), 0);
      count.textContent = `${items.length} expense${items.length === 1 ? "" : "s"} shown · ${money(total)}`;

      if (!items.length) {
        table.innerHTML = `<tr><td colspan="8" class="empty">No expenses match the selected filters.</td></tr>`;
        return;
      }

      table.innerHTML = items.map(expense => {
        const report = reportForExpense(expense);
        const duplicates = findDuplicateCandidates(expense, expense.id);
        return `<tr>
          <td>${safe(expense.date || "")}</td>
          <td><span class="pill">${safe(expense.category)}</span>${duplicates.length ? `<div><span class="pill duplicate-pill">Possible duplicate</span></div>` : ""}</td>
          <td>${safe(merchantText(expense))}</td>
          <td>${safe(detailText(expense))}</td>
          <td>${safe(report?.name || "Not submitted")}</td>
          <td><span class="pill ${expenseStatus(expense) === "Reimbursed" ? "ok" : ""}">${safe(expenseStatus(expense))}</span></td>
          <td class="amount">${money(expense.amount)}</td>
          <td>${expense.receiptId
            ? `<button class="success" onclick="openReceipt('${expense.receiptId}')">View</button>`
            : `<span class="pill ${expense.category === "Mileage" ? "ok" : "warn"}">${expense.category === "Mileage" ? "Not required" : "Missing"}</span>`}</td>
        </tr>`;
      }).join("");
    }

    function expenseRowsForCSV(items) {
      return items.map(expense => {
        const report = reportForExpense(expense);
        return [
          settings.employeeName,
          expense.date,
          expense.category,
          merchantText(expense),
          expense.purpose,
          detailText(expense),
          Number(expense.amount).toFixed(2),
          expenseStatus(expense),
          report?.name || "",
          expense.receiptId ? "Yes" : (expense.category === "Mileage" ? "Not Required" : "No"),
          expense.notes || ""
        ];
      });
    }

    function downloadExpenseCSV(items, filename) {
      const headers = ["Employee","Date","Category","Merchant or Route","Business Purpose","Details","Amount","Status","Report","Receipt Attached","Notes"];
      const csv = [headers, ...expenseRowsForCSV(items)]
        .map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
    }

    function exportAllExpensesCSV() {
      downloadExpenseCSV(
        [...expenses].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
        `complete-expense-history-${new Date().toISOString().slice(0, 10)}.csv`
      );
    }

    function updateReportTracking(reportId) {
      const report = reports.find(item => item.id === reportId);
      if (!report) return;
      const byId = id => document.getElementById(`${id}-${reportId}`);
      report.status = byId("reportStatus")?.value || "Submitted";
      report.approvedAmount = byId("approvedAmount")?.value === ""
        ? null
        : Number(byId("approvedAmount")?.value || 0);
      report.reimbursedDate = byId("reimbursedDate")?.value || "";
      report.paymentReference = byId("paymentReference")?.value.trim() || "";
      report.reviewerNotes = byId("reviewerNotes")?.value.trim() || "";
      report.updatedAt = new Date().toISOString();

      expenses = expenses.map(expense => report.expenseIds.includes(expense.id)
        ? { ...expense, reimbursementStatus: report.status }
        : expense
      );
      saveAll();
      renderAll();
    }

    function loadJSON(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    }

    function saveAll() {
      localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
      localStorage.setItem(REPORT_KEY, JSON.stringify(reports));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(REPORT_DRAFT_KEY, JSON.stringify(reportDraft));
    }

    function money(value) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
    }

    function safe(text) {
      return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function uid(prefix = "id") {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    async function initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = event => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains(DB_STORE)) {
            database.createObjectStore(DB_STORE, { keyPath: "id" });
          }
        };
        request.onsuccess = event => { db = event.target.result; resolve(db); };
        request.onerror = event => reject(event.target.error);
      });
    }

    async function normalizeReceiptForStorage(record) {
      if (!record?.id) throw new Error("Receipt ID is missing.");

      let bytes = record.bytes || null;
      let blob = record.blob || null;

      if (!bytes && blob) {
        bytes = await blob.arrayBuffer();
      }

      if (!bytes) {
        throw new Error("Receipt file data is missing.");
      }

      return {
        id: record.id,
        name: record.name || "receipt",
        type: record.type || blob?.type || "application/octet-stream",
        size: Number(record.size || blob?.size || bytes.byteLength || 0),
        bytes
      };
    }

    async function putReceipt(record) {
      if (!db) throw new Error("Receipt database is not ready.");
      const storedRecord = await normalizeReceiptForStorage(record);

      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        const store = tx.objectStore(DB_STORE);
        store.put(storedRecord);
        tx.oncomplete = () => resolve(storedRecord);
        tx.onerror = event => reject(event.target.error || tx.error || new Error("Receipt could not be saved."));
        tx.onabort = event => reject(event.target.error || tx.error || new Error("Receipt save was interrupted."));
      });
    }

    function getReceipt(id) {
      if (!db) return Promise.reject(new Error("Receipt database is not ready."));
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const request = tx.objectStore(DB_STORE).get(id);
        request.onsuccess = () => {
          const record = request.result;
          if (!record) return resolve(null);

          // Backward compatibility with v1 receipts stored as Blob/File objects.
          if (record.blob && !record.bytes) {
            return resolve({
              ...record,
              blob: record.blob,
              size: record.size || record.blob.size || 0,
              type: record.type || record.blob.type || "application/octet-stream"
            });
          }

          const blob = record.bytes
            ? new Blob([record.bytes], { type: record.type || "application/octet-stream" })
            : null;

          resolve({ ...record, blob });
        };
        request.onerror = event => reject(event.target.error || new Error("Receipt could not be loaded."));
      });
    }

    function deleteReceipt(id) {
      if (!id || !db) return;
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
    }

    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });

    function showView(id) {
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.getElementById(id).classList.add("active");
      document.querySelector(`.nav-btn[data-view="${id}"]`).classList.add("active");
      if (id === "current") {
        renderCurrentReport();
        loadReportDraftIntoForm();
        renderSubmissionReadiness();
      }
      if (id === "past") renderPastReports();
      if (id === "history") renderHistory();
      if (id === "settings") {
        loadSettings();
        renderReferenceSettings();
      }
      if (id === "dashboard") renderDashboard();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    document.getElementById("category").addEventListener("change", renderDynamicFields);
    document.getElementById("expenseForm").addEventListener("submit", saveExpense);

    function renderDynamicFields(existing = {}) {
      const category = document.getElementById("category").value;
      const box = document.getElementById("dynamicFields");
      const merchantField = document.getElementById("merchantField");
      const amountField = document.getElementById("amountField");
      const receiptField = document.getElementById("receiptField");

      merchantField.style.display = "flex";
      amountField.style.display = "flex";
      receiptField.querySelector("label").classList.add("required");
      box.innerHTML = "";

      if (!category) return;

      const values = existing.details || {};

      if (category === "Auto (Fuel, Rental, Parking, Tolls)") {
        box.innerHTML = `
          <div class="form-grid">
            ${selectField("expenseType", "Expense type", ["Fuel","Rental","Parking","Tolls"], values.expenseType, true)}
            ${textField("tripLocation", "Trip / Location", values.tripLocation, true, "Example: Orange City to Marion")}
          </div>`;
      } else if (category === "Auto (Oil Changes, Tires, Car Wash)") {
        box.innerHTML = `
          <div class="form-grid">
            ${selectField("expenseType", "Expense type", ["Oil Change","Tires","Car Wash"], values.expenseType, true)}
            ${textField("vehicle", "Vehicle used", values.vehicle, true, "Example: 2019 GMC Terrain")}
          </div>`;
      } else if (category === "Education (Books, Conferences)") {
        box.innerHTML = `
          <div class="form-grid">
            ${selectField("educationType", "Education type", ["Book","Conference"], values.educationType, true)}
            ${textField("educationName", "Book / Conference name", values.educationName, true)}
            ${textField("conferenceDates", "Conference dates", values.conferenceDates, false, "Required when applicable")}
          </div>`;
      } else if (category === "Meals & Snacks") {
        box.innerHTML = `
          <div class="form-grid">
            ${selectField("mealContext", "Meal type", ["Alone","With Manager","With Vendor","With Franchisee"], values.mealContext, true)}
            ${textField("attendees", "Attendee names", values.attendees, false, "Required unless alone")}
            ${textField("organization", "Vendor / Franchise / Organization", values.organization, false, "Required for vendor or franchisee meals")}
          </div>`;
        setTimeout(() => {
          const meal = document.getElementById("mealContext");
          meal.addEventListener("change", updateMealRequirements);
          updateMealRequirements();
        });
      } else if (category === "Meetings (PR Employees)") {
        box.innerHTML = `
          <div class="form-grid">
            ${textField("attendees", "PR employee names", values.attendees, true, "Include everyone present")}
            ${textField("meetingLocation", "Meeting location", values.meetingLocation, true)}
          </div>`;
      } else if (category === "Supplies") {
        box.innerHTML = `
          <div class="form-grid">
            ${textField("supplyDescription", "Supplies purchased", values.supplyDescription, true)}
            ${textField("project", "Project / Department", values.project, false)}
          </div>`;
      } else if (category === "Travel (Hotel, Airfare)") {
        box.innerHTML = `
          <div class="form-grid">
            ${selectField("travelType", "Travel type", ["Hotel","Airfare"], values.travelType, true)}
            ${textField("destination", "Destination", values.destination, true)}
            ${textField("travelDates", "Travel dates", values.travelDates, true, "Example: July 20–22, 2026")}
          </div>`;
      } else if (category === "Mileage") {
        merchantField.style.display = "none";
        amountField.style.display = "none";
        receiptField.querySelector("label").classList.remove("required");
        box.innerHTML = `
          <div class="form-grid">
            ${savedRouteSelect()}
            ${textField("startLocation", "Starting location", values.startLocation, true)}
            ${textField("destination", "Destination", values.destination, true)}
            ${numberField("miles", "Total miles", values.miles, true, "0.1")}
            ${selectField("roundTrip", "Trip type", ["One way","Round trip"], values.roundTrip, true)}
            <div class="field">
              <label>Calculated reimbursement</label>
              <input id="calculatedMileage" type="text" readonly value="${money((values.miles || 0) * settings.mileageRate)}">
              <div class="hint">${money(settings.mileageRate)} per mile</div>
            </div>
          </div>`;
        setTimeout(() => {
          document.getElementById("miles").addEventListener("input", calculateMileage);
          document.getElementById("savedRoute")?.addEventListener("change", applySavedRoute);
          applyReferenceDataLists();
          calculateMileage();
        });
      } else if (category === "Other") {
        box.innerHTML = `
          <div class="form-grid">
            ${textField("otherDescription", "Expense description", values.otherDescription, true)}
            ${textField("categoryExplanation", "Why it does not fit another category", values.categoryExplanation, true)}
          </div>`;
      }
      setTimeout(applyReferenceDataLists, 0);
    }

    function textField(id, label, value = "", required = false, placeholder = "") {
      return `<div class="field">
        <label class="${required ? "required" : ""}" for="${id}">${label}</label>
        <input type="text" id="${id}" value="${safe(value)}" placeholder="${safe(placeholder)}" ${required ? "data-required='true'" : ""}>
      </div>`;
    }

    function numberField(id, label, value = "", required = false, step = "0.01") {
      return `<div class="field">
        <label class="${required ? "required" : ""}" for="${id}">${label}</label>
        <input type="number" id="${id}" value="${safe(value)}" min="0" step="${step}" ${required ? "data-required='true'" : ""}>
      </div>`;
    }

    function selectField(id, label, options, value = "", required = false) {
      return `<div class="field">
        <label class="${required ? "required" : ""}" for="${id}">${label}</label>
        <select id="${id}" ${required ? "data-required='true'" : ""}>
          <option value="">Select</option>
          ${options.map(o => `<option ${o === value ? "selected" : ""}>${safe(o)}</option>`).join("")}
        </select>
      </div>`;
    }

    function updateMealRequirements() {
      const context = document.getElementById("mealContext")?.value;
      const attendee = document.getElementById("attendees");
      const organization = document.getElementById("organization");
      if (!attendee || !organization) return;

      attendee.dataset.required = context && context !== "Alone" ? "true" : "false";
      attendee.closest(".field").querySelector("label").classList.toggle("required", context && context !== "Alone");

      const orgRequired = context === "With Vendor" || context === "With Franchisee";
      organization.dataset.required = orgRequired ? "true" : "false";
      organization.closest(".field").querySelector("label").classList.toggle("required", orgRequired);
    }

    function calculateMileage() {
      const miles = Number(document.getElementById("miles")?.value || 0);
      const output = document.getElementById("calculatedMileage");
      if (output) output.value = money(miles * settings.mileageRate);
    }

    function collectDetails() {
      const ids = [
        "expenseType","tripLocation","vehicle","educationType","educationName","conferenceDates",
        "mealContext","attendees","organization","meetingLocation","supplyDescription","project",
        "travelType","destination","travelDates","startLocation","miles","roundTrip",
        "otherDescription","categoryExplanation"
      ];
      const details = {};
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) details[id] = el.value.trim();
      });
      return details;
    }

    function showError(message) {
      const el = document.getElementById("formError");
      el.textContent = message;
      el.style.display = "block";
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function clearError() {
      document.getElementById("formError").style.display = "none";
    }

    async function saveExpense(event) {
      event.preventDefault();
      clearError();

      try {
      const id = document.getElementById("expenseId").value;
      const existing = expenses.find(e => e.id === id);
      const category = document.getElementById("category").value;
      const date = document.getElementById("date").value;
      const purpose = document.getElementById("purpose").value.trim();
      const merchant = document.getElementById("merchant").value.trim();
      let amount = Number(document.getElementById("amount").value || 0);
      const details = collectDetails();
      const receiptFile = document.getElementById("receipt").files[0];

      if (!date || !category || !purpose) {
        return showError("Complete the expense date, category, and business purpose.");
      }

      document.querySelectorAll("#dynamicFields [data-required='true']").forEach(el => {
        if (!el.value.trim()) el.dataset.invalid = "true";
        else delete el.dataset.invalid;
      });
      const invalid = document.querySelector("#dynamicFields [data-invalid='true']");
      if (invalid) return showError(`Complete the required field: ${invalid.closest(".field").querySelector("label").textContent.replace("*","").trim()}.`);

      if (category !== "Mileage" && !merchant) {
        return showError("Enter the merchant or provider.");
      }

      if (category === "Mileage") {
        const miles = Number(details.miles || 0);
        if (miles <= 0) return showError("Enter the total miles traveled.");
        amount = miles * settings.mileageRate;
      } else if (amount <= 0) {
        return showError("Enter an expense amount greater than zero.");
      }

      const receiptRequired = category !== "Mileage";
      if (receiptRequired && !receiptFile && !existing?.receiptId) {
        return showError("Attach a receipt for this expense.");
      }

      let receiptId = existing?.receiptId || null;
      let receiptName = existing?.receiptName || null;
      let receiptFingerprint = existing?.receiptFingerprint || "";

      if (receiptFile) {
        if (receiptFile.size > 8 * 1024 * 1024) {
          return showError("Receipt files must be 8 MB or smaller.");
        }
        receiptFingerprint = await fingerprintFile(receiptFile);
        receiptName = receiptFile.name;
      }

      const duplicateCandidate = {
        id: existing?.id || "",
        date,
        category,
        merchant: category === "Mileage" ? "" : merchant,
        amount: Number(amount.toFixed(2)),
        purpose,
        details,
        receiptFingerprint
      };
      const duplicateMatches = findDuplicateCandidates(duplicateCandidate, existing?.id || "");
      if (duplicateMatches.length) {
        const match = duplicateMatches[0];
        const proceed = confirm(
          `Possible duplicate found:\n\n${match.date} · ${merchantText(match) || match.category} · ${money(match.amount)}\n\nSave this expense anyway?`
        );
        if (!proceed) return;
      }

      if (receiptFile) {
        if (receiptId) deleteReceipt(receiptId);
        receiptId = uid("receipt");
        const receiptBytes = await receiptFile.arrayBuffer();
        await putReceipt({
          id: receiptId,
          bytes: receiptBytes,
          name: receiptFile.name,
          type: receiptFile.type || "application/octet-stream",
          size: receiptFile.size
        });

        const verifiedReceipt = await getReceipt(receiptId);
        if (!verifiedReceipt?.blob || verifiedReceipt.blob.size === 0) {
          throw new Error("The receipt did not finish saving. Please try attaching it again.");
        }
      }

      const record = {
        id: existing?.id || uid("expense"),
        date,
        category,
        merchant: category === "Mileage" ? "" : merchant,
        amount: Number(amount.toFixed(2)),
        purpose,
        notes: document.getElementById("notes").value.trim(),
        details,
        receiptId,
        receiptName,
        receiptFingerprint,
        submittedReportId: existing?.submittedReportId || null,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        expenses = expenses.map(e => e.id === existing.id ? record : e);
      } else {
        expenses.push(record);
        ensureExpenseSelection();
        if (!reportDraft.selectedExpenseIds.includes(record.id)) {
          reportDraft.selectedExpenseIds.push(record.id);
        }
        reportDraft.selectionInitialized = true;
      }

      learnReferenceDataFromExpense(record);
      saveAll();
      resetForm();
      applyReferenceDataLists();
      renderAll();
      showView("current");
      } catch (error) {
        console.error(error);
        showError(error.message || "The expense or receipt could not be saved. Please try again.");
      }
    }

    function resetForm() {
      document.getElementById("expenseForm").reset();
      document.getElementById("expenseId").value = "";
      document.getElementById("formTitle").textContent = "Add Expense";
      document.getElementById("date").value = new Date().toISOString().slice(0, 10);
      document.getElementById("dynamicFields").innerHTML = "";
      document.getElementById("existingReceipt").textContent = "";
      document.getElementById("merchantField").style.display = "flex";
      document.getElementById("amountField").style.display = "flex";
      document.getElementById("receiptField").querySelector("label").classList.add("required");
      clearError();
    }

    function editExpense(id) {
      const e = expenses.find(x => x.id === id);
      if (!e || e.submittedReportId) return;

      showView("add");
      document.getElementById("formTitle").textContent = "Edit Expense";
      document.getElementById("expenseId").value = e.id;
      document.getElementById("date").value = e.date;
      document.getElementById("category").value = e.category;
      renderDynamicFields(e);
      document.getElementById("merchant").value = e.merchant || "";
      document.getElementById("amount").value = e.amount || "";
      document.getElementById("purpose").value = e.purpose || "";
      document.getElementById("notes").value = e.notes || "";
      document.getElementById("existingReceipt").textContent = e.receiptName ? `Current receipt: ${e.receiptName}` : "";
    }

    async function removeExpense(id) {
      const e = expenses.find(x => x.id === id);
      if (!e || e.submittedReportId) return;
      if (!confirm("Delete this expense?")) return;
      if (e.receiptId) deleteReceipt(e.receiptId);
      expenses = expenses.filter(x => x.id !== id);
      reportDraft.selectedExpenseIds = (reportDraft.selectedExpenseIds || []).filter(expenseId => expenseId !== id);
      saveAll();
      renderAll();
    }

    function releaseActiveReceiptUrl() {
      if (activeReceiptUrl) {
        URL.revokeObjectURL(activeReceiptUrl);
        activeReceiptUrl = null;
      }
    }

    async function openReceipt(receiptId) {
      const viewer = document.getElementById("receiptViewer");
      const content = document.getElementById("receiptViewerContent");
      const meta = document.getElementById("receiptViewerMeta");
      if (!viewer || !content || !meta) return;

      try {
        releaseActiveReceiptUrl();
        activeReceiptRecord = null;
        content.innerHTML = `<div class="hint" style="padding:24px;">Loading receipt…</div>`;
        meta.textContent = "";
        viewer.classList.add("open");
        viewer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        const record = await getReceipt(receiptId);
        if (!record?.blob || record.blob.size === 0) {
          throw new Error("Receipt file data was not found on this device.");
        }

        activeReceiptRecord = record;
        activeReceiptUrl = URL.createObjectURL(record.blob);
        meta.textContent = `${record.name || "Receipt"} · ${Math.max(1, Math.round(record.blob.size / 1024))} KB`;

        const type = String(record.type || record.blob.type || "").toLowerCase();
        if (type.startsWith("image/")) {
          const image = document.createElement("img");
          image.src = activeReceiptUrl;
          image.alt = record.name || "Receipt image";
          image.onload = () => { content.innerHTML = ""; content.appendChild(image); };
          image.onerror = () => {
            content.innerHTML = `<div class="receipt-viewer-error">This receipt image could not be displayed. Use Download Receipt instead.</div>`;
          };
        } else if (type === "application/pdf" || /\.pdf$/i.test(record.name || "")) {
          content.innerHTML = `<iframe src="${activeReceiptUrl}" title="Receipt PDF"></iframe>`;
        } else {
          content.innerHTML = `<div class="receipt-viewer-error">Preview is unavailable for this file type. Use Download Receipt below.</div>`;
        }
      } catch (error) {
        console.error(error);
        content.innerHTML = `<div class="receipt-viewer-error">${safe(error.message || "Receipt could not be opened.")}</div>`;
      }
    }

    function closeReceiptViewer() {
      const viewer = document.getElementById("receiptViewer");
      if (viewer) {
        viewer.classList.remove("open");
        viewer.setAttribute("aria-hidden", "true");
      }
      document.body.style.overflow = "";
      activeReceiptRecord = null;
      releaseActiveReceiptUrl();
    }

    function downloadViewedReceipt() {
      if (!activeReceiptRecord?.blob) return alert("No receipt is currently open.");
      downloadBlob(activeReceiptRecord.blob, activeReceiptRecord.name || "receipt");
    }

    function availableExpenses() {
      return expenses
        .filter(e => !e.submittedReportId)
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    function ensureExpenseSelection() {
      const availableIds = availableExpenses().map(e => e.id);
      if (!Array.isArray(reportDraft.selectedExpenseIds)) {
        reportDraft.selectedExpenseIds = [];
      }

      reportDraft.selectedExpenseIds = reportDraft.selectedExpenseIds
        .filter(id => availableIds.includes(id));

      // Existing users and new report drafts start with all currently available
      // expenses selected. After the user changes the selection, it is preserved.
      if (reportDraft.selectionInitialized !== true) {
        reportDraft.selectedExpenseIds = [...availableIds];
        reportDraft.selectionInitialized = true;
        saveAll();
      }
    }

    function currentExpenses() {
      ensureExpenseSelection();
      const selected = new Set(reportDraft.selectedExpenseIds);
      return availableExpenses().filter(e => selected.has(e.id));
    }

    function isExpenseSelected(expenseId) {
      ensureExpenseSelection();
      return reportDraft.selectedExpenseIds.includes(expenseId);
    }

    function toggleExpenseSelection(expenseId, selected) {
      ensureExpenseSelection();
      const ids = new Set(reportDraft.selectedExpenseIds);
      if (selected) ids.add(expenseId);
      else ids.delete(expenseId);
      reportDraft.selectedExpenseIds = [...ids];
      reportDraft.selectionInitialized = true;
      saveAll();
      renderAll();
    }

    function selectAllAvailableExpenses() {
      reportDraft.selectedExpenseIds = availableExpenses().map(e => e.id);
      reportDraft.selectionInitialized = true;
      saveAll();
      renderAll();
    }

    function clearExpenseSelection() {
      reportDraft.selectedExpenseIds = [];
      reportDraft.selectionInitialized = true;
      saveAll();
      renderAll();
    }

    function categoryTotals(items) {
      return items.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
        return acc;
      }, {});
    }

    function detailText(e) {
      const d = e.details || {};
      const pieces = [e.purpose];
      if (e.category === "Mileage") pieces.push(`${d.startLocation || ""} → ${d.destination || ""}`, `${d.miles || 0} miles`, d.roundTrip || "");
      if (d.expenseType) pieces.push(d.expenseType);
      if (d.tripLocation) pieces.push(d.tripLocation);
      if (d.vehicle) pieces.push(d.vehicle);
      if (d.educationName) pieces.push(d.educationName);
      if (d.educationType) pieces.push(d.educationType);
      if (d.mealContext) pieces.push(d.mealContext);
      if (d.attendees) pieces.push(`Attendees: ${d.attendees}`);
      if (d.organization) pieces.push(d.organization);
      if (d.meetingLocation) pieces.push(d.meetingLocation);
      if (d.supplyDescription) pieces.push(d.supplyDescription);
      if (d.travelType) pieces.push(d.travelType);
      if (d.destination && e.category !== "Mileage") pieces.push(d.destination);
      if (d.travelDates) pieces.push(d.travelDates);
      if (d.otherDescription) pieces.push(d.otherDescription);
      return pieces.filter(Boolean).join(" · ");
    }

    function merchantText(e) {
      if (e.category === "Mileage") {
        return `${e.details?.startLocation || ""} → ${e.details?.destination || ""}`;
      }
      return e.merchant || "";
    }

    function renderSummary(containerId, items) {
      const container = document.getElementById(containerId);
      const totals = categoryTotals(items);
      const entries = Object.entries(totals).sort((a,b) => b[1] - a[1]);
      if (!entries.length) {
        container.innerHTML = `<div class="empty">No expenses entered yet.</div>`;
        return;
      }
      container.innerHTML = entries.map(([cat,total]) =>
        `<div class="summary-row"><span>${safe(cat)}</span><strong>${money(total)}</strong></div>`
      ).join("");
    }

    function emptyReportDraft() {
      return {
        title: "",
        department: "",
        manager: "",
        periodStart: "",
        periodEnd: "",
        purpose: "",
        selectedExpenseIds: [],
        selectionInitialized: false
      };
    }

    function readReportDraftForm() {
      const byId = id => document.getElementById(id)?.value.trim() || "";
      return {
        title: byId("reportTitle"),
        department: byId("reportDepartment"),
        manager: byId("reportManager"),
        periodStart: byId("reportPeriodStart"),
        periodEnd: byId("reportPeriodEnd"),
        purpose: byId("reportPurpose")
      };
    }

    function saveReportDraftFromForm() {
      reportDraft = { ...reportDraft, ...readReportDraftForm() };
      saveAll();
      const saved = document.getElementById("reportDraftSaved");
      if (saved) {
        saved.textContent = "Report details saved automatically.";
        clearTimeout(saveReportDraftFromForm.timer);
        saveReportDraftFromForm.timer = setTimeout(() => {
          if (saved) saved.textContent = "";
        }, 1600);
      }
      renderSubmissionReadiness();
    }

    function loadReportDraftIntoForm() {
      const values = {
        reportTitle: reportDraft.title,
        reportDepartment: reportDraft.department,
        reportManager: reportDraft.manager,
        reportPeriodStart: reportDraft.periodStart,
        reportPeriodEnd: reportDraft.periodEnd,
        reportPurpose: reportDraft.purpose
      };

      Object.entries(values).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field && field.value !== (value || "")) field.value = value || "";
      });

      document.querySelectorAll(
        "#reportTitle,#reportDepartment,#reportManager,#reportPeriodStart,#reportPeriodEnd,#reportPurpose"
      ).forEach(field => {
        if (field.dataset.reportListenerAttached === "true") return;
        field.addEventListener("input", saveReportDraftFromForm);
        field.addEventListener("change", saveReportDraftFromForm);
        field.dataset.reportListenerAttached = "true";
      });
    }

    function isVaguePurpose(value) {
      const normalized = String(value || "").trim().toLowerCase();
      const vague = [
        "work", "work trip", "business", "business trip", "meeting",
        "travel", "food", "meal", "supplies", "expense"
      ];
      return normalized.length < 12 || vague.includes(normalized);
    }

    function validateExpenseForReport(expense) {
      const blocking = [];
      const warnings = [];
      const d = expense.details || {};
      const addMissing = (condition, message) => {
        if (condition) blocking.push(message);
      };

      addMissing(!expense.date, "Expense date is missing.");
      addMissing(!expense.category, "Expense category is missing.");
      addMissing(!expense.purpose?.trim(), "Business purpose is missing.");
      addMissing(Number(expense.amount || 0) <= 0, "Expense amount must be greater than zero.");

      if (expense.category !== "Mileage") {
        addMissing(!expense.merchant?.trim(), "Merchant or provider is missing.");
        addMissing(!expense.receiptId, "Receipt is missing.");
      }

      if (expense.category === "Auto (Fuel, Rental, Parking, Tolls)") {
        addMissing(!d.expenseType, "Auto expense type is missing.");
        addMissing(!d.tripLocation, "Trip or work location is missing.");
      } else if (expense.category === "Auto (Oil Changes, Tires, Car Wash)") {
        addMissing(!d.expenseType, "Auto service type is missing.");
        addMissing(!d.vehicle, "Vehicle used is missing.");
      } else if (expense.category === "Education (Books, Conferences)") {
        addMissing(!d.educationType, "Education type is missing.");
        addMissing(!d.educationName, "Book or conference name is missing.");
        if (d.educationType === "Conference") {
          addMissing(!d.conferenceDates, "Conference dates are missing.");
        }
      } else if (expense.category === "Meals & Snacks") {
        addMissing(!d.mealContext, "Meal type is missing.");
        if (d.mealContext && d.mealContext !== "Alone") {
          addMissing(!d.attendees, "Attendee names are missing.");
        }
        if (d.mealContext === "With Vendor" || d.mealContext === "With Franchisee") {
          addMissing(!d.organization, "Vendor or franchise organization is missing.");
        }
      } else if (expense.category === "Meetings (PR Employees)") {
        addMissing(!d.attendees, "PR employee names are missing.");
        addMissing(!d.meetingLocation, "Meeting location is missing.");
      } else if (expense.category === "Supplies") {
        addMissing(!d.supplyDescription, "Description of supplies is missing.");
      } else if (expense.category === "Travel (Hotel, Airfare)") {
        addMissing(!d.travelType, "Travel type is missing.");
        addMissing(!d.destination, "Travel destination is missing.");
        addMissing(!d.travelDates, "Travel dates are missing.");
      } else if (expense.category === "Mileage") {
        addMissing(!d.startLocation, "Starting location is missing.");
        addMissing(!d.destination, "Destination is missing.");
        addMissing(Number(d.miles || 0) <= 0, "Mileage must be greater than zero.");
        addMissing(!d.roundTrip, "One-way or round-trip selection is missing.");
      } else if (expense.category === "Other") {
        addMissing(!d.otherDescription, "Expense description is missing.");
        addMissing(!d.categoryExplanation, "Explanation for using Other is missing.");
        warnings.push("The Other category may receive additional review.");
      }

      if (expense.purpose && isVaguePurpose(expense.purpose)) {
        warnings.push("Business purpose may be too general; identify the project, store, meeting, or business reason.");
      }

      if (
        reportDraft.periodStart &&
        reportDraft.periodEnd &&
        expense.date &&
        (expense.date < reportDraft.periodStart || expense.date > reportDraft.periodEnd)
      ) {
        warnings.push("Expense date is outside the selected report period.");
      }

      return { blocking, warnings };
    }

    function validateCurrentReport() {
      const blocking = [];
      const warnings = [];
      const items = currentExpenses();

      if (!settings.employeeName?.trim()) {
        blocking.push({
          scope: "report",
          message: "Your name is missing. Add it in Settings.",
          action: "settings"
        });
      }
      if (!reportDraft.title?.trim()) {
        blocking.push({ scope: "report", message: "Report title is missing.", field: "reportTitle" });
      }
      if (!reportDraft.periodStart) {
        blocking.push({ scope: "report", message: "Report period start date is missing.", field: "reportPeriodStart" });
      }
      if (!reportDraft.periodEnd) {
        blocking.push({ scope: "report", message: "Report period end date is missing.", field: "reportPeriodEnd" });
      }
      if (reportDraft.periodStart && reportDraft.periodEnd && reportDraft.periodEnd < reportDraft.periodStart) {
        blocking.push({ scope: "report", message: "Report period end date cannot be before the start date.", field: "reportPeriodEnd" });
      }
      if (!reportDraft.purpose?.trim()) {
        blocking.push({ scope: "report", message: "Overall report or trip purpose is missing.", field: "reportPurpose" });
      } else if (isVaguePurpose(reportDraft.purpose)) {
        warnings.push({
          scope: "report",
          message: "The overall report purpose may be too general. Consider naming the project, stores, conference, or meeting."
        });
      }
      if (!items.length) {
        blocking.push({ scope: "report", message: "Select at least one expense to include in this report." });
      }

      items.forEach((expense, index) => {
        const result = validateExpenseForReport(expense);
        result.blocking.forEach(message => blocking.push({
          scope: "expense",
          expenseId: expense.id,
          expenseLabel: `${index + 1}. ${expense.date || "No date"} — ${merchantText(expense) || expense.category || "Expense"}`,
          message
        }));
        result.warnings.forEach(message => warnings.push({
          scope: "expense",
          expenseId: expense.id,
          expenseLabel: `${index + 1}. ${expense.date || "No date"} — ${merchantText(expense) || expense.category || "Expense"}`,
          message
        }));
      });

      return { blocking, warnings, items };
    }

    function focusReportField(fieldId) {
      showView("current");
      const field = document.getElementById(fieldId);
      if (field) {
        field.focus();
        field.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function issueHtml(issue, type) {
      const title = issue.expenseLabel || (issue.scope === "report" ? "Report information" : "Expense");
      let action = "";
      if (issue.expenseId) {
        action = `<button class="secondary" onclick="editExpense('${issue.expenseId}')">Fix expense</button>`;
      } else if (issue.action === "settings") {
        action = `<button class="secondary" onclick="showView('settings')">Open Settings</button>`;
      } else if (issue.field) {
        action = `<button class="secondary" onclick="focusReportField('${issue.field}')">Fix report detail</button>`;
      }

      return `<div class="issue-item ${type}">
        <div class="issue-item-title">${safe(title)}</div>
        <div class="issue-item-message">${safe(issue.message)}</div>
        ${action}
      </div>`;
    }

    function renderSubmissionReadiness() {
      const badge = document.getElementById("readinessBadge");
      const summary = document.getElementById("readinessSummary");
      const blockingContainer = document.getElementById("blockingIssues");
      const warningContainer = document.getElementById("warningIssues");
      const submitButton = document.getElementById("submitReportBtn");
      if (!badge || !summary || !blockingContainer || !warningContainer || !submitButton) return;

      const result = validateCurrentReport();
      const blockingCount = result.blocking.length;
      const warningCount = result.warnings.length;
      const availableCount = availableExpenses().length;
      const selectedCount = result.items.length;

      submitButton.disabled = blockingCount > 0;

      if (blockingCount > 0) {
        badge.className = "readiness-badge blocked";
        badge.textContent = "Needs attention";
        summary.textContent = `${selectedCount} of ${availableCount} available expense${availableCount === 1 ? "" : "s"} selected. ${blockingCount} blocking issue${blockingCount === 1 ? "" : "s"} must be fixed before submission${warningCount ? `, plus ${warningCount} warning${warningCount === 1 ? "" : "s"}` : ""}.`;
      } else if (warningCount > 0) {
        badge.className = "readiness-badge warning";
        badge.textContent = "Ready with warnings";
        summary.textContent = `${selectedCount} of ${availableCount} available expense${availableCount === 1 ? "" : "s"} selected. Required information is complete. Review ${warningCount} warning${warningCount === 1 ? "" : "s"} before submitting.`;
      } else {
        badge.className = "readiness-badge ready";
        badge.textContent = "Ready to submit";
        summary.textContent = `${selectedCount} of ${availableCount} available expense${availableCount === 1 ? "" : "s"} selected. All required report details, expense information, and receipts are complete.`;
      }

      blockingContainer.innerHTML = blockingCount
        ? `<h4>Blocking issues</h4><div class="issue-list">${result.blocking.map(issue => issueHtml(issue, "blocking")).join("")}</div>`
        : "";

      warningContainer.innerHTML = warningCount
        ? `<h4>Warnings to review</h4><div class="issue-list">${result.warnings.map(issue => issueHtml(issue, "warning")).join("")}</div>`
        : "";
    }

    function renderDashboard() {
      const items = currentExpenses();
      const total = items.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const mileage = items
        .filter(expense => expense.category === "Mileage")
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const attention = items.filter(expense => validateExpenseForReport(expense).blocking.length > 0).length;
      const outstanding = reports
        .filter(report => report.status !== "Reimbursed")
        .reduce((sum, report) => sum + Number(report.approvedAmount ?? report.total ?? 0), 0);

      document.getElementById("dashTotal").textContent = money(total);
      document.getElementById("dashMileage").textContent = money(mileage);
      document.getElementById("dashAttention").textContent = attention;
      document.getElementById("dashOutstanding").textContent = money(outstanding);
      renderSummary("dashboardSummary", items);
      renderBackupReminder();
    }

    function renderCurrentReport() {
      ensureExpenseSelection();
      const allItems = availableExpenses();
      const items = currentExpenses();

      if (items.length && !reportDraft.periodStart && !reportDraft.periodEnd) {
        const dates = items.map(e => e.date).filter(Boolean).sort();
        if (dates.length) {
          reportDraft.periodStart = dates[0];
          reportDraft.periodEnd = dates[dates.length - 1];
          saveAll();
        }
      }

      const body = document.getElementById("currentTable");
      const total = items.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const selectionCount = document.getElementById("expenseSelectionCount");

      document.getElementById("currentReportMeta").textContent =
        `${settings.employeeName || "Your name not set"} · ${items.length} of ${allItems.length} expense${allItems.length === 1 ? "" : "s"} selected · ${money(total)}`;

      if (selectionCount) {
        selectionCount.textContent =
          `${items.length} of ${allItems.length} expense${allItems.length === 1 ? "" : "s"} selected — ${money(total)}`;
      }

      renderSummary("currentSummary", items);

      if (!allItems.length) {
        body.innerHTML = `<tr><td colspan="8" class="empty">No unsubmitted expenses are available.</td></tr>`;
        renderSubmissionReadiness();
        return;
      }

      body.innerHTML = allItems.map(expense => {
        const selected = isExpenseSelected(expense.id);
        const review = validateExpenseForReport(expense);
        const statusClass = review.blocking.length ? "blocked" : (review.warnings.length ? "warning" : "ready");
        const statusText = review.blocking.length
          ? `${review.blocking.length} issue${review.blocking.length === 1 ? "" : "s"}`
          : (review.warnings.length
              ? `${review.warnings.length} warning${review.warnings.length === 1 ? "" : "s"}`
              : "Complete");

        return `
          <tr class="${selected ? "" : "expense-not-selected"}">
            <td>
              <input
                class="expense-select"
                type="checkbox"
                aria-label="Include ${safe(merchantText(expense) || expense.category)} in current report"
                ${selected ? "checked" : ""}
                onchange="toggleExpenseSelection('${expense.id}', this.checked)"
              >
            </td>
            <td>${safe(expense.date)}</td>
            <td>
              <span class="pill">${safe(expense.category)}</span>
              ${selected
                ? `<div class="expense-readiness ${statusClass}">${safe(statusText)}</div>`
                : `<div class="not-included-label">Not included in this report</div>`}
            </td>
            <td>${safe(merchantText(expense))}</td>
            <td>${safe(detailText(expense))}</td>
            <td>
              ${expense.receiptId
                ? `<button class="success" onclick="openReceipt('${expense.receiptId}')">View receipt</button>`
                : `<span class="pill ${expense.category === "Mileage" ? "ok" : "warn"}">${expense.category === "Mileage" ? "Not required" : "Missing"}</span>`}
            </td>
            <td class="amount">${money(expense.amount)}</td>
            <td>
              <button class="secondary" onclick="editExpense('${expense.id}')">Edit</button>
              <button class="danger" onclick="removeExpense('${expense.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join("");

      loadReportDraftIntoForm();
      renderSubmissionReadiness();
    }

    function exportCurrentCSV() {
      const items = currentExpenses();
      if (!items.length) return alert("There are no selected expenses to export.");
      downloadExpenseCSV(items, `expense-report-${new Date().toISOString().slice(0, 10)}.csv`);
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function buildPrintableReport(title, items, submittedDate = null) {
      const totals = categoryTotals(items);
      const grand = items.reduce((s,e) => s + Number(e.amount), 0);
      const rows = items.map(e => `
        <tr>
          <td>${safe(e.date)}</td>
          <td>${safe(e.category)}</td>
          <td>${safe(merchantText(e))}</td>
          <td>${safe(detailText(e))}</td>
          <td>${e.receiptId ? "Attached" : (e.category === "Mileage" ? "Not required" : "Missing")}</td>
          <td style="text-align:right">${money(e.amount)}</td>
        </tr>`).join("");

      const summary = Object.entries(totals).map(([cat,total]) =>
        `<tr><td>${safe(cat)}</td><td style="text-align:right">${money(total)}</td></tr>`
      ).join("");

      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safe(title)}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#17202a;margin:36px;font-size:12px}
          h1{margin-bottom:4px}.meta{color:#5f6b76;margin-bottom:22px}
          table{width:100%;border-collapse:collapse;margin:12px 0 24px}
          th,td{border:1px solid #cfd6dd;padding:8px;text-align:left;vertical-align:top}
          th{background:#edf2f7}
          .total{font-size:18px;font-weight:bold;text-align:right;margin-top:12px}
          @media print{button{display:none}body{margin:16px}}
        </style></head><body>
        <button onclick="window.print()">Print / Save PDF</button>
        <h1>${safe(title)}</h1>
        <div class="meta">Employee: ${safe(settings.employeeName || "Not specified")} · ${submittedDate ? `Submitted: ${safe(submittedDate)}` : `Prepared: ${new Date().toLocaleDateString()}`}</div>
        <table><thead><tr><th>Date</th><th>Category</th><th>Merchant / Route</th><th>Business Purpose / Details</th><th>Receipt</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <h2>Category Summary</h2>
        <table><tbody>${summary}</tbody></table>
        <div class="total">Total reimbursement requested: ${money(grand)}</div>
        </body></html>`;
    }


    function concatPdfBytes(parts) {
      const total = parts.reduce((sum, part) => sum + part.length, 0);
      const output = new Uint8Array(total);
      let offset = 0;
      for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
      }
      return output;
    }

    function pdfAscii(value) {
      return String(value ?? "")
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/→/g, " to ")
        .replace(/[•·]/g, " | ")
        .replace(/[^\x20-\x7E]/g, "?");
    }

    function truncatePdfText(value, maxLength = 36) {
      const text = pdfAscii(value).replace(/\s+/g, " ").trim();
      return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 3))}...`;
    }

    function pdfDate(value) {
      if (!value) return "Not specified";
      const parts = String(value).split("-").map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString();
      }
      return String(value);
    }

    function pdfString(value) {
      return `(${pdfAscii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
    }

    function pdfName(value) {
      return pdfAscii(value).replace(/[^A-Za-z0-9_.-]/g, char =>
        `#${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`
      );
    }

    function pdfTextCommand(text, x, y, size = 10, bold = false) {
      return `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${pdfString(text)} Tj ET\n`;
    }

    function pdfLineCommand(x1, y1, x2, y2, width = 0.5) {
      return `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
    }

    function wrapPdfText(text, maxChars = 82) {
      const words = pdfAscii(text).split(/\s+/).filter(Boolean);
      if (!words.length) return [""];
      const lines = [];
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > maxChars && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    class LocalPdfDocument {
      constructor() {
        this.encoder = new TextEncoder();
        this.objects = [null];
        this.pages = [];
        this.attachments = [];
        this.pagesRef = this.reserveObject();
        this.fontRef = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        this.boldFontRef = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
      }

      reserveObject() {
        this.objects.push(null);
        return this.objects.length - 1;
      }

      addObject(body) {
        const ref = this.reserveObject();
        this.setObject(ref, body);
        return ref;
      }

      setObject(ref, body) {
        this.objects[ref] = typeof body === "string" ? this.encoder.encode(body) : body;
      }

      addStream(extraDictionary, bytes) {
        const prefix = this.encoder.encode(`<< ${extraDictionary} /Length ${bytes.length} >>\nstream\n`);
        const suffix = this.encoder.encode("\nendstream");
        return this.addObject(concatPdfBytes([prefix, bytes, suffix]));
      }

      addJpeg(bytes, width, height) {
        return this.addStream(
          `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
          bytes
        );
      }

      addPage(commands, xobjects = {}) {
        const contentBytes = this.encoder.encode(commands);
        const contentRef = this.addStream("", contentBytes);
        const xobjectEntries = Object.entries(xobjects)
          .map(([name, ref]) => `/${name} ${ref} 0 R`)
          .join(" ");
        const resources = `<< /Font << /F1 ${this.fontRef} 0 R /F2 ${this.boldFontRef} 0 R >>${xobjectEntries ? ` /XObject << ${xobjectEntries} >>` : ""} >>`;
        const pageRef = this.addObject(
          `<< /Type /Page /Parent ${this.pagesRef} 0 R /MediaBox [0 0 612 792] /Resources ${resources} /Contents ${contentRef} 0 R >>`
        );
        this.pages.push(pageRef);
        return pageRef;
      }

      addAttachment(filename, mimeType, bytes) {
        const subtype = pdfName(mimeType || "application/octet-stream");
        const embeddedRef = this.addStream(`/Type /EmbeddedFile /Subtype /${subtype}`, bytes);
        const filespecRef = this.addObject(
          `<< /Type /Filespec /F ${pdfString(filename)} /UF ${pdfString(filename)} /Desc ${pdfString("Original expense receipt")} /EF << /F ${embeddedRef} 0 R >> /AFRelationship /Data >>`
        );
        this.attachments.push({ filename, filespecRef });
      }

      build() {
        this.setObject(
          this.pagesRef,
          `<< /Type /Pages /Kids [${this.pages.map(ref => `${ref} 0 R`).join(" ")}] /Count ${this.pages.length} >>`
        );

        let attachmentDictionary = "";
        let associatedFiles = "";
        if (this.attachments.length) {
          const names = this.attachments
            .map(item => `${pdfString(item.filename)} ${item.filespecRef} 0 R`)
            .join(" ");
          attachmentDictionary = ` /Names << /EmbeddedFiles << /Names [${names}] >> >>`;
          associatedFiles = ` /AF [${this.attachments.map(item => `${item.filespecRef} 0 R`).join(" ")}]`;
        }

        const catalogRef = this.addObject(
          `<< /Type /Catalog /Pages ${this.pagesRef} 0 R${attachmentDictionary}${associatedFiles} >>`
        );

        const header = this.encoder.encode("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");
        const parts = [header];
        const offsets = [0];
        let position = header.length;

        for (let i = 1; i < this.objects.length; i++) {
          const prefix = this.encoder.encode(`${i} 0 obj\n`);
          const body = this.objects[i] || this.encoder.encode("<< >>");
          const suffix = this.encoder.encode("\nendobj\n");
          offsets[i] = position;
          parts.push(prefix, body, suffix);
          position += prefix.length + body.length + suffix.length;
        }

        const xrefPosition = position;
        let xref = `xref\n0 ${this.objects.length}\n0000000000 65535 f \n`;
        for (let i = 1; i < this.objects.length; i++) {
          xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
        }
        xref += `trailer\n<< /Size ${this.objects.length} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
        parts.push(this.encoder.encode(xref));
        return concatPdfBytes(parts);
      }
    }

    async function receiptImageToJpeg(blob) {
      const url = URL.createObjectURL(blob);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("The receipt image could not be opened."));
          img.src = url;
        });

        const maxDimension = 1800;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const jpegBlob = await new Promise((resolve, reject) =>
          canvas.toBlob(result => result ? resolve(result) : reject(new Error("The receipt image could not be converted.")), "image/jpeg", 0.88)
        );
        return {
          bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
          width,
          height
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    function safeFilename(value) {
      return pdfAscii(value || "receipt")
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "receipt";
    }

    function addReportSummaryPages(pdf, title, items, submittedDate, details = {}) {
      const total = items.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const mileageTotal = items
        .filter(expense => expense.category === "Mileage")
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const expenseTotal = total - mileageTotal;
      const receiptCount = items.filter(expense => expense.receiptId).length;
      const mileageCount = items.filter(expense => expense.category === "Mileage").length;
      const nonMileageCount = items.length - mileageCount;
      const period = details.periodStart || details.periodEnd
        ? `${pdfDate(details.periodStart)} through ${pdfDate(details.periodEnd)}`
        : "Not specified";

      // Cover page: answer-first summary for accounting.
      let commands = "";
      commands += pdfTextCommand("RANCH EXPENSE TRACKER", 42, 754, 10, true);
      commands += pdfTextCommand("EXPENSE REPORT", 42, 728, 22, true);
      commands += pdfTextCommand(truncatePdfText(title || "Expense Report", 72), 42, 705, 12, true);
      commands += pdfLineCommand(42, 690, 570, 690, 1.1);

      commands += pdfTextCommand("EMPLOYEE", 42, 668, 8, true);
      commands += pdfTextCommand(truncatePdfText(details.employeeName || settings.employeeName || "Not specified", 36), 42, 653, 10, false);
      commands += pdfTextCommand("DEPARTMENT", 218, 668, 8, true);
      commands += pdfTextCommand(truncatePdfText(details.department || "Not specified", 34), 218, 653, 10, false);
      commands += pdfTextCommand("REPORT PERIOD", 394, 668, 8, true);
      commands += pdfTextCommand(truncatePdfText(period, 31), 394, 653, 10, false);

      commands += pdfTextCommand("APPROVING MANAGER / ACCOUNTING CONTACT", 42, 625, 8, true);
      commands += pdfTextCommand(truncatePdfText(details.manager || "Not specified", 52), 42, 610, 10, false);
      commands += pdfTextCommand(submittedDate ? "SUBMITTED" : "PREPARED", 394, 625, 8, true);
      commands += pdfTextCommand(truncatePdfText(submittedDate || new Date().toLocaleString(), 31), 394, 610, 10, false);

      commands += pdfTextCommand("BUSINESS PURPOSE", 42, 580, 8, true);
      let purposeY = 563;
      for (const line of wrapPdfText(details.purpose || "Not specified", 92).slice(0, 4)) {
        commands += pdfTextCommand(line, 42, purposeY, 10, false);
        purposeY -= 13;
      }

      const totalsY = Math.min(500, purposeY - 18);
      commands += pdfLineCommand(42, totalsY + 28, 570, totalsY + 28, 0.6);
      commands += pdfTextCommand("NON-MILEAGE EXPENSES", 42, totalsY + 10, 8, true);
      commands += pdfTextCommand(money(expenseTotal), 42, totalsY - 12, 16, true);
      commands += pdfTextCommand("MILEAGE REIMBURSEMENT", 218, totalsY + 10, 8, true);
      commands += pdfTextCommand(money(mileageTotal), 218, totalsY - 12, 16, true);
      commands += pdfTextCommand("TOTAL REQUESTED", 394, totalsY + 10, 8, true);
      commands += pdfTextCommand(money(total), 394, totalsY - 12, 18, true);
      commands += pdfLineCommand(42, totalsY - 28, 570, totalsY - 28, 0.6);

      const checksY = totalsY - 58;
      commands += pdfTextCommand("REPORT CHECKS", 42, checksY, 9, true);
      commands += pdfTextCommand(`${items.length} expenses`, 42, checksY - 18, 10, false);
      commands += pdfTextCommand(`${receiptCount} receipts attached`, 170, checksY - 18, 10, false);
      commands += pdfTextCommand(`${mileageCount} mileage entries`, 330, checksY - 18, 10, false);
      commands += pdfTextCommand(`${Math.max(0, nonMileageCount - receiptCount)} missing receipts`, 462, checksY - 18, 10, false);

      let categoryY = checksY - 54;
      commands += pdfTextCommand("CATEGORY SUMMARY", 42, categoryY, 10, true);
      categoryY -= 18;
      for (const [category, amount] of Object.entries(categoryTotals(items)).sort((a, b) => b[1] - a[1])) {
        commands += pdfTextCommand(truncatePdfText(category, 48), 42, categoryY, 9, false);
        commands += pdfTextCommand(money(amount), 480, categoryY, 9, true);
        categoryY -= 14;
        if (categoryY < 155) break;
      }

      commands += pdfTextCommand("ACCOUNTING REVIEW", 42, 104, 9, true);
      commands += pdfLineCommand(42, 82, 264, 82, 0.5);
      commands += pdfLineCommand(306, 82, 528, 82, 0.5);
      commands += pdfTextCommand("Approved by", 42, 68, 8, false);
      commands += pdfTextCommand("Date", 306, 68, 8, false);
      pdf.addPage(commands);

      // Summary table. Long fields are shortened here; full details follow.
      const headerY = 742;
      let tableCommands = "";
      let y = headerY;
      function startTablePage() {
        tableCommands = "";
        y = headerY;
        tableCommands += pdfTextCommand("EXPENSE SUMMARY", 42, 764, 14, true);
        tableCommands += pdfTextCommand("#", 42, y, 8, true);
        tableCommands += pdfTextCommand("DATE", 58, y, 8, true);
        tableCommands += pdfTextCommand("MERCHANT / ROUTE", 116, y, 8, true);
        tableCommands += pdfTextCommand("CATEGORY", 242, y, 8, true);
        tableCommands += pdfTextCommand("PURPOSE", 355, y, 8, true);
        tableCommands += pdfTextCommand("RECEIPT", 500, y, 8, true);
        tableCommands += pdfTextCommand("AMOUNT", 542, y, 8, true);
        y -= 10;
        tableCommands += pdfLineCommand(42, y, 570, y, 0.7);
        y -= 16;
      }
      function flushTablePage() {
        if (tableCommands.trim()) pdf.addPage(tableCommands);
        tableCommands = "";
      }
      startTablePage();
      items.forEach((expense, index) => {
        if (y < 72) {
          flushTablePage();
          startTablePage();
        }
        const receipt = expense.receiptId ? "Yes" : (expense.category === "Mileage" ? "N/R" : "No");
        tableCommands += pdfTextCommand(String(index + 1), 42, y, 8, false);
        tableCommands += pdfTextCommand(truncatePdfText(expense.date, 10), 58, y, 8, false);
        tableCommands += pdfTextCommand(truncatePdfText(merchantText(expense) || "Not applicable", 25), 116, y, 8, false);
        tableCommands += pdfTextCommand(truncatePdfText(expense.category, 21), 242, y, 8, false);
        tableCommands += pdfTextCommand(truncatePdfText(expense.purpose, 27), 355, y, 8, false);
        tableCommands += pdfTextCommand(receipt, 500, y, 8, false);
        tableCommands += pdfTextCommand(money(expense.amount), 536, y, 8, true);
        y -= 13;
        tableCommands += pdfLineCommand(42, y + 4, 570, y + 4, 0.25);
        y -= 6;
      });
      if (y < 70) {
        flushTablePage();
        startTablePage();
      }
      tableCommands += pdfTextCommand("TOTAL REQUESTED", 420, y - 2, 9, true);
      tableCommands += pdfTextCommand(money(total), 536, y - 2, 9, true);
      flushTablePage();

      // Full expense details prevent summary-table truncation from losing information.
      commands = "";
      y = 748;
      const bottom = 46;
      function flushDetailPage() {
        if (commands.trim()) pdf.addPage(commands);
        commands = "";
        y = 748;
      }
      function ensureDetailSpace(height) {
        if (y - height < bottom) flushDetailPage();
      }
      function addDetailLine(text, options = {}) {
        const size = options.size || 9.5;
        const bold = Boolean(options.bold);
        const indent = options.indent || 0;
        const gapAfter = options.gapAfter ?? 3;
        const maxChars = options.maxChars || Math.max(40, 92 - Math.round(indent / 6));
        const lines = wrapPdfText(text, maxChars);
        const lineHeight = size + 3;
        ensureDetailSpace(lines.length * lineHeight + gapAfter);
        for (const line of lines) {
          commands += pdfTextCommand(line, 42 + indent, y, size, bold);
          y -= lineHeight;
        }
        y -= gapAfter;
      }

      addDetailLine("EXPENSE DETAILS", { size: 14, bold: true, gapAfter: 8 });
      items.forEach((expense, index) => {
        ensureDetailSpace(92);
        addDetailLine(`Expense #${index + 1} | ${expense.date} | ${money(expense.amount)}`, { size: 10.5, bold: true, gapAfter: 2 });
        addDetailLine(`Category: ${expense.category}`, { indent: 8, gapAfter: 1 });
        addDetailLine(`Merchant / Route: ${merchantText(expense) || "Not applicable"}`, { indent: 8, gapAfter: 1 });
        addDetailLine(`Business purpose: ${expense.purpose}`, { indent: 8, gapAfter: 1 });
        const extra = detailText(expense).replaceAll(" · ", " | ");
        if (extra && extra !== expense.purpose) addDetailLine(`Details: ${extra}`, { indent: 8, gapAfter: 1 });
        addDetailLine(`Receipt: ${expense.receiptId ? "Attached and shown after the detail pages" : (expense.category === "Mileage" ? "Not required" : "Missing")}`, { indent: 8, gapAfter: 4 });
        commands += pdfLineCommand(42, y, 570, y, 0.35);
        y -= 9;
      });

      if (receiptCount) {
        addDetailLine("RECEIPT IMAGES", { size: 13, bold: true, gapAfter: 4 });
        addDetailLine("Each receipt page uses the same expense number shown in the summary table. Original receipt files are also embedded in this PDF when supported by the PDF viewer.", { size: 9.5, gapAfter: 6 });
      }
      flushDetailPage();
    }

    async function addReceiptAppendix(pdf, items) {
      const usedNames = new Set();
      for (let index = 0; index < items.length; index++) {
        const expense = items[index];
        if (!expense.receiptId) continue;
        const receipt = await getReceipt(expense.receiptId);
        if (!receipt?.blob) continue;

        let attachmentName = `${expense.date}-${safeFilename(expense.merchant || expense.category)}-${safeFilename(receipt.name || "receipt")}`;
        let suffix = 2;
        const originalName = attachmentName;
        while (usedNames.has(attachmentName)) attachmentName = `${originalName}-${suffix++}`;
        usedNames.add(attachmentName);

        const originalBytes = new Uint8Array(await receipt.blob.arrayBuffer());
        pdf.addAttachment(attachmentName, receipt.type || receipt.blob.type, originalBytes);

        let commands = "";
        commands += pdfTextCommand(`Expense #${index + 1} Receipt`, 42, 748, 16, true);
        commands += pdfTextCommand(`${expense.date} | ${expense.category} | ${money(expense.amount)}`, 42, 726, 10.5, true);
        commands += pdfTextCommand(`Merchant / Route: ${merchantText(expense) || "Not applicable"}`, 42, 708, 9.5, false);
        const purposeLines = wrapPdfText(`Business purpose: ${expense.purpose}`, 88).slice(0, 4);
        let purposeY = 692;
        for (const line of purposeLines) {
          commands += pdfTextCommand(line, 42, purposeY, 9.5, false);
          purposeY -= 12;
        }
        const extra = detailText(expense).replaceAll(" · ", " | ");
        if (extra && extra !== expense.purpose) {
          for (const line of wrapPdfText(`Details: ${extra}`, 88).slice(0, 3)) {
            commands += pdfTextCommand(line, 42, purposeY, 9, false);
            purposeY -= 11;
          }
        }
        commands += pdfLineCommand(42, purposeY - 2, 570, purposeY - 2, 0.4);

        const mime = receipt.type || receipt.blob.type || "";
        if (mime.startsWith("image/")) {
          try {
            const jpeg = await receiptImageToJpeg(receipt.blob);
            const imageRef = pdf.addJpeg(jpeg.bytes, jpeg.width, jpeg.height);
            const boxX = 42;
            const boxY = 46;
            const boxWidth = 528;
            const boxHeight = Math.max(200, purposeY - 68);
            const scale = Math.min(boxWidth / jpeg.width, boxHeight / jpeg.height);
            const drawWidth = jpeg.width * scale;
            const drawHeight = jpeg.height * scale;
            const drawX = boxX + (boxWidth - drawWidth) / 2;
            const drawY = boxY + (boxHeight - drawHeight) / 2;
            commands += `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /Im1 Do Q\n`;
            pdf.addPage(commands, { Im1: imageRef });
            continue;
          } catch (error) {
            console.warn("Receipt image conversion failed", error);
          }
        }

        commands += pdfTextCommand("Original receipt file attached", 42, purposeY - 54, 14, true);
        const note = mime === "application/pdf"
          ? `The receipt was uploaded as a PDF. Its original pages are embedded in this report as the attachment: ${attachmentName}`
          : `This file could not be rendered as an image. The original receipt is embedded in this report as the attachment: ${attachmentName}`;
        let noteY = purposeY - 78;
        for (const line of wrapPdfText(note, 82)) {
          commands += pdfTextCommand(line, 42, noteY, 10, false);
          noteY -= 14;
        }
        commands += pdfTextCommand("Open the PDF viewer's Attachments panel to view or save the original file.", 42, noteY - 10, 9.5, false);
        pdf.addPage(commands);
      }
    }

    async function buildReportPdfFile(title, items, submittedDate, details = {}) {
      const pdf = new LocalPdfDocument();
      addReportSummaryPages(pdf, title, items, submittedDate, details);
      await addReceiptAppendix(pdf, items);
      const bytes = pdf.build();
      const filename = `${safeFilename(title)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const blob = new Blob([bytes], { type: "application/pdf" });
      return new File([blob], filename, { type: "application/pdf" });
    }

    async function shareOrSavePdf(file, shareTitle = "Expense Report") {
      const shareData = {
        title: shareTitle,
        text: `${shareTitle} from Ranch Expense Tracker`,
        files: [file]
      };

      try {
        if (
          navigator.share &&
          (!navigator.canShare || navigator.canShare({ files: [file] }))
        ) {
          await navigator.share(shareData);
          return "shared";
        }
      } catch (error) {
        if (error?.name === "AbortError") return "cancelled";
        console.warn("Native file sharing failed; using download fallback.", error);
      }

      downloadBlob(file, file.name);
      return "downloaded";
    }

    async function downloadReportPdf(title, items, submittedDate, details = {}) {
      try {
        const file = await buildReportPdfFile(title, items, submittedDate, details);
        return await shareOrSavePdf(file, title);
      } catch (error) {
        console.error(error);
        alert(`The PDF could not be created: ${error.message || error}`);
        return "failed";
      }
    }

    async function printCurrentReport() {
      const items = currentExpenses();
      if (!items.length) return alert("There are no current expenses to export.");
      await downloadReportPdf(
        reportDraft.title || "Expense Report",
        items,
        null,
        { ...reportDraft, employeeName: settings.employeeName }
      );
    }

    function submitCurrentReport() {
      const validation = validateCurrentReport();
      if (validation.blocking.length) {
        renderSubmissionReadiness();
        return alert("This report still has blocking issues. Use the Submission Readiness panel to fix them before submitting.");
      }

      if (validation.warnings.length) {
        const proceed = confirm(
          `This report has ${validation.warnings.length} warning${validation.warnings.length === 1 ? "" : "s"}. Submit it anyway?`
        );
        if (!proceed) return;
      }

      const items = validation.items;
      const reportId = uid("report");
      const report = {
        id: reportId,
        name: reportDraft.title,
        employeeName: settings.employeeName,
        details: {
          title: reportDraft.title,
          department: reportDraft.department,
          manager: reportDraft.manager,
          periodStart: reportDraft.periodStart,
          periodEnd: reportDraft.periodEnd,
          purpose: reportDraft.purpose
        },
        status: "Submitted",
        submittedAt: new Date().toISOString(),
        expenseIds: items.map(e => e.id),
        total: Number(items.reduce((s,e) => s + Number(e.amount), 0).toFixed(2))
      };

      addUniqueReference("savedPeople", reportDraft.manager);
      settings = normalizeSettings(settings);
      reports.unshift(report);
      expenses = expenses.map(e => items.some(i => i.id === e.id)
        ? { ...e, submittedReportId: reportId, reimbursementStatus: "Submitted" }
        : e
      );
      reportDraft = emptyReportDraft();
      saveAll();
      loadReportDraftIntoForm();
      renderAll();
      showView("past");
    }

    function renderPastReports() {
      const container = document.getElementById("pastReports");
      if (!container) return;
      if (!reports.length) {
        container.innerHTML = `<div class="empty">No submitted reports yet.</div>`;
        return;
      }

      container.innerHTML = reports.map(report => {
        const items = expenses.filter(expense => report.expenseIds.includes(expense.id));
        const approved = report.approvedAmount;
        const adjustment = approved == null
          ? ""
          : `Approved ${money(approved)} · Adjustment ${money(Number(report.total) - Number(approved))}`;
        const statusOptions = ["Submitted", "Approved", "Needs Correction", "Partially Approved", "Reimbursed"]
          .map(status => `<option ${status === (report.status || "Submitted") ? "selected" : ""}>${status}</option>`)
          .join("");

        return `
          <div class="card report-card">
            <h3>${safe(report.name)}</h3>
            <div class="meta">
              <span>${new Date(report.submittedAt).toLocaleString()}</span>
              <span>${items.length} expense${items.length === 1 ? "" : "s"}</span>
              <span class="pill ${report.status === "Reimbursed" ? "ok" : ""}">${safe(report.status || "Submitted")}</span>
              <strong>${money(report.total)}</strong>
            </div>
            ${adjustment ? `<div class="report-adjustment">${safe(adjustment)}</div>` : ""}
            <div class="button-row">
              <button class="primary" onclick="printPastReport('${report.id}')">Share PDF</button>
              <button class="secondary" onclick="exportPastCSV('${report.id}')">Export CSV</button>
              <button class="danger" onclick="reopenReport('${report.id}')">Reopen Report</button>
            </div>

            <div class="tracking-grid">
              <div class="field">
                <label for="reportStatus-${report.id}">Reimbursement status</label>
                <select id="reportStatus-${report.id}">${statusOptions}</select>
              </div>
              <div class="field">
                <label for="approvedAmount-${report.id}">Approved amount</label>
                <input id="approvedAmount-${report.id}" type="number" min="0" step="0.01" value="${report.approvedAmount ?? ""}" placeholder="${Number(report.total).toFixed(2)}" />
              </div>
              <div class="field">
                <label for="reimbursedDate-${report.id}">Reimbursed date</label>
                <input id="reimbursedDate-${report.id}" type="date" value="${safe(report.reimbursedDate || "")}" />
              </div>
              <div class="field">
                <label for="paymentReference-${report.id}">Payment reference</label>
                <input id="paymentReference-${report.id}" type="text" value="${safe(report.paymentReference || "")}" placeholder="Check, payroll, ACH, etc." />
              </div>
              <div class="field full">
                <label for="reviewerNotes-${report.id}">Reviewer notes or denied adjustments</label>
                <textarea id="reviewerNotes-${report.id}">${safe(report.reviewerNotes || "")}</textarea>
              </div>
            </div>
            <div class="button-row">
              <button class="success" onclick="updateReportTracking('${report.id}')">Save Tracking Update</button>
            </div>
          </div>`;
      }).join("");
    }

    async function printPastReport(reportId) {
      const r = reports.find(x => x.id === reportId);
      if (!r) return;
      const items = expenses.filter(e => r.expenseIds.includes(e.id));
      await downloadReportPdf(
        r.name,
        items,
        new Date(r.submittedAt).toLocaleString(),
        { ...(r.details || {}), employeeName: r.employeeName || settings.employeeName }
      );
    }

    function exportPastCSV(reportId) {
      const report = reports.find(item => item.id === reportId);
      if (!report) return;
      const items = expenses.filter(expense => report.expenseIds.includes(expense.id));
      downloadExpenseCSV(items, `${safeFilename(report.name)}.csv`);
    }

    function reopenReport(reportId) {
      const r = reports.find(x => x.id === reportId);
      if (!r) return;
      if (!confirm("Move all expenses in this report back to the current report?")) return;
      expenses = expenses.map(e => e.submittedReportId === reportId
        ? { ...e, submittedReportId: null, reimbursementStatus: "Draft" }
        : e
      );
      reportDraft = {
        ...emptyReportDraft(),
        ...(r.details || {}),
        title: r.name || r.details?.title || "",
        selectedExpenseIds: [...r.expenseIds],
        selectionInitialized: true
      };
      reports = reports.filter(x => x.id !== reportId);
      saveAll();
      renderAll();
      showView("current");
    }

    function saveSettings() {
      settings.employeeName = document.getElementById("employeeName").value.trim();
      settings.mileageRate = Number(document.getElementById("mileageRate").value || 0.40);
      settings.reimbursementEmail = document.getElementById("reimbursementEmail")?.value.trim() || "";
      settings.backupEmail = document.getElementById("backupEmail")?.value.trim() || "";
      settings.backupReminderDays = Number(document.getElementById("backupReminderDays")?.value || 7);
      settings = normalizeSettings(settings);
      saveAll();
      renderAll();
      alert("Settings saved.");
    }

    async function clearAllData() {
      if (!confirm("This permanently removes all expenses, reports, settings, and locally stored receipts from this browser. Continue?")) return;
      await clearReceiptStore();
      expenses = [];
      reports = [];
      settings = normalizeSettings({});
      reportDraft = emptyReportDraft();
      saveAll();
      loadSettings();
      resetForm();
      renderAll();
      alert("Local data cleared.");
    }

    function loadSettings() {
      const employee = document.getElementById("employeeName");
      const mileage = document.getElementById("mileageRate");
      const email = document.getElementById("reimbursementEmail");
      const backupEmail = document.getElementById("backupEmail");
      const reminder = document.getElementById("backupReminderDays");
      if (employee) employee.value = settings.employeeName || "";
      if (mileage) mileage.value = settings.mileageRate ?? 0.40;
      if (email) email.value = settings.reimbursementEmail || "";
      if (backupEmail) backupEmail.value = settings.backupEmail || "";
      if (reminder) reminder.value = String(settings.backupReminderDays || 7);

      const status = document.getElementById("backupStatus");
      if (status) {
        status.textContent = settings.lastBackupAt
          ? `Last complete backup: ${new Date(settings.lastBackupAt).toLocaleString()}`
          : "No complete backup has been created yet.";
      }
      renderReferenceSettings();
    }

    function renderAll() {
      renderDashboard();
      renderCurrentReport();
      renderPastReports();
      renderHistory();
      loadReportDraftIntoForm();
      renderSubmissionReadiness();
      renderReferenceSettings();
      renderBackupReminder();
    }

    (async function start() {
      await initDB();
      loadSettings();
      resetForm();
      renderAll();
    })();
  

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.warn);
  });
}


document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeReceiptViewer();
});
