const { chromium } = require('../ui-test-run/node_modules/playwright');
const assert = require('node:assert/strict');

const sampleExpenses = [
  { id:'ui-e1', date:'2026-09-09', category:'Meals & Snacks', merchant:'Hy-Vee', amount:18.74, purpose:'Lunch while visiting Orange City for restaurant test', tag:'Beyond Oil', notes:'', details:{subcategory:'Employee travel meal'}, receiptId:'ui-r1', receiptName:'hyvee-receipt.jpg', receiptType:'image/jpeg', receiptFingerprint:'', submittedReportId:null, createdAt:'2026-09-09T17:00:00Z', updatedAt:'2026-09-09T17:00:00Z' },
  { id:'ui-e2', date:'2026-09-08', category:'Mileage', merchant:'', amount:13.6, purpose:'Sheldon to Orange City office', tag:'Field Visit', notes:'', details:{subcategory:'Mileage reimbursement', startLocation:'Sheldon, IA', destination:'Orange City, IA', miles:34}, receiptId:'ui-r2', receiptName:'route.png', receiptType:'image/png', receiptFingerprint:'', submittedReportId:null, createdAt:'2026-09-08T13:00:00Z', updatedAt:'2026-09-08T13:00:00Z' },
  { id:'ui-e3', date:'2026-09-07', category:'Supplies', merchant:'Walmart', amount:26.18, purpose:'Labels and small office supplies', tag:'Expense Tracker', notes:'', details:{subcategory:'Office supplies'}, receiptId:null, receiptName:'', receiptType:'', receiptFingerprint:'', submittedReportId:null, createdAt:'2026-09-07T18:00:00Z', updatedAt:'2026-09-07T18:00:00Z' },
  { id:'ui-e4', date:'2026-08-28', category:'Travel', merchant:'Hampton Inn', amount:164.22, purpose:'Overnight field visit', tag:'Field Visit', notes:'', details:{subcategory:'Hotel', tripLocation:'Cedar Rapids, IA'}, receiptId:'ui-r4', receiptName:'hotel.pdf', receiptType:'application/pdf', receiptFingerprint:'', submittedReportId:'ui-rpt-old', createdAt:'2026-08-28T18:00:00Z', updatedAt:'2026-08-28T18:00:00Z' }
];
const sampleReport = {
  id:'ui-rpt-old', version:'2.1.2', status:'Submitted', finalizedAt:'2026-08-31T17:00:00Z', createdAt:'2026-08-31T17:00:00Z', employeeName:'Saul Garcia', title:'August 16-31, 2026', department:'Profitability & Operations', periodStart:'2026-08-16', periodEnd:'2026-08-31', purpose:'Field visits', expenseIds:['ui-e4'], items:[sampleExpenses[3]], details:{title:'August 16-31, 2026', department:'Profitability & Operations', periodStart:'2026-08-16', periodEnd:'2026-08-31', purpose:'Field visits', employeeName:'Saul Garcia'}
};

