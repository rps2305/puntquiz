<script setup lang="ts">
/**
 * Visual start/end picker for a YouTube fragment: watch the video, drag the two handles (or press "Begin = nu" /
 * "Einde = nu" while it plays) and preview just the fragment. Uses the privacy-enhanced domain; the YouTube player
 * script is only loaded when this editor is opened.
 */
const props = defineProps<{ url: string; start?: number; end?: number }>()
const emit = defineEmits<{ 'update:start': [number | undefined]; 'update:end': [number | undefined] }>()

interface YTPlayer { getDuration(): number; getCurrentTime(): number; seekTo(s: number, allow: boolean): void; playVideo(): void; pauseVideo(): void; destroy(): void; getPlayerState(): number }
const w = window as unknown as { YT?: { Player: new (el: HTMLElement, o: unknown) => YTPlayer }; onYouTubeIframeAPIReady?: () => void; __ytApi?: Promise<void> }

function loadApi(): Promise<void> {
  if (w.YT?.Player) return Promise.resolve()
  if (!w.__ytApi) {
    w.__ytApi = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => { prev?.(); resolve() }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return w.__ytApi
}

const videoId = computed(() => {
  const u = props.url.trim()
  const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) ?? u.match(/^([A-Za-z0-9_-]{11})$/)
  return m?.[1] ?? ''
})

const host = ref<HTMLElement | null>(null)
let player: YTPlayer | null = null
let timer: ReturnType<typeof setInterval> | undefined
const duration = ref(0)
const current = ref(0)
const ready = ref(false)
const previewing = ref(false)

const s = computed(() => props.start ?? 0)
const e = computed(() => (props.end && props.end > 0 ? props.end : duration.value))
const pct = (v: number) => (duration.value ? Math.min(100, Math.max(0, (v / duration.value) * 100)) : 0)
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

function setStart(v: number) {
  const x = Math.max(0, Math.min(Math.round(v), (e.value || duration.value) - 1))
  emit('update:start', x > 0 ? x : undefined)
}
function setEnd(v: number) {
  const x = Math.min(duration.value, Math.max(Math.round(v), s.value + 1))
  emit('update:end', duration.value && x >= duration.value ? undefined : x)
}
function startNow() { if (player) setStart(player.getCurrentTime()) }
function endNow() { if (player) setEnd(player.getCurrentTime()) }
function clear() { emit('update:start', undefined); emit('update:end', undefined) }
function seek(v: number) { player?.seekTo(v, true) }

function preview() {
  if (!player) return
  previewing.value = true
  player.seekTo(s.value, true)
  player.playVideo()
}
function stop() { previewing.value = false; player?.pauseVideo() }

async function create() {
  destroy()
  if (!videoId.value) return
  await loadApi()
  await nextTick()
  if (!host.value || !w.YT) return
  const mount = document.createElement('div')
  host.value.innerHTML = ''
  host.value.appendChild(mount)
  player = new w.YT.Player(mount, {
    videoId: videoId.value,
    host: 'https://www.youtube-nocookie.com',
    width: '100%',
    height: '100%',
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: () => { duration.value = Math.floor(player!.getDuration()); ready.value = true },
    },
  })
  timer = setInterval(() => {
    if (!player || !ready.value) return
    if (!duration.value) duration.value = Math.floor(player.getDuration())
    current.value = player.getCurrentTime()
    if (previewing.value && props.end && current.value >= props.end) stop()
  }, 200)
}
function destroy() {
  if (timer) clearInterval(timer)
  try { player?.destroy() } catch { /* the iframe may already be gone */ }
  player = null; ready.value = false; duration.value = 0; current.value = 0; previewing.value = false
}
watch(videoId, create)
onMounted(create)
onBeforeUnmount(destroy)
</script>

<template>
  <div class="yr stack">
    <p v-if="!videoId" class="muted" style="margin: 0">Plak hierboven een YouTube-link om het fragment te kiezen.</p>
    <template v-else>
      <div ref="host" class="yr-player" />
      <p v-if="!ready" class="muted" style="margin: 0">Video laden…</p>
      <template v-else>
        <div class="yr-time"><span>Nu {{ fmt(current) }}</span><span>Begin {{ fmt(s) }} · Einde {{ fmt(e) }} · duur {{ fmt(Math.max(0, e - s)) }}</span><span>{{ fmt(duration) }}</span></div>
        <div class="yr-track" aria-label="Fragment kiezen">
          <div class="yr-bar" />
          <div class="yr-sel" :style="{ left: pct(s) + '%', width: pct(e) - pct(s) + '%' }" />
          <div class="yr-head" :style="{ left: pct(current) + '%' }" />
          <input type="range" class="yr-rng" min="0" :max="duration" step="1" :value="s" aria-label="Begin van het fragment" @input="setStart(+($event.target as HTMLInputElement).value)" @change="seek(s)" />
          <input type="range" class="yr-rng" min="0" :max="duration" step="1" :value="e" aria-label="Einde van het fragment" @input="setEnd(+($event.target as HTMLInputElement).value)" @change="seek(Math.max(0, e - 3))" />
        </div>
        <div class="row">
          <button type="button" class="small" @click="previewing ? stop() : preview()">{{ previewing ? '⏸ Stop' : '▶ Speel fragment' }}</button>
          <button type="button" class="ghost small" @click="startNow">Begin = nu</button>
          <button type="button" class="ghost small" @click="endNow">Einde = nu</button>
          <button type="button" class="ghost small" @click="clear">Hele video</button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.yr-player { width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: var(--r-md); overflow: hidden; }
.yr-player :deep(iframe) { width: 100%; height: 100%; border: 0; display: block; }
.yr-time { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-family: var(--font-mono); font-size: .8rem; color: var(--ink-muted); }
.yr-track { position: relative; height: 40px; }
.yr-bar { position: absolute; left: 0; right: 0; top: 17px; height: 6px; border-radius: 99px; background: var(--surface-3); }
.yr-sel { position: absolute; top: 17px; height: 6px; border-radius: 99px; background: var(--accent); }
.yr-head { position: absolute; top: 8px; width: 2px; height: 24px; background: var(--ink); opacity: .7; pointer-events: none; }
.yr-rng { position: absolute; left: 0; width: 100%; top: 0; height: 40px; margin: 0; min-height: 0; padding: 0; background: none; border: 0; pointer-events: none; -webkit-appearance: none; appearance: none; }
.yr-rng::-webkit-slider-runnable-track { background: none; height: 40px; }
.yr-rng::-moz-range-track { background: none; height: 40px; }
.yr-rng::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 22px; height: 30px; margin-top: 5px; border-radius: 8px; background: var(--accent-2); border: 2px solid var(--ink); cursor: ew-resize; }
.yr-rng::-moz-range-thumb { pointer-events: auto; width: 18px; height: 26px; border-radius: 8px; background: var(--accent-2); border: 2px solid var(--ink); cursor: ew-resize; }
</style>
