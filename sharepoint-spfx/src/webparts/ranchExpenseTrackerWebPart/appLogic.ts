/* eslint-disable */
// @ts-nocheck
let ranchRoot: ShadowRoot | null = null;

/*
  Ranch Expense Tracker — SharePoint parity prototype
  --------------------------------------------------
  This file intentionally keeps UI/business behavior separate from storage.
  The MockSharePointAdapter below is the only layer that should be replaced
  when this is moved into SPFx. In SPFx it will use the current Microsoft 365
  user plus SharePoint Lists/Document Libraries through SPHttpClient/Graph.
*/

const FIXED_MILEAGE_RATE = 0.40;
const STORAGE_KEY = "ranch.sharepointEmployeeMock.v2";
const SUBCATEGORY_OPTIONS = {
  "Auto": ["Fuel", "Rental car", "Parking", "Tolls", "Oil change", "Tires", "Car wash", "Vehicle maintenance", "Other auto"],
  "Education": ["Books", "Conference", "Course or training", "Webinar", "Other education"],
  "Meals & Snacks": ["Employee travel meal", "Meeting meal", "Vendor meal", "Franchisee meal", "Department function", "Snacks or refreshments", "Other meal"],
  "Meetings (PR Employees)": ["Employee meeting", "Department meeting", "Training meeting", "Other meeting"],
  "Supplies": ["Office supplies", "Store supplies", "Project supplies", "Equipment or smallwares", "Printing", "Other supplies"],
  "Travel": ["Hotel", "Airfare", "Baggage", "Ground transportation", "Other travel"],
  "Mileage": ["Mileage reimbursement"],
  "Other": []
};

const INITIAL_STATE = {
  employee: { id: "entra-user-mock-001", name: "Saul Garcia", email: "saul@pizzaranch.com", department: "Profitability & Operations" },
  settings: {
    savedPeople: ["Schuyler", "Jolinda"],
    savedOrganizations: ["Pizza Ranch", "Hy-Vee", "Casey's"],
    savedLocations: ["Orange City, IA", "Sheldon, IA", "Sioux City, IA"],
    savedVehicles: ["Personal vehicle"],
    savedTags: ["Beyond Oil", "NRO"],
    savedRoutes: [{ id: "route-1", start: "Sheldon, IA", destination: "Orange City, IA", miles: 34 }]
  },
  expenses: [
    { id:"exp-1", date:"2026-09-08", category:"Meals & Snacks", subcategory:"Employee travel meal", merchant:"Hy-Vee", amount:14.62, description:"Lunch while visiting a restaurant test", tag:"Beyond Oil", notes:"", receiptName:"hyvee-receipt.jpg", hasReceipt:true, submittedReportId:null, details:{} },
    { id:"exp-2", date:"2026-09-07", category:"Mileage", subcategory:"Mileage reimbursement", merchant:"", amount:13.60, description:"", tag:"Beyond Oil", notes:"", receiptName:"route.png", hasReceipt:true, submittedReportId:null, details:{ startLocation:"Sheldon, IA", destination:"Orange City, IA", miles:34 } },
    { id:"exp-3", date:"2026-08-28", category:"Supplies", subcategory:"Project supplies", merchant:"Walmart", amount:26.18, description:"", tag:"", notes:"", receiptName:"walmart.pdf", hasReceipt:true, submittedReportId:"report-aug" , details:{} }
  ],
  currentReport: { title:"", department:"Profitability & Operations", periodStart:"", periodEnd:"", purpose:"", selectedExpenseIds:["exp-1","exp-2"] },
  reports: [
    { id:"report-aug", title:"Saul August 16–31, 2026 Expenses", periodStart:"2026-08-16", periodEnd:"2026-08-31", submittedAt:"2026-08-31T17:00:00", amount:26.18, expenseIds:["exp-3"] }
  ]
};

function deepClone(value){return JSON.parse(JSON.stringify(value));}
function loadState(){
  try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):deepClone(INITIAL_STATE);}catch{return deepClone(INITIAL_STATE);}
}
let state=loadState();

const MockSharePointAdapter = {
  async getCurrentUser(){ return deepClone(state.employee); },
  async listExpenses(){ return deepClone(state.expenses); },
  async upsertExpense(expense){
    const index=state.expenses.findIndex(item=>item.id===expense.id);
    if(index>=0) state.expenses[index]=deepClone(expense); else state.expenses.push(deepClone(expense));
    persist(); return deepClone(expense);
  },
  async deleteExpense(id){ state.expenses=state.expenses.filter(item=>item.id!==id); persist(); },
  async getCurrentReport(){ return deepClone(state.currentReport); },
  async saveCurrentReport(report){ state.currentReport=deepClone(report); persist(); },
  async listReports(){ return deepClone(state.reports); },
  async finalizeReport(report){ state.reports.unshift(deepClone(report)); persist(); },
  async getSettings(){ return deepClone(state.settings); },
  async saveSettings(settings){ state.settings=deepClone(settings); persist(); },
  async uploadReceipt(file){ return { name:file?.name||"receipt", size:file?.size||0, type:file?.type||"application/octet-stream", mockDocumentLibraryPath:`/Expense Documents/${state.employee.id}/` }; }
};
window.RanchSharePointDataAdapter = MockSharePointAdapter;

