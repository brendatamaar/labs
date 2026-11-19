interface Env {
  ASSETS: Fetcher
}

const PORTFOLIO_LABS = 'https://brendatama.dev/labs'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Index lives in the portfolio (rendered from the CMS).
    if (url.pathname === '/') return Response.redirect(PORTFOLIO_LABS, 302)

    const res = await env.ASSETS.fetch(request)
    // Unknown deep paths come back as 404, or as a 307 to a trailing-slash dir that doesn't exist.
    if (res.status !== 404 && res.status !== 307) return res

    // SPA fallback inside an app: /<slug>/some/route -> /<slug>/index.html
    const [, slug, ...rest] = url.pathname.split('/')
    const last = rest[rest.length - 1] ?? ''
    if (slug && rest.length >= 1 && last !== '' && !last.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL(`/${slug}/`, url), request))
    }
    return res
  },
}
