/* Shared labs chrome. Include in <head> of an app (blocking, so the saved theme applies before
   first paint):  <script src="https://labs.brendatama.dev/_shared/labs-header.js"></script>
   and put <div data-labs-header></div> where the header should go.
   Theme choice is stored under the same key as the index page, so it carries across all labs apps. */
;(function () {
  var KEY = 'ka-theme'
  var HOME = 'https://labs.brendatama.dev/'
  var root = document.documentElement

  try {
    var saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved
  } catch (e) {}

  var mq = matchMedia('(prefers-color-scheme: light)')
  var current = function () {
    return root.dataset.theme || (mq.matches ? 'light' : 'dark')
  }

  var HTML =
    '<header class="site-header">' +
    '<a class="icon-btn home" href="' + HOME + '" aria-label="Labs, back to the index">' +
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' +
    '<span class="nav-link back-label">Labs</span></a>' +
    '<nav class="site-nav" aria-label="Site">' +
    '<button type="button" class="icon-btn theme" data-labs-theme>' +
    '<svg class="sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>' +
    '<svg class="moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z"/></svg>' +
    '</button></nav></header>'

  function mount() {
    var slot = document.querySelector('[data-labs-header]')
    if (!slot) return
    slot.innerHTML = HTML
    var btn = slot.querySelector('[data-labs-theme]')
    var label = function () {
      btn.setAttribute('aria-label', 'Switch to ' + (current() === 'dark' ? 'light' : 'dark') + ' theme')
    }
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark'
      root.dataset.theme = next
      try { localStorage.setItem(KEY, next) } catch (e) {}
      label()
    })
    label()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
})()
