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
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
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

async function callGemini(prompt, image) {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `${apiBase}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const parts = [{ text: prompt }];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw Object.assign(new Error("The model took too long to respond. Please retry."), { status: 504 });
    }
    throw Object.assign(new Error("Could not reach Gemini. Check your internet connection and retry."), { status: 502 });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload?.error?.message;
    if (response.status === 401 || response.status === 403) {
      throw Object.assign(new Error("Gemini rejected the API key. Check GEMINI_API_KEY and its API access."), { status: 502 });
    }
    if (response.status === 429) {
      throw Object.assign(new Error("Gemini rate limit or quota reached. Wait a moment or check your Google AI Studio quota."), { status: 429 });
    }
    console.error("Gemini request failed.", { status: response.status, message: providerMessage || "No provider message" });
    throw Object.assign(new Error("Gemini could not complete this request. Check the server terminal and try again."), { status: 502 });
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) {
    throw Object.assign(new Error("Gemini returned an empty response. Please retry."), { status: 502 });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("Gemini returned an unreadable response. Please retry."), { status: 502 });
  }
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
    preparation: cleanText(analysis.preparation, "Follow local authority guidance; no local rule has been verified."),
    reuseOption: cleanText(analysis.reuseOption, "Consider safe reuse if the item is intact and suitable."),
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
      category: record.category,
      itemName: cleanText(record.itemName, "Unidentified item", 100),
      status: record.status,
      source: record.source === "ai-model" ? "AI-assisted visual review" : record.source === "manual-review" ? "manual review" : "sample data",
      createdAt: typeof record.createdAt === "string" && !Number.isNaN(Date.parse(record.createdAt))
        ? new Date(record.createdAt).toISOString()
        : null,
      eventCount: Array.isArray(record.events) ? Math.min(record.events.length, 50) : 0,
    };
    if (record.source === "ai-model" && record.aiSummary && typeof record.aiSummary === "object") {
      const confidence = Number(record.aiSummary.confidence);
      safeRecord.aiEstimate = {
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
        needsReview: record.aiSummary.needsReview === true,
        material: cleanText(record.aiSummary.material, "Not recorded", 120),
        condition: cleanText(record.aiSummary.condition, "Unknown", 40),
        action: cleanText(record.aiSummary.action, "No action recorded", 300),
      };
    }
    return safeRecord;
  });
  return {
    projectName: "EcoSnapAI",
    track: "Smart Recycling Assistant",
    records,
    generatedAt: new Date().toISOString(),
  };
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/status") {
    sendJson(response, 200, {
      provider: "Google Gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
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

      const result = validateAnalysis(await callGemini(
        `Analyze the attached waste-item photo for the EcoSnapAI Smart Recycling Assistant prototype.
Return one JSON object with exactly these fields:
{"category":"plastic|paper|metal|glass|organic|hazardous|unknown","itemName":"short plain name","material":"visible material, noting uncertainty","confidence":0.0,"condition":"clean|soiled|damaged|unknown","needsReview":false,"hazardous":false,"action":"safe general next step","preparation":"safe preparation advice","reuseOption":"safe reuse option or not suitable","explanation":"brief evidence-based explanation"}.
Rules: Treat the image as uncertain evidence, not proof. Do not claim resin, composition, recyclability, contamination, or hazardousness with certainty when not visually evident. Use category unknown and needsReview true when uncertain or multiple items obscure each other. Never infer a local rule, collection service, or recycling outcome. Give general guidance only and explicitly tell the user local requirements vary. When a battery, chemical, e-waste, medical waste, sharp, leaking, or otherwise possibly hazardous item is visible, set hazardous true and prioritize a cautious special-handling warning; do not advise the user to open, test, or touch it. Keep every text field concise.`,
        { mimeType, base64: imageBytes.toString("base64") },
      ));
      sendJson(response, 200, { analysis: result, model: process.env.GEMINI_MODEL || "gemini-3.8-flash" });
      return;
    }

    const safeInput = validateReportInput(input);
    const reportResult = await callGemini(
      `Write a thorough, presentation-ready hackathon product report in Markdown for EcoSnapAI, a Smart Recycling Assistant.
The supplied JSON contains the actual prototype's available records, which may be empty. Treat every lifecycle status as simulated. Distinguish observed browser records, AI-assisted visual estimates, manual reviews, and sample fixtures. Never claim actual recycling, diversion, carbon savings, classification accuracy, verified local rules, or operational impact unless the input contains measured evidence (it does not). State limitations and safety caveats plainly. If records are empty, report that no user data has been collected instead of inventing findings.
Include these sections:
# EcoSnapAI — Smart Recycling Assistant
## Executive summary
## Problem and target users
## Product goals and value proposition
## End-to-end user journey
## Core features (computer vision, grounded disposal guidance, Digital Twin, dashboard)
## AI and rules architecture (note the configured model and that local rules are not integrated)
## Digital Twin data and analytics (summarize the supplied records exactly)
## Safety, privacy and limitations
## Success metrics and how to measure them (no fabricated results)
## Risks and mitigations
## Next-step roadmap (model evaluation, verified location rules, persistence, usability testing)
## 2-minute judge demo script
Write a useful, specific report rather than generic filler. Mark AI-produced results and simulated activity as prototypes.

Prototype data (treat as the sole source of user-record counts; do not infer results beyond it):
${JSON.stringify(safeInput, null, 2)}

Return JSON only in this exact shape: {"reportMarkdown":"...the complete Markdown report as a JSON string..."}.`,
      null,
    );
    if (typeof reportResult.reportMarkdown !== "string" || reportResult.reportMarkdown.trim().length < 100) {
      throw Object.assign(new Error("The model did not return a complete report. Please retry."), { status: 502 });
    }
    const report = reportResult.reportMarkdown.trim().slice(0, 30000);
    sendJson(response, 200, {
      report,
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
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
