const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbPath = path.join(__dirname, 'game.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath); //, { verbose: console.log });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize Tables
const init = () => {
    // Users Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Game State Table (Key-Value Store for simplicity)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS game_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `).run();

    console.log('Database initialized at', dbPath);
};

init();

module.exports = db;
