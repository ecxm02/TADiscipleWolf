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
        privateMessage: '', // Store private messages (e.g. Prophet vision)
    }),

    actions: {
        initSocket() {
            if (this.socket) return;

            this.socket = io();

            this.socket.on('connect', () => {
                this.connected = true;
                this.myId = this.socket.id;
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
            });

            this.socket.on('state_update', (state) => {
                // Handle both old format (array) and new format (object with phase)
                if (Array.isArray(state)) {
                    this.players = state;
                } else {
                    this.players = state.players;
                    this.phase = state.phase;
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
                        // Could also store votes here if needed
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
        },

        joinGame(name) {
            if (this.socket) {
                this.socket.emit('join_game', name);
            }
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
