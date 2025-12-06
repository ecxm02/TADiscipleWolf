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
        <h2 class="card-title justify-center text-3xl mb-2 font-serif text-primary">Your Disguise</h2>
        
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
             <div class="alert alert-success shadow-lg max-w-xs">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span class="font-bold">Disguise Active</span>
             </div>
        </div>

        <p class="text-sm opacity-60 mt-2">You do not need verification.</p>
      </div>
    </div>

    <!-- Card 2: The Action -->
    <div class="card bg-base-100 shadow-2xl border-2 border-secondary/20 h-full relative overflow-hidden">
      
      <!-- No Lock for Evil Spirit usually, or maybe they want one? Original code had: myRole !== 'Angel' && myRole !== 'Evil Spirit' for lock. So NO lock. -->

      <div class="card-body text-center">
        <h2 class="card-title justify-center text-3xl mb-6 font-serif text-secondary">Your Ability</h2>

        <!-- Action Submitted State -->
        <div v-if="actionSubmitted" class="alert alert-success shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Action Submitted!</span>
        </div>

        <!-- Evil Spirit: Kill -->
        <div v-else-if="myPlayer && myPlayer.alive">
            <p class="mb-4 text-lg">Choose a victim to eliminate tonight.</p>
            <div class="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                <button v-for="p in otherPlayers" :key="p.id" 
                    class="btn btn-outline btn-error btn-md w-full" 
                    @click="submitAction('KILL', p.id)">
                    Kill {{ p.name }}
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
