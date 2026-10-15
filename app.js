const categories = {
  plastic: {
    label: "Plastic packaging",
    item: "Clear plastic bottle",
    icon: "♧",
    advice: "Empty and rinse it. Check whether your local program accepts this packaging; reuse it when practical.",
    explanation: "This demo classifies the sample as plastic packaging. The prototype rule suggests emptying and rinsing it, then checking local acceptance. No local collection rule has been verified.",
    kind: "Recyclable / reusable",
    sampleCaption: "SAMPLE ITEM · PLASTIC BOTTLE",
  },
  paper: {
    label: "Paper / cardboard",
    item: "Cardboard box",
    icon: "▤",
    advice: "Keep it clean and dry, flatten it if useful, and check whether your local collection accepts it.",
    explanation: "This sample is marked as paper/cardboard. The prototype rule recommends keeping it clean and dry and checking local collection guidance, especially if it is coated or soiled.",
    kind: "Recyclable / reusable",
    sampleCaption: "SAMPLE ITEM · CARDBOARD",
  },
  metal: {
    label: "Metal",
    item: "Metal container",
    icon: "▱",
    advice: "Empty and rinse it. Check whether your local program accepts this type of metal container.",
    explanation: "This category comes from a manual/demo review. The prototype rule suggests emptying and rinsing the item, then checking local acceptance; it does not verify the material composition.",
    kind: "Recyclable / reusable",
    sampleCaption: "REVIEWED ITEM · METAL",
  },
  glass: {
    label: "Glass",
    item: "Glass container",
    icon: "◯",
    advice: "If intact, check local glass collection guidance. Do not handle broken glass; follow local safety instructions.",
    explanation: "This category is a manual/demo review, not a verified material test. Intact and broken glass can require different handling; use local safety guidance.",
    kind: "Recyclable / reusable",
    sampleCaption: "REVIEWED ITEM · GLASS",
  },
  organic: {
    label: "Organic / food scraps",
    item: "Food scraps",
    icon: "◒",
    advice: "Keep food scraps out of mixed recycling. Use a locally approved food-waste or compost option if available.",
    explanation: "This demo category is organic/food scraps. The prototype rule keeps food waste separate from mixed recycling and asks you to confirm whether an approved compost or food-waste service is available.",
    kind: "Biodegradable",
    sampleCaption: "SAMPLE ITEM · FOOD SCRAPS",
  },
  hazardous: {
    label: "Potentially hazardous",
    item: "Household battery",
    icon: "▣",
    advice: "Do not place it in household recycling or general waste. Avoid handling a damaged battery and check an authorized local drop-off.",
    explanation: "This is a conservative special-handling path, not a visual hazard diagnosis. Do not put batteries in household recycling. For damaged, leaking or unknown items, avoid handling them and contact an appropriate local authority.",
    kind: "Needs special handling",
    sampleCaption: "SAMPLE ITEM · BATTERY",
  },
  unknown: {
    label: "Needs review",
    item: "Unidentified item",
    icon: "?",
    advice: "No confident category or configured local rule is available. Do not guess; check with your local waste service.",
    explanation: "The prototype could not establish a reliable category. It intentionally avoids giving a specific disposal instruction without a reviewed category and applicable local rule.",
    kind: "Needs review",
    sampleCaption: "MANUAL REVIEW · UNKNOWN",
  },
};

const stageOrder = ["identified", "sorted", "recovery", "reuse"];
const stageLabels = { identified: "Identified", sorted: "Sorted", recovery: "Recovery", reuse: "Reuse" };
const storageKey = "ecosnapai-material-records-v1";
let currentCategory = "plastic";
let currentIsSample = true;
let currentPhotoUrl = "";
let currentPhotoName = "";
let currentPhotoFile = null;
let currentSource = "sample";
let currentAiAnalysis = null;
let currentAnalysisModel = "";
let currentAnalysisAt = "";
let currentReportThumbnail = "";
let generatedReport = "";
let modelConfigured = false;
let records = [];
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const toast = $("#toast");

function announce(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function loadRecords() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.some((record) =>
      !record || typeof record.id !== "string" || !categories[record.category] ||
      !stageOrder.includes(record.status) || !Array.isArray(record.events) ||
      typeof record.itemName !== "string" || typeof record.createdAt !== "string" ||
      Number.isNaN(Date.parse(record.createdAt)) ||
      (record.analysisAt != null && Number.isNaN(Date.parse(record.analysisAt))) ||
      (record.analysisModel != null && typeof record.analysisModel !== "string") ||
      (record.photoThumbnail !== undefined &&
        record.photoThumbnail != null && record.photoThumbnail !== "" &&
        (typeof record.photoThumbnail !== "string" ||
          !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(record.photoThumbnail) ||
          record.photoThumbnail.length > 70000)) ||
      !["sample", "manual-review", "ai-model"].includes(record.source) ||
      !record.events.every((entry) =>
        entry && stageOrder.includes(entry.status) && typeof entry.at === "string" &&
        !Number.isNaN(Date.parse(entry.at)) && typeof entry.note === "string"
      )
    )) {
      throw new Error("Saved material data is not in the expected format.");
    }
    return parsed;
  } catch (error) {
    console.error("EcoSnapAI could not load saved materials.", error);
    announce("Saved records could not be read. Clear this site's stored data to start fresh.");
    return [];
  }
}

function persistRecords() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("EcoSnapAI could not save material records.", error);
    announce("Could not save this item in your browser. Check storage settings and try again.");
    return false;
  }
}

