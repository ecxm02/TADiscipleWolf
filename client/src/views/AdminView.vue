<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()

onMounted(() => {
  gameStore.loginAdmin()
  // gameStore.startPolling()
})

onUnmounted(() => {
  // gameStore.stopPolling()
})

const players = computed(() => gameStore.players)
const currentPhase = computed(() => gameStore.phase)
const dayNumber = computed(() => gameStore.dayNumber)
const timer = computed(() => gameStore.timer)
const roleQuotas = computed(() => gameStore.roleQuotas)
const timerConfig = computed(() => gameStore.timerConfig)
const roomCode = computed(() => gameStore.roomCode)

// Local state for edits
const localQuotas = ref({...roleQuotas.value})
const localTimerConfig = ref({...timerConfig.value})

// Sync local state when store updates
// Sync local state when store updates
watch(roleQuotas, (newVal, oldVal) => {
    // Only update local if the store value ACTUALLY changed on the server
    // not just a re-emit of the same data
    if (newVal && JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
        localQuotas.value = {...newVal}
    }
}, { deep: true })

watch(timerConfig, (newVal, oldVal) => {
    if (newVal && JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
        localTimerConfig.value = {...newVal}
    }
}, { deep: true })

const setPhase = (phase) => {
    gameStore.setPhase(phase)
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
    gameStore.autoAssignRoles()
}

const updateTimerConfig = () => {
    gameStore.setTimerConfig(localTimerConfig.value)
}

const roles = ['Disciple', 'Angel', 'Prophet', 'Evil Spirit'];

const canEditRoles = computed(() => {
    return currentPhase === 'LOBBY' || currentPhase === 'NIGHT';
})

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const angelRequests = computed(() => gameStore.angelRequests)

const getAngelRequest = (angelId) => {
    if (!gameStore.angelRequests) return null;
    const entry = gameStore.angelRequests.find(([id, req]) => id === angelId);
    return entry ? entry[1] : null;
}

const approveRequest = (id) => {
    gameStore.approveAngelRequest(id)
}

const rejectRequest = (id) => {
    gameStore.rejectAngelRequest(id)
}

// Task Management
const tasks = computed(() => gameStore.tasks)
const newDiscipleTask = ref('')
const newProphetTask = ref('')

const addTask = (role) => {
    const content = role === 'Disciple' ? newDiscipleTask.value : newProphetTask.value
    if (!content.trim()) return
    
    gameStore.manageTask('ADD', role, content)
    
    if (role === 'Disciple') newDiscipleTask.value = ''
    else newProphetTask.value = ''
}

const removeTask = (role, content) => {
    if (confirm('Delete this task?')) {
        gameStore.manageTask('REMOVE', role, content)
    }
}

import { useRouter } from 'vue-router';
const router = useRouter();

const returnToDashboard = () => {
    gameStore.leaveGame();
    router.push({ name: 'dashboard' });
};
</script>

