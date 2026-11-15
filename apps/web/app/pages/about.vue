<template>
  <main class="wrap stack">
    <div class="card prose">
      <h1>Over PuntQuiz</h1>
      <p>PuntQuiz is een live pubquiz-platform met één uitgangspunt: <strong>elke speler telt, ook in een team</strong>. <NuxtLink to="/info/over-ons">Lees meer over ons</NuxtLink>.</p>
      <p class="muted">Versie <span class="mono">{{ version }}</span></p>
    </div>
    <div class="card prose">
      <h2>Hulp</h2>
      <ul>
        <li><NuxtLink to="/info/spelregels">Spelregels — hoe werkt PuntQuiz? (spelers)</NuxtLink></li>
        <li><NuxtLink to="/info/presentator">Handleiding presentator</NuxtLink></li>
        <li><NuxtLink to="/info/quizmaster">Handleiding quizmaster</NuxtLink></li>
      </ul>
      <p class="muted">Een fout in een vraag melden of andere hulp nodig? Mail naar ronald.punt@mac.com.</p>
    </div>
    <div class="card prose">
      <h2>Juridisch</h2>
      <ul>
        <li><NuxtLink to="/info/privacy">Privacybeleid</NuxtLink></li>
        <li><NuxtLink to="/info/disclaimer">Disclaimer</NuxtLink></li>
        <li><NuxtLink to="/info/ai-verklaring">AI-verklaring</NuxtLink></li>
      </ul>
    </div>
    <div class="card prose">
      <h2>Wat is nieuw</h2>
      <p><strong>0.2.0</strong> — Inloggen via PuntQuiz-account (met tweestapsverificatie voor staf), vragenbank met import en export, en een icoon-schakelaar voor licht/donker.</p>
      <p><strong>0.1.0</strong> — Eerste speelbare versie: individuele quiz en teamquiz (meerderheidsstemming), presentatorbediening, live ranglijst, pauze/onderbreking en het bufferen van antwoorden bij verbindingsverlies.</p>
    </div>
  </main>
</template>
<script setup lang="ts">
const version = useRuntimeConfig().public.appVersion
</script>
