const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/game.db');
const db = new Database(dbPath);

const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
    const rows = db.prepare('SELECT key, value FROM game_state WHERE key LIKE \'room_%\'').all();
    console.log('Active Rooms:');
    rows.forEach(row => {
        const roomCode = row.key.replace('room_', '');
        try {
            const data = JSON.parse(row.value);
            console.log(`- ${roomCode} (Host: ${data.hostId}, Players: ${data.players ? data.players.length : 0})`);
        } catch (e) {
            console.log(`- ${roomCode} (Corrupt Data)`);
        }
    });
    if (rows.length === 0) console.log('No active rooms.');

} else if (command === 'clear') {
    const info = db.prepare('DELETE FROM game_state WHERE key LIKE \'room_%\'').run();
    console.log(`Cleared all game rooms. Deleted ${info.changes} entries.`);

} else if (command === 'delete' && args[1]) {
    const roomCode = args[1];
    const info = db.prepare('DELETE FROM game_state WHERE key = ?').run(`room_${roomCode}`);
    if (info.changes > 0) {
        console.log(`Room ${roomCode} deleted.`);
    } else {
        console.log(`Room ${roomCode} not found.`);
    }

} else {
    console.log('Usage:');
    console.log('  node manage_db.js list              # List all active rooms');
    console.log('  node manage_db.js clear             # Delete ALL rooms');
    console.log('  node manage_db.js delete <roomCode> # Delete a specific room');
}
