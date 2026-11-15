<script setup lang="ts">
const props = defineProps<{ quizId: string; tick: number }>()

const { messages, error, busy, load, send } = useChat(() => props.quizId)
const open = ref(false)
const text = ref('')
const seen = ref(0) // count of presenter messages already seen
const list = ref<HTMLElement | null>(null)

const fromHost = computed(() => messages.value.filter((m) => m.fromHost))
const unread = computed(() => (open.value ? 0 : Math.max(0, fromHost.value.length - seen.value)))

watch(() => props.tick, load)
watch(() => props.quizId, (v) => v && load(), { immediate: true })
watch(open, async (o) => {
  if (!o) return
  await load()
  seen.value = fromHost.value.length
  await nextTick()
  list.value?.scrollTo({ top: list.value.scrollHeight })
})
watch(messages, async () => {
  if (open.value) {
    seen.value = fromHost.value.length
    await nextTick()
    list.value?.scrollTo({ top: list.value.scrollHeight })
  }
})
let poll: ReturnType<typeof setInterval> | undefined
onMounted(() => { poll = setInterval(load, 30000) }) // safety net; sockets normally nudge us
onBeforeUnmount(() => poll && clearInterval(poll))

async function submit() {
  const t = text.value.trim()
  if (!t || busy.value) return
  if (await send(t)) text.value = ''
}
</script>

<template>
  <div class="chat">
    <section v-if="open" class="chat-panel" role="dialog" aria-label="Chat met de presentator">
      <header class="chat-head">
        <strong>Bericht aan de presentator</strong>
        <button type="button" class="ghost small" aria-label="Sluiten" @click="open = false">✕</button>
      </header>
      <div ref="list" class="chat-list" aria-live="polite">
        <p v-if="!messages.length" class="muted" style="margin: 0">Heb je een vraag of opmerking? Stuur de presentator een bericht. Anderen zien het niet.</p>
        <div v-for="m in messages" :key="m.id" class="msg" :class="{ mine: m.mine, host: m.fromHost }">
          <span class="who">{{ m.mine ? 'Jij' : m.from }}<template v-if="m.fromHost"> · {{ m.to ? 'aan jou' : 'aan iedereen' }}</template></span>
          <span class="txt">{{ m.text }}</span>
        </div>
      </div>
      <p v-if="error" class="err" role="alert" style="margin: 0 12px 8px">{{ error }}</p>
      <form class="chat-form" @submit.prevent="submit">
        <label for="chat-in" class="sr-only">Je bericht</label>
        <input id="chat-in" v-model="text" maxlength="300" placeholder="Typ een bericht…" autocomplete="off" />
        <button :disabled="busy || !text.trim()">Verstuur</button>
      </form>
    </section>
    <button type="button" class="chat-fab" :aria-expanded="open" aria-label="Chat met de presentator" @click="open = !open">
      💬<span v-if="unread" class="badge" aria-label="nieuwe berichten">{{ unread }}</span>
    </button>
  </div>
</template>

<style scoped>
.chat { position: fixed; right: 14px; bottom: 14px; z-index: 40; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; max-width: calc(100vw - 28px); }
.chat-fab { position: relative; width: 56px; height: 56px; min-height: 56px; padding: 0; border-radius: 50%; font-size: 1.5rem; box-shadow: 0 4px 14px rgba(0, 0, 0, .25); }
.badge { position: absolute; top: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 99px; background: var(--danger); color: #fff; font-size: .8rem; font-weight: 800; display: grid; place-items: center; }
.chat-panel { width: min(360px, calc(100vw - 28px)); max-height: min(70dvh, 520px); display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: 0 8px 28px rgba(0, 0, 0, .3); overflow: hidden; }
.chat-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.chat-list { flex: 1 1 auto; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.msg { display: flex; flex-direction: column; gap: 2px; max-width: 88%; align-self: flex-start; background: var(--surface-2); border-radius: var(--r-md); padding: 8px 10px; }
.msg.mine { align-self: flex-end; background: var(--accent-2); color: var(--accent-2-ink); }
.msg.host { border: 2px solid var(--accent); }
.who { font-size: .75rem; font-weight: 800; opacity: .8; }
.txt { overflow-wrap: anywhere; }
.chat-form { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border); }
.chat-form input { min-width: 0; }
</style>
