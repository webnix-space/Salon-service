# Geetanjali Salon: website + assistant

Static site (built from `salon.config.json`) plus one serverless chat endpoint.

## Files
- `salon.config.json`  all client content: edit this per client
- `template.html`      page layout, styles, chat widget
- `build.js`           renders the template into `public/index.html`
- `api/chat.js`        chatbot endpoint (Gemini by default, Claude switchable)
- `vercel.json`        tells Vercel to run the build and serve `public/`
- `photos/`            optional: put salon photos here and list them in `config.photos`
- `fonts/`             self-hosted Fraunces and Figtree (no Google Fonts request)

## Chatbot provider
Default is Gemini (free tier, good for the pitch demo).

| Env var | Purpose |
|---|---|
| `CHAT_PROVIDER` | `gemini` (default) or `anthropic` |
| `GEMINI_API_KEY` | key from Google AI Studio |
| `GEMINI_MODEL` | default `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL` | default `gemini-flash-latest`; tried automatically if the main model is retired (404), out of quota (429) or Google errors (5xx) |
| `ANTHROPIC_API_KEY`, `CHAT_MODEL` | only if `CHAT_PROVIDER=anthropic` |

**Gemini 2.5 Flash is scheduled to shut down on 16 Oct 2026, and it has already 404'd early once for some users.**
Before any pitch after mid-October, open https://ai.google.dev/gemini-api/docs/models, copy the current Flash model id,
and set it as `GEMINI_MODEL` (or as `GEMINI_FALLBACK_MODEL` today). No code change needed.

**Free-tier data use:** Google may use free-tier prompts to improve its products. Fine for the demo with fake or your own
test numbers. Do not run real customers' names and phone numbers through a free-tier key. Use a paid key or set
`CHAT_PROVIDER=anthropic` before a client goes live.

## If the chat says "assistant isn't available"
1. Open `https://YOUR-SITE/api/chat` in the browser. It shows `keyPresent`, provider and model (never the key).
   - `keyPresent: false` -> the env var name must be exactly `GEMINI_API_KEY`, enabled for Production, then **Redeploy** (env changes do not apply to old deployments).
   - Page not found -> the function did not deploy. Check the project root in Vercel is the folder containing `api/`.
2. If `keyPresent: true`, open `https://YOUR-SITE/?debug`, send a chat, and read the `[debug: ...]` code:
   - `not_configured` -> key missing in this deployment (redeploy).
   - `bad_key` -> Google rejected the key. The Vercel log line says `API key not valid` when the key string itself is wrong
     (typo, cut off, deleted, or pasted with extra text). Create a fresh key at https://aistudio.google.com/apikey, test it
     with the curl command below, then replace the Vercel variable and redeploy. `/api/chat` shows `keyLength` (normally 39).
   - `quota` -> free-tier limit hit; wait, or enable billing on the key.
   - `model_not_found` -> both models unavailable; set `GEMINI_MODEL` to the current Flash id from Google's models page.
   - `404 no_json` -> `/api/chat` is not deployed.
3. Full details are in Vercel -> your project -> Logs (filter by `/api/chat`).

## Test a Gemini key from Termux (before putting it in Vercel)
```
curl -s -H "Content-Type: application/json" -H "x-goog-api-key: PASTE_KEY_HERE" \
  -d '{"contents":[{"parts":[{"text":"say hi"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
```
A JSON reply containing "candidates" means the key works. `API_KEY_INVALID` means create a new key. Never paste keys into chats or commit them to GitHub.

## Deploy (from Termux)
1. `git init && git add . && git commit -m "site"` then push to a new GitHub repo.
2. Vercel dashboard -> Add New Project -> import the repo. Framework preset: Other (vercel.json sets the build).
3. Add environment variables (at least `GEMINI_API_KEY`), then redeploy.
4. Test one full booking chat on the live URL before you pitch.

## Save leads to a Google Sheet (optional)
1. Create a Sheet. Extensions -> Apps Script. Paste:

```js
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow(
    [new Date(), d.name, d.phone, d.service, d.preferred_time, d.notes || ""]
  );
  return ContentService.createTextOutput("ok");
}
```
2. Deploy -> New deployment -> Web app. Execute as: Me. Who has access: Anyone.
3. Copy the web app URL into `LEAD_WEBHOOK_URL`.
Without this, leads only appear in the function logs (search for `LEAD`).

## Photos
Ask the owner to send photos of the salon, or take them on your visit. Do not scrape Google image pages.
Copy the files into `photos/` and add to the config:
`"photos": [ { "file": "front.jpg", "alt": "Styling chairs at Geetanjali Salon" } ]`
For a demo with stock photos, set `"galleryTitle": "Sample photos"` so the page does not claim they show the salon, and replace them before go-live.
Keep each file under about 300 KB (resize before upload).

## Before showing the owner
- Fill `price` for every service you can get from the owner. Until then the site shows "Ask for prices".
- Confirm the WhatsApp number is the salon's WhatsApp number.
- Ask whether "mobile salon service" (listed on their Google profile) means home visits. If yes, add it.
- Add their Instagram URL to `instagram` if they have one. Keep or remove `credit`.

## New client
Copy this folder, edit `salon.config.json` (services, hours, `title`, `description`, `mapsQuery`, `openingHoursSchema`), deploy.
