<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()

onMounted(() => {
  gameStore.loginAdmin()
})

const players = computed(() => gameStore.players)
const currentPhase = computed(() => gameStore.phase)
const dayNumber = computed(() => gameStore.dayNumber)
const timer = computed(() => gameStore.timer)
const roleQuotas = computed(() => gameStore.roleQuotas)
const timerConfig = computed(() => gameStore.timerConfig)

// Local state for edits
const localQuotas = ref({...roleQuotas.value})
const localTimerConfig = ref({...timerConfig.value})

// Sync local state when store updates
watch(roleQuotas, (newVal) => {
    if (newVal) localQuotas.value = {...newVal}
}, { deep: true })

watch(timerConfig, (newVal) => {
    if (newVal) localTimerConfig.value = {...newVal}
}, { deep: true })

const setPhase = (phase) => {
    gameStore.setPhase(phase)
}

const resolveNight = () => {
    gameStore.resolveNight()
}

const toggleTask = (id) => {
  gameStore.toggleTask(id)
}

const killPlayer = (id) => {
  if (confirm('Are you sure you want to kill this player?')) {
    gameStore.killPlayer(id)
  }
}

const revivePlayer = (id) => {
  gameStore.revivePlayer(id)
}

const kickPlayer = (id) => {
    console.log('AdminView: kickPlayer clicked for', id);
    if (confirm('Are you sure you want to KICK this player? They will be disconnected.')) {
        gameStore.kickPlayer(id)
    }
}

const setRole = (id, role) => {
    gameStore.setRole(id, role);
}

const updateQuotas = () => {
    gameStore.setRoleQuotas(localQuotas.value)
}

const autoAssignRoles = () => {
    gameStore.autoAssignRoles(localQuotas.value)
}

const updateTimerConfig = () => {
    gameStore.setTimerConfig(localTimerConfig.value)
}

const roles = ['Disciple', 'Angel', 'Prophet', 'Evil Spirit'];
const specialRoles = ['Angel', 'Prophet', 'Evil Spirit'];

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const angelRequests = computed(() => gameStore.angelRequests)

const approveRequest = (id) => {
    gameStore.approveAngelRequest(id)
}

</script>

