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
const PAGES = ["", "about", "activities", "projects", "news", "partners", "donate", "contact"];
const EXTRA = ["faq", "transparency"];                       // reachable from the footer, not in the top menu
const DEFAULT_URL = process.env.SITE_URL || "https://association-aljiwar.vercel.app";
const LANG_NAMES = { ar: "العربية", fr: "Français", en: "English" };
const LOCALES = { ar: "ar_MA", fr: "fr_FR", en: "en_US" };

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
const isTodo = p => /^\[[^\]]*\]$/.test(String(p || "").trim());
function paras(text) { return String(text || "").split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !isTodo(p)).map(p => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>").join(""); }
const digits = s => String(s || "").replace(/[^0-9]/g, "");
function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
function img(u) { u = String(u || "").trim(); return /^\/assets\/[\w\-./]+\.(jpe?g|png|webp|gif)$/i.test(u) && !u.includes("..") ? u : safeUrl(u); }

/* ---------------- interface strings ---------------- */
const UI = {
  ar: { news: "المستجدات", latestNews: "آخر المستجدات", allNews: "كل المستجدات", readMore: "اقرأ المقال", backNews: "العودة إلى المستجدات", noNews: "لا توجد مستجدات حاليًا.", faq: "أسئلة شائعة", faqMore: "لم تجدوا جوابكم؟", collected: "تم جمعه", goal: "الهدف", chatOpen: "عندك سؤال؟", chatTitle: "مساعد الجوار", chatHello: "مرحبًا! اختاروا سؤالًا أو اكتبوا سؤالكم.", chatPh: "اكتبوا سؤالكم…", chatSend: "إرسال", chatNo: "لم أجد جوابًا دقيقًا. راسلونا مباشرة وسنرد عليكم:", chatClose: "إغلاق", learnMore: "اقرأ المزيد", support: "ادعم هذا العمل", youSupport: "أنتم تدعمون:", askInsta: "اطلبوا معلومات الحساب البنكي برسالة على إنستغرام.", instaMsg: "راسلونا على إنستغرام", transparency: "الشفافية", legalTitle: "الجمعية في سطور", l_status: "الصفة القانونية", l_registration: "رقم الوصل / الترخيص", l_founded: "سنة التأسيس", l_office: "المكتب المسير", l_report: "التقرير الأدبي والمالي", privacyTitle: "المعطيات الشخصية", download: "تحميل", home: "الرئيسية", about: "من نحن", activities: "أنشطتنا", projects: "مشاريعنا", partners: "شركاؤنا", donate: "تبرّع", contact: "اتصل بنا",
    donateNow: "تبرّع الآن", seeActivities: "اكتشف أنشطتنا", allActivities: "كل الأنشطة", allProjects: "كل المشاريع", inNumbers: "الجوار بالأرقام",
    values: "قيمنا", story: "قصتنا", current: "مشاريع جارية", upcoming: "مشاريع قادمة", done: "مشاريع منجزة", needs: "ما نحتاجه", s_current: "جارٍ", s_upcoming: "قادم", s_done: "منجز",
    ctaTitle: "ساهم معنا في رمضان 1448", ctaText: "قفة واحدة أو مقعد على مائدة إفطار الأيتام: كل مساهمة تصنع الفرق.",
    partnersSoon: "قائمة الشركاء قيد التحديث.", becomePartner: "كن شريكًا", writeUs: "راسلنا",
    bank: "التحويل البنكي", bankName: "البنك", holder: "صاحب الحساب", rib: "رقم الحساب (RIB)", swift: "SWIFT", copy: "نسخ", copied: "تم النسخ",
    bankAsk: "اطلبوا معلومات الحساب البنكي عبر واتساب.", inKind: "تبرع عيني", volunteer: "تطوّع معنا", whatsapp: "واتساب", whatsappMsg: "السلام عليكم، أريد التبرع لجمعية الجوار",
    phone: "الهاتف", email: "البريد الإلكتروني", address: "العنوان", hours: "أوقات الاستقبال", follow: "تابعونا", gallery: "أنشطتنا بالصور",
    formName: "الاسم", formMsg: "رسالتكم", formSend: "إرسال عبر واتساب", formNoWa: "أسهل طريقة للتواصل معنا حاليًا: رسالة على إنستغرام.",
    rights: "جميع الحقوق محفوظة", stay: "لنبقَ على تواصل", stayTitle: "سؤال، تبرع أو رغبة في التطوع؟ نحن هنا.", menu: "القائمة", privacy: "لا ننشر أي معطيات شخصية عن المستفيدين." },
  fr: { news: "Actualités", latestNews: "Dernières actualités", allNews: "Toutes les actualités", readMore: "Lire l'article", backNews: "Retour aux actualités", noNews: "Aucune actualité pour le moment.", faq: "Questions fréquentes", faqMore: "Vous ne trouvez pas votre réponse ?", collected: "réunis", goal: "objectif", chatOpen: "Une question ?", chatTitle: "Assistant Al Jiwar", chatHello: "Bonjour ! Choisissez une question ou écrivez la vôtre.", chatPh: "Votre question…", chatSend: "Envoyer", chatNo: "Je n'ai pas de réponse précise. Écrivez-nous directement, nous vous répondrons :", chatClose: "Fermer", learnMore: "En savoir plus", support: "Soutenir cette action", youSupport: "Vous soutenez :", askInsta: "Demandez nos coordonnées bancaires par message sur Instagram.", instaMsg: "Écrivez-nous sur Instagram", transparency: "Transparence", legalTitle: "L'association en bref", l_status: "Statut", l_registration: "Récépissé / autorisation", l_founded: "Création", l_office: "Bureau", l_report: "Rapport moral et financier", privacyTitle: "Données personnelles", download: "Télécharger", home: "Accueil", about: "Qui sommes-nous", activities: "Nos activités", projects: "Nos projets", partners: "Partenaires", donate: "Faire un don", contact: "Contact",
    donateNow: "Faire un don", seeActivities: "Découvrir nos activités", allActivities: "Toutes les activités", allProjects: "Tous les projets", inNumbers: "Al Jiwar en chiffres",
    values: "Nos valeurs", story: "Notre histoire", current: "Projets en cours", upcoming: "Projets à venir", done: "Projets réalisés", needs: "Nos besoins", s_current: "En cours", s_upcoming: "À venir", s_done: "Réalisé",
    ctaTitle: "Participez au Ramadan 1448", ctaText: "Un panier, une place à la table du ftour des orphelins : chaque geste compte.",
    partnersSoon: "La liste de nos partenaires arrive bientôt.", becomePartner: "Devenir partenaire", writeUs: "Nous écrire",
    bank: "Virement bancaire", bankName: "Banque", holder: "Titulaire", rib: "RIB", swift: "SWIFT", copy: "Copier", copied: "Copié",
    bankAsk: "Demandez nos coordonnées bancaires sur WhatsApp.", inKind: "Don en nature", volunteer: "Devenir bénévole", whatsapp: "WhatsApp", whatsappMsg: "Bonjour, je souhaite faire un don à l'Association Al Jiwar",
    phone: "Téléphone", email: "E-mail", address: "Adresse", hours: "Horaires", follow: "Suivez-nous", gallery: "Nos actions en images",
    formName: "Votre nom", formMsg: "Votre message", formSend: "Envoyer sur WhatsApp", formNoWa: "Le plus simple pour nous joindre aujourd'hui : un message sur Instagram.",
    rights: "Tous droits réservés", stay: "Restons en contact", stayTitle: "Une question, un don, l'envie d'aider ? Écrivez-nous.", menu: "Menu", privacy: "Nous ne publions aucune donnée personnelle sur les bénéficiaires." },
  en: { news: "News", latestNews: "Latest news", allNews: "All news", readMore: "Read more", backNews: "Back to news", noNews: "No news yet.", faq: "FAQ", faqMore: "Didn't find your answer?", collected: "collected", goal: "goal", chatOpen: "Got a question?", chatTitle: "Al Jiwar assistant", chatHello: "Hello! Pick a question or type your own.", chatPh: "Your question…", chatSend: "Send", chatNo: "I don't have a precise answer. Write to us directly and we'll reply:", chatClose: "Close", learnMore: "Learn more", support: "Support this", youSupport: "You are supporting:", askInsta: "Ask us for our bank details by Instagram message.", instaMsg: "Message us on Instagram", transparency: "Transparency", legalTitle: "The association at a glance", l_status: "Legal status", l_registration: "Registration", l_founded: "Founded", l_office: "Board", l_report: "Annual report", privacyTitle: "Personal data", download: "Download", home: "Home", about: "About us", activities: "What we do", projects: "Projects", partners: "Partners", donate: "Donate", contact: "Contact",
    donateNow: "Donate now", seeActivities: "See what we do", allActivities: "All activities", allProjects: "All projects", inNumbers: "Al Jiwar in numbers",
    values: "Our values", story: "Our story", current: "Current projects", upcoming: "Upcoming projects", done: "Completed projects", needs: "What we need", s_current: "In progress", s_upcoming: "Upcoming", s_done: "Completed",
    ctaTitle: "Join us for Ramadan 1448", ctaText: "A food basket, a seat at the orphans' iftar table: every gesture counts.",
    partnersSoon: "Our partner list is coming soon.", becomePartner: "Become a partner", writeUs: "Write to us",
    bank: "Bank transfer", bankName: "Bank", holder: "Account holder", rib: "Account number (RIB)", swift: "SWIFT", copy: "Copy", copied: "Copied",
    bankAsk: "Ask us for our bank details on WhatsApp.", inKind: "In-kind donation", volunteer: "Volunteer with us", whatsapp: "WhatsApp", whatsappMsg: "Hello, I would like to donate to Al Jiwar Association",
    phone: "Phone", email: "Email", address: "Address", hours: "Opening hours", follow: "Follow us", gallery: "Our work in pictures",
    formName: "Your name", formMsg: "Your message", formSend: "Send on WhatsApp", formNoWa: "The easiest way to reach us for now: a message on Instagram.",
    rights: "All rights reserved", stay: "Stay connected", stayTitle: "A question, a donation, want to help? Write to us.", menu: "Menu", privacy: "We never publish personal data about the people we help." }
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
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
  fb: '<path d="M14 21v-7.5h2.6l.4-3H14V8.7c0-.9.3-1.5 1.5-1.5H17V4.5a20 20 0 0 0-2.3-.1C12.4 4.4 11 5.8 11 8.3v2.2H8.5v3H11V21"/>'
};
const icon = (n, cls) => '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || ICONS.heart) + "</svg>";

/* ---------------- page rendering ---------------- */
function layout(c, lang, page, title, body, desc) {
  const u = UI[lang], s = c.site || {}, name = tr(s.name, lang), href = p => "/" + lang + "/" + (p ? p : "");
  const nav = PAGES.filter(p => p !== "donate").map(p => '<a href="' + href(p) + '"' + (p === page ? ' aria-current="page"' : "") + ">" + esc(p ? u[p] : u.home) + "</a>").join("");
  const langs = LANGS.map(l => '<a href="/' + l + "/" + page + '" lang="' + l + '" aria-label="' + LANG_NAMES[l] + '" title="' + LANG_NAMES[l] + '"' + (l === lang ? ' aria-current="true"' : "") + ">" + ({ ar: "ع", fr: "FR", en: "EN" })[l] + "</a>").join("");
  const base = (safeUrl(s.siteUrl) || DEFAULT_URL).replace(/\/+$/, "");
  const alt = LANGS.map(l => '<link rel="alternate" hreflang="' + l + '" href="' + base + "/" + l + "/" + page + '">').join("") + '<link rel="alternate" hreflang="x-default" href="' + base + "/" + (s.defaultLang || "fr") + "/" + page + '">';
  const metaDesc = esc(String(desc || tr(c.home && c.home.heroText, lang)).replace(/\s+/g, " ").slice(0, 160));
  const ld = { "@context": "https://schema.org", "@type": "NGO", name: name, alternateName: [tr(s.name, "ar"), tr(s.name, "fr")].filter(x => x && x !== name), url: base + "/" + lang + "/", logo: base + "/assets/img/logo.png", slogan: tr(s.tagline, lang),
    sameAs: [safeUrl(s.instagram), safeUrl(s.facebook)].filter(Boolean), email: s.email || undefined, telephone: s.phone || undefined };
  const wa = digits(s.whatsapp);
  return '<!doctype html><html lang="' + lang + '" dir="' + (lang === "ar" ? "rtl" : "ltr") + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title ? title + " · " + name : name + " · " + tr(s.tagline, lang)) + "</title>" +
    '<meta name="description" content="' + metaDesc + '"><link rel="canonical" href="' + base + "/" + lang + "/" + page + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="' + esc(name) + '"><meta property="og:title" content="' + esc(title ? title + " · " + name : name) + '"><meta property="og:description" content="' + metaDesc + '">' +
    '<meta property="og:url" content="' + base + "/" + lang + "/" + page + '"><meta property="og:locale" content="' + LOCALES[lang] + '"><meta property="og:image" content="' + base + '/assets/img/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0a3f59">' + alt +
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>" +
    '<link rel="icon" href="/assets/img/favicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600&display=swap">' +
    '<link rel="stylesheet" href="/assets/css/site.css?v=12"><script src="/assets/js/site.js?v=12"></script></head><body class="page-' + (page || "home") + '">' +
    '<a class="skip" href="#main">↓</a><header class="top"><div class="wrap top-in">' +
    '<a class="brand" href="' + href("") + '" aria-label="' + esc(name) + '"><img src="/assets/img/logo-sm.png" alt="' + esc(name) + '" width="62" height="56"></a>' +
    '<button class="burger" aria-expanded="false" aria-controls="nav" aria-label="' + esc(u.menu) + '"><span></span><span></span><span></span></button>' +
    '<nav id="nav" class="nav"><div class="pill-nav">' + nav + '</div><div class="nav-end"><div class="langs">' + langs + '</div><a class="btn btn-outline" href="' + href("donate") + '">' + esc(u.donateNow) + "</a></div></nav></div></header>" +
    '<main id="main">' + body + "</main>" +
    '<footer class="foot"><div class="wrap">' +
      '<div class="foot-top"><p class="foot-say">' + esc(tr(s.tagline, lang)) + '</p><a class="btn btn-orange" href="' + href("donate") + '">' + esc(u.donateNow) + "</a></div>" +
      '<div class="foot-grid">' +
        '<div class="foot-brand"><a href="' + href("") + '" aria-label="' + esc(name) + '"><img src="/assets/img/logo-md.png" alt="' + esc(name) + '" width="110" height="100" loading="lazy"></a>' +
          '<div class="foot-social">' + [["phone", s.phone && "tel:" + s.phone.replace(/\s/g, ""), u.phone], ["wa", wa && "https://wa.me/" + wa, "WhatsApp"], ["mail", s.email && "mailto:" + s.email, u.email], ["insta", safeUrl(s.instagram), "Instagram"], ["fb", safeUrl(s.facebook), "Facebook"]]
            .filter(x => x[1]).map(x => '<a href="' + esc(x[1]) + '" aria-label="' + esc(x[2]) + '" title="' + esc(x[2]) + '"' + (/^https/.test(x[1]) ? ' target="_blank" rel="noopener"' : "") + ">" + icon(x[0]) + "</a>").join("") + "</div>" +
          (tr(s.address, lang) ? '<p class="foot-addr">' + esc(tr(s.address, lang)) + "</p>" : "") + "</div>" +
        '<nav class="foot-nav" aria-label="' + esc(u.menu) + '">' + PAGES.concat(EXTRA).map(p => '<a href="' + href(p) + '">' + esc(p ? u[p] : u.home) + "</a>").join("") + "</nav>" +
      "</div>" +
      '<div class="foot-end"><span>© ' + new Date().getFullYear() + " " + esc(name) + '</span><span class="foot-langs">' + LANGS.map(l => '<a href="/' + l + "/" + page + '" lang="' + l + '">' + LANG_NAMES[l] + "</a>").join("") + "</span></div>" +
    "</div></footer>" +
    chatWidget(c, lang, u, href) +
    (process.env.VERCEL && s.analytics !== "off" ? '<script defer src="/_vercel/insights/script.js"></script>' : "") +
    '</body></html>';
}

