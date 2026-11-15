import type { UserDto } from '@puntquiz/contracts'

export function useAuth() {
  const user = useState<UserDto | null>('user', () => null)
  const loaded = useState('userLoaded', () => false)
  async function fetchMe() {
    try {
      user.value = await api<UserDto | null>('/auth/me')
    } catch {
      user.value = null
    }
    loaded.value = true
    return user.value
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    user.value = null
  }
  return { user, loaded, fetchMe, logout }
}
