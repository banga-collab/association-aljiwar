/* Admin Al Jiwar — form editor for data/content.json */
(function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var data = null, dirty = false, tab = "general";
  var LANGS = [["fr", "FR", "ltr"], ["ar", "ع", "rtl"], ["en", "EN", "ltr"]];
  var ICONS = [["box", "Carton (stock)"], ["heart", "Cœur"], ["moon", "Croissant (Ramadan)"], ["table", "Table (ftour)"], ["hands", "Mains (bénévolat)"], ["home", "Maison"], ["users", "Personnes"], ["book", "Livre (école)"]];
  var STATUS = [["current", "En cours"], ["upcoming", "À venir"], ["done", "Réalisé"]];

  var TABS = [
    { id: "general", label: "Général", hint: "Nom, coordonnées et réseaux. Les champs vides ne s'affichent pas sur le site.", fields: [
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
      { obj: "site", k: "siteUrl", label: "Adresse du site", hint: "ex. https://association-aljiwar.vercel.app", type: "text" }
    ] },
    { id: "home", label: "Accueil", fields: [
      { obj: "home", k: "heroTitle", label: "Grand titre", type: "ml" },
      { obj: "home", k: "heroText", label: "Texte d'introduction", type: "mlarea" },
      { obj: "home", k: "heroImage", label: "Photo d'accueil", hint: "sans photo, le logo s'affiche", type: "image" },
      { obj: "home", k: "missionTitle", label: "Titre « mission »", type: "ml" },
      { obj: "home", k: "missionText", label: "Texte « mission »", type: "mlarea" },
      { root: "stats", label: "Chiffres clés", hint: "un chiffre vide n'est pas affiché", type: "list", title: function (x) { return (x.value || "—") + " " + (x.label && x.label.fr || ""); }, blank: function () { return { value: "", label: { ar: "", fr: "", en: "" } }; }, fields: [
        { k: "value", label: "Chiffre", type: "text", ph: "ex. 120" }, { k: "label", label: "Légende", type: "ml" } ] }
    ] },
    { id: "about", label: "Qui sommes-nous", fields: [
      { obj: "about", k: "intro", label: "Introduction", type: "mlarea" },
      { obj: "about", k: "story", label: "Notre histoire", hint: "laissez une ligne vide entre deux paragraphes", type: "mlarea", rows: 6 },
      { obj: "about", k: "image", label: "Photo", type: "image" },
      { obj: "about", k: "values", label: "Valeurs", type: "list", title: function (x) { return x.title && x.title.fr; }, blank: function () { return { title: {}, text: {} }; }, fields: [
        { k: "title", label: "Titre", type: "ml" }, { k: "text", label: "Texte", type: "mlarea" } ] }
    ] },
    { id: "activities", label: "Activités", fields: [
      { root: "activities", label: "Activités", type: "list", title: function (x) { return x.title && x.title.fr; }, blank: function () { return { id: "", icon: "heart", image: "", title: {}, text: {} }; }, fields: [
        { k: "title", label: "Titre", type: "ml" }, { k: "icon", label: "Icône (si pas de photo)", type: "select", opts: ICONS },
        { k: "text", label: "Description", type: "mlarea", rows: 4 }, { k: "image", label: "Photo", type: "image" } ] }
    ] },
    { id: "projects", label: "Projets", fields: [
      { root: "projects", label: "Projets", type: "list", title: function (x) { return (x.title && x.title.fr) + " · " + ((STATUS.filter(function (s) { return s[0] === x.status; })[0] || [0, ""])[1]); }, blank: function () { return { id: "", status: "current", image: "", title: {}, text: {}, needs: {} }; }, fields: [
        { k: "title", label: "Titre", type: "ml" }, { k: "status", label: "État", type: "select", opts: STATUS },
        { k: "text", label: "Description", type: "mlarea", rows: 4 }, { k: "needs", label: "Besoins", hint: "facultatif", type: "ml" }, { k: "image", label: "Photo", type: "image" } ] }
    ] },
    { id: "partners", label: "Partenaires", fields: [
      { obj: "partners", k: "intro", label: "Introduction", type: "mlarea" },
      { obj: "partners", k: "list", label: "Partenaires", type: "list", title: function (x) { return x.name; }, blank: function () { return { name: "", logo: "", url: "", text: {} }; }, fields: [
        { k: "name", label: "Nom", type: "text" }, { k: "logo", label: "Logo", type: "image" }, { k: "url", label: "Site web", hint: "facultatif", type: "text" }, { k: "text", label: "Petite phrase", hint: "facultatif", type: "ml" } ] },
      { obj: "partners", k: "become", label: "Texte « Devenir partenaire »", type: "mlarea" }
    ] },
    { id: "donate", label: "Dons & contact", hint: "Sans coordonnées bancaires, la page propose de les demander sur WhatsApp.", fields: [
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
  function toast(msg, bad) { var t = $("#toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = "toast"; }, bad ? 5000 : 2200); }
  function touch() { dirty = true; $("#save").disabled = false; }
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
        input.addEventListener("input", function () { o[L[0]] = input.value; touch(); });
        return el("div", {}, [input, el("span", { text: L[1] })]);
      })));
    } else if (f.type === "image") {
      var prev = el("div", { class: "prev" }), url = el("input", { value: obj[f.k] || "", placeholder: "/assets/uploads/… ou https://…" });
      var show = function () { var v = obj[f.k] || ""; prev.style.backgroundImage = v ? "url(\"" + v.replace(/"/g, "") + "\")" : ""; prev.textContent = v ? "" : "aucune"; };
      url.addEventListener("input", function () { obj[f.k] = url.value.trim(); touch(); show(); });
      var file = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", hidden: "" });
      file.addEventListener("change", function () {
        var fl = file.files[0]; if (!fl) return;
        shrink(fl).then(function (dataUrl) { toast("Envoi de la photo…"); return api("upload", { name: fl.name, data: dataUrl }); })
          .then(function (r) { obj[f.k] = r.url; url.value = r.url; show(); touch(); toast("Photo ajoutée — pensez à enregistrer"); })
          .catch(function (e) { toast(e.message, true); });
        file.value = "";
      });
      show();
      box.appendChild(el("div", { class: "img" }, [prev, el("div", { class: "ctl" }, [url, el("div", {}, [
        el("button", { class: "btn small", type: "button", text: "Choisir une photo…", onclick: function () { file.click(); } }),
        el("button", { class: "btn small ghost", type: "button", text: "Retirer", onclick: function () { obj[f.k] = ""; url.value = ""; show(); touch(); } }), file])])]));
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
          wrap.appendChild(el("details", { class: "item", open: i === openIdx ? "" : null }, [el("summary", {}, [t, tools]), body]));
        });
      };
      draw();
      box.appendChild(wrap);
      box.appendChild(el("button", { class: "btn", type: "button", text: "+ Ajouter", onclick: function () { arr.push(f.blank()); touch(); draw(arr.length - 1); } }));
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
    var p = $("#panel"); p.innerHTML = "";
    p.appendChild(el("h1", { text: t.label }));
    p.appendChild(el("p", { class: "hint", text: (t.hint ? t.hint + " " : "") + "Chaque texte se saisit en français, arabe et anglais." }));
    var box = el("div", { class: "box" });
    t.fields.forEach(function (f) { if (f.obj && (!data[f.obj] || typeof data[f.obj] !== "object")) data[f.obj] = {}; if (f.root && !Array.isArray(data[f.root])) data[f.root] = []; box.appendChild(widget(f, f.obj ? data[f.obj] : data)); });
    p.appendChild(box);
  }

  function start() {
    $("#login").hidden = true; $("#app").hidden = false;
    api("content").then(function (c) {
      data = c;
      $("#tabs").innerHTML = "";
      TABS.forEach(function (t) { $("#tabs").appendChild(el("button", { "data-id": t.id, text: t.label, onclick: function () { showTab(t.id); } })); });
      showTab(tab);
    }).catch(function (e) { toast(e.message, true); });
  }
  function showLogin() { $("#app").hidden = true; $("#login").hidden = false; }

  $("#save").addEventListener("click", function () {
    var b = $("#save"); b.disabled = true; b.textContent = "Enregistrement…";
    api("content", data).then(function (r) { data = r.content; dirty = false; b.textContent = "Enregistrer"; toast("Enregistré ✓ — le site est à jour"); showTab(tab); })
      .catch(function (e) { b.disabled = false; b.textContent = "Enregistrer"; toast(e.message, true); if (/Connexion/.test(e.message)) showLogin(); });
  });
  $("#logout").addEventListener("click", function () { if (dirty && !confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?")) return; api("logout", {}).then(function () { dirty = false; showLogin(); }); });
  $(".login-box").addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target; $(".err").textContent = "";
    api("login", { password: f.password.value }).then(function () { f.password.value = ""; start(); }).catch(function (er) { $(".err").textContent = er.message; });
  });
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (!$("#save").disabled) $("#save").click(); } });

  api("session").then(function (s) { if (s.authed) start(); else { showLogin(); if (!s.configured) $(".err").textContent = "ADMIN_PASSWORD n'est pas défini sur le serveur."; } }).catch(showLogin);
})();
