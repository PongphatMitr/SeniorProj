const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const authMiddleware = require('../../middleware/authMiddleware');

dotenv.config();

const authRoutes = (pool) => {
    const router = express.Router();

    // Register a new user
    router.post('/register', async (req, res) => {
        const {
            username,
            password,
            email,
            role,
            name,
            phone,
            address,
            branch
        } = req.body;

        try {
            // Validate required fields
            const requiredFields = ['username', 'password', 'email', 'role', 'name', 'phone'];
            const missingFields = requiredFields.filter(field => !req.body[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: `Missing required fields: ${missingFields.join(', ')}`
                });
            }

            // Validate role
            const allowedRoles = ['Member', 'TimeBankManager', 'Admin'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            // Validate phone format
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    error: 'Phone number must be 10 digits'
                });
            }

            // Check for existing user
            const userExists = await pool.query(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (userExists.rows.length > 0) {
                return res.status(409).json({
                    error: 'Username or email already exists'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Fetch default time token from community_config
            const configResult = await pool.query('SELECT default_time_token FROM community_config LIMIT 1');
            const defaultTimeToken = configResult.rows[0].default_time_token;

            // Update the registration query to include status and time_credits
            const result = await pool.query(
                `INSERT INTO users 
                (username, password, email, role, name, phone, address, branch, time_credits, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, DEFAULT) 
                RETURNING user_id, username, email, role, name, phone, address, branch, time_credits, status, created_at`,
                [username, hashedPassword, email, role, name, phone, address, branch, defaultTimeToken]
            );

            res.status(201).json(result.rows[0]);

        } catch (err) {
            console.error('Registration Error Details:', {
                message: err.message,
                code: err.code,
                detail: err.detail
            });

            // Handle database errors
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            if (err.code === '23502') {
                return res.status(400).json({ error: `Missing required field: ${err.column}` });
            }

            res.status(500).json({ error: 'Internal server error. Please try again.' });
        }
    });

    // Modified login route with status check
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;

        try {
            if (!username || !password) {
                return res.status(400).json({
                    error: 'Username and password are required'
                });
            }

            // Get user with status check
            const result = await pool.query(
                'SELECT * FROM users WHERE username = $1 AND status = $2',
                [username, 'active']
            );

            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({
                    error: 'Invalid credentials or inactive account'
                });
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    error: 'Invalid credentials'
                });
            }

            // Generate token with expiration
            const token = jwt.sign(
                {
                    userId: user.user_id,
                    role: user.role,
                    username: user.username
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Return essential user data
            res.json({
                token,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    phone: user.phone,
                    status: user.status
                }
            });

        } catch (err) {
            console.error('Login Error:', err.message);
            res.status(500).json({
                error: 'Internal server error. Please try again.'
            });
        }
    });

    // Verify token (updated)
    router.post('/verify', (req, res) => {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    error: 'Invalid or expired token'
                });
            }

            res.status(200).json({
                valid: true,
                user: decoded
            });
        });
    });

    // Profile route (updated to return more data)
    router.get('/profile', authMiddleware, async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT user_id, username, email, role, name, phone, address, branch, time_credits, status, created_at
                FROM users WHERE user_id = $1`,
                [req.user.userId]
            );

            const user = result.rows[0];

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);

        } catch (err) {
            console.error('Profile Error:', err.message);
            res.status(500).json({
                error: 'Internal server error. Please try again.'
            });
        }
    });

    // Update profile route
    router.put('/profile', authMiddleware, async (req, res) => {
        const { name, phone, address } = req.body;

        try {
            const result = await pool.query(
                `UPDATE users SET name = $1, phone = $2, address = $3 WHERE user_id = $4 RETURNING *`,
                [name, phone, address, req.user.userId]
            );

            const updatedUser = result.rows[0];

            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(updatedUser);

        } catch (err) {
            console.error('Update Profile Error:', err.message);
            res.status(500).json({
                error: 'Internal server error. Please try again.'
            });
        }
    });

    // Add to authRoutes
    router.patch('/users/:id/status', authMiddleware, async (req, res) => {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { status } = req.body;
        try {
            const result = await pool.query(
                'UPDATE users SET status = $1 WHERE user_id = $2 RETURNING *',
                [status, req.params.id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    });
    return router;
};

module.exports = authRoutes;