function persist(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function id(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function money(value){ return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(value||0)); }
function safe(value){ return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function displayDate(value){ if(!value)return "Not specified"; const [y,m,d]=String(value).split("-").map(Number); return y&&m&&d?new Date(y,m-1,d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):value; }
function read(id){ return String((ranchRoot || document).getElementById(id)?.value??"").trim(); }
function el(id){ return ranchRoot?.getElementById(id) || null; }
function today(){ return new Date().toISOString().slice(0,10); }
function isOtherSubcategory(value){ return /^Other\b/i.test(String(value||"").trim()); }
function descriptionRequired(category,subcategory){ return category==="Education"||category==="Other"||isOtherSubcategory(subcategory); }
function showToast(message){ const toast=el("toast"); toast.textContent=message;toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),2800); }

function showView(viewId){
  (ranchRoot || document).querySelectorAll(".view").forEach(view=>view.classList.toggle("active",view.id===viewId));
  (ranchRoot || document).querySelectorAll(".nav-btn").forEach(button=>button.classList.toggle("active",button.dataset.view===viewId));
  if(viewId==="add"&&!read("date"))el("date").value=today();
  if(viewId==="current")loadReportForm();
  renderAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderIdentity(){
  const user=state.employee;
  (ranchRoot || document).querySelectorAll("[data-user-name]").forEach(node=>node.textContent=user.name);
  (ranchRoot || document).querySelectorAll("[data-user-email]").forEach(node=>node.textContent=user.email);
  (ranchRoot || document).querySelectorAll("[data-user-department]").forEach(node=>node.textContent=user.department||"No department set");
}

function categoryTotals(items){return items.reduce((out,item)=>(out[item.category]=(out[item.category]||0)+Number(item.amount||0),out),{});}
function draftExpenses(){ return state.expenses.filter(item=>!item.submittedReportId); }
function selectedExpenses(){ const ids=new Set(state.currentReport.selectedExpenseIds||[]);return draftExpenses().filter(item=>ids.has(item.id)); }
function expenseIssues(expense){
  const blocking=[];const warnings=[];
  if(!expense.date)blocking.push("Expense date is missing.");
  if(!expense.category)blocking.push("Expense category is missing.");
  if(descriptionRequired(expense.category,expense.subcategory)&&!String(expense.description||"").trim())blocking.push("Description is required for this category.");
  if(Number(expense.amount||0)<=0)blocking.push("Expense amount must be greater than zero.");
  if(expense.category==="Mileage"){
    if(!expense.details?.startLocation)blocking.push("Starting location is missing.");
    if(!expense.details?.destination)blocking.push("Destination is missing.");
    if(Number(expense.details?.miles||0)<=0)blocking.push("Mileage must be greater than zero.");
    if(!expense.hasReceipt)warnings.push("Route documentation is not attached.");
  }else{
    if(!expense.merchant)blocking.push("Merchant is missing.");
    if(!expense.hasReceipt)blocking.push("Receipt is missing.");
  }
  if(!expense.subcategory&&!['Other','Mileage'].includes(expense.category))warnings.push("A subcategory was not selected.");
  return {blocking,warnings};
}

function renderDashboard(){
  const draft=draftExpenses();const selected=selectedExpenses();const mileage=draft.filter(x=>x.category==="Mileage");
  const attention=draft.filter(x=>{const issues=expenseIssues(x);return issues.blocking.length||issues.warnings.length;}).length;
  el("dashUnreported").textContent=money(draft.reduce((s,x)=>s+Number(x.amount||0),0));
  el("dashUnreportedCount").textContent=`${draft.length} unreported expense${draft.length===1?"":"s"} stored`;
  el("dashTotal").textContent=money(selected.reduce((s,x)=>s+Number(x.amount||0),0));
  el("dashSelectedCount").textContent=`${selected.length} expense${selected.length===1?"":"s"} selected`;
  el("dashMileage").textContent=money(mileage.reduce((s,x)=>s+Number(x.amount||0),0));
  el("dashMileageMiles").textContent=`${mileage.reduce((s,x)=>s+Number(x.details?.miles||0),0).toFixed(1).replace('.0','')} miles`;
  el("dashAttention").textContent=String(attention);
  const totals=categoryTotals(selected);const summary=el("dashboardSummary");
  summary.innerHTML=Object.keys(totals).length?Object.entries(totals).map(([category,total])=>`<div class="summary-row"><span>${safe(category)}</span><strong>${money(total)}</strong></div>`).join(""):`<div class="empty-state">No expenses are selected for the current report.</div>`;
}

let activeReceiptUrl="";
function clearReceiptPreview(){ if(activeReceiptUrl){URL.revokeObjectURL(activeReceiptUrl);activeReceiptUrl="";}el("receiptInlinePreview").hidden=true;el("receiptInlinePreviewMedia").innerHTML="";el("receiptInlinePreviewName").textContent=""; }
function previewReceipt(file){
  clearReceiptPreview();if(!file)return;activeReceiptUrl=URL.createObjectURL(file);el("receiptInlinePreviewName").textContent=file.name;const media=el("receiptInlinePreviewMedia");
  if(String(file.type).startsWith("image/")){media.innerHTML=`<img src="${activeReceiptUrl}" alt="Receipt preview">`;}else if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)){media.innerHTML=`<iframe src="${activeReceiptUrl}" title="Receipt preview"></iframe>`;}else{media.innerHTML=`<div class="empty-state">${safe(file.name)}</div>`;}
  el("receiptInlinePreview").hidden=false;el("existingReceipt").textContent=`${read("category")==="Mileage"?"Route document":"Receipt"} selected: ${file.name}`;
}

