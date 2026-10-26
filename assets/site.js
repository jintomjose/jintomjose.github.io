// Theme toggle shared by every page: follows the system setting until the visitor picks one.
// (The pre-paint theme bootstrap stays inline in each page's <head> to avoid a flash.)
(function() {
  var root = document.documentElement, btn = document.getElementById('theme');
  if (!btn) return;
  var mq = matchMedia('(prefers-color-scheme: dark)');
  function label() { btn.setAttribute('aria-label', root.getAttribute('data-theme') === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); }
  function stored() { try { var t = localStorage.getItem('jj-theme'); return t === 'light' || t === 'dark' ? t : null; } catch (e) { return null; } }
  btn.addEventListener('click', function() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('jj-theme', next); } catch (e) {}
    label();
  });
  mq.addEventListener('change', function(e) {
    if (!stored()) { root.setAttribute('data-theme', e.matches ? 'dark' : 'light'); label(); }
  });
  label();
})();
