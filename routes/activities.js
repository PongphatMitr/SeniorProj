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

    // Get all activities with pagination
    router.get('/', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT a.*, 
                        COALESCE(r.name, '') AS requester_name
                 FROM activities a
                 LEFT JOIN members r ON a.requester_id = r.member_id
                 ORDER BY a.start_date DESC, a.start_time DESC
                 LIMIT $1 OFFSET $2`,
                [parseInt(pageSize), parseInt(offset)]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM activities');
            res.json({ activities: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get an activity by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query(`
                SELECT a.*, m.name as requester_name
                FROM activities a
                JOIN members m ON a.requester_id = m.member_id
                WHERE a.activity_id = $1
            `, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Activity not found' });
            } else {
                res.json(result.rows[0]);
            }
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Create a new activity
    router.post('/', async (req, res) => {
        const { title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, status, time_tokens_required, time_tokens_per_participant } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create the activity
            const result = await client.query(
                'INSERT INTO activities (title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, status, time_tokens_required, time_tokens_per_participant) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
                [title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, status, time_tokens_required, time_tokens_per_participant]
            );

            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    // Update an activity
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, status, time_tokens_required, time_tokens_per_participant } = req.body;

        try {
            const result = await pool.query(
                'UPDATE activities SET title = $1, description = $2, location = $3, start_date = $4, start_time = $5, end_date = $6, end_time = $7, max_participants = $8, requester_id = $9, status = $10, time_tokens_required = $11, time_tokens_per_participant = $12 WHERE activity_id = $13 RETURNING *',
                [title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, status, time_tokens_required, time_tokens_per_participant, id]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // DELETE activity
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete related records in transactions table
            await client.query('DELETE FROM transactions WHERE activity_id = $1', [id]);

            // Delete related records in activity_participants table
            await client.query('DELETE FROM activity_participants WHERE activity_id = $1', [id]);

            // Delete the activity
            const result = await client.query('DELETE FROM activities WHERE activity_id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Activity not found' });
            }

            await client.query('COMMIT');
            res.json({ message: 'Activity deleted successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting activity:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            client.release();
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Fetch activity details
            const activityResult = await client.query('SELECT * FROM activities WHERE activity_id = $1', [activityId]);
            if (activityResult.rows.length === 0) {
                throw new Error('Activity not found');
            }

            const activity = activityResult.rows[0];

            // Add participant to the activity
            const result = await client.query(
                'INSERT INTO activity_participants (activity_id, member_id) VALUES ($1, $2) RETURNING *',
                [activityId, memberId]
            );

            // Credit time tokens to the participant
            await client.query('UPDATE members SET time_credits = time_credits + $1 WHERE member_id = $2', [activity.time_tokens_per_participant, memberId]);

            // Log the transaction
            await client.query(
                'INSERT INTO transactions (member_id, activity_id, details, time_credits, transaction_type) VALUES ($1, $2, $3, $4, $5)',
                [memberId, activityId, `Participated in activity: ${activity.title}`, activity.time_tokens_per_participant, 'earn']
            );

            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    // Approve an activity
    router.post('/:activityId/approve', async (req, res) => {
        const { activityId } = req.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Fetch activity details
            const activityResult = await client.query('SELECT * FROM activities WHERE activity_id = $1', [activityId]);
            if (activityResult.rows.length === 0) {
                throw new Error('Activity not found');
            }

            const activity = activityResult.rows[0];

            // Fetch current number of participants
            const participantsResult = await client.query('SELECT COUNT(*) FROM activity_participants WHERE activity_id = $1', [activityId]);
            const currentParticipants = parseInt(participantsResult.rows[0].count, 10);

            // Fetch exchange rate from community config
            const configResult = await client.query(`
                SELECT cc.default_exchange_rate_id, er.description
                FROM community_config cc
                JOIN exchange_rates er ON cc.default_exchange_rate_id = er.rate_id
                LIMIT 1
            `);
            if (configResult.rows.length === 0) {
                throw new Error('Community config not found');
            }

            const exchangeRate = parseInt(configResult.rows[0].description.split(' ')[0], 10); // Assuming the description is in the format '1 token per X hours'

            // Update activity status
            const result = await client.query(
                'UPDATE activities SET status = $1 WHERE activity_id = $2 RETURNING *',
                ['เสร็จสิ้น', activityId]
            );

            // Deduct time tokens from the requester based on current participants and exchange rate
            const requesterResult = await client.query('SELECT member_id, time_credits FROM members WHERE member_id = $1', [activity.requester_id]);
            if (requesterResult.rows.length === 0) {
                throw new Error('Requester not found');
            }

            const requester = requesterResult.rows[0];
            const totalTokensRequired = currentParticipants * exchangeRate;

            if (requester.time_credits < totalTokensRequired) {
                res.status(400).json({ error: 'Not enough time credits', available_credits: requester.time_credits });
                return;
            }

            await client.query('UPDATE members SET time_credits = time_credits - $1 WHERE member_id = $2', [totalTokensRequired, requester.member_id]);

            // Log the transaction
            await client.query(
                'INSERT INTO transactions (member_id, activity_id, details, time_credits, transaction_type) VALUES ($1, $2, $3, $4, $5)',
                [requester.member_id, activityId, `Approved activity: ${activity.title}`, totalTokensRequired, 'spend']
            );

            await client.query('COMMIT');
            res.json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error approving activity:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
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