const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const requestLimitBytes = 8 * 1024 * 1024;
const imageLimitBytes = 5 * 1024 * 1024;
const apiBase = "https://generativelanguage.googleapis.com/v1beta/models";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedCategories = new Set(["plastic", "paper", "metal", "glass", "organic", "hazardous", "unknown"]);
const allowedStages = new Set(["identified", "sorted", "recovery", "reuse"]);
const assessmentAnswerOptions = {
  plastic: {
    condition: ["intact", "cracked", "broken", "unknown"],
    empty: ["yes", "no", "unknown"],
    previousContents: ["water", "food", "cleaner", "other", "unknown"],
  },
  paper: {
    condition: ["clean", "wet", "greasy", "unknown"],
    coating: ["no", "yes", "unknown"],
  },
  metal: {
    empty: ["yes", "no", "unknown"],
    sharpEdges: ["no", "yes", "unknown"],
    pressurized: ["no", "yes", "unknown"],
  },
  glass: {
    condition: ["intact", "cracked", "broken", "unknown"],
    empty: ["yes", "no", "unknown"],
    previousContents: ["food", "drink", "chemical", "other", "unknown"],
  },
  organic: { contamination: ["no", "yes", "unknown"] },
  hazardous: { hazardCondition: ["normal", "damaged", "swollen", "leaking", "hot", "unknown"] },
  unknown: {},
};
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
};

function loadLocalEnvironment() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    process.env[match[1]] = value.replace(/\\n/g, "\n");
  }
}

