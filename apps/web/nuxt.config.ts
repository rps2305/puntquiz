export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // live app: SPA; the marketing site is a separate surface (spec §17)
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  // The service worker file itself must always be revalidated so updates roll out.
  routeRules: { '/sw.js': { headers: { 'cache-control': 'no-cache' } } },
  // Optional Matomo analytics: only active when both are set (NUXT_PUBLIC_MATOMO_URL, NUXT_PUBLIC_MATOMO_SITE_ID).
  runtimeConfig: { public: { appVersion: "0.2.0", matomoUrl: '', matomoSiteId: '' } },
  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
      title: 'PuntQuiz — Elke speler telt, ook in een team',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#FF5A38' },
        // iOS: open as a standalone app after "Add to Home Screen"
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'PuntQuiz' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', href: '/icons/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=IBM+Plex+Mono:wght@500;600&family=Manrope:wght@400;600;800&display=swap',
        },
      ],
    },
  },
})
