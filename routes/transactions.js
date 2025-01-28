const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const transactionRoutes = (pool) => {
    const router = express.Router();

    // Get all activities
    router.get('/activities', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT a.*, 
                        COALESCE(r.name, '') AS requester_name
                 FROM activities a
                 LEFT JOIN users r ON a.requester_id = r.user_id
                 ORDER BY a.start_date DESC, a.start_time DESC
                 LIMIT $1 OFFSET $2`,
                [parseInt(pageSize), parseInt(offset)]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM activities');
            res.json({ activities: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = transactionRoutes;