// Register the service worker in production only (a dev server must never be cached).
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* installability is best-effort */ })
  // The SPA may finish booting after the window "load" event: register immediately in that case.
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
})