async function prepare(page) {
  const errors=[];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error' && !/supabase|favicon|net::ERR|Failed to load resource/i.test(msg.text())) errors.push(`console: ${msg.text()}`);
  });
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.getElementById('ranchAuthGate')?.remove();
    document.getElementById('ranchStartupUpdateOverlay')?.remove();
    document.body.classList.remove('ranch-auth-gated');
  });
  await page.evaluate(({sampleExpenses,sampleReport}) => {
    const seed = document.createElement('script');
    seed.textContent = `
      settings = normalizeSettings({employeeName:'Saul Garcia', defaultDepartment:'Profitability & Operations', savedPeople:[], savedOrganizations:['Hy-Vee','Walmart','Hampton Inn'], savedLocations:['Sheldon, IA','Orange City, IA'], savedVehicles:[], savedTags:['Beyond Oil','Field Visit','Expense Tracker'], savedRoutes:[]});
      expenses = ${JSON.stringify(sampleExpenses)};
      reports = [${JSON.stringify(sampleReport)}];
      reportDraft = normalizeReportDraft({title:'September 1-15, 2026', department:'Profitability & Operations', periodStart:'2026-09-01', periodEnd:'2026-09-15', purpose:'September operating expenses', selectedExpenseIds:['ui-e1','ui-e2','ui-e3'], selectionInitialized:true});
      renderAll();
    `;
    document.body.appendChild(seed);
  }, {sampleExpenses,sampleReport});
  await page.waitForTimeout(250);
  return errors;
}

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const desktop = await browser.newPage({ viewport:{width:1440,height:1080} });
    const desktopErrors = await prepare(desktop);
    assert.equal(await desktop.locator('#dashboard').evaluate(el => el.classList.contains('active')), true);
    assert.match(await desktop.locator('#dashboardGreeting').textContent(), /Good (morning|afternoon|evening), Saul/);
    assert.equal(await desktop.locator('.nav-icon').count(), 6);
    assert.equal(await desktop.locator('.ui-recent-card').count(), 1);
    assert.equal(await desktop.locator('.ui-recent-card .expense-item').count(), 3);
    await desktop.screenshot({path:'ui-test-artifacts/dashboard-desktop.png', fullPage:true});

    await desktop.locator('button[data-view="add"]').click();
    await desktop.waitForTimeout(180);
    assert.equal(await desktop.locator('#add').getAttribute('aria-hidden'), 'false');
    assert.equal(await desktop.locator('body').evaluate(el => el.classList.contains('ui-expense-sheet-open')), true);
    const addBox = await desktop.locator('#add').boundingBox();
    assert.ok(addBox && addBox.width > 600 && addBox.width < 800);
    await desktop.selectOption('#category', {label:'Meals & Snacks'});
    await desktop.fill('#amount','22.48');
    await desktop.fill('#merchant','Pizza Ranch - Orange City');
    await desktop.fill('#purpose','Lunch during operations visit');
    await desktop.setInputFiles('#receipt', {name:'sample-receipt.png', mimeType:'image/png', buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
    await desktop.waitForTimeout(180);
    assert.equal(await desktop.locator('#receiptInlinePreview').isVisible(), true);
    assert.equal(await desktop.locator('#receiptField').evaluate(el => el.classList.contains('ui-has-file')), true);
    await desktop.screenshot({path:'ui-test-artifacts/add-expense-desktop.png'});
    await desktop.locator('.ui-sheet-close').click();

    await desktop.evaluate(() => showView('current'));
    await desktop.waitForTimeout(150);
    assert.equal(await desktop.locator('.ui-readiness-steps').count(), 1);
    assert.equal(await desktop.locator('#currentExpenseList .expense-item').count(), 3);
    await desktop.screenshot({path:'ui-test-artifacts/current-report-desktop.png', fullPage:true});

    await desktop.evaluate(() => showView('history'));
    await desktop.fill('#historySearch','Hy-Vee');
    await desktop.waitForTimeout(80);
    assert.equal(await desktop.locator('#historyList .expense-item').count(), 1);
    await desktop.fill('#historySearch','');
    await desktop.waitForTimeout(80);
    assert.equal(await desktop.locator('#historyList .expense-item').count(), 4);
    await desktop.screenshot({path:'ui-test-artifacts/all-expenses-desktop.png', fullPage:true});
    assert.deepEqual(desktopErrors, [], `Desktop errors: ${desktopErrors.join('\n')}`);

    const phone = await browser.newPage({ viewport:{width:390,height:844} });
    const phoneErrors = await prepare(phone);
    assert.equal(await phone.locator('.app-nav').evaluate(el => getComputedStyle(el).position), 'fixed');
    const navBox = await phone.locator('.app-nav').boundingBox();
    assert.ok(navBox && navBox.y > 750);
    await phone.screenshot({path:'ui-test-artifacts/dashboard-mobile.png'});

    await phone.locator('button[data-view="add"]').click();
    await phone.waitForTimeout(180);
    const mobileAddBox = await phone.locator('#add').boundingBox();
    assert.ok(mobileAddBox && mobileAddBox.width >= 389 && mobileAddBox.height > 700);
    await phone.screenshot({path:'ui-test-artifacts/add-expense-mobile.png'});
    await phone.locator('.ui-sheet-close').click();
    await phone.evaluate(() => showView('history'));
    await phone.waitForTimeout(120);
    assert.ok(await phone.locator('#historyList .expense-item.ui-collapsed').count() >= 1);
    assert.deepEqual(phoneErrors, [], `Mobile errors: ${phoneErrors.join('\n')}`);

    console.log('Premium UI browser smoke test passed on desktop and mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
