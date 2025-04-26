const express = require('express');
const dotenv = require('dotenv');
const authMiddleware = require('../../middleware/authMiddleware'); // ต้องล็อคอิน

dotenv.config();

const transactionRoutes = (pool) => {
    const router = express.Router();

    // Get all transactions with pagination
    router.get('/', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT t.*, 
                        u.username AS user_name,
                        a.title AS activity_title
                 FROM transactions t
                 LEFT JOIN users u ON t.user_id = u.user_id
                 LEFT JOIN activities a ON t.activity_id = a.activity_id
                 ORDER BY t.date DESC, t.time DESC
                 LIMIT $1 OFFSET $2`,
                [parseInt(pageSize), parseInt(offset)]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM transactions');
            res.json({ transactions: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error fetching transactions:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Log a transaction
    router.post('/', async (req, res) => {
        const { user_id, activity_id, details, time_credits, transaction_type } = req.body;
        const date = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
        const time = new Date().toLocaleTimeString(); // Current time in HH:MM:SS format

        if (time_credits == null) {
            return res.status(400).json({ error: 'time_credits is required' });
        }

        try {
            const result = await pool.query(
                'INSERT INTO transactions (user_id, activity_id, details, time_credits, transaction_type, date, time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [user_id, activity_id, details, time_credits, transaction_type, date, time]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error logging transaction:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // ✅ Get all transactions (for admin / tbm)
    router.get('/all', authMiddleware, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    t.transaction_id,
                    t.date,
                    t.time,
                    t.time_credits,
                    t.transaction_type,
                    a.title AS activity_title,
                    r.name AS requester_name,
                    p.name AS participant_name,
                    t.activity_id
                FROM transactions t
                LEFT JOIN activities a ON t.activity_id = a.activity_id
                LEFT JOIN users r ON t.requester_id = r.user_id
                LEFT JOIN users p ON t.participant_id = p.user_id
                ORDER BY t.date DESC, t.time DESC
            `);

            res.json({ transactions: result.rows });
        } catch (error) {
            console.error('❌ Error fetching all transactions:', error.message);
            res.status(500).json({ error: 'An error occurred.' });
        }
    });



    return router;
};

module.exports = transactionRoutes;