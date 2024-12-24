const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const activityRoutes = (pool) => {
    const router = express.Router();

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
        const { title, description, location, date, start_time, end_time, max_participants, requester_name, status } = req.body;

        try {
            const result = await pool.query(
                'INSERT INTO activities (title, description, location, date, start_time, end_time, max_participants, requester_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [title, description, location, date, start_time, end_time, max_participants, requester_name, status]
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
        const { title, description, location, date, start_time, end_time, max_participants, requester_name, status } = req.body;

        try {
            const result = await pool.query(
                'UPDATE activities SET title = $1, description = $2, location = $3, date = $4, start_time = $5, end_time = $6, max_participants = $7, requester_name = $8, status = $9 WHERE activity_id = $10 RETURNING *',
                [title, description, location, date, start_time, end_time, max_participants, requester_name, status, id]
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

    return router;
};

module.exports = activityRoutes;