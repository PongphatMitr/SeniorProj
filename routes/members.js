const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const memberRoutes = (pool) => {
    const router = express.Router();

    // Search for members
    router.get('/search', async (req, res) => {
        const { query } = req.query;

        try {
            const result = await pool.query(
                `SELECT m.member_id, m.name, u.email, array_agg(s.name) as skills
                 FROM members m
                 JOIN users u ON m.user_id = u.user_id
                 JOIN member_skills ms ON m.member_id = ms.member_id
                 JOIN skills s ON ms.skill_id = s.skill_id
                 WHERE m.name ILIKE $1 OR u.email ILIKE $1
                 GROUP BY m.member_id, m.name, u.email`,
                [`%${query}%`]
            );

            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get all members
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM members');
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get a member by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query('SELECT * FROM members WHERE member_id = $1', [id]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
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
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
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
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Delete a member
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            await pool.query('DELETE FROM members WHERE member_id = $1', [id]);
            res.status(204).send();
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = memberRoutes;