loadLocalEnvironment();

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > requestLimitBytes) {
        reject(Object.assign(new Error("Request body exceeds the 8 MB limit."), { status: 413 }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (total > requestLimitBytes) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function requireApiKey(response) {
  if (process.env.GEMINI_API_KEY) return true;
  sendJson(response, 503, {
    error: "Gemini is not configured yet. Add GEMINI_API_KEY to your local .env file and restart the server.",
    code: "MODEL_NOT_CONFIGURED",
  });
  return false;
}

async function callGemini(prompt, image, maxOutputTokens, timeoutMs = 45000) {
  const primaryModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const models = [...new Set([primaryModel, "gemini-3.5-flash-lite"])];
  const parts = [{ text: prompt }];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }

  let lastResponse;
  let lastPayload;
  for (const model of models) {
    const url = `${apiBase}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens,
          },
        }),
      });
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        lastResponse = { status: 504 };
        lastPayload = { error: { message: "Provider request timed out." } };
        continue;
      }
      throw Object.assign(new Error("Could not reach Gemini. Check your internet connection and retry."), { status: 502 });
    }

    const payload = await response.json().catch(() => null);
    if (response.ok) {
      const text = payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();
      if (!text) {
        throw Object.assign(new Error("Gemini returned an empty response. Please retry."), { status: 502 });
      }
      try {
        return { result: JSON.parse(text), model };
      } catch {
        throw Object.assign(new Error("Gemini returned an unreadable response. Please retry."), { status: 502 });
      }
    }

    lastResponse = response;
    lastPayload = payload;
    if (response.status === 401 || response.status === 403) {
      throw Object.assign(new Error("Gemini rejected the API key. Check GEMINI_API_KEY and its API access."), { status: 502 });
    }
    if (![404, 429, 500, 502, 503].includes(response.status)) break;
  }

  const providerMessage = lastPayload?.error?.message;
  console.error("Gemini model options failed.", {
    status: lastResponse?.status,
    models,
    message: providerMessage || "No provider message",
  });
  if (lastResponse?.status === 503) {
    throw Object.assign(new Error("Google Gemini is overloaded right now, including its backup model. Try again shortly, or use Build offline report."), { status: 503 });
  }
  if (lastResponse?.status === 429) {
    throw Object.assign(new Error("Gemini rate limit or quota reached on the available models. Check your Google AI Studio quota and retry later."), { status: 429 });
  }
  if (lastResponse?.status === 504) {
    throw Object.assign(new Error("Gemini timed out on the primary and backup models. Please retry shortly."), { status: 504 });
  }
  throw Object.assign(new Error("No configured Gemini model is available for this API key. Check GEMINI_MODEL or retry after checking model availability."), { status: 502 });
}

function cleanText(value, fallback, maxLength = 600) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength) || fallback;
}

function validateAnalysis(analysis) {
  if (!analysis || !allowedCategories.has(analysis.category)) {
    throw Object.assign(new Error("The model did not return a recognized material category. Try another image or review it manually."), { status: 502 });
  }
  const confidence = Number(analysis.confidence);
  const safeConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
  const hazardous = analysis.category === "hazardous" || analysis.hazardous === true;
  const needsReview = hazardous || analysis.category === "unknown" || safeConfidence < 0.6 || analysis.needsReview === true;
  const safeAction = hazardous
    ? "Potential hazard: do not put this in household recycling or general waste. Avoid handling damaged or leaking items and consult an appropriate local authority or authorized collection point."
    : needsReview
      ? "The image is not clear enough for a reliable identification. Check the item manually and consult your local waste service before disposal."
      : cleanText(analysis.action, "Check local guidance before disposing of this item.");

  return {
    category: needsReview && !hazardous ? "unknown" : analysis.category,
    itemName: cleanText(analysis.itemName, "Unidentified item", 100),
    material: cleanText(analysis.material, "Material not confirmed", 120),
    confidence: safeConfidence,
    condition: ["clean", "soiled", "damaged", "unknown"].includes(analysis.condition) ? analysis.condition : "unknown",
    needsReview,
    hazardous,
    action: safeAction,
    preparation: hazardous
      ? "Do not open, test, dismantle, or handle damaged or leaking items. Contact an appropriate local authority or authorized collection point."
      : cleanText(analysis.preparation, "Follow local authority guidance; no local rule has been verified."),
    reuseOption: hazardous
      ? "Do not reuse or repurpose a potentially hazardous item."
      : cleanText(analysis.reuseOption, "Consider safe reuse if the item is intact and suitable."),
    explanation: cleanText(analysis.explanation, "This is an AI-generated visual estimate, not a verified local recycling instruction."),
    caveat: "AI visual estimate only. Local disposal rules are not connected or verified. Hazardous items need cautious human review.",
  };
}

function validateReportInput(input) {
  if (!input || !Array.isArray(input.records) || input.records.length > 500) {
    throw Object.assign(new Error("Report requests must include a records array with no more than 500 entries."), { status: 400 });
  }
  const records = input.records.map((record) => {
    if (!record || !allowedCategories.has(record.category) || !allowedStages.has(record.status)) {
      throw Object.assign(new Error("A report record contains an unsupported category or lifecycle stage."), { status: 400 });
    }
    const safeRecord = {
      id: cleanText(record.id, "record id not recorded", 100),
      category: record.category,
      itemName: cleanText(record.itemName, "Unidentified item", 100),
      status: record.status,
      source: record.source === "ai-model" ? "AI-assisted visual review" : record.source === "manual-review" ? "manual review" : "sample data",
      createdAt: typeof record.createdAt === "string" && !Number.isNaN(Date.parse(record.createdAt))
        ? new Date(record.createdAt).toISOString()
        : null,
      analysisAt: typeof record.analysisAt === "string" && !Number.isNaN(Date.parse(record.analysisAt))
        ? new Date(record.analysisAt).toISOString()
        : null,
      analysisModel: cleanText(record.analysisModel, "not recorded", 80),
      userProvidedConditionAnswers: Object.fromEntries(
        Object.entries(assessmentAnswerOptions[record.category])
          .filter(([key, allowed]) => allowed.includes(record.assessment?.answers?.[key]))
          .map(([key]) => [key, record.assessment.answers[key]])
      ),
      conditionAssessmentUpdatedAt: typeof record.assessment?.updatedAt === "string" && !Number.isNaN(Date.parse(record.assessment.updatedAt))
        ? new Date(record.assessment.updatedAt).toISOString()
        : null,
      events: Array.isArray(record.events)
        ? record.events.slice(0, 50).filter((event) =>
          event && allowedStages.has(event.status) && typeof event.at === "string" && !Number.isNaN(Date.parse(event.at))
        ).map((event) => ({
          status: event.status,
          at: new Date(event.at).toISOString(),
          note: cleanText(event.note, "Lifecycle event recorded", 120),
        }))
        : [],
    };
    safeRecord.eventCount = safeRecord.events.length;
    if (record.source === "ai-model" && record.aiSummary && typeof record.aiSummary === "object") {
      const confidence = Number(record.aiSummary.confidence);
      safeRecord.aiEstimate = {
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
        needsReview: record.aiSummary.needsReview === true,
        hazardous: record.aiSummary.hazardous === true,
        itemName: cleanText(record.aiSummary.itemName, safeRecord.itemName, 100),
        material: cleanText(record.aiSummary.material, "Not recorded", 120),
        condition: cleanText(record.aiSummary.condition, "Unknown", 40),
        action: cleanText(record.aiSummary.action, "No action recorded", 300),
        preparation: cleanText(record.aiSummary.preparation, "No preparation advice recorded", 300),
        reuseOption: cleanText(record.aiSummary.reuseOption, "No reuse suggestion recorded", 200),
        explanation: cleanText(record.aiSummary.explanation, "No visual evidence note recorded", 300),
        caveat: cleanText(record.aiSummary.caveat, "AI visual estimate only; local disposal rules are not verified.", 300),
      };
    }
    return safeRecord;
  });
  const countValues = (field, values) => Object.fromEntries(values.map((value) => [
    value,
    records.filter((record) => record[field] === value).length,
  ]));
  const aiRecords = records.filter((record) => record.aiEstimate);
  return {
    projectName: "EcoSnapAI",
    track: "Smart Recycling Assistant",
    records,
    summary: {
      recordCount: records.length,
      categoryCounts: countValues("category", [...allowedCategories]),
      stageCounts: countValues("status", [...allowedStages]),
      sourceCounts: countValues("source", ["AI-assisted visual review", "manual review", "sample data"]),
      aiEstimateCount: aiRecords.length,
      aiReviewRecommendedCount: aiRecords.filter((record) => record.aiEstimate.needsReview).length,
      potentiallyHazardousAiEstimateCount: aiRecords.filter((record) => record.aiEstimate.hazardous).length,
      eventCount: records.reduce((total, record) => total + record.eventCount, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/status") {
    sendJson(response, 200, {
      provider: "Google Gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      configured: Boolean(process.env.GEMINI_API_KEY),
    });
    return;
  }

  if (request.method !== "POST" || !["/api/analyze", "/api/report"].includes(pathname)) {
    sendJson(response, 404, { error: "API route not found." });
    return;
  }
  if (!requireApiKey(response)) return;
  if (!String(request.headers["content-type"] || "").includes("application/json")) {
    sendJson(response, 415, { error: "Send this request as application/json." });
    return;
  }

  let input;
  try {
    input = await readJson(request);
  } catch (error) {
    sendJson(response, error.status || 400, { error: error.message || "Could not read request body." });
    return;
  }

  try {
    if (pathname === "/api/analyze") {
      const mimeType = input?.mimeType;
      const base64 = input?.image;
      if (!allowedMimeTypes.has(mimeType) || typeof base64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        sendJson(response, 400, { error: "Provide a valid PNG, JPEG or WebP image encoded as base64." });
        return;
      }
      const imageBytes = Buffer.from(base64, "base64");
      if (!imageBytes.length || imageBytes.length > imageLimitBytes || imageBytes.toString("base64").replace(/=+$/, "") !== base64.replace(/=+$/, "")) {
        sendJson(response, 400, { error: "Image must be valid and no larger than 5 MB." });
        return;
      }
      const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
      const isPng = imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isWebp = imageBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        imageBytes.subarray(8, 12).toString("ascii") === "WEBP";
      if ((mimeType === "image/jpeg" && !isJpeg) || (mimeType === "image/png" && !isPng) || (mimeType === "image/webp" && !isWebp)) {
        sendJson(response, 400, { error: "The image contents do not match the selected file type." });
        return;
      }

      const modelResponse = await callGemini(
        `Review this waste-item photo for EcoSnapAI. Return one JSON object only with exactly these fields: {"category":"plastic|paper|metal|glass|organic|hazardous|unknown","itemName":"short plain name","material":"visible material with uncertainty","confidence":0.0,"condition":"clean|soiled|damaged|unknown","needsReview":false,"hazardous":false,"action":"safe next step","preparation":"safe preparation","reuseOption":"safe reuse option or not suitable","explanation":"brief visible evidence"}.
Treat appearance as uncertain evidence, not proof. Never assert resin, composition, recyclability, contamination, or a hazard unless visually evident. Use unknown and needsReview when unclear or obscured. Do not infer local rules or recycling outcomes; say requirements vary. For batteries, chemicals, e-waste, medical waste, sharps, leaks, or possible hazards, prioritize caution; never advise opening, testing, or handling them. Keep fields concise.`,
        { mimeType, base64: imageBytes.toString("base64") },
        600,
      );
      const result = validateAnalysis(modelResponse.result);
      sendJson(response, 200, { analysis: result, model: modelResponse.model });
      return;
    }

    const safeInput = validateReportInput(input);
    const modelResponse = await callGemini(
      `Write a concise, clear, item-focused Smart Recycling report in Markdown for EcoSnapAI.
The sanitized JSON below is the complete source of saved-record facts. The original image is not sent with this report request. Image thumbnails are kept in the browser; describe only the recorded model fields as visual estimates. The app stores records in browser localStorage and uses a vanilla JavaScript frontend, a Node.js server with built-in modules and Gemini API calls server-side.
Condition answers are explicitly user-provided self-reports, not AI-observed facts. Use them as personalization context and label them as user-provided. Never contradict or weaken the deterministic safety guidance shown in the browser for batteries, chemical contents, sharp/broken items, pressurized containers, damage, leakage, swelling, heat, or unknown contents. Never recommend opening, testing, repairing, or repurposing hazardous items. When condition information is uncertain, state the uncertainty and recommend human/local-authority review.
Include: an executive summary using the exact saved-record and AI-estimate counts; one clearly labelled subsection for every saved item, with the actual category, item name, model confidence if available, visible material, condition, observed-evidence note, recorded preparation/reuse advice and recorded AI model/time if present; the actual event history and current journey stage for each record; practical next steps that do not pretend to know the user's local rules; safety and uncertainty warnings; environmental impact, weight and recovery values marked "Insufficient data to calculate" when missing; data provenance; limitations; and a final action checklist.
If there are multiple saved items, include a compact itemized table, then use the individual record fields for details. If there is one item, prioritize its actual analysis details. If there are no records, state that plainly and do not invent an example. Use concise language and make the report useful to both ordinary users and hackathon judges.
Every stage is a software simulation, not physical tracking. Event entries are user-interface records, not sensor evidence. There are no connected collection services, facilities, verified destinations, object bounding boxes, secondary predictions, measured weights, environmental calculation factors, or local recycling-rule lookups. Never infer those facts. Do not claim that any item was actually recycled, collected, reused, composted, diverted, or processed. Do not invent confidence, predictions, hazard facts, environmental statistics, user research, accuracy, deployments, costs, partnerships, or system capabilities. Distinguish AI estimates, manual reviews, and sample fixtures. Treat potentially hazardous or uncertain items conservatively; never recommend opening, burning, dismantling, or handling a damaged item.
Data to report (counts and sanitized record fields are authoritative):
${JSON.stringify(safeInput, null, 2)}

Return JSON only in this exact shape: {"reportMarkdown":"...the complete Markdown report as a JSON string..."}.`,
      null,
      4096,
      45000,
    );
    if (typeof modelResponse.result.reportMarkdown !== "string" || modelResponse.result.reportMarkdown.trim().length < 100) {
      throw Object.assign(new Error("The model did not return a complete report. Please retry."), { status: 502 });
    }
    const reportMarkdown = modelResponse.result.reportMarkdown.trim();
    const unsupportedClaims = [
      /\bReact(?: Native)?\b/i,
      /\bFirebase\b|\bFirestore\b/i,
      /\bground[- ]truth dataset of \d+/i,
      /\b(?:carbon footprint|carbon savings|contamination reduction|waste diversion)\s+(?:has been|was|is)\s+(?:reduced|achieved|measured)\b/i,
    ];
    if (unsupportedClaims.some((pattern) => pattern.test(reportMarkdown))) {
      console.error("Gemini report contained unsupported implementation or impact claims; returning an explicit error for offline fallback.");
      throw Object.assign(new Error("Gemini returned unsupported project details. A verified local report will be shown instead."), { status: 502 });
    }
    const verifiedRecordDetails = safeInput.records.length
      ? safeInput.records.map((record) => {
        const conditionDetails = Object.keys(record.userProvidedConditionAnswers).length
          ? ` User-provided condition answers (not AI observations): ${JSON.stringify(record.userProvidedConditionAnswers)}.`
          : " No user-provided condition answers are recorded.";
        const aiDetails = record.aiEstimate
          ? ` AI estimate: material ${record.aiEstimate.material}; condition ${record.aiEstimate.condition}; confidence ${record.aiEstimate.confidence === null ? "not recorded" : `${Math.round(record.aiEstimate.confidence * 100)}%`}; human review ${record.aiEstimate.needsReview ? "recommended" : "not flagged"}; safety flag ${record.aiEstimate.hazardous ? "present" : "not flagged"}; next step ${record.aiEstimate.action}; preparation ${record.aiEstimate.preparation}; reuse ${record.aiEstimate.reuseOption}; visual note ${record.aiEstimate.explanation}.`
          : "";
        return `- **${record.itemName}** — category: ${record.category}; lifecycle: ${record.status} (simulated); source: ${record.source}; events: ${record.eventCount}.${conditionDetails}${aiDetails}`;
      }).join("\n")
      : "- No browser records were supplied.";
    const report = `${reportMarkdown}\n\n## Validated browser record details\nThese details are included directly from the sanitized input records; lifecycle stages remain simulated.\n\n${verifiedRecordDetails}`.slice(0, 30000);
    sendJson(response, 200, {
      report,
      model: modelResponse.model,
      basedOn: { recordCount: safeInput.records.length, generatedAt: safeInput.generatedAt },
    });
  } catch (error) {
    console.error("EcoSnapAI model request failed.", error.message);
    sendJson(response, error.status || 502, { error: error.message || "Model request failed." });
  }
}

const server = http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (pathname.includes("\0")) {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (pathname.startsWith("/api/")) {
    await handleApi(request, response, pathname);
    return;
  }
  if (pathname === "/") pathname = "/index.html";
  if (/(^|\/)\.env(?:$|\.)/i.test(pathname) && !pathname.endsWith(".env.example")) {
    response.writeHead(404).end("Not found");
    return;
  }
  const filePath = path.resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("File could not be served");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`EcoSnapAI is running at http://127.0.0.1:${port}`);
  console.log(`Gemini API: ${process.env.GEMINI_API_KEY ? "configured" : "not configured (manual/demo mode available)"}`);
});
