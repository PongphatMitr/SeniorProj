const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Get community fund details
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM community_fund');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;