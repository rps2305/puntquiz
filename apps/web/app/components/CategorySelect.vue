<script setup lang="ts">
/** Suggested categories; free text stays possible via "Anders…". */
const QUESTION_CATEGORIES = [
  'Algemeen', 'Topografie', 'Geschiedenis', 'Aardrijkskunde', 'Wetenschap', 'Natuur & dieren', 'Sport', 'Muziek',
  'Film & tv', 'Kunst & cultuur', 'Literatuur', 'Eten & drinken', 'Techniek & computers', 'Politiek & actualiteit',
  'Taal & spreekwoorden', 'Mythologie & religie', 'Reizen', 'Mode & lifestyle', 'Spelletjes', 'Lokaal / Nederland',
]

const props = defineProps<{ modelValue: string | null | undefined; extra?: string[]; label?: string; id?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const OTHER = '__other__'
const custom = ref(false)
const options = computed(() => {
  const set = new Set<string>([...QUESTION_CATEGORIES, ...(props.extra ?? [])])
  if (props.modelValue) set.add(props.modelValue) // keep imported/legacy values selectable
  return [...set].sort((a, b) => a.localeCompare(b, 'nl'))
})
const selected = computed({
  get: () => (custom.value ? OTHER : props.modelValue || ''),
  set: (v: string) => {
    if (v === OTHER) { custom.value = true; emit('update:modelValue', '') } else { custom.value = false; emit('update:modelValue', v) }
  },
})
</script>

<template>
  <div class="catsel">
    <select :id="id" v-model="selected" :aria-label="label ?? 'Categorie'">
      <option value="">Geen categorie</option>
      <option v-for="c in options" :key="c" :value="c">{{ c }}</option>
      <option :value="OTHER">Anders…</option>
    </select>
    <input v-if="custom" :value="modelValue ?? ''" placeholder="Eigen categorie" aria-label="Eigen categorie" style="margin-top: 6px" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </div>
</template>
