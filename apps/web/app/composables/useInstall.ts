// "Add to home screen": Android/desktop Chrome offers a real install prompt; iOS Safari only has the Share menu, so we explain it.
export function useInstall() {
  const deferred = useState<any>('pwa-prompt', () => null)
  const installed = useState('pwa-installed', () => false)
  const isIos = useState('pwa-ios', () => false)
  const standalone = useState('pwa-standalone', () => false)

  onMounted(() => {
    const ua = navigator.userAgent
    isIos.value = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    standalone.value = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    window.addEventListener('beforeinstallprompt', (e: Event) => { e.preventDefault(); deferred.value = e })
    window.addEventListener('appinstalled', () => { installed.value = true; deferred.value = null })
  })

  const canPrompt = computed(() => !!deferred.value && !installed.value && !standalone.value)
  const showIosHelp = computed(() => isIos.value && !standalone.value && !installed.value)
  async function prompt() {
    if (!deferred.value) return
    deferred.value.prompt()
    await deferred.value.userChoice.catch(() => null)
    deferred.value = null
  }
  return { canPrompt, showIosHelp, prompt }
}
