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
const assessmentQuestions = {
  plastic: [
    { key: "condition", label: "What condition is the bottle or packaging in?", options: [["intact", "Intact"], ["cracked", "Cracked"], ["broken", "Broken / sharp"], ["unknown", "Not sure"]] },
    { key: "empty", label: "Is it empty?", options: [["yes", "Yes"], ["no", "No"], ["unknown", "Not sure"]] },
    { key: "previousContents", label: "What did it contain?", options: [["water", "Water / drink"], ["food", "Food"], ["cleaner", "Cleaning product or chemical"], ["other", "Something else"], ["unknown", "Not sure"]] },
  ],
  glass: [
    { key: "condition", label: "What condition is the glass item in?", options: [["intact", "Intact"], ["cracked", "Cracked"], ["broken", "Broken / sharp"], ["unknown", "Not sure"]] },
    { key: "empty", label: "Is it empty?", options: [["yes", "Yes"], ["no", "No"], ["unknown", "Not sure"]] },
    { key: "previousContents", label: "What did it contain?", options: [["food", "Food"], ["drink", "Drink"], ["chemical", "Chemical or medicine"], ["other", "Something else"], ["unknown", "Not sure"]] },
  ],
  paper: [
    { key: "condition", label: "How does the paper or cardboard look?", options: [["clean", "Clean and dry"], ["wet", "Wet"], ["greasy", "Greasy / food-soiled"], ["unknown", "Not sure"]] },
    { key: "coating", label: "Does it appear coated or laminated?", options: [["no", "No / not visibly coated"], ["yes", "Yes"], ["unknown", "Not sure"]] },
  ],
  metal: [
    { key: "empty", label: "Is the container empty?", options: [["yes", "Yes"], ["no", "No"], ["unknown", "Not sure"]] },
    { key: "sharpEdges", label: "Does it have sharp edges?", options: [["no", "No"], ["yes", "Yes"], ["unknown", "Not sure"]] },
    { key: "pressurized", label: "Could it be pressurized (for example, an aerosol can)?", options: [["no", "No"], ["yes", "Yes"], ["unknown", "Not sure"]] },
  ],
  hazardous: [
    { key: "hazardCondition", label: "What condition is the battery or electronic item in?", options: [["normal", "Looks intact / normal"], ["damaged", "Damaged"], ["swollen", "Swollen"], ["leaking", "Leaking"], ["hot", "Unusually hot"], ["unknown", "Not sure"]] },
  ],
  organic: [
    { key: "contamination", label: "Is it mixed with packaging or other materials?", options: [["no", "No, food/yard scraps only"], ["yes", "Yes"], ["unknown", "Not sure"]] },
  ],
  unknown: [],
};
const storageKey = "ecosnapai-material-records-v1";
const themeStorageKey = "ecosnapai-theme-v1";
const themeOrder = ["light", "dark", "3d"];
const themeDetails = {
  light: { name: "Light", next: "Dark", color: "#f1f5e9" },
  dark: { name: "Dark", next: "3D", color: "#10271b" },
  "3d": { name: "3D", next: "Light", color: "#100d18" },
};
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
let reportBaseText = "";
let reportMetaText = "";
let currentAssessmentAnswers = {};
let modelConfigured = false;
let records = [];
let toastTimer;
let cameraStream = null;
let cameraRequestId = 0;

const $ = (selector) => document.querySelector(selector);
const toast = $("#toast");

function announce(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function applyTheme(theme, persist = false) {
  if (!themeOrder.includes(theme)) return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  $("meta[name='theme-color']").content = themeDetails[theme].color;
  $("#theme-toggle").dataset.iconMode = theme;
  $("#theme-name").textContent = themeDetails[theme].name;
  $("#theme-toggle").setAttribute(
    "aria-label",
    `Color theme: ${themeDetails[theme].name}. Activate to switch to ${themeDetails[theme].next}.`
  );
  $("#theme-toggle").title = `Color theme: ${themeDetails[theme].name}`;
  resetHeroTilt();
  if (persist) {
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      console.error("EcoSnapAI could not save the selected theme.", error);
      announce("Theme changed, but this browser could not save your choice.");
    }
  }
}

function cycleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
  applyTheme(next, true);
}

