<template>
  <div class="stack">
    <div v-for="(m, i) in model" :key="i" class="card stack" style="background: var(--surface); margin: 0">
      <div class="row">
        <strong class="grow">{{ label[m.kind] }}</strong>
        <button class="danger small" type="button" @click="model.splice(i, 1)">Verwijder</button>
      </div>
      <template v-if="m.kind === 'youtube'">
        <input v-model="m.url" placeholder="YouTube-link, bv. https://youtu.be/…" :aria-label="`YouTube-link ${i + 1}`" />
        <YoutubeRange v-model:start="m.start" v-model:end="m.end" :url="m.url" />
      </template>
      <template v-else>
        <div class="row">
          <label class="btn ghost small" style="cursor: pointer; margin: 0">
            {{ m.assetId ? 'Ander bestand' : 'Bestand uploaden' }}
            <input type="file" class="sr-only" :accept="m.kind === 'image' ? 'image/png,image/jpeg,image/gif,image/webp' : 'audio/mpeg,audio/ogg,audio/mp4,audio/wav,.mp3,.ogg,.m4a,.wav'" @change="upload($event, m)" />
          </label>
          <span v-if="m._name" class="muted">{{ m._name }}</span>
          <span v-if="m._busy" class="muted">uploaden…</span>
        </div>
        <input v-if="!m.assetId" v-model="m.url" placeholder="…of een https-link naar het bestand" :aria-label="`Link ${i + 1}`" />
        <img v-if="m.kind === 'image' && (m.src || m.url)" :src="m.src || m.url" alt="Voorbeeld" style="max-width: 200px; max-height: 140px; border-radius: 8px" />
        <audio v-else-if="m.kind === 'audio' && (m.src || m.url)" :src="m.src || m.url" controls preload="none" style="width: 100%" />
      </template>
      <label style="margin: 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
        <input v-model="m.players" type="checkbox" style="width: 22px; min-height: 22px" />
        Ook tonen/afspelen op de telefoons van spelers
        <span v-if="m.kind === 'audio'" class="muted" style="font-weight: 400">(uit = alleen de presentator speelt het af)</span>
      </label>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <div v-if="model.length < 3" class="row">
      <button class="ghost small" type="button" @click="add('image')">+ Afbeelding</button>
      <button class="ghost small" type="button" @click="add('audio')">+ Audio</button>
      <button class="ghost small" type="button" @click="add('youtube')">+ YouTube</button>
    </div>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ modelValue: any[] }>()
const emit = defineEmits<{ 'update:modelValue': [any[]] }>()
const model = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const label: Record<string, string> = { image: 'Afbeelding', audio: 'Audio', youtube: 'YouTube-video' }
const error = ref('')

function add(kind: string) {
  model.value.push({ kind, players: kind !== 'audio', url: '', start: undefined, end: undefined })
}

const toBase64 = (bytes: Uint8Array) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Photos from phones are huge: downscale to 1600px JPEG before uploading (keeps projector + mobile fast). */
async function prepare(file: File): Promise<Uint8Array> {
  if (file.type.startsWith('image/') && file.type !== 'image/gif') {
    try {
      const bmp = await createImageBitmap(file)
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
      if (scale < 1 || file.size > 1_500_000) {
        const c = document.createElement('canvas')
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
        c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
        const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.85))
        return new Uint8Array(await blob.arrayBuffer())
      }
    } catch { /* fall back to the original bytes */ }
  }
  return new Uint8Array(await file.arrayBuffer())
}

async function upload(e: Event, m: any) {
  error.value = ''
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  m._busy = true
  try {
    const bytes = await prepare(file)
    const r = await api('/media', { method: 'POST', body: { name: file.name, data: toBase64(bytes) } })
    if (r.kind !== m.kind) throw new Error(m.kind === 'image' ? 'Dit is geen afbeelding.' : 'Dit is geen audiobestand.')
    m.assetId = r.id; m.src = r.url; m.url = ''; m._name = file.name
  } catch (er: any) { error.value = er.message }
  finally { m._busy = false; (e.target as HTMLInputElement).value = '' }
}
</script>
