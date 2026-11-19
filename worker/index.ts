interface Env {
  ASSETS: Fetcher
}

interface Lab {
  title: string
  summary: string
  resolvedDemoUrl: string
  status: 'live' | 'wip' | 'archived'
}

const HOME_URL = 'https://www.brendatama.dev'
const API_URL = 'https://api.brendatama.dev/api/labs'
const NAME = 'Brendatama Akbar Ramadan'

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

async function loadLabs(): Promise<Lab[]> {
  try {
    const res = await fetch(API_URL, {
      signal: AbortSignal.timeout(5000),
      cf: { cacheTtl: 60, cacheEverything: true },
    })
    if (!res.ok) return []
    return (await res.json()) as Lab[]
  } catch {
    return []
  }
}

const STATUS_NOTE: Record<Lab['status'], string> = {
  live: '',
  wip: 'in progress',
  archived: 'archived',
}

function renderIndex(labs: Lab[]): string {
  const rows = labs
    .map((l) => {
      const note = STATUS_NOTE[l.status]
      const v = [l.summary, note && `(${note})`].filter(Boolean).join(' ')
      return `<li><a class="row" href="${esc(l.resolvedDemoUrl)}" aria-label="${esc(l.title)}, ${esc(v)}"><span class="k">${esc(l.title)}</span><span class="leader" aria-hidden="true"></span><span class="v">${esc(v)}</span></a></li>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Labs | ${NAME}</title>
<meta name="description" content="Small experiments and side projects, each with a live demo.">
<link rel="canonical" href="https://labs.brendatama.dev/">
<meta name="theme-color" content="#131313" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<link rel="preload" as="font" type="font/woff2" href="/_shared/fonts/plus-jakarta-sans-latin-400-normal.woff2" crossorigin>
<link rel="icon" type="image/svg+xml" href="/_shared/favicon.svg">
<link rel="stylesheet" href="/_shared/folio.css">
<script>try{var t=localStorage.getItem('ka-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="col">
  <header class="site-header">
    <a class="icon-btn home" href="${HOME_URL}" aria-label="${NAME}, home">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>
    </a>
    <nav class="site-nav" aria-label="Site">
      <a class="nav-link" href="${HOME_URL}/blog">Writing</a>
      <a class="nav-link" href="/">Labs</a>
      <a class="nav-link" href="${HOME_URL}/Brendatama%20Akbar%20(2026)%20-%20English.pdf" download>Resume</a>
      <button type="button" id="theme" class="icon-btn theme" aria-label="Switch theme">
        <svg class="sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>
        <svg class="moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z"/></svg>
      </button>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <section aria-labelledby="h-labs">
      <h1 class="heading" id="h-labs">Labs</h1>
      <p class="lede">Small experiments, each with a live demo.</p>
      ${labs.length ? `<ul class="rows">${rows}</ul>` : '<p class="empty">No experiments yet.</p>'}
    </section>
  </main>
</div>
<footer class="site-footer">© ${new Date().getFullYear()} ${NAME} · <a href="${HOME_URL}">brendatama.dev</a></footer>
<script>
(function(){
  var root=document.documentElement,btn=document.getElementById('theme'),mq=matchMedia('(prefers-color-scheme: light)');
  var cur=function(){return root.dataset.theme||(mq.matches?'light':'dark')};
  var label=function(){btn.setAttribute('aria-label','Switch to '+(cur()==='dark'?'light':'dark')+' theme')};
  btn.addEventListener('click',function(){var n=cur()==='dark'?'light':'dark';root.dataset.theme=n;try{localStorage.setItem('ka-theme',n)}catch(e){}label()});
  label();
})();
</script>
</body>
</html>`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(renderIndex(await loadLabs()), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=60',
        },
      })
    }

    const res = await env.ASSETS.fetch(request)
    // Unknown deep paths come back as 404, or as a 307 to a trailing-slash dir that doesn't exist.
    if (res.status !== 404 && res.status !== 307) return res

    // SPA fallback inside an app: /<slug>/some/route -> /<slug>/
    const [, slug, ...rest] = url.pathname.split('/')
    const last = rest[rest.length - 1] ?? ''
    if (
      slug &&
      slug !== '_shared' &&
      rest.length >= 1 &&
      last !== '' &&
      !last.includes('.')
    ) {
      return env.ASSETS.fetch(new Request(new URL(`/${slug}/`, url), request))
    }
    return res
  },
}
