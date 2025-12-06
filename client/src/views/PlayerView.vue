<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import LobbyPhase from '../components/game/LobbyPhase.vue'
import DayPhase from '../components/game/DayPhase.vue'
import VotingPhase from '../components/game/VotingPhase.vue'
import NightPhase from '../components/game/NightPhase.vue'

const gameStore = useGameStore()


const myPlayer = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.myId)
})

const dayNumber = computed(() => gameStore.dayNumber)
const timer = computed(() => gameStore.timer)

const currentPhaseComponent = computed(() => {
  switch (gameStore.phase) {
    case 'LOBBY': return LobbyPhase
    case 'DAY': return DayPhase
    case 'VOTING': return VotingPhase
    case 'NIGHT': return NightPhase
    case 'RESULTS': return NightPhase
    default: return LobbyPhase
  }
})

const currentTheme = computed(() => {
  if (gameStore.phase === 'LOBBY') return 'retro' // Default lobby theme
  
  if (myPlayer.value) {
    switch (myPlayer.value.role) {
      case 'Angel': return 'angel-theme'
      case 'Evil Spirit': return 'evil-theme'
      case 'Prophet': return 'prophet-theme'
      case 'Disciple': return 'disciple-theme'
      default: return 'retro'
    }
  }
  return 'retro'
})

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

import { useRouter } from 'vue-router';
const router = useRouter();

const returnToDashboard = () => {
    gameStore.leaveGame();
    router.push({ name: 'dashboard' });
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 transition-colors duration-1000 bg-base-100" :data-theme="currentTheme">
      <!-- Player Dashboard -->
      <div class="w-full max-w-4xl flex flex-col items-center">
        <div v-if="myPlayer" class="w-full flex flex-col items-center">
          
          <!-- Header -->
          <div class="text-center mb-8 w-full relative">
            <h1 class="text-4xl font-bold mb-2 font-serif tracking-wide">{{ myPlayer.name }}</h1>
            
            <div class="flex justify-center gap-4 items-center flex-wrap">
                <button class="btn btn-sm btn-ghost absolute left-0 top-0" @click="returnToDashboard">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Dashboard
                </button>

                <div class="badge badge-lg badge-primary font-mono text-xl p-4">
                    Room: {{ gameStore.roomCode }}
                </div>

                <div class="badge badge-lg shadow-sm" :class="myPlayer.alive ? 'badge-success' : 'badge-error'">
                  {{ myPlayer.alive ? 'ALIVE' : 'DEAD' }}
                </div>
                <div v-if="gameStore.phase !== 'LOBBY'" class="badge badge-lg badge-ghost">
                    Day {{ dayNumber }}
                </div>
            </div>

            <!-- Timer (Absolute or Fixed position could be better, but inline is fine for now) -->
            <div v-if="timer && timer.active" class="absolute top-0 right-0 badge badge-lg badge-accent font-mono text-xl p-4 hidden md:flex">
                {{ formatTime(timer.remaining) }}
            </div>
            <!-- Mobile Timer -->
            <div v-if="timer && timer.active" class="md:hidden mt-2 flex justify-center">
                 <div class="badge badge-lg badge-accent font-mono text-xl p-4">
                    {{ formatTime(timer.remaining) }}
                </div>
            </div>
          </div>

          <!-- Phase Content -->
          <div class="w-full flex justify-center">
            <div v-if="myPlayer.alive" class="w-full">
               <component :is="currentPhaseComponent" />
            </div>
            <div v-else class="alert alert-error shadow-lg max-w-md">
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>You have been eliminated. Spectator mode coming soon.</span>
                </div>
            </div>
          </div>

        </div>
        
        <div v-else class="loading loading-spinner loading-lg text-primary"></div>
      </div>
  </div>
</template>
