<script setup>
import { ref, onMounted } from 'vue'
import io from 'socket.io-client'

const socket = io()
const message = ref('')
const status = ref('Disconnected')

onMounted(() => {
  socket.on('connect', () => {
    status.value = 'Connected: ' + socket.id
  })

  socket.on('pong', (data) => {
    message.value = data.message
  })

  socket.on('disconnect', () => {
    status.value = 'Disconnected'
  })
})

const sendPing = () => {
  socket.emit('ping')
}
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold underline mb-4">
      Disciples & Spirits
    </h1>
    <div class="card w-96 bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Socket Test</h2>
        <p>Status: {{ status }}</p>
        <p v-if="message">Server says: {{ message }}</p>
        <div class="card-actions justify-end">
          <button class="btn btn-primary" @click="sendPing">Send Ping</button>
        </div>
      </div>
    </div>
  </div>
</template>
