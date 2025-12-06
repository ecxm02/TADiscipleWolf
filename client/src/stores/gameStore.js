import { defineStore } from 'pinia'
import io from 'socket.io-client'

import router from '../router'

export const useGameStore = defineStore('game', {
    state: () => ({
        socket: null,
        connected: false,
        joined: false,
        isAdmin: false,
        roomCode: null,
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
        protectedTargetName: '',
    }),

    actions: {
        initSocket() {
            if (this.socket) return;

            this.socket = io();

            this.socket.on('connect', () => {
                this.connected = true;
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                this.joined = false;
                this.isAdmin = false;
                this.roomCode = null;
            });

            this.socket.on('error', (msg) => {
                this.roomError = msg;
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
                this.isAdmin = data.isHost;
                this.myId = data.playerId;
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
                    if (me) {
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
                }
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
                this.protectedTargetName = targetName;
                alert(`Your prayer has been heard. You are protecting ${targetName}.`);
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
            this.joined = false;
            this.myId = null;
            this.isAdmin = false;
            this.roomCode = null;
            this.roomError = '';
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

        resolveNight() {
            if (this.socket && this.isAdmin) {
                this.socket.emit('action_resolve_night');
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
            this.joined = false;
            this.isAdmin = false;
            this.roomCode = null;
            this.roomError = '';
            this.players = [];
            this.phase = 'LOBBY';
            // We don't disconnect socket, just clear game state
        }
    }
})
