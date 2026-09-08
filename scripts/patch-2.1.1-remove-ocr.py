from pathlib import Path
import json
import re

INDEX = Path('index.html')
text = INDEX.read_text(encoding='utf-8')

if '2.1.0' not in text:
    raise SystemExit('Expected 2.1.0 markers were not found in index.html')
text = text.replace('2.1.0', '2.1.1')

basic_analysis = r'''async function analyzeExpenseForAccounting(expense, doc, context) {
  const flags = [];

  if (!expense.receiptId) {
    flags.push({
      type: "missing-document",
      title: expense.category === "Mileage" ? "Route documentation is missing" : "Receipt is missing",
      detail: "Supporting documentation was not attached to this expense."
    });
  }

  if ((context.duplicateCounts.get(accountingExpenseDuplicateKey(expense)) || 0) > 1) {
    flags.push({
      type: "duplicate",
      title: "Possible duplicate expense",
      detail: "Another expense in this report has the same date, merchant, and amount."
    });
  }

  if (accountingDateOutsideReport(expense, context.details)) {
    flags.push({
      type: "date",
      title: "Expense date is outside the report period",
      detail: `Expense date: ${shortDate(expense.date)}`
    });
  }

  return flags;
}
'''
text2, count = re.subn(
    r'async function analyzeExpenseForAccounting\(expense, doc, context\) \{.*?\n\}\n\nasync function analyzeReportForAccounting',
    basic_analysis + '\nasync function analyzeReportForAccounting',
    text,
    count=1,
    flags=re.S
)
if count != 1:
    raise SystemExit(f'Could not replace OCR accounting analyzer; replacements={count}')
text = text2

basic_report = r'''async function analyzeReportForAccounting(pdf, items, details, imageCache) {
  const context = createAccountingReviewContext(items, details);
  const reviews = [];
  for (const expense of items) {
    reviews.push(await analyzeExpenseForAccounting(expense, null, context));
  }
  return reviews;
}
'''
text2, count = re.subn(
    r'async function analyzeReportForAccounting\(pdf, items, details, imageCache\) \{.*?\n\}\n\nfunction accountingReviewPdfLines',
    basic_report + '\nfunction accountingReviewPdfLines',
    text,
    count=1,
    flags=re.S
)
if count != 1:
    raise SystemExit(f'Could not replace report analysis loop; replacements={count}')
text = text2

text2, count = re.subn(
    r'function loadAccountingOcrLibrary\(context\) \{.*?\n\}\n\nasync function closeAccountingOcrWorker\(context\) \{.*?\n\}\n',
    '',
    text,
    count=1,
    flags=re.S
)
if count != 1:
    raise SystemExit(f'Could not remove Tesseract loader/worker block; replacements={count}')
text = text2

INDEX.write_text(text, encoding='utf-8')

sw = Path('service-worker.js')
sw_text = sw.read_text(encoding='utf-8')
if '2.1.0' not in sw_text:
    raise SystemExit('Expected 2.1.0 service-worker marker was not found')
sw.write_text(sw_text.replace('2.1.0', '2.1.1'), encoding='utf-8')

version_path = Path('version.json')
version = json.loads(version_path.read_text(encoding='utf-8'))
if version.get('version') != '2.1.0':
    raise SystemExit(f"version.json expected 2.1.0, found {version.get('version')}")
version['version'] = '2.1.1'
version['release'] = 'Manual Accounting Review'
version['released'] = '2026-09-08'
version_path.write_text(json.dumps(version, indent=2) + '\n', encoding='utf-8')

readme = Path('README.md')
readme_text = readme.read_text(encoding='utf-8')
readme_text = readme_text.replace(
    'Current release: **Version 2.1.0 — Scalable Cloud Sync**',
    'Current release: **Version 2.1.1 — Manual Accounting Review**'
)
readme.write_text(readme_text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
change_text = changelog.read_text(encoding='utf-8')
notes = '''## 2.1.1 - September 8, 2026\n\n### Changed\n- Removed in-browser Tesseract OCR from employee PDF generation.\n- PDF generation no longer scans receipt text for totals, dates, tips, or restricted items.\n- Kept lightweight non-OCR report checks for missing supporting documents, possible duplicates, and expenses outside the report period.\n- Accounting remains responsible for normal receipt and policy review.\n\n'''
if notes not in change_text:
    change_text = change_text.replace('# Changelog\n\n', '# Changelog\n\n' + notes, 1)
changelog.write_text(change_text, encoding='utf-8')

release_notes = Path('RELEASE_NOTES.md')
release_text = release_notes.read_text(encoding='utf-8')
release_text = re.sub(r'# Release Notes - Version [^\n]+', '# Release Notes - Version 2.1.1', release_text, count=1)
release_text = re.sub(r'\*\*Release name:\*\* [^\n]+', '**Release name:** Manual Accounting Review', release_text, count=1)
section = '''## Version 2.1.1 manual accounting review\n- Removes the local Tesseract OCR step from employee PDF generation.\n- Receipts are still included in the report for Accounting to review manually.\n- Lightweight checks for missing documents, duplicate expenses, and out-of-period dates remain.\n- This reduces device processing and removes the external OCR library from the active report-generation path.\n\n'''
if '## Version 2.1.1 manual accounting review' not in release_text:
    first_section = release_text.find('## Version ')
    if first_section >= 0:
        release_text = release_text[:first_section] + section + release_text[first_section:]
    else:
        release_text += '\n' + section
release_notes.write_text(release_text, encoding='utf-8')
