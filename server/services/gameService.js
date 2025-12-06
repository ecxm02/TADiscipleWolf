const db = require('../db/database');
const TASKS = require('../tasks');

// Helper to get random integer
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

class Game {
    constructor(roomCode, hostId) {
        this.roomCode = roomCode;
        this.hostId = hostId;
        this.createdAt = Date.now(); // NEW

        this.players = new Map(); // userId -> player object
        this.currentPhase = 'LOBBY';
        this.dayNumber = 0;
        this.votes = new Map(); // voterId -> targetId
        this.nightActions = new Map(); // playerId -> { type, targetId, payload }
        this.angelRequests = new Map(); // playerId -> { targetId, targetName, message, approved }

        this.timerConfig = {
            DAY: 300,
            VOTING: 60,
            NIGHT: 0,
            RESULTS: 30
        };
        this.timerState = {
            active: false,
            duration: 0,
            remaining: 0,
            intervalId: null
        };
        this.roleQuotas = {
            'Angel': 0,
            'Prophet': 0,
            'Evil Spirit': 0
        };
    }

    toJSON() {
        return {
            roomCode: this.roomCode,
            hostId: this.hostId,
            createdAt: this.createdAt, // NEW
            players: Array.from(this.players.entries()),
            currentPhase: this.currentPhase,
            dayNumber: this.dayNumber,
            votes: Array.from(this.votes.entries()),
            nightActions: Array.from(this.nightActions.entries()),
            angelRequests: Array.from(this.angelRequests.entries()),
            timerConfig: this.timerConfig,
            roleQuotas: this.roleQuotas
        };
    }

    static fromJSON(data) {
        const game = new Game(data.roomCode, data.hostId);
        game.createdAt = data.createdAt || Date.now(); // NEW
        game.players = new Map(data.players);
        game.currentPhase = data.currentPhase;
        game.dayNumber = data.dayNumber;
        game.votes = new Map(data.votes);
        game.nightActions = new Map(data.nightActions);
        game.angelRequests = new Map(data.angelRequests);
        game.timerConfig = data.timerConfig || game.timerConfig;
        game.roleQuotas = data.roleQuotas || game.roleQuotas;
        return game;
    }

    // --- Game Logic Methods ---

    addPlayer(userId, username, socketId) {
        if (!this.players.has(userId)) {
            this.players.set(userId, {
                id: userId,
                name: username,
                role: 'Disciple',
                alive: true,
                taskCompleted: false,
                protected: false,
                online: true,
                socketId: socketId,
                currentTask: ''
            });
        } else {
            const player = this.players.get(userId);
            player.online = true;
            player.socketId = socketId;
            player.name = username;
        }
        return this.players.get(userId);
    }

    removePlayer(userId) {
        if (this.players.has(userId)) {
            const player = this.players.get(userId);
            player.online = false;
        }
    }

