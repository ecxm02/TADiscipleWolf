<template>
    <div class="dashboard-container">
        <div class="card">
            <h2>Welcome, {{ username }}</h2>
            
            <div class="actions">
                <div class="action-group">
                    <h3>Host a Game</h3>
                    <p>Create a new room and become the admin.</p>
                    <button @click="hostGame" class="btn-primary">Host Game</button>
                </div>

                <div class="divider">OR</div>

                <div class="action-group">
                    <h3>Join a Game</h3>
                    <p>Enter the 4-digit room code.</p>
                    <div class="join-input">
                        <input v-model="roomCode" type="text" placeholder="Code (e.g. 1234)" maxlength="4" @keyup.enter="joinGame" />
                        <button @click="joinGame" class="btn-secondary" :disabled="!roomCode">Join</button>
                    </div>
                </div>
            </div>

            <!-- Active Games List -->
            <div v-if="gameStore.userRooms.length > 0" class="active-games">
                <div class="divider">YOUR GAMES</div>
                
                <div class="games-list">
                    <div v-for="room in gameStore.userRooms" :key="room.roomCode" class="game-item">
                        <div class="game-info">
                            <span class="room-code">Room {{ room.roomCode }}</span>
                            <span class="game-role" :class="room.isHost ? 'role-host' : 'role-player'">
                                {{ room.isHost ? 'HOST' : 'PLAYER' }}
                            </span>
                        </div>
                        <div class="game-actions">
                            <button @click="rejoinGame(room.roomCode)" class="btn-sm btn-success">
                                Rejoin
                            </button>
                            <button v-if="room.isHost" @click="deleteRoom(room.roomCode)" class="btn-sm btn-danger">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="error || gameStore.roomError" class="error-message">
                {{ error || gameStore.roomError }}
            </div>
            
            <button @click="logout" class="btn-text">Logout</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useRouter } from 'vue-router';
import { jwtDecode } from "jwt-decode";

const gameStore = useGameStore();
const router = useRouter();
const roomCode = ref('');
const error = ref('');
const username = ref('');

onMounted(() => {
    if (gameStore.token) {
        try {
            const decoded = jwtDecode(gameStore.token);
            username.value = decoded.username;
            gameStore.fetchUserRooms(); // Fetch rooms on load
        } catch (e) {
            username.value = 'Player';
        }
    }
});

const hostGame = () => {
    error.value = '';
    gameStore.hostGame();
};

const joinGame = () => {
    error.value = '';
    if (roomCode.value.length !== 4) {
        error.value = 'Please enter a valid 4-digit code.';
        return;
    }
    gameStore.joinRoom(roomCode.value);
};

const rejoinGame = (code) => {
    gameStore.joinRoom(code);
};

const deleteRoom = (code) => {
    if (confirm(`Are you sure you want to delete Room ${code}? This cannot be undone.`)) {
        gameStore.deleteRoom(code);
    }
};

const logout = () => {
    gameStore.logout();
    router.push('/login');
};

// Watch for join success
watch(() => gameStore.joined, (newVal) => {
    if (newVal) {
        if (gameStore.isAdmin) {
            router.push({ name: 'admin' });
        } else {
            router.push({ name: 'player' });
        }
    }
});
</script>

<style scoped>
.dashboard-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #1a1a1a;
    color: white;
    padding: 2rem;
}

.card {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 8px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    text-align: center;
}

h2 {
    margin-bottom: 2rem;
    color: #e0e0e0;
}

.actions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.action-group {
    background: #333;
    padding: 1.5rem;
    border-radius: 6px;
}

h3 {
    margin-bottom: 0.5rem;
    color: #fff;
}

p {
    color: #aaa;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.divider {
    display: flex;
    align-items: center;
    color: #666;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 1.5rem 0;
}

.divider::before, .divider::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #444;
}

.divider::before { margin-right: 1rem; }
.divider::after { margin-left: 1rem; }

.join-input {
    display: flex;
    gap: 0.5rem;
}

input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #444;
    background: #222;
    color: white;
    border-radius: 4px;
    font-size: 1rem;
    text-align: center;
    letter-spacing: 2px;
}

.btn-primary {
    width: 100%;
    padding: 0.75rem;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
}

.btn-primary:hover { background: #357abd; }

.btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #444;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
}

.btn-secondary:hover { background: #555; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-text {
    background: none;
    border: none;
    color: #666;
    margin-top: 2rem;
    cursor: pointer;
    text-decoration: underline;
}

.error-message {
    color: #ff6b6b;
    margin-top: 1rem;
}

/* Active Games Styles */
.active-games {
    margin-top: 1rem;
}

.games-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.game-item {
    background: #333;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.game-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.room-code {
    font-family: monospace;
    font-size: 1.1rem;
    font-weight: bold;
    color: #fff;
}

.game-role {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
}

.role-host {
    background: #4a90e2;
    color: white;
}

.role-player {
    background: #666;
    color: white;
}

.game-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-sm {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    color: white;
}

.btn-success { background: #2ecc71; }
.btn-success:hover { background: #27ae60; }

.btn-danger { background: #e74c3c; }
.btn-danger:hover { background: #c0392b; }
</style>
