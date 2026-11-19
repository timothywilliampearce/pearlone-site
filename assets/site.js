(function () {
  "use strict";

  // Relative motion level, 95 s from 4:20:58 PM on October 2, 2026.
  var BIN_SECONDS = 0.2;
  var TOTAL_SECONDS = 95;
  var FLAG_SECONDS = 41.994;
  var TRACE = [5,5,5,5,5,5,5,5,4,5,5,5,5,5,5,5,5,5,5,5,11,51,24,51,19,43,42,94,118,63,65,25,23,42,31,125,95,67,24,7,32,6,4,4,4,4,4,5,5,4,4,5,4,5,4,5,5,5,5,5,6,5,4,5,5,5,5,5,6,5,5,5,4,4,4,4,5,5,5,5,4,4,5,5,5,4,126,69,102,56,51,19,6,5,4,4,15,63,7,6,5,6,7,5,13,31,94,54,16,18,11,20,43,23,83,46,25,18,8,47,124,143,81,30,22,40,27,23,55,26,33,22,58,47,40,40,89,69,210,132,92,145,113,84,108,80,132,146,30,185,70,134,91,425,323,1269,540,338,857,280,471,358,568,1190,1507,1251,775,397,547,795,404,466,331,398,561,1017,518,353,1601,90,453,704,620,775,891,831,575,834,528,380,465,616,1120,2407,1233,619,350,690,2256,1241,147,454,1109,405,674,461,2003,1259,377,251,363,246,221,140,153,250,311,303,299,432,172,198,64,36,62,58,77,104,62,51,163,115,24,50,43,61,41,32,51,47,58,40,30,14,16,55,27,37,72,43,86,97,36,77,59,140,88,1037,246,259,450,508,341,316,152,256,253,82,100,282,294,664,690,833,280,180,812,899,135,27,739,1236,460,438,500,460,659,546,313,646,498,249,329,313,308,342,314,268,350,235,239,185,303,566,534,272,385,335,287,302,341,291,302,366,277,254,286,450,461,332,44,232,616,437,407,340,351,549,365,242,322,71,109,263,212,731,231,28,76,241,0,146,346,57,175,89,21,99,170,36,37,55,147,101,246,112,56,191,141,116,68,52,17,27,19,10,14,7,15,6,12,6,6,13,15,7,17,21,33,19,23,19,13,19,80,18,27,13,13,19,8,10,17,10,7,6,48,40,16,12,11,12,12,17,16,13,11,13,34,34,2207,1421,1515,1052,350,111,268,151,93,84,35,48,85,86,48,67,35,29,23,20,19,7,5,18,12,6,5,8,8,12,12,9,3,10,10,6,8,9,5,7,11,14,47,15,18,35,36,10,29,26,47,23,34,20,22,29,19,19,17,14,13,18,13,18,10];

  var canvas = document.getElementById("trace");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var progress = reduceMotion ? 1 : 0;

  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function draw() {
    if (!canvas) return;
    var ratio = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var ink = token("--ink"), hair = token("--hair"), signal = token("--signal");
    var peak = 0;
    for (var i = 0; i < TRACE.length; i++) if (TRACE[i] > peak) peak = TRACE[i];
    var mid = h / 2, half = h / 2 - 2;
    var step = w / (TOTAL_SECONDS / BIN_SECONDS);
    var bar = Math.max(1, step * 0.62);
    var flagX = (FLAG_SECONDS / TOTAL_SECONDS) * w;
    var drawnTo = progress * w;

    // Resting baseline across the full width.
    ctx.fillStyle = hair;
    ctx.fillRect(0, mid - 0.5, w, 1);

    for (var j = 0; j < TRACE.length; j++) {
      var x = j * step;
      var amp = Math.max(1, (TRACE[j] / peak) * half);
      ctx.fillStyle = x <= drawnTo ? ink : hair;
      ctx.fillRect(x, mid - amp, bar, amp * 2);
    }

    if (progress >= 1) {
      ctx.fillStyle = signal;
      ctx.fillRect(flagX - 1, 0, 2, h);
    }
  }

  function animate() {
    var start = null, duration = 2200;
    function frame(ts) {
      if (start === null) start = ts;
      progress = Math.min(1, (ts - start) / duration);
      draw();
      if (progress < 1) requestAnimationFrame(frame);
      else showFlag();
    }
    requestAnimationFrame(frame);
  }

  var flag = document.getElementById("trace-flag");
  function showFlag() { if (flag) flag.style.visibility = "visible"; }

  if (canvas) {
    if (reduceMotion) { draw(); }
    else { if (flag) flag.style.visibility = "hidden"; draw(); animate(); }
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 100);
    });
    if (window.matchMedia) {
      var scheme = window.matchMedia("(prefers-color-scheme: dark)");
      if (scheme.addEventListener) scheme.addEventListener("change", draw);
    }
  }

  // Video gate: nothing downloads until the viewer chooses to watch.
  var cover = document.getElementById("gate-cover");
  var player = document.getElementById("gate-player");
  var video = document.getElementById("gate-video");
  var missing = document.getElementById("gate-missing");
  var showBtn = document.getElementById("gate-show");
  var hideBtn = document.getElementById("gate-hide");

  if (showBtn && video) {
    showBtn.addEventListener("click", function () {
      cover.hidden = true;
      player.hidden = false;
      missing.hidden = true;
      video.hidden = false;
      video.src = video.getAttribute("data-src");
      video.addEventListener("error", function onErr() {
        video.removeEventListener("error", onErr);
        video.hidden = true;
        missing.hidden = false;
      });
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      hideBtn.focus();
    });
    hideBtn.addEventListener("click", function () {
      video.pause();
      video.removeAttribute("src");
      video.load();
      player.hidden = true;
      cover.hidden = false;
      showBtn.focus();
    });
  }

  // Copy address.
  var copyBtn = document.getElementById("copy");
  var mail = document.getElementById("mail");
  var status = document.getElementById("copy-status");
  if (copyBtn && mail) {
    copyBtn.addEventListener("click", function () {
      var text = mail.textContent.trim();
      function selectFallback() {
        var range = document.createRange();
        range.selectNodeContents(mail);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        status.textContent = "Address selected. Press Ctrl+C or Cmd+C to copy.";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = "Copied.";
        }, selectFallback);
      } else {
        selectFallback();
      }
    });
  }
})();
