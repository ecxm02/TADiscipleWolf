const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-prod';

const authService = {
    register(username, password) {
        try {
            const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(password, salt);

            const info = stmt.run(username, hash);

            // Generate JWT for auto-login
            const token = jwt.sign({ id: info.lastInsertRowid, username: username }, SECRET_KEY, { expiresIn: '24h' });

            return { success: true, userId: info.lastInsertRowid, token, username };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'Username already exists.' };
            }
            console.error('Register error:', error);
            return { success: false, message: 'Registration failed.' };
        }
    },

    login(username, password) {
        try {
            const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
            const user = stmt.get(username);

            if (!user) {
                return { success: false, message: 'Invalid username or password.' };
            }

            const validPassword = bcrypt.compareSync(password, user.password_hash);
            if (!validPassword) {
                return { success: false, message: 'Invalid username or password.' };
            }

            // Generate JWT
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
            return { success: true, token, username: user.username, userId: user.id };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed.' };
        }
    },

    verifyToken(token) {
        try {
            return jwt.verify(token, SECRET_KEY);
        } catch (error) {
            return null;
        }
    },

    getUserById(id) {
        const stmt = db.prepare('SELECT id, username FROM users WHERE id = ?');
        return stmt.get(id);
    }
};

module.exports = authService;
