const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');

const feedbackRoutes = (pool) => {
    const router = express.Router();

    // Get all feedbacks with pagination
    router.get('/contact_us', authMiddleware, async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const feedbacksResult = await pool.query(
                'SELECT * FROM contact_us ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [pageSize, offset]
            );

            const totalResult = await pool.query('SELECT COUNT(*) FROM contact_us');
            const total = parseInt(totalResult.rows[0].count, 10);

            res.json({
                feedbacks: feedbacksResult.rows,
                total
            });
        } catch (err) {
            console.error('Error fetching feedbacks:', err.message);
            res.status(500).json({ error: 'Internal server error. Please try again.' });
        }
    });

    return router;
};

module.exports = feedbackRoutes;