const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const authMiddleware = require('../middleware/authMiddleware');

dotenv.config();

const authRoutes = (pool) => {
    const router = express.Router();

    // Register a new user
    router.post('/register', async (req, res) => {
        const { username, password, email, role } = req.body;

        try {
            if (!username || !password || !email || !role) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const allowedRoles = ['Member', 'TimeBankManager', 'Admin'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
                [username, hashedPassword, email, role]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Login a user
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;

        try {
            const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            const user = result.rows[0];

            if (!user) {
                return res.status(400).json({ error: 'Invalid username or password' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid username or password' });
            }

            const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            res.json({ token });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Verify token
    router.post('/verify', (req, res) => {
        const token = req.headers['authorization'].split(' ')[1];
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(400).json({ error: 'Invalid token' });
            }
            res.status(200).json({ message: 'Token is valid', user: decoded });
        });
    });

    // Profile route
    router.get('/profile', authMiddleware, async (req, res) => {
        const userId = req.user.userId;

        try {
            const result = await pool.query('SELECT username, email, role FROM users WHERE user_id = $1', [userId]);
            const user = result.rows[0];

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = authRoutes;