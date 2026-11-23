/* Admin Al Jiwar — form editor for data/content.json */
(function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var data = null, dirty = false, tab = "dashboard";
  var LANGS = [["fr", "FR", "ltr"], ["ar", "ع", "rtl"], ["en", "EN", "ltr"]];
  var ICONS = [["box", "Carton (stock)"], ["heart", "Cœur"], ["moon", "Croissant (Ramadan)"], ["table", "Table (ftour)"], ["hands", "Mains (bénévolat)"], ["home", "Maison"], ["users", "Personnes"], ["book", "Livre (école)"]];
  var STATUS = [["current", "En cours"], ["upcoming", "À venir"], ["done", "Réalisé"]];

  var TABS = [
    { id: "dashboard", icon: "◫", page: "", label: "Tableau de bord", hint: "Vue d'ensemble du site : ce qui est prêt, ce qui manque, la cagnotte.", custom: true },
    { id: "general", icon: "⚙", page: "", label: "Général", hint: "Nom, coordonnées et réseaux. Les champs vides ne s'affichent pas sur le site.", fields: [
      { obj: "site", k: "name", label: "Nom de l'association", type: "ml" },
      { obj: "site", k: "tagline", label: "Slogan", type: "ml" },
      { obj: "site", k: "defaultLang", label: "Langue d'accueil", type: "select", opts: [["ar", "Arabe"], ["fr", "Français"], ["en", "Anglais"]] },
      { obj: "site", k: "phone", label: "Téléphone", type: "text", ph: "+212 6 00 00 00 00" },
      { obj: "site", k: "whatsapp", label: "WhatsApp", hint: "numéro au format international, ex. 212600000000", type: "text" },
      { obj: "site", k: "email", label: "E-mail", type: "text" },
      { obj: "site", k: "address", label: "Adresse", type: "ml" },
      { obj: "contact", k: "hours", label: "Horaires d'accueil", type: "ml" },
      { obj: "site", k: "facebook", label: "Page Facebook (lien)", type: "text", ph: "https://facebook.com/..." },
      { obj: "site", k: "instagram", label: "Instagram (lien)", type: "text", ph: "https://instagram.com/..." },
      { obj: "site", k: "mapEmbed", label: "Carte Google Maps", hint: "Google Maps › Partager › Intégrer une carte › copier seulement le lien src=\"https://www.google.com/maps/embed?...\"", type: "text" },
      { obj: "site", k: "siteUrl", label: "Adresse du site", hint: "ex. https://association-aljiwar.vercel.app", type: "text" },
      { obj: "site", k: "analytics", label: "Statistiques de visite (Vercel)", hint: "à activer aussi dans Vercel › Analytics", type: "select", opts: [["on", "Activées"], ["off", "Désactivées"]] }
    ] },
    { id: "home", icon: "⌂", page: "", label: "Accueil", fields: [
      { obj: "home", k: "heroTitle", label: "Grand titre", type: "ml" },
      { obj: "home", k: "heroText", label: "Texte d'introduction", type: "mlarea" },
      { obj: "home", k: "heroCards", label: "Cartes photo du bandeau d'accueil", hint: "3 photos au format portrait", type: "list", title: function (x) { return x.image; }, blank: function () { return { image: "" }; }, fields: [{ k: "image", label: "Photo", type: "image" }] },
      { obj: "home", k: "chip1", label: "Petite étiquette 1 (sur la photo)", type: "ml" },
      { obj: "home", k: "chip2", label: "Petite étiquette 2 (sur la photo)", type: "ml" },
      { obj: "home", k: "cardTag", label: "Carte don : petite mention", hint: "ex. Ramadan 1448", type: "ml" },
      { obj: "home", k: "cardTitle", label: "Carte don : titre", type: "ml" },
      { obj: "home", k: "cardText", label: "Carte don : texte", type: "mlarea" },
      { obj: "home", k: "missionTitle", label: "Titre « mission »", type: "ml" },
      { obj: "home", k: "missionText", label: "Texte « mission »", type: "mlarea" },
      { obj: "home", k: "visionTitle", label: "Titre « vision »", type: "ml" },
      { obj: "home", k: "visionText", label: "Texte « vision »", type: "mlarea" },
      { obj: "home", k: "visionImage", label: "Photo à côté de vision/mission", type: "image" },
      { obj: "home", k: "bandImage", label: "Grande photo du bas (« Restons en contact »)", type: "image" },
      { root: "stats", label: "Chiffres clés", hint: "un chiffre vide n'est pas affiché", type: "list", title: function (x) { return (x.value || "—") + " " + (x.label && x.label.fr || ""); }, blank: function () { return { value: "", label: { ar: "", fr: "", en: "" } }; }, fields: [
        { k: "value", label: "Chiffre", type: "text", ph: "ex. 120" }, { k: "label", label: "Légende", type: "ml" } ] }
    ] },
    { id: "about", icon: "◎", page: "about", label: "Qui sommes-nous", fields: [
      { obj: "about", k: "intro", label: "Introduction", type: "mlarea" },
      { obj: "about", k: "story", label: "Notre histoire", hint: "laissez une ligne vide entre deux paragraphes", type: "mlarea", rows: 6 },
      { obj: "about", k: "image", label: "Photo", type: "image" },
      { obj: "about", k: "values", label: "Valeurs", type: "list", title: function (x) { return x.title && x.title.fr; }, blank: function () { return { title: {}, text: {} }; }, fields: [
        { k: "title", label: "Titre", type: "ml" }, { k: "text", label: "Texte", type: "mlarea" } ] }
    ] },
    { id: "gallery", icon: "▦", page: "", label: "Galerie", hint: "Photos de la section « Nos actions en images » (les 2 premières vont aussi dans la grille, les 4 dernières dans le bandeau du bas).", fields: [
      { root: "gallery", label: "Photos", type: "list", title: function (x) { return (x.caption && x.caption.fr) || x.image; }, blank: function () { return { image: "", caption: {} }; }, fields: [
        { k: "image", label: "Photo", type: "image" }, { k: "caption", label: "Légende", hint: "facultatif", type: "ml" } ] }
    ] },
    { id: "activities", icon: "✦", page: "activities", label: "Activités", fields: [
      { root: "activities", label: "Activités", type: "list", title: function (x) { return x.title && x.title.fr; }, blank: function () { return { id: "", icon: "heart", image: "", title: {}, text: {} }; }, fields: [
        { k: "title", label: "Titre", type: "ml" }, { k: "icon", label: "Icône (si pas de photo)", type: "select", opts: ICONS },
        { k: "text", label: "Description", type: "mlarea", rows: 4 }, { k: "image", label: "Photo", type: "image" } ] }
    ] },
    { id: "projects", icon: "◆", page: "projects", label: "Projets", fields: [
      { root: "projects", label: "Projets", type: "list", title: function (x) { return (x.title && x.title.fr) + " · " + ((STATUS.filter(function (s) { return s[0] === x.status; })[0] || [0, ""])[1]); }, blank: function () { return { id: "", status: "current", image: "", title: {}, text: {}, needs: {} }; }, fields: [
        { k: "title", label: "Titre", type: "ml" }, { k: "status", label: "État", type: "select", opts: STATUS }, { k: "icon", label: "Icône (si pas de photo)", type: "select", opts: ICONS },
        { k: "text", label: "Description", type: "mlarea", rows: 4 }, { k: "needs", label: "Besoins", hint: "facultatif", type: "ml" }, { k: "image", label: "Photo", type: "image" } ] }
    ] },
    { id: "news", icon: "✎", page: "news", label: "Actualités", hint: "Articles courts : distribution, ftour, partenariat… Les plus récents s'affichent en premier (selon la date).", fields: [
      { root: "news", label: "Articles", type: "list", title: function (x) { return (x.date || "") + " · " + ((x.title && x.title.fr) || ""); }, blank: function () { return { id: "", date: new Date().toISOString().slice(0, 10), image: "", title: {}, text: {} }; }, fields: [
        { k: "date", label: "Date", hint: "format AAAA-MM-JJ, ex. 2027-02-20", type: "text" },
        { k: "title", label: "Titre", type: "ml" },
        { k: "text", label: "Texte", hint: "laissez une ligne vide entre deux paragraphes", type: "mlarea", rows: 6 },
        { k: "image", label: "Photo", type: "image" } ] }
    ] },
    { id: "campaign", icon: "◔", page: "", label: "Cagnotte", hint: "Barre de progression affichée sur l'accueil et la page Don. Elle n'apparaît que si elle est active et qu'un objectif est indiqué.", fields: [
      { obj: "campaign", k: "active", label: "Afficher la cagnotte", type: "select", opts: [["yes", "Oui"], ["no", "Non"]] },
      { obj: "campaign", k: "goal", label: "Objectif", hint: "un nombre, ex. 300", type: "text", ph: "300" },
      { obj: "campaign", k: "current", label: "Déjà réunis", hint: "mettez ce nombre à jour au fil des dons", type: "text", ph: "0" },
      { obj: "campaign", k: "unit", label: "Unité", hint: "ex. paniers, repas, DH", type: "ml" },
      { obj: "campaign", k: "tag", label: "Petite mention", type: "ml" },
      { obj: "campaign", k: "title", label: "Titre", type: "ml" },
      { obj: "campaign", k: "text", label: "Texte", type: "mlarea" },
      { obj: "campaign", k: "deadline", label: "Échéance", hint: "facultatif, ex. jusqu'au 1er Ramadan", type: "ml" }
    ] },
    { id: "faq", icon: "?", page: "faq", label: "FAQ", hint: "Questions fréquentes : elles servent aussi de réponses à l'assistant (bouton « Une question ? » en bas du site).", fields: [
      { root: "faq", label: "Questions", type: "list", title: function (x) { return x.q && x.q.fr; }, blank: function () { return { q: {}, a: {} }; }, fields: [
        { k: "q", label: "Question", type: "ml" }, { k: "a", label: "Réponse", type: "mlarea", rows: 4 } ] }
    ] },
    { id: "partners", icon: "♡", page: "partners", label: "Partenaires", fields: [
      { obj: "partners", k: "intro", label: "Introduction", type: "mlarea" },
      { obj: "partners", k: "list", label: "Partenaires", type: "list", title: function (x) { return x.name; }, blank: function () { return { name: "", logo: "", url: "", text: {} }; }, fields: [
        { k: "name", label: "Nom", type: "text" }, { k: "logo", label: "Logo", type: "image" }, { k: "url", label: "Site web", hint: "facultatif", type: "text" }, { k: "text", label: "Petite phrase", hint: "facultatif", type: "ml" } ] },
      { obj: "partners", k: "become", label: "Texte « Devenir partenaire »", type: "mlarea" }
    ] },
    { id: "legal", icon: "§", page: "transparency", label: "Transparence", hint: "Page « Transparence » (lien en bas du site). Les champs vides ne s'affichent pas.", fields: [
      { obj: "legal", k: "intro", label: "Introduction", type: "mlarea" },
      { obj: "legal", k: "status", label: "Statut", type: "ml" },
      { obj: "legal", k: "registration", label: "N° de récépissé / autorisation", type: "text" },
      { obj: "legal", k: "founded", label: "Année de création", type: "text", ph: "ex. 2015" },
      { obj: "legal", k: "office", label: "Bureau (président, trésorier…)", hint: "une personne par ligne, uniquement si le bureau est d'accord", type: "mlarea" },
      { obj: "legal", k: "reportUrl", label: "Rapport moral et financier (lien)", hint: "lien Google Drive, PDF en ligne…", type: "text" },
      { obj: "legal", k: "privacy", label: "Données personnelles", type: "mlarea", rows: 5 }
    ] },
    { id: "donate", icon: "♥", page: "donate", label: "Dons & contact", hint: "Sans coordonnées bancaires, la page propose de les demander sur WhatsApp.", fields: [
      { obj: "donate", k: "intro", label: "Introduction de la page Don", type: "mlarea" },
      { obj: "donate", k: "bankName", label: "Banque", type: "text" },
      { obj: "donate", k: "holder", label: "Titulaire du compte", type: "text" },
      { obj: "donate", k: "rib", label: "RIB", type: "text" },
      { obj: "donate", k: "swift", label: "SWIFT", hint: "facultatif, pour les dons de l'étranger", type: "text" },
      { obj: "donate", k: "inKind", label: "Dons en nature", type: "mlarea" },
      { obj: "donate", k: "volunteer", label: "Bénévolat", type: "mlarea" },
      { obj: "contact", k: "intro", label: "Introduction de la page Contact", type: "mlarea" }
    ] }
  ];

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var a in attrs || {}) { if (a === "text") e.textContent = attrs[a]; else if (a.slice(0, 2) === "on") e.addEventListener(a.slice(2), attrs[a]); else if (attrs[a] != null) e.setAttribute(a, attrs[a]); }
    (kids || []).forEach(function (k) { if (k) e.appendChild(typeof k === "string" ? document.createTextNode(k) : k); });
    return e;
  }
  function toast(msg, bad) { var t = $("#toast"); t.textContent = msg; t.className = "toast show" + (bad === true ? " bad" : bad === "ok" ? " ok" : ""); clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = "toast"; }, bad ? 5000 : 2200); }
  function touch() { dirty = true; $("#save").disabled = false; $("#undo").hidden = false; $("#save .lbl").textContent = "Enregistrer"; }
  function api(path, body) {
    return fetch("/api/" + path, body === undefined ? { credentials: "same-origin" } : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("Erreur " + r.status)); return j; }); });
  }

  /* ---------- field widgets ---------- */
  function label(f) { return el("span", { class: "lbl" }, [f.label, f.hint ? el("small", { text: " — " + f.hint }) : null]); }
  function widget(f, obj) {
    var box = el("div", { class: "field" }, [label(f)]);
    if (f.type === "text") {
      box.appendChild(el("input", { value: obj[f.k] || "", placeholder: f.ph || "", oninput: function (e) { obj[f.k] = e.target.value; touch(); } }));
    } else if (f.type === "select") {
      var s = el("select", { onchange: function (e) { obj[f.k] = e.target.value; touch(); } }, f.opts.map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
      s.value = obj[f.k] || f.opts[0][0]; box.appendChild(s);
    } else if (f.type === "ml" || f.type === "mlarea") {
      if (!obj[f.k] || typeof obj[f.k] !== "object") obj[f.k] = {};
      var o = obj[f.k];
      box.appendChild(el("div", { class: "ml" }, LANGS.map(function (L) {
        var input = f.type === "ml" ? el("input", { value: o[L[0]] || "", dir: L[2], lang: L[0] }) : el("textarea", { rows: f.rows || 3, dir: L[2], lang: L[0] });
        if (f.type !== "ml") input.value = o[L[0]] || "";
        var cell = el("div", { class: "l-" + L[0] + (o[L[0]] ? "" : " empty") }, [input, el("span", { text: L[1] })]);
        input.addEventListener("input", function () { o[L[0]] = input.value; cell.classList.toggle("empty", !input.value); touch(); });
        return cell;
      })));
    } else if (f.type === "image") {
      var prev = el("div", { class: "prev" }), url = el("input", { value: obj[f.k] || "", placeholder: "/assets/uploads/… ou https://…" });
      var show = function () { var v = obj[f.k] || ""; prev.style.backgroundImage = v ? "url(\"" + v.replace(/"/g, "") + "\")" : ""; prev.textContent = v ? "" : "aucune photo"; prev.classList.toggle("has", !!v); };
      url.addEventListener("input", function () { obj[f.k] = url.value.trim(); touch(); show(); });
      var file = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", hidden: "" });
      var upload = function (fl) {
        if (!fl || String(fl.type).indexOf("image/") !== 0) return;
        shrink(fl).then(function (dataUrl) { toast("Envoi de la photo…"); return api("upload", { name: fl.name, data: dataUrl }); })
          .then(function (r) { obj[f.k] = r.url; url.value = r.url; show(); touch(); toast("Photo ajoutée — pensez à enregistrer", "ok"); })
          .catch(function (e) { toast(e.message, true); });
      };
      file.addEventListener("change", function () { upload(file.files[0]); file.value = ""; });
      show();
      var zone = el("div", { class: "img", title: "Glissez une photo ici" }, [prev, el("div", { class: "ctl" }, [url, el("div", {}, [
        el("button", { class: "btn small", type: "button", text: "Choisir une photo…", onclick: function () { file.click(); } }),
        el("button", { class: "btn small ghost", type: "button", text: "Retirer", onclick: function () { obj[f.k] = ""; url.value = ""; show(); touch(); } }), file])])]);
      zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("over"); });
      zone.addEventListener("dragleave", function () { zone.classList.remove("over"); });
      zone.addEventListener("drop", function (e) { e.preventDefault(); zone.classList.remove("over"); upload(e.dataTransfer.files[0]); });
      box.appendChild(zone);
    } else if (f.type === "list") {
      var arr = f.root ? data[f.root] : (obj[f.k] = Array.isArray(obj[f.k]) ? obj[f.k] : []);
      var wrap = el("div");
      var draw = function (openIdx) {
        wrap.innerHTML = "";
        arr.forEach(function (item, i) {
          var t = el("span", { class: "t", text: (f.title(item) || "").trim() || "(sans titre)" });
          var tools = el("span", { class: "tools" }, [
            el("button", { class: "btn small", type: "button", title: "Monter", text: "↑", onclick: function (e) { e.preventDefault(); if (i > 0) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); touch(); draw(i - 1); } } }),
            el("button", { class: "btn small", type: "button", title: "Descendre", text: "↓", onclick: function (e) { e.preventDefault(); if (i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); touch(); draw(i + 1); } } }),
            el("button", { class: "btn small danger", type: "button", title: "Supprimer", text: "✕", onclick: function (e) { e.preventDefault(); if (confirm("Supprimer « " + t.textContent + " » ?")) { arr.splice(i, 1); touch(); draw(); } } })
          ]);
          var body = el("div", { class: "body" }, f.fields.map(function (sf) { return widget(sf, item); }));
          body.addEventListener("input", function () { t.textContent = (f.title(item) || "").trim() || "(sans titre)"; });
          var pic = item.image || item.logo || "", th = el("span", { class: "thumb", text: pic ? "" : String(i + 1) });
          if (pic) th.style.backgroundImage = "url(\"" + String(pic).replace(/"/g, "") + "\")";
          wrap.appendChild(el("details", { class: "item", open: i === openIdx ? "" : null }, [el("summary", {}, [el("span", { class: "chev", text: "›" }), th, t, tools]), body]));
        });
      };
      draw();
      box.appendChild(wrap);
      box.appendChild(el("button", { class: "btn add", type: "button", text: "+ Ajouter", onclick: function () { arr.push(f.blank()); touch(); draw(arr.length - 1); } }));
    }
    return box;
  }

  /* resize big photos in the browser before upload (max 1800 px, JPEG) */
  function shrink(file) {
    return new Promise(function (ok, ko) {
      var rd = new FileReader();
      rd.onerror = function () { ko(new Error("Lecture du fichier impossible")); };
      rd.onload = function () {
        if (file.type === "image/gif") return ok(rd.result);
        var im = new Image();
        im.onerror = function () { ko(new Error("Image illisible")); };
        im.onload = function () {
          var max = 1800, sc = Math.min(1, max / Math.max(im.width, im.height));
          if (sc === 1 && file.size < 900e3) return ok(rd.result);
          var cv = document.createElement("canvas"); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
          var cx = cv.getContext("2d"); if (file.type === "image/jpeg") { cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); }
          cx.drawImage(im, 0, 0, cv.width, cv.height);
          ok(cv.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", .85));
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  function showTab(id) {
    tab = id;
    var t = TABS.filter(function (x) { return x.id === id; })[0];
    document.querySelectorAll("#tabs button").forEach(function (b) { b.className = b.dataset.id === id ? "on" : ""; });
    $("#title").textContent = t.label;
    $("#hint").textContent = t.hint || "Chaque texte se saisit en français, arabe et anglais. Les cases orangées sont vides.";
    $("#preview").href = "/" + (lang === "all" ? "fr" : lang) + "/" + t.page;
    $("#app").classList.remove("nav-open");
    var p = $("#panel"); p.innerHTML = ""; p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
    if (t.custom) { dashboard(p); return; }
    var box = el("div", { class: "box" });
    t.fields.forEach(function (f) { if (f.obj && (!data[f.obj] || typeof data[f.obj] !== "object")) data[f.obj] = {}; if (f.root && !Array.isArray(data[f.root])) data[f.root] = []; box.appendChild(widget(f, f.obj ? data[f.obj] : data)); });
    p.appendChild(box);
  }

  /* ---------- dashboard ---------- */
  function txt(o) { return o && typeof o === "object" ? (o.fr || o.ar || o.en || "") : String(o || ""); }
  function todo(o) { var t = txt(o).trim(); return !t || /^\[[^\]]*\]$/.test(t.split(/\n\s*\n/)[0].trim()) && t.split(/\n\s*\n/).length === 1; }
  function hasTodo(o) { return /\[(À compléter|للإكمال|To complete)/.test(txt(o)); }
  function dashboard(p) {
    var d = data, s = d.site || {}, dn = d.donate || {}, k = d.campaign || {}, lg = d.legal || {};
    var news = (d.news || []).slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); });
    var go = function (id) { return function () { showTab(id); window.scrollTo(0, 0); }; };
    /* metrics */
    var metric = function (n, l, id, c) { return el("button", { class: "metric " + (c || ""), type: "button", onclick: go(id) }, [el("strong", { text: String(n) }), el("span", { text: l })]); };
    p.appendChild(el("div", { class: "metrics" }, [
      metric((d.activities || []).length, "Activités", "activities", "m-blue"),
      metric((d.projects || []).length, "Projets", "projects", "m-orange"),
      metric(news.length, "Actualités", "news", "m-green"),
      metric((d.faq || []).length, "Questions FAQ", "faq", "m-blue"),
      metric((d.gallery || []).length, "Photos galerie", "gallery", "m-orange"),
      metric(((d.partners || {}).list || []).length, "Partenaires", "partners", "m-green")
    ]));
    /* checklist */
    var checks = [
      ["Téléphone ou WhatsApp", !!(s.phone || s.whatsapp), "general"],
      ["E-mail", !!s.email, "general"],
      ["Adresse", !todo(s.address), "general"],
      ["Coordonnées bancaires (RIB)", !!dn.rib, "donate"],
      ["Chiffres clés", (d.stats || []).some(function (x) { return String(x.value || "").trim(); }), "home"],
      ["Partenaires", ((d.partners || {}).list || []).length > 0, "partners"],
      ["Texte « Notre histoire »", !hasTodo((d.about || {}).story), "about"],
      ["Présentation de Mamoun Al Jiwar", !(d.projects || []).some(function (x) { return hasTodo(x.text); }), "projects"],
      ["Au moins une actualité", news.length > 0, "news"],
      ["Récépissé / autorisation", !!lg.registration, "legal"],
      ["Objectif de la cagnotte", k.active === "yes" && parseFloat(k.goal) > 0, "campaign"]
    ];
    var ok = checks.filter(function (c) { return c[1]; }).length, pct = Math.round(ok / checks.length * 100);
    var ring = el("div", { class: "ring", style: "--p:" + pct }, [el("strong", { text: pct + " %" }), el("span", { text: "complet" })]);
    var list = el("ul", { class: "checks" }, checks.map(function (c) {
      return el("li", { class: c[1] ? "ok" : "ko" }, [el("span", { class: "mark", text: c[1] ? "✓" : "!" }), el("span", { class: "lab", text: c[0] }), c[1] ? null : el("button", { class: "btn small", type: "button", text: "Compléter", onclick: go(c[2]) })]);
    }));
    /* fundraiser quick edit */
    var goal = parseFloat(k.goal) || 0, cur = parseFloat(k.current) || 0, cp = goal ? Math.min(100, Math.round(cur / goal * 100)) : 0;
    var bar = el("div", { class: "bar" }, [el("span", { style: "width:" + cp + "%" })]);
    var info = el("p", { class: "hint", text: goal ? cur + " / " + goal + " " + txt(k.unit) + " · " + cp + " %" : "Indiquez un objectif pour afficher la cagnotte sur le site." });
    var upd = function () { goal = parseFloat(k.goal) || 0; cur = parseFloat(k.current) || 0; cp = goal ? Math.min(100, Math.round(cur / goal * 100)) : 0; bar.firstChild.style.width = cp + "%"; info.textContent = goal ? cur + " / " + goal + " " + txt(k.unit) + " · " + cp + " %" : "Indiquez un objectif pour afficher la cagnotte sur le site."; };
    d.campaign = k;
    var num = function (key, lab) { return el("label", { class: "mini" }, [lab, el("input", { type: "number", min: "0", value: k[key] || "", oninput: function (e) { k[key] = e.target.value; touch(); upd(); } })]); };
    var act = el("select", { onchange: function (e) { k.active = e.target.value; touch(); } }, [el("option", { value: "yes", text: "Affichée" }), el("option", { value: "no", text: "Masquée" })]); act.value = k.active || "no";
    var camp = el("div", { class: "box dash-card" }, [el("h2", { text: "Cagnotte · " + (txt(k.tag) || "Ramadan") }), bar, info,
      el("div", { class: "mini-row" }, [num("current", "Déjà réunis"), num("goal", "Objectif"), el("label", { class: "mini" }, ["Sur le site", act])]),
      el("p", { class: "hint", text: "Modifiez puis cliquez sur « Enregistrer » en haut." })]);
    /* latest news + quick actions */
    var latest = el("div", { class: "box dash-card" }, [el("h2", { text: "Dernières actualités" }),
      news.length ? el("ul", { class: "latest" }, news.slice(0, 4).map(function (n) { return el("li", {}, [el("span", { class: "date", text: n.date || "" }), el("span", { text: txt(n.title) || "(sans titre)" })]); })) : el("p", { class: "hint", text: "Aucune actualité pour l'instant." }),
      el("div", { class: "actions-row" }, [
        el("button", { class: "btn primary", type: "button", text: "+ Nouvelle actualité", onclick: function () { d.news = d.news || []; d.news.push({ id: "", date: new Date().toISOString().slice(0, 10), image: "", title: {}, text: {} }); touch(); showTab("news"); } }),
        el("a", { class: "btn", href: "/", target: "_blank", rel: "noopener", text: "Voir le site ↗" })])]);
    p.appendChild(el("div", { class: "dash" }, [
      el("div", { class: "box dash-card dash-wide" }, [el("h2", { text: "Le site est-il complet ?" }), el("div", { class: "comp" }, [ring, list])]),
      camp, latest
    ]));
  }

  function start() {
    $("#login").hidden = true; $("#app").hidden = false;
    api("content").then(function (c) {
      data = c;
      $("#tabs").innerHTML = "";
      TABS.forEach(function (t) { $("#tabs").appendChild(el("button", { "data-id": t.id, type: "button", onclick: function () { showTab(t.id); window.scrollTo(0, 0); } }, [el("span", { class: "i", text: t.icon }), t.label])); });
      showTab(tab);
    }).catch(function (e) { toast(e.message, true); });
  }
  function showLogin() { $("#app").hidden = true; $("#login").hidden = false; }

  $("#save").addEventListener("click", function () {
    var b = $("#save"); b.disabled = true; $("#save .lbl").textContent = "Enregistrement…";
    api("content", data).then(function (r) { data = r.content; dirty = false; $("#undo").hidden = true; $("#save .lbl").textContent = "Enregistré"; toast("Enregistré ✓ — le site est à jour", "ok"); showTab(tab); })
      .catch(function (e) { b.disabled = false; $("#save .lbl").textContent = "Enregistrer"; toast(e.message, true); if (/Connexion/.test(e.message)) showLogin(); });
  });
  var lang = "all"; try { lang = localStorage.getItem("aj-admin-lang") || "all"; } catch (e) { /* private mode */ }
  function setLang(l) {
    lang = l; $("#panel").setAttribute("data-lang", l);
    document.querySelectorAll("#langs button").forEach(function (b) { b.className = b.dataset.l === l ? "on" : ""; });
    try { localStorage.setItem("aj-admin-lang", l); } catch (e) { /* ignore */ }
    var t = TABS.filter(function (x) { return x.id === tab; })[0]; $("#preview").href = "/" + (l === "all" ? "fr" : l) + "/" + (t ? t.page : "");
  }
  document.querySelectorAll("#langs button").forEach(function (b) { b.addEventListener("click", function () { setLang(b.dataset.l); }); });
  setLang(lang);
  $("#menu").addEventListener("click", function () { $("#app").classList.toggle("nav-open"); });
  $("#undo").addEventListener("click", function () {
    if (!dirty || !confirm("Annuler toutes les modifications non enregistrées ?")) return;
    api("content").then(function (c) { data = c; dirty = false; $("#save").disabled = true; $("#save .lbl").textContent = "Enregistré"; showTab(tab); toast("Modifications annulées", "ok"); });
  });
  $("#logout").addEventListener("click", function () { if (dirty && !confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?")) return; api("logout", {}).then(function () { dirty = false; showLogin(); }); });
  $(".login-box").addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target; $(".err").textContent = "";
    api("login", { password: f.password.value }).then(function () { f.password.value = ""; start(); }).catch(function (er) { $(".err").textContent = er.message; });
  });
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (!$("#save").disabled) $("#save").click(); } });

  api("session").then(function (s) { if (s.repo) { var h = $("#history"); h.href = "https://github.com/" + s.repo + "/commits/main/data/content.json"; h.hidden = false; } if (s.authed) start(); else { showLogin(); if (!s.configured) $(".err").textContent = "ADMIN_PASSWORD n'est pas défini sur le serveur."; } }).catch(showLogin);
})();
