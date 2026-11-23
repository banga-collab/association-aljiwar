/* Association Al Jiwar — site + admin. Zero dependencies (Node 18+).
   Local:   node server.js         -> http://localhost:3000   (admin: /admin)
   Env:     PORT, ADMIN_PASSWORD (if unset locally, a password is generated in .admin-password)
   Vercel:  see api/index.js — content saved by the admin is committed to GitHub (lib/vfs.js). */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "content.json");
const UPLOADS = path.join(ROOT, "assets", "uploads");
const SERVERLESS = !!process.env.VERCEL;
const LANGS = ["ar", "fr", "en"];
const PAGES = ["", "about", "activities", "projects", "partners", "donate", "contact"];

/* ---------------- admin password & sessions (stateless signed cookie) ---------------- */
function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (SERVERLESS) return "";                       // on Vercel the password must be set in the environment
  const f = path.join(ROOT, ".admin-password");
  try { return fs.readFileSync(f, "utf8").trim(); } catch (e) { /* first start */ }
  const pw = crypto.randomBytes(9).toString("base64url");
  fs.writeFileSync(f, pw + "\n");
  console.log("\n  Mot de passe admin créé : " + pw + "\n  (fichier .admin-password — définissez ADMIN_PASSWORD pour le changer)\n");
  return pw;
}
const PW = adminPassword();
const KEY = crypto.createHash("sha256").update("aljiwar|" + PW + "|" + (process.env.APP_SECRET || process.env.GH_TOKEN || "")).digest();
const SESSION_MS = 12 * 3600e3;
const sign = s => crypto.createHmac("sha256", KEY).update(s).digest("base64url");
function cookies(req) { const o = {}; (req.headers.cookie || "").split(";").forEach(c => { const i = c.indexOf("="); if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return o; }
function isHttps(req) { return !!req.socket.encrypted || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https"; }
function sessionCookie(req, val, maxAge) { return "aj_admin=" + val + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + maxAge + (isHttps(req) ? "; Secure" : ""); }
function authed(req) {
  const t = String(cookies(req).aj_admin || ""), i = t.indexOf(".");
  if (i < 1 || !PW) return false;
  const exp = +t.slice(0, i), sig = Buffer.from(t.slice(i + 1)), good = Buffer.from(sign(t.slice(0, i)));
  return exp > Date.now() && sig.length === good.length && crypto.timingSafeEqual(sig, good);
}
function pwOk(pw) { const a = crypto.createHash("sha256").update(String(pw)).digest(), b = crypto.createHash("sha256").update(PW).digest(); return !!PW && crypto.timingSafeEqual(a, b); }
const attempts = new Map();
function clientIp(req) { return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim(); }

/* ---------------- content ---------------- */
function load() { try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (e) { return {}; } }
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function tr(o, lang) { if (!o) return ""; if (typeof o === "string") return o; return o[lang] || o.fr || o.ar || o.en || ""; }
function paras(text) { return String(text || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>").join(""); }
const digits = s => String(s || "").replace(/[^0-9]/g, "");
function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
function img(u) { u = String(u || "").trim(); return /^\/assets\/[\w\-./]+\.(jpe?g|png|webp|gif)$/i.test(u) && !u.includes("..") ? u : safeUrl(u); }

/* ---------------- interface strings ---------------- */
const UI = {
  ar: { home: "الرئيسية", about: "من نحن", activities: "أنشطتنا", projects: "مشاريعنا", partners: "شركاؤنا", donate: "تبرّع", contact: "اتصل بنا",
    donateNow: "تبرّع الآن", seeActivities: "اكتشف أنشطتنا", allActivities: "كل الأنشطة", allProjects: "كل المشاريع", inNumbers: "الجوار بالأرقام",
    values: "قيمنا", story: "قصتنا", current: "مشاريع جارية", upcoming: "مشاريع قادمة", done: "مشاريع منجزة", needs: "ما نحتاجه", s_current: "جارٍ", s_upcoming: "قادم", s_done: "منجز",
    ctaTitle: "ساهم معنا في رمضان 1448", ctaText: "قفة واحدة أو مقعد على مائدة إفطار الأيتام: كل مساهمة تصنع الفرق.",
    partnersSoon: "قائمة الشركاء قيد التحديث.", becomePartner: "كن شريكًا", writeUs: "راسلنا",
    bank: "التحويل البنكي", bankName: "البنك", holder: "صاحب الحساب", rib: "رقم الحساب (RIB)", swift: "SWIFT", copy: "نسخ", copied: "تم النسخ",
    bankAsk: "اطلبوا معلومات الحساب البنكي عبر واتساب.", inKind: "تبرع عيني", volunteer: "تطوّع معنا", whatsapp: "واتساب", whatsappMsg: "السلام عليكم، أريد التبرع لجمعية الجوار",
    phone: "الهاتف", email: "البريد الإلكتروني", address: "العنوان", hours: "أوقات الاستقبال", follow: "تابعونا",
    formName: "الاسم", formMsg: "رسالتكم", formSend: "إرسال عبر واتساب", formNoWa: "رقم واتساب غير متوفر بعد. راسلونا عبر البريد الإلكتروني.",
    rights: "جميع الحقوق محفوظة", menu: "القائمة", privacy: "لا ننشر أي معطيات شخصية عن المستفيدين." },
  fr: { home: "Accueil", about: "Qui sommes-nous", activities: "Nos activités", projects: "Nos projets", partners: "Partenaires", donate: "Faire un don", contact: "Contact",
    donateNow: "Faire un don", seeActivities: "Découvrir nos activités", allActivities: "Toutes les activités", allProjects: "Tous les projets", inNumbers: "Al Jiwar en chiffres",
    values: "Nos valeurs", story: "Notre histoire", current: "Projets en cours", upcoming: "Projets à venir", done: "Projets réalisés", needs: "Nos besoins", s_current: "En cours", s_upcoming: "À venir", s_done: "Réalisé",
    ctaTitle: "Participez au Ramadan 1448", ctaText: "Un panier, une place à la table du ftour des orphelins : chaque geste compte.",
    partnersSoon: "La liste de nos partenaires arrive bientôt.", becomePartner: "Devenir partenaire", writeUs: "Nous écrire",
    bank: "Virement bancaire", bankName: "Banque", holder: "Titulaire", rib: "RIB", swift: "SWIFT", copy: "Copier", copied: "Copié",
    bankAsk: "Demandez nos coordonnées bancaires sur WhatsApp.", inKind: "Don en nature", volunteer: "Devenir bénévole", whatsapp: "WhatsApp", whatsappMsg: "Bonjour, je souhaite faire un don à l'Association Al Jiwar",
    phone: "Téléphone", email: "E-mail", address: "Adresse", hours: "Horaires", follow: "Suivez-nous",
    formName: "Votre nom", formMsg: "Votre message", formSend: "Envoyer sur WhatsApp", formNoWa: "Numéro WhatsApp bientôt disponible. Écrivez-nous par e-mail.",
    rights: "Tous droits réservés", menu: "Menu", privacy: "Nous ne publions aucune donnée personnelle sur les bénéficiaires." },
  en: { home: "Home", about: "About us", activities: "What we do", projects: "Projects", partners: "Partners", donate: "Donate", contact: "Contact",
    donateNow: "Donate now", seeActivities: "See what we do", allActivities: "All activities", allProjects: "All projects", inNumbers: "Al Jiwar in numbers",
    values: "Our values", story: "Our story", current: "Current projects", upcoming: "Upcoming projects", done: "Completed projects", needs: "What we need", s_current: "In progress", s_upcoming: "Upcoming", s_done: "Completed",
    ctaTitle: "Join us for Ramadan 1448", ctaText: "A food basket, a seat at the orphans' iftar table: every gesture counts.",
    partnersSoon: "Our partner list is coming soon.", becomePartner: "Become a partner", writeUs: "Write to us",
    bank: "Bank transfer", bankName: "Bank", holder: "Account holder", rib: "Account number (RIB)", swift: "SWIFT", copy: "Copy", copied: "Copied",
    bankAsk: "Ask us for our bank details on WhatsApp.", inKind: "In-kind donation", volunteer: "Volunteer with us", whatsapp: "WhatsApp", whatsappMsg: "Hello, I would like to donate to Al Jiwar Association",
    phone: "Phone", email: "Email", address: "Address", hours: "Opening hours", follow: "Follow us",
    formName: "Your name", formMsg: "Your message", formSend: "Send on WhatsApp", formNoWa: "WhatsApp number coming soon. Please email us.",
    rights: "All rights reserved", menu: "Menu", privacy: "We never publish personal data about the people we help." }
};

/* ---------------- icons ---------------- */
const ICONS = {
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  heart: '<path d="M12 20s-7-4.4-9-9.2C1.6 7.4 4 4 7.3 4c2 0 3.4 1.1 4.7 2.8C13.3 5.1 14.7 4 16.7 4 20 4 22.4 7.4 21 10.8 19 15.6 12 20 12 20z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/><path d="m17 3 .6 1.6L19 5l-1.4.5L17 7l-.6-1.5L15 5l1.4-.4z"/>',
  table: '<path d="M3 10h18M5 10v9M19 10v9M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="3.5" r="1"/>',
  hands: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v5M13 10V6a1.5 1.5 0 0 1 3 0v6"/><path d="M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 6 17.3L4.2 13.6a1.5 1.5 0 0 1 2.6-1.5L7 12.5"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 4.8"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.8z"/><path d="M9 9.5c.3 2 1.8 3.8 4 4.6l1.2-1.1 1.8.8c-.2 1-1 1.6-2 1.6A6.5 6.5 0 0 1 8 9.2c0-1 .7-1.8 1.6-2l.8 1.8z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const icon = (n, cls) => '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || ICONS.heart) + "</svg>";

/* ---------------- page rendering ---------------- */
function layout(c, lang, page, title, body, desc) {
  const u = UI[lang], s = c.site || {}, name = tr(s.name, lang), href = p => "/" + lang + "/" + (p ? p : "");
  const nav = PAGES.filter(p => p !== "donate").map(p => '<a href="' + href(p) + '"' + (p === page ? ' aria-current="page"' : "") + ">" + esc(p ? u[p] : u.home) + "</a>").join("");
  const langs = LANGS.map(l => '<a href="/' + l + "/" + page + '" lang="' + l + '"' + (l === lang ? ' aria-current="true"' : "") + ">" + ({ ar: "ع", fr: "FR", en: "EN" })[l] + "</a>").join("");
  const base = safeUrl(s.siteUrl).replace(/\/+$/, "");
  const alt = base ? LANGS.map(l => '<link rel="alternate" hreflang="' + l + '" href="' + base + "/" + l + "/" + page + '">').join("") : "";
  const wa = digits(s.whatsapp);
  const social = [["facebook", "Facebook"], ["instagram", "Instagram"]].filter(([k]) => safeUrl(s[k])).map(([k, l]) => '<a href="' + esc(safeUrl(s[k])) + '" rel="noopener" target="_blank">' + l + "</a>").join(" · ");
  return '<!doctype html><html lang="' + lang + '" dir="' + (lang === "ar" ? "rtl" : "ltr") + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title ? title + " · " + name : name + " · " + tr(s.tagline, lang)) + "</title>" +
    '<meta name="description" content="' + esc(String(desc || tr(c.home && c.home.heroText, lang)).slice(0, 160)) + '">' +
    '<meta property="og:title" content="' + esc(title || name) + '"><meta property="og:image" content="/assets/img/logo.png">' + alt +
    '<link rel="icon" href="/assets/img/favicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@500;700;800&family=Nunito:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap">' +
    '<link rel="stylesheet" href="/assets/css/site.css"></head><body class="page-' + (page || "home") + '">' +
    '<a class="skip" href="#main">↓</a><header class="top"><div class="wrap top-in">' +
    '<a class="brand" href="' + href("") + '"><img src="/assets/img/symbol.png" alt="" width="52" height="40"><span>' + esc(name) + "</span></a>" +
    '<button class="burger" aria-expanded="false" aria-controls="nav" aria-label="' + esc(u.menu) + '"><span></span><span></span><span></span></button>' +
    '<nav id="nav" class="nav">' + nav + '<div class="langs">' + langs + '</div><a class="btn btn-orange btn-sm" href="' + href("donate") + '">' + icon("heart") + esc(u.donate) + "</a></nav></div></header>" +
    '<main id="main">' + body + "</main>" +
    '<footer class="foot"><div class="wrap foot-in"><div><img src="/assets/img/logo.png" alt="' + esc(name) + '" width="150" class="foot-logo"><p>' + esc(tr(s.tagline, lang)) + "</p></div>" +
    '<div><h3>' + esc(u.contact) + "</h3><ul>" +
      (s.phone ? '<li><a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '" dir="ltr">' + esc(s.phone) + "</a></li>" : "") +
      (wa ? '<li><a href="https://wa.me/' + wa + '" rel="noopener" target="_blank">' + esc(u.whatsapp) + "</a></li>" : "") +
      (s.email ? '<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a></li>" : "") +
      (tr(s.address, lang) ? "<li>" + esc(tr(s.address, lang)) + "</li>" : "") +
      (social ? "<li>" + social + "</li>" : "") +
    '</ul></div><div><h3>' + esc(u.menu) + '</h3><ul>' + PAGES.map(p => '<li><a href="' + href(p) + '">' + esc(p ? u[p] : u.home) + "</a></li>").join("") + "</ul></div></div>" +
    '<div class="wrap foot-end"><span>© ' + new Date().getFullYear() + " " + esc(name) + " · " + esc(u.rights) + "</span><span>" + esc(u.privacy) + "</span></div></footer>" +
    '<script src="/assets/js/site.js" defer></script></body></html>';
}

function pageHead(title, intro, tone) {
  return '<section class="phead ' + (tone || "") + '"><div class="wrap"><h1>' + esc(title) + "</h1>" + (intro ? '<div class="lead">' + paras(intro) + "</div>" : "") + "</div></section>";
}
function media(src, alt, fallbackIcon, cls) {
  const s = img(src);
  return s ? '<div class="media ' + (cls || "") + '"><img src="' + esc(s) + '" alt="' + esc(alt) + '" loading="lazy"></div>'
           : '<div class="media media-empty ' + (cls || "") + '">' + icon(fallbackIcon || "heart") + "</div>";
}
function activityCard(a, lang) {
  return '<article class="card act" id="' + esc(a.id) + '">' + media(a.image, tr(a.title, lang), a.icon) + '<div class="card-body"><h3>' + esc(tr(a.title, lang)) + "</h3>" + paras(tr(a.text, lang)) + "</div></article>";
}
function projectCard(p, lang, u) {
  const needs = tr(p.needs, lang);
  return '<article class="card proj" id="' + esc(p.id) + '">' + media(p.image, tr(p.title, lang), "home") + '<div class="card-body"><span class="tag tag-' + esc(p.status) + '">' + esc(u["s_" + p.status] || "") + "</span><h3>" + esc(tr(p.title, lang)) + "</h3>" + paras(tr(p.text, lang)) +
    (needs ? '<p class="needs"><strong>' + esc(u.needs) + " :</strong> " + esc(needs) + "</p>" : "") + "</div></article>";
}
function waLink(c, text) { const n = digits(c.site && c.site.whatsapp); return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(text) : ""; }
function partnersGrid(c, lang, u) {
  const list = (c.partners && c.partners.list) || [];
  if (!list.length) return '<p class="muted center">' + esc(u.partnersSoon) + "</p>";
  return '<div class="partners">' + list.map(p => {
    const logo = img(p.logo), url = safeUrl(p.url), inner = (logo ? '<img src="' + esc(logo) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<span class="pname">' + esc(p.name) + "</span>") + (tr(p.text, lang) ? "<small>" + esc(tr(p.text, lang)) + "</small>" : "");
    return url ? '<a class="partner" href="' + esc(url) + '" rel="noopener" target="_blank">' + inner + "</a>" : '<div class="partner">' + inner + "</div>";
  }).join("") + "</div>";
}

function render(c, lang, page) {
  const u = UI[lang], h = c.home || {}, s = c.site || {}, href = p => "/" + lang + "/" + p;
  if (page === "") {
    const stats = (c.stats || []).filter(x => String(x.value || "").trim());
    const hero = img(h.heroImage);
    const body =
      '<section class="hero"><div class="wrap hero-in"><div class="hero-text"><p class="eyebrow">' + esc(tr(s.tagline, lang)) + "</p><h1>" + esc(tr(h.heroTitle, lang)) + "</h1>" + paras(tr(h.heroText, lang)) +
      '<div class="actions"><a class="btn btn-orange" href="' + href("donate") + '">' + icon("heart") + esc(u.donateNow) + '</a><a class="btn btn-ghost" href="' + href("activities") + '">' + esc(u.seeActivities) + icon("arrow", "flip") + "</a></div></div>" +
      '<div class="hero-art">' + (hero ? '<img class="hero-photo" src="' + esc(hero) + '" alt="">' : '<div class="arcs"></div><img class="hero-logo" src="/assets/img/symbol.png" alt="">') + "</div></div></section>" +
      (stats.length ? '<section class="stats"><div class="wrap"><h2 class="sr">' + esc(u.inNumbers) + '</h2><ul class="stat-list">' + stats.map(x => "<li><strong>" + esc(x.value) + "</strong><span>" + esc(tr(x.label, lang)) + "</span></li>").join("") + "</ul></div></section>" : "") +
      '<section class="mission"><div class="wrap narrow center"><h2>' + esc(tr(h.missionTitle, lang)) + "</h2>" + paras(tr(h.missionText, lang)) + "</div></section>" +
      '<section class="block"><div class="wrap"><div class="sec-head"><h2>' + esc(u.activities) + '</h2><a href="' + href("activities") + '">' + esc(u.allActivities) + icon("arrow", "flip") + '</a></div><div class="grid grid-3">' +
        (c.activities || []).slice(0, 3).map(a => activityCard(a, lang)).join("") + "</div></div></section>" +
      '<section class="cta"><div class="wrap cta-in"><div><h2>' + esc(u.ctaTitle) + "</h2><p>" + esc(u.ctaText) + '</p></div><a class="btn btn-white" href="' + href("donate") + '">' + esc(u.donateNow) + "</a></div></section>" +
      '<section class="block"><div class="wrap"><div class="sec-head"><h2>' + esc(u.projects) + '</h2><a href="' + href("projects") + '">' + esc(u.allProjects) + icon("arrow", "flip") + '</a></div><div class="grid grid-3">' +
        (c.projects || []).filter(p => p.status !== "done").slice(0, 3).map(p => projectCard(p, lang, u)).join("") + "</div></div></section>" +
      '<section class="block soft"><div class="wrap"><div class="sec-head"><h2>' + esc(u.partners) + '</h2><a href="' + href("partners") + '">' + esc(u.becomePartner) + icon("arrow", "flip") + "</a></div>" + partnersGrid(c, lang, u) + "</div></section>";
    return layout(c, lang, page, "", body);
  }
  if (page === "about") {
    const a = c.about || {};
    const body = pageHead(u.about, tr(a.intro, lang)) +
      '<section class="block"><div class="wrap split"><div><h2>' + esc(u.story) + "</h2>" + paras(tr(a.story, lang)) + "</div>" + (img(a.image) ? media(a.image, u.story, "users", "tall") : '<div class="media media-empty tall"><img src="/assets/img/logo.png" alt="" class="logo-in"></div>') + "</div></section>" +
      '<section class="block soft"><div class="wrap"><h2 class="center">' + esc(u.values) + '</h2><div class="grid grid-4">' +
        (a.values || []).map((v, i) => '<div class="value v' + (i % 3) + '"><h3>' + esc(tr(v.title, lang)) + "</h3>" + paras(tr(v.text, lang)) + "</div>").join("") + "</div></div></section>";
    return layout(c, lang, page, u.about, body, tr(a.intro, lang));
  }
  if (page === "activities") {
    const body = pageHead(u.activities, tr(h.missionText, lang)) + '<section class="block"><div class="wrap rows">' +
      (c.activities || []).map(a => '<article class="row" id="' + esc(a.id) + '">' + media(a.image, tr(a.title, lang), a.icon) + '<div><h2>' + esc(tr(a.title, lang)) + "</h2>" + paras(tr(a.text, lang)) + "</div></article>").join("") +
      '</div></section><section class="cta"><div class="wrap cta-in"><div><h2>' + esc(u.volunteer) + "</h2><p>" + esc(tr(c.donate && c.donate.volunteer, lang)) + '</p></div><a class="btn btn-white" href="' + href("contact") + '">' + esc(u.writeUs) + "</a></div></section>";
    return layout(c, lang, page, u.activities, body);
  }
  if (page === "projects") {
    const groups = ["current", "upcoming", "done"].map(st => { const l = (c.projects || []).filter(p => p.status === st); return l.length ? '<section class="block"><div class="wrap"><h2>' + esc(u[st]) + '</h2><div class="grid grid-3">' + l.map(p => projectCard(p, lang, u)).join("") + "</div></div></section>" : ""; }).join("");
    return layout(c, lang, page, u.projects, pageHead(u.projects, "") + groups);
  }
  if (page === "partners") {
    const p = c.partners || {};
    const body = pageHead(u.partners, tr(p.intro, lang)) + '<section class="block"><div class="wrap">' + partnersGrid(c, lang, u) + "</div></section>" +
      '<section class="cta green"><div class="wrap cta-in"><div><h2>' + esc(u.becomePartner) + "</h2><p>" + esc(tr(p.become, lang)) + '</p></div><a class="btn btn-white" href="' + href("contact") + '">' + esc(u.writeUs) + "</a></div></section>";
    return layout(c, lang, page, u.partners, body, tr(p.intro, lang));
  }
  if (page === "donate") {
    const d = c.donate || {}, wa = waLink(c, u.whatsappMsg);
    const rows = [["bankName", d.bankName], ["holder", d.holder], ["rib", d.rib], ["swift", d.swift]].filter(r => String(r[1] || "").trim());
    const bank = rows.length ? '<dl class="bank">' + rows.map(([k, v]) => "<div><dt>" + esc(u[k]) + '</dt><dd><span dir="ltr">' + esc(v) + "</span>" + (k === "rib" || k === "swift" ? '<button class="copy" data-copy="' + esc(v) + '" data-done="' + esc(u.copied) + '">' + esc(u.copy) + "</button>" : "") + "</dd></div>").join("") + "</dl>"
      : '<p class="muted">' + esc(u.bankAsk) + "</p>";
    const waBtn = wa ? '<a class="btn btn-green" href="' + esc(wa) + '" rel="noopener" target="_blank">' + icon("wa") + esc(u.whatsapp) + "</a>" : "";
    const body = pageHead(u.donate, tr(d.intro, lang), "orange") +
      '<section class="block"><div class="wrap grid grid-3 donate">' +
        '<div class="card pad"><div class="badge">' + icon("heart") + "</div><h2>" + esc(u.bank) + "</h2>" + bank + "</div>" +
        '<div class="card pad"><div class="badge b-blue">' + icon("box") + "</div><h2>" + esc(u.inKind) + "</h2>" + paras(tr(d.inKind, lang)) + waBtn + "</div>" +
        '<div class="card pad"><div class="badge b-green">' + icon("hands") + "</div><h2>" + esc(u.volunteer) + "</h2>" + paras(tr(d.volunteer, lang)) + '<a class="btn btn-ghost" href="' + href("contact") + '">' + esc(u.writeUs) + "</a></div>" +
      "</div></section>";
    return layout(c, lang, page, u.donate, body, tr(d.intro, lang));
  }
  if (page === "contact") {
    const ct = c.contact || {}, wa = digits(s.whatsapp);
    const items = [
      s.phone && ["phone", u.phone, '<a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '" dir="ltr">' + esc(s.phone) + "</a>"],
      wa && ["wa", u.whatsapp, '<a href="https://wa.me/' + wa + '" rel="noopener" target="_blank" dir="ltr">+' + esc(wa) + "</a>"],
      s.email && ["mail", u.email, '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a>"],
      tr(s.address, lang) && ["pin", u.address, esc(tr(s.address, lang))],
      tr(ct.hours, lang) && ["clock", u.hours, esc(tr(ct.hours, lang))]
    ].filter(Boolean);
    const map = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed\?/.test(String(s.mapEmbed || "")) ? '<div class="map"><iframe src="' + esc(s.mapEmbed) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="' + esc(u.address) + '"></iframe></div>' : "";
    const form = wa ? '<form class="card pad waform" data-wa="' + wa + '"><h2>' + esc(u.writeUs) + '</h2><label>' + esc(u.formName) + '<input name="name" required maxlength="80"></label><label>' + esc(u.formMsg) + '<textarea name="msg" rows="5" required maxlength="1000"></textarea></label><button class="btn btn-green" type="submit">' + icon("wa") + esc(u.formSend) + "</button></form>"
      : '<div class="card pad"><h2>' + esc(u.writeUs) + '</h2><p class="muted">' + esc(u.formNoWa) + "</p>" + (s.email ? '<a class="btn btn-blue" href="mailto:' + esc(s.email) + '">' + icon("mail") + esc(s.email) + "</a>" : "") + "</div>";
    const body = pageHead(u.contact, tr(ct.intro, lang), "blue") +
      '<section class="block"><div class="wrap split top">' +
        '<div><ul class="contact-list">' + items.map(([i, l, v]) => "<li>" + icon(i) + "<div><small>" + esc(l) + "</small>" + v + "</div></li>").join("") + "</ul>" + map + "</div>" + form +
      "</div></section>";
    return layout(c, lang, page, u.contact, body, tr(ct.intro, lang));
  }
  return null;
}

/* ---------------- content validation (admin save) ---------------- */
function clean(v, depth) {
  if (depth > 8) return null;
  if (typeof v === "string") return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, 6000);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.slice(0, 200).map(x => clean(x, depth + 1));
  if (v && typeof v === "object") { const o = {}; Object.keys(v).slice(0, 80).forEach(k => { if (/^[\w-]{1,40}$/.test(k)) o[k] = clean(v[k], depth + 1); }); return o; }
  return null;
}
function slugId(s, seen) { let id = String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "item"; let b = id, k = 2; while (seen.has(id)) id = b + "-" + k++; seen.add(id); return id; }
function normalize(c) {
  c = clean(c, 0) || {};
  for (const key of ["site", "home", "about", "partners", "donate", "contact"]) if (!c[key] || typeof c[key] !== "object" || Array.isArray(c[key])) c[key] = {};
  for (const key of ["stats", "activities", "projects"]) if (!Array.isArray(c[key])) c[key] = [];
  if (!Array.isArray(c.partners.list)) c.partners.list = [];
  if (!Array.isArray(c.about.values)) c.about.values = [];
  if (!LANGS.includes(c.site.defaultLang)) c.site.defaultLang = "ar";
  const seenA = new Set(), seenP = new Set();
  c.activities.forEach(a => { a.id = slugId(a.id || tr(a.title, "fr") || tr(a.title, "en"), seenA); if (!ICONS[a.icon]) a.icon = "heart"; });
  c.projects.forEach(p => { p.id = slugId(p.id || tr(p.title, "fr") || tr(p.title, "en"), seenP); if (!["current", "upcoming", "done"].includes(p.status)) p.status = "current"; });
  return c;
}

/* ---------------- http ---------------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8" };
const CSP = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-src https://www.google.com https://maps.google.com; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
function send(res, code, body, headers) {
  const isJson = typeof body === "object" && !Buffer.isBuffer(body);
  res.writeHead(code, Object.assign({ "Content-Type": isJson ? "application/json; charset=utf-8" : "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "Content-Security-Policy": CSP, "Cache-Control": "no-store" }, headers || {}));
  res.end(isJson ? JSON.stringify(body) : body);
}
function readBody(req, limit) {
  return new Promise((ok, ko) => { let n = 0; const parts = []; req.on("data", d => { n += d.length; if (n > limit) { ko(new Error("Fichier trop lourd")); req.destroy(); } else parts.push(d); }); req.on("end", () => ok(Buffer.concat(parts).toString("utf8"))); req.on("error", ko); });
}
function sameOrigin(req) { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch (e) { return false; } }

async function api(req, res, url) {
  const p = url.pathname;
  if (req.method !== "GET" && !sameOrigin(req)) return send(res, 403, { error: "Origine refusée" });
  if (p === "/api/session") return send(res, 200, { authed: authed(req), configured: !!PW });
  if (p === "/api/login" && req.method === "POST") {
    const ip = clientIp(req), a = attempts.get(ip) || { n: 0, until: 0 };
    if (a.n >= 8 && a.until > Date.now()) return send(res, 429, { error: "Trop d'essais. Réessayez dans 15 minutes." });
    let body = {}; try { body = JSON.parse(await readBody(req, 4096)); } catch (e) { /* bad json */ }
    if (!pwOk(body.password || "")) { if (a.until < Date.now()) a.n = 0; a.n++; a.until = Date.now() + 15 * 60e3; attempts.set(ip, a); return send(res, 401, { error: PW ? "Mot de passe incorrect" : "ADMIN_PASSWORD n'est pas défini sur le serveur." }); }
    attempts.delete(ip);
    const exp = String(Date.now() + SESSION_MS);
    return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(req, exp + "." + sign(exp), SESSION_MS / 1000) });
  }
  if (p === "/api/logout" && req.method === "POST") return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(req, "", 0) });
  if (!authed(req)) return send(res, 401, { error: "Connexion requise" });
  if (p === "/api/content" && req.method === "GET") return send(res, 200, load());
  if (p === "/api/content" && req.method === "POST") {
    let c; try { c = JSON.parse(await readBody(req, 2e6)); } catch (e) { return send(res, 400, { error: "Données invalides" }); }
    c = normalize(c);
    try { fs.copyFileSync(DATA_FILE, path.join(ROOT, "data", "content.backup.json")); } catch (e) { /* first save */ }
    fs.writeFileSync(DATA_FILE, JSON.stringify(c, null, 2) + "\n");
    return send(res, 200, { ok: true, content: c });
  }
  if (p === "/api/upload" && req.method === "POST") {
    let b; try { b = JSON.parse(await readBody(req, 8e6)); } catch (e) { return send(res, 413, { error: e.message || "Fichier invalide" }); }
    const m = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ""));
    if (!m) return send(res, 400, { error: "Formats acceptés : JPG, PNG, WEBP, GIF" });
    const buf = Buffer.from(m[2], "base64"); if (buf.length > 5e6) return send(res, 413, { error: "Image trop lourde (5 Mo max)" });
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const base = String(b.name || "photo").replace(/\.[^.]+$/, "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "photo";
    const name = Date.now().toString(36) + "-" + base + "." + ext;
    try { fs.mkdirSync(UPLOADS, { recursive: true }); } catch (e) { /* exists */ }
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return send(res, 200, { ok: true, url: "/assets/uploads/" + name });
  }
  return send(res, 404, { error: "Introuvable" });
}

function serveStatic(req, res, rel) {
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || !/^(assets|admin)\//.test(rel) || rel.includes("..")) return false;
  let st; try { st = fs.statSync(file); } catch (e) { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  if (!TYPES[ext] || ext === ".svg" && rel.startsWith("assets/uploads/")) return false;
  res.writeHead(200, { "Content-Type": TYPES[ext], "X-Content-Type-Options": "nosniff", "Cache-Control": rel.startsWith("admin/") ? "no-cache" : "public, max-age=3600" });
  if (req.method === "HEAD") { res.end(); return true; }
  const s = fs.createReadStream(file); s.on("error", () => res.end()); s.pipe(res); return true;
}

async function handle(req, res) {
  let url; try { url = new URL(req.url, "http://x"); } catch (e) { return send(res, 400, "Bad request"); }
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
    const c = load();
    if (p === "/") return send(res, 302, "", { Location: "/" + ((c.site && c.site.defaultLang) || "ar") + "/" });
    if (p === "/admin" || p === "/admin/") return serveStatic(req, res, "admin/index.html") || send(res, 404, "Not found");
    if (p === "/robots.txt") return send(res, 200, "User-agent: *\nDisallow: /admin\nDisallow: /api/\n" + (safeUrl(c.site && c.site.siteUrl) ? "Sitemap: " + safeUrl(c.site.siteUrl).replace(/\/+$/, "") + "/sitemap.xml\n" : ""), { "Content-Type": "text/plain; charset=utf-8" });
    if (p === "/sitemap.xml") {
      const base = safeUrl(c.site && c.site.siteUrl).replace(/\/+$/, "") || ((isHttps(req) ? "https://" : "http://") + req.headers.host);
      return send(res, 200, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + LANGS.flatMap(l => PAGES.map(pg => "<url><loc>" + esc(base + "/" + l + "/" + pg) + "</loc></url>")).join("") + "</urlset>", { "Content-Type": "application/xml; charset=utf-8" });
    }
    const m = /^\/(ar|fr|en)(?:\/([a-z]*))?\/?$/.exec(p);
    if (m) {
      const page = m[2] || "";
      if (PAGES.includes(page)) return send(res, 200, render(c, m[1], page), { "Cache-Control": "public, max-age=0, s-maxage=30" });
    }
    if (serveStatic(req, res, p.replace(/^\/+/, ""))) return;
    const lang = LANGS.find(l => p.startsWith("/" + l + "/")) || (c.site && c.site.defaultLang) || "ar";
    return send(res, 404, layout(c, lang, "", "404", pageHead("404", ({ ar: "الصفحة غير موجودة.", fr: "Cette page n'existe pas.", en: "This page does not exist." })[lang])));
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "Erreur serveur : " + e.message });
  }
}

module.exports = handle;
if (require.main === module) {
  const port = +process.env.PORT || 3000;
  http.createServer(handle).listen(port, () => console.log("Association Al Jiwar → http://localhost:" + port + "   (admin : http://localhost:" + port + "/admin)"));
}