function updateHeroTilt(event) {
  const heroArt = document.querySelector(".hero-art");
  if (!heroArt || document.documentElement.dataset.theme !== "3d") return;
  const bounds = heroArt.getBoundingClientRect();
  const offsetX = (event.clientX - bounds.left) / bounds.width;
  const offsetY = (event.clientY - bounds.top) / bounds.height;
  const rotateY = (offsetX - 0.5) * 18;
  const rotateX = (0.5 - offsetY) * 18;
  heroArt.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
  heroArt.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
  heroArt.style.setProperty("--hero-glow-x", `${(offsetX * 100).toFixed(2)}%`);
  heroArt.style.setProperty("--hero-glow-y", `${(offsetY * 100).toFixed(2)}%`);
  heroArt.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(-1deg) scale(1.01)`;
  heroArt.style.filter = "saturate(1.08) contrast(1.02)";
}

function resetHeroTilt() {
  const heroArt = document.querySelector(".hero-art");
  if (!heroArt) return;
  heroArt.style.setProperty("--tilt-x", "0deg");
  heroArt.style.setProperty("--tilt-y", "0deg");
  heroArt.style.setProperty("--hero-glow-x", "50%");
  heroArt.style.setProperty("--hero-glow-y", "50%");
  heroArt.style.transform = "none";
  heroArt.style.filter = "none";
}

function stopCamera(closePanel = true) {
  cameraRequestId += 1;
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  const video = $("#camera-preview");
  video.pause();
  video.srcObject = null;
  video.hidden = true;
  $("#capture-photo").disabled = true;
  if (closePanel) {
    $("#camera-panel").hidden = true;
    $("#camera-message").textContent = "";
  }
}

function cameraErrorMessage(error) {
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError" || error.name === "SecurityError") {
    return "Camera permission was blocked. Allow camera access in your browser settings, or use the device camera/file picker.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No camera was found on this device. Use the device camera or choose a photo instead.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError" || error.name === "AbortError") {
    return "The camera is busy or could not be started. Close other apps using it, or choose a photo instead.";
  }
  if (error.name === "OverconstrainedError" || error.name === "TypeError") {
    return "Live camera preview is unavailable here. Use the device camera or choose a photo instead.";
  }
  return "The camera could not be started. Check browser permissions, or use the device camera/file picker.";
}

async function openCamera() {
  stopCamera();
  const requestId = ++cameraRequestId;
  const panel = $("#camera-panel");
  const message = $("#camera-message");
  panel.hidden = false;
  message.textContent = "Requesting camera access…";

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    message.textContent = "Live camera preview is not supported in this browser or page context. Use the device camera or choose a photo instead.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    if (requestId !== cameraRequestId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    cameraStream = stream;
    const video = $("#camera-preview");
    video.srcObject = stream;
    video.hidden = false;
    await video.play();
    if (requestId !== cameraRequestId || cameraStream !== stream) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    message.textContent = "Position the item in view, then capture when ready.";
    $("#capture-photo").disabled = false;
  } catch (error) {
    if (requestId !== cameraRequestId) return;
    stopCamera(false);
    panel.hidden = false;
    message.textContent = cameraErrorMessage(error);
  }
}

function captureCameraPhoto() {
  const video = $("#camera-preview");
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!cameraStream || !width || !height) {
    announce("The camera is not ready yet. Wait for the preview or choose a photo.");
    return;
  }

  const scale = Math.min(1, 1280 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    announce("Could not capture this image. Use the device camera or choose a photo instead.");
    return;
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const requestId = cameraRequestId;
  canvas.toBlob((blob) => {
    if (requestId !== cameraRequestId) return;
    if (!blob) {
      announce("Could not encode the captured image. Please try again.");
      return;
    }
    if (blob.size > 5 * 1024 * 1024) {
      canvas.toBlob((smallerBlob) => {
        if (requestId !== cameraRequestId) return;
        if (!smallerBlob || smallerBlob.size > 5 * 1024 * 1024) {
          announce("The captured photo is too large to use. Please try again or choose another image.");
          return;
        }
        handlePhoto(new File([smallerBlob], `ecosnap-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        $("#camera-input").value = "";
      }, "image/jpeg", 0.68);
      return;
    }
    const file = new File([blob], `ecosnap-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    handlePhoto(file);
    $("#camera-input").value = "";
  }, "image/jpeg", 0.88);
}

function openCameraFallback() {
  stopCamera();
  $("#camera-input").click();
}

const themePreference = window.matchMedia("(prefers-color-scheme: dark)");
themePreference.addEventListener("change", (event) => {
  try {
    if (themeOrder.includes(localStorage.getItem(themeStorageKey))) return;
  } catch (error) {
    console.error("EcoSnapAI could not read the selected theme.", error);
  }
  applyTheme(event.matches ? "dark" : "light");
});

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
      (record.assessment !== undefined && (
        !record.assessment || typeof record.assessment !== "object" ||
        !record.assessment.answers || typeof record.assessment.answers !== "object" ||
        Array.isArray(record.assessment.answers) ||
        Object.values(record.assessment.answers).some((answer) => typeof answer !== "string")
      )) ||
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
  stopCamera();
  if (currentPhotoUrl) {
    URL.revokeObjectURL(currentPhotoUrl);
    currentPhotoUrl = "";
  }
  currentCategory = category;
  currentAssessmentAnswers = {};
  currentIsSample = true;
  currentSource = "sample";
  currentAiAnalysis = null;
  currentAnalysisModel = "";
  currentAnalysisAt = "";
  currentReportThumbnail = "";
  currentPhotoName = "";
  currentPhotoFile = null;
  $("#photo-input").value = "";
  $("#camera-input").value = "";
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
  renderAssessmentPanel();
}

function handlePhoto(file) {
  if (!file) return;
  stopCamera();
  const supported = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (!supported) {
    announce("Unsupported image. Choose a PNG, JPG or WebP file.");
    $("#photo-input").value = "";
    $("#camera-input").value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    announce("That image is larger than 5 MB. Choose a smaller photo.");
    $("#photo-input").value = "";
    $("#camera-input").value = "";
    return;
  }
  if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
  currentPhotoUrl = URL.createObjectURL(file);
  currentPhotoName = file.name;
  currentPhotoFile = file;
  currentCategory = "unknown";
  currentAssessmentAnswers = {};
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
  if (currentCategory !== $("#manual-category").value) currentAssessmentAnswers = {};
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
    assessment: assessCondition(currentCategory, currentAssessmentAnswers),
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

function renderAssessmentQuestions(category, answers = {}, prefix = "assessment") {
  const questions = assessmentQuestions[category] || [];
  if (!questions.length) {
    return '<p class="assessment-no-questions">No item-specific questions are available until a category is selected. Select “Needs review” if you cannot identify it.</p>';
  }
  return questions.map((question) => {
    const options = [
      '<option value="">Not provided</option>',
      ...question.options.map(([value, label]) =>
        `<option value="${value}"${answers[question.key] === value ? " selected" : ""}>${label}</option>`
      ),
    ].join("");
    const id = `${prefix}-${question.key}`.replace(/[^A-Za-z0-9_-]/g, "-");
    return `<label class="assessment-question" for="${id}"><span>${escapeHtml(question.label)}</span><select id="${id}" data-assessment-key="${question.key}">${options}</select></label>`;
  }).join("");
}

function assessCondition(category, answers = {}) {
  const tags = [];
  const addTag = (label, explanation, source = "Material category · prototype guidance") => {
    if (!tags.some((tag) => tag.label === label)) tags.push({ label, explanation, source });
  };
  const condition = answers.condition || "not-provided";
  const previousContents = answers.previousContents || "not-provided";
  const uncertain = (value) => !value || value === "unknown";
  let action = "No disposal action suggested until the item is identified.";
  let preparation = "Not provided; identify the item and check local guidance.";
  let reuse = "Not assessed.";
  let alternative = "Ask your local waste service; no local facility directory is connected.";
  let explanation = categories[category]?.explanation || categories.unknown.explanation;
  let safetyWarnings = [];
  let manualReview = category === "unknown";
  let classification = [];
  const missingFields = [];

  if (category === "plastic" || category === "glass") {
    addTag("Recycling acceptance varies locally", "This material category can have recycling pathways, but acceptance depends on local rules, format, and condition; no municipal rules source is connected.");
    if (uncertain(previousContents)) {
      manualReview = true;
      missingFields.push("Previous contents: not provided or not sure; do not infer safe reuse or rinsing.");
      addTag("Needs review", "Previous contents are unknown. Avoid reuse or rinsing until the contents are known; the visual model cannot identify chemical composition.", "User answer · previous contents");
    } else if (["cleaner", "chemical"].includes(previousContents)) {
      manualReview = true;
      safetyWarnings.push("The user reports chemical or cleaning-product contents. Do not reuse for food or drink; follow product and local hazardous-waste guidance.");
      addTag("Potentially hazardous", "The user reported chemical/cleaning-product contents. This is a precaution based on that answer, not a chemical identification.", "User answer · previous contents");
      reuse = "Not recommended for food or drink; do not repurpose if chemical residue or contents are uncertain.";
    }
    if (uncertain(condition)) {
      manualReview = true;
      missingFields.push("Item condition: not provided or not sure.");
      action = "Condition has not been confirmed. Do not infer safe reuse; identify the contents and condition, then check local acceptance.";
    }
    if (condition === "broken" || condition === "cracked") {
      safetyWarnings.push(category === "glass"
        ? "Cracked or broken glass can cut. Do not handle fragments; keep people and pets away and follow local safety guidance."
        : "Cracked or broken packaging may have sharp edges. Avoid handling sharp pieces.");
      addTag("Sharp / broken", "Condition was reported by the user; handle only as local safety guidance advises.", "User answer · item condition");
      reuse = "Not a reuse candidate while cracked or broken.";
      if (category === "glass" && condition === "broken") action = "Keep people and pets away from fragments; do not put loose broken glass in recycling. Check local safe-disposal instructions.";
      else action = "Do not reuse damaged packaging. Check local guidance for safe recycling or disposal.";
    } else if (category === "glass" && condition === "cracked") {
      action = "Avoid handling the cracked container; it may break. Follow local safe-disposal guidance rather than placing it in a recycling bin.";
    } else if (category === "glass" && condition === "intact" && ["food", "drink", "water"].includes(previousContents)) {
      reuse = "Reuse candidate: if clean and intact, it may be suitable for storage. Confirm it is food-safe for the intended use.";
      action = answers.empty === "yes"
        ? "If clean and empty, reuse for suitable storage or check local glass collection acceptance."
        : "Empty only if contents are known and safe; then clean for suitable storage or check local glass collection acceptance.";
      preparation = "Clean only when contents are known and safe; confirm food-safety and local collection guidance.";
      addTag("Reuse candidate", "The user reports an intact item with known food/drink contents. Suitability for a specific reuse is not certified.", "User answers · condition and previous contents");
    } else if (category === "plastic" && condition === "intact" && ["water", "food"].includes(previousContents)) {
      reuse = "Possible non-food reuse only if clean and intact; do not assume a bottle is suitable for repeated food or drink use.";
      action = answers.empty === "yes"
        ? "If empty and safe to rinse, prepare it as local guidance requires and check acceptance for this packaging."
        : "Empty and rinse only when contents are known and safe; check local acceptance before recycling.";
      preparation = "Rinse only if contents are known and safe. Do not reuse it for repeated food/drink without verified food-safety information.";
      addTag("Reuse candidate", "The user reports an intact package with known contents. Repeated food/drink safety is not confirmed.", "User answers · condition and previous contents");
    } else if (condition === "intact") {
      action = "If empty and safe to rinse, prepare it as local guidance requires, then check whether the local program accepts this format.";
      preparation = answers.empty === "yes" ? "User reports it is empty. Rinse only if the previous contents are known and safe; follow local preparation rules." : "Empty and rinse only if contents are known and safe; do not handle or rinse unknown chemical contents.";
    }
    if (uncertain(answers.empty)) missingFields.push("Whether the container is empty: not provided or not sure.");
    if (category === "glass" && condition === "intact" && !["food", "drink", "water"].includes(previousContents)) {
      reuse = "Not confirmed; previous contents or intended reuse may make repurposing unsuitable.";
    }
    if (uncertain(previousContents) && condition !== "broken" && condition !== "cracked") {
      action = "Contents are unknown. Do not rinse or reuse until they can be identified safely; check local guidance.";
      preparation = "Do not empty or rinse unknown contents. Identify them safely and seek local guidance.";
    }
    if (category === "plastic" || category === "glass") {
      classification.push(condition === "broken" || condition === "cracked"
        ? "Recyclable status unknown until safe handling and local guidance are confirmed"
        : "Recyclable candidate · local acceptance unverified");
    }
    if (reuse.startsWith("Reuse candidate") || reuse.startsWith("Possible")) classification.push("Reuse possibility · suitability not certified");
  } else if (category === "paper") {
    addTag("Recycling acceptance varies locally", "Paper acceptance depends on local rules, coating, and condition; no local collection rules are connected.");
    if (uncertain(condition)) {
      missingFields.push("Paper/cardboard cleanliness and dryness: not provided or not sure.");
      manualReview = true;
      action = "Condition has not been confirmed. Keep it separate until you can check whether it is clean, dry, greasy, or coated.";
    } else if (condition === "clean") {
      action = "Keep it clean and dry, flatten it if useful, and check local paper/cardboard acceptance.";
      preparation = "Flatten if practical; remove non-paper parts only when easy and safe.";
      reuse = "Reuse or store it for packing if clean and dry.";
      classification.push("Recyclable candidate · local acceptance unverified");
      classification.push("Reuse possibility · clean/dry packing only");
      addTag("Reuse candidate", "Clean, dry paper/cardboard may be reused for packing; user condition answer.", "User answer · cleanliness");
    } else {
      manualReview = true;
      action = condition === "greasy"
        ? "Keep greasy cardboard out of paper recycling. Compost only if a local service explicitly accepts it; otherwise check local waste guidance."
        : "Wet or uncertain paper may not be accepted with dry paper. Let it dry only if uncontaminated, then check local guidance.";
      preparation = "Separate from clean paper; do not assume greasy or wet paper is recyclable or compostable.";
      addTag("Needs review", "Wetness or grease can change collection acceptance; the local rule is not available.", "User answer · cleanliness");
      addTag("Compostability not confirmed", "Paper/cardboard compostability depends on coatings, contamination, and the composting service; none is confirmed here.");
      if (condition === "greasy") missingFields.push("Grease type and local compost acceptance are unknown.");
    }
    if (answers.coating === "yes") {
      addTag("Needs review", "User reports a coating. Coating type and effect on recyclability/compostability are not identified.", "User answer · coating");
      missingFields.push("Coating material is not identified.");
      manualReview = true;
    } else if (uncertain(answers.coating)) {
      missingFields.push("Whether the paper is coated: not provided or not sure.");
    }
  } else if (category === "metal") {
    addTag("Recycling acceptance varies locally", "Metal recycling pathways and preparation depend on the item and local rules; material composition is not verified.");
    classification.push("Recyclable candidate · item type and local acceptance unverified");
    if (answers.pressurized === "yes") {
      manualReview = true;
      action = "Do not puncture, crush, heat, or place a pressurized container in a general recycling stream. Check an appropriate local collection service.";
      preparation = "Keep away from heat and do not puncture or crush.";
      safetyWarnings.push("User reports the container may be pressurized. Do not puncture, crush, or heat it.");
      addTag("Potentially hazardous", "User reports possible pressurization; this is a precaution, not a verified container diagnosis.", "User answer · pressurization");
    } else if (answers.sharpEdges === "yes") {
      action = "Avoid sharp edges and follow local guidance for safe metal collection or disposal.";
      safetyWarnings.push("User reports sharp edges. Avoid handling the sharp area.");
      addTag("Sharp / broken", "Sharp edges were reported by the user.", "User answer · sharp edges");
    } else {
      action = "If empty and safe to handle, check whether local collection accepts this type of metal container.";
      preparation = answers.empty === "yes" ? "User reports it is empty; rinse only if safe and accepted locally." : "Empty only if safe; do not handle unknown contents.";
    }
    if (uncertain(answers.empty)) missingFields.push("Whether the container is empty: not provided or not sure.");
    if (uncertain(answers.sharpEdges)) missingFields.push("Sharp edges: not provided or not sure.");
    if (uncertain(answers.pressurized)) missingFields.push("Pressurization: not provided or not sure.");
    if (uncertain(answers.pressurized) || uncertain(answers.sharpEdges)) manualReview = true;
  } else if (category === "hazardous") {
    classification.push("Potentially hazardous · conservative category rule");
    addTag("Potentially hazardous", "Battery/electronics category follows a conservative special-handling rule; this is not a visual hazard diagnosis.");
    action = "Keep batteries/electronics out of household recycling and general waste; check an authorized local collection point. No facility is verified by this site.";
    preparation = "Do not open, test, dismantle, repair, or repurpose. For damaged, swollen, leaking, or hot items, avoid handling and seek appropriate local safety guidance.";
    reuse = "Never open, test, repair, or repurpose a battery or hazardous item.";
    alternative = "If no authorized local collection is known, contact your local waste authority for safe handling advice.";
    if (answers.hazardCondition && answers.hazardCondition !== "normal" && answers.hazardCondition !== "unknown") {
      safetyWarnings.push(`User reports the item is ${answers.hazardCondition}. Avoid handling it; seek appropriate local safety guidance.`);
      addTag("Needs review", "Reported damage or abnormal heat requires human/safety review; this is user-provided, not an AI diagnosis.", "User answer · item condition");
      manualReview = true;
    } else if (uncertain(answers.hazardCondition)) {
      missingFields.push("Battery/electronics condition: not provided or not sure.");
      manualReview = true;
    }
  } else if (category === "organic") {
    classification.push("Biodegradable material category · property not certified");
    addTag("Biodegradable", "Identified as organic/food scraps by the sample or review category. This is not a laboratory or certification result.");
    addTag("Compostability not confirmed", "Home versus industrial compostability and local acceptance are not established.");
    action = "Use a locally approved food-waste or compost service if one accepts this material; otherwise check local waste guidance.";
    preparation = "Keep separate from packaging and follow the service's accepted-material and preparation rules.";
    if (answers.contamination === "yes") {
      addTag("Needs review", "User reports mixed materials; separate only when safe and follow local service rules.", "User answer · mixed materials");
      manualReview = true;
    } else if (uncertain(answers.contamination)) missingFields.push("Whether packaging or other materials are mixed in: not provided or not sure.");
  } else {
    addTag("Needs review", "The item category is unknown; no material or disposal property is inferred.", "Classification · unknown");
    missingFields.push("Recognized material/category is unavailable.");
  }

  if (category === "unknown" || manualReview) addTag("Needs review", "One or more important details are uncertain or require human review.");
  if (category !== "unknown" && category !== "hazardous" && category !== "organic" && !classification.some((entry) => entry.startsWith("Recyclable"))) {
    classification.unshift("Recyclable status unknown");
  }
  if (uncertain(answers.condition) && assessmentQuestions[category]?.some((question) => question.key === "condition")) {
    missingFields.push("Condition not confirmed by the user.");
  }
  if (category === "glass" && answers.empty === "no") {
    preparation = "Do not pour out unknown contents. Identify contents and follow appropriate safety/local guidance.";
    manualReview = true;
    addTag("Needs review", "Contents remain in the container; contents and safe handling are unknown.", "User answer · container not empty");
  }
  if (category === "plastic" && answers.empty === "no" && uncertain(previousContents)) {
    preparation = "Do not empty or rinse unknown contents. Identify them safely and seek local guidance.";
    manualReview = true;
    addTag("Needs review", "The container is not empty and contents are unknown; do not empty or rinse it.", "User answers · not empty and contents unknown");
  }

  if (category === "unknown") action = "Do not guess. Identify the item or ask your local waste service before disposal.";
  if (!safetyWarnings.length && category === "hazardous") safetyWarnings.push("Keep out of household recycling and general waste; do not open, test, or dismantle.");
  if (uncertain(answers.empty) && assessmentQuestions[category]?.some((question) => question.key === "empty")) {
    missingFields.push("Empty status not confirmed by the user.");
  }
  return {
    answers: { ...answers },
    updatedAt: new Date().toISOString(),
    source: "Transparent local condition rules · user answers are not AI observations",
    classification,
    tags,
    action,
    preparation,
    reuse,
    alternative,
    explanation,
    safetyWarnings,
    manualReview,
    missingFields: [...new Set(missingFields)],
    localRuleDependency: "Local collection acceptance and facilities are not connected or verified.",
  };
}

function renderAssessmentPanel(renderQuestions = true) {
  const answers = currentAssessmentAnswers;
  if (renderQuestions) $("#assessment-questions").innerHTML = renderAssessmentQuestions(currentCategory, answers, "scan-assessment");
  const assessment = assessCondition(currentCategory, answers);
  if (Object.values(answers).some(Boolean) || currentCategory === "hazardous" || currentCategory === "unknown") {
    $("#result-advice").textContent = assessment.action;
    $("#rule-source").textContent = "Transparent condition rules · material category plus user-provided answers · local acceptance unverified";
  } else {
    const configuredLocation = $("#location-select").value !== "unconfigured";
    $("#result-advice").textContent = currentAiAnalysis
      ? currentAiAnalysis.action
      : !configuredLocation
        ? "Local rules are not configured for this location. Use a local authority's guidance before disposing of this item."
        : categories[currentCategory].advice;
    $("#rule-source").textContent = currentAiAnalysis
      ? "Gemini visual estimate · not a verified local recycling rule"
      : !configuredLocation
        ? "No applicable local rule configured · location-specific advice withheld"
        : "Prototype rule · Campus demo rules (unverified)";
  }
  const status = assessment.manualReview ? "Human review suggested" : "Rule-based guidance";
  $("#assessment-guidance").innerHTML = `<p><strong>${status}</strong> <span>· Based on the reviewed category and user-provided answers</span></p><dl><div><dt>Suggested action</dt><dd>${escapeHtml(assessment.action)}</dd></div><div><dt>Preparation</dt><dd>${escapeHtml(assessment.preparation)}</dd></div><div><dt>Reuse idea</dt><dd>${escapeHtml(assessment.reuse)}</dd></div><div><dt>If unavailable</dt><dd>${escapeHtml(assessment.alternative)}</dd></div></dl>${assessment.safetyWarnings.map((warning) => `<p class="assessment-safety" role="alert"><strong>Safety:</strong> ${escapeHtml(warning)}</p>`).join("")}`;
  $("#property-tags").innerHTML = assessment.tags.map((tag) =>
    `<details class="property-tag"><summary><span aria-hidden="true">◇</span> ${escapeHtml(tag.label)}</summary><p>${escapeHtml(tag.explanation)}</p><small>Source: ${escapeHtml(tag.source)}</small></details>`
  ).join("");
}

function renderSavedAssessment(record) {
  const answers = record.assessment?.answers || {};
  const assessment = assessmentForRecord(record);
  const tags = (assessment.tags || []).map((tag) =>
    `<details class="property-tag"><summary><span aria-hidden="true">◇</span> ${escapeHtml(tag.label)}</summary><p>${escapeHtml(tag.explanation)}</p><small>Source: ${escapeHtml(tag.source)}</small></details>`
  ).join("");
  return `<details class="saved-assessment"><summary>Condition assessment · ${assessment.updatedAt ? `updated ${escapeHtml(new Date(assessment.updatedAt).toLocaleDateString())}` : "not yet completed"} <span>Review or edit answers</span></summary><div class="saved-assessment-content"><p class="assessment-origin">Answers are user-provided; Gemini estimates are stored separately.</p><div class="assessment-questions">${renderAssessmentQuestions(record.category, answers, `record-${record.id}`)}</div><div class="property-tags">${tags}</div><button type="button" class="utility-button save-assessment-button" data-save-assessment="${escapeHtml(record.id)}">Save updated assessment</button></div></details>`;
}

function saveUpdatedAssessment(id, row) {
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    announce("That material record could not be found.");
    return;
  }
  const answers = {};
  row.querySelectorAll("[data-assessment-key]").forEach((select) => {
    if (select.value) answers[select.dataset.assessmentKey] = select.value;
  });
  const previousAssessment = record.assessment;
  record.assessment = assessCondition(record.category, answers);
  if (!persistRecords()) {
    record.assessment = previousAssessment;
    return;
  }
  renderDashboard();
  if (!$("#report-output").hidden) refreshGeneratedReport();
  announce("User-provided condition answers and guidance were updated in this browser.");
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
    row.insertAdjacentHTML("beforeend", renderSavedAssessment(record));
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

function assessmentForRecord(record) {
  const answers = record.assessment?.answers || {};
  return {
    ...assessCondition(record.category, answers),
    updatedAt: record.assessment?.updatedAt || null,
  };
}

function itemReportMarkdown(record, generatedAt = new Date().toISOString()) {
  const category = categories[record.category];
  const assessment = assessmentForRecord(record);
  const estimate = record.aiSummary;
  const questionRows = (assessmentQuestions[record.category] || []).map((question) => {
    const value = record.assessment?.answers?.[question.key];
    const option = question.options.find(([key]) => key === value);
    return `- ${reportSafeLine(question.label)}: ${option ? option[1] : "Not provided"}`;
  });
  const classification = assessment.classification.length ? assessment.classification.join("; ") : "Unknown";
  const tags = assessment.tags.length
    ? assessment.tags.map((tag) => `- **${reportSafeLine(tag.label)}:** ${reportSafeLine(tag.explanation)} (Source: ${reportSafeLine(tag.source)})`).join("\n")
    : "- None established.";
  const events = [...record.events].sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
    .map((event) => `- ${new Date(event.at).toISOString()} — ${stageLabels[event.status]} (simulated): ${reportSafeLine(event.note)}; quantity/weight: Unknown.`)
    .join("\n") || "- No events recorded.";
  const safety = assessment.safetyWarnings.length
    ? assessment.safetyWarnings.map((warning) => `- ${reportSafeLine(warning)}`).join("\n")
    : "- No condition-specific warning recorded; general handling and local guidance still apply.";
  const missing = [...assessment.missingFields, "Weight/quantity, previous/next destination, handler, local facility, per-stage weight, and environmental factors were not collected."]
    .map((field) => `- ${reportSafeLine(field)}`).join("\n");
  const image = record.photoThumbnail
    ? `![Saved small item image thumbnail](${record.photoThumbnail})\n\n*Stored thumbnail from this browser; it is not a full-resolution image.*`
    : "Not provided or not retained in the browser.";
  const answerDetails = questionRows.length ? questionRows.join("\n") : "- No category-specific questions available; category needs human review.";
  const humanReview = assessment.manualReview || record.source === "manual-review"
    ? "Suggested / manual review required"
    : "Not recorded as reviewed by a human";
  const hasUserAnswers = Object.values(record.assessment?.answers || {}).some(Boolean);
  const responseCondition = hasUserAnswers
    ? `User-provided condition details are stored separately from the visual estimate.\n\n${answerDetails}`
    : `Not provided; older record has no condition questionnaire answers.\n\n${answerDetails}`;
  return [
    `# Per-item material assessment — ${reportSafeLine(record.itemName) || "Unidentified item"}`,
    "",
    `**Item report ID:** ECO-ITEM-${reportSafeLine(record.id)}`,
    `**Report generated:** ${new Date(generatedAt).toISOString()} · Markdown`,
    "",
    "## Scan and identification",
    `- Item / Digital Twin tracking ID: ${reportSafeLine(record.id)}`,
    `- Scan date/time: ${record.createdAt ? new Date(record.createdAt).toISOString() : "Unknown"}`,
    `- Item image: ${image}`,
    `- Recognized item name / category: ${reportSafeLine(record.itemName)} / ${category.label}`,
    `- Predicted material(s): ${estimate?.material ? reportSafeLine(estimate.material) : "Unknown / not confirmed"}`,
    `- Recognition confidence: ${Number.isFinite(estimate?.confidence) ? `${Math.round(estimate.confidence * 100)}% (AI estimate; not measured accuracy)` : "Unknown / no model score recorded"}`,
    `- Classification summary: ${classification}`,
    `- Recyclable: ${assessment.classification.some((entry) => entry.startsWith("Recyclable")) ? "Candidate only; local acceptance unverified" : "Unknown / not confirmed"}`,
    `- Reusable: ${assessment.classification.some((entry) => entry.startsWith("Reuse")) ? "Possible; suitability not certified" : "Not confirmed"}`,
    `- Biodegradable: ${record.category === "organic" ? "Organic material category; not certified" : "Unknown / not established"}`,
    `- Potentially hazardous: ${assessment.tags.some((tag) => tag.label === "Potentially hazardous") ? "Yes / precautionary" : "Not identified; this is not proof of harmlessness"}`,
    `- Uncertainty / manual-review flag: ${assessment.manualReview || estimate?.needsReview || record.category === "unknown" ? "Review suggested" : "No flag stored; AI output remains an estimate"}`,
    `- AI-estimated condition (separate from user answers): ${estimate?.condition ? reportSafeLine(estimate.condition) : "Unknown / not estimated"}`,
    "",
    "## Condition and preparation",
    `- User answers: ${hasUserAnswers ? "Recorded below; user-provided, not AI-observed." : "Not provided (legacy record or no answers saved)."}`,
    responseCondition,
    `- Visible residue / contamination: Not independently inspected. User-reported surface condition: ${["paper"].includes(record.category) ? (record.assessment?.answers?.condition || "Not provided") : "Not assessed"}; mixed-material answer: ${record.assessment?.answers?.contamination || "Not provided"}.`,
    `- Preparation: ${reportSafeLine(assessment.preparation)}`,
    "- Parts to remove / sort separately: Not provided.",
    `- Handling precautions: ${safety.replace(/\n/g, " ")}`,
    "",
    "## Disposal or reuse",
    `- Recommended action: ${reportSafeLine(assessment.action)}`,
    "- Bin / collection stream: Not provided; no municipal rules source is connected.",
    "- Local guidance / facility: Not provided; no local facility lookup is connected.",
    `- Reuse / repair suggestions: ${reportSafeLine(assessment.reuse)}`,
    `- Local-rule dependency: ${reportSafeLine(assessment.localRuleDependency)}`,
    `- User next steps: ${reportSafeLine(assessment.action)} Check the local authority before acting.`,
    `- Alternative if preferred option is unavailable: ${reportSafeLine(assessment.alternative)}`,
    "",
    "## Environmental impact",
    "- Weight / quantity and units: Not measured; record count is not item quantity.",
    "- Potential recovery / reuse value: Unknown; no validated material value or measured quantity.",
    "- Estimated environmental benefit: Not calculated; no verified outcome, measured weight, or documented factors.",
    "- Assumptions / estimate source: No environmental estimates made.",
    "- Landfill / emissions estimates: Unknown; no stated method or supporting data available.",
    "",
    "## Digital Twin / material flow",
    `- Tracking ID: ${reportSafeLine(record.id)}`,
    `- Current status: ${stageLabels[record.status]} (simulated)`,
    `- Material-flow events:\n${events}`,
    "- Previous / next destination or handler: Unknown / not connected.",
    "- Quantity or weight per stage: Unknown / not measured.",
    "- Unverified handoffs / traceability gaps: All physical handoffs, facilities, destinations, and outcomes are unverified; lifecycle is a software simulation.",
    "",
    "## Personalized AI guidance",
    `- Personalized rule-based recommendation: ${reportSafeLine(assessment.action)}`,
    `- Explanation: ${reportSafeLine(assessment.explanation)}`,
    `- Alternative: ${reportSafeLine(assessment.alternative)}`,
    `- Confidence / limitations: ${Number.isFinite(estimate?.confidence) ? `${Math.round(estimate.confidence * 100)}% model confidence estimate; not validated accuracy. ` : "No confidence score. "}${reportSafeLine(estimate?.caveat || "Visual inspection cannot confirm chemical composition, local acceptance, or actual recycling outcomes.")}`,
    "- Follow-up: Confirm uncertain condition details and consult the local waste authority.",
    "",
    "## Audit and quality",
    `- Model / system version: ${record.analysisModel ? reportSafeLine(record.analysisModel) : "No model version recorded; EcoSnapAI browser prototype rules"}`,
    `- Data sources: ${record.source === "ai-model" ? "Saved Gemini visual estimate and user-provided answers; local transparent condition rules; browser-local lifecycle events." : "Saved sample/manual category and user-provided answers; local transparent condition rules; browser-local lifecycle events."}`,
    `- Human review status / notes: ${humanReview}. ${assessment.manualReview ? "Review is required because information is uncertain or safety-related." : "No human verification evidence stored."}`,
    `- Missing fields and reasons:\n${missing}`,
    `- Safety warnings:\n${safety}`,
    `- Report generation date: ${new Date(generatedAt).toISOString()}`,
    "- Export format: Markdown (.md)",
    "",
    "> This is a prototype assessment. Local recycling rules, facilities, material composition, and environmental outcomes are not verified.",
  ].join("\n");
}

