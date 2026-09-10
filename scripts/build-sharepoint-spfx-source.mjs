import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const prototypeDir = path.join(root, 'sharepoint-employee');
const spfxDir = path.join(root, 'sharepoint-spfx');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function mustRead(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Wrote ${path.relative(root, file)}`);
}

const generatedFiles = walk(path.join(spfxDir, 'src', 'webparts'));
const webPartFile = generatedFiles.find(file => /WebPart\.ts$/i.test(file) && !/\.d\.ts$/i.test(file));
const manifestFile = generatedFiles.find(file => /WebPart\.manifest\.json$/i.test(file));
if (!webPartFile || !manifestFile) {
  throw new Error('Could not find generated SPFx web part source/manifest.');
}
const webPartDir = path.dirname(webPartFile);
const className = path.basename(webPartFile, '.ts');

let html = mustRead(path.join(prototypeDir, 'index.html'));
const start = html.indexOf('<header class="site-header">');
const end = html.indexOf('<footer class="site-footer">');
if (start < 0 || end < 0 || end <= start) throw new Error('Could not isolate Ranch app HTML from prototype.');
html = html.slice(start, end).trim();
html = html.replace(/\s*<div class="mock-ribbon">[\s\S]*?<\/div>\s*/i, '\n');
html = html.replace(
  /<button class="secondary" type="button" onclick="document\.getElementById\('payPeriodPanel'\)\.hidden=!document\.getElementById\('payPeriodPanel'\)\.hidden">Choose Pay Period<\/button>/,
  '<button id="payPeriodToggleButton" class="secondary" type="button">Choose Pay Period</button>'
);
html = `<div class="ranch-spfx-root">${html}</div>`;

let css = `${mustRead(path.join(prototypeDir, 'app.css'))}\n${mustRead(path.join(prototypeDir, 'parity-polish.css'))}`;
css = css.replace(/^\s*:root\s*\{/m, ':host, .ranch-spfx-root {');
css = css.replace(/(^|})\s*body\s*\{/g, '$1\n.ranch-spfx-root {');
css += `\n:host{display:block;width:100%;}\n.ranch-spfx-root{width:100%;min-height:70vh;}\n.m365-bar,.sp-sitebar,.mock-ribbon{display:none!important;}\n`;

let baseLogic = mustRead(path.join(prototypeDir, 'app.js'));
let parityLogic = mustRead(path.join(prototypeDir, 'parity-polish.js'));
baseLogic = baseLogic.replace(/^\s*["']use strict["'];\s*/m, '');
parityLogic = parityLogic.replace(/^\s*["']use strict["'];\s*/m, '');

// The standalone prototype waits for DOMContentLoaded. SPFx renders after the page
// already exists, so initialization is exported and called after the shadow DOM is ready.
baseLogic = baseLogic.replace(
  /document\.addEventListener\(["']DOMContentLoaded["'],\s*\(\)=>\{bindEvents\(\);refreshDatalists\(\);resetExpenseForm\(\);renderAll\(\);\}\);?\s*$/m,
  ''
);

// Make prototype DOM queries target the SPFx shadow root instead of the SharePoint page.
baseLogic = baseLogic.replace(
  /function el\(id\)\{ return document\.getElementById\(id\); \}/,
  'function el(id){ return ranchRoot?.getElementById(id) || null; }'
);
baseLogic = baseLogic.replaceAll('document.querySelectorAll(', '(ranchRoot || document).querySelectorAll(');
baseLogic = baseLogic.replaceAll('document.getElementById(', '(ranchRoot || document).getElementById(');
baseLogic = baseLogic.replaceAll('document.addEventListener("change"', '(ranchRoot || document).addEventListener("change"');
baseLogic = baseLogic.replaceAll('document.addEventListener("click"', '(ranchRoot || document).addEventListener("click"');

// The parity layer has one document-level delegated click listener. Bind it to the
// shadow root during initialization so buttons inside SPFx remain interactive.
parityLogic = parityLogic.replace(
  /document\.addEventListener\("click", event => \{([\s\S]*?)\}\);\s*$/m,
  'function bindParityEvents(){\n  (ranchRoot || document).addEventListener("click", event => {$1});\n}'
);

const appLogic = `// @ts-nocheck\nlet ranchRoot: ShadowRoot | null = null;\n\n${baseLogic}\n\n${parityLogic}\n\nexport function initializeRanchExpenseTracker(root: ShadowRoot): void {\n  ranchRoot = root;\n  bindEvents();\n  const toggle = el("payPeriodToggleButton");\n  if (toggle) toggle.addEventListener("click", () => { const panel = el("payPeriodPanel"); if (panel) panel.hidden = !panel.hidden; });\n  refreshDatalists();\n  resetExpenseForm();\n  renderAll();\n  if (typeof bindParityEvents === "function") bindParityEvents();\n}\n`;

const htmlModule = `export const appHtml: string = ${JSON.stringify(html)};\n`;
const cssModule = `export const appCss: string = ${JSON.stringify(css)};\n`;

const webPartTs = `import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';\nimport { appHtml } from './appHtml';\nimport { appCss } from './appCss';\nimport { initializeRanchExpenseTracker } from './appLogic';\n\nexport interface IRanchExpenseTrackerWebPartProps {}\n\nexport default class ${className} extends BaseClientSideWebPart<IRanchExpenseTrackerWebPartProps> {\n  public render(): void {\n    this.domElement.innerHTML = '';\n    const host = document.createElement('div');\n    host.className = 'ranch-expense-tracker-spfx-host';\n    this.domElement.appendChild(host);\n\n    const shadow = host.attachShadow({ mode: 'open' });\n    shadow.innerHTML = '<style>' + appCss + '</style>' + appHtml;\n    initializeRanchExpenseTracker(shadow);\n  }\n\n  protected onDispose(): void {\n    this.domElement.innerHTML = '';\n  }\n}\n`;

write(path.join(webPartDir, 'appHtml.ts'), htmlModule);
write(path.join(webPartDir, 'appCss.ts'), cssModule);
write(path.join(webPartDir, 'appLogic.ts'), appLogic);
write(webPartFile, webPartTs);

const manifest = JSON.parse(mustRead(manifestFile));
manifest.supportedHosts = ['SharePointWebPart', 'SharePointFullPage'];
if (Array.isArray(manifest.preconfiguredEntries) && manifest.preconfiguredEntries[0]) {
  const entry = manifest.preconfiguredEntries[0];
  entry.title = { default: 'Ranch Expense Tracker' };
  entry.description = { default: 'Pizza Ranch employee business expense and mileage tracker' };
  entry.groupId = entry.groupId || 'cf066440-0614-43d6-98ae-0b31cf14c7c3';
  entry.group = entry.group || { default: 'Other' };
}
write(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

const packageSolutionFile = path.join(spfxDir, 'config', 'package-solution.json');
const packageSolution = JSON.parse(mustRead(packageSolutionFile));
packageSolution.solution = packageSolution.solution || {};
packageSolution.solution.name = 'ranch-expense-tracker-sharepoint-client-side-solution';
packageSolution.solution.includeClientSideAssets = true;
packageSolution.solution.skipFeatureDeployment = false;
packageSolution.solution.version = '1.0.0.0';
if (!packageSolution.paths) packageSolution.paths = {};
packageSolution.paths.zippedPackage = 'solution/ranch-expense-tracker-sharepoint.sppkg';
write(packageSolutionFile, JSON.stringify(packageSolution, null, 2) + '\n');

const readme = `# Ranch Expense Tracker — SPFx frontend package\n\nThis generated SPFx 1.23.2 project ports the employee parity prototype into a SharePoint Framework web part.\n\n## Scope\n- Frontend proof only\n- Mock/local browser data only\n- No Supabase connection\n- No SharePoint Lists or Document Library backend yet\n- Supports normal SharePoint web-part pages and SharePoint full-page host\n- Client-side assets are included in the .sppkg package\n\n## Deployable file\nAfter a successful production build, use:\n\n\`sharepoint/solution/ranch-expense-tracker-sharepoint.sppkg\`\n\nThe package should be reviewed/deployed through Pizza Ranch IT's approved SharePoint App Catalog process.\n`;
write(path.join(spfxDir, 'RANCH_DEPLOYMENT_README.md'), readme);

console.log(`Converted ${path.relative(root, webPartFile)} into Ranch Expense Tracker employee frontend.`);
