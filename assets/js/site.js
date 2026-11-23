/* Association Al Jiwar — motion & interactions (no library).
   Loaded in <head> so the "js" class is set before first paint: without JS everything stays visible. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.className += " js" + (reduce ? " reduce" : "");

  document.addEventListener("DOMContentLoaded", function () {
    /* mobile menu */
    var b = document.querySelector(".burger"), nav = document.getElementById("nav");
    if (b && nav) b.addEventListener("click", function () { var o = nav.classList.toggle("open"); b.setAttribute("aria-expanded", o ? "true" : "false"); });

    /* header shadow once scrolled */
    var top = document.querySelector(".top");
    var onScroll = function () { if (top) top.classList.toggle("scrolled", window.scrollY > 10); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    /* reveal on scroll (staggered with --d) */
    var items = document.querySelectorAll(".rv");
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
    } else items.forEach(function (el) { el.classList.add("in"); });

    /* count-up for numbers in stat tiles ("120", "1 500+", "50,000+") */
    if (!reduce && "IntersectionObserver" in window) {
      var co = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return; co.unobserve(e.target);
          var el = e.target, raw = el.textContent, m = raw.match(/^(\D*)([\d\s.,]+)(.*)$/); if (!m) return;
          var digits = m[2].replace(/[^\d]/g, ""), end = parseInt(digits, 10); if (!end) return;
          var sep = (m[2].match(/[\s.,]/) || [""])[0], t0 = performance.now(), dur = 1400;
          var fmt = function (n) { var s = String(n); return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : s; };
          (function tick(t) { var p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3))); el.textContent = m[1] + fmt(v) + m[3]; if (p < 1) requestAnimationFrame(tick); })(t0);
        });
      }, { threshold: 0.6 });
      document.querySelectorAll(".stat strong").forEach(function (el) { co.observe(el); });
    }

    /* hero: cards follow the pointer a little */
    var art = document.querySelector("[data-tilt]"), box = document.querySelector(".hero-box");
    if (art && box && !reduce && window.matchMedia("(pointer: fine)").matches) {
      box.addEventListener("pointermove", function (e) {
        var r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        art.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg"); art.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
      });
      box.addEventListener("pointerleave", function () { art.style.setProperty("--rx", "0deg"); art.style.setProperty("--ry", "0deg"); });
    }

    /* gallery: drag to scroll on desktop, arrows with keyboard */
    var g = document.querySelector(".gallery");
    if (g) {
      var down = false, sx = 0, sl = 0, moved = false;
      g.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = g.scrollLeft; g.classList.add("drag"); });
      window.addEventListener("pointerup", function () { down = false; g.classList.remove("drag"); });
      g.addEventListener("pointermove", function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; g.scrollLeft = sl - dx; });
      g.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
      g.addEventListener("dragstart", function (e) { e.preventDefault(); });
    }

    /* copy buttons (RIB) */
    document.querySelectorAll(".copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var txt = btn.getAttribute("data-copy"), label = btn.textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
          btn.textContent = btn.getAttribute("data-done"); btn.classList.add("ok");
          setTimeout(function () { btn.textContent = label; btn.classList.remove("ok"); }, 1800);
        }, function () { window.prompt("", txt); });
      });
    });

    /* contact form -> WhatsApp */
    var f = document.querySelector(".waform");
    if (f) f.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = f.msg.value.trim() + "\n\n— " + f.name.value.trim();
      window.open("https://wa.me/" + f.getAttribute("data-wa") + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  });
})();

