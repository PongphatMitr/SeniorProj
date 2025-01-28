const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const fundRoutes = (pool) => {
    const router = express.Router();

    // Get community fund details
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM community_fund');
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update community fund
    router.put('/', async (req, res) => {
        const { total_hours, borrowed_hours } = req.body;

        try {
            const result = await pool.query(
                'UPDATE community_fund SET total_hours = $1, borrowed_hours = $2 RETURNING *',
                [total_hours, borrowed_hours]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = fundRoutes;