export type HostApproval = 'required' | 'open'

/** `required` (default): only approved users and admins may host. `open`: every registered user may (handy locally, and for self-hosters who want it). */
export const HOST_APPROVAL: HostApproval = process.env.HOST_APPROVAL === 'open' ? 'open' : 'required'

export function mayHost(u: { isGuest: boolean; isAdmin: boolean; canHost: boolean }, mode: HostApproval = HOST_APPROVAL): boolean {
  if (u.isGuest) return false
  return u.isAdmin || u.canHost || mode === 'open'
}
