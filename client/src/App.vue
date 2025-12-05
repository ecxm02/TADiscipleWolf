<script setup>
import { onMounted, watch } from 'vue'
import { useGameStore } from './stores/gameStore'

const gameStore = useGameStore()

const updateTheme = (phase) => {
  // LOBBY and NIGHT are 'night' theme
  // DAY and VOTING are 'retro' theme
  const theme = (phase === 'DAY' || phase === 'VOTING') ? 'retro' : 'night'
  console.log('Switching theme to:', theme, 'for phase:', phase)
  document.documentElement.setAttribute('data-theme', theme)
}

watch(() => gameStore.phase, (newPhase) => {
  updateTheme(newPhase)
})

onMounted(() => {
  gameStore.initSocket()
  updateTheme(gameStore.phase)
})
</script>

<template>
  <div class="min-h-screen bg-base-100 transition-colors duration-1000 ease-in-out">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
