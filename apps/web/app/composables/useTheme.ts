export type ThemeChoice = 'system' | 'light' | 'dark'

export function applyTheme(c: ThemeChoice) {
  const dark = c === 'dark' || (c === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}