function setSample(category) {
  if (currentPhotoUrl) {
    URL.revokeObjectURL(currentPhotoUrl);
    currentPhotoUrl = "";
  }
  currentCategory = category;
  currentIsSample = true;
  currentSource = "sample";
  currentAiAnalysis = null;
  currentAnalysisModel = "";
  currentAnalysisAt = "";
  currentReportThumbnail = "";
  currentPhotoName = "";
  currentPhotoFile = null;
  $("#photo-input").value = "";
  $("#manual-review").hidden = true;
  $("#photo-preview").hidden = true;
  $("#photo-preview").removeAttribute("src");
  $("#item-illustration").hidden = false;
  $("#item-illustration").className = `item-illustration ${category === "plastic" ? "bottle-illustration" : "sample-illustration"}`;
  $("#item-illustration").textContent = category === "plastic" ? "" : categories[category].icon;
  document.querySelectorAll("[data-sample]").forEach((button) => {
    const active = button.dataset.sample === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("#result-mode").textContent = "DEMO FIXTURE";
  $("#analyze-photo").disabled = true;
  $("#result-disclaimer").textContent = "Sample output for demonstration. Not a live computer-vision prediction or verified local disposal advice.";
  renderResult();
}

function renderResult() {
  const item = categories[currentCategory];
  $("#result-category").textContent = item.label;
  const configuredLocation = $("#location-select").value !== "unconfigured";
  $("#result-advice").textContent = currentAiAnalysis
    ? currentAiAnalysis.action
    : !configuredLocation
      ? "Local rules are not configured for this location. Use a local authority's guidance before disposing of this item."
      : item.advice;
  $("#confidence-badge").textContent = currentAiAnalysis
    ? `${currentAiAnalysis.needsReview ? "Needs human review" : "AI estimate"} · ${Math.round(currentAiAnalysis.confidence * 100)}%`
    : currentIsSample ? "Demo fixture · not model output" : "Manual review · no confidence score";
  $("#preview-caption").textContent = currentPhotoName
    ? `PHOTO PREVIEW · ${currentPhotoName}`.toUpperCase()
    : item.sampleCaption;
  $("#rule-source").textContent = currentAiAnalysis
    ? "Gemini visual estimate · not a verified local recycling rule"
    : !configuredLocation
      ? "No applicable local rule configured · location-specific advice withheld"
      : "Prototype rule · Campus demo rules (unverified)";
  $("#ai-report").hidden = !currentAiAnalysis;
  if (currentAiAnalysis) {
    $("#ai-report-content").replaceChildren();
    [
      ["Identified item", currentAiAnalysis.itemName],
      ["Category", item.label],
      ["Visible material", currentAiAnalysis.material],
      ["Condition", currentAiAnalysis.condition],
      ["Visual confidence", `${Math.round(currentAiAnalysis.confidence * 100)}%${currentAiAnalysis.needsReview ? " · human review recommended" : ""}`],
      ["Visible evidence", currentAiAnalysis.explanation],
      ["Suggested next step", currentAiAnalysis.action],
      ["Preparation", currentAiAnalysis.preparation],
      ["Reuse possibility", currentAiAnalysis.reuseOption],
      ["Safety note", currentAiAnalysis.caveat],
    ].forEach(([label, value]) => {
      const paragraph = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      paragraph.append(strong, document.createTextNode(value));
      $("#ai-report-content").append(paragraph);
    });
  }
  $("#explanation").hidden = true;
  $("#explanation").textContent = "";
}

function handlePhoto(file) {
  if (!file) return;
  const supported = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (!supported) {
    announce("Unsupported image. Choose a PNG, JPG or WebP file.");
    $("#photo-input").value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    announce("That image is larger than 5 MB. Choose a smaller photo.");
    $("#photo-input").value = "";
    return;
  }
  if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
  currentPhotoUrl = URL.createObjectURL(file);
  currentPhotoName = file.name;
  currentPhotoFile = file;
  currentCategory = "unknown";
  currentIsSample = false;
  currentSource = "manual-review";
  currentAiAnalysis = null;
  currentAnalysisModel = "";
  currentAnalysisAt = "";
  currentReportThumbnail = "";
  $("#analyze-photo").disabled = !modelConfigured;
  $("#photo-preview").src = currentPhotoUrl;
  $("#photo-preview").hidden = false;
  $("#item-illustration").hidden = true;
  $("#manual-review").hidden = false;
  document.querySelectorAll("[data-sample]").forEach((button) => {
    button.classList.remove("active");
    button.setAttribute("aria-pressed", "false");
  });
  $("#result-mode").textContent = "LOCAL PREVIEW";
  $("#result-category").textContent = "Choose a category";
  $("#result-advice").textContent = "This photo has not been classified by a model. Review it manually to see prototype guidance.";
  $("#confidence-badge").textContent = "No model prediction";
  $("#preview-caption").textContent = `PHOTO PREVIEW · ${file.name}`.toUpperCase();
  $("#rule-source").textContent = "Prototype rule · selected category and demo context";
  $("#result-disclaimer").textContent = "Photo preview only; no model result yet. Choose Analyze photo with Gemini or review the category manually.";
  $("#explanation").hidden = true;
}

function reviewPhoto() {
  currentCategory = $("#manual-category").value;
  currentIsSample = false;
  currentSource = "manual-review";
  currentAiAnalysis = null;
  currentAnalysisModel = "";
  currentAnalysisAt = "";
  currentReportThumbnail = "";
  $("#result-mode").textContent = "MANUAL REVIEW";
  renderResult();
  $("#result-disclaimer").textContent = "Manual category review. Not a computer-vision prediction; no confidence score is available.";
}

function saveScan() {
  if (currentSource === "manual-review" && !currentPhotoName && currentCategory === "unknown") {
    announce("Choose a sample or upload a photo before saving this item.");
    return;
  }
  const item = categories[currentCategory];
  const now = new Date().toISOString();
  const record = {
    id: window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: currentCategory,
    itemName: currentAiAnalysis?.itemName || currentPhotoName || item.item,
    source: currentSource,
    location: $("#location-select").value,
    status: stageOrder[0],
    createdAt: now,
    analysisAt: currentSource === "ai-model" ? currentAnalysisAt : null,
    analysisModel: currentSource === "ai-model" ? currentAnalysisModel : null,
    photoThumbnail: currentSource === "ai-model" ? currentReportThumbnail : "",
    aiSummary: currentAiAnalysis ? {
      itemName: currentAiAnalysis.itemName,
      material: currentAiAnalysis.material,
      condition: currentAiAnalysis.condition,
      confidence: currentAiAnalysis.confidence,
      needsReview: currentAiAnalysis.needsReview,
      hazardous: currentAiAnalysis.hazardous,
      action: currentAiAnalysis.action,
      preparation: currentAiAnalysis.preparation,
      reuseOption: currentAiAnalysis.reuseOption,
      explanation: currentAiAnalysis.explanation,
      caveat: currentAiAnalysis.caveat,
    } : null,
    events: [{ status: stageOrder[0], at: now, note: "Material record created" }],
  };
  const previousRecords = records;
  let retainedThumbnails = 0;
  records = [record, ...records].map((savedRecord) => {
    if (!savedRecord.photoThumbnail) return savedRecord;
    retainedThumbnails += 1;
    return retainedThumbnails <= 4 ? savedRecord : { ...savedRecord, photoThumbnail: "" };
  });
  if (!persistRecords()) {
    records = previousRecords;
    return;
  }
  renderDashboard();
  updateTwinJourney();
  announce("Saved to your material twin in this browser.");
  $("#dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function advanceRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    announce("That material record is no longer available. Refresh the list and try again.");
    return;
  }
  const currentIndex = stageOrder.indexOf(record.status);
  if (currentIndex < 0 || currentIndex === stageOrder.length - 1) return;
  const nextStatus = stageOrder[currentIndex + 1];
  record.status = nextStatus;
  record.events.push({ status: nextStatus, at: new Date().toISOString(), note: `Simulated transition to ${stageLabels[nextStatus]}` });
  if (!persistRecords()) {
    record.status = stageOrder[currentIndex];
    record.events.pop();
    return;
  }
  renderDashboard();
  updateTwinJourney();
  announce(`Journey moved to ${stageLabels[nextStatus]}. This transition is simulated.`);
}

function updateTwinJourney() {
  const latest = [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const stages = document.querySelectorAll(".journey-stage");
  const connectors = document.querySelectorAll(".journey-connector");
  const advance = $("#advance-latest");
  if (!latest) {
    stages.forEach((stage, index) => {
      stage.classList.toggle("current", index === 0);
      stage.classList.remove("complete");
    });
    connectors.forEach((connector) => connector.classList.remove("complete"));
    $("#twin-latest").innerHTML = "<i></i> Save an item to begin its journey";
    advance.disabled = true;
    delete advance.dataset.recordId;
    return;
  }
  const currentIndex = stageOrder.indexOf(latest.status);
  stages.forEach((stage, index) => {
    stage.classList.toggle("current", index === currentIndex);
    stage.classList.toggle("complete", index < currentIndex);
  });
  connectors.forEach((connector, index) => connector.classList.toggle("complete", index < currentIndex));
  $("#twin-latest").innerHTML = `<i></i> Latest: ${escapeHtml(latest.itemName)} · ${stageLabels[latest.status]}`;
  advance.disabled = currentIndex >= stageOrder.length - 1;
  advance.dataset.recordId = latest.id;
  advance.textContent = currentIndex >= stageOrder.length - 1 ? "Journey complete" : "Advance latest item →";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderDashboard() {
  const statusFilter = $("#status-filter").value;
  const categoryFilter = $("#category-filter").value;
  const dateFilter = $("#date-filter").value;
  const filtered = records.filter((record) => {
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
    const matchesDate = !dateFilter || record.createdAt.slice(0, 10) >= dateFilter;
    return matchesStatus && matchesCategory && matchesDate;
  });
  $("#metric-total").textContent = String(records.length);
  $("#metric-review").textContent = String(records.filter((record) => record.category === "unknown" || record.source === "manual-review" || record.aiSummary?.needsReview).length);
  $("#metric-recovery").textContent = String(records.filter((record) => record.status === "recovery").length);
  $("#metric-reuse").textContent = String(records.filter((record) => record.status === "reuse").length);
  renderCategoryBreakdown();
  $("#history-count").textContent = `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;
  const list = $("#material-list");
  list.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "↻";
    const title = document.createElement("strong");
    title.textContent = records.length ? "No saved materials at this stage." : "Your material journey starts with a scan.";
    const copy = document.createElement("p");
    copy.textContent = records.length ? "Choose another journey stage to see your records." : "Save a sample item above and it will appear here.";
    empty.append(icon, title, copy);
    list.append(empty);
    return;
  }
  filtered.forEach((record) => {
    const item = categories[record.category];
    const row = document.createElement("article");
    row.className = "material-row";
    const name = document.createElement("div");
    name.className = "material-name";
    const icon = document.createElement("span");
    icon.className = "material-symbol";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.icon;
    const nameText = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = record.itemName;
    const subtitle = document.createElement("small");
    const sourceLabel = record.source === "ai-model"
      ? `AI-assisted estimate${Number.isFinite(record.aiSummary?.confidence) ? ` · ${Math.round(record.aiSummary.confidence * 100)}%` : ""}`
      : record.source === "manual-review" ? "manual review" : "sample data";
    subtitle.textContent = `${item.label} · ${sourceLabel}`;
    nameText.append(title, subtitle);
    name.append(icon, nameText);
    const date = document.createElement("span");
    date.className = "material-meta";
    date.textContent = new Date(record.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const location = document.createElement("span");
    location.className = "material-meta";
    location.textContent = record.location === "demo-campus" ? "Campus demo · unverified" : "Local rules not configured";
    const status = document.createElement("span");
    status.className = "stage-pill";
    status.dataset.stage = record.status;
    status.textContent = stageLabels[record.status];
    const action = document.createElement("button");
    action.className = "row-action";
    action.type = "button";
    action.dataset.advance = record.id;
    action.textContent = record.status === "reuse" ? `${record.events.length} events · complete` : "Advance demo stage →";
    action.disabled = record.status === "reuse";
    action.setAttribute("aria-label", record.status === "reuse" ? `${record.itemName}, journey complete with ${record.events.length} events` : `Advance ${record.itemName} to the next simulated stage`);
    const remove = document.createElement("button");
    remove.className = "row-remove";
    remove.type = "button";
    remove.dataset.remove = record.id;
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${record.itemName} from material history`);
    const history = document.createElement("details");
    history.className = "event-history";
    const summary = document.createElement("summary");
    summary.textContent = `Event history · ${record.events.length}`;
    const eventList = document.createElement("ul");
    record.events.forEach((event) => {
      const entry = document.createElement("li");
      const time = new Date(event.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      entry.textContent = `${time} — ${event.note}`;
      eventList.append(entry);
    });
    history.append(summary, eventList);
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(action, remove);
    row.append(name, date, location, status, actions, history);
    list.append(row);
  });
}

function renderCategoryBreakdown() {
  const container = $("#category-breakdown");
  container.replaceChildren();
  $("#breakdown-total").textContent = `${records.length} ${records.length === 1 ? "item" : "items"}`;
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "breakdown-empty";
    empty.textContent = "Your material categories will appear here after your first scan.";
    container.append(empty);
    return;
  }
  const counts = Object.keys(categories)
    .map((key) => ({ key, count: records.filter((record) => record.category === key).length }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
  const max = Math.max(...counts.map((entry) => entry.count));
  counts.forEach(({ key, count }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "breakdown-category";
    button.dataset.filterCategory = key;
    button.setAttribute("aria-label", `Filter history by ${categories[key].label}: ${count} ${count === 1 ? "item" : "items"}`);
    const label = document.createElement("span");
    label.className = "breakdown-category-label";
    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = categories[key].icon;
    const text = document.createElement("span");
    text.textContent = categories[key].label;
    label.append(icon, text);
    const bar = document.createElement("span");
    bar.className = "breakdown-track";
    const fill = document.createElement("span");
    fill.className = "breakdown-fill";
    fill.style.width = `${(count / max) * 100}%`;
    bar.append(fill);
    const total = document.createElement("b");
    total.textContent = String(count);
    button.append(label, bar, total);
    container.append(button);
  });
}

function removeRecord(id) {
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) {
    announce("That material record could not be found.");
    return;
  }
  const [removed] = records.splice(index, 1);
  if (!persistRecords()) {
    records.splice(index, 0, removed);
    return;
  }
  renderDashboard();
  updateTwinJourney();
  announce("Material removed from this browser's history.");
}

function loadDemoSet() {
  if (records.some((record) => record.demoBatch === "starter")) {
    announce("The starter demo set is already in your history.");
    return;
  }
  const now = Date.now();
  const demoRecords = ["plastic", "paper", "metal", "glass", "organic", "hazardous"].map((category, index) => {
    const createdAt = new Date(now - index * 60000).toISOString();
    return {
      id: `demo-${now}-${category}`,
      category,
      itemName: categories[category].item,
      source: "sample",
      demoBatch: "starter",
      location: "demo-campus",
      status: stageOrder[index % stageOrder.length],
      createdAt,
      events: [{ status: stageOrder[index % stageOrder.length], at: createdAt, note: "Sample demo record; lifecycle stage is simulated" }],
    };
  });
  records = [...demoRecords, ...records];
  if (!persistRecords()) {
    records.splice(0, demoRecords.length);
    return;
  }
  renderDashboard();
  updateTwinJourney();
  announce("Added six sample materials so you can explore the dashboard.");
}

function exportHistory() {
  const columns = ["item", "category", "source", "location", "journey_stage", "created_at", "event_history"];
  const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = records.map((record) => [
    record.itemName,
    categories[record.category].label,
    record.source,
    record.location,
    record.status,
    record.createdAt,
    JSON.stringify(record.events),
  ].map(quote).join(","));
  const csv = [columns.map(quote).join(","), ...rows].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ecosnapai-material-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Exported ${records.length} ${records.length === 1 ? "record" : "records"} as CSV.`);
}

async function checkModelStatus() {
  const status = $("#model-status");
  try {
    const response = await fetch("/api/status");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not check the AI connection.");
    modelConfigured = result.configured === true;
    status.classList.toggle("configured", modelConfigured);
    status.querySelector("i").classList.toggle("ready", modelConfigured);
    status.querySelector("span").textContent = modelConfigured
      ? `${result.provider} ready · ${result.model}`
      : "AI not configured · saved-data reporting works offline";
    status.title = modelConfigured
      ? "Your API key is stored on the local server and is not sent to the browser."
      : "Follow the local setup steps in README.md; restart the server after adding your key.";
    $("#analyze-photo").disabled = !modelConfigured || !currentPhotoName;
    $("#report-model-note").textContent = modelConfigured
      ? `Optional Gemini narrative · ${result.model} · saved details stay local`
      : "The saved-data report works offline. Add a Gemini key for an optional AI narrative.";
    $("#generate-report").disabled = false;
  } catch (error) {
    modelConfigured = false;
    status.classList.remove("configured");
    status.querySelector("i").classList.remove("ready");
    status.querySelector("span").textContent = "AI server unavailable · local demo still works";
    $("#analyze-photo").disabled = true;
    $("#generate-report").disabled = false;
    $("#report-model-note").textContent = "The saved-data report works offline; start the local server to add Gemini narrative.";
  }
}

async function readFileAsBase64(file) {
  if (typeof createImageBitmap !== "function") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const result = reader.result;
        if (typeof result !== "string" || !result.includes(",")) {
          reject(new Error("Could not read the selected photo. Please choose it again."));
          return;
        }
        resolve({ mimeType: file.type, image: result.slice(result.indexOf(",") + 1) });
      });
      reader.addEventListener("error", () => reject(new Error("Could not read the selected photo. Please choose it again.")));
      reader.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the selected photo. Please try another image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const optimized = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not optimize the selected photo. Please try another image."));
    }, "image/jpeg", 0.8);
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error("Could not read the selected photo. Please choose it again."));
        return;
      }
      resolve({ mimeType: "image/jpeg", image: result.slice(result.indexOf(",") + 1) });
    });
    reader.addEventListener("error", () => reject(new Error("Could not read the selected photo. Please choose it again.")));
    reader.readAsDataURL(optimized);
  });
}

async function makeReportThumbnail(file) {
  if (typeof createImageBitmap !== "function") return "";
  const bitmap = await createImageBitmap(file);
  const maxDimension = 260;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare a small report thumbnail.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.48));
  if (!blob || blob.size > 50000) return "";
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the report thumbnail."));
    });
    reader.addEventListener("error", () => reject(new Error("Could not read the report thumbnail.")));
    reader.readAsDataURL(blob);
  });
  return dataUrl;
}

async function analyzePhoto() {
  const file = currentPhotoFile;
  if (!file) {
    announce("Add or take a photo before starting AI analysis.");
    return;
  }
  const button = $("#analyze-photo");
  button.disabled = true;
  button.classList.add("is-loading");
  button.dataset.originalLabel = button.textContent;
  button.textContent = "Analyzing photo…";
  $("#result-mode").textContent = "GEMINI ANALYSIS";
  $("#result-category").textContent = "Looking closely…";
  $("#result-advice").textContent = "Gemini is reviewing the image. Please wait.";
  $("#confidence-badge").textContent = "Analysis in progress";
  $("#result-disclaimer").textContent = "The image is sent to Google Gemini through the local server for this analysis.";
  $("#ai-report").hidden = true;
  try {
    const image = await readFileAsBase64(file);
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(image),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The AI analysis could not be completed.");
    currentAiAnalysis = result.analysis;
    currentCategory = result.analysis.category;
    currentSource = "ai-model";
    currentIsSample = false;
    currentAnalysisModel = result.model;
    currentAnalysisAt = new Date().toISOString();
    currentReportThumbnail = "";
    try {
      currentReportThumbnail = await makeReportThumbnail(file);
    } catch (thumbnailError) {
      console.warn("EcoSnapAI could not prepare an optional report thumbnail.", thumbnailError);
    }
    $("#result-mode").textContent = `AI VISUAL ESTIMATE · ${result.model}`;
    $("#result-disclaimer").textContent = "AI-generated visual estimate. Not a verified local rule or proof an item is recyclable. Review uncertain and hazardous items carefully.";
    renderResult();
    announce(result.analysis.needsReview ? "AI review complete — please check this uncertain result." : "AI review complete. Check local disposal rules before acting.");
  } catch (error) {
    $("#result-mode").textContent = "ANALYSIS FAILED";
    $("#result-category").textContent = "Could not analyze this photo";
    $("#result-advice").textContent = error.message || "The model request failed. Retry or choose a category manually.";
    $("#confidence-badge").textContent = "No AI result";
    $("#rule-source").textContent = "No prediction saved · photo can still be reviewed manually";
    $("#result-disclaimer").textContent = "No model result was produced. You can retry the analysis or select a category for manual review.";
    currentAiAnalysis = null;
    currentAnalysisModel = "";
    currentAnalysisAt = "";
    currentReportThumbnail = "";
    announce(error.message || "Could not analyze this photo.");
  } finally {
    button.classList.remove("is-loading");
    button.textContent = "✳ Analyze photo with Gemini ↗";
    button.disabled = !modelConfigured || !currentPhotoName;
  }
}

function showGeneratedReport(report, meta) {
  const reportId = `ECO-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  $("#report-id").textContent = reportId;
  const generatedAt = new Date().toLocaleString();
  $("#report-generated-at").textContent = generatedAt;
  generatedReport = `> Report ID: ${reportId} · Generated: ${generatedAt}\n\n${report}`;
  $("#report-meta").textContent = meta;
  $("#report-dashboard").innerHTML = renderReportDashboard(meta);
  $("#report-text").textContent = generatedReport;
  $("#report-error").hidden = true;
  $("#report-output").hidden = false;
  $("#report-output").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderReportDashboard(meta) {
  const hasAiNarrative = meta.startsWith("Generated with ");
  const aiCount = records.filter((record) => record.source === "ai-model" && record.aiSummary).length;
  const reviewCount = records.filter((record) =>
    record.category === "unknown" || record.source === "manual-review" || record.aiSummary?.needsReview
  ).length;
  const itemCards = records.length
    ? records.map((record) => {
      const category = categories[record.category];
      const estimate = record.aiSummary;
      const confidence = record.source === "ai-model" && Number.isFinite(estimate?.confidence)
        ? `${Math.round(estimate.confidence * 100)}%`
        : "Not available";
      const source = record.source === "ai-model"
        ? `AI visual estimate${record.analysisModel ? ` · ${escapeHtml(record.analysisModel)}` : ""}`
        : record.source === "manual-review" ? "Manual review" : "Sample/demo record";
      const thumbnail = record.photoThumbnail
        ? `<img class="report-item-image" src="${record.photoThumbnail}" alt="Thumbnail of analyzed ${escapeHtml(record.itemName)}" />`
        : `<div class="report-item-image report-image-empty" role="img" aria-label="No saved report image for ${escapeHtml(record.itemName)}"><span>PHOTO</span><small>Not retained</small></div>`;
      const details = estimate
        ? `<dl class="report-detail-grid">
            <div><dt>Visible material</dt><dd>${escapeHtml(estimate.material || "Not recorded")}</dd></div>
            <div><dt>Condition</dt><dd>${escapeHtml(estimate.condition || "Unknown")}</dd></div>
            <div><dt>Visible evidence</dt><dd>${escapeHtml(estimate.explanation || "Not recorded")}</dd></div>
            <div><dt>Preparation</dt><dd>${escapeHtml(estimate.preparation || "Not recorded")}</dd></div>
            <div><dt>Reuse / repair</dt><dd>${escapeHtml(estimate.reuseOption || "Not recorded")}</dd></div>
            <div><dt>Analysis time</dt><dd>${record.analysisAt ? escapeHtml(new Date(record.analysisAt).toLocaleString()) : "Not recorded"}</dd></div>
          </dl>`
        : `<p class="report-no-estimate">${record.source === "sample" ? "Demonstration fixture; not a computer-vision result." : "No AI prediction is stored for this manual review."}</p>`;
      const warning = record.category === "hazardous" || estimate?.hazardous
        ? `<p class="report-warning" role="note"><strong>Potential hazard:</strong> ${escapeHtml(estimate?.caveat || "Keep separate from ordinary waste. Do not open, test, burn, or handle damaged items; check with an authorized local service.")}</p>`
        : estimate?.needsReview || record.category === "unknown"
          ? `<p class="report-warning report-warning-review" role="note"><strong>Needs human verification:</strong> ${escapeHtml(estimate?.caveat || "The item is uncertain; do not rely on a visual estimate as a verified disposal instruction.")}</p>`
          : "";
      const action = estimate?.action || category.advice;
      const events = [...record.events].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
      const eventMarkup = events.length
        ? events.map((event) => `<li><span class="report-event-dot"></span><div><strong>${escapeHtml(stageLabels[event.status])}</strong><p>${escapeHtml(event.note)}</p><time datetime="${escapeHtml(event.at)}">${escapeHtml(new Date(event.at).toLocaleString())}</time></div></li>`).join("")
        : "<li><div><strong>No lifecycle events recorded</strong></div></li>";
      return `<article class="report-item-card">
        <div class="report-item-heading">${thumbnail}<div class="report-item-title"><span class="report-category-badge category-${record.category}">${escapeHtml(category.label)}</span><h4>${escapeHtml(record.itemName)}</h4><p>${source}</p><code>${escapeHtml(record.id)}</code></div></div>
        ${warning}
        <div class="report-item-stats"><div><span>AI confidence</span><strong>${confidence}</strong></div><div><span>Current twin stage</span><strong>${escapeHtml(stageLabels[record.status])} <small>· simulated</small></strong></div><div><span>Quantity</span><strong>Not measured <small>· 1 saved record</small></strong></div></div>
        <section class="report-subsection"><h5>Computer vision record</h5>${details}<p class="report-caption">A saved AI result is a visual estimate, not proof of material composition or recycling acceptance. ${record.analysisModel ? `Model: ${escapeHtml(record.analysisModel)}.` : "Model version was not recorded."}</p></section>
        <section class="report-subsection"><h5>Recommended next steps</h5><div class="report-recommendations"><div><span>01 · ACTION</span><p>${escapeHtml(action)}</p></div><div><span>02 · SAFE PREPARATION</span><p>${escapeHtml(estimate?.preparation || "Follow applicable local guidance; this prototype does not verify local rules.")}</p></div><div><span>03 · REUSE POSSIBILITY</span><p>${escapeHtml(estimate?.reuseOption || "Not assessed for this record.")}</p></div></div><p class="report-caption">No verified local drop-off locations are connected. Check your local authority before disposal.</p></section>
        <section class="report-subsection"><h5>Digital Twin trace <small>software simulation · not physical tracking</small></h5><ol class="report-event-list">${eventMarkup}</ol><p class="report-caption">Collection, processing facility, destination and final recovery are not connected or evidenced.</p></section>
      </article>`;
    }).join("")
    : `<div class="report-empty"><span aria-hidden="true">↻</span><h4>No saved material records yet</h4><p>Analyze an image and save the result, or save a clearly labelled sample/manual review. This report will then include its actual available details.</p><a href="#scan">Go to image analysis ↗</a></div>`;
  const categoriesMarkup = Object.keys(categories)
    .filter((category) => records.some((record) => record.category === category))
    .map((category) => `<span class="report-category-badge category-${category}">${escapeHtml(categories[category].label)} <b>${records.filter((record) => record.category === category).length}</b></span>`)
    .join("") || `<span class="report-caption">No material categories recorded.</span>`;
  return `<div class="report-cover">
    <div><span class="overline">ECOSNAPAI · SMART RECYCLING ASSISTANT</span><h2>Material <em>insight report</em></h2><p>Evidence from saved scans in this browser. AI estimates and simulated activity are identified separately.</p></div>
    <div class="report-cover-id"><span>REPORT ID</span><strong>${escapeHtml($("#report-id").textContent)}</strong><small>${escapeHtml($("#report-generated-at").textContent)}</small></div>
  </div>
  <div class="report-kpi-grid">
    <article><span>Saved material records</span><strong>${records.length}</strong><small>Observed in this browser</small></article>
    <article><span>AI visual estimates</span><strong>${aiCount}</strong><small>Not validated accuracy</small></article>
    <article><span>Needs human review</span><strong>${reviewCount}</strong><small>Uncertain, hazardous or manual</small></article>
    <article><span>Recorded lifecycle events</span><strong>${records.reduce((total, record) => total + record.events.length, 0)}</strong><small>Software simulation only</small></article>
  </div>
  <section class="report-section"><div class="report-section-heading"><div><span class="overline">01 · MATERIAL SNAPSHOT</span><h3>What was recorded</h3></div><div class="report-category-list">${categoriesMarkup}</div></div><div class="report-item-list">${itemCards}</div></section>
  <section class="report-section"><div class="report-section-heading"><div><span class="overline">02 · CIRCULARITY</span><h3>Impact, without guesswork</h3></div></div><div class="report-impact-grid"><article><span>Saved item records</span><strong>${records.length} items</strong><small>Count from this browser's saved records only.</small></article><article><span>Measured material weight</span><strong>Insufficient data</strong><small>No item weights were measured or supplied.</small></article><article><span>Diverted / recovered mass</span><strong>Insufficient data</strong><small>No collection or processing evidence is connected.</small></article><article><span>Energy / emissions benefit</span><strong>Not calculated</strong><small>No documented factor or verified outcome is available.</small></article></div><p class="report-caption">Reuse, recycling and composting can support a circular economy when the item and local pathway are verified. This prototype does not claim that a saved scan caused any environmental outcome.</p></section>
  <section class="report-section report-checklist"><div class="report-section-heading"><div><span class="overline">03 · BEFORE YOU ACT</span><h3>Action checklist</h3></div></div><ul><li>Review low-confidence, unknown and potentially hazardous classifications with a person.</li><li>Check your local waste authority for accepted materials and current drop-off options.</li><li>Do not place batteries, chemicals, medical items or other suspected hazards in ordinary recycling.</li><li>Treat all journey stages as simulated unless a real collection or processing event is independently verified.</li></ul></section>
  <details class="report-technical"><summary>Data provenance, assumptions and limitations</summary><ul><li>Saved records and event timestamps come from this browser's local storage; they are not shared across devices.</li><li>Only actual saved AI response fields are presented as computer-vision estimates. Small thumbnails for up to four recent photo records stay in this browser; photos and thumbnails are not sent with the report request.</li><li>No object bounding boxes, secondary predictions, measured weights, facility destinations or environmental calculations are implemented.</li><li>Lifecycle stages are software-simulated, not sensor-verified physical movements. Local disposal rules are not integrated.</li></ul></details>
  <section class="report-ai-narrative"><h3>${hasAiNarrative ? "Gemini-generated project narrative" : "Offline project narrative"}</h3><p>${hasAiNarrative ? "The narrative uses sanitized saved record data; per-item facts above are rendered directly from this browser's records." : "This narrative is assembled locally. Per-item facts above are rendered directly from this browser's saved records."}</p><details class="report-technical report-markdown-details"><summary>Open the ${hasAiNarrative ? "Gemini" : "offline"} narrative</summary><pre id="report-text"></pre></details></section>`;
}

function reportSafeLine(value) {
  return String(value || "").replace(/[\r\n|]+/g, " ").replace(/\s+/g, " ").trim();
}

function buildOfflineProjectReport() {
  const categoryCounts = Object.keys(categories)
    .map((category) => `- ${categories[category].label}: ${records.filter((record) => record.category === category).length}`)
    .join("\n");
  const stageCounts = stageOrder
    .map((stage) => `- ${stageLabels[stage]} (simulated): ${records.filter((record) => record.status === stage).length}`)
    .join("\n");
  const sourceCounts = [
    ["AI-assisted estimates", records.filter((record) => record.source === "ai-model").length],
    ["Manual reviews", records.filter((record) => record.source === "manual-review").length],
    ["Sample/demo records", records.filter((record) => record.source === "sample").length],
  ].map(([label, count]) => `- ${label}: ${count}`).join("\n");
  const needsReviewCount = records.filter((record) =>
    record.category === "unknown" || record.source === "manual-review" || record.aiSummary?.needsReview
  ).length;
  const itemLines = records.length
    ? records.map((record) => {
      const estimate = record.aiSummary;
      const detail = estimate
        ? `; AI visual estimate ${Number.isFinite(estimate.confidence) ? `${Math.round(estimate.confidence * 100)}% confidence` : "without a confidence score"}${estimate.needsReview ? ", human review recommended" : ""}`
        : "";
      return `- ${reportSafeLine(record.itemName) || "Unidentified item"} (ID ${reportSafeLine(record.id)}) — ${categories[record.category].label}; ${stageLabels[record.status]} (simulated); ${record.source === "ai-model" ? "AI-assisted estimate" : record.source === "manual-review" ? "manual review" : "sample data"}${detail}.`;
    }).join("\n")
    : "- No saved material records are present in this browser.";
  const aiDetails = records
    .filter((record) => record.aiSummary)
    .map((record) => {
      const summary = record.aiSummary;
      return [
        `### ${reportSafeLine(record.itemName) || "Unidentified item"}`,
        `- Visible material: ${reportSafeLine(summary.material) || "Not recorded"}`,
        `- Condition: ${reportSafeLine(summary.condition) || "Unknown"}`,
        `- Confidence: ${Number.isFinite(summary.confidence) ? `${Math.round(summary.confidence * 100)}% model estimate` : "Not recorded"}`,
        `- Model and timestamp: ${reportSafeLine(record.analysisModel) || "Not recorded"} · ${record.analysisAt ? reportSafeLine(new Date(record.analysisAt).toLocaleString()) : "timestamp not recorded"}`,
        `- Suggested next step: ${reportSafeLine(summary.action) || "Not recorded"}`,
        `- Preparation: ${reportSafeLine(summary.preparation) || "Not recorded"}`,
        `- Reuse possibility: ${reportSafeLine(summary.reuseOption) || "Not recorded"}`,
        `- Visual note: ${reportSafeLine(summary.explanation) || "Not recorded"}`,
        `- Safety caveat: ${reportSafeLine(summary.caveat) || "AI estimate only; local rules are not verified."}`,
      ].join("\n");
    }).join("\n\n");
  const twinDetails = records.length
    ? records.map((record) => [
      `### ${reportSafeLine(record.itemName) || "Unidentified item"} · ${reportSafeLine(record.id)}`,
      `- Current stage: ${stageLabels[record.status]} (software simulation; not physical tracking).`,
      ...(record.events.length
        ? record.events.map((event) => `- ${stageLabels[event.status]} · ${new Date(event.at).toLocaleString()} · ${reportSafeLine(event.note)}`)
        : ["- No lifecycle events recorded."]),
      "- Collection, processing facility, destination and final recovery: not connected or evidenced.",
    ].join("\n")).join("\n\n")
    : "No saved material twin events are available.";
  const generatedAt = new Date().toLocaleString();
  return [
    "# EcoSnapAI — Smart Recycling Assistant",
    "",
    `> Locally assembled report · ${generatedAt}. Counts come from this browser's saved records. No LLM-generated findings are included.`,
    "",
    "## Executive summary",
    `EcoSnapAI is a hackathon prototype that helps users review a waste-item photo or sample, see cautious next-step guidance, and track a simulated material journey. This browser currently contains **${records.length} saved ${records.length === 1 ? "record" : "records"}**, including **${needsReviewCount}** requiring manual or uncertain review. These counts describe this browser only; they do not show recycling outcomes or environmental impact.`,
    "",
    "## Problem and target users",
    "People may be unsure what an everyday item is made from or how to prepare it for disposal. EcoSnapAI is designed as an educational starting point for households, students, and campus demonstrations; it is not a substitute for local waste-authority instructions.",
    "",
    "## Product features and user journey",
    "Users can choose a demo item or add a photo, request a Gemini visual estimate, review a suggested action and item details, save a record to browser-local history, and move it through identified, sorted, recovery, and reuse stages. Filtering, category summaries, CSV export, record removal, and browser-local clearing are available in the dashboard. Journey stages are simulated.",
    "",
    "## AI item analysis",
    "When the user explicitly requests image analysis, an optimized image copy is sent through the local server to Gemini. The response includes a likely category, item name, visible material, condition, confidence estimate, visible evidence, a cautious next step, preparation guidance, reuse possibility, and safety caveat. These are visual estimates, not verified material tests or disposal rules.",
    "",
    aiDetails || "No AI-assisted item reports are present in the saved browser records.",
    "",
    "## Current prototype data",
    `Total saved records: ${records.length}. Records needing review: ${needsReviewCount}.`,
    "",
    "### Categories",
    categoryCounts,
    "",
    "### Journey stages",
    stageCounts,
    "",
    "### Record sources",
    sourceCounts,
    "",
    "### Saved item list",
    itemLines,
    "",
    "## Digital Twin event history",
    "The software journey is a prototype simulation; recorded events do not prove physical collection or processing.",
    "",
    twinDetails,
    "",
    "## Environmental impact",
    "- Measured weight, diverted mass, recovery rate, energy savings and emissions savings: insufficient data to calculate.",
    "- No verified collection, processing, destination or environmental calculation factor is connected.",
    "",
    "## Architecture, privacy and safety",
    "The browser interface stores records in localStorage. The Node.js server keeps the Gemini API key in the local .env file and serves the AI endpoints. Photo data is sent to Google only after the user selects AI analysis; report generation sends sanitized record metadata, not photos. The prototype does not connect to local recycling rules. Potentially hazardous items need cautious human review and should not be opened, tested, or handled based on an AI suggestion.",
    "",
    "## Limitations and assumptions",
    "Classification and confidence have not been validated for accuracy. Local rules, collection services, and actual material destinations are not integrated. Browser history is device/browser-specific, lifecycle changes are simulated, and no collection, recycling, reuse, diversion, or carbon-saving outcome is measured.",
    "",
    "## Success metrics and validation plan",
    "Evaluate material-category accuracy against a human-labeled photo set; measure the proportion of uncertain items appropriately routed to review; test whether users understand preparation guidance; measure task completion time and accessibility with representative users; and separately verify whether location-specific guidance matches current official sources. Establish baselines before reporting any improvement.",
    "",
    "## Risks and mitigations",
    "- Misclassification: show uncertainty, encourage human review, and avoid treating confidence as verified accuracy.",
    "- Unsafe handling: use conservative language for batteries and other potential hazards; direct users to appropriate local authorities.",
    "- Incorrect local guidance: clearly state that local rules are not integrated and require confirmation.",
    "- Privacy exposure: keep the API key server-side, explain when images leave the device, and avoid sending photos with reports.",
    "- Misleading impact claims: label the material journey as simulated and report only observed record counts.",
    "",
    "## Roadmap",
    "Validate the model on a representative, human-reviewed dataset; connect maintained official local-rule sources; conduct usability and accessibility testing; add durable storage only with an explicit privacy design; and evaluate any real-world collection integration before presenting operational impact.",
    "",
    "## Two-minute judge demonstration",
    "1. Select a sample item and explain that the fixture is not model output.",
    "2. Upload a non-sensitive item photo, request Gemini analysis, and inspect the visible-material, confidence, safety, and local-rule caveats.",
    "3. Save the result, show its browser-local record and category breakdown, then advance one simulated lifecycle stage.",
    "4. Generate the AI report or use this offline report, and emphasize that counts are observed prototype records while disposal outcomes and environmental impact are not measured.",
  ].join("\n");
}

function generateOfflineReport() {
  const report = buildOfflineProjectReport();
  showGeneratedReport(report, `Generated locally · based on ${records.length} saved ${records.length === 1 ? "record" : "records"} · no Gemini request`);
  announce("Offline project report generated from this browser's saved records.");
}

async function generateProjectReport() {
  const button = $("#generate-report");
  $("#report-error").hidden = true;
  button.disabled = true;
  button.classList.add("is-loading");
  button.textContent = "Building your report…";
  if (!modelConfigured) {
    const offlineReport = buildOfflineProjectReport();
    showGeneratedReport(offlineReport, `Generated locally · based on ${records.length} saved ${records.length === 1 ? "record" : "records"} · Gemini not connected`);
    $("#report-error").textContent = "Gemini is unavailable. The visual report is still built from your saved records; its AI narrative uses the verified offline version.";
    $("#report-error").hidden = false;
    button.classList.remove("is-loading");
    button.innerHTML = "<span>✳</span> Generate smart report";
    button.disabled = false;
    announce("Your report is ready using saved data; Gemini is not connected.");
    return;
  }
  try {
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: records.map(({ id, category, itemName, status, source, createdAt, analysisAt, analysisModel, events, aiSummary }) => ({
          id,
          category,
          itemName,
          status,
          source,
          createdAt,
          analysisAt,
          analysisModel,
          events,
          aiSummary,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The report could not be generated.");
    if (typeof result.report !== "string" || result.report.trim().length < 100) {
      throw new Error("The report response was incomplete. Please retry.");
    }
    showGeneratedReport(result.report, `Generated with ${result.model} · based on ${result.basedOn.recordCount} saved ${result.basedOn.recordCount === 1 ? "record" : "records"}`);
    announce("EcoSnapAI project report generated.");
  } catch (error) {
    console.error("EcoSnapAI could not generate the project report.", error);
    const reason = error instanceof TypeError && error.message === "Failed to fetch"
      ? "Could not connect to the local EcoSnapAI server. A local report was generated instead."
      : `The AI report could not be completed (${error.message || "unknown error"}). A local report was generated instead.`;
    const fallbackReport = buildOfflineProjectReport();
    showGeneratedReport(
      fallbackReport,
      `Offline fallback · based on ${records.length} saved ${records.length === 1 ? "record" : "records"} · Gemini unavailable`,
    );
    $("#report-output").hidden = false;
    $("#report-error").textContent = reason;
    $("#report-error").hidden = false;
    announce("Gemini was unavailable, so a complete offline report was generated from your saved records.");
  } finally {
    button.classList.remove("is-loading");
    button.innerHTML = "<span>✳</span> Generate smart report";
    button.disabled = false;
  }
}

async function copyReport() {
  if (!generatedReport) {
    announce("Generate the project report before copying it.");
    return;
  }
  try {
    await navigator.clipboard.writeText(generatedReport);
    announce("Report copied to clipboard.");
  } catch (error) {
    console.error("EcoSnapAI could not access the clipboard.", error);
    announce("Clipboard access failed. Use Download .md to save the report.");
  }
}

function downloadReport() {
  if (!generatedReport) {
    announce("Generate the project report before downloading it.");
    return;
  }
  const blob = new Blob([generatedReport], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ecosnapai-project-report-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce("Report downloaded as Markdown.");
}

function downloadReportData() {
  const reportData = {
    application: "EcoSnapAI Smart Recycling Assistant",
    reportId: $("#report-id").textContent || null,
    exportedAt: new Date().toISOString(),
    scope: "Records saved in this browser only. Image thumbnails are excluded from this data export.",
    records: records.map(({ photoThumbnail, ...record }) => record),
  };
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ecosnapai-analysis-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce("Saved analysis data downloaded as JSON.");
}

function previewReport() {
  if ($("#report-output").hidden) generateOfflineReport();
  $("#report-output").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#report-output").focus({ preventScroll: true });
}

function printReport() {
  if ($("#report-output").hidden) generateOfflineReport();
  window.print();
}

function clearHistory() {
  if (!records.length) {
    announce("There are no saved records to clear.");
    return;
  }
  if (!window.confirm(`Clear all ${records.length} saved material records from this browser? This cannot be undone.`)) return;
  const previousRecords = records;
  records = [];
  if (!persistRecords()) {
    records = previousRecords;
    return;
  }
  $("#status-filter").value = "all";
  $("#category-filter").value = "all";
  $("#date-filter").value = "";
  renderDashboard();
  updateTwinJourney();
  announce("Material history cleared from this browser.");
}

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => setSample(button.dataset.sample));
});
$("#photo-input").addEventListener("change", (event) => handlePhoto(event.currentTarget.files[0]));
$("#camera-input").addEventListener("change", (event) => handlePhoto(event.currentTarget.files[0]));
$("#camera-trigger").addEventListener("click", () => $("#camera-input").click());
$("#analyze-photo").addEventListener("click", analyzePhoto);
$("#reset-scan").addEventListener("click", () => {
  setSample("plastic");
  $("#location-select").value = "demo-campus";
  renderResult();
  announce("Scan reset to the plastic bottle sample.");
});
$("#review-photo").addEventListener("click", reviewPhoto);
$("#location-select").addEventListener("change", renderResult);
$("#explain-scan").addEventListener("click", () => {
  const explanation = $("#explanation");
  const item = categories[currentCategory];
  explanation.textContent = $("#location-select").value === "unconfigured"
    ? "No local rule is configured for this location, so EcoSnapAI cannot provide location-specific guidance. The explanation is based only on the reviewed category and prototype rule."
    : currentAiAnalysis
      ? `${currentAiAnalysis.explanation} ${currentAiAnalysis.caveat}`
      : item.explanation;
  explanation.hidden = false;
});
$("#save-scan").addEventListener("click", saveScan);
$("#status-filter").addEventListener("change", renderDashboard);
$("#category-filter").addEventListener("change", renderDashboard);
$("#date-filter").addEventListener("change", renderDashboard);
$("#material-list").addEventListener("click", (event) => {
  const advanceButton = event.target.closest("[data-advance]");
  if (advanceButton) advanceRecord(advanceButton.dataset.advance);
  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) removeRecord(removeButton.dataset.remove);
});
$("#category-breakdown").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter-category]");
  if (!button) return;
  $("#category-filter").value = button.dataset.filterCategory;
  renderDashboard();
  $("#materials-heading").scrollIntoView({ behavior: "smooth", block: "center" });
});
$("#advance-latest").addEventListener("click", (event) => {
  const id = event.currentTarget.dataset.recordId;
  if (id) advanceRecord(id);
});
$("#load-demo-set").addEventListener("click", loadDemoSet);
$("#export-history").addEventListener("click", exportHistory);
$("#clear-history").addEventListener("click", clearHistory);
$("#generate-report").addEventListener("click", generateProjectReport);
$("#generate-offline-report").addEventListener("click", generateOfflineReport);
$("#copy-report").addEventListener("click", copyReport);
$("#download-report").addEventListener("click", downloadReport);
$("#preview-report").addEventListener("click", previewReport);
$("#print-report").addEventListener("click", printReport);
$("#download-report-json").addEventListener("click", downloadReportData);
$(".menu-toggle").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const open = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  $("#primary-nav").classList.toggle("open", open);
});
$("#primary-nav").addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    $("#primary-nav").classList.remove("open");
    $(".menu-toggle").setAttribute("aria-expanded", "false");
    $(".menu-toggle").setAttribute("aria-label", "Open navigation");
  }
});

records = loadRecords();
setSample(currentCategory);
renderDashboard();
updateTwinJourney();
checkModelStatus();
