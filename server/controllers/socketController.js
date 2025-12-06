const gameService = require('../services/gameService');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join Game
        socket.on('join_game', (data) => {
            const name = typeof data === 'string' ? data : data.name;
            const sessionId = typeof data === 'string' ? null : data.sessionId;

            if (!sessionId) {
                console.warn('Join game without sessionId');
                return;
            }

            const player = gameService.addPlayer(socket.id, name, sessionId);
            socket.join('public');
            socket.join(player.id); // Join private room

            // Send back the role immediately in case of reconnect
            socket.emit('role_update', player.role);

            // Broadcast updates
            io.to('public').emit('state_update', gameService.getPublicState());
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
        });

        // Admin Login
        socket.on('admin_login', () => {
            socket.join('admin');
            socket.emit('admin_state_update', gameService.getAdminState());
        });

        // Admin Actions
        socket.on('action_toggle_task', (playerId) => {
            gameService.toggleTask(playerId);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            io.to('public').emit('state_update', gameService.getPublicState());
        });

        socket.on('action_kill', (playerId) => {
            const result = gameService.killPlayer(playerId);
            io.to('admin').emit('action_result', result);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            io.to('public').emit('state_update', gameService.getPublicState());
        });

        socket.on('action_set_phase', (phase) => {
            gameService.setPhase(phase, io); // Pass io for timers

            // If admin manually sets to RESULTS, we should probably trigger resolution too?
            if (phase === 'RESULTS') {
                const voteResult = gameService.resolveVotes();
                const { publicResult, privateMessages } = gameService.resolveNightPhase();
                const combinedResult = `${voteResult.result} ${publicResult}`;

                io.to('public').emit('vote_result', { result: combinedResult });
                io.to('admin').emit('action_result', { message: combinedResult });

                for (const [playerId, message] of Object.entries(privateMessages)) {
                    io.to(playerId).emit('private_message', message);
                }
            }

            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            io.to('public').emit('state_update', gameService.getPublicState());
        });

        socket.on('action_vote', (targetId) => {
            gameService.castVote(socket.id, targetId);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
        });

        socket.on('action_night_action', (action) => {
            // action: { type, targetId, payload }
            gameService.registerNightAction(socket.id, action);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
        });

        socket.on('action_resolve_night', () => {
            const { publicResult, privateMessages } = gameService.resolveNightPhase();

            // Send public result
            io.to('public').emit('vote_result', { result: publicResult }); // Reuse vote_result for generic announcements
            io.to('admin').emit('action_result', { message: publicResult });

            // Send private messages (Prophet visions)
            for (const [playerId, message] of Object.entries(privateMessages)) {
                io.to(playerId).emit('private_message', message);
            }

            // Update state
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            io.to('public').emit('state_update', gameService.getPublicState());
        });

        socket.on('request_task', () => {
            const player = gameService.getPlayer(socket.id);
            if (player) {
                const day = gameService.getPublicState().dayNumber;
                const task = gameService.getTask(player.role, day);
                socket.emit('task_update', task);
            }
        });

        socket.on('action_revive', (playerId) => {
            gameService.revivePlayer(playerId);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            io.to('public').emit('state_update', gameService.getPublicState());
        });

        socket.on('action_set_role', ({ playerId, role }) => {
            gameService.setRole(playerId, role);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            // Send private update to the player
            io.to(playerId).emit('role_update', role);
        });

        socket.on('action_angel_request', ({ targetId, message }) => {
            gameService.submitAngelRequest(socket.id, targetId, message);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
        });

        socket.on('action_angel_approve', (angelId) => {
            if (gameService.approveAngelRequest(angelId)) {
                io.to('admin').emit('admin_state_update', gameService.getAdminState());
                // Notify the Angel
                io.to(angelId).emit('angel_request_approved');
            }
        });

        // --- Advanced Features Handlers ---

        socket.on('action_set_timer_config', (config) => {
            gameService.setTimerConfig(config);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
        });

        socket.on('action_set_role_quotas', (quotas) => {
            gameService.setRoleQuotas(quotas);
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
        });

        socket.on('action_auto_assign_roles', () => {
            const result = gameService.autoAssignRoles();
            io.to('admin').emit('action_result', result);
            if (result.success) {
                io.to('admin').emit('admin_state_update', gameService.getAdminState());
                const players = gameService.getAdminState().players;
                players.forEach(p => {
                    io.to(p.id).emit('role_update', p.role);
                });
            }
        });

        socket.on('action_kick_player', (playerId) => {
            console.log('Received action_kick_player for:', playerId);
            const result = gameService.kickPlayer(playerId);
            io.to('admin').emit('action_result', result);

            if (result.success && result.kickedSocketId) {
                const kickedSocket = io.sockets.sockets.get(result.kickedSocketId);
                if (kickedSocket) {
                    io.to(result.kickedSocketId).emit('kicked');
                    kickedSocket.disconnect(true);
                }
            }

            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            io.to('public').emit('state_update', gameService.getPublicState());
        });

        // Disconnect
        socket.on('disconnect', () => {
            gameService.removePlayer(socket.id);
            io.to('public').emit('state_update', gameService.getPublicState());
            io.to('admin').emit('admin_state_update', gameService.getAdminState());
            console.log('User disconnected:', socket.id);
        });
    });
};
