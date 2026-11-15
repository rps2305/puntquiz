import { describe, expect, it } from 'vitest'
import { mayHost } from './hosting'

const u = (o: Partial<{ isGuest: boolean; isAdmin: boolean; canHost: boolean }> = {}) => ({ isGuest: false, isAdmin: false, canHost: false, ...o })

describe('mayHost', () => {
  it('needs approval by default', () => {
    expect(mayHost(u(), 'required')).toBe(false)
    expect(mayHost(u({ canHost: true }), 'required')).toBe(true)
    expect(mayHost(u({ isAdmin: true }), 'required')).toBe(true)
  })
  it('guests never host, even when approval is off', () => {
    expect(mayHost(u({ isGuest: true, canHost: true, isAdmin: true }), 'open')).toBe(false)
  })
  it('open mode lets every registered user host', () => {
    expect(mayHost(u(), 'open')).toBe(true)
  })
})
