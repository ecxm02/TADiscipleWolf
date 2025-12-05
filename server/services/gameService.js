const players = new Map();
let currentPhase = 'LOBBY'; // LOBBY, DAY, VOTING, NIGHT
let dayNumber = 0;
const votes = new Map(); // voterId -> targetId
const nightActions = new Map(); // playerId -> { type, targetId, payload }

// Advanced Features State
let timerConfig = {
    DAY: 300, // 5 minutes
    VOTING: 60, // 1 minute
    NIGHT: 0, // Manual
    RESULTS: 0 // Manual
};
let timerState = {
    active: false,
    duration: 0,
    remaining: 0,
    intervalId: null
};
let roleQuotas = {
    'Disciple': 0,
    'Angel': 0,
    'Prophet': 0,
    'Evil Spirit': 0
};

// Helper to get random integer
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const TASKS = {
    'Disciple': [
        "Day 1: Recite John 3:16, Psalm 23:1–2, or Galatians 5:22–23 to the GM.",
        "Day 2: Serve the Community. Prepare fruits/snacks in the kitchen.",
        "Day 3: Care for a Brother/Sister. Talk to someone in distress and pray for them.",
        "Day 4: Worship Task. Sing a short worship song to the GM.",
        "Day 5: Fellowship Blessing. Write a personalised encouragement letter.",
        "Day 6: Scripture Hunt. Exchange favourite verses with 3 players.",
        "Day 7: Act of Service. Help someone with a small task.",
        "Day 8: Kindness Challenge. Give 3 meaningful compliments."
    ],
    'Evil Spirit': [
        "Day 1: Deliver a note to the GM without being suspicious.",
        "Day 2: Memorise a short phrase and recite it to the GM.",
        "Day 3: Draw a cross on a piece of paper and show the GM.",
        "Day 4: Do a quick act of service that can be faked.",
        "Day 5: Help set up chairs or move items.",
        "Day 6: Pretend to exchange a verse with someone.",
        "Day 7: Carry an item for someone.",
        "Day 8: Compliment someone (can be generic)."
    ],
    'Prophet': [
        "Day 1: Memorise Psalm 121 and recite to GM.",
        "Day 2: Write a detailed encouragement letter to 2 players.",
        "Day 3: Complete 2 Disciple tasks instead of 1.",
        "Day 4: Have a short reflection with the GM on a Bible theme.",
        "Day 5: Pray for 3 players and write down what you prayed.",
        "Day 6: Draw a parable scene (e.g., The Lost Sheep).",
        "Day 7: Recite a short devotion to the GM.",
        "Day 8: Find 3 players and bless each with a verse."
    ],
    'Angel': [
        "Day 1: Write a prayer for protection.",
        "Day 2: Chat with a player to find out their needs.",
        "Day 3: Write a prayer for healing.",
        "Day 4: Write a prayer for wisdom.",
        "Day 5: Write a prayer for peace.",
        "Day 6: Write a prayer for faith.",
        "Day 7: Write a prayer for provision.",
        "Day 8: Write a prayer for unity."
    ]
};

const gameService = {
    addPlayer(id, name) {
        if (!players.has(id)) {
            players.set(id, {
                id,
                name: name || `Player ${id.substr(0, 4)}`,
                role: 'Disciple', // Default role
                alive: true,
                taskCompleted: false,
                protected: false, // Angel protection
            });
        }
        return players.get(id);
    },

    removePlayer(id) {
        players.delete(id);
        votes.delete(id);
        nightActions.delete(id);
    },

    getPlayer(id) {
        return players.get(id);
    },

    getAllPlayers() {
        return Array.from(players.values());
    },

    getTask(role, day) {
        const roleTasks = TASKS[role] || TASKS['Disciple'];
        const index = (day - 1) % roleTasks.length;
        return roleTasks[index];
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
            players: Array.from(players.values())
        };
    },

    setPhase(phase, io) {
        if (['LOBBY', 'DAY', 'VOTING', 'NIGHT'].includes(phase)) {
            currentPhase = phase;

            // Stop any existing timer
            this.stopTimer();

            if (phase === 'DAY') {
                dayNumber++;
                // Reset daily states
                players.forEach(p => {
                    p.taskCompleted = false;
                    p.protected = false;
                });
                nightActions.clear();

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
                    this.setPhase('NIGHT', io);
                    io.to('admin').emit('admin_state_update', this.getAdminState());
                    io.to('public').emit('state_update', this.getPublicState());
                });
            }
            if (phase === 'NIGHT') {
                // Start Night Timer (optional, or just wait for manual resolve)
                // For now, we rely on auto-resolve trigger in socketController or manual
            }

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
        let totalQuotas = 0;
        for (const count of Object.values(roleQuotas)) {
            totalQuotas += parseInt(count);
        }

        if (totalQuotas !== totalPlayers) {
            return { success: false, message: `Quotas (${totalQuotas}) do not match player count (${totalPlayers}).` };
        }

        // Create pool of roles
        let rolePool = [];
        for (const [role, count] of Object.entries(roleQuotas)) {
            for (let i = 0; i < count; i++) {
                rolePool.push(role);
            }
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
            this.removePlayer(id);
            return { success: true, message: `${name} was kicked.` };
        }
        return { success: false, message: 'Player not found.' };
    },

    castVote(voterId, targetId) {
        if (currentPhase !== 'VOTING') return false;
        const voter = players.get(voterId);
        if (!voter || !voter.alive) return false;

        if (targetId === 'skip') {
            votes.set(voterId, 'skip');
            return true;
        }

        const target = players.get(targetId);
        if (!target || !target.alive) return false;

        votes.set(voterId, targetId);
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
        const player = players.get(playerId);
        if (!player || !player.alive) return false;

        // Validate role
        if (action.type === 'KILL' && player.role !== 'Evil Spirit') return false;
        if (action.type === 'PROTECT' && player.role !== 'Angel') return false;
        if (action.type === 'CHECK' && player.role !== 'Prophet') return false;

        nightActions.set(playerId, action);
        return true;
    },

    resolveNightPhase() {
        let resultMessage = "Night has ended. ";
        const deaths = [];
        const checks = [];

        // 1. Apply Protection (Angel)
        for (const [pid, action] of nightActions) {
            if (action.type === 'PROTECT') {
                const target = players.get(action.targetId);
                if (target) target.protected = true;
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
        const privateMessages = {};

        for (const [pid, action] of nightActions) {
            if (action.type === 'CHECK') {
                const prophet = players.get(pid);
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
    }
};

module.exports = gameService;
