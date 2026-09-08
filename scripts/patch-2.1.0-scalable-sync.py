from pathlib import Path
import json
import re

INDEX = Path('index.html')
text = INDEX.read_text(encoding='utf-8')


def sub_once(pattern, replacement, label, flags=re.S):
    global text
    text2, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    text = text2


# Version bump throughout the production app shell.
if '2.0.2' not in text:
    raise SystemExit('Expected Version 2.0.2 markers were not found in index.html')
text = text.replace('2.0.2', '2.1.0')

# Cloud/local viewing helper: local files are used only while unsynced. Cloud-backed
# receipts are fetched into memory on demand and are never persisted back to IndexedDB.
open_receipt_block = r'''async function getReceiptForViewing(receiptId) {
  if (!receiptId) return null;
  let record = await getReceipt(receiptId);
  if (record && (!record.blob || !record.blob.size) && record.bytes) {
    record = { ...record, blob: new Blob([record.bytes], { type: record.type || "application/octet-stream" }) };
  }
  if (record?.blob?.size) return record;

  const expense = expenses.find(item => String(item?.receiptId || "") === String(receiptId));
  if (!expense || typeof window.ranchCloudReceiptLoader !== "function") return null;
  return window.ranchCloudReceiptLoader(expense);
}

async function openReceipt(receiptId) {
  try {
    const record = await getReceiptForViewing(receiptId);
    if (!record?.blob?.size) throw new Error("Receipt file data is not available.");
    return openReceiptBlob(
      record.blob,
      record.name || "Receipt",
      record.type || record.blob.type || "",
      { optimized: Boolean(record.optimized) }
    );
  } catch (error) {
    showToast(error.message || "Receipt could not be opened.", "error");
  }
}
'''
sub_once(
    r'async function openReceipt\(receiptId\) \{.*?\n\}\n\nfunction closeReceiptViewer',
    open_receipt_block + '\nfunction closeReceiptViewer',
    'replace openReceipt with on-demand cloud viewer'
)

# Inline preview should also use the same temporary cloud loader when a local copy is absent.
sub_once(
    r'async function showStoredInlineReceiptPreview\(receiptId\) \{\n  if \(!receiptId\) return clearInlineReceiptPreview\(\);\n  try \{\n    const record = await getReceipt\(receiptId\);',
    'async function showStoredInlineReceiptPreview(receiptId) {\n  if (!receiptId) return clearInlineReceiptPreview();\n  try {\n    const record = await getReceiptForViewing(receiptId);',
    'make inline receipt preview cloud-on-demand'
)

# PDF creation can fetch supporting documents temporarily without caching them locally.
sub_once(
    r'try \{ record = await getReceipt\(expense\.receiptId\); \}',
    'try { record = await getReceiptForViewing(expense.receiptId); }',
    'make PDF supporting documents cloud-on-demand'
)

