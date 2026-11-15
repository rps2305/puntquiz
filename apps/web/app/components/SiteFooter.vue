<template>
  <footer class="site-footer">
    <nav aria-label="Informatie">
      <NuxtLink to="/info/over-ons">Over ons</NuxtLink>
      <NuxtLink to="/info/spelregels">Spelregels</NuxtLink>
      <NuxtLink to="/info/privacy">Privacy</NuxtLink>
      <NuxtLink to="/info/disclaimer">Disclaimer</NuxtLink>
      <NuxtLink to="/info/ai-verklaring">AI-verklaring</NuxtLink>
      <NuxtLink to="/about">Versie &amp; hulp</NuxtLink>
    </nav>
    <p class="copy">© {{ year }} PuntQuiz · Elke speler telt, ook in een team</p>
  </footer>
</template>
<script setup lang="ts">
// Computed at runtime in the browser, so the year rolls over by itself.
const year = new Date().getFullYear()
</script>
<style scoped>
.site-footer {
  margin-top: 32px;
  padding: 20px 16px max(20px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface);
  text-align: center;
  font-size: .9rem;
}
.site-footer nav { display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: center; }
.site-footer a { padding: 6px 2px; } /* comfortable tap targets on touch screens */
.copy { margin: 12px 0 0; color: var(--ink-muted); font-size: .8rem; }
</style>
