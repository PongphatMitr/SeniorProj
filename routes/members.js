const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Get all members
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM members');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a member by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM members WHERE member_id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new member
router.post('/', async (req, res) => {
    const { user_id, name, phone, address, branch, time_credits, status } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO members (user_id, name, phone, address, branch, time_credits, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [user_id, name, phone, address, branch, time_credits, status]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a member
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, address, branch, time_credits, status } = req.body;

    try {
        const result = await pool.query(
            'UPDATE members SET name = $1, phone = $2, address = $3, branch = $4, time_credits = $5, status = $6 WHERE member_id = $7 RETURNING *',
            [name, phone, address, branch, time_credits, status, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a member
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM members WHERE member_id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;