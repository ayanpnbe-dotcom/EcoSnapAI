# EcoSnapAI

Hackathon prototype for the Smart Recycling Assistant track. The local app combines sample/manual material review, optional Gemini image analysis, a simulated Digital Twin, browser-local history, a Gemini-generated project report, and a local offline report option.

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
6. Add/take a photo and choose **Analyze photo with Gemini**, or use **Generate AI report** in the activity dashboard. If Gemini is unavailable or the local request fails, the AI report button automatically creates a clearly labelled offline fallback. **Build offline report** compiles a detailed report instantly from this browser's saved records without calling Gemini.

The `.env` file is ignored by Git and blocked from the static web server. The API key is read only by the local server; it is not placed in the page, browser storage, or frontend JavaScript. Do not paste the key into chat, screenshots, source code, or a committed file. If you suspect it was exposed, revoke it in AI Studio and create a replacement.

## What gets sent to Gemini

- **Photo analysis:** an optimized JPEG copy (scaled to a maximum 1280-pixel edge) of the image selected for AI analysis, plus a short classification/safety instruction. The browser-only preview is not sent until you explicitly click the Gemini analysis button. Resizing reduces upload and model-processing time; image details may be reduced.
- **AI project report:** material category, item label, sample/manual/AI origin, simulated lifecycle stage, timestamp, event count, and sanitized AI estimate details. Photos and API keys are not included.
- **Offline project report:** generated entirely in the browser from saved records; nothing is sent to Gemini.

Records remain in this browser's `localStorage`; this prototype has no account system or server database. Use demo/sample records for a public hackathon demonstration and get consent before sending identifiable or sensitive images to an external AI provider.

## Prototype limitations

- Gemini's image classification and confidence are estimates, not validated model accuracy. Review uncertain results.
- Disposal advice is general and does not look up or verify local recycling rules.
- The material lifecycle is simulated. A saved record does not prove the item was collected, recycled, or reused.
- The generated report identifies simulated activity and avoids asserting unmeasured environmental impact.
- Gemini requests use your API quota and can fail due to network, quota, temporary provider load, region, model, or key access. Use **Build offline report** when Gemini is unavailable.

## Local endpoints

- `GET /api/status` — provider/model readiness without revealing the key.
- `POST /api/analyze` — analyze a supported image through Gemini.
- `POST /api/report` — generate the Gemini project report from validated, sanitized material records.

For an API key setup check, add the key and restart first; the browser UI and endpoint status will confirm whether the server has loaded it.