/* ---------- FAQ assistant (no AI: answers only from the association's FAQ) ---------- */
document.addEventListener("DOMContentLoaded", function () {
  var box = document.querySelector("[data-chat]"); if (!box) return;
  var data; try { data = JSON.parse(box.querySelector(".chat-data").textContent); } catch (e) { return; }
  var fab = box.querySelector(".chat-fab"), panel = box.querySelector(".chat-panel"), log = box.querySelector(".chat-log"), form = box.querySelector(".chat-form");
  var norm = function (t) { return String(t).toLowerCase().normalize("NFD").replace(/[̀-ًͯ-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}\s]/gu, " "); };
  var words = function (t) { return norm(t).split(/\s+/).filter(function (w) { return w.length > 2; }); };
  var stem = function (w) { return w.slice(0, Math.max(4, Math.ceil(w.length * 0.7))); };
  var index = data.faq.map(function (f) { return { f: f, q: words(f.q).map(stem), a: words(f.a).map(stem) }; });
  function say(text, who) { var p = document.createElement("div"); p.className = "msg " + (who || "bot"); p.textContent = text; log.appendChild(p); log.scrollTop = log.scrollHeight; return p; }
  function chips(skip) {
    var wrap = document.createElement("div"); wrap.className = "chips-q";
    data.faq.filter(function (f) { return f !== skip; }).slice(0, 4).forEach(function (f) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = f.q;
      b.addEventListener("click", function () { wrap.remove(); ask(f.q, f); }); wrap.appendChild(b);
    });
    log.appendChild(wrap); log.scrollTop = log.scrollHeight;
  }
  function links() {
    var wrap = document.createElement("div"); wrap.className = "chips-q";
    data.links.forEach(function (l) { var a = document.createElement("a"); a.href = l[1]; a.textContent = l[0]; if (/^https/.test(l[1])) { a.target = "_blank"; a.rel = "noopener"; } wrap.appendChild(a); });
    log.appendChild(wrap); log.scrollTop = log.scrollHeight;
  }
  function best(q) {
    var t = words(q).map(stem); if (!t.length) return null;
    var top = null, score = 0;
    index.forEach(function (it) {
      var sc = 0; t.forEach(function (w) { if (it.q.indexOf(w) >= 0) sc += 2; else if (it.a.indexOf(w) >= 0) sc += 1; });
      if (sc > score) { score = sc; top = it.f; }
    });
    return score >= 2 ? top : null;
  }
  function ask(q, known) {
    say(q, "me");
    var f = known || best(q);
    setTimeout(function () { if (f) { say(f.a); chips(f); } else { say(data.ui.no); links(); } }, 350);
  }
  function open(o) {
    panel.hidden = !o; fab.setAttribute("aria-expanded", o ? "true" : "false"); box.classList.toggle("open", o);
    if (o && !log.childNodes.length) { say(data.ui.hello); chips(); }
    if (o) setTimeout(function () { form.q.focus(); }, 50);
  }
  fab.addEventListener("click", function () { open(panel.hidden); });
  box.querySelector(".chat-x").addEventListener("click", function () { open(false); fab.focus(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) open(false); });
  form.addEventListener("submit", function (e) { e.preventDefault(); var q = form.q.value.trim(); if (!q) return; form.q.value = ""; ask(q); });
});

/* ---------- polish: headline reveal, smart header, card shuffle, image fade, lightbox ---------- */
document.addEventListener("DOMContentLoaded", function () {
  var reduce = document.documentElement.classList.contains("reduce");

  /* headline words rise one after another */
  if (!reduce) document.querySelectorAll(".hero h1, .phead h1, .article h1").forEach(function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach(function (w, i) {
      var o = document.createElement("span"), n = document.createElement("span");
      o.className = "w"; n.className = "wi"; n.style.setProperty("--i", i); n.textContent = w;
      o.appendChild(n); h.appendChild(o); if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
    h.classList.add("words");
  });

  /* header hides when scrolling down, comes back when scrolling up */
  var top = document.querySelector(".top"), nav = document.getElementById("nav"), last = window.scrollY;
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    if (top && !(nav && nav.classList.contains("open"))) top.classList.toggle("hide", y > last && y > 160);
    last = y;
  }, { passive: true });

  /* images fade in once loaded */
  document.querySelectorAll("main img").forEach(function (im) {
    if (im.complete && im.naturalWidth) return;
    im.classList.add("fade");
    im.addEventListener("load", function () { im.classList.add("loaded"); }, { once: true });
    im.addEventListener("error", function () { im.classList.add("loaded"); }, { once: true });
  });

  /* hero cards take turns in front */
  var fan = document.querySelector(".fan"), cards = fan ? fan.querySelectorAll(".fan-card") : [];
  if (!reduce && cards.length === 3) {
    var order = ["f0", "f1", "f2"], paused = false;
    fan.addEventListener("mouseenter", function () { paused = true; });
    fan.addEventListener("mouseleave", function () { paused = false; });
    setInterval(function () {
      if (paused || document.hidden) return;
      order.unshift(order.pop());
      cards.forEach(function (cd, i) { cd.classList.remove("f0", "f1", "f2"); cd.classList.add(order[i]); });
    }, 4200);
  }

  /* gallery lightbox */
  var items = Array.prototype.slice.call(document.querySelectorAll(".g-item"));
  if (items.length && window.HTMLDialogElement) {
    var dlg = document.createElement("dialog"); dlg.className = "lightbox";
    dlg.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><button class="lb-x" type="button" aria-label="×">×</button><button class="lb-p" type="button" aria-label="‹">‹</button><button class="lb-n" type="button" aria-label="›">›</button>';
    document.body.appendChild(dlg);
    var cur = 0, im = dlg.querySelector("img"), cap = dlg.querySelector("figcaption"), rtl = document.documentElement.dir === "rtl";
    var show = function (i) {
      cur = (i + items.length) % items.length;
      var src = items[cur].querySelector("img"), fc = items[cur].querySelector("figcaption");
      im.src = src.currentSrc || src.src; im.alt = src.alt; cap.textContent = fc ? fc.textContent : "";
    };
    items.forEach(function (it, i) {
      it.tabIndex = 0; it.setAttribute("role", "button");
      var go = function () { show(i); dlg.showModal(); };
      it.addEventListener("click", function () { if (!document.querySelector(".gallery.drag")) go(); });
      it.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    dlg.querySelector(".lb-x").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".lb-p").addEventListener("click", function () { show(cur + (rtl ? 1 : -1)); });
    dlg.querySelector(".lb-n").addEventListener("click", function () { show(cur + (rtl ? -1 : 1)); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
  }
});
