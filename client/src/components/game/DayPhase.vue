<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import DiscipleDay from './DayPhase/DiscipleDay.vue'
import EvilSpiritDay from './DayPhase/EvilSpiritDay.vue'
import AngelDay from './DayPhase/AngelDay.vue'
import ProphetDay from './DayPhase/ProphetDay.vue'

const gameStore = useGameStore()
const taskRevealed = ref(false)

const myRole = computed(() => gameStore.myRole)

const currentRoleComponent = computed(() => {
  switch (myRole.value) {
    case 'Evil Spirit':
      return EvilSpiritDay
    case 'Angel':
      return AngelDay
    case 'Prophet':
      return ProphetDay
    default:
      return DiscipleDay
  }
})

const revealTask = () => {
  gameStore.requestTask()
  taskRevealed.value = true
}
</script>

<template>
  <div class="w-full max-w-6xl mx-auto p-4">
    <!-- Reveal Section -->
    <div v-if="!taskRevealed" class="hero min-h-[50vh] bg-base-200 rounded-box shadow-lg">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold font-serif mb-8">Day Phase</h1>
          <p class="py-6 text-lg">The sun rises on a new day. Your task awaits.</p>
          <button class="btn btn-primary btn-lg wide shadow-lg hover:scale-105 transition-transform" @click="revealTask">
            Reveal Task
          </button>
        </div>
      </div>
    </div>

    <!-- Role Specific Content -->
    <component v-else :is="currentRoleComponent" />
  </div>
</template>
