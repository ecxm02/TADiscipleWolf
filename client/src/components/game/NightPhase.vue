<script setup>
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()

const result = computed(() => gameStore.voteResult)
const privateMessage = computed(() => gameStore.privateMessage)
</script>

<template>
  <div class="text-center">
    <h2 class="text-3xl font-bold mb-6 text-primary">Night Results</h2>
    
    <!-- Voting Results (Always Visible) -->
    <div v-if="result" class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="card-title justify-center text-xl">Summary</h3>
        <p class="text-lg whitespace-pre-wrap">{{ result.result }}</p>
      </div>
    </div>

    <!-- Private Messages (Prophet Results) -->
    <div v-if="privateMessage" class="alert alert-warning shadow-lg mt-4">
      <div>
        <span class="font-bold">{{ privateMessage }}</span>
      </div>
    </div>
    
    <div class="mt-8">
        <span class="loading loading-dots loading-lg text-primary"></span>
        <p class="text-sm opacity-50 mt-2">Waiting for morning...</p>
    </div>

  </div>
</template>
