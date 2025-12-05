<script setup>
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()
const players = computed(() => gameStore.players)
</script>

<template>
  <div class="card w-96 bg-base-200 shadow-xl mx-auto">
    <div class="card-body text-center">
      <h2 class="card-title justify-center text-3xl font-serif mb-2">Waiting Room</h2>
      <p class="text-sm opacity-70 mb-6">The spirits are gathering...</p>
      
      <div class="loading loading-ring loading-lg mb-6 text-primary"></div>

      <div v-if="players.length > 0" class="w-full">
        <h3 class="font-bold text-left mb-2">Disciples Joined: {{ players.length }}</h3>
        <ul class="menu bg-base-200 w-full rounded-box max-h-48 overflow-y-auto">
          <li v-for="player in players" :key="player.id">
            <a class="cursor-default hover:bg-transparent">
              <div class="avatar placeholder">
                <div class="bg-neutral-focus text-neutral-content rounded-full w-8">
                  <span class="text-xs">{{ player.name.charAt(0).toUpperCase() }}</span>
                </div>
              </div>
              {{ player.name }}
            </a>
          </li>
        </ul>
      </div>
      
      <p class="text-xs opacity-50 mt-4">Waiting for the GM to start the day...</p>
    </div>
  </div>
</template>
