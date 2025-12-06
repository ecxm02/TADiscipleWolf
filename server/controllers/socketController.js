const gameService = require('../services/gameService');
const authService = require('../services/authService');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // --- Auth Handlers ---
        socket.on('register', ({ username, password }) => {
            const result = authService.register(username, password);
            socket.emit('register_result', result);
        });

        socket.on('login', ({ username, password }) => {
            const result = authService.login(username, password);
            socket.emit('login_result', result);
        });

        // --- Room Handlers ---

        socket.on('host_game', ({ token }) => {
            const user = authService.verifyToken(token);
            if (!user) return socket.emit('error', 'Auth required');

            const roomCode = gameService.createRoom(user.id);

            // Host joins the room socket channel
            socket.join(roomCode);
            socket.join(`admin_${roomCode}`); // Special channel for admin updates

            // Host is implicitly joined to the game logic too (as admin/player)
            const { game, player } = gameService.joinRoom(roomCode, user.id, user.username, socket.id);

            socket.emit('room_joined', {
                roomCode,
                isHost: true,
                playerId: user.id
            });

            // Send initial state
            socket.emit('admin_state_update', game.getAdminState());
        });

        socket.on('join_room', ({ token, roomCode }) => {
            const user = authService.verifyToken(token);
            if (!user) return socket.emit('error', 'Auth required');

            const result = gameService.joinRoom(roomCode, user.id, user.username, socket.id);
            if (!result) return socket.emit('error', 'Room not found');

            const { game, player } = result;
            const isHost = (game.hostId === user.id);

            socket.join(roomCode);
            if (isHost) socket.join(`admin_${roomCode}`);

            socket.emit('room_joined', {
                roomCode,
                isHost,
                playerId: user.id,
                role: player ? player.role : 'Disciple'
            });

            // Send initial state
            if (isHost) {
                socket.emit('admin_state_update', game.getAdminState());
            } else {
                socket.emit('state_update', game.getPublicState());
                socket.emit('role_update', player.role);
                // Teammates update would go here if implemented
            }

            // Broadcast to room
            io.to(roomCode).emit('state_update', game.getPublicState());
            io.to(`admin_${roomCode}`).emit('admin_state_update', game.getAdminState());
        });

        socket.on('get_user_rooms', ({ token }) => {
            const user = authService.verifyToken(token);
            if (!user) return socket.emit('error', 'Auth required');

            const rooms = gameService.getUserRooms(user.id);
            socket.emit('user_rooms_update', rooms);
        });

        socket.on('delete_room', ({ token, roomCode }) => {
            const user = authService.verifyToken(token);
            if (!user) return socket.emit('error', 'Auth required');

            const result = gameService.deleteRoom(roomCode, user.id);
            socket.emit('delete_room_result', result);

            if (result.success) {
                // Refresh list for the user
                const rooms = gameService.getUserRooms(user.id);
                socket.emit('user_rooms_update', rooms);

                // Notify players in that room?
                // They will just see connection error or we can emit 'room_deleted'
                io.to(roomCode).emit('kicked'); // Or custom message
            }
        });

        // --- Game Actions ---
        // Helper to execute action on the correct game
        const withGame = (fn) => {
            const { game, result } = gameService.handleAction(socket.id, fn);
            if (game) {
                // Broadcast updates after action
                io.to(game.roomCode).emit('state_update', game.getPublicState());
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
            }
        };

        socket.on('action_toggle_task', (playerId) => {
            withGame(game => game.toggleTask(playerId));
        });

        socket.on('action_kill', (playerId) => {
            // Assuming killPlayerManual exists in Game class (it was in gameService before)
            // If not, I need to add it to Game class. 
            // Checking gameService.js content I just wrote... I missed adding killPlayerManual to Game class!
            // I will need to fix gameService.js next.
            // For now, let's assume it's there or I'll fix it.
            withGame(game => {
                if (game.killPlayerManual) game.killPlayerManual(playerId);
                else {
                    // Fallback if I missed it: manual kill logic
                    const p = game.players.get(parseInt(playerId));
                    if (p) p.alive = false;
                }
            });
        });

        socket.on('action_revive', (playerId) => {
            withGame(game => {
                if (game.revivePlayer) game.revivePlayer(playerId);
            });
        });

        socket.on('action_set_phase', (phase) => {
            withGame(game => game.setPhase(phase, io));
        });

        socket.on('action_vote', (targetId) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            const player = Array.from(game.players.values()).find(p => p.socketId === socket.id);
            if (player) {
                game.votes.set(player.id, targetId); // Direct access or method?
                // Game class has `votes` map.
                gameService.handleAction(socket.id, () => { });
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
            }
        });

        socket.on('action_night_action', (action) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            const player = Array.from(game.players.values()).find(p => p.socketId === socket.id);
            if (player) {
                game.nightActions.set(player.id, action);
                gameService.handleAction(socket.id, () => { });
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
            }
        });


        socket.on('request_task', () => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;
            const player = Array.from(game.players.values()).find(p => p.socketId === socket.id);
            if (player) socket.emit('task_update', player.currentTask);
        });

        socket.on('action_set_role', ({ playerId, role }) => {
            withGame(game => {
                const p = game.players.get(playerId);
                if (p) {
                    p.role = role;
                    if (p.socketId) io.to(p.socketId).emit('role_update', role);
                }
            });
        });

        socket.on('action_angel_request', ({ targetId, message }) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;
            const player = Array.from(game.players.values()).find(p => p.socketId === socket.id);
            if (player) {
                if (game.angelRequests) {
                    let tid = targetId;
                    if (typeof targetId === 'string') tid = parseInt(targetId);
                    const target = game.players.get(tid);
                    if (target) {
                        game.angelRequests.set(player.id, {
                            targetId: target.id,
                            targetName: target.name,
                            message: message,
                            status: 'PENDING' // Changed from approved: false
                        });
                        gameService.handleAction(socket.id, () => { });
                        io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
                    }
                }
            }
        });

        socket.on('request_state_sync', () => {
            const game = gameService.getGameBySocket(socket.id);
            if (game) {
                socket.emit('state_update', game.getPublicState());

                // If the socket is in the admin room (host), send admin update too
                if (socket.rooms.has(`admin_${game.roomCode}`)) {
                    socket.emit('admin_state_update', game.getAdminState());
                }
            }
        });

        socket.on('action_angel_approve', (angelId) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            let aid = angelId;
            if (typeof angelId === 'string') aid = parseInt(angelId);

            console.log(`[AngelApprove] Room: ${game.roomCode}, AngelID: ${aid}`);

            if (game.angelRequests.has(aid)) {
                const req = game.angelRequests.get(aid);
                req.status = 'APPROVED'; // Changed from approved = true
                game.nightActions.set(aid, { type: 'PROTECT', targetId: req.targetId });

                gameService.handleAction(socket.id, () => { });
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());

                const angel = game.players.get(aid);
                if (angel) {
                    console.log(`[AngelApprove] Found Angel: ${angel.name}, Socket: ${angel.socketId}`);
                    if (angel.socketId) {
                        io.to(angel.socketId).emit('angel_request_approved', req.targetName);
                        console.log(`[AngelApprove] Emitted to ${angel.socketId}`);
                    } else {
                        console.log(`[AngelApprove] Angel has no socketId`);
                    }
                } else {
                    console.log(`[AngelApprove] Angel player not found in game.players`);
                }
            } else {
                console.log(`[AngelApprove] No request found for AngelID: ${aid}`);
            }
        });

        socket.on('action_angel_reject', (angelId) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            let aid = angelId;
            if (typeof angelId === 'string') aid = parseInt(angelId);

            console.log(`[AngelReject] Room: ${game.roomCode}, AngelID: ${aid}`);

            if (game.angelRequests.has(aid)) {
                const req = game.angelRequests.get(aid);
                req.status = 'REJECTED';

                // Remove any night action if it existed (though it shouldn't yet)
                game.nightActions.delete(aid);

                gameService.handleAction(socket.id, () => { });
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());

                const angel = game.players.get(aid);
                if (angel && angel.socketId) {
                    io.to(angel.socketId).emit('angel_request_rejected');
                }
            }
        });

        // --- Advanced Features ---
        socket.on('action_set_timer_config', (config) => {
            withGame(game => {
                game.timerConfig = { ...game.timerConfig, ...config };
            });
        });

        socket.on('action_set_role_quotas', (quotas) => {
            withGame(game => {
                game.roleQuotas = { ...game.roleQuotas, ...quotas };
            });
        });

        socket.on('action_manage_task', ({ action, role, content }) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            if (game.manageTask(action, role, content)) {
                gameService.handleAction(socket.id, () => { });
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
            }
        });

        socket.on('action_auto_assign_roles', () => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            const result = game.autoAssignRoles();
            socket.emit('action_result', result);

            if (result.success) {
                gameService.handleAction(socket.id, () => { });
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
                game.players.forEach(p => {
                    if (p.socketId) io.to(p.socketId).emit('role_update', p.role);
                });
            }
        });

        socket.on('action_kick_player', (playerId) => {
            const game = gameService.getGameBySocket(socket.id);
            if (!game) return;

            let pid = playerId;
            if (typeof playerId === 'string') pid = parseInt(playerId);

            if (game.players.has(pid)) {
                const p = game.players.get(pid);
                const kickedSocketId = p.socketId;

                // Use new kickPlayer method
                game.kickPlayer(pid);

                gameService.handleAction(socket.id, () => { });

                if (kickedSocketId) {
                    const s = io.sockets.sockets.get(kickedSocketId);
                    if (s) {
                        s.emit('kicked');
                        s.leave(game.roomCode); // Just leave the room, don't disconnect
                    }
                }

                io.to(game.roomCode).emit('state_update', game.getPublicState());
                io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
            }
        });

        socket.on('disconnect', () => {
            const game = gameService.getGameBySocket(socket.id);
            if (game) {
                const player = Array.from(game.players.values()).find(p => p.socketId === socket.id);
                if (player) {
                    player.online = false;
                    gameService.handleAction(socket.id, () => { });
                    io.to(game.roomCode).emit('state_update', game.getPublicState());
                    io.to(`admin_${game.roomCode}`).emit('admin_state_update', game.getAdminState());
                }
            }
        });
    });
};
