<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../../../stores/gameStore'

const gameStore = useGameStore()
const prayerText = ref('')
const selectedTargetId = ref(null)

const myPlayer = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.myId)
})

const myRole = computed(() => gameStore.myRole)

const otherPlayers = computed(() => {
  return gameStore.players.filter(p => p.id !== gameStore.myId && p.alive)
})

const status = computed(() => gameStore.angelRequestStatus)

const canSubmit = computed(() => {
    return selectedTargetId.value && prayerText.value.trim().length > 0
})

const submitPrayer = () => {
    if (!canSubmit.value) return
    gameStore.submitAngelRequest(selectedTargetId.value, prayerText.value)
}

// Reset form if rejected
watch(status, (newStatus) => {
    if (newStatus === 'REJECTED') {
        // Optional: clear form or keep it for editing
        // keeping it allows easier resubmission
    }
})
</script>

<template>
  <div class="max-w-2xl mx-auto animate-fade-in">
    <div class="card bg-base-100 shadow-2xl border-2 border-primary/20">
      <div class="card-body text-center">
        <h2 class="card-title justify-center text-3xl mb-2 font-serif text-primary">Your Holy Duty</h2>
        
        <div class="badge badge-secondary badge-lg p-4 text-lg shadow-md mb-4">
          {{ myRole }}
        </div>

        <!-- Teammates Display -->
        <div v-if="gameStore.teammates && gameStore.teammates.length > 0" class="mb-4">
            <div class="alert alert-info shadow-sm py-2">
                <div class="flex flex-col w-full">
                    <span class="text-xs uppercase font-bold opacity-70">Your Allies</span>
                    <span class="font-bold">{{ gameStore.teammates.join(', ') }}</span>
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Status: Approved -->
        <div v-if="status === 'APPROVED'" class="alert alert-success shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
                <h3 class="font-bold">Prayer Answered!</h3>
                <div class="text-sm">You are protecting {{ gameStore.protectedTargetName }}.</div>
            </div>
        </div>

        <!-- Status: Pending -->
        <div v-else-if="status === 'PENDING'" class="alert alert-info shadow-lg">
            <span class="loading loading-spinner loading-md"></span>
            <span>Your prayer has been sent. Waiting for approval...</span>
        </div>

        <!-- Form (Default or Rejected) -->
        <div v-else>
            <div v-if="status === 'REJECTED'" class="alert alert-error shadow-lg mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Your prayer was rejected. Please try again.</span>
            </div>

            <p class="mb-4 text-lg">Select a soul to protect and offer your prayer.</p>

            <!-- Target Selection -->
            <div class="grid grid-cols-2 gap-2 mb-4">
                <button v-for="p in otherPlayers" :key="p.id" 
                    class="btn btn-outline btn-sm"
                    :class="{ 'btn-active btn-primary': selectedTargetId === p.id }"
                    @click="selectedTargetId = p.id">
                    {{ p.name }}
                </button>
            </div>

            <!-- Prayer Input -->
            <textarea v-model="prayerText" 
                class="textarea textarea-bordered w-full mb-4 h-24" 
                placeholder="Write your prayer here... (Required)"></textarea>

            <!-- Submit Button -->
            <button @click="submitPrayer" 
                class="btn btn-primary w-full" 
                :disabled="!canSubmit">
                Submit Prayer
            </button>
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
