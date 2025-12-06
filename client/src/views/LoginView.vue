<template>
    <div class="login-container">
        <div class="card">
            <h2>{{ isRegistering ? 'Create Account' : 'Login' }}</h2>
            
            <form @submit.prevent="handleSubmit">
                <div class="form-group">
                    <label>Username</label>
                    <input v-model="username" type="text" required placeholder="Enter username" />
                </div>
                
                <div class="form-group">
                    <label>Password</label>
                    <input v-model="password" type="password" required placeholder="Enter password" />
                </div>

                <div v-if="gameStore.authError" class="error-message">
                    {{ gameStore.authError }}
                </div>

                <button type="submit" class="btn-primary">
                    {{ isRegistering ? 'Register' : 'Login' }}
                </button>
            </form>

            <p class="toggle-text">
                {{ isRegistering ? 'Already have an account?' : "Don't have an account?" }}
                <a href="#" @click.prevent="toggleMode">
                    {{ isRegistering ? 'Login here' : 'Register here' }}
                </a>
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useRouter } from 'vue-router';

const gameStore = useGameStore();
const router = useRouter();
const isRegistering = ref(false);
const username = ref('');
const password = ref('');

const toggleMode = () => {
    isRegistering.value = !isRegistering.value;
    gameStore.authError = '';
};

const handleSubmit = () => {
    if (isRegistering.value) {
        gameStore.register(username.value, password.value);
    } else {
        gameStore.login(username.value, password.value);
    }
};

// Redirect when token is present (authenticated)
watch(() => gameStore.token, (newVal) => {
    if (newVal) {
        router.push({ name: 'dashboard' });
    }
});
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #1a1a1a;
    color: white;
}

.card {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 8px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #e0e0e0;
}

.form-group {
    margin-bottom: 1rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    color: #aaa;
}

input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #444;
    background: #333;
    color: white;
    border-radius: 4px;
    font-size: 1rem;
}

input:focus {
    outline: none;
    border-color: #666;
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
    margin-top: 1rem;
}

.btn-primary:hover {
    background: #357abd;
}

.error-message {
    color: #ff6b6b;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    text-align: center;
}

.toggle-text {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
    color: #888;
}

.toggle-text a {
    color: #4a90e2;
    text-decoration: none;
}

.toggle-text a:hover {
    text-decoration: underline;
}
</style>
