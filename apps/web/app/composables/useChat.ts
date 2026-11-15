import type { ChatMessageDto } from '@puntquiz/contracts'

/** Chat with the presenter during a quiz. REST only; `tick` (from useLive) tells us when to refetch. */
export function useChat(getId: () => string, host = false) {
  const messages = ref<ChatMessageDto[]>([])
  const error = ref('')
  const busy = ref(false)

  async function load() {
    const id = getId()
    if (!id) return
    try {
      messages.value = (await api<{ messages: ChatMessageDto[] }>(`/live/${id}/chat${host ? '?host=1' : ''}`)).messages
      error.value = ''
    } catch (e: any) {
      error.value = e.message
    }
  }
  async function send(text: string, to?: string | null): Promise<boolean> {
    busy.value = true
    try {
      await api(`/live/${getId()}/chat`, { method: 'POST', body: { text, to: to ?? null } })
      error.value = ''
      await load()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      busy.value = false
    }
  }
  async function remove(msgId: string) {
    try { await api(`/live/${getId()}/chat/${msgId}`, { method: 'DELETE' }); await load() } catch (e: any) { error.value = e.message }
  }
  return { messages, error, busy, load, send, remove }
}
