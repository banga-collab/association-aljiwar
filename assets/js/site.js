/* Association Al Jiwar — mobile menu, copy buttons, WhatsApp form */
(function () {
  var b = document.querySelector(".burger"), nav = document.getElementById("nav");
  if (b && nav) b.addEventListener("click", function () { var o = nav.classList.toggle("open"); b.setAttribute("aria-expanded", o ? "true" : "false"); });

  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var txt = btn.getAttribute("data-copy"), label = btn.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        btn.textContent = btn.getAttribute("data-done"); setTimeout(function () { btn.textContent = label; }, 1800);
      }, function () { window.prompt("", txt); });
    });
  });

  var f = document.querySelector(".waform");
  if (f) f.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = f.msg.value.trim() + "\n\n— " + f.name.value.trim();
    window.open("https://wa.me/" + f.getAttribute("data-wa") + "?text=" + encodeURIComponent(text), "_blank", "noopener");
  });
})();
