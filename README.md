# Geetanjali Salon: website + assistant

Static site (built from `salon.config.json`) plus one serverless chat endpoint.

## Files
- `salon.config.json`  all client content: edit this per client
- `template.html`      page layout, styles, chat widget
- `build.js`           renders the template into `public/index.html`
- `api/chat.js`        chatbot endpoint (Gemini by default, Claude switchable)
- `vercel.json`        tells Vercel to run the build and serve `public/`
- `photos/`            hero and gallery photos (stock for the demo, the salon's real ones later)
- `fonts/`             self-hosted Fraunces and Figtree (no Google Fonts request)

## Chatbot provider
Default is Gemini (free tier, good for the pitch demo).

| Env var | Purpose |
|---|---|
| `CHAT_PROVIDER` | `gemini` (default) or `anthropic` |
| `GEMINI_API_KEY` | key from Google AI Studio |
| `GEMINI_MODEL` | default `gemini-3.6-flash` |
| `GEMINI_FALLBACK_MODEL` | default `gemini-flash-latest`; tried automatically if the main model is retired (404), out of quota (429) or Google errors (5xx) |
| `ANTHROPIC_API_KEY`, `CHAT_MODEL` | only if `CHAT_PROVIDER=anthropic` |

**Gemini 2.5 Flash is closed to new API users** (Google returns 404 and points to `gemini-3.6-flash`) and is retiring.
The default is now `gemini-3.6-flash`, with `gemini-flash-latest` as automatic fallback. When Google ships a newer Flash,
set its id in `GEMINI_MODEL`: no code change needed. Thinking is turned down to "minimal" for speed and cost.

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
   - `model_not_found` -> both models unavailable to this key; set `GEMINI_MODEL` to a Flash id that works in the curl test above.
   - `404 no_json` -> `/api/chat` is not deployed.
3. Full details are in Vercel -> your project -> Logs (filter by `/api/chat`).

## Test a Gemini key from Termux (before putting it in Vercel)
```
curl -s -H "Content-Type: application/json" -H "x-goog-api-key: PASTE_KEY_HERE" \
  -d '{"contents":[{"parts":[{"text":"say hi"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
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

## Photos (stock for the demo, real ones for delivery)
The page has 1 hero photo and a 6-photo gallery. The file names are already in `salon.config.json`, so you only drop
files into `photos/`. Missing files are skipped, so nothing ever shows as broken.

**Demo mode:** with `"demoPhotos": true` every photo carries a "Sample photo" tag and the gallery says
"These are stock photos used for this demo. We will replace them with photos of your own salon."
When you swap in the salon's real photos, set `"demoPhotos": false`.

| File | Search on Pexels or Unsplash |
|---|---|
| `hero.jpg` | hair salon interior, salon chairs mirrors |
| `salon-1.jpg` | hair colouring, hair dye salon |
| `salon-2.jpg` | hairdresser cutting hair |
| `salon-3.jpg` | bridal makeup, Indian bridal makeup |
| `salon-4.jpg` | facial treatment, skincare spa |
| `salon-5.jpg` | manicure, nail salon |
| `salon-6.jpg` | hair wash salon, shampoo station |

Check the licence on each photo page (both sites allow commercial use without asking, with some restrictions).
Prefer photos without clearly identifiable faces.

**Resize in Termux** (about 150 KB each keeps the site fast):
```
pkg install imagemagick
mkdir -p photos
for f in ~/storage/downloads/*.jpg; do convert "$f" -resize 1400x -quality 78 -strip "photos/$(basename "$f")"; done
```
Then rename the results to the file names above. Do not scrape Google or Instagram images.

## Demo vs live
While this is a pitch demo built from public information, keep `"noindex": true` and `"demoPhotos": true` in `salon.config.json`.
`noindex` tells Google not to list the demo, so strangers do not find an unofficial site under the salon's name and phone number.
When the owner signs, set both to `false`, add real photos and prices, and connect their own domain.

## Before showing the owner
- Fill `price` for every service you can get from the owner. Until then the site shows "Ask for prices".
- Confirm the WhatsApp number is the salon's WhatsApp number.
- Ask whether "mobile salon service" (listed on their Google profile) means home visits. If yes, add it.
- Add their Instagram URL to `instagram` if they have one. Keep or remove `credit`.

## New client
Copy this folder, edit `salon.config.json` (services, hours, `title`, `description`, `mapsQuery`, `openingHoursSchema`), deploy.
