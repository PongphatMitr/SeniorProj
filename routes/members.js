const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const memberRoutes = (pool) => {
    const router = express.Router();

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

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query('SELECT * FROM members WHERE member_id = $1', [id]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get skills of a member
    router.get('/:id/skills', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(`
                SELECT skills.skill_id, skills.name, skills.category
                FROM member_skills
                JOIN skills ON member_skills.skill_id = skills.skill_id
                WHERE member_skills.member_id = $1
            `, [id]);
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update skills of a member
    router.put('/:id/skills', async (req, res) => {
        const { id } = req.params;
        const { skills } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete existing skills
            await client.query('DELETE FROM member_skills WHERE member_id = $1', [id]);

            // Insert new skills
            for (const skillId of skills) {
                await client.query('INSERT INTO member_skills (member_id, skill_id) VALUES ($1, $2)', [id, skillId]);
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Member skills updated successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    // Create a new member
    router.post('/', async (req, res) => {
        const { user_id, name, phone, address, branch, status } = req.body;

        try {
            const result = await pool.query(
                'INSERT INTO members (user_id, name, phone, address, branch, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [user_id, name, phone, address, branch, status]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = memberRoutes;