function showGeneratedReport(report, meta) {
  const reportId = `ECO-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  $("#report-id").textContent = reportId;
  const generatedAt = new Date().toLocaleString();
  $("#report-generated-at").textContent = generatedAt;
  reportBaseText = report;
  reportMetaText = meta;
  generatedReport = composeGeneratedReport();
  $("#report-meta").textContent = meta;
  $("#report-dashboard").innerHTML = renderReportDashboard(meta);
  $("#report-text").textContent = generatedReport;
  $("#report-error").hidden = true;
  $("#report-output").hidden = false;
  $("#report-output").scrollIntoView({ behavior: "smooth", block: "start" });
}

function composeGeneratedReport() {
  const header = `> Report ID: ${$("#report-id").textContent} · Generated: ${$("#report-generated-at").textContent}\n\n${reportBaseText}`;
  if (!records.length) return header;
  const generatedAt = new Date().toISOString();
  return `${header}\n\n---\n\n# Per-item assessment checklists\n\n${records.map((record) => itemReportMarkdown(record, generatedAt)).join("\n\n---\n\n")}`;
}

function refreshGeneratedReport() {
  $("#report-dashboard").innerHTML = renderReportDashboard(reportMetaText);
  generatedReport = composeGeneratedReport();
  const reportText = $("#report-text");
  if (reportText) reportText.textContent = generatedReport;
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
      const conditionAssessment = assessmentForRecord(record);
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
      const answerMarkup = (assessmentQuestions[record.category] || []).map((question) => {
        const value = record.assessment?.answers?.[question.key];
        const option = question.options.find(([key]) => key === value);
        return `<div><dt>${escapeHtml(question.label)}</dt><dd>${escapeHtml(option ? option[1] : "Not provided")}</dd></div>`;
      }).join("") || "<div><dt>Condition questionnaire</dt><dd>Not available for an unidentified category</dd></div>";
      const tagMarkup = conditionAssessment.tags.map((tag) =>
        `<details class="report-property-tag"><summary>${escapeHtml(tag.label)}</summary><p>${escapeHtml(tag.explanation)}</p><small>Source: ${escapeHtml(tag.source)}</small></details>`
      ).join("") || "<p class=\"report-caption\">No specific waste-property tags established.</p>";
      const safetyMarkup = conditionAssessment.safetyWarnings.length
        ? conditionAssessment.safetyWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")
        : "<li>No condition-specific warning recorded; use general care and local guidance.</li>";
      const missingMarkup = [...conditionAssessment.missingFields, "Weight, facilities, material value, and physical destinations are not collected."]
        .map((field) => `<li>${escapeHtml(field)}</li>`).join("");
      return `<article class="report-item-card">
        <div class="report-item-heading">${thumbnail}<div class="report-item-title"><span class="report-category-badge category-${record.category}">${escapeHtml(category.label)}</span><h4>${escapeHtml(record.itemName)}</h4><p>${source}</p><code>${escapeHtml(record.id)}</code></div></div>
        ${warning}
        <div class="report-item-stats"><div><span>AI confidence</span><strong>${confidence}</strong></div><div><span>Current twin stage</span><strong>${escapeHtml(stageLabels[record.status])} <small>· simulated</small></strong></div><div><span>Quantity</span><strong>Not measured <small>· 1 saved record</small></strong></div></div>
        <section class="report-subsection"><h5>Computer vision record</h5>${details}<p class="report-caption">A saved AI result is a visual estimate, not proof of material composition or recycling acceptance. ${record.analysisModel ? `Model: ${escapeHtml(record.analysisModel)}.` : "Model version was not recorded."}</p></section>
        <section class="report-subsection"><h5>Recommended next steps</h5><div class="report-recommendations"><div><span>01 · ACTION</span><p>${escapeHtml(action)}</p></div><div><span>02 · SAFE PREPARATION</span><p>${escapeHtml(estimate?.preparation || "Follow applicable local guidance; this prototype does not verify local rules.")}</p></div><div><span>03 · REUSE POSSIBILITY</span><p>${escapeHtml(estimate?.reuseOption || "Not assessed for this record.")}</p></div></div><p class="report-caption">No verified local drop-off locations are connected. Check your local authority before disposal.</p></section>
        <section class="report-subsection"><h5>Digital Twin trace <small>software simulation · not physical tracking</small></h5><ol class="report-event-list">${eventMarkup}</ol><p class="report-caption">Collection, processing facility, destination and final recovery are not connected or evidenced.</p></section>
        <section class="report-subsection report-assessment-section"><h5>Condition checklist and audit</h5><dl class="report-detail-grid">${answerMarkup}<div><dt>Classification status</dt><dd>${escapeHtml(conditionAssessment.classification.join("; ") || "Unknown")}</dd></div><div><dt>Recommended action</dt><dd>${escapeHtml(conditionAssessment.action)}</dd></div><div><dt>Preparation</dt><dd>${escapeHtml(conditionAssessment.preparation)}</dd></div><div><dt>Reuse / repair</dt><dd>${escapeHtml(conditionAssessment.reuse)}</dd></div><div><dt>Local-rule dependency</dt><dd>${escapeHtml(conditionAssessment.localRuleDependency)}</dd></div><div><dt>Human review</dt><dd>${conditionAssessment.manualReview ? "Suggested / required" : "No review evidence recorded"}</dd></div><div><dt>Weight / quantity</dt><dd>Not measured</dd></div><div><dt>Impact / emissions</dt><dd>Not estimated; method and supporting data unavailable</dd></div><div><dt>Destination / handler</dt><dd>Unknown; no physical traceability connected</dd></div></dl><div class="report-property-tags">${tagMarkup}</div><h6>Safety warnings</h6><ul class="report-audit-list">${safetyMarkup}</ul><h6>Missing fields</h6><ul class="report-audit-list">${missingMarkup}</ul><p class="report-caption">Guidance uses a transparent local ruleset and saved user answers; user-provided condition is not AI-observed. Property tags are not certifications. Gemini visual estimates remain separate. Local acceptance is unverified.</p></section>
        <div class="report-item-download"><button class="utility-button" type="button" data-download-item-report="${escapeHtml(record.id)}">Download this item report (.md)</button></div>
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
    "The browser interface stores records in localStorage. The Node.js server keeps the Gemini API key in the local .env file and serves the AI endpoints. Photo data is sent to Google only after the user selects AI analysis; smart report generation sends sanitized record metadata and validated user-provided condition answers, not photos. The prototype does not connect to local recycling rules. Potentially hazardous items need cautious human review and should not be opened, tested, or handled based on an AI suggestion.",
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
        records: records.map(({ id, category, itemName, status, source, createdAt, analysisAt, analysisModel, events, aiSummary, assessment }) => ({
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
          assessment,
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function zipChecksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const date = new Date();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const localChunks = [];
  const directoryChunks = [];
  let localOffset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const checksum = zipChecksum(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localChunks.push(localHeader, contentBytes);

    const directoryHeader = new Uint8Array(46 + nameBytes.length);
    const directoryView = new DataView(directoryHeader.buffer);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(8, 0x0800, true);
    directoryView.setUint16(10, 0, true);
    directoryView.setUint16(12, dosTime, true);
    directoryView.setUint16(14, dosDate, true);
    directoryView.setUint32(16, checksum, true);
    directoryView.setUint32(20, contentBytes.length, true);
    directoryView.setUint32(24, contentBytes.length, true);
    directoryView.setUint16(28, nameBytes.length, true);
    directoryView.setUint16(30, 0, true);
    directoryView.setUint16(32, 0, true);
    directoryView.setUint16(34, 0, true);
    directoryView.setUint16(36, 0, true);
    directoryView.setUint32(38, 0, true);
    directoryView.setUint32(42, localOffset, true);
    directoryHeader.set(nameBytes, 46);
    directoryChunks.push(directoryHeader);
    localOffset += localHeader.length + contentBytes.length;
  });

  const directoryOffset = localOffset;
  const directorySize = directoryChunks.reduce((total, chunk) => total + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, directoryOffset, true);
  endView.setUint16(20, 0, true);
  return new Blob([...localChunks, ...directoryChunks, end], { type: "application/zip" });
}

function itemReportFilename(record) {
  const safeId = record.id.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 64) || "item";
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return `ecosnapai-item-report-${safeId}-${uniqueSuffix}.md`;
}

function downloadIndividualItemReport(id) {
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    announce("That item report is no longer available in this browser.");
    return;
  }
  try {
    const blob = new Blob([itemReportMarkdown(record)], { type: "text/markdown;charset=utf-8" });
    triggerDownload(blob, itemReportFilename(record));
    announce(`Downloaded the report for ${record.itemName}.`);
  } catch (error) {
    console.error("EcoSnapAI could not download this item report.", error);
    announce("The item report could not be downloaded. Try again or use Download .md.");
  }
}

function downloadAllItemReports() {
  if (!records.length) {
    announce("There are no saved item reports to download.");
    return;
  }
  try {
    const generatedAt = new Date().toISOString();
    const files = records.map((record) => ({
      name: itemReportFilename(record),
      content: itemReportMarkdown(record, generatedAt),
    }));
    const archive = createStoredZip(files);
    const stamp = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const suffix = Math.random().toString(36).slice(2, 7);
    triggerDownload(archive, `ecosnapai-item-reports-${stamp}-${suffix}.zip`);
    announce(`Downloaded ${files.length} individual item ${files.length === 1 ? "report" : "reports"} in a ZIP archive.`);
  } catch (error) {
    console.error("EcoSnapAI could not create the item-report archive.", error);
    announce("The item-report archive could not be created. Try downloading reports individually.");
  }
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

$("#theme-toggle").addEventListener("click", cycleTheme);
const heroArt = document.querySelector(".hero-art");
if (heroArt) {
  heroArt.addEventListener("pointermove", updateHeroTilt);
  heroArt.addEventListener("pointerleave", resetHeroTilt);
  heroArt.addEventListener("pointercancel", resetHeroTilt);
}
$("#camera-trigger").addEventListener("click", openCamera);
$("#capture-photo").addEventListener("click", captureCameraPhoto);
$("#cancel-camera").addEventListener("click", () => stopCamera());
$("#camera-fallback").addEventListener("click", openCameraFallback);
$("#photo-input").addEventListener("change", (event) => {
  const input = event.currentTarget;
  handlePhoto(input.files[0]);
  input.value = "";
});
$("#camera-input").addEventListener("change", (event) => {
  const input = event.currentTarget;
  handlePhoto(input.files[0]);
  input.value = "";
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});
window.addEventListener("pagehide", () => stopCamera());

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => setSample(button.dataset.sample));
});
$("#analyze-photo").addEventListener("click", analyzePhoto);
$("#reset-scan").addEventListener("click", () => {
  setSample("plastic");
  $("#location-select").value = "demo-campus";
  renderResult();
  announce("Scan reset to the plastic bottle sample.");
});
$("#review-photo").addEventListener("click", reviewPhoto);
$("#location-select").addEventListener("change", renderResult);
$("#assessment-panel").addEventListener("change", (event) => {
  const select = event.target.closest("[data-assessment-key]");
  if (!select) return;
  if (select.value) currentAssessmentAnswers[select.dataset.assessmentKey] = select.value;
  else delete currentAssessmentAnswers[select.dataset.assessmentKey];
  renderAssessmentPanel(false);
});
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
  const saveAssessmentButton = event.target.closest("[data-save-assessment]");
  if (saveAssessmentButton) saveUpdatedAssessment(saveAssessmentButton.dataset.saveAssessment, saveAssessmentButton.closest(".material-row"));
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
$("#download-all-item-reports").addEventListener("click", downloadAllItemReports);
$("#report-dashboard").addEventListener("click", (event) => {
  const button = event.target.closest("[data-download-item-report]");
  if (button) downloadIndividualItemReport(button.dataset.downloadItemReport);
});
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