    getPublicState() {
        return {
            roomCode: this.roomCode,
            phase: this.currentPhase,
            dayNumber: this.dayNumber,
            timer: this.timerState.remaining,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                alive: p.alive,
                taskCompleted: p.taskCompleted,
                role: p.alive ? 'Unknown' : p.role,
                online: p.online
            }))
        };
    }

    getAdminState() {
        return {
            roomCode: this.roomCode,
            phase: this.currentPhase,
            dayNumber: this.dayNumber,
            timer: this.timerState.remaining,
            timerConfig: this.timerConfig,
            roleQuotas: this.roleQuotas,
            votes: Array.from(this.votes.entries()),
            nightActions: Array.from(this.nightActions.entries()),
            players: Array.from(this.players.values()),
            angelRequests: Array.from(this.angelRequests.entries())
        };
    }

    // ... (Include all other game logic methods: setPhase, resolveVotes, etc., adapted to use `this.`)

    getTask(role, day) {
        if (role === 'Angel') return "Your role does not have a daily task.";
        let targetRole = role === 'Evil Spirit' ? 'Disciple' : role;
        const roleTasks = TASKS[targetRole] || TASKS['Disciple'];
        return roleTasks[Math.floor(Math.random() * roleTasks.length)];
    }

    setPhase(phase, io) {
        if (['LOBBY', 'DAY', 'VOTING', 'NIGHT', 'RESULTS'].includes(phase)) {
            const previousPhase = this.currentPhase;
            this.currentPhase = phase;
            this.stopTimer();

            if (phase === 'DAY') {
                this.dayNumber++;
                this.players.forEach(p => {
                    p.taskCompleted = false;
                    p.protected = false;
                    p.currentTask = this.getTask(p.role, this.dayNumber);
                });
                this.nightActions.clear();
                this.angelRequests.clear();

                this.startTimer(this.timerConfig.DAY, io, () => {
                    this.setPhase('VOTING', io);
                    this.broadcastUpdate(io);
                });
            }
            if (phase === 'VOTING') {
                this.votes.clear();
                this.startTimer(this.timerConfig.VOTING, io, () => {
                    this.setPhase('NIGHT', io);
                    this.broadcastUpdate(io);
                });
            }
            if (phase === 'NIGHT') {
                if (previousPhase === 'VOTING') {
                    const voteResult = this.resolveVotes();
                    const { publicResult, privateMessages } = this.resolveNightPhase(voteResult);

                    io.to(this.roomCode).emit('vote_result', { result: publicResult });
                    io.to(`admin_${this.roomCode}`).emit('action_result', { message: publicResult });

                    for (const [playerId, message] of Object.entries(privateMessages)) {
                        const player = this.players.get(parseInt(playerId));
                        if (player && player.socketId) {
                            io.to(player.socketId).emit('private_message', message);
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }

    broadcastUpdate(io) {
        io.to(this.roomCode).emit('state_update', this.getPublicState());
        io.to(`admin_${this.roomCode}`).emit('admin_state_update', this.getAdminState());
    }

    startTimer(duration, io, onComplete) {
        if (duration <= 0) return;
        this.timerState.active = true;
        this.timerState.duration = duration;
        this.timerState.remaining = duration;

        io.to(this.roomCode).emit('timer_update', this.timerState.remaining);
        io.to(`admin_${this.roomCode}`).emit('timer_update', this.timerState.remaining);

        this.timerState.intervalId = setInterval(() => {
            this.timerState.remaining--;
            io.to(this.roomCode).emit('timer_update', this.timerState.remaining);
            io.to(`admin_${this.roomCode}`).emit('timer_update', this.timerState.remaining);

            if (this.timerState.remaining <= 0) {
                this.stopTimer();
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerState.intervalId) {
            clearInterval(this.timerState.intervalId);
            this.timerState.intervalId = null;
        }
        this.timerState.active = false;
        this.timerState.remaining = 0;
    }

    resolveVotes() {
        if (this.votes.size === 0) return { result: 'No votes cast.' };
        const tally = {};
        for (const targetId of this.votes.values()) tally[targetId] = (tally[targetId] || 0) + 1;

        let maxVotes = 0;
        let candidates = [];
        for (const [targetId, count] of Object.entries(tally)) {
            if (count > maxVotes) { maxVotes = count; candidates = [targetId]; }
            else if (count === maxVotes) candidates.push(targetId);
        }

        if (candidates.length > 1 || candidates.includes('skip')) return { result: 'Tie vote or Skip. No one was executed.' };

        const victim = this.players.get(parseInt(candidates[0])); // targetId is int
        if (victim) {
            victim.alive = false;
            return { result: `${victim.name} was executed by vote.` };
        }
        return { result: 'Error resolving execution.' };
    }

    resolveNightPhase(voteResult) {
        let resultMessage = voteResult ? `\n[VOTE RESULT]\n${voteResult.result}\n` : "";
        const deaths = [];
        const privateMessages = {};

        // Protect
        for (const [pid, action] of this.nightActions) {
            if (action.type === 'PROTECT') {
                const target = this.players.get(action.targetId);
                if (target) {
                    target.protected = true;
                    privateMessages[target.id] = "You felt a divine presence watching over you. An Angel protected you.";
                }
            }
        }

        // Kill
        for (const [pid, action] of this.nightActions) {
            if (action.type === 'KILL') {
                const target = this.players.get(action.targetId);
                if (target && target.alive) {
                    let killSuccess = true;
                    if (target.protected) killSuccess = false;
                    else if (target.role === 'Disciple' && target.taskCompleted && getRandomInt(1, 100) <= 50) {
                        killSuccess = false;
                        privateMessages[target.id] = "Your faith shielded you from an attack!";
                    }

                    if (killSuccess) {
                        target.alive = false;
                        if (!deaths.includes(target.name)) deaths.push(target.name);
                    }
                }
            }
        }

        // Check
        for (const [pid, action] of this.nightActions) {
            if (action.type === 'CHECK') {
                const prophet = this.players.get(pid);
                if (prophet.taskCompleted) {
                    const target = this.players.get(action.targetId);
                    if (target) privateMessages[pid] = `Prophet Vision: ${target.name} is a ${target.role}.`;
                } else {
                    privateMessages[pid] = `Prophet Vision: You did not complete your task, so your vision is clouded.`;
                }
            }
        }

        resultMessage += "\n[NIGHT REPORT]\n";
        resultMessage += deaths.length > 0 ? `${deaths.join(', ')} was found dead.` : "It was a peaceful night. No one died.";

        return { publicResult: resultMessage, privateMessages };
    }

    autoAssignRoles() {
        const playerIds = Array.from(this.players.keys());
        const totalPlayers = playerIds.length;
        let specialRolesCount = Object.values(this.roleQuotas).reduce((a, b) => a + parseInt(b), 0);

        if (specialRolesCount > totalPlayers) return { success: false, message: `Special roles (${specialRolesCount}) exceed player count (${totalPlayers}).` };

        let rolePool = [];
        for (const [role, count] of Object.entries(this.roleQuotas)) {
            for (let i = 0; i < count; i++) rolePool.push(role);
        }
        while (rolePool.length < totalPlayers) rolePool.push('Disciple');

        // Shuffle
        for (let i = rolePool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
        }

        playerIds.forEach((id, index) => {
            this.players.get(id).role = rolePool[index];
        });
        return { success: true, message: 'Roles assigned successfully.' };
    }
}

// --- Service Manager ---

const rooms = new Map(); // roomCode -> Game
const socketRoomMap = new Map(); // socketId -> roomCode

// Load all games from DB
const loadGames = () => {
    try {
        const stmt = db.prepare('SELECT key, value FROM game_state WHERE key LIKE \'room_%\'');
        const rows = stmt.all();
        rows.forEach(row => {
            const roomCode = row.key.replace('room_', '');
            const gameData = JSON.parse(row.value);
            const game = Game.fromJSON(gameData);
            rooms.set(roomCode, game);
            console.log(`Loaded room ${roomCode}`);
        });
    } catch (err) {
        console.error('Failed to load games:', err);
    }
};
loadGames();

const saveGame = (game) => {
    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO game_state (key, value) VALUES (?, ?)');
        stmt.run(`room_${game.roomCode}`, JSON.stringify(game));
    } catch (err) {
        console.error('Failed to save game:', err);
    }
};

const gameService = {
    createRoom(hostUserId) {
        // Enforce 2-room limit per host
        const hostedRooms = [];
        for (const [code, game] of rooms.entries()) {
            if (game.hostId === hostUserId) {
                hostedRooms.push(game);
            }
        }

        if (hostedRooms.length >= 2) {
            // Sort by creation time (oldest first)
            hostedRooms.sort((a, b) => a.createdAt - b.createdAt);

            // Delete oldest room(s) until we have space
            while (hostedRooms.length >= 2) {
                const roomToDelete = hostedRooms.shift();
                this.deleteRoom(roomToDelete.roomCode, hostUserId);
                console.log(`Auto-deleted old room ${roomToDelete.roomCode} for host ${hostUserId}`);
            }
        }

        // Generate 4-digit code
        let roomCode;
        do {
            roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        } while (rooms.has(roomCode));

        const game = new Game(roomCode, hostUserId);
        rooms.set(roomCode, game);
        saveGame(game);
        return roomCode;
    },

    joinRoom(roomCode, userId, username, socketId) {
        const game = rooms.get(roomCode);
        if (!game) return null;

        socketRoomMap.set(socketId, roomCode);

        // If Host, do NOT add to players list (Pure Admin)
        if (game.hostId === userId) {
            return { game, player: null };
        }

        const player = game.addPlayer(userId, username, socketId);
        saveGame(game);
        return { game, player };
    },

    getGameBySocket(socketId) {
        const roomCode = socketRoomMap.get(socketId);
        return rooms.get(roomCode);
    },

    getGameByRoomCode(roomCode) {
        return rooms.get(roomCode);
    },

    getUserRooms(userId) {
        const userRooms = [];
        for (const [roomCode, game] of rooms.entries()) {
            const isHost = game.hostId === userId;
            const isPlayer = game.players.has(userId);

            if (isHost || isPlayer) {
                userRooms.push({
                    roomCode,
                    isHost,
                    playerCount: game.players.size,
                    phase: game.phase,
                    createdAt: game.createdAt || Date.now()
                });
            }
        }
        return userRooms;
    },

    deleteRoom(roomCode, userId) {
        const game = rooms.get(roomCode);
        if (!game) return { success: false, message: 'Room not found' };

        if (game.hostId !== userId) {
            return { success: false, message: 'Not authorized' };
        }

        rooms.delete(roomCode);

        try {
            const stmt = db.prepare('DELETE FROM game_state WHERE key = ?');
            stmt.run(`room_${roomCode}`);
            return { success: true };
        } catch (err) {
            console.error('Failed to delete room from DB:', err);
            return { success: false, message: 'DB Error' };
        }
    },

    // Proxy methods that find the game and call the method
    handleAction(socketId, actionCallback) {
        const game = this.getGameBySocket(socketId);
        if (game) {
            const result = actionCallback(game);
            saveGame(game);
            return { game, result };
        }
        return { game: null, result: null };
    }
};

module.exports = gameService;