function renderSubcategories(selected=""){
  const category=read("category");const field=el("subcategoryField");const select=el("subcategory");const options=SUBCATEGORY_OPTIONS[category]||[];const hide=category==="Other";
  field.hidden=hide;
  if(hide){select.disabled=true;select.innerHTML='<option value="">Not used for Other</option>';select.value="";}else{select.disabled=!options.length;select.innerHTML=options.length?`<option value="">Select a subcategory (optional)</option>${options.map(option=>`<option value="${safe(option)}">${safe(option)}</option>`).join("")}`:'<option value="">Choose a category first</option>';select.value=selected||((category==="Mileage")?"Mileage reimbursement":"");}
  updateDescriptionUI();renderDynamicFields();
}
function updateDescriptionUI(){
  const required=descriptionRequired(read("category"),read("subcategory"));const label=el("descriptionLabel");label.classList.toggle("required",required);label.innerHTML=required?'Description':'Description <span class="optional-label">Optional</span>';el("purpose").required=required;el("descriptionHelp").textContent=required?(read("category")==="Education"?"Enter the course, conference, book, certification, or training purpose.":"A clear explanation is required because this category or subcategory is broad."):"Optional for this category because the selected fields can provide the needed context.";
}
function optionList(values,selected=""){return values.map(v=>`<option ${v===selected?"selected":""}>${safe(v)}</option>`).join("");}
function inputField(idName,label,value="",opts={}){return `<div class="field ${opts.full?"full":""}"><label class="${opts.required?"required":""}" for="${idName}">${safe(label)}${opts.optional?' <span class="optional-label">Optional</span>':''}</label><input id="${idName}" type="${opts.type||'text'}" value="${safe(value)}" ${opts.step?`step="${opts.step}"`:''} ${opts.min!==undefined?`min="${opts.min}"`:''} ${opts.list?`list="${opts.list}"`:''}></div>`;}
function renderDynamicFields(existing={}){
  const category=read("category"),subcategory=read("subcategory"),details=existing.details||{};const container=el("dynamicFields");const mileage=category==="Mileage";
  el("merchantField").hidden=mileage;el("amountField").hidden=mileage;el("receiptField").classList.toggle("route-document-card",mileage);el("documentTitle").textContent=mileage?"Add route documentation":"Add receipt";el("documentHelp").textContent=mileage?"Upload a map screenshot showing the route and distance. This is recommended but will not block saving the mileage entry.":"Take a photo or choose an image/PDF. A preview appears above so you can confirm the correct receipt before saving. You can also attach it later before finalizing the report.";el("documentPickerLabel").textContent=mileage?"Choose route image":"Choose receipt";el("receiptInlinePreviewTitle").textContent=mileage?"Route document preview":"Receipt preview";
  if(mileage){const routes=state.settings.savedRoutes||[];container.innerHTML=`<div class="dynamic-card"><h3>Mileage details</h3><p>Enter the route and reimbursable miles. Accounting may use the shortest reasonable route when reviewing the entry.</p><div class="form-grid"><div class="field full"><label for="savedRoutePicker">Use a saved route</label><select id="savedRoutePicker"><option value="">Choose a route or enter one below</option>${routes.map(r=>`<option value="${safe(r.id)}">${safe(r.start)} → ${safe(r.destination)} · ${r.miles} miles</option>`).join("")}</select></div>${inputField("detailStartLocation","Starting location",details.startLocation||"",{required:true,list:"savedLocationsList"})}${inputField("detailDestination","Destination",details.destination||"",{required:true,list:"savedLocationsList"})}${inputField("detailMiles","Total reimbursable miles",details.miles||"",{required:true,type:"number",min:0,step:"0.1"})}<div class="field full"><div class="fixed-rate-card"><div><strong>Mileage reimbursement</strong><small>${money(FIXED_MILEAGE_RATE)} per mile · fixed in this test build</small></div><span id="mileagePreview">${money(Number(details.miles||0)*FIXED_MILEAGE_RATE)}</span></div><div class="document-mode-note">Route documentation is recommended. If none is attached, Accounting can verify the shortest reasonable route.</div></div></div></div>`;
    el("savedRoutePicker").addEventListener("change",e=>{const route=routes.find(r=>r.id===e.target.value);if(route){el("detailStartLocation").value=route.start;el("detailDestination").value=route.destination;el("detailMiles").value=route.miles;updateMileagePreview();}});el("detailMiles").addEventListener("input",updateMileagePreview);return;
  }
  if(category==="Other"||!category){container.innerHTML="";return;}
  if(!subcategory){container.innerHTML='<div class="dynamic-card"><h3>Choose a subcategory</h3><p>Selecting a subcategory will show only the follow-up fields that may apply.</p></div>';return;}
  let fields="";
  if(category==="Auto"&&["Oil change","Tires","Car wash","Vehicle maintenance"].includes(subcategory))fields=inputField("detailVehicle","Vehicle",details.vehicle||"",{optional:true,list:"savedVehiclesList"});
  if(category==="Meals & Snacks"&&subcategory==="Meeting meal")fields=inputField("detailAttendees","Attendees",details.attendees||"",{optional:true,list:"savedPeopleList"});
  if(category==="Meals & Snacks"&&["Vendor meal","Franchisee meal"].includes(subcategory))fields=inputField("detailOrganization","Vendor, franchise, or organization",details.organization||"",{optional:true,list:"savedOrganizationsList"});
  if(category==="Meetings (PR Employees)")fields=inputField("detailAttendees","PR employee names",details.attendees||"",{optional:true,list:"savedPeopleList"});
  container.innerHTML=fields?`<div class="dynamic-card"><h3>${safe(subcategory)} details</h3><p>Only the fields that may help explain this type of expense are shown.</p><div class="form-grid">${fields}</div></div>`:"";
}
function updateMileagePreview(){const miles=Number(read("detailMiles")||0);if(el("mileagePreview"))el("mileagePreview").textContent=money(miles*FIXED_MILEAGE_RATE);updateExpenseSubmitButton();}
function updateExpenseSubmitButton(){const edit=read("expenseId");if(edit){el("saveExpenseButton").textContent="Save changes";return;}const amount=read("category")==="Mileage"?Number(read("detailMiles")||0)*FIXED_MILEAGE_RATE:Number(read("amount")||0);el("saveExpenseButton").textContent=amount>0?`Create ${money(amount)} expense`:"Create expense";}

