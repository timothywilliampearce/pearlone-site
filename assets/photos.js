(function () {
  var gallery = document.getElementById('gallery');
  var chips = document.querySelectorAll('.chip');
  var viewer = document.getElementById('viewer');
  var img = document.getElementById('viewer-img');
  var cap = document.getElementById('viewer-caption');
  var count = document.getElementById('viewer-count');
  var current = 0;
  var opener = null;

  function visible() {
    return Array.prototype.filter.call(document.querySelectorAll('.shot-open'), function (b) {
      var fig = b.closest('figure');
      return !(fig && fig.hidden);
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      gallery.querySelectorAll('.shot').forEach(function (fig) {
        var cats = (fig.getAttribute('data-cats') || '').split(' ');
        fig.hidden = !(f === 'all' || cats.indexOf(f) !== -1);
      });
    });
  });

  function show(i) {
    var list = visible();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    var b = list[current];
    img.style.opacity = '0';
    img.onload = function () { img.style.opacity = '1'; };
    img.src = b.getAttribute('data-full');
    img.width = +b.getAttribute('data-w');
    img.height = +b.getAttribute('data-h');
    img.alt = b.getAttribute('data-caption');
    cap.textContent = b.getAttribute('data-caption');
    count.textContent = (current + 1) + ' of ' + list.length;
    var next = list[(current + 1) % list.length];
    if (next) { var pre = new Image(); pre.src = next.getAttribute('data-full'); }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.shot-open');
    if (!b) return;
    opener = b;
    show(visible().indexOf(b));
    if (typeof viewer.showModal === 'function') viewer.showModal();
    else window.open(b.getAttribute('data-full'), '_blank');
  });

  document.getElementById('viewer-prev').addEventListener('click', function () { show(current - 1); });
  document.getElementById('viewer-next').addEventListener('click', function () { show(current + 1); });
  document.getElementById('viewer-close').addEventListener('click', function () { viewer.close(); });
  viewer.addEventListener('close', function () { img.removeAttribute('src'); if (opener) opener.focus(); });
  viewer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
  });
  var swiped = false;
  viewer.addEventListener('click', function (e) {
    if (swiped) { swiped = false; return; }
    if (e.target === viewer || e.target.classList.contains('viewer-frame')) viewer.close();
  });

  var startX = null;
  viewer.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  viewer.addEventListener('pointerup', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) { swiped = true; show(current + (dx < 0 ? 1 : -1)); }
  });
})();
