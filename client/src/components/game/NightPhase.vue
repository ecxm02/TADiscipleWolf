<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()
const actionSubmitted = ref(false)
const prayerText = ref('')

const myPlayer = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.myId)
})

const myRole = computed(() => gameStore.myRole)

const otherPlayers = computed(() => {
  return gameStore.players.filter(p => p.id !== gameStore.myId && p.alive)
})

const result = computed(() => gameStore.voteResult)
const privateMessage = computed(() => gameStore.privateMessage)

const submitAction = (type, targetId) => {
  gameStore.submitNightAction(type, targetId, prayerText.value)
  actionSubmitted.value = true
}
</script>

<template>
  <div class="text-center">
    <h2 class="text-3xl font-bold mb-6 text-primary">Night Phase</h2>
    
    <!-- Voting Results (Always Visible) -->
    <div v-if="result" class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="card-title justify-center text-xl">Voting Results</h3>
        <p class="text-lg">{{ result.result }}</p>
      </div>
    </div>

    <!-- Role Specific Actions -->
    <div v-if="myPlayer && myPlayer.alive && !actionSubmitted && !result?.message?.includes('Night has ended')">
        
        <!-- Evil Spirit: Kill -->
        <div v-if="myRole === 'Evil Spirit'" class="card bg-error text-error-content shadow-xl">
            <div class="card-body">
                <h3 class="card-title justify-center">Evil Spirit: Choose a Victim</h3>
                
                <div v-if="!myPlayer.taskCompleted" class="alert alert-warning shadow-lg mb-4 text-black">
                    <span>You must complete your daily task to unlock killing!</span>
                </div>

                <div class="grid grid-cols-1 gap-2 mt-4">
                    <button v-for="p in otherPlayers" :key="p.id" 
                        class="btn btn-outline btn-sm bg-white" 
                        :disabled="!myPlayer.taskCompleted"
                        @click="submitAction('KILL', p.id)">
                        Kill {{ p.name }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Angel: Protect -->
        <div v-else-if="myRole === 'Angel'" class="card bg-info text-info-content shadow-xl">
            <div class="card-body">
                <h3 class="card-title justify-center">Angel: Protect a Soul</h3>
                
                <div v-if="!myPlayer.taskCompleted" class="alert alert-warning shadow-lg mb-4 text-black">
                    <span>You must complete your daily task to unlock protection!</span>
                </div>

                <textarea v-model="prayerText" class="textarea textarea-bordered text-black w-full mb-4" placeholder="Write your prayer here..." :disabled="!myPlayer.taskCompleted"></textarea>
                <div class="grid grid-cols-1 gap-2">
                    <button v-for="p in otherPlayers" :key="p.id" 
                        class="btn btn-outline btn-sm bg-white" 
                        :disabled="!myPlayer.taskCompleted"
                        @click="submitAction('PROTECT', p.id)">
                        Protect {{ p.name }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Prophet: Check -->
        <div v-else-if="myRole === 'Prophet'" class="card bg-warning text-warning-content shadow-xl">
            <div class="card-body">
                <h3 class="card-title justify-center">Prophet: Reveal Identity</h3>
                
                <div v-if="!myPlayer.taskCompleted" class="alert alert-error shadow-lg mb-4 text-black">
                    <span>You did not complete your task. Your vision is clouded.</span>
                </div>
                <div v-else class="alert alert-success shadow-lg mb-4 text-black">
                    <span>Task Verified. You may check one person.</span>
                </div>

                <div class="grid grid-cols-1 gap-2">
                    <button v-for="p in otherPlayers" :key="p.id" 
                        class="btn btn-outline btn-sm bg-white" 
                        :disabled="!myPlayer.taskCompleted"
                        @click="submitAction('CHECK', p.id)">
                        Check {{ p.name }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Disciple: Sleep -->
        <div v-else class="alert alert-info shadow-lg">
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>You are sleeping... Waiting for morning.</span>
            </div>
        </div>
    </div>

    <!-- Action Submitted Feedback -->
    <div v-if="actionSubmitted" class="alert alert-success shadow-lg mt-4">
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Action submitted. Waiting for other spirits...</span>
        </div>
    </div>

    <!-- Private Messages (Prophet Results) -->
    <div v-if="privateMessage" class="alert alert-warning shadow-lg mt-4">
        <div>
            <span class="font-bold">{{ privateMessage }}</span>
        </div>
    </div>

  </div>
</template>
