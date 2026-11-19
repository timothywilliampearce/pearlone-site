(function () {
  "use strict";

  var D = window.PEARL_CASE_DATA || { summary: [], raw: [] };
  var BASE_MS = new Date("2026-10-02T16:20:58-04:00").getTime();
  var TOTAL = 95;
  var FLAG_T = 41.994;
  var ROT_MAX = 700, VAR_MAX = 2.5, RAW_RANGE = 4, RAW_WINDOW = 4;
  var EVENTS = [
    { t: 27, label: "Video movement", clock: "4:21:25 PM" },
    { t: 41.994, label: "Collar flag (replayed)", clock: "4:21:39.994 PM" },
    { t: 42.589, label: "Owner tap 1", clock: "4:21:40.589 PM" },
    { t: 55, label: "Second visible bout", clock: "4:21:53 PM" },
    { t: 63.012, label: "Owner tap 2", clock: "4:22:01.012 PM" },
    { t: 89.59, label: "Post-ictal mark", clock: "4:22:27.590 PM" }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var seek = $("seek"), playBtn = $("play"), clock = $("clock"), relative = $("relative");
  var video = $("case-video");
  var master = 0, timerPlaying = false, lastFrame = 0, revealed = false;

  function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function formatWall(seconds) {
    var v = new Date(BASE_MS + Math.round(seconds * 1000));
    var base = v.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
    var ms = String(v.getMilliseconds()).padStart(3, "0");
    return base.replace(/ (AM|PM)$/, "." + ms + " $1") + " EDT";
  }
  function formatElapsed(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }

  function canvas(id) {
    var node = $(id), rect = node.getBoundingClientRect(), dpi = window.devicePixelRatio || 1;
    node.width = Math.max(1, Math.round(rect.width * dpi));
    node.height = Math.max(1, Math.round(rect.height * dpi));
    var g = node.getContext("2d");
    g.setTransform(dpi, 0, 0, dpi, 0, 0);
    return { g: g, w: rect.width, h: rect.height };
  }
  function line(g, pts, color, width, dash) {
    if (!pts.length) return;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = color; g.lineWidth = width || 1.5;
    g.setLineDash(dash || []);
    g.stroke();
    g.setLineDash([]);
  }
  function grid(g, l, r, t, b) {
    var hair = token("--hair");
    for (var i = 0; i <= 4; i++) {
      var y = t + (b - t) * i / 4;
      line(g, [[l, y], [r, y]], hair, 1);
    }
  }
  function label(g, text, x, y, align) {
    g.fillStyle = token("--slate");
    g.font = "12px " + token("--face");
    g.textAlign = align || "left";
    g.fillText(text, x, y);
  }

  function drawMotion() {
    var c = canvas("motion"), g = c.g, w = c.w, h = c.h;
    var l = 8, r = w - 8, t = 10, b = h - 24;
    g.clearRect(0, 0, w, h);
    grid(g, l, r, t, b);
    var x = function (s) { return l + (r - l) * s / TOTAL; };
    var yR = function (v) { return b - (b - t) * Math.min(ROT_MAX, Math.max(0, v)) / ROT_MAX; };
    var yV = function (v) { return b - (b - t) * Math.min(VAR_MAX, Math.max(0, v)) / VAR_MAX; };
    line(g, [[x(FLAG_T), t], [x(FLAG_T), b]], token("--signal"), 2);
    line(g, D.summary.map(function (p) { return [x(p[0]), yR(p[1])]; }), token("--series-1"), 2);
    line(g, D.summary.map(function (p) { return [x(p[0]), yV(p[2])]; }), token("--series-2"), 1.6);
    line(g, [[x(master), t], [x(master), b]], token("--ink"), 1, [5, 4]);
    label(g, "0 s", l, h - 6);
    label(g, TOTAL + " s", r, h - 6, "right");
  }

  function drawRaw() {
    var c = canvas("raw"), g = c.g, w = c.w, h = c.h;
    var l = 8, r = w - 8, t = 10, b = h - 24;
    g.clearRect(0, 0, w, h);
    grid(g, l, r, t, b);
    var rows = D.raw.filter(function (p) { return Math.abs(p[0] - master) <= RAW_WINDOW; });
    var x = function (s) { return l + (r - l) * (s - (master - RAW_WINDOW)) / (RAW_WINDOW * 2); };
    var y = function (v) { return (t + b) / 2 - Math.max(-RAW_RANGE, Math.min(RAW_RANGE, v)) * (b - t) / (RAW_RANGE * 2); };
    var colors = [token("--series-1"), token("--series-2"), token("--series-3")];
    for (var k = 1; k <= 3; k++) {
      line(g, rows.map(function (p) { return [x(p[0]), y(p[k])]; }), colors[k - 1], 1.3);
    }
    line(g, [[(l + r) / 2, t], [(l + r) / 2, b]], token("--ink"), 1, [5, 4]);
    label(g, "−" + RAW_WINDOW + " s", l, h - 6);
    label(g, "+" + RAW_WINDOW + " s", r, h - 6, "right");
  }

  function render() {
    seek.value = master.toFixed(2);
    clock.textContent = formatWall(master);
    relative.textContent = "+" + master.toFixed(3) + " s / " + formatElapsed(TOTAL);
    drawMotion();
    drawRaw();
  }

  function videoActive() { return revealed && video && video.src; }

  function setMaster(value, fromVideo) {
    master = Math.max(0, Math.min(TOTAL, Number(value) || 0));
    if (!fromVideo && videoActive() && video.readyState >= 1 && Math.abs(video.currentTime - master) > 0.25) {
      video.currentTime = master;
    }
    render();
  }

  function setPlayLabel(on) { playBtn.textContent = on ? "Pause" : "Play"; }

  function pauseAll() {
    timerPlaying = false;
    if (videoActive() && !video.paused) video.pause();
    setPlayLabel(false);
  }

  playBtn.addEventListener("click", function () {
    if (videoActive()) {
      if (video.paused) {
        if (master >= TOTAL - 0.05) setMaster(0);
        var p = video.play(); if (p && p.catch) p.catch(function () {});
      } else {
        video.pause();
      }
      return;
    }
    if (timerPlaying) { pauseAll(); return; }
    if (master >= TOTAL - 0.05) setMaster(0);
    timerPlaying = true;
    setPlayLabel(true);
  });

  seek.addEventListener("input", function () { pauseAll(); setMaster(seek.value); });

  var eventList = $("events");
  EVENTS.forEach(function (e) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "event-button" + (e.t === FLAG_T ? " is-flag" : "");
    b.innerHTML = "<span>" + e.label + "</span><strong>" + e.clock + "</strong>";
    b.addEventListener("click", function () { pauseAll(); setMaster(e.t); });
    eventList.appendChild(b);
  });

  function frame(ts) {
    if (videoActive() && !video.paused) {
      setMaster(video.currentTime, true);
    } else if (timerPlaying) {
      if (!lastFrame) lastFrame = ts;
      master += (ts - lastFrame) / 1000;
      if (master >= TOTAL) { master = TOTAL; pauseAll(); }
      render();
    }
    lastFrame = ts;
    requestAnimationFrame(frame);
  }

  // Video gate: nothing downloads until the viewer chooses to watch.
  var cover = $("gate-cover"), player = $("gate-player"), missing = $("gate-missing");
  $("gate-show").addEventListener("click", function () {
    var wasPlaying = timerPlaying;
    timerPlaying = false;
    revealed = true;
    cover.hidden = true; player.hidden = false; missing.hidden = true; video.hidden = false;
    video.preload = "auto";
    video.addEventListener("loadedmetadata", function onMeta() {
      video.removeEventListener("loadedmetadata", onMeta);
      video.currentTime = master;
      if (wasPlaying) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    });
    video.src = video.getAttribute("data-src");
    $("gate-hide").focus();
  });
  video.addEventListener("error", function () { if (revealed) { video.hidden = true; missing.hidden = false; } });
  video.addEventListener("play", function () { setPlayLabel(true); });
  video.addEventListener("pause", function () { setPlayLabel(false); });
  video.addEventListener("ended", function () { setPlayLabel(false); });
  $("gate-hide").addEventListener("click", function () {
    video.pause();
    revealed = false;
    video.removeAttribute("src");
    video.load();
    player.hidden = true; cover.hidden = false;
    setPlayLabel(false);
    $("gate-show").focus();
  });

  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 80); });
  if (window.matchMedia) {
    var scheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (scheme.addEventListener) scheme.addEventListener("change", render);
  }
  render();
  requestAnimationFrame(frame);
})();
