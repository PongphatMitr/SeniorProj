const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const skillRoutes = (pool) => {
    const router = express.Router();

    // Search skills by term
    router.get('/search', async (req, res) => {
        const { term } = req.query;

        try {
            const result = await pool.query(
                'SELECT * FROM skills WHERE LOWER(name) LIKE $1 OR LOWER(category) LIKE $1',
                [`%${term.toLowerCase()}%`]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get all skills
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM skills');
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get a skill by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query('SELECT * FROM skills WHERE skill_id = $1', [id]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = skillRoutes;