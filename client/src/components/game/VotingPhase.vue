<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()
const votedTarget = ref(null)

const alivePlayers = computed(() => {
  return gameStore.players.filter(p => p.alive && p.id !== gameStore.myId)
})

const castVote = (targetId) => {
  votedTarget.value = targetId
  gameStore.castVote(targetId)
}
</script>

<template>
  <div class="text-center">
    <h2 class="text-2xl font-bold mb-2 text-error">Voting Phase</h2>
    <p class="mb-6">Vote for who you think is an Evil Spirit.</p>

    <div v-if="votedTarget" class="alert alert-success shadow-lg mb-6">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Vote Cast! Waiting for results...</span>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <button 
        v-for="player in alivePlayers" 
        :key="player.id"
        class="btn btn-outline btn-error btn-lg w-full"
        @click="castVote(player.id)"
      >
        Vote: {{ player.name }}
      </button>
      
      <button class="btn btn-ghost w-full mt-4" @click="castVote('skip')">
        Skip Vote
      </button>
    </div>
  </div>
</template>
