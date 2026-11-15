import type { PowerUpType } from '@puntquiz/contracts'

export const POWER_UP_ORDER: PowerUpType[] = ['FIFTY', 'DOUBLE', 'DOUBLE_DOWN', 'EXTRA_TIME', 'HINT']

export const POWER_LABEL: Record<PowerUpType, { icon: string; name: string; help: string }> = {
  FIFTY: { icon: '✂️', name: '50/50', help: 'Haalt twee foute opties weg (alleen bij meerkeuze met 3+ opties).' },
  DOUBLE: { icon: '✖️2', name: 'Verdubbelaar', help: 'Goed = dubbele punten. Fout kost niets.' },
  DOUBLE_DOWN: { icon: '🎲', name: 'Dubbel risico', help: 'Goed = dubbele punten. Fout = je verliest de helft van de vraagpunten.' },
  EXTRA_TIME: { icon: '⏱️', name: 'Extra tijd', help: 'Je krijgt 15 seconden extra om te antwoorden.' },
  HINT: { icon: '💡', name: 'Hint', help: 'Toont een aanwijzing van de quizmaster.' },
}
