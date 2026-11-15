<template>
  <div class="card">
    <h3>Spelregels van deze quiz</h3>
    <ul>
      <li v-if="quiz.mode === 'INDIVIDUAL'">Individuele quiz: jouw eigen score telt.</li>
      <template v-else>
        <li>Teamquiz: iedereen speelt zelf mee op de eigen telefoon; het team scoort via de meerderheid van de antwoorden.</li>
        <li>Een team heeft minimaal {{ quiz.minTeamSize }} en maximaal {{ quiz.maxTeamSize }} spelers.</li>
        <li>Teams kiezen kan alleen in de lobby: zodra de quiz start staan de teams vast.</li>
        <li>Bij gelijke stemmen wint het antwoord dat het eerst definitief is gekozen. Wie niet antwoordt telt niet mee.</li>
      </template>
      <li>Je mag je antwoord veranderen tot de vraag sluit (timer of presentator). Alleen je laatste antwoord telt.</li>
      <li>Valt je verbinding weg? Je hebt 60 seconden om terug te komen; je laatste antwoord wordt dan alsnog geteld.</li>
      <li>
        Uitslagen worden {{ quiz.revealMode === 'ROUND' ? 'per ronde' : 'per vraag' }} onthuld. De tussenstand verschijnt standaard halverwege.
      </li>
      <li v-if="quiz.powerUps">
        Power-ups in deze quiz ({{ quiz.powerUps.uses }}× per type{{ quiz.mode === 'TEAM' ? ', samen met je team' : '' }}):
        <span v-for="(t, i) in quiz.powerUps.types" :key="t"><strong>{{ POWER_LABEL[t].name }}</strong> ({{ POWER_LABEL[t].help.replace(/\.$/, '') }}){{ i < quiz.powerUps.types.length - 1 ? '; ' : '.' }}</span>
        Per vraag kun je maar één puntenverdubbelaar inzetten.
      </li>
      <li v-if="hasPicture">Beeldrondes blijven langer open: de foto's en vragen staan onder de gewone vraag en je kunt er tijdens de volgende ronde(s) tussendoor antwoorden invullen of wijzigen. Daarna sluit de beeldronde en volgt de onthulling.</li>
      <li v-if="hasOpen">Open vragen: een exact juist antwoord is meteen goed; andere antwoorden beoordeelt een ander team (of speler) met goed/fout, zonder te weten van wie het is. De uitslag wacht tot alles beoordeeld is; de presentator kan een beoordeling altijd corrigeren.</li>
      <li>Goed = punten van de vraag, fout of leeg = 0. Bij meerkeuze-meerdere moeten alle juiste opties gekozen zijn.</li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import type { QuizSummaryDto } from '@puntquiz/contracts'
defineProps<{ quiz: QuizSummaryDto; hasOpen?: boolean; hasPicture?: boolean }>()
</script>
