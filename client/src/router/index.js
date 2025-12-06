import { createRouter, createWebHistory } from 'vue-router'
import PlayerView from '../views/PlayerView.vue'
import AdminView from '../views/AdminView.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import { useGameStore } from '../stores/gameStore'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'player',
            component: PlayerView
        },
        {
            path: '/admin',
            name: 'admin',
            component: AdminView
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: DashboardView
        }
    ]
})

router.beforeEach((to, from, next) => {
    const gameStore = useGameStore()
    const isAuthenticated = !!gameStore.token;
    const isJoined = gameStore.joined;

    // 1. If not authenticated, force login
    if (to.name !== 'login' && !isAuthenticated) {
        next({ name: 'login' });
        return;
    }

    // 2. If authenticated and trying to go to login, go to dashboard
    if (to.name === 'login' && isAuthenticated) {
        next({ name: 'dashboard' });
        return;
    }

    // 3. If authenticated but not joined, force dashboard (unless already there)
    if (isAuthenticated && !isJoined && to.name !== 'dashboard') {
        next({ name: 'dashboard' });
        return;
    }

    // 4. If joined, allow player/admin
    if (isJoined) {
        if (to.name === 'dashboard') {
            // If joined and trying to go to dashboard, redirect to game
            if (gameStore.isAdmin) next({ name: 'admin' });
            else next({ name: 'player' });
            return;
        }
        // Allow navigation to player/admin
        next();
        return;
    }

    next();
})

export default router
