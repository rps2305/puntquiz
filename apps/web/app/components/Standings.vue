<template>
  <div>
    <p v-if="!data || !data.gradedQuestions" class="muted">Nog geen uitslagen onthuld.</p>
    <template v-else>
      <h3>{{ data.mode === 'TEAM' ? 'Teamranglijst' : 'Ranglijst' }}</h3>
      <p v-if="topTied" class="info">Gedeelde eerste plaats — shout-out!</p>
      <table class="board">
        <tbody>
          <tr v-for="r in data.rows" :key="r.id" :class="{ mine: r.isMine }">
            <td class="rank">{{ r.rank }}<span v-if="r.tied" title="Gedeeld">=</span></td>
            <td>{{ r.name }}<span v-if="r.isMine" class="sr-only"> (jij)</span></td>
            <td class="score">{{ fmt(r.score) }}</td>
          </tr>
        </tbody>
      </table>
      <template v-if="data.mode === 'TEAM'">
        <h3 style="margin-top: 1rem">Persoonlijke scores</h3>
        <table class="board">
          <tbody>
            <tr v-for="r in data.personal" :key="r.id" :class="{ mine: r.isMine && personalMine }">
              <td class="rank">{{ r.rank }}</td>
              <td>{{ r.name }}</td>
              <td class="score">{{ fmt(r.score) }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { StandingsDto } from '@puntquiz/contracts'
const props = defineProps<{ data: StandingsDto | null }>()
const topTied = computed(() => (props.data?.rows.filter((r) => r.rank === 1).length ?? 0) > 1)
const personalMine = true
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
</script>