function collectDetails(){const details={};["detailVehicle","detailAttendees","detailOrganization","detailStartLocation","detailDestination","detailMiles"].forEach(key=>{if(el(key)){const outKey=key.replace(/^detail/,"");const normalized=outKey.charAt(0).toLowerCase()+outKey.slice(1);details[normalized]=key==="detailMiles"?Number(read(key)||0):read(key);}});return details;}
async function saveExpense(event){
  event.preventDefault();el("formError").hidden=true;const category=read("category"),subcategory=read("subcategory"),details=collectDetails(),existing=state.expenses.find(x=>x.id===read("expenseId"));const mileage=category==="Mileage";const amount=mileage?Number(details.miles||0)*FIXED_MILEAGE_RATE:Number(read("amount")||0);const file=el("receipt").files?.[0];
  const expense={id:existing?.id||id("expense"),date:read("date"),category,subcategory,merchant:mileage?"":read("merchant"),amount:Math.round(amount*100)/100,description:read("purpose"),tag:read("expenseTag"),notes:read("notes"),details,receiptName:file?.name||existing?.receiptName||"",hasReceipt:Boolean(file||existing?.hasReceipt),submittedReportId:existing?.submittedReportId||null};
  const errors=[];if(!expense.date)errors.push("Enter the expense date.");if(!category)errors.push("Choose an expense category.");if(descriptionRequired(category,subcategory)&&!expense.description)errors.push("Enter a description for this category.");if(mileage){if(!details.startLocation)errors.push("Enter the mileage starting location.");if(!details.destination)errors.push("Enter the mileage destination.");if(Number(details.miles||0)<=0)errors.push("Enter mileage greater than zero.");}else{if(!expense.merchant)errors.push("Enter the merchant or provider.");if(amount<=0)errors.push("Enter an amount greater than zero.");}
  if(errors.length){el("formError").innerHTML=errors.map(x=>`<div>• ${safe(x)}</div>`).join("");el("formError").hidden=false;return;}
  if(file)await MockSharePointAdapter.uploadReceipt(file);await MockSharePointAdapter.upsertExpense(expense);if(!existing&&!state.currentReport.selectedExpenseIds.includes(expense.id))state.currentReport.selectedExpenseIds.push(expense.id);learnDefaults(expense);persist();resetExpenseForm();renderAll();showToast("Expense saved in the SharePoint prototype.");showView("add");
}
function learnDefaults(expense){const add=(key,value)=>{value=String(value||"").trim();if(!value)return;state.settings[key]=[...new Set([...(state.settings[key]||[]),value])].sort();};add("savedOrganizations",expense.merchant);add("savedTags",expense.tag);add("savedVehicles",expense.details?.vehicle);add("savedOrganizations",expense.details?.organization);add("savedLocations",expense.details?.startLocation);add("savedLocations",expense.details?.destination);String(expense.details?.attendees||"").split(/[,;\n]+/).forEach(v=>add("savedPeople",v));}
function resetExpenseForm(){el("expenseForm").reset();el("expenseId").value="";el("formTitle").textContent="Add Expense";el("date").value=today();el("existingReceipt").textContent="";clearReceiptPreview();renderSubcategories();el("merchantField").hidden=false;el("amountField").hidden=false;el("receiptField").classList.remove("route-document-card");el("documentTitle").textContent="Add receipt";el("documentPickerLabel").textContent="Choose receipt";updateDescriptionUI();updateExpenseSubmitButton();}
function editExpense(expenseId){const expense=state.expenses.find(x=>x.id===expenseId);if(!expense||expense.submittedReportId)return;showView("add");el("formTitle").textContent="Edit Expense";el("expenseId").value=expense.id;el("date").value=expense.date;el("category").value=expense.category;renderSubcategories(expense.subcategory);el("merchant").value=expense.merchant||"";el("amount").value=expense.category==="Mileage"?"":expense.amount;el("purpose").value=expense.description||"";el("expenseTag").value=expense.tag||"";el("notes").value=expense.notes||"";renderDynamicFields(expense);el("existingReceipt").textContent=expense.hasReceipt?`Current ${expense.category==="Mileage"?"route document":"receipt"}: ${expense.receiptName||"attached document"}. Choose a new file only to replace it.`:"No receipt attached yet.";updateExpenseSubmitButton();}
async function deleteExpense(expenseId){const expense=state.expenses.find(x=>x.id===expenseId);if(!expense||expense.submittedReportId)return;if(!confirm(`Delete ${expense.merchant||expense.category} for ${money(expense.amount)}?`))return;await MockSharePointAdapter.deleteExpense(expenseId);state.currentReport.selectedExpenseIds=state.currentReport.selectedExpenseIds.filter(id=>id!==expenseId);persist();renderAll();showToast("Expense deleted.");}