<template>
  <div class="min-h-screen bg-base-200 p-8">
    <div class="max-w-6xl mx-auto">
      
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold">Game Master Control</h1>
            <div class="text-xl opacity-70">Day {{ dayNumber }}</div>
            <div class="mt-2">
                <span class="badge badge-lg badge-primary font-mono text-xl p-4">Room: {{ roomCode }}</span>
            </div>
        </div>
        
        <div class="flex gap-4 items-center">
            <button class="btn btn-sm btn-ghost" @click="returnToDashboard">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Dashboard
            </button>
            
            <!-- Timer Display -->
            <div v-if="timer && timer.active" class="badge badge-lg badge-accent font-mono text-xl p-4">
                {{ formatTime(timer.remaining) }}
            </div>

            <div class="badge badge-lg p-4 font-bold">{{ currentPhase }} {{ dayNumber > 0 ? dayNumber : '' }}</div>
            
            <div class="join">
                <button v-if="currentPhase === 'LOBBY'" class="btn join-item btn-primary" @click="setPhase('DAY')">Start Day 1</button>
                
                <!-- Day Phase Controls -->
                <button v-if="currentPhase === 'DAY'" class="btn join-item btn-warning" @click="setPhase('VOTING')">End Day (Start Vote)</button>
                
                <!-- Voting Phase Controls -->
                <button v-if="currentPhase === 'VOTING'" class="btn join-item btn-outline" @click="setPhase('DAY')">Back to Day</button>
                <button v-if="currentPhase === 'VOTING'" class="btn join-item btn-error" @click="setPhase('NIGHT')">End Vote (Start Night)</button>
                
                <!-- Night Phase Controls -->
                <button v-if="currentPhase === 'NIGHT'" class="btn join-item btn-outline" @click="setPhase('VOTING')">Back</button>
                <button v-if="currentPhase === 'NIGHT'" class="btn join-item btn-success" @click="setPhase('DAY')">Start Next Day</button>
                
                <!-- Reset Option -->
                <button v-if="currentPhase === 'NIGHT'" class="btn join-item btn-ghost" @click="setPhase('LOBBY')">Reset to Lobby</button>
            </div>
        </div>
      </div>

      <!-- Result Card -->
      <div v-if="(currentPhase === 'NIGHT' || currentPhase === 'RESULTS') && gameStore.voteResult" class="card bg-base-100 shadow-xl mb-6 border-l-4 border-primary">
        <div class="card-body">
            <h3 class="card-title text-primary">Night Report</h3>
            <div class="whitespace-pre-wrap font-mono bg-base-200 p-4 rounded-lg">{{ gameStore.voteResult.result }}</div>
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
                          <div v-for="role in roles.filter(r => r !== 'Disciple')" :key="role" class="form-control">
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

              <div class="divider"></div>

              <!-- Task Management -->
               <div>
                   <h3 class="font-bold mb-4">Task Management</h3>
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <!-- Disciple Tasks -->
                       <div>
                           <h4 class="font-bold text-sm mb-2">Disciple Tasks</h4>
                           <div class="flex gap-2 mb-2">
                               <input v-model="newDiscipleTask" type="text" placeholder="New Task..." class="input input-sm input-bordered flex-1" @keyup.enter="addTask('Disciple')">
                               <button class="btn btn-sm btn-success" @click="addTask('Disciple')">Add</button>
                           </div>
                           <div class="h-48 overflow-y-auto bg-base-200 rounded p-2 text-xs">
                               <div v-for="(task, idx) in tasks.Disciple" :key="idx" class="flex justify-between items-start mb-1 hover:bg-base-300 p-1 rounded group">
                                   <span>{{ task }}</span>
                                   <button class="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100" @click="removeTask('Disciple', task)">×</button>
                               </div>
                           </div>
                       </div>

                       <!-- Prophet Questions -->
                       <div>
                           <h4 class="font-bold text-sm mb-2">Prophet Questions</h4>
                           <div class="flex gap-2 mb-2">
                               <input v-model="newProphetTask" type="text" placeholder="New Question..." class="input input-sm input-bordered flex-1" @keyup.enter="addTask('Prophet')">
                               <button class="btn btn-sm btn-success" @click="addTask('Prophet')">Add</button>
                           </div>
                           <div class="h-48 overflow-y-auto bg-base-200 rounded p-2 text-xs">
                               <div v-for="(task, idx) in tasks.Prophet" :key="idx" class="flex justify-between items-start mb-1 hover:bg-base-300 p-1 rounded group">
                                   <span>{{ task }}</span>
                                   <button class="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100" @click="removeTask('Prophet', task)">×</button>
                               </div>
                           </div>
                       </div>
                   </div>
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
                <select 
                    class="select select-bordered select-xs w-full max-w-xs" 
                    :value="player.role"
                    @change="e => setRole(player.id, e.target.value)"
                    :disabled="!canEditRoles"
                >
                    <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
                </select>
              </td>
              <td>
                <div class="badge" :class="player.alive ? 'badge-success' : 'badge-error'">
                  {{ player.alive ? 'Alive' : 'Dead' }}
                </div>
              </td>
              <td>
                <div v-if="player.role !== 'Angel'">
                    <div v-if="player.role === 'Evil Spirit'">
                        <span class="text-xs font-bold text-error">Evil Spirit</span>
                        <div class="text-xs mt-1 italic opacity-70">{{ player.currentTask }}</div>
                    </div>
                    <div v-else>
                        <label class="cursor-pointer label justify-start gap-2">
                        <input 
                            type="checkbox" 
                            class="checkbox checkbox-primary" 
                            :checked="player.taskCompleted"
                            @change="toggleTask(player.id)"
                        />
                        <span class="label-text" :class="{'text-success font-bold': player.taskCompleted}">
                            {{ player.taskCompleted ? 'Verified' : 'Pending' }}
                        </span>
                        </label>
                        <div class="text-xs mt-1 italic opacity-70">{{ player.currentTask }}</div>
                    </div>
                </div>
                <div v-else>
                    <!-- Angel Request UI -->
                    <div v-if="getAngelRequest(player.id)">
                        <div class="text-xs font-bold mb-1">
                            Protecting: {{ getAngelRequest(player.id).targetName }}
                        </div>
                        <div class="text-xs italic opacity-75 mb-2">
                            "{{ getAngelRequest(player.id).message }}"
                        </div>
                        
                        <div v-if="getAngelRequest(player.id).status === 'PENDING'" class="flex gap-1">
                            <button @click="approveRequest(player.id)" class="btn btn-xs btn-success">Approve</button>
                            <button @click="rejectRequest(player.id)" class="btn btn-xs btn-error">Reject</button>
                        </div>
                        <div v-else>
                            <span v-if="getAngelRequest(player.id).status === 'APPROVED'" class="badge badge-success badge-xs">Approved</span>
                            <span v-if="getAngelRequest(player.id).status === 'REJECTED'" class="badge badge-error badge-xs">Rejected</span>
                        </div>
                    </div>
                    <div v-else class="text-xs opacity-50">
                        No Prayer Yet
                    </div>
                </div>
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