cloud_helpers_and_push = r'''function stampCloudReceiptMetadata(expense, path, name, type, size, purgedAt = null) {
  if (!expense) return;
  expense.receiptCloudPath = path || "";
  expense.receiptCloudName = name || expense.receiptName || "";
  expense.receiptCloudType = type || expense.receiptType || "";
  expense.receiptCloudSize = Number(size || 0);
  expense.receiptPurgedAt = purgedAt || "";
}

function expenseStillReferencesReceipt(expense) {
  return Boolean(
    expense?.receiptId ||
    expense?.receiptName ||
    expense?.receiptFingerprint ||
    expense?.receiptCloudPath
  );
}

window.ranchCloudReceiptLoader = async expense => {
  if (!user || !expense?.id) throw new Error("Receipt information is unavailable.");

  const lookup = await sb.from("expenses")
    .select("receipt_path,receipt_name,receipt_type,receipt_size,receipt_purged_at")
    .eq("user_id", user.id)
    .eq("expense_id", String(expense.id))
    .maybeSingle();
  if (lookup.error) throw lookup.error;

  const row = lookup.data;
  if (row?.receipt_purged_at) {
    throw new Error("This receipt has been archived and is no longer available online.");
  }
  if (!row?.receipt_path) {
    throw new Error("No cloud receipt is available for this expense.");
  }

  const download = await sb.storage.from(BUCKET).download(row.receipt_path);
  if (download.error) throw download.error;
  if (!download.data?.size) throw new Error("The cloud receipt was empty.");

  return {
    id: expense.receiptId || ("receipt-cloud-" + expense.id),
    name: row.receipt_name || expense.receiptName || "Receipt",
    type: row.receipt_type || download.data.type || expense.receiptType || "application/octet-stream",
    blob: download.data,
    optimized: true,
    temporary: true,
    originalSize: Number(row.receipt_size || download.data.size || 0)
  };
};

async function pushExpense(expense, row) {
  const file = await localReceipt(expense);
  let path = null, name = null, type = null, size = null;
  let purgedAt = row?.receipt_purged_at || null;
  const receiptExpected = expenseStillReferencesReceipt(expense);

  const sameReceipt = file && row?.receipt_path &&
    String(row.payload?.receiptFingerprint || "") === String(expense.receiptFingerprint || "") &&
    Number(row.receipt_size || 0) === Number(file.size || 0);

  if (file) {
    purgedAt = null;
    if (sameReceipt) {
      path = row.receipt_path;
      name = row.receipt_name;
      type = row.receipt_type;
      size = row.receipt_size;
    } else {
      name = safeName(file.name);
      type = file.type;
      size = file.size;
      path = `${user.id}/expenses/${safeName(expense.id)}/${name}`;

      if (row?.receipt_path && row.receipt_path !== path) {
        const remove = await sb.storage.from(BUCKET).remove([row.receipt_path]);
        if (remove.error) throw remove.error;
      }

      const upload = await sb.storage.from(BUCKET).upload(path, file.uploadBody, {
        upsert: true,
        contentType: type || undefined,
        cacheControl: "3600"
      });
      if (upload.error) throw upload.error;
    }
  } else if (row?.receipt_path && receiptExpected) {
    // The receipt is already safely in cloud storage. A missing IndexedDB copy is
    // intentional in 2.1.0 and must never be interpreted as a cloud delete.
    path = row.receipt_path;
    name = row.receipt_name;
    type = row.receipt_type;
    size = row.receipt_size;
  } else if (row?.receipt_path) {
    const remove = await sb.storage.from(BUCKET).remove([row.receipt_path]);
    if (remove.error) throw remove.error;
    purgedAt = null;
  }

  stampCloudReceiptMetadata(expense, path, name, type, size, purgedAt);

  const query = await sb.from("expenses").upsert({
    user_id: user.id,
    expense_id: String(expense.id),
    payload: clone(expense),
    receipt_path: path,
    receipt_name: name,
    receipt_type: type,
    receipt_size: size,
    receipt_purged_at: purgedAt,
    deleted_at: null
  }, { onConflict: "user_id,expense_id" });

  if (query.error) throw query.error;

  // Once a local receipt is confirmed in the cloud, remove the IndexedDB binary.
  // Viewing it later performs a temporary cloud download that is released on close.
  if (file && path && expense.receiptId) {
    try { await deleteReceipt(expense.receiptId); }
    catch (error) { console.warn("Could not release the local receipt cache.", error); }
  }
}
'''
sub_once(
    r'async function pushExpense\(expense, row\) \{.*?\n\}\n\nasync function pullExpense',
    cloud_helpers_and_push + '\nasync function pullExpense',
    'replace pushExpense and add cloud receipt loader'
)

pull_block = r'''async function pullExpense(row, oldExpense) {
  const expense = clone(row.payload || {});
  expense.id = expense.id || row.expense_id;

  if (row.receipt_path) {
    expense.receiptId = expense.receiptId || oldExpense?.receiptId || ("receipt-cloud-" + row.expense_id);
    stampCloudReceiptMetadata(
      expense,
      row.receipt_path,
      row.receipt_name,
      row.receipt_type,
      row.receipt_size,
      row.receipt_purged_at
    );

    // Cloud-backed receipts stay cloud-only. Remove an older local cache copy if present.
    if (expense.receiptId) {
      try { await deleteReceipt(expense.receiptId); }
      catch (error) { console.warn("Could not release a local receipt cache copy.", error); }
    }
  } else {
    stampCloudReceiptMetadata(
      expense,
      "",
      row.receipt_name,
      row.receipt_type,
      row.receipt_size,
      row.receipt_purged_at
    );
    if (row.receipt_purged_at && expense.receiptId) {
      try { await deleteReceipt(expense.receiptId); }
      catch (error) { console.warn("Could not release a purged receipt cache copy.", error); }
    }
  }

  return expense;
}
'''
sub_once(
    r'async function pullExpense\(row, oldExpense\) \{.*?\n\}\n\nasync function tombstoneExpense',
    pull_block + '\nasync function tombstoneExpense',
    'replace pullExpense with metadata-only receipt sync'
)

