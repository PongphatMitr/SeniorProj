const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const memberRoutes = (pool) => {
    const router = express.Router();

    // Get transactions of a member
    router.get('/:id/transactions', async (req, res) => {
        const { id } = req.params;
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                `SELECT t.*, a.title AS activity_title, 
                        COALESCE(r.name, '') AS requester_name
                 FROM transactions t
                 LEFT JOIN activities a ON t.activity_id = a.activity_id
                 LEFT JOIN members r ON a.requester_id = r.member_id
                 WHERE t.member_id = $1 OR t.requester_id = $1 OR t.participant_id = $1
                 ORDER BY t.date DESC, t.time DESC
                 LIMIT $2 OFFSET $3`,
                [id, pageSize, offset]
            );
            const totalResult = await pool.query(
                'SELECT COUNT(*) FROM transactions WHERE member_id = $1 OR requester_id = $1 OR participant_id = $1',
                [id]
            );
            res.json({ transactions: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get all transactions
    router.get('/transactions/all', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT t.*, a.title AS activity_title, r.name AS requester_name, p.name AS participant_name
                 FROM transactions t
                 JOIN activities a ON t.activity_id = a.activity_id
                 JOIN members r ON t.requester_id = r.member_id
                 JOIN members p ON t.participant_id = p.member_id
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

    // Search members by name or member_id
    router.get('/search', async (req, res) => {
        const { term, page = 1, pageSize = 10 } = req.query;

        if (!term) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT m.member_id, m.name, u.email, array_agg(s.name) as skills
                 FROM members m
                 JOIN users u ON m.user_id = u.user_id
                 LEFT JOIN member_skills ms ON m.member_id = ms.member_id
                 LEFT JOIN skills s ON ms.skill_id = s.skill_id
                 WHERE LOWER(m.name) LIKE LOWER($1) OR CAST(m.member_id AS TEXT) LIKE $1
                 GROUP BY m.member_id, m.name, u.email
                 LIMIT $2 OFFSET $3`,
                [`%${term}%`, pageSize, offset]
            );
            const totalResult = await pool.query(
                `SELECT COUNT(*) FROM members WHERE LOWER(name) LIKE LOWER($1) OR CAST(member_id AS TEXT) LIKE $1`,
                [`%${term}%`]
            );
            res.json({ members: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get all members with pagination
    router.get('/', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query('SELECT * FROM members LIMIT $1 OFFSET $2', [pageSize, offset]);
            const totalResult = await pool.query('SELECT COUNT(*) FROM members');
            res.json({ members: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
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
                SELECT skills.skill_id, skills.name, categories.category
                FROM member_skills
                JOIN skills ON member_skills.skill_id = skills.skill_id
                JOIN categories ON skills.category_id = categories.category_id
                WHERE member_skills.member_id = $1
            `, [id]);
            res.json({ skills: result.rows });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get activities of a member
    router.get('/:id/activities', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(`
                SELECT activities.activity_id, activities.title, activities.status
                FROM activity_participants
                JOIN activities ON activity_participants.activity_id = activities.activity_id
                WHERE activity_participants.member_id = $1
            `, [id]);
            res.json({ activities: result.rows });
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
            // Fetch default time token from community_config
            const configResult = await pool.query('SELECT default_time_token FROM community_config LIMIT 1');
            const defaultTimeToken = configResult.rows[0].default_time_token;

            const result = await pool.query(
                'INSERT INTO members (user_id, name, phone, address, branch, status, time_credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [user_id, name, phone, address, branch, status, defaultTimeToken]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update a member by ID
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, phone, address, branch, time_credits, status } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        // Validate status value
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

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

    // Delete a member by ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete related records in member_skills, activity_participants, and transactions
            await client.query('DELETE FROM member_skills WHERE member_id = $1', [id]);
            await client.query('DELETE FROM activity_participants WHERE member_id = $1', [id]);
            await client.query('DELETE FROM transactions WHERE member_id = $1', [id]);

            // Delete the member
            const result = await client.query('DELETE FROM members WHERE member_id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Member not found' });
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Member deleted successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    return router;
};

module.exports = memberRoutes;