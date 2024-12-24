const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Register a new user
router.post('/register', async (req, res) => {
    const { username, password, email, role } = req.body;

    // Debugging logs
    console.log('Request Body:', req.body);

    try {
        if (!username || !password || !email || !role) {
            throw new Error('Missing required fields');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed Password:', hashedPassword);

        const result = await pool.query(
            'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, hashedPassword, email, role]
        );

        console.log('Database Result:', result.rows[0]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;