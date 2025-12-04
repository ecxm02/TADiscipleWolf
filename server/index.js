const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow Vite dev server
        methods: ["GET", "POST"]
    }
});

// Serve static files from the Vue app (production)
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('ping', () => {
        console.log('Received ping from client');
        socket.emit('pong', { message: 'Hello from server!' });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Handle any requests that don't match the above (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