# Existing 2.0.x devices may already hold receipt binaries. If the local and cloud
# fingerprints match, discard that redundant cache before normal reconciliation.
purge_loop = r'''
    for (const localExpense of localExpenses) {
      if (!localExpense?.receiptId) continue;
      const cloudRow = cloudExpenses.get(String(localExpense.id));
      if (!cloudRow || cloudRow.deleted_at || !cloudRow.receipt_path) continue;
      const localFingerprint = String(localExpense.receiptFingerprint || "");
      const cloudFingerprint = String(cloudRow.payload?.receiptFingerprint || "");
      if (!localFingerprint || !cloudFingerprint || localFingerprint !== cloudFingerprint) continue;
      try { await deleteReceipt(localExpense.receiptId); }
      catch (error) { console.warn("Could not release a previously cached cloud receipt.", error); }
    }
'''
sub_once(
    r'(const cloudReports = new Map\(\(reportQuery\.data \|\| \[\]\)\.map\(row => \[String\(row\.report_id\), row\]\)\);)',
    r'\1' + purge_loop,
    'insert local receipt cache cleanup'
)

INDEX.write_text(text, encoding='utf-8')

# Service-worker cache bump.
sw = Path('service-worker.js')
sw_text = sw.read_text(encoding='utf-8')
if '2.0.2' not in sw_text:
    raise SystemExit('Expected 2.0.2 service-worker markers were not found')
sw.write_text(sw_text.replace('2.0.2', '2.1.0'), encoding='utf-8')

# Release marker.
version_path = Path('version.json')
version = json.loads(version_path.read_text(encoding='utf-8'))
if version.get('version') != '2.0.2':
    raise SystemExit(f"version.json expected 2.0.2, found {version.get('version')}")
version['version'] = '2.1.0'
version['release'] = 'Scalable Cloud Sync'
version['released'] = '2026-09-08'
version_path.write_text(json.dumps(version, indent=2) + '\n', encoding='utf-8')

# Documentation.
readme = Path('README.md')
readme_text = readme.read_text(encoding='utf-8')
readme_text = readme_text.replace(
    'Current release: **Version 2.0.2 — Cloud Sync Update Guard**',
    'Current release: **Version 2.1.0 — Scalable Cloud Sync**'
)
readme.write_text(readme_text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
change_text = changelog.read_text(encoding='utf-8')
notes = '''## 2.1.0 - September 8, 2026\n\n### Changed\n- New-device sync now downloads expense/report metadata without automatically downloading every historical receipt or support file.\n- Cloud-backed receipts are fetched only when the employee opens one or generates a document that needs it.\n- Temporary cloud receipt blobs are not written back to IndexedDB; closing the viewer releases the in-memory object URL.\n- Once a newly added receipt is safely uploaded, its local IndexedDB binary is removed to keep device storage small.\n- Existing 2.0.x receipt caches are cleaned up when their fingerprint matches the confirmed cloud copy.\n- Receipt rows now understand a future archive/purge marker so historical expense rows can remain after supporting files are intentionally removed from cloud storage.\n\n'''
if notes not in change_text:
    change_text = change_text.replace('# Changelog\n\n', '# Changelog\n\n' + notes, 1)
changelog.write_text(change_text, encoding='utf-8')

release_notes = Path('RELEASE_NOTES.md')
release_text = release_notes.read_text(encoding='utf-8')
release_text = release_text.replace('# Release Notes - Version 2.0.2', '# Release Notes - Version 2.1.0', 1)
release_text = release_text.replace('**Release name:** Cloud Sync Update Guard', '**Release name:** Scalable Cloud Sync', 1)
section = '''## Version 2.1.0 scalable cloud sync\n- Syncs expense/report metadata first so a new device can become usable without downloading the user’s entire receipt history.\n- Downloads a receipt only when it is viewed or needed for a generated document.\n- Keeps cloud-viewed files temporary instead of persisting them in local IndexedDB.\n- Removes redundant local receipt binaries after a confirmed cloud upload while preserving the original cloud copy.\n- Adds support for a receipt purge marker so future Accounting archival can remove old receipt files without deleting expense/report history.\n\n'''
if '## Version 2.1.0 scalable cloud sync' not in release_text:
    release_text = release_text.replace('## Version 2.0.2 update guard\n', section + '## Version 2.0.2 update guard\n', 1)
release_notes.write_text(release_text, encoding='utf-8')
