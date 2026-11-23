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

    /* header shadow once scrolled + reading progress bar */
    var top = document.querySelector(".top"), bar = document.createElement("div");
    bar.className = "progress"; document.body.appendChild(bar);
    var onScroll = function () {
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
      if (top) top.classList.toggle("scrolled", y > 10);
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
    };
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

    /* hero: cards follow the pointer a little, glow follows the cursor */
    var art = document.querySelector("[data-tilt]"), box = document.querySelector(".hero-box");
    if (art && box && !reduce && window.matchMedia("(pointer: fine)").matches) {
      box.addEventListener("pointermove", function (e) {
        var r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        art.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg"); art.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
        box.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%"); box.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
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
