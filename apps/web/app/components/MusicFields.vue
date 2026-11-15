<template>
  <!-- eslint-disable vue/no-mutating-props -- `cfg` is the editor form's own reactive object, edited in place on purpose -->
  <div class="stack">
    <div class="row" style="align-items: flex-start">
      <div class="grow"><label>Artiest — geaccepteerd (één per regel)</label><textarea v-model="cfg.artist" rows="2" placeholder="The Beatles&#10;Beatles" /></div>
      <div class="grow"><label>Titel — geaccepteerd (één per regel)</label><textarea v-model="cfg.title" rows="2" placeholder="Yesterday" /></div>
    </div>
    <div class="row">
      <label style="margin: 0">Jaar (optioneel bonus) <input v-model="cfg.year" type="number" min="1900" max="2100" style="width: 110px" /></label>
      <label style="margin: 0">Punten artiest <input v-model.number="cfg.artistPoints" type="number" min="0" step="0.5" style="width: 90px" /></label>
      <label style="margin: 0">Punten titel <input v-model.number="cfg.titlePoints" type="number" min="0" step="0.5" style="width: 90px" /></label>
      <label v-if="cfg.year" style="margin: 0">Punten jaar <input v-model.number="cfg.yearPoints" type="number" min="0" step="0.5" style="width: 90px" /></label>
    </div>
    <p class="muted" style="margin: 0">Artiest, titel en jaar worden los van elkaar gescoord (ook halve punten). Hoofdletters, accenten, lidwoorden en kleine tikfouten tellen niet mee.</p>
  </div>
</template>
<script setup lang="ts">
defineProps<{ cfg: any }>()
</script>
