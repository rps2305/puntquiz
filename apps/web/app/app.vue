<template>
  <div class="app">
    <header class="topbar">
      <NuxtLink to="/" class="brand"><img src="/icons/icon-48.png" alt="" />PuntQuiz</NuxtLink>
      <span class="grow" />
      <NuxtLink v-if="user?.canHost" to="/quizzes">Mijn quizzen</NuxtLink>
      <NuxtLink v-if="user?.canHost" to="/bank">Vragenbank</NuxtLink>
      <NuxtLink v-if="user && !user.isGuest && !user.canHost" to="/presentator">Presentator worden</NuxtLink>
      <NuxtLink v-if="user?.isAdmin" to="/admin">Beheer</NuxtLink>
      <NuxtLink to="/about">Over</NuxtLink>
      <ThemeToggle />
      <button v-if="user" class="ghost small" @click="signOut">Uitloggen</button>
    </header>
    <NuxtPage />
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
const { user, fetchMe, logout } = useAuth()
onMounted(fetchMe)
async function signOut() {
  await logout()
  await navigateTo('/')
}
</script>
