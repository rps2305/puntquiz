/**
 * Optional Matomo analytics (self-hosted). Off unless a Matomo URL and site id are configured.
 * Cookieless (no consent banner needed), honours Do Not Track, and never sends quiz codes, quiz ids or query strings:
 * those parts of the URL are replaced by a generic path before a page view is counted.
 */
function cleanPath(path: string): string {
  return path
    .split(/[?#]/)[0]!
    .replace(/^\/play\/[^/]+/, '/play')
    .replace(/^\/host\/[^/]+/, '/host')
    .replace(/^\/print\/[^/]+/, '/print')
    .replace(/^\/quizzes\/[^/]+/, '/quizzes/bewerken')
}

export default defineNuxtPlugin((nuxtApp) => {
  const cfg = useRuntimeConfig().public
  const base = String(cfg.matomoUrl ?? '').trim()
  const siteId = String(cfg.matomoSiteId ?? '').trim()
  if (!base || !siteId) return

  const url = base.endsWith('/') ? base : `${base}/`
  const w = window as unknown as { _paq?: unknown[][] }
  const paq = (w._paq = w._paq || [])
  paq.push(['disableCookies'])
  paq.push(['setDoNotTrack', true])
  paq.push(['setTrackerUrl', `${url}matomo.php`])
  paq.push(['setSiteId', siteId])
  const s = document.createElement('script')
  s.async = true
  s.src = `${url}matomo.js`
  document.head.appendChild(s)

  const track = (path: string) => {
    paq.push(['setCustomUrl', `${location.origin}${cleanPath(path)}`])
    paq.push(['setDocumentTitle', cleanPath(path)])
    paq.push(['trackPageView'])
  }
  // The first page view happens after the initial route resolves; later ones on every navigation.
  nuxtApp.hook('page:finish', () => track(useRoute().path))
})
