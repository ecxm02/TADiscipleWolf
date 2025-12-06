<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../../../stores/gameStore'

const gameStore = useGameStore()
const actionSubmitted = ref(false)

const myPlayer = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.myId)
})

const currentTask = computed(() => gameStore.currentTask)
const myRole = computed(() => gameStore.myRole)

const otherPlayers = computed(() => {
  return gameStore.players.filter(p => p.id !== gameStore.myId && p.alive)
})

const submitAction = (type, targetId) => {
  gameStore.submitNightAction(type, targetId, '')
  actionSubmitted.value = true
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
    <!-- Card 1: The Task -->
    <div class="card bg-base-100 shadow-2xl border-2 border-primary/20 h-full">
      <div class="card-body text-center">
        <h2 class="card-title justify-center text-3xl mb-2 font-serif text-primary">Your Task</h2>
        
        <!-- Role Badge -->
        <div class="badge badge-secondary badge-lg p-4 text-lg shadow-md">
          {{ myRole }}
        </div>

        <!-- Teammates Display -->
        <div v-if="gameStore.teammates && gameStore.teammates.length > 0" class="mb-4 animate-fade-in">
            <div class="alert alert-info shadow-sm py-2">
                <div class="flex flex-col w-full">
                    <span class="text-xs uppercase font-bold opacity-70">Your Allies</span>
                    <span class="font-bold">{{ gameStore.teammates.join(', ') }}</span>
                </div>
            </div>
        </div>

        <div class="bg-base-200 p-6 rounded-xl my-4 shadow-inner min-h-[120px] flex items-center justify-center">
          <p class="text-xl font-medium italic">
            "{{ currentTask || "Loading task..." }}"
          </p>
        </div>
        
        <div class="divider">Status</div>

        <div class="flex justify-center items-center gap-4 py-4">
          <div v-if="myPlayer && myPlayer.taskCompleted" class="alert alert-success shadow-lg max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span class="font-bold">Task Verified!</span>
          </div>
          
          <div v-else class="alert alert-warning shadow-lg max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span class="font-bold">Pending Verification</span>
          </div>
        </div>

        <p class="text-sm opacity-60 mt-2">Find the GM to verify your task.</p>
      </div>
    </div>

    <!-- Card 2: The Action -->
    <div class="card bg-base-100 shadow-2xl border-2 border-secondary/20 h-full relative overflow-hidden">
      
      <!-- Lock Overlay -->
      <div v-if="myPlayer && !myPlayer.taskCompleted" class="absolute inset-0 bg-base-300/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-base-content/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        <h3 class="text-2xl font-bold text-base-content/70">Vision Locked</h3>
        <p class="text-base-content/60 mt-2">Complete and verify your task to unlock.</p>
      </div>

      <div class="card-body text-center">
        <h2 class="card-title justify-center text-3xl mb-6 font-serif text-secondary">Your Ability</h2>

        <!-- Action Submitted State -->
        <div v-if="actionSubmitted" class="alert alert-success shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Action Submitted!</span>
        </div>

        <!-- Prophet: Check -->
        <div v-else-if="myPlayer && myPlayer.alive">
            <p class="mb-4 text-lg">Choose a player to reveal their true nature.</p>
            <div class="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                <button v-for="p in otherPlayers" :key="p.id" 
                    class="btn btn-outline btn-warning btn-md w-full" 
                    @click="submitAction('CHECK', p.id)">
                    Check {{ p.name }}
                </button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-in;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
