import { defineStore } from 'pinia'
import io from 'socket.io-client'

export const useGameStore = defineStore('game', {
    state: () => ({
        socket: null,
        connected: false,
        isAdmin: false,
        phase: 'LOBBY', // LOBBY, DAY, VOTING, NIGHT
        players: [], // List of players (filtered if public, full if admin)
        myId: null,
        myRole: 'Disciple', // Default, updated via socket
        lastActionMessage: '', // For feedback (e.g., "Miraculously Saved")
        voteResult: null, // Store the result of the vote
        currentTask: '', // Store the daily task
        angelRequests: [], // [sessionId, {targetId, message, approved}]
    }),

    actions: {
        initSocket() {
            if (this.socket) return;

            this.socket = io();

            this.socket.on('connect', () => {
                this.connected = true;
                // Try to reconnect if we have a session
                const sessionId = localStorage.getItem('sessionId');
                if (sessionId) {
                    this.myId = sessionId;
                    this.socket.emit('join_game', { sessionId });
                }
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                this.myId = null;
                this.myRole = 'Disciple';
                this.isAdmin = false;
                this.phase = 'LOBBY';
                this.players = [];
                this.voteResult = null;
                this.currentTask = '';
                this.privateMessage = '';
                this.angelRequests = [];
            });

            this.socket.on('state_update', (state) => {
                // Handle both old format (array) and new format (object with phase)
                if (Array.isArray(state)) {
                    this.players = state;
                } else {
                    this.players = state.players;
                    this.phase = state.phase;
                    this.angelRequests = state.angelRequests || [];
                }
            });

            this.socket.on('role_update', (role) => {
                this.myRole = role;
            });

            this.socket.on('admin_state_update', (state) => {
                if (this.isAdmin) {
                    if (Array.isArray(state)) {
                        this.players = state;
                    } else {
                        this.players = state.players;
                        this.phase = state.phase;
                        this.angelRequests = state.angelRequests || [];
                    }
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

            this.socket.on('private_message', (msg) => {
                this.privateMessage = msg;
            });

            this.socket.on('angel_request_approved', () => {
                // Feedback for the Angel
                alert("Your prayer has been heard and approved.");
            });
        },

        joinGame(name) {
            if (this.socket) {
                // Generate a session ID if one doesn't exist
                let sessionId = localStorage.getItem('sessionId');
                if (!sessionId) {
                    sessionId = this.generateUUID();
                    localStorage.setItem('sessionId', sessionId);
                }
                this.myId = sessionId;
                this.socket.emit('join_game', { name, sessionId });
            }
        },

        generateUUID() {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        loginAdmin() {
            if (this.socket) {
                this.socket.emit('admin_login');
                this.isAdmin = true;
            }
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

        // Advanced Actions
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
        }
    }
})