function detailText(expense){const d=expense.details||{};const parts=[];if(expense.tag)parts.push(`Tag: ${expense.tag}`);if(expense.subcategory)parts.push(expense.subcategory);if(expense.category==="Mileage")parts.push(`${d.startLocation||""} → ${d.destination||""}`,`${Number(d.miles||0).toLocaleString()} miles at ${money(FIXED_MILEAGE_RATE)}/mile`);if(d.vehicle)parts.push(`Vehicle: ${d.vehicle}`);if(d.attendees)parts.push(`Attendees: ${d.attendees}`);if(d.organization)parts.push(`Organization: ${d.organization}`);return parts.filter(Boolean).join(" | ");}
function expenseCard(expense,opts={}){const locked=Boolean(expense.submittedReportId);const checked=state.currentReport.selectedExpenseIds.includes(expense.id);const issues=expenseIssues(expense);return `<article class="expense-item"><div class="expense-topline">${opts.selectable?`<input class="report-select" type="checkbox" data-select-expense="${safe(expense.id)}" ${checked?"checked":""} aria-label="Include expense">`:''}<span class="status-badge ${locked?'submitted':issues.blocking.length?'warn':'good'}">${locked?'Submitted':issues.blocking.length?'Needs attention':'Draft'}</span><span class="expense-title">${safe(expense.category==="Mileage"?`${expense.details?.startLocation||'Mileage'} → ${expense.details?.destination||''}`:expense.merchant||expense.category)}</span><span class="amount">${money(expense.amount)}</span></div><div class="expense-meta">${displayDate(expense.date)} · ${safe(expense.category)}${expense.description?` · ${safe(expense.description)}`:''}${detailText(expense)?`<br>${safe(detailText(expense))}`:''}<br>${expense.hasReceipt?`Supporting document: ${safe(expense.receiptName||'Attached')}`:'No supporting document attached'}</div>${opts.actions&&!locked?`<div class="expense-actions"><button class="secondary small-button" data-edit-expense="${safe(expense.id)}">Edit</button><button class="danger small-button" data-delete-expense="${safe(expense.id)}">Delete</button></div>`:''}</article>`;}
function renderHistory(){const search=read("historySearch").toLowerCase(),category=read("historyCategory"),tag=read("historyTag"),stateFilter=read("historyState");const items=state.expenses.filter(expense=>{const hay=[expense.date,expense.category,expense.subcategory,expense.merchant,expense.description,expense.tag,detailText(expense)].join(" ").toLowerCase();if(search&&!hay.includes(search))return false;if(category&&expense.category!==category)return false;if(tag&&expense.tag!==tag)return false;if(stateFilter==="draft"&&expense.submittedReportId)return false;if(stateFilter==="reported"&&!expense.submittedReportId)return false;return true;}).sort((a,b)=>String(b.date).localeCompare(String(a.date)));el("historyList").innerHTML=items.length?items.map(x=>expenseCard(x,{actions:true})).join(""):'<div class="empty-state">No expenses match these filters.</div>';}

