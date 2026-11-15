export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message)
  }
}

/** Same-origin REST client; Traefik routes /api to the NestJS backend. */
export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  try {
    return await $fetch<T>(`/api${path}`, { method: (opts.method as any) ?? 'GET', body: opts.body, credentials: 'include' })
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode ?? 0
    const data = e?.data
    const m = data?.message
    throw new ApiError(Array.isArray(m) ? m.join(', ') : typeof m === 'string' ? m : status ? `Fout ${status}` : 'Geen verbinding', status, data)
  }
}
