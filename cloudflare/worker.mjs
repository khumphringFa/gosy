export default {
  async fetch(request, env) {
    if (!env.ORIGIN_URL) return new Response('GoSy origin is not configured', { status: 503 })
    let origin
    try {
      origin = new URL(env.ORIGIN_URL)
      if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.run.app') || origin.username || origin.password || origin.port || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('invalid origin')
    } catch {
      return new Response('Invalid GoSy origin configuration', { status: 503 })
    }
    const publicURL = new URL(request.url)
    const target = new URL(origin)
    target.pathname = publicURL.pathname
    target.search = publicURL.search
    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('x-forwarded-host', publicURL.host)
    headers.set('x-forwarded-proto', 'https')
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
      cf: { cacheEverything: false, cacheTtl: 0 },
    })
    const response = new Response(upstream.body, upstream)
    const location = response.headers.get('location')
    if (location) {
      const redirect = new URL(location, target)
      if (redirect.origin === origin.origin) {
        redirect.protocol = publicURL.protocol
        redirect.host = publicURL.host
        response.headers.set('location', redirect.href)
      }
    }
    return response
  },
}
