const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const activityRoutes = (pool) => {
    const router = express.Router();

    // Add a route to delete a participant from an activity
    router.delete('/:activityId/participants/:memberId', async (req, res) => {
        const { activityId, memberId } = req.params;

        try {
            await pool.query('DELETE FROM activity_participants WHERE activity_id = $1 AND member_id = $2', [activityId, memberId]);
            res.status(204).send();
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get all activities
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM activities');
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get an activity by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query('SELECT * FROM activities WHERE activity_id = $1', [id]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Create a new activity
    router.post('/', async (req, res) => {
        const { title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_name, status } = req.body;

        try {
            const result = await pool.query(
                'INSERT INTO activities (title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
                [title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_name, status]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update an activity
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_name, status } = req.body;

        try {
            const result = await pool.query(
                'UPDATE activities SET title = $1, description = $2, location = $3, start_date = $4, start_time = $5, end_date = $6, end_time = $7, max_participants = $8, requester_name = $9, status = $10 WHERE activity_id = $11 RETURNING *',
                [title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_name, status, id]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Delete an activity
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            await pool.query('DELETE FROM activities WHERE activity_id = $1', [id]);
            res.status(204).send();
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Fetch participants for a given activity
    router.get('/:activityId/participants', async (req, res) => {
        const { activityId } = req.params;

        try {
            const participants = await pool.query(`
                   SELECT m.member_id, m.name, u.email, array_agg(s.name) as skills
                   FROM activity_participants ap
                   JOIN members m ON ap.member_id = m.member_id
                   JOIN users u ON m.user_id = u.user_id
                   JOIN member_skills ms ON m.member_id = ms.member_id
                   JOIN skills s ON ms.skill_id = s.skill_id
                   WHERE ap.activity_id = $1
                   GROUP BY m.member_id, m.name, u.email
               `, [activityId]);

            res.json(participants.rows);
        } catch (error) {
            console.error('Error fetching participants:', error);
            res.status(500).json({ error: 'Failed to fetch participants' });
        }
    });

    // Add a participant to an activity
    router.post('/:activityId/participants', async (req, res) => {
        const { activityId } = req.params;
        const { memberId } = req.body;

        try {
            const result = await pool.query(
                'INSERT INTO activity_participants (activity_id, member_id) VALUES ($1, $2) RETURNING *',
                [activityId, memberId]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Approve an activity
    router.post('/:activityId/approve', async (req, res) => {
        const { activityId } = req.params;

        try {
            const result = await pool.query(
                'UPDATE activities SET status = $1 WHERE activity_id = $2 RETURNING *',
                ['เสร็จสิ้น', activityId]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error approving activity:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Reject an activity
    router.post('/:activityId/reject', async (req, res) => {
        const { activityId } = req.params;

        try {
            const result = await pool.query(
                'UPDATE activities SET status = $1 WHERE activity_id = $2 RETURNING *',
                ['ยกเลิก', activityId]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error rejecting activity:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = activityRoutes;