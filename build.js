// build.js — renders template.html + salon.config.json into public/index.html
// Run: node build.js   (Vercel / Cloudflare run this via the build command)

const fs = require("fs");
const path = require("path");
const cfg = require("./salon.config.json");

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const enc = encodeURIComponent;
const safeJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

// Hair colour levels 1 (darkest) to 10 (lightest)
const LEVELS = [
  "#1b1210", "#2c1c14", "#432a1c", "#5d3b25", "#7b512f",
  "#9b6d3d", "#bb8b52", "#d4ab6d", "#e5c98f", "#f1e0b4",
];

const a = cfg.address;
const fullAddress = `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;
const waUrl = `https://wa.me/${cfg.whatsapp}?text=${enc(`Hi ${cfg.name}, I found you on your website.`)}`;

const rackHtml =
  `<div class="rack" role="img" aria-label="Hair colour levels 1 to 10, from darkest to lightest">` +
  LEVELS.map(
    (c, i) =>
      `<div class="tress" style="--i:${i};--c:${c}"><span class="ring"></span><span class="strand"></span><span class="lvl">${i + 1}</span></div>`
  ).join("") +
  `</div>`;

// Services are grouped: [{ group, items: [{ name, price }] }]
const servicesHtml = cfg.services
  .map((g) => {
    const rows = g.items
      .map(
        (i) =>
          `<li><span>${esc(i.name)}</span>${i.price ? `<span class="price">${esc(i.price)}</span>` : ""}</li>`
      )
      .join("");
    const allPriced = g.items.every((i) => i.price);
    const ask = allPriced
      ? ""
      : `<button class="ask" type="button" data-ask="${esc(`What are the prices for ${g.group.toLowerCase()}?`)}">Ask for prices</button>`;
    return `<div class="svc-group"><h3>${esc(g.group)}</h3><ul class="svc-items">${rows}</ul>${ask}</div>`;
  })
  .join("\n        ");

// Photos: put files in ./photos and list them in the config.
//   heroPhoto: { file, alt }            one large photo beside the hero text
//   photos:    [{ file, alt }, ...]     gallery
//   demoPhotos: true                    stamps every photo "Sample photo" and adds a demo note (stock photos)
// Files listed but missing from ./photos are skipped, so the page never shows broken images.
const photosDir = path.join(__dirname, "photos");
const have = (p) => {
  const ok = p && p.file && fs.existsSync(path.join(photosDir, p.file));
  if (p && p.file && !ok) console.warn("Photo listed in config but missing in ./photos:", p.file);
  return ok;
};
const demoPhotos = Boolean(cfg.demoPhotos);
const sampleTag = demoPhotos ? `<span class="sample-tag">Sample photo</span>` : "";
const heroPhoto = have(cfg.heroPhoto) ? cfg.heroPhoto : null;
const photos = (cfg.photos || []).filter(have);

const figure = (p, cls, eager) =>
  `<figure class="${cls}"><img src="/photos/${enc(p.file)}" alt="${esc(p.alt || cfg.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>${sampleTag}</figure>`;

const heroPhotoHtml = heroPhoto ? figure(heroPhoto, "hero-photo", true) : "";
const heroClass = heroPhoto ? "hero has-photo" : "hero";
const galleryTitle = demoPhotos ? "Sample photos" : cfg.galleryTitle || "Inside the salon";
const galleryHtml = photos.length
  ? `<div class="block" id="gallery"><h2>${esc(galleryTitle)}</h2>` +
    (demoPhotos
      ? `<p class="muted">These are stock photos used for this demo. We will replace them with photos of your own salon.</p>`
      : "") +
    `<div class="gallery">${photos.map((p) => figure(p, "shot", false)).join("")}</div></div>`
  : "";

const chipsHtml = (cfg.chips || [])
  .map((c) => `<button class="chip" type="button" data-say="${esc(c)}">${esc(c)}</button>`)
  .join("");

const instagramRow = cfg.instagram
  ? `<dt>Instagram</dt><dd><a href="${esc(cfg.instagram)}" target="_blank" rel="noopener">${esc(cfg.instagram.replace(/^https?:\/\/(www\.)?/, ""))}</a></dd>`
  : "";

const jsonLd = safeJson({
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: cfg.name,
  telephone: cfg.phoneTel,
  openingHours: cfg.openingHoursSchema || undefined,
  address: {
    "@type": "PostalAddress",
    streetAddress: a.street,
    addressLocality: a.city,
    addressRegion: a.region,
    postalCode: a.postalCode,
    addressCountry: "IN",
  },
});

const clientData = safeJson({
  name: cfg.name,
  phoneDisplay: cfg.phoneDisplay,
  phoneTel: cfg.phoneTel,
  whatsapp: cfg.whatsapp,
  greeting: cfg.greeting,
});

const values = {
  title: esc(cfg.title),
  description: esc(cfg.description),
  name: esc(cfg.name),
  tagline: esc(cfg.tagline),
  hours: esc(cfg.hours),
  rating: esc(cfg.rating),
  reviewCount: esc(cfg.reviewCount),
  reviewsUrl: esc(cfg.reviewsUrl),
  phoneDisplay: esc(cfg.phoneDisplay),
  phoneTel: esc(cfg.phoneTel),
  waUrl: esc(waUrl),
  fullAddress: esc(fullAddress),
  directionsUrl: esc(`https://www.google.com/maps/dir/?api=1&destination=${enc(cfg.mapsQuery)}`),
  mapEmbedUrl: esc(`https://www.google.com/maps?q=${enc(cfg.mapsQuery)}&output=embed`),
  year: String(new Date().getFullYear()),
  creditHtml: cfg.credit ? `<p>${esc(cfg.credit)}</p>` : "",
  instagramRow,
  rackHtml,
  servicesHtml,
  galleryHtml,
  heroPhotoHtml,
  heroClass,
  chipsHtml,
  jsonLd,
  clientData,
};

let html = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");
html = html.replace(/\{\{(\w+)\}\}/g, (m, key) => {
  if (!(key in values)) throw new Error(`Template placeholder not defined: ${key}`);
  return values[key];
});

const out = path.join(__dirname, "public");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), html);
if (heroPhoto || photos.length) {
  fs.cpSync(photosDir, path.join(out, "photos"), {
    recursive: true,
    filter: (src) => fs.statSync(src).isDirectory() || /\.(jpe?g|png|webp|avif)$/i.test(src),
  });
}
const fontsDir = path.join(__dirname, "fonts");
if (fs.existsSync(fontsDir)) fs.cpSync(fontsDir, path.join(out, "fonts"), { recursive: true });
console.log("Built public/index.html for", cfg.name, `(${photos.length + (heroPhoto ? 1 : 0)} photos)`);
