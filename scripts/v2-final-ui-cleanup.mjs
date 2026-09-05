import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const file = path.join(ROOT, 'v2-rc', 'index.html');
if (!fs.existsSync(file)) throw new Error('Build v2-rc/index.html before running final UI cleanup.');

let html = fs.readFileSync(file, 'utf8');
const must = (value, message) => { if (!value) throw new Error(message); };

// Keep reimbursement status in the data model and report logic for future use,
// but remove it from the employee-facing 2.0 interface.
const statusControl = '<div class="field"><label for="status-${safe(report.id)}">Reimbursement status</label><select id="status-${safe(report.id)}" onchange="updateReportStatus(\'${report.id}\', this.value)"><option ${status === "Submitted" ? "selected" : ""}>Submitted</option><option ${status === "Reimbursed" ? "selected" : ""}>Reimbursed</option></select></div>';
must(html.includes(statusControl), 'Could not find reimbursement status control.');
html = html.replaceAll(
  statusControl,
  statusControl.replace('<div class="field">', '<div class="field reimbursement-status-ui" hidden aria-hidden="true">')
);

const reimbursementMetric = '<article class="metric-card">\n          <div class="metric-label">Awaiting reimbursement</div>';
must(html.includes(reimbursementMetric), 'Could not find reimbursement dashboard metric.');
html = html.replace(
  reimbursementMetric,
  '<article class="metric-card reimbursement-status-ui" hidden aria-hidden="true">\n          <div class="metric-label">Awaiting reimbursement</div>'
);

const reportStatusEyebrow = '<div><div class="eyebrow">${safe(status)}</div><h3>${safe(details.title)}</h3>';
must(html.includes(reportStatusEyebrow), 'Could not find completed report status eyebrow.');
html = html.replaceAll(
  reportStatusEyebrow,
  '<div><div class="eyebrow">Completed report</div><h3>${safe(details.title)}</h3>'
);

html = html.replaceAll(
  'Submitted reports stay locked; reimbursement status can still be tracked.',
  'Submitted reports stay locked and remain available for download.'
);

// iOS and some Android browsers give native date controls a stubborn intrinsic
// width. Constrain the input itself, its inline size, and the WebKit date value.
const mobileDateCss = `<style id="v2FinalMobileDateFix">
input[type="date"]{
  display:block;
  box-sizing:border-box;
  inline-size:100%;
  width:100%;
  min-inline-size:0;
  min-width:0;
  max-inline-size:100%;
  max-width:100%;
  min-height:44px;
  -webkit-min-logical-width:0;
}
input[type="date"]::-webkit-date-and-time-value{
  min-width:0;
  text-align:left;
}
@media(max-width:680px){
  .field,.form-grid>*,.filter-grid>*,.report-filter-grid>*{min-width:0;max-width:100%}
  input[type="date"]{
    font-size:16px;
    line-height:1.2;
    padding:11px 12px;
  }
}
</style>`;
html = html.replace('</head>', `${mobileDateCss}\n</head>`);

must(html.includes('reimbursement-status-ui" hidden'), 'Reimbursement UI was not hidden.');
must(html.includes('v2FinalMobileDateFix'), 'Mobile date fix was not injected.');

fs.writeFileSync(file, html);

// Re-check all inline JavaScript after the final source transformation.
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .filter(Boolean);
for (let i = 0; i < scripts.length; i++) {
  const tmp = path.join(ROOT, 'v2-rc', `.final-syntax-${i}.js`);
  fs.writeFileSync(tmp, scripts[i]);
  const result = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (result.status !== 0) throw new Error(`Final inline JavaScript ${i + 1} failed syntax check:\n${result.stderr}`);
}

console.log('Applied final V2 employee UI cleanup.');
console.log('Reimbursement status capability retained but hidden.');
console.log('Mobile date controls constrained at the native input level.');
console.log(`Inline scripts rechecked: ${scripts.length}`);
