import { defineStore } from 'pinia'
import io from 'socket.io-client'

import router from '../router'

export const useGameStore = defineStore('game', {
    state: () => ({
        socket: null,
        connected: false,
        joined: !!localStorage.getItem('roomCode'), // Optimistic join
        isAdmin: false,
        roomCode: localStorage.getItem('roomCode') || null,
        token: localStorage.getItem('token') || null,
        authError: '',
        roomError: '',
        userRooms: [], // NEW

        phase: 'LOBBY',
        players: [],
        myId: null,
        myRole: 'Disciple',
        lastActionMessage: '',
        voteResult: null,
        currentTask: '',
        teammates: [],
        angelRequests: [],
        angelRequestApproved: false,
        angelRequestStatus: null,
        angelRequestApproved: false,
        angelRequestStatus: null,
        protectedTargetName: '',
        tasks: { Disciple: [], Prophet: [] }, // NEW
        timer: { active: false, remaining: 0 }, // NEW
        pollingInterval: null, // NEW
    }),

    actions: {
        initSocket() {
            if (this.socket) return;

            this.socket = io();

            this.socket.on('connect', () => {
                this.connected = true;
                if (this.token && this.roomCode) {
                    console.log('Auto-rejoining room:', this.roomCode);
                    this.socket.emit('join_room', { token: this.token, roomCode: this.roomCode });
                } else if (this.token) {
                    this.fetchUserRooms();
                }
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                this.joined = false;
                this.isAdmin = false;
                this.roomCode = null;
            });

            this.socket.on('error', (msg) => {
                this.roomError = msg;
                if (msg === 'Room not found' || msg === 'Auth required') {
                    this.leaveGame();
                    router.push({ name: 'dashboard' });
                }
            });

            this.socket.on('user_rooms_update', (rooms) => {
                this.userRooms = rooms;
            });

            // Auth Results
            this.socket.on('register_result', (res) => {
                if (res.success) {
                    this.token = res.token;
                    localStorage.setItem('token', res.token);
                    this.myId = res.userId;
                    this.authError = '';
                } else {
                    this.authError = res.message;
                }
            });

            this.socket.on('login_result', (res) => {
                if (res.success) {
                    this.token = res.token;
                    localStorage.setItem('token', res.token);
                    this.myId = res.userId;
                    this.authError = '';
                } else {
                    this.authError = res.message;
                }
            });

            // Room Results
            this.socket.on('room_joined', (data) => {
                this.roomCode = data.roomCode;
                localStorage.setItem('roomCode', data.roomCode);
                this.isAdmin = data.isHost;
                this.myId = data.playerId;
                this.myRole = data.role || 'Disciple';
                this.joined = true;
                this.roomError = '';
            });

            this.socket.on('force_rejoin', () => {
                console.log('Force rejoin (Invalid Token)');
                this.logout();
            });

            this.socket.on('state_update', (state) => {
                if (Array.isArray(state)) {
                    this.players = state;
                } else {
                    this.players = state.players;
                    this.phase = state.phase;
                    this.angelRequests = state.angelRequests || [];
                }

                if (this.myId) {
                    const me = this.players.find(p => p.id === this.myId);
                    if (me && me.role !== 'Unknown') {
                        this.myRole = me.role;
                    }
                }
            });

            this.socket.on('role_update', (role) => {
                this.myRole = role;
            });

            this.socket.on('admin_state_update', (state) => {
                if (this.isAdmin) {
                    this.players = state.players;
                    this.phase = state.phase;
                    this.angelRequests = state.angelRequests || [];
                    this.roomCode = state.roomCode;
                    this.timerConfig = state.timerConfig; // Update timerConfig
                    this.roleQuotas = state.roleQuotas;   // Update roleQuotas
                    this.tasks = state.tasks || { Disciple: [], Prophet: [] }; // Update Tasks
                    if (state.timer !== undefined) {
                        this.timer.remaining = state.timer;
                        this.timer.active = state.timer > 0;
                    }
                }
            });

            this.socket.on('timer_update', (remaining) => {
                this.timer.remaining = remaining;
                this.timer.active = remaining > 0;
            });

            this.socket.on('action_result', (result) => {
                if (this.isAdmin) {
                    this.lastActionMessage = result.message;
                    setTimeout(() => this.lastActionMessage = '', 5000);
                }
            });

            this.socket.on('vote_result', (result) => {
                this.voteResult = result;
            });

            this.socket.on('task_update', (task) => {
                this.currentTask = task;
            });

            this.socket.on('teammates_update', (teammates) => {
                this.teammates = teammates;
            });

            this.socket.on('private_message', (msg) => {
                alert(msg);
            });

            this.socket.on('angel_request_approved', (targetName) => {
                this.angelRequestApproved = true;
                this.angelRequestStatus = 'APPROVED';
                this.protectedTargetName = targetName;
                // alert(`Your prayer has been heard. You are protecting ${targetName}.`);
            });

            this.socket.on('angel_request_rejected', () => {
                this.angelRequestApproved = false;
                this.angelRequestStatus = 'REJECTED';
                this.protectedTargetName = '';
            });

            this.socket.on('kicked', () => {
                alert('You have been kicked from the game.');
                this.leaveGame();
                router.push({ name: 'dashboard' });
            });
        },

        register(username, password) {
            if (this.socket) {
                this.socket.emit('register', { username, password });
            }
        },

        login(username, password) {
            if (this.socket) {
                this.socket.emit('login', { username, password });
            }
        },

        hostGame() {
            if (this.socket && this.token) {
                this.roomError = '';
                this.socket.emit('host_game', { token: this.token });
            }
        },

        joinRoom(roomCode) {
            if (this.socket && this.token) {
                this.roomError = '';
                this.socket.emit('join_room', { token: this.token, roomCode });
            }
        },

        logout() {
            this.token = null;
            localStorage.removeItem('token');
            this.leaveGame();
            this.authError = '';
        },

        // ... rest of actions

        loginAdmin() {
        },

        setPhase(phase) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_set_phase', phase);
            }
        },

        castVote(targetId) {
            if (this.socket) {
                this.socket.emit('action_vote', targetId);
            }
        },

        submitNightAction(type, targetId, payload) {
            if (this.socket) {
                this.socket.emit('action_night_action', { type, targetId, payload });
            }
        },

        submitAngelRequest(targetId, message) {
            if (this.socket) {
                this.socket.emit('action_angel_request', { targetId, message });
            }
        },

        approveAngelRequest(targetSessionId) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_angel_approve', targetSessionId);
            }
        },



        requestTask() {
            if (this.socket) {
                this.socket.emit('request_task');
            }
        },

        toggleTask(playerId) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_toggle_task', playerId);
            }
        },

        killPlayer(playerId) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_kill', playerId);
            }
        },

        revivePlayer(playerId) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_revive', playerId);
            }
        },

        setRole(playerId, role) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_set_role', { playerId, role });
            }
        },

        setTimerConfig(config) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_set_timer_config', config);
            }
        },

        setRoleQuotas(quotas) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_set_role_quotas', quotas);
            }
        },

        manageTask(action, role, content) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_manage_task', { action, role, content });
            }
        },

        autoAssignRoles() {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_auto_assign_roles');
            }
        },

        kickPlayer(playerId) {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_kick_player', playerId);
            }
        },

        submitAngelRequest(targetId, message) {
            this.socket.emit('action_angel_request', { targetId, message });
            this.angelRequestStatus = 'PENDING';
        },

        approveAngelRequest(angelId) {
            this.socket.emit('action_angel_approve', angelId);
        },

        rejectAngelRequest(angelId) {
            this.socket.emit('action_angel_reject', angelId);
        },

        fetchUserRooms() {
            if (this.socket && this.token) {
                this.socket.emit('get_user_rooms', { token: this.token });
            }
        },

        deleteRoom(roomCode) {
            if (this.socket && this.token) {
                this.socket.emit('delete_room', { token: this.token, roomCode });
            }
        },

        leaveGame() {
            this.stopPolling();
            this.joined = false;
            this.isAdmin = false;
            this.roomCode = null;
            localStorage.removeItem('roomCode');
            this.roomError = '';
            this.players = [];
            this.phase = 'LOBBY';
            // We don't disconnect socket, just clear game state
        },

        requestStateSync() {
            if (this.socket && this.connected) {
                this.socket.emit('request_state_sync');
            }
        },

        startPolling() {
            if (this.pollingInterval) clearInterval(this.pollingInterval);
            this.pollingInterval = setInterval(() => {
                this.requestStateSync();
            }, 5000);
        },

        stopPolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        }
    }
})