function pageHead(title, intro, tone) {
  return '<section class="phead-wrap"><div class="wrap"><div class="phead ' + (tone || "") + '"><div class="rings" aria-hidden="true"><span></span><span></span><span></span></div><h1 class="rv">' + esc(title) + "</h1>" + (intro ? '<div class="lead rv" style="--d:1">' + paras(intro) + "</div>" : "") + "</div></div></section>";
}
/* photo, or a brand-coloured panel (blue / orange / green) when no photo has been added yet */
function media(src, alt, fallbackIcon, cls, tone) {
  const s = img(src);
  return s ? '<div class="media ' + (cls || "") + '"><img src="' + esc(s) + '" alt="' + esc(alt) + '" loading="lazy"></div>'
           : '<div class="media ph ph-' + (tone || "blue") + " " + (cls || "") + '">' + (fallbackIcon === "logo" ? '<img class="ph-logo" src="/assets/img/symbol.png" alt="">' : '<span class="ph-ico">' + icon(fallbackIcon || "heart") + "</span>") + "</div>";
}
const TONES = ["blue", "orange", "green"];
function causeRow(a, lang, u, i, href, tag) {
  const link = tag === "h3" ? '<a class="btn btn-line" href="' + href("activities") + "#" + esc(a.id) + '">' + esc(u.learnMore) + icon("arrow", "flip") + "</a>"
                            : '<a class="btn btn-pill" href="' + href("donate") + "?pour=" + encodeURIComponent(a.id) + '">' + esc(u.support) + "</a>";
  return '<article class="cause rv" id="' + esc(a.id) + '"><div class="cause-card"><span class="icon-dot">' + icon(a.icon) + "</span><" + tag + ">" + esc(tr(a.title, lang)) + "</" + tag + ">" + paras(tr(a.text, lang)) +
    link + "</div>" + media(a.image, tr(a.title, lang), a.icon, "cause-media", TONES[i % 3]) + "</article>";
}
function statBox(x, lang, cls) {
  const v = String((x && x.value) || "").trim();
  if (!v) return "";
  return '<div class="stat ' + (cls || "") + '">' + (v ? "<strong>" + esc(v) + "</strong>" : "") + "<span>" + esc(tr(x.label, lang)) + "</span></div>";
}
function projectCard(p, lang, u) {
  const needs = tr(p.needs, lang);
  return '<article class="card proj" id="' + esc(p.id) + '">' + media(p.image, tr(p.title, lang), ICONS[p.icon] ? p.icon : "home", "", TONES[(p._i || 0) % 3]) + '<div class="card-body"><span class="tag tag-' + esc(p.status) + '">' + esc(u["s_" + p.status] || "") + "</span><h3>" + esc(tr(p.title, lang)) + "</h3>" + paras(tr(p.text, lang)) +
    (needs ? '<p class="needs"><strong>' + esc(u.needs) + " :</strong> " + esc(needs) + "</p>" : "") +
    (p.status !== "done" && p._href ? '<a class="btn btn-pill" href="' + p._href("donate") + "?pour=" + encodeURIComponent(p.id) + '">' + esc(u.support) + "</a>" : "") + "</div></article>";
}
/* ---- news, fundraiser, FAQ, chat ---- */
function fmtDate(d, lang) {
  const t = Date.parse(String(d || "")); if (!t) return "";
  try { return new Date(t).toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return String(d); }
}
function newsList(c) { return (c.news || []).filter(n => n && tr(n.title, "fr") + tr(n.title, "ar") + tr(n.title, "en")).slice().sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)); }
function newsCard(n, lang, u, href, i) {
  const ex = String(tr(n.text, lang)).split(/\n\s*\n/).find(p => p.trim() && !isTodo(p)) || "";
  return '<article class="card news rv" style="--d:' + (i % 3) + '"><a class="news-link" href="' + href("news") + "/" + esc(n.id) + '">' + media(n.image, tr(n.title, lang), "cal", "", TONES[i % 3]) +
    '<div class="card-body"><time datetime="' + esc(n.date) + '">' + esc(fmtDate(n.date, lang)) + "</time><h3>" + esc(tr(n.title, lang)) + "</h3><p>" + esc(ex.length > 170 ? ex.slice(0, 167).replace(/\s\S*$/, "") + "…" : ex) + '</p><span class="btn-line">' + esc(u.readMore) + icon("arrow", "flip") + "</span></div></a></article>";
}
function campaignBlock(c, lang, u, href, withBtn) {
  const k = c.campaign || {}, goal = parseFloat(String(k.goal || "").replace(",", ".")) || 0, cur = parseFloat(String(k.current || "").replace(",", ".")) || 0;
  if (k.active !== "yes" || goal <= 0) return "";
  const pct = Math.max(0, Math.min(100, Math.round(cur / goal * 100))), unit = tr(k.unit, lang);
  const n = v => Number(v).toLocaleString(lang === "ar" ? "ar-MA" : lang === "en" ? "en-GB" : "fr-FR");
  return '<section class="block tight"><div class="wrap"><div class="campaign rv"><div class="cp-text"><span class="pill-label">' + esc(tr(k.tag, lang)) + "</span><h2>" + esc(tr(k.title, lang)) + "</h2>" + paras(tr(k.text, lang)) + "</div>" +
    '<div class="cp-meter"><div class="cp-nums"><strong>' + esc(n(cur)) + '</strong><span>/ ' + esc(n(goal)) + " " + esc(unit) + '</span><em>' + pct + "%</em></div>" +
    '<div class="cp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + goal + '" aria-valuenow="' + cur + '" aria-label="' + esc(tr(k.title, lang)) + '"><span style="--p:' + pct + '%"></span></div>' +
    '<p class="cp-foot">' + esc(n(cur)) + " " + esc(unit) + " " + esc(u.collected) + " · " + esc(u.goal) + " " + esc(n(goal)) + (k.deadline ? " · " + esc(tr(k.deadline, lang)) : "") + "</p>" +
    (withBtn ? '<a class="btn btn-orange" href="' + href("donate") + '">' + icon("heart") + esc(u.donateNow) + "</a>" : "") + "</div></div></div></section>";
}
function faqItems(c, lang) { return (c.faq || []).map(f => ({ q: tr(f && f.q, lang), a: tr(f && f.a, lang) })).filter(f => f.q && f.a && !isTodo(f.a)); }
function chatWidget(c, lang, u, href) {
  const items = faqItems(c, lang); if (!items.length) return "";
  const s = c.site || {}, wa = digits(s.whatsapp), links = [];
  if (wa) links.push(["WhatsApp", "https://wa.me/" + wa]);
  if (safeUrl(s.instagram)) links.push(["Instagram", safeUrl(s.instagram)]);
  if (s.email) links.push([s.email, "mailto:" + s.email]);
  links.push([u.contact, href("contact")]);
  const data = { faq: items, ui: { hello: u.chatHello, no: u.chatNo }, links: links };
  return '<div class="chat" data-chat><button class="chat-fab" type="button" aria-expanded="false" aria-controls="chat-panel">' + icon("chat") + "<span>" + esc(u.chatOpen) + "</span></button>" +
    '<section id="chat-panel" class="chat-panel" hidden aria-label="' + esc(u.chatTitle) + '"><header><img src="/assets/img/favicon.png" alt="" width="28"><strong>' + esc(u.chatTitle) + '</strong><button class="chat-x" type="button" aria-label="' + esc(u.chatClose) + '">' + icon("close") + "</button></header>" +
    '<div class="chat-log" aria-live="polite"></div><form class="chat-form"><input name="q" autocomplete="off" maxlength="200" placeholder="' + esc(u.chatPh) + '" aria-label="' + esc(u.chatPh) + '"><button type="submit" aria-label="' + esc(u.chatSend) + '">' + icon("arrow", "flip") + "</button></form></section>" +
    '<script type="application/json" class="chat-data">' + JSON.stringify(data).replace(/</g, "\\u003c") + "</script></div>";
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

function render(c, lang, page, query) {
  const u = UI[lang], h = c.home || {}, s = c.site || {}, href = p => "/" + lang + "/" + p;
  if (page === "") {
    const st = c.stats || [], vals = (c.about && c.about.values) || [], acts = c.activities || [];
    const gal = (c.gallery || []).filter(g => img(g.image));
    const cards = (h.heroCards || []).map(x => img(x && x.image)).filter(Boolean).slice(0, 3);
    const chips = [h.chip1, h.chip2].map(x => tr(x, lang)).filter(Boolean);
    const insta = safeUrl(s.instagram);
    const tile = (v, ic, d) => v ? '<div class="tile rv" style="--d:' + d + '"><span class="icon-dot">' + icon(ic) + "</span><h3>" + esc(tr(v.title, lang)) + "</h3>" + paras(tr(v.text, lang)) + "</div>" : "";
    const words = [tr(s.tagline, lang)].concat(acts.map(a => tr(a.title, lang))).filter(Boolean);
    const marquee = words.map(w => "<span>" + esc(w) + '</span><img src="/assets/img/favicon.png" alt="" width="26" height="20">').join("");
    const body =
      /* HERO: brand panel, animated rings, text on one side, fanned photo cards + donation card on the other */
      '<section class="hero"><div class="wrap"><div class="hero-box">' +
        '<div class="rings" aria-hidden="true"><span></span><span></span><span></span><span></span></div><div class="glow" aria-hidden="true"></div>' +
        '<div class="hero-text"><span class="pill-label light rv">' + esc(tr(s.tagline, lang)) + '</span><h1 class="rv" style="--d:1">' + esc(tr(h.heroTitle, lang)) + '</h1><div class="rv hero-p" style="--d:2">' + paras(tr(h.heroText, lang)) + "</div>" +
          '<div class="actions rv" style="--d:3"><a class="btn btn-orange btn-lg" href="' + href("donate") + '">' + icon("heart") + esc(u.donateNow) + '</a><a class="btn btn-glass btn-lg" href="' + href("activities") + '">' + esc(u.seeActivities) + icon("arrow", "flip") + "</a></div>" +
          (chips.length ? '<div class="chips rv" style="--d:4">' + chips.map(x => '<span class="chip">' + esc(x) + "</span>").join("") + "</div>" : "") + "</div>" +
        '<div class="hero-art" data-tilt>' +
          '<div class="fan">' + (cards.length ? cards.map((src, i) => '<figure class="fan-card f' + i + '"><img src="' + esc(src) + '" alt="" loading="' + (i ? "lazy" : "eager") + '"></figure>').join("")
                                              : '<figure class="fan-card f1 logo-card"><img src="/assets/img/logo.png" alt=""></figure>') + "</div>" +
          '<div class="float-card"><div class="fc-top"><span class="fc-brand"><img src="/assets/img/favicon.png" alt="">' + esc(tr(s.name, lang)) + "</span><span>" + esc(tr(h.cardTag, lang)) + "</span></div><h3>" + esc(tr(h.cardTitle, lang) || u.ctaTitle) + "</h3><p>" + esc(tr(h.cardText, lang) || u.ctaText) + '</p><a class="btn btn-pill" href="' + href("donate") + '">' + esc(u.donateNow) + icon("arrow", "flip") + "</a></div>" +
        "</div>" +
      "</div></div></section>" +
      /* MARQUEE */
      '<div class="marquee" aria-hidden="true"><div class="marquee-track">' + marquee + marquee + "</div></div>" +
      campaignBlock(c, lang, u, href, true) +
      /* CAUSES */
      '<section class="block"><div class="wrap"><div class="sec-head rv"><div><span class="pill-label">' + esc(tr(s.tagline, lang)) + "</span><h2>" + esc(u.activities) + '</h2></div><a class="btn btn-outline" href="' + href("activities") + '">' + esc(u.allActivities) + icon("arrow", "flip") + '</a></div><div class="causes">' +
        acts.slice(0, 3).map((a, i) => causeRow(a, lang, u, i, href, "h3")).join("") + "</div></div></section>" +
      /* BENTO */
      '<section class="block"><div class="wrap"><div class="bento">' +
        '<div class="b-col">' + media(gal[0] && gal[0].image, "", "logo", "tile-photo rv zoom", "blue") + '<div class="tile rv" style="--d:1">' + statBox(st[1], lang) + '<span class="icon-dot">' + icon("users") + "</span><h3>" + esc(tr(vals[0] && vals[0].title, lang)) + "</h3>" + paras(tr(vals[0] && vals[0].text, lang)) + "</div></div>" +
        '<div class="b-col">' + tile(vals[1], "heart", 1) + '<div class="tile tile-stat rv" style="--d:2">' + (statBox(st[0], lang, "big") || '<div class="stat big quote"><span class="icon-dot">' + icon("heart") + "</span><strong>" + esc(tr(s.tagline, lang)) + "</strong></div>") + "</div></div>" +
        '<div class="b-col">' + tile(vals[2], "box", 2) + media(gal[1] && gal[1].image, "", "table", "tile-photo rv zoom", "orange") + "</div>" +
      "</div></div></section>" +
      /* INSTAGRAM GALLERY */
      (gal.length ? '<section class="block"><div class="wrap"><div class="sec-head rv"><div><span class="pill-label">Instagram</span><h2>' + esc(u.gallery) + "</h2></div>" + (insta ? '<a class="btn btn-outline" href="' + esc(insta) + '" target="_blank" rel="noopener">' + esc(u.follow) + "</a>" : "") + "</div></div>" +
        '<div class="gallery-wrap"><div class="gallery" tabindex="0">' + gal.map((g, i) => '<figure class="g-item rv" style="--d:' + (i % 4) + '"><img src="' + esc(img(g.image)) + '" alt="' + esc(tr(g.caption, lang)) + '" loading="lazy">' + (tr(g.caption, lang) ? "<figcaption>" + esc(tr(g.caption, lang)) + "</figcaption>" : "") + "</figure>").join("") + "</div></div></section>" : "") +
      /* VISION & MISSION */
      '<section class="block"><div class="wrap vm">' + media(h.visionImage, "", "hands", "vm-photo rv zoom", "green") +
        '<div class="vm-grid">' + statBox(st[2], lang, "mini") + statBox(st[3], lang, "mini") +
          '<div class="tile rv" style="--d:1"><span class="icon-dot">' + icon("moon") + "</span><h3>" + esc(tr(h.visionTitle, lang)) + "</h3>" + paras(tr(h.visionText, lang)) + "</div>" +
          '<div class="tile rv" style="--d:2"><span class="icon-dot">' + icon("users") + "</span><h3>" + esc(tr(h.missionTitle, lang)) + "</h3>" + paras(tr(h.missionText, lang)) + "</div>" +
      "</div></div></section>" +
      (newsList(c).length ? '<section class="block"><div class="wrap"><div class="sec-head rv"><div><span class="pill-label">' + esc(u.news) + "</span><h2>" + esc(u.latestNews) + '</h2></div><a class="btn btn-outline" href="' + href("news") + '">' + esc(u.allNews) + icon("arrow", "flip") + '</a></div><div class="grid grid-3">' + newsList(c).slice(0, 3).map((n, i) => newsCard(n, lang, u, href, i)).join("") + "</div></div></section>" : "") +
      /* PARTNERS */
      '<section class="block"><div class="wrap"><div class="sec-head rv"><div><h2>' + esc(u.partners) + '</h2><p class="muted">' + esc(tr(c.partners && c.partners.intro, lang)) + '</p></div><a class="btn btn-outline" href="' + href("partners") + '">' + esc(u.becomePartner) + "</a></div>" + partnersGrid(c, lang, u) + "</div></section>" +
      /* STAY IN TOUCH: photo mosaic with a floating card */
      '<section class="block"><div class="wrap"><div class="band rv">' +
        media(h.bandImage, "", "logo", "band-media", "blue") +
        '<div class="band-card"><span class="pill-label">' + esc(u.stay) + "</span><h2>" + esc(u.stayTitle) + '</h2><div class="actions"><a class="btn btn-pill" href="' + href("contact") + '">' + esc(u.writeUs) + icon("arrow", "flip") + "</a>" + (insta ? '<a class="btn btn-outline btn-sm" href="' + esc(insta) + '" target="_blank" rel="noopener">Instagram</a>' : "") + "</div></div></div></div></section>";
    return layout(c, lang, page, "", body);
  }
  if (page === "about") {
    const a = c.about || {};
    const body = pageHead(u.about, tr(a.intro, lang)) +
      '<section class="block"><div class="wrap split"><div><h2>' + esc(u.story) + "</h2>" + paras(tr(a.story, lang)) + "</div>" + media(a.image, u.story, "logo", "tall", "blue") + "</div></section>" +
      '<section class="block soft"><div class="wrap"><h2 class="center">' + esc(u.values) + '</h2><div class="grid grid-4">' +
        (a.values || []).map((v, i) => '<div class="value v' + (i % 3) + '"><h3>' + esc(tr(v.title, lang)) + "</h3>" + paras(tr(v.text, lang)) + "</div>").join("") + "</div></div></section>";
    return layout(c, lang, page, u.about, body, tr(a.intro, lang));
  }
  if (page === "activities") {
    const body = pageHead(u.activities, tr(h.missionText, lang)) + '<section class="block"><div class="wrap rows">' +
      '<div class="causes">' + (c.activities || []).map((a, i) => causeRow(a, lang, u, i, href, "h2")).join("") + "</div>" +
      '</div></section><section class="cta"><div class="wrap cta-in"><div><h2>' + esc(u.volunteer) + "</h2><p>" + esc(tr(c.donate && c.donate.volunteer, lang)) + '</p></div><a class="btn btn-white" href="' + href("contact") + '">' + esc(u.writeUs) + "</a></div></section>";
    return layout(c, lang, page, u.activities, body);
  }
  if (page === "projects") {
    const groups = ["current", "upcoming", "done"].map(st => { const l = (c.projects || []).filter(p => p.status === st); return l.length ? '<section class="block"><div class="wrap"><h2>' + esc(u[st]) + '</h2><div class="grid grid-3">' + l.map((p, i) => projectCard(Object.assign({ _i: i, _href: href }, p), lang, u)).join("") + "</div></div></section>" : ""; }).join("");
    return layout(c, lang, page, u.projects, pageHead(u.projects, "") + groups);
  }
  if (page === "partners") {
    const p = c.partners || {};
    const body = pageHead(u.partners, tr(p.intro, lang)) + '<section class="block"><div class="wrap">' + partnersGrid(c, lang, u) + "</div></section>" +
      '<section class="cta green"><div class="wrap cta-in"><div><h2>' + esc(u.becomePartner) + "</h2><p>" + esc(tr(p.become, lang)) + '</p></div><a class="btn btn-white" href="' + href("contact") + '">' + esc(u.writeUs) + "</a></div></section>";
    return layout(c, lang, page, u.partners, body, tr(p.intro, lang));
  }
  if (page === "donate") {
    const d = c.donate || {}, insta = safeUrl(s.instagram);
    const pourId = String((query && query.get("pour")) || "").slice(0, 60);
    const target = pourId && (c.activities || []).concat(c.projects || []).find(x => x && x.id === pourId);
    const tTitle = target ? tr(target.title, lang) : "";
    const wa = waLink(c, u.whatsappMsg + (tTitle ? " (" + tTitle + ")" : ""));
    const rows = [["bankName", d.bankName], ["holder", d.holder], ["rib", d.rib], ["swift", d.swift]].filter(r => String(r[1] || "").trim());
    const bank = rows.length ? '<dl class="bank">' + rows.map(([k, v]) => "<div><dt>" + esc(u[k]) + '</dt><dd><span dir="ltr">' + esc(v) + "</span>" + (k === "rib" || k === "swift" ? '<button class="copy" data-copy="' + esc(v) + '" data-done="' + esc(u.copied) + '">' + esc(u.copy) + "</button>" : "") + "</dd></div>").join("") + "</dl>"
      : (digits(s.whatsapp) || !insta ? '<p class="muted">' + esc(u.bankAsk) + "</p>" : '<p class="muted">' + esc(u.askInsta) + '</p><a class="btn btn-ghost" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icon("insta") + "Instagram</a>");
    const waBtn = wa ? '<a class="btn btn-green" href="' + esc(wa) + '" rel="noopener" target="_blank">' + icon("wa") + esc(u.whatsapp) + "</a>"
      : insta ? '<a class="btn btn-ghost" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icon("insta") + esc(u.instaMsg) + "</a>" : "";
    const body = pageHead(u.donate, tr(d.intro, lang), "orange") +
      campaignBlock(c, lang, u, href, false) +
      (tTitle ? '<section class="block tight"><div class="wrap"><p class="pour">' + icon(target.icon && ICONS[target.icon] ? target.icon : "heart") + "<span>" + esc(u.youSupport) + " <strong>" + esc(tTitle) + "</strong></span></p></div></section>" : "") +
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
      tr(ct.hours, lang) && ["clock", u.hours, esc(tr(ct.hours, lang))],
      safeUrl(s.instagram) && ["insta", "Instagram", '<a href="' + esc(safeUrl(s.instagram)) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(safeUrl(s.instagram).replace(/\/+$/, "").split("/").pop()) + "</a>"],
      safeUrl(s.facebook) && ["fb", "Facebook", '<a href="' + esc(safeUrl(s.facebook)) + '" target="_blank" rel="noopener">Facebook</a>']
    ].filter(Boolean);
    const map = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed\?/.test(String(s.mapEmbed || "")) ? '<div class="map"><iframe src="' + esc(s.mapEmbed) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="' + esc(u.address) + '"></iframe></div>' : "";
    const form = wa ? '<form class="card pad waform" data-wa="' + wa + '"><h2>' + esc(u.writeUs) + '</h2><label>' + esc(u.formName) + '<input name="name" required maxlength="80"></label><label>' + esc(u.formMsg) + '<textarea name="msg" rows="5" required maxlength="1000"></textarea></label><button class="btn btn-green" type="submit">' + icon("wa") + esc(u.formSend) + "</button></form>"
      : '<div class="card pad"><h2>' + esc(u.writeUs) + '</h2><p class="muted">' + esc(u.formNoWa) + "</p>" + (s.email ? '<a class="btn btn-blue" href="mailto:' + esc(s.email) + '">' + icon("mail") + esc(s.email) + "</a>" : safeUrl(s.instagram) ? '<a class="btn btn-blue" href="' + esc(safeUrl(s.instagram)) + '" target="_blank" rel="noopener">' + icon("insta") + esc(u.instaMsg) + "</a>" : "") + "</div>";
    const body = pageHead(u.contact, tr(ct.intro, lang), "blue") +
      '<section class="block"><div class="wrap split top">' +
        '<div><ul class="contact-list">' + items.map(([i, l, v]) => "<li>" + icon(i) + "<div><small>" + esc(l) + "</small>" + v + "</div></li>").join("") + "</ul>" + map + "</div>" + form +
      "</div></section>";
    return layout(c, lang, page, u.contact, body, tr(ct.intro, lang));
  }
  if (page === "news") {
    const list = newsList(c);
    const body = pageHead(u.news, "") + '<section class="block"><div class="wrap">' + (list.length ? '<div class="grid grid-3">' + list.map((n, i) => newsCard(n, lang, u, href, i)).join("") + "</div>" : '<p class="muted center">' + esc(u.noNews) + "</p>") + "</div></section>";
    return layout(c, lang, page, u.news, body);
  }
  if (page.indexOf("news/") === 0) {
    const n = newsList(c).find(x => x.id === page.slice(5)); if (!n) return null;
    const pic = img(n.image);
    const body = '<article class="article"><div class="wrap narrow"><a class="back" href="' + href("news") + '">' + icon("arrow", "flip back-ico") + esc(u.backNews) + '</a><time datetime="' + esc(n.date) + '">' + esc(fmtDate(n.date, lang)) + '</time><h1 class="rv">' + esc(tr(n.title, lang)) + "</h1>" +
      (pic ? '<figure class="art-pic rv"><img src="' + esc(pic) + '" alt="' + esc(tr(n.title, lang)) + '"></figure>' : "") + '<div class="art-body rv">' + paras(tr(n.text, lang)) + "</div>" +
      '<div class="art-end"><a class="btn btn-orange" href="' + href("donate") + '">' + icon("heart") + esc(u.donateNow) + '</a><a class="btn btn-outline" href="' + href("news") + '">' + esc(u.allNews) + "</a></div></div></article>";
    return layout(c, lang, "news", tr(n.title, lang), body, String(tr(n.text, lang)).slice(0, 160));
  }
  if (page === "faq") {
    const items = faqItems(c, lang);
    const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
    const body = pageHead(u.faq, "") + '<section class="block"><div class="wrap narrow faq">' +
      items.map((f, i) => '<details class="faq-item rv" style="--d:' + (i % 4) + '"><summary>' + esc(f.q) + '<span class="pm" aria-hidden="true"></span></summary><div class="faq-a">' + paras(f.a) + "</div></details>").join("") +
      '<div class="faq-more rv"><h2>' + esc(u.faqMore) + '</h2><a class="btn btn-orange" href="' + href("contact") + '">' + esc(u.writeUs) + "</a></div></div></section>" +
      '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>";
    return layout(c, lang, page, u.faq, body);
  }
  if (page === "transparency") {
    const lg = c.legal || {};
    const rows = [["l_status", tr(lg.status, lang)], ["l_registration", lg.registration], ["l_founded", lg.founded], ["l_office", tr(lg.office, lang)]].filter(r => String(r[1] || "").trim());
    const report = safeUrl(lg.reportUrl) || (img(lg.reportUrl) ? lg.reportUrl : (/^\/assets\/uploads\/[\w.-]+\.pdf$/i.test(String(lg.reportUrl || "")) ? lg.reportUrl : ""));
    const body = pageHead(u.transparency, tr(lg.intro, lang)) +
      '<section class="block"><div class="wrap split top">' +
        (rows.length || report ? '<div class="card pad"><h2>' + esc(u.legalTitle) + "</h2>" + (rows.length ? '<dl class="bank">' + rows.map(([k, v]) => "<div><dt>" + esc(u[k]) + "</dt><dd><span>" + esc(v).replace(/\n/g, "<br>") + "</span></dd></div>").join("") + "</dl>" : "") +
          (report ? '<a class="btn btn-ghost" href="' + esc(report) + '" target="_blank" rel="noopener">' + esc(u.l_report) + " · " + esc(u.download) + "</a>" : "") + "</div>" : "") +
        '<div class="card pad"><h2>' + esc(u.privacyTitle) + "</h2>" + paras(tr(lg.privacy, lang)) + "</div>" +
      "</div></section>";
    return layout(c, lang, page, u.transparency, body, tr(lg.intro, lang));
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
  for (const key of ["site", "home", "about", "partners", "donate", "contact", "legal", "campaign"]) if (!c[key] || typeof c[key] !== "object" || Array.isArray(c[key])) c[key] = {};
  for (const key of ["stats", "activities", "projects", "gallery", "news", "faq"]) if (!Array.isArray(c[key])) c[key] = [];
  if (!Array.isArray(c.partners.list)) c.partners.list = [];
  if (!Array.isArray(c.about.values)) c.about.values = [];
  if (!LANGS.includes(c.site.defaultLang)) c.site.defaultLang = "ar";
  const seenA = new Set(), seenP = new Set(), seenN = new Set();
  c.news.forEach(n => { n.id = slugId(n.id || tr(n.title, "fr") || tr(n.title, "en"), seenN); n.date = /^\d{4}-\d{2}-\d{2}$/.test(String(n.date || "")) ? n.date : new Date().toISOString().slice(0, 10); });
  if (!["yes", "no"].includes(c.campaign.active)) c.campaign.active = "no";
  c.activities.forEach(a => { a.id = slugId(a.id || tr(a.title, "fr") || tr(a.title, "en"), seenA); if (!ICONS[a.icon]) a.icon = "heart"; });
  c.projects.forEach(p => { p.id = slugId(p.id || tr(p.title, "fr") || tr(p.title, "en"), seenP); if (p.icon && !ICONS[p.icon]) p.icon = "home"; if (!["current", "upcoming", "done"].includes(p.status)) p.status = "current"; });
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
  if (p === "/api/session") return send(res, 200, { authed: authed(req), configured: !!PW, repo: process.env.GH_REPO || "" });
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
      return send(res, 200, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + LANGS.flatMap(l => PAGES.concat(EXTRA).concat(newsList(c).map(n => "news/" + n.id)).map(pg => "<url><loc>" + esc(base + "/" + l + "/" + pg) + "</loc></url>")).join("") + "</urlset>", { "Content-Type": "application/xml; charset=utf-8" });
    }
    const na = /^\/(ar|fr|en)\/news\/([a-z0-9-]{1,60})\/?$/.exec(p);
    if (na) { const html = render(c, na[1], "news/" + na[2], url.searchParams); if (html) return send(res, 200, html, { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" }); }
    const m = /^\/(ar|fr|en)(?:\/([a-z]*))?\/?$/.exec(p);
    if (m) {
      const page = m[2] || "";
      if (PAGES.includes(page) || EXTRA.includes(page)) return send(res, 200, render(c, m[1], page, url.searchParams), { "Cache-Control": url.search ? "no-store" : "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" });
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
