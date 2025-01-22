const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const transactionRoutes = (pool) => {
    const router = express.Router();

    // Get all transactions
    router.get('/all', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT t.*, a.title AS activity_title, 
                        COALESCE(r.name, '') AS requester_name, 
                        COALESCE(p.name, '') AS participant_name
                 FROM transactions t
                 LEFT JOIN activities a ON t.activity_id = a.activity_id
                 LEFT JOIN members r ON t.requester_id = r.member_id
                 LEFT JOIN members p ON t.participant_id = p.member_id
                 ORDER BY t.date DESC, t.time DESC
                 LIMIT $1 OFFSET $2`,
                [pageSize, offset]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM transactions');
            res.json({ transactions: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = transactionRoutes;