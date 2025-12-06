<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import LobbyPhase from '../components/game/LobbyPhase.vue'
import DayPhase from '../components/game/DayPhase.vue'
import VotingPhase from '../components/game/VotingPhase.vue'
import NightPhase from '../components/game/NightPhase.vue'

const gameStore = useGameStore()
const playerName = ref('')

const join = () => {
  if (playerName.value.trim()) {
    gameStore.joinGame(playerName.value)
  }
}

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

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}


</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Login Screen -->
    <transition name="fade" mode="out-in">
      <div v-if="!gameStore.joined" class="card w-full max-w-sm bg-base-200 shadow-2xl">
        <div class="card-body">
          <h2 class="card-title justify-center mb-6 text-2xl font-serif">Disciples & Spirits</h2>
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">What is your name?</span>
            </label>
            <input 
              v-model="playerName" 
              type="text" 
              placeholder="Enter your name" 
              class="input input-bordered w-full input-primary" 
              @keyup.enter="join"
            />
          </div>
          <div class="card-actions justify-end mt-6">
            <button class="btn btn-primary w-full font-bold" @click="join">Join Game</button>
          </div>
        </div>
      </div>

      <!-- Player Dashboard -->
      <div v-else class="w-full max-w-4xl flex flex-col items-center">
        <div v-if="myPlayer" class="w-full flex flex-col items-center">
          
          <!-- Header -->
          <div class="text-center mb-8 w-full relative">
            <h1 class="text-4xl font-bold mb-2 font-serif tracking-wide">{{ myPlayer.name }}</h1>
            
            <div class="flex justify-center gap-4 items-center">
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
    </transition>
  </div>
</template>
