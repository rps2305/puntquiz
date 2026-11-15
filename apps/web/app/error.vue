<template>
  <main class="wrap stack" style="text-align: center; padding-top: 48px">
    <h1>{{ error?.statusCode === 404 ? 'Deze pagina bestaat niet' : 'Er ging iets mis' }}</h1>
    <p class="muted" style="margin-inline: auto">
      {{ error?.statusCode === 404 ? 'Controleer de link, of ga terug naar de startpagina om mee te doen met een quiz.' : 'Probeer het opnieuw. Blijft het misgaan, laat het de presentator weten.' }}
    </p>
    <p><button @click="clearError({ redirect: '/' })">Naar de startpagina</button></p>
  </main>
</template>
<script setup lang="ts">
defineProps<{ error: { statusCode?: number } }>()
</script>
