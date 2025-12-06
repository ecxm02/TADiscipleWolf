const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins (required for Cloudflare Tunnel / external access)
        methods: ["GET", "POST"]
    }
});

// Serve static files from the Vue app (production)
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Socket.io connection handled by controller
require('./controllers/socketController')(io);

// Handle any requests that don't match the above (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
console.log('Attempting to start server on port:', PORT);
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
});
