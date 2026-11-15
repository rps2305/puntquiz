export type HostApproval = 'required' | 'open'

/** `required` (default): only approved users and admins may host. `open`: every registered user may (handy locally, and for self-hosters who want it). */
export const HOST_APPROVAL: HostApproval = process.env.HOST_APPROVAL === 'open' ? 'open' : 'required'

export function mayHost(u: { isGuest: boolean; isAdmin: boolean; canHost: boolean }, mode: HostApproval = HOST_APPROVAL): boolean {
  if (u.isGuest) return false
  return u.isAdmin || u.canHost || mode === 'open'
}

/**
 * `true` (default): presenters share one question bank (they are all approved by an admin). `false`: every user has their own
 * bank (used by tests/e2e.mjs, where fresh users need an empty bank).
 */
export const BANK_SHARED = process.env.BANK_SHARED !== 'false'