function loadReportForm(){const r=state.currentReport;el("reportTitle").value=r.title||"";el("reportDepartment").value=r.department||state.employee.department||"";el("reportPeriodStart").value=r.periodStart||"";el("reportPeriodEnd").value=r.periodEnd||"";el("reportPurpose").value=r.purpose||"";}
function saveReportForm(){state.currentReport.title=read("reportTitle");state.currentReport.department=read("reportDepartment");state.currentReport.periodStart=read("reportPeriodStart");state.currentReport.periodEnd=read("reportPeriodEnd");state.currentReport.purpose=read("reportPurpose");persist();renderCurrentReport();renderDashboard();}
function filteredDraftExpenses(){const search=read("reportExpenseSearch").toLowerCase(),tag=read("reportTagFilter"),category=read("reportCategoryFilter");return draftExpenses().filter(expense=>{const hay=[expense.date,expense.category,expense.subcategory,expense.merchant,expense.description,expense.tag,detailText(expense)].join(" ").toLowerCase();return(!search||hay.includes(search))&&(!tag||expense.tag===tag)&&(!category||expense.category===category);});}
function renderCurrentReport(){if(!el("currentExpenseList"))return;const items=filteredDraftExpenses();el("currentExpenseList").innerHTML=items.length?items.map(x=>expenseCard(x,{selectable:true})).join(""):'<div class="empty-state">No unreported expenses match these filters.</div>';const selected=selectedExpenses();el("selectionSummary").textContent=`${selected.length} expense${selected.length===1?'':'s'} selected · ${money(selected.reduce((s,x)=>s+Number(x.amount||0),0))}`;const blockers=[],warnings=[];if(!state.currentReport.title)blockers.push("Enter a report name.");if(!state.currentReport.periodStart||!state.currentReport.periodEnd)blockers.push("Enter the report period.");selected.forEach(exp=>{const issues=expenseIssues(exp);issues.blocking.forEach(msg=>blockers.push(`${exp.merchant||exp.category}: ${msg}`));issues.warnings.forEach(msg=>warnings.push(`${exp.merchant||exp.category}: ${msg}`));});if(!selected.length)blockers.push("Select at least one expense.");el("readinessBadge").className=`status-badge ${blockers.length?'warn':'good'}`;el("readinessBadge").textContent=blockers.length?'Not ready':'Ready';el("readinessSummary").textContent=blockers.length?`${blockers.length} item${blockers.length===1?'':'s'} must be fixed before finalizing.`:warnings.length?`Ready with ${warnings.length} warning${warnings.length===1?'':'s'}.`:'Everything required is complete.';el("readinessIssues").innerHTML=[...blockers.map(x=>`<div class="issue blocking">${safe(x)}</div>`),...warnings.map(x=>`<div class="issue">${safe(x)}</div>`)].join("");el("currentReportTotal").textContent=money(selected.reduce((s,x)=>s+Number(x.amount||0),0));el("finalizeReportButton").disabled=Boolean(blockers.length);}
function selectAll(){state.currentReport.selectedExpenseIds=draftExpenses().map(x=>x.id);persist();renderAll();}function selectFiltered(){const set=new Set(state.currentReport.selectedExpenseIds);filteredDraftExpenses().forEach(x=>set.add(x.id));state.currentReport.selectedExpenseIds=[...set];persist();renderAll();}function clearSelection(){state.currentReport.selectedExpenseIds=[];persist();renderAll();}
function finalizeReport(){const selected=selectedExpenses();const idValue=id("report");const report={id:idValue,title:state.currentReport.title,periodStart:state.currentReport.periodStart,periodEnd:state.currentReport.periodEnd,submittedAt:new Date().toISOString(),amount:selected.reduce((s,x)=>s+Number(x.amount||0),0),expenseIds:selected.map(x=>x.id)};state.expenses=state.expenses.map(exp=>report.expenseIds.includes(exp.id)?{...exp,submittedReportId:idValue}:exp);state.reports.unshift(report);state.currentReport={title:"",department:state.employee.department||"",periodStart:"",periodEnd:"",purpose:"",selectedExpenseIds:[]};persist();showToast("Report finalized and moved to Past Reports.");showView("past");}
function csvForExpenses(items){const rows=[["Date","Category","Subcategory","Merchant","Amount","Description","Project or Trip Tag","Details","Receipt"]];items.forEach(x=>rows.push([x.date,x.category,x.subcategory||"",x.merchant||"",Number(x.amount||0).toFixed(2),x.description||"",x.tag||"",detailText(x),x.receiptName||""]));return rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\r\n");}
function downloadBlob(content,type,name){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
function downloadCurrentCsv(){downloadBlob(csvForExpenses(selectedExpenses()),"text/csv;charset=utf-8","Ranch-Expense-Report-SharePoint-Mock.csv");}
function mockPdf(){alert("PDF generation is marked for direct port from the current Ranch Expense Tracker. This parity build is validating the SharePoint UI and data model first; the production PDF engine is not connected to the mock yet.");}
function renderPast(){el("pastReportsList").innerHTML=state.reports.length?state.reports.map(report=>`<article class="report-card"><div class="report-card-head"><div><div class="eyebrow">Submitted report</div><h3>${safe(report.title)}</h3><div class="report-card-meta">${displayDate(report.periodStart)} – ${displayDate(report.periodEnd)} · ${report.expenseIds.length} expense${report.expenseIds.length===1?'':'s'}</div></div><strong>${money(report.amount)}</strong></div><div class="report-actions"><button class="primary small-button" data-past-pdf="${safe(report.id)}">Download PDF</button><button class="secondary small-button" data-past-csv="${safe(report.id)}">Download CSV</button></div></article>`).join(""):'<div class="empty-state">No finalized reports yet.</div>';}
function downloadPastCsv(reportId){const report=state.reports.find(x=>x.id===reportId);if(!report)return;downloadBlob(csvForExpenses(state.expenses.filter(x=>report.expenseIds.includes(x.id))),"text/csv;charset=utf-8",`${report.title.replace(/[^a-z0-9]+/gi,'-')}.csv`);}

function setOptions(selectId,values,allLabel){const select=el(selectId);const current=select.value;select.innerHTML=`<option value="">${allLabel}</option>${values.map(v=>`<option>${safe(v)}</option>`).join("")}`;select.value=current;}
function renderFilterOptions(){const categories=Object.keys(SUBCATEGORY_OPTIONS);const tags=[...new Set(state.expenses.map(x=>x.tag).filter(Boolean))].sort();setOptions("historyCategory",categories,"All categories");setOptions("historyTag",tags,"All tags");setOptions("reportCategoryFilter",categories,"All categories");setOptions("reportTagFilter",tags,"All tags");}
function renderSettings(){const s=state.settings;el("savedPeopleText").value=(s.savedPeople||[]).join("\n");el("savedOrganizationsText").value=(s.savedOrganizations||[]).join("\n");el("savedLocationsText").value=(s.savedLocations||[]).join("\n");el("savedVehiclesText").value=(s.savedVehicles||[]).join("\n");el("savedTagsText").value=(s.savedTags||[]).join("\n");el("savedRoutesList").innerHTML=(s.savedRoutes||[]).length?s.savedRoutes.map(r=>`<div class="saved-route-item"><span>${safe(r.start)} → ${safe(r.destination)} · ${r.miles} miles</span><button class="danger small-button" data-delete-route="${safe(r.id)}">Remove</button></div>`).join(""):'<div class="empty-state">No saved mileage routes yet.</div>';refreshDatalists();}
function splitLines(value){return [...new Set(String(value||"").split(/\n+/).map(x=>x.trim()).filter(Boolean))].sort();}
function saveDefaults(){state.settings.savedPeople=splitLines(read("savedPeopleText"));state.settings.savedOrganizations=splitLines(read("savedOrganizationsText"));state.settings.savedLocations=splitLines(read("savedLocationsText"));state.settings.savedVehicles=splitLines(read("savedVehiclesText"));state.settings.savedTags=splitLines(read("savedTagsText"));persist();renderSettings();showToast("Saved defaults updated.");}
function addRoute(){const start=read("routeStart"),destination=read("routeDestination"),miles=Number(read("routeMiles")||0);if(!start||!destination||miles<=0)return alert("Enter the starting location, destination, and miles.");state.settings.savedRoutes.push({id:id("route"),start,destination,miles});state.settings.savedLocations=[...new Set([...(state.settings.savedLocations||[]),start,destination])].sort();el("routeStart").value="";el("routeDestination").value="";el("routeMiles").value="";persist();renderSettings();showToast("Mileage route saved.");}
function refreshDatalists(){const mappings={savedPeopleList:state.settings.savedPeople,savedOrganizationsList:state.settings.savedOrganizations,savedLocationsList:state.settings.savedLocations,savedVehiclesList:state.settings.savedVehicles,savedTagsList:state.settings.savedTags};Object.entries(mappings).forEach(([idName,values])=>{el(idName).innerHTML=(values||[]).map(v=>`<option value="${safe(v)}"></option>`).join("");});}

function payPeriodDates(kind){const now=new Date();let year=now.getFullYear(),month=now.getMonth(),half=now.getDate()<=15?1:2;if(kind==="previous"){if(half===2)half=1;else{half=2;month-=1;if(month<0){month=11;year-=1;}}}const startDay=half===1?1:16;const endDay=half===1?15:new Date(year,month+1,0).getDate();const iso=d=>`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return{start:iso(startDay),end:iso(endDay),label:`${new Date(year,month,startDay).toLocaleDateString('en-US',{month:'long',day:'numeric'})}–${endDay}, ${year}`};}
function applyPayPeriod(kind){const p=payPeriodDates(kind);el("reportPeriodStart").value=p.start;el("reportPeriodEnd").value=p.end;el("reportTitle").value=`${state.employee.name.split(' ')[0]} ${p.label} Expenses`;saveReportForm();}

function renderAll(){renderIdentity();renderFilterOptions();renderDashboard();renderHistory();renderCurrentReport();renderPast();renderSettings();}
function bindEvents(){
  (ranchRoot || document).querySelectorAll(".nav-btn").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));(ranchRoot || document).querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.go)));
  el("expenseForm").addEventListener("submit",saveExpense);el("category").addEventListener("change",()=>{renderSubcategories();updateExpenseSubmitButton();});el("subcategory").addEventListener("change",()=>{updateDescriptionUI();renderDynamicFields();});el("amount").addEventListener("input",updateExpenseSubmitButton);el("receipt").addEventListener("change",e=>previewReceipt(e.target.files?.[0]));el("startOverButton").addEventListener("click",resetExpenseForm);el("cancelExpenseButton").addEventListener("click",resetExpenseForm);
  ["historySearch","historyCategory","historyTag","historyState"].forEach(idName=>{el(idName).addEventListener("input",renderHistory);el(idName).addEventListener("change",renderHistory);});["reportExpenseSearch","reportTagFilter","reportCategoryFilter"].forEach(idName=>{el(idName).addEventListener("input",renderCurrentReport);el(idName).addEventListener("change",renderCurrentReport);});["reportTitle","reportDepartment","reportPeriodStart","reportPeriodEnd","reportPurpose"].forEach(idName=>{el(idName).addEventListener("input",saveReportForm);el(idName).addEventListener("change",saveReportForm);});
  el("selectFilteredButton").addEventListener("click",selectFiltered);el("selectAllButton").addEventListener("click",selectAll);el("clearSelectionButton").addEventListener("click",clearSelection);el("downloadDraftPdfButton").addEventListener("click",mockPdf);el("downloadCurrentCsvButton").addEventListener("click",downloadCurrentCsv);el("finalizeReportButton").addEventListener("click",finalizeReport);el("currentPayPeriodButton").addEventListener("click",()=>applyPayPeriod("current"));el("previousPayPeriodButton").addEventListener("click",()=>applyPayPeriod("previous"));
  el("saveDefaultsButton").addEventListener("click",saveDefaults);el("addRouteButton").addEventListener("click",addRoute);el("resetMockButton").addEventListener("click",()=>{if(confirm("Reset the SharePoint prototype to its original sample data?")){state=deepClone(INITIAL_STATE);persist();resetExpenseForm();renderAll();showToast("Prototype reset.");}});
  (ranchRoot || document).addEventListener("change",event=>{const box=event.target.closest?.("[data-select-expense]");if(box){const set=new Set(state.currentReport.selectedExpenseIds);box.checked?set.add(box.dataset.selectExpense):set.delete(box.dataset.selectExpense);state.currentReport.selectedExpenseIds=[...set];persist();renderAll();}});
  (ranchRoot || document).addEventListener("click",event=>{const edit=event.target.closest?.("[data-edit-expense]");if(edit)return editExpense(edit.dataset.editExpense);const del=event.target.closest?.("[data-delete-expense]");if(del)return deleteExpense(del.dataset.deleteExpense);const route=event.target.closest?.("[data-delete-route]");if(route){state.settings.savedRoutes=state.settings.savedRoutes.filter(r=>r.id!==route.dataset.deleteRoute);persist();renderSettings();return;}const pastCsv=event.target.closest?.("[data-past-csv]");if(pastCsv)return downloadPastCsv(pastCsv.dataset.pastCsv);const pastPdf=event.target.closest?.("[data-past-pdf]");if(pastPdf)return mockPdf();});
}



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

function bindParityEvents(){
  (ranchRoot || document).addEventListener("click", event => {
  const button = event.target.closest?.("[data-open-document]");
  if (button) openMockDocument(button.dataset.openDocument);
});
}

export function initializeRanchExpenseTracker(root: ShadowRoot): void {
  ranchRoot = root;
  bindEvents();
  const toggle = el("payPeriodToggleButton");
  if (toggle) toggle.addEventListener("click", () => { const panel = el("payPeriodPanel"); if (panel) panel.hidden = !panel.hidden; });
  refreshDatalists();
  resetExpenseForm();
  renderAll();
  if (typeof bindParityEvents === "function") bindParityEvents();
}
