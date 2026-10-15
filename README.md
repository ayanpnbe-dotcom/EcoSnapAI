# EcoSnapAI

Hackathon prototype for the Smart Recycling Assistant track. The local app combines sample/manual material review, optional Gemini image analysis, a simulated Digital Twin, browser-local history, and an evidence-grounded recycling report with an optional Gemini narrative.

## Run locally

1. Install Node.js 18 or newer.
2. Open PowerShell in this folder.
3. Start the server:

   ```powershell
   node .\server.js
   ```

4. Open <http://127.0.0.1:4173>.

No npm packages are required.

## Add your Gemini API key

1. Create a key in [Google AI Studio](https://aistudio.google.com/app/apikey). Check Google's current account, region, quota, and billing requirements.
2. In the EcoSnapAI project folder, copy `.env.example` and name the copy `.env`.
3. Open `.env` and add your key after `GEMINI_API_KEY=`:

   ```dotenv
   GEMINI_API_KEY=your_key_goes_here
   GEMINI_MODEL=gemini-3.1-flash-lite
   ```

4. Save the file. Stop the running local server with **Ctrl+C**, then start it again using `node .\server.js`.
5. Reload the site. The AI status near the scan controls should show **Google Gemini ready**.
6. Add a photo or choose **Take a photo** for an inline live camera preview. Capture is local and does not start analysis; choose **Analyze photo with Gemini** when you are ready, then save the result to your browser history. In the activity dashboard choose **Generate smart report** to preview per-item image-analysis details, model confidence and timestamp, recommendations, recorded simulated lifecycle events, and evidence/limitations. Gemini adds an optional narrative; if it is unavailable, the factual saved-data report still works. **Build offline report** never calls Gemini.
7. Use **Print / Save PDF** to open the browser print dialog and select **Save as PDF**. **Download data JSON**, **Copy report**, and **Download .md** export saved analysis and report content. The preview provides an image thumbnail when available; it does not embed the full-resolution upload.
8. After choosing a sample, manually reviewing a photo, or completing a Gemini estimate, answer the condition questions in the review panel. Answers are user-provided, kept separate from Gemini's visual estimate, and can be revised later from **Condition assessment** in the item's history. The transparent local rules update preparation, safety notes, and explainable property tags immediately. Battery and damage precautions take precedence over ordinary recycling or reuse suggestions.
9. Generate either report to view each saved item's assessment checklist. Each item card has **Download this item report (.md)**; **Download all item reports (.zip)** creates an archive with one Markdown file per saved item. Both include any small retained thumbnail as an embedded image and state unknown or unavailable values rather than estimating them. The project Markdown export appends item checklists without replacing existing report content.

The `.env` file is ignored by Git and blocked from the static web server. The API key is read only by the local server; it is not placed in the page, browser storage, or frontend JavaScript. Do not paste the key into chat, screenshots, source code, or a committed file. If you suspect it was exposed, revoke it in AI Studio and create a replacement.

Use the header theme button to cycle **Light**, **Dark**, and **3D** themes. The selected theme is saved in this browser; on first visit, the operating system's light/dark preference is used. Live camera preview requires browser permission and a secure context (localhost is supported); if live preview is unavailable, use the device camera/file-picker fallback.

## What gets sent to Gemini

- **Photo analysis:** an optimized JPEG copy (scaled to a maximum 1280-pixel edge) of the image selected for AI analysis, plus a short classification/safety instruction. This includes a captured photo only after you explicitly click the Gemini analysis button; capture itself only creates a local preview. Resizing reduces upload and model-processing time; image details may be reduced.
- **AI report narrative:** material category, item label, sample/manual/AI origin, simulated lifecycle stage, analysis timestamp/model, recorded event history, sanitized AI estimate details, and validated user-provided condition answers for personalized context. Answers are labeled as self-reported, not AI-observed; original photos and report thumbnails are not sent.
- **Offline project report:** generated entirely in the browser from saved records; nothing is sent to Gemini.

Records and small optional thumbnails for up to four recent analyzed photos remain in this browser's `localStorage`; this prototype has no account system or server database. Full-size photos remain only in the current browser session and are not included in report requests. Use demo/sample records for a public hackathon demonstration and get consent before sending identifiable or sensitive images to an external AI provider.

## Prototype limitations

- Gemini's image classification and confidence are estimates, not validated model accuracy. Review uncertain results.
- Disposal advice is general and does not look up or verify local recycling rules.
- Condition answers and rules-based follow-up assessments are educational guidance, not verified material tests or municipal instructions. Compostability, local acceptance, and chemical composition are not certified.
- The material lifecycle is simulated. A saved record does not prove the item was collected, recycled, or reused.
- The report shows saved analysis fields and recorded events but cannot verify material composition, object counts in a photo, collection, processing, or final outcomes. Weight, diversion, energy and emissions figures are not calculated when measured inputs and documented factors are unavailable.
- PDF output uses the browser's print dialog; choose **Save as PDF** there. Page layout and available page-number support depend on the browser.
- The generated report identifies simulated activity and avoids asserting unmeasured environmental impact.
- Gemini requests use your API quota and can fail due to network, quota, temporary provider load, region, model, or key access. Use **Build offline report** when Gemini is unavailable.

## Local endpoints

- `GET /api/status` — provider/model readiness without revealing the key.
- `POST /api/analyze` — analyze a supported image through Gemini.
- `POST /api/report` — generate the Gemini project report from validated, sanitized material records.

For an API key setup check, add the key and restart first; the browser UI and endpoint status will confirm whether the server has loaded it.