<template>
  <div class="min-h-screen bg-base-200 p-8">
    <div class="max-w-6xl mx-auto">
      
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold">GM Dashboard</h1>
            <div class="text-xl opacity-70">Day {{ dayNumber }}</div>
        </div>
        
        <div class="flex gap-4 items-center">
            <!-- Timer Display -->
            <div v-if="timer && timer.active" class="badge badge-lg badge-accent font-mono text-xl p-4">
                {{ formatTime(timer.remaining) }}
            </div>

            <div class="badge badge-lg">{{ currentPhase }}</div>
            
            <div class="join">
                <button v-if="currentPhase === 'LOBBY'" class="btn join-item btn-primary" @click="setPhase('DAY')">Start Day</button>
                
                <button v-if="currentPhase === 'DAY'" class="btn join-item btn-warning" @click="setPhase('VOTING')">End Day (Start Vote)</button>
                
                <button v-if="currentPhase === 'VOTING'" class="btn join-item btn-error" @click="setPhase('NIGHT')">End Vote (Show Results)</button>
                
                <button v-if="currentPhase === 'NIGHT'" class="btn join-item btn-secondary" @click="resolveNight">Resolve Night Actions</button>
                <button v-if="currentPhase === 'NIGHT'" class="btn join-item btn-success" @click="setPhase('DAY')">Start Next Day</button>
                
                <!-- Reset Option -->
                <button v-if="currentPhase === 'NIGHT'" class="btn join-item btn-ghost" @click="setPhase('LOBBY')">Reset to Lobby</button>
            </div>
        </div>
      </div>

      <!-- Action Feedback -->
      <div v-if="gameStore.lastActionMessage" class="alert alert-info mb-4 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>{{ gameStore.lastActionMessage }}</span>
      </div>

      <!-- Settings Panel (Lobby Only) -->
      <div v-if="currentPhase === 'LOBBY'" class="card bg-base-100 shadow-xl mb-8">
          <div class="card-body">
              <h2 class="card-title">Game Setup</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <!-- Role Quotas -->
                  <div>
                      <h3 class="font-bold mb-2">Role Quotas</h3>
                      <div class="grid grid-cols-2 gap-2 mb-4">
                          <div v-for="role in specialRoles" :key="role" class="form-control">
                              <label class="label">
                                  <span class="label-text">{{ role }}</span>
                              </label>
                              <input type="number" v-model.number="localQuotas[role]" class="input input-bordered input-sm" min="0" @change="updateQuotas">
                          </div>
                      </div>
                      <button class="btn btn-primary btn-sm" @click="autoAssignRoles">Auto Assign Roles</button>
                  </div>

                  <!-- Timer Config -->
                  <div>
                      <h3 class="font-bold mb-2">Timer Defaults (Seconds)</h3>
                      <div class="grid grid-cols-2 gap-2 mb-4">
                          <div class="form-control">
                              <label class="label"><span class="label-text">Day</span></label>
                              <input type="number" v-model.number="localTimerConfig.DAY" class="input input-bordered input-sm" @change="updateTimerConfig">
                          </div>
                          <div class="form-control">
                              <label class="label"><span class="label-text">Voting</span></label>
                              <input type="number" v-model.number="localTimerConfig.VOTING" class="input input-bordered input-sm" @change="updateTimerConfig">
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <!-- Angel Requests Panel -->
      <div v-if="angelRequests && angelRequests.length > 0" class="card bg-base-100 shadow-xl mb-8 border-l-4 border-info">
          <div class="card-body">
              <h2 class="card-title text-info">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Prayer Requests
              </h2>
              <div class="overflow-x-auto">
                  <table class="table w-full">
                      <thead>
                          <tr>
                              <th>Angel</th>
                              <th>Target</th>
                              <th>Prayer</th>
                              <th>Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr v-for="[id, req] in angelRequests" :key="id">
                              <td>{{ players.find(p => p.id === id)?.name || 'Unknown' }}</td>
                              <td>{{ req.targetName }}</td>
                              <td class="italic">"{{ req.message }}"</td>
                              <td>
                                  <button v-if="!req.approved" class="btn btn-sm btn-success" @click="approveRequest(id)">Approve</button>
                                  <span v-else class="badge badge-success">Approved</span>
                              </td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      <!-- Player List -->
      <div class="overflow-x-auto bg-base-100 rounded-box shadow-xl">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Task</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in players" :key="player.id" :class="{'opacity-50': !player.alive}">
              <td>
                <div class="font-bold">{{ player.name }}</div>
                <div class="text-xs opacity-50">{{ player.id }}</div>
              </td>
              <td>
                <span class="font-mono">{{ player.role }}</span>
              </td>

              <td>
                <div class="badge" :class="player.alive ? 'badge-success' : 'badge-error'">
                  {{ player.alive ? 'Alive' : 'Dead' }}
                </div>
              </td>
              <td>
                <label class="cursor-pointer label justify-start gap-2">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-primary" 
                    :checked="player.taskCompleted"
                    @change="toggleTask(player.id)"
                  />
                  <div class="flex flex-col">
                      <span class="label-text" :class="{'text-success font-bold': player.taskCompleted}">
                        {{ player.taskCompleted ? 'Verified' : 'Pending' }}
                      </span>
                      <span v-if="player.currentTask" class="text-xs opacity-70 max-w-[200px] truncate" :title="player.currentTask">
                          {{ player.currentTask }}
                      </span>
                  </div>
                </label>
              </td>
              <td class="flex gap-2">
                <button 
                  v-if="player.alive"
                  class="btn btn-error btn-xs" 
                  @click="killPlayer(player.id)"
                >
                  Kill
                </button>
                <button 
                  v-else
                  class="btn btn-success btn-xs" 
                  @click="revivePlayer(player.id)"
                >
                  Revive
                </button>
                <button class="btn btn-warning btn-xs" @click="kickPlayer(player.id)">Kick</button>
              </td>
            </tr>
            <tr v-if="players.length === 0">
              <td colspan="5" class="text-center py-8 opacity-50">No players connected</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
