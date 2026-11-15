<template>
  <main class="wrap stack">
    <template v-if="page">
      <article class="card stack prose">
        <h1>{{ page.title }}</h1>
        <p v-if="page.concept" class="info" role="note">
          Hobbyproject: deze tekst is in goed vertrouwen opgesteld en niet juridisch beoordeeld.
        </p>
        <p v-if="page.intro" class="muted"><Prose :text="page.intro" /></p>
        <section v-for="(s, i) in page.sections" :key="i">
          <h2 v-if="s.h">{{ s.h }}</h2>
          <p v-for="(p, j) in s.p" :key="j"><Prose :text="p" /></p>
          <ul v-if="s.ul"><li v-for="(li, j) in s.ul" :key="j"><Prose :text="li" /></li></ul>
        </section>
        <div v-if="page.table" style="overflow-x: auto">
          <table class="board">
            <thead><tr><th v-for="h in page.table.head" :key="h" style="text-align: left; padding: 8px">{{ h }}</th></tr></thead>
            <tbody><tr v-for="r in page.table.rows" :key="r[0]"><td v-for="(c, i) in r" :key="i" :style="i === 0 ? 'font-weight: 800' : ''" style="vertical-align: top">{{ c }}</td></tr></tbody>
          </table>
        </div>
        <section v-for="(s, i) in page.after" :key="'a' + i">
          <h2 v-if="s.h">{{ s.h }}</h2>
          <ul v-if="s.ul"><li v-for="(li, j) in s.ul" :key="j"><Prose :text="li" /></li></ul>
        </section>
      </article>
      <PhotoAlbum v-if="route.params.slug === 'spelregels'" class="card" :shots="ALBUM" />
      <NuxtLink to="/about">← Over PuntQuiz &amp; hulp</NuxtLink>
    </template>
    <div v-else class="card"><h1>Pagina niet gevonden</h1><NuxtLink to="/about">Naar Over &amp; hulp</NuxtLink></div>
  </main>
</template>
<script setup lang="ts">
import { INFO } from '~/content/pages'

const ALBUM = [
  { file: 'meerkeuze', title: 'Meerkeuze', text: 'Kies één antwoord. Bovenaan staan de power-ups en de timer; je antwoord kun je wijzigen tot de vraag sluit.' },
  { file: 'waar-onwaar', title: 'Waar of onwaar', text: 'Een meerkeuzevraag met twee opties.' },
  { file: 'meerdere-antwoorden', title: 'Meerdere antwoorden', text: 'Vink alle juiste opties aan; ze moeten er allemaal bij zitten.' },
  { file: 'foto-vraag', title: 'Vraag met foto', text: 'Bij een vraag kan een afbeelding of video staan.' },
  { file: 'open-vraag', title: 'Open vraag', text: 'Typ zelf je antwoord. Een exact goed antwoord is meteen goed; de rest wordt door een ander beoordeeld.' },
  { file: 'muziek', title: 'Muziekvraag', text: 'Vul artiest, titel en eventueel het jaar in. Elk onderdeel scoort apart.' },
  { file: 'beeldronde', title: 'Beeldronde', text: 'Alle foto’s en vragen staan onder de gewone vraag en blijven open tijdens de volgende ronde(s).' },
  { file: 'beoordelen', title: 'Beoordelen', text: 'Beoordeel anoniem het antwoord van een ander: alleen goed of fout.' },
  { file: 'uitslag-vraag', title: 'Uitslag van een vraag', text: 'Het goede antwoord, hoeveel mensen wat kozen en of jij het goed had.' },
  { file: 'uitslag-muziek', title: 'Uitslag muziekvraag', text: 'Per onderdeel zie je wat goed was, met je punten.' },
  { file: 'tussenstand', title: 'Tussenstand', text: 'De ranglijst halverwege. Jouw rij staat geel gemarkeerd; gelijke scores delen een plek.' },
  { file: 'eindstand', title: 'Eindstand', text: 'De uitslag na de laatste vraag.' },
  { file: 'presentator', title: 'Scherm van de presentator', text: 'Zo bedient de presentator de quiz: vraag sluiten, overslaan, onthullen en de tussenstand tonen.' },
]
const route = useRoute()
const page = computed(() => INFO[String(route.params.slug)] ?? null)
useHead(() => ({ title: page.value ? `${page.value.title} — PuntQuiz` : 'PuntQuiz' }))
</script>
