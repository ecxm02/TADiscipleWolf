const players = new Map();
const socketMap = new Map(); // socketId -> sessionId
let currentPhase = 'LOBBY'; // LOBBY, DAY, VOTING, NIGHT, RESULTS
let dayNumber = 0;
const votes = new Map(); // voterId -> targetId
const nightActions = new Map(); // playerId -> { type, targetId, payload }
const angelRequests = new Map(); // playerId -> { targetId, targetName, message, approved }

// Advanced Features State
let timerConfig = {
    DAY: 300, // 5 minutes
    VOTING: 60, // 1 minute
    NIGHT: 0, // Manual
    RESULTS: 30 // Manual/Auto
};
let timerState = {
    active: false,
    duration: 0,
    remaining: 0,
    intervalId: null
};
let roleQuotas = {
    'Angel': 0,
    'Prophet': 0,
    'Evil Spirit': 0
};

// Helper to get random integer
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const TASKS = require('../tasks');

const gameService = {
    addPlayer(socketId, name, sessionId) {
        // Map socket to session
        socketMap.set(socketId, sessionId);

        if (!players.has(sessionId)) {
            players.set(sessionId, {
                id: sessionId, // Use sessionId as the player ID
                name: name || `Player ${sessionId.substr(0, 4)}`,
                role: 'Disciple', // Default role
                alive: true,
                taskCompleted: false,
                protected: false, // Angel protection
                online: true,
                socketId: socketId, // Track current socket
                currentTask: '' // Initialize current task
            });
        } else {
            // Reconnection
            const player = players.get(sessionId);
            player.online = true;
            player.socketId = socketId;
            // Update name if provided and different (allows renaming from generic)
            if (name && name !== player.name) {
                player.name = name;
            }
        }
        return players.get(sessionId);
    },

    removePlayer(socketId) {
        // Soft disconnect
        const sessionId = socketMap.get(socketId);
        if (sessionId) {
            const player = players.get(sessionId);
            if (player) {
                player.online = false;
            }
            socketMap.delete(socketId);
        }
    },

    kickPlayer(playerId) {
        // Hard remove
        if (players.has(playerId)) {
            const player = players.get(playerId);
            // Remove from socket map if online
            if (player.socketId) {
                socketMap.delete(player.socketId);
            }
            players.delete(playerId);
            return true;
        }
        return false;
    },

    getPlayer(id) {
        // Check if id is a socketId
        if (socketMap.has(id)) {
            return players.get(socketMap.get(id));
        }
        // Otherwise assume it's a sessionId
        return players.get(id);
    },

    getAllPlayers() {
        return Array.from(players.values());
    },

    getTask(role, day) {
        // Angels do not get tasks
        if (role === 'Angel') {
            return "Your role does not have a daily task.";
        }

        // Evil Spirits get Disciple tasks to blend in
        let targetRole = role;
        if (role === 'Evil Spirit') {
            targetRole = 'Disciple';
        }

        const roleTasks = TASKS[targetRole] || TASKS['Disciple'];
        // Random task selection
        const randomIndex = Math.floor(Math.random() * roleTasks.length);
        return roleTasks[randomIndex];
    },

    getTeammates(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) return [];

        const allowedRoles = ['Evil Spirit', 'Angel'];
        if (!allowedRoles.includes(player.role)) return [];

        const teammates = [];
        for (const p of players.values()) {
            if (p.id !== player.id && p.role === player.role) {
                teammates.push(p.name);
            }
        }
        return teammates;
    },

    getPublicState() {
        return {
            phase: currentPhase,
            dayNumber: dayNumber,
            timer: timerState.remaining,
            players: Array.from(players.values()).map(p => ({
                id: p.id,
                name: p.name,
                alive: p.alive,
                taskCompleted: p.taskCompleted,
                role: p.alive ? 'Unknown' : p.role,
                online: p.online
            }))
        };
    },

    getAdminState() {
        return {
            phase: currentPhase,
            dayNumber: dayNumber,
            timer: timerState.remaining,
            timerConfig: timerConfig,
            roleQuotas: roleQuotas,
            votes: Array.from(votes.entries()),
            nightActions: Array.from(nightActions.entries()),
            players: Array.from(players.values()),
            angelRequests: Array.from(angelRequests.entries())
        };
    },

    setPhase(phase, io) {
        if (['LOBBY', 'DAY', 'VOTING', 'NIGHT', 'RESULTS'].includes(phase)) {
            const previousPhase = currentPhase;
            currentPhase = phase;

            // Stop any existing timer
            this.stopTimer();

            if (phase === 'DAY') {
                dayNumber++;
                // Reset daily states and assign tasks
                players.forEach(p => {
                    p.taskCompleted = false;
                    p.protected = false;
                    p.currentTask = this.getTask(p.role, dayNumber);
                });
                nightActions.clear();
                angelRequests.clear();

                // Start Day Timer
                this.startTimer(timerConfig.DAY, io, () => {
                    this.setPhase('VOTING', io);
                    io.to('admin').emit('admin_state_update', this.getAdminState());
                    io.to('public').emit('state_update', this.getPublicState());
                });
            }
            if (phase === 'VOTING') {
                votes.clear();
                // Start Voting Timer
                this.startTimer(timerConfig.VOTING, io, () => {
                    // Transition to NIGHT automatically if timer ends
                    this.setPhase('NIGHT', io);
                    io.to('admin').emit('admin_state_update', this.getAdminState());
                    io.to('public').emit('state_update', this.getPublicState());
                });
            }
            if (phase === 'NIGHT') {
                // If coming from VOTING, resolve votes first
                if (previousPhase === 'VOTING') {
                    const voteResult = this.resolveVotes();

                    // Resolve Night Actions immediately with the vote result
                    const { publicResult, privateMessages } = this.resolveNightPhase(voteResult);

                    // Broadcast combined results
                    io.to('public').emit('vote_result', { result: publicResult });
                    io.to('admin').emit('action_result', { message: publicResult });

                    // Send private messages
                    for (const [playerId, message] of Object.entries(privateMessages)) {
                        io.to(playerId).emit('private_message', message);
                    }
                }

                // Start Night Timer (optional, or manual)
                // this.startTimer(timerConfig.NIGHT, io, ...);
            }

            // RESULTS phase is now merged into NIGHT/DAY transition logic visually, 
            // but we keep the code if needed for specific result screens.

            return true;
        }
        return false;
    },

    // --- Timer Logic ---
    startTimer(duration, io, onComplete) {
        if (duration <= 0) return;

        timerState.active = true;
        timerState.duration = duration;
        timerState.remaining = duration;

        // Emit initial timer state
        io.emit('timer_update', timerState.remaining);

        timerState.intervalId = setInterval(() => {
            timerState.remaining--;
            io.emit('timer_update', timerState.remaining);

            if (timerState.remaining <= 0) {
                this.stopTimer();
                if (onComplete) onComplete();
            }
        }, 1000);
    },

    stopTimer() {
        if (timerState.intervalId) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }
        timerState.active = false;
        timerState.remaining = 0;
    },

    setTimerConfig(config) {
        if (config.DAY) timerConfig.DAY = parseInt(config.DAY);
        if (config.VOTING) timerConfig.VOTING = parseInt(config.VOTING);
        if (config.NIGHT) timerConfig.NIGHT = parseInt(config.NIGHT);
        if (config.RESULTS) timerConfig.RESULTS = parseInt(config.RESULTS);
    },

    // --- Role Management ---
    setRoleQuotas(quotas) {
        roleQuotas = { ...roleQuotas, ...quotas };
    },

    autoAssignRoles() {
        const playerIds = Array.from(players.keys());
        const totalPlayers = playerIds.length;

        // Calculate total roles needed
        // Calculate total special roles
        let specialRolesCount = 0;
        for (const [role, count] of Object.entries(roleQuotas)) {
            specialRolesCount += parseInt(count);
        }

        if (specialRolesCount > totalPlayers) {
            return { success: false, message: `Special roles (${specialRolesCount}) exceed player count (${totalPlayers}).` };
        }

        // Create pool of roles
        let rolePool = [];
        // Add special roles
        for (const [role, count] of Object.entries(roleQuotas)) {
            for (let i = 0; i < count; i++) {
                rolePool.push(role);
            }
        }
        // Fill rest with Disciples
        const discipleCount = totalPlayers - specialRolesCount;
        for (let i = 0; i < discipleCount; i++) {
            rolePool.push('Disciple');
        }

        // Shuffle roles
        for (let i = rolePool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
        }

        // Assign
        playerIds.forEach((id, index) => {
            const player = players.get(id);
            player.role = rolePool[index];
        });

        return { success: true, message: 'Roles assigned successfully.' };
    },

    kickPlayer(id) {
        if (players.has(id)) {
            const name = players.get(id).name;
            const socketId = players.get(id).socketId;
            this.removePlayer(id);
            return { success: true, message: `${name} was kicked.`, kickedSocketId: socketId };
        }
        return { success: false, message: 'Player not found.' };
    },

    castVote(voterId, targetId) {
        if (currentPhase !== 'VOTING') return false;
        const voter = this.getPlayer(voterId);
        if (!voter || !voter.alive) return false;

        if (targetId === 'skip') {
            votes.set(voter.id, 'skip');
            return true;
        }

        const target = this.getPlayer(targetId);
        if (!target || !target.alive) return false;

        votes.set(voter.id, target.id);
        return true;
    },

    resolveVotes() {
        if (votes.size === 0) return { result: 'No votes cast.' };

        const tally = {};
        for (const targetId of votes.values()) {
            tally[targetId] = (tally[targetId] || 0) + 1;
        }

        let maxVotes = 0;
        let candidates = [];

        for (const [targetId, count] of Object.entries(tally)) {
            if (count > maxVotes) {
                maxVotes = count;
                candidates = [targetId];
            } else if (count === maxVotes) {
                candidates.push(targetId);
            }
        }

        if (candidates.length > 1 || candidates.includes('skip')) {
            return { result: 'Tie vote or Skip. No one was executed.' };
        }

        const victimId = candidates[0];
        const victim = players.get(victimId);
        if (victim) {
            victim.alive = false;
            return { result: `${victim.name} was executed by vote.` };
        }

        return { result: 'Error resolving execution.' };
    },

    registerNightAction(playerId, action) {
        // action: { type: 'KILL' | 'PROTECT' | 'CHECK', targetId, payload }
        // Allow actions in DAY or NIGHT
        if (currentPhase !== 'DAY' && currentPhase !== 'NIGHT') return false;

        const player = this.getPlayer(playerId);
        if (!player || !player.alive) return false;

        // Validate role
        if (action.type === 'KILL' && player.role !== 'Evil Spirit') return false;
        if (action.type === 'PROTECT' && player.role !== 'Angel') return false;
        if (action.type === 'CHECK' && player.role !== 'Prophet') return false;

        nightActions.set(player.id, action);
        return true;
    },

    resolveNightPhase(voteResult) {
        let resultMessage = "";
        const deaths = [];
        const checks = [];
        const privateMessages = {};

        // 0. Include Vote Result
        if (voteResult) {
            resultMessage += `\n[VOTE RESULT]\n${voteResult.result}\n`;
        }

        // 1. Apply Protection (Angel)
        for (const [pid, action] of nightActions) {
            if (action.type === 'PROTECT') {
                const target = players.get(action.targetId);
                if (target) {
                    target.protected = true;
                    // Notify protected player
                    privateMessages[target.id] = "You felt a divine presence watching over you. An Angel protected you.";
                }
            }
        }

        // 2. Resolve Kills (Evil Spirit)
        // Multiple spirits might target same or different.
        for (const [pid, action] of nightActions) {
            if (action.type === 'KILL') {
                const target = players.get(action.targetId);
                if (target && target.alive) {
                    let killSuccess = true;

                    // Angel Protection
                    if (target.protected) {
                        killSuccess = false;
                    }
                    // Faith Shield (Disciple + Task)
                    else if (target.role === 'Disciple' && target.taskCompleted) {
                        if (getRandomInt(1, 100) <= 50) {
                            killSuccess = false;
                            privateMessages[target.id] = "Your faith shielded you from an attack!";
                        }
                    }

                    if (killSuccess) {
                        target.alive = false;
                        if (!deaths.includes(target.name)) {
                            deaths.push(target.name);
                        }
                    }
                }
            }
        }

        // 3. Resolve Checks (Prophet)
        for (const [pid, action] of nightActions) {
            if (action.type === 'CHECK') {
                const prophet = players.get(pid);
                // Double check task completion just in case
                if (prophet.taskCompleted) {
                    const target = players.get(action.targetId);
                    if (target) {
                        privateMessages[pid] = `Prophet Vision: ${target.name} is a ${target.role}.`;
                    }
                } else {
                    privateMessages[pid] = `Prophet Vision: You did not complete your task, so your vision is clouded.`;
                }
            }
        }

        resultMessage += "\n[NIGHT REPORT]\n";
        if (deaths.length > 0) {
            resultMessage += `${deaths.join(', ')} was found dead.`;
        } else {
            resultMessage += "It was a peaceful night. No one died.";
        }

        return {
            publicResult: resultMessage,
            privateMessages: privateMessages
        };
    },

    toggleTask(id) {
        const player = players.get(id);
        if (player) {
            player.taskCompleted = !player.taskCompleted;
            return player;
        }
        return null;
    },

    killPlayer(targetId) {
        // Admin manual kill
        const player = players.get(targetId);
        if (!player) return { success: false, message: 'Player not found' };
        player.alive = false;
        return { success: true, message: `${player.name} was killed by GM.` };
    },

    revivePlayer(id) {
        const player = players.get(id);
        if (player) {
            player.alive = true;
            return player;
        }
        return null;
    },

    setRole(id, role) {
        const player = players.get(id);
        if (player) {
            player.role = role;
            return player;
        }
        return null;
    },

    submitAngelRequest(playerId, targetId, message) {
        const player = this.getPlayer(playerId);
        if (!player || player.role !== 'Angel' || !player.alive) return false;

        const target = this.getPlayer(targetId);
        if (!target) return false;

        angelRequests.set(player.id, {
            targetId: target.id,
            targetName: target.name,
            message: message,
            approved: false
        });
        return true;
    },

    approveAngelRequest(angelId) {
        if (angelRequests.has(angelId)) {
            const req = angelRequests.get(angelId);
            req.approved = true;

            // Convert to actual night action
            this.registerNightAction(angelId, {
                type: 'PROTECT',
                targetId: req.targetId
            });
            return true;
        }
        return false;
    }
};

module.exports = gameService;
