const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Get all skills
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM skills');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a skill by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM skills WHERE skill_id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new skill
router.post('/', async (req, res) => {
    const { name, category } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING *',
            [name, category]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a skill
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category } = req.body;

    try {
        const result = await pool.query(
            'UPDATE skills SET name = $1, category = $2 WHERE skill_id = $3 RETURNING *',
            [name, category, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a skill
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM skills WHERE skill_id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;