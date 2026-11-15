<template>
  <div v-if="canPrompt || showIosHelp" class="install">
    <button v-if="canPrompt" type="button" class="ghost small" @click="prompt">📲 Zet PuntQuiz op je beginscherm</button>
    <details v-else>
      <summary>📲 Zet PuntQuiz op je beginscherm</summary>
      <p class="muted" style="margin: 6px 0 0">Tik in Safari op <strong>Deel</strong> (het vierkantje met pijltje) en kies <strong>Zet op beginscherm</strong>. Dan open je PuntQuiz als een app.</p>
    </details>
  </div>
</template>
<script setup lang="ts">
const { canPrompt, showIosHelp, prompt } = useInstall()
</script>
<style scoped>
.install { margin-top: 4px; font-size: .9rem; }
.install summary { cursor: pointer; color: var(--accent-strong); font-weight: 600; }
</style>
