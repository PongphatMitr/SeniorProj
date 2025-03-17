const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const activityRoutes = (pool) => {
    const router = express.Router();

    // Add a route to delete a participant from an activity
    router.delete('/:activityId/participants/:memberId', async (req, res) => {
        const { activityId, memberId } = req.params;

        try {
            await pool.query('DELETE FROM activity_participants WHERE activity_id = $1 AND user_id = $2', [activityId, memberId]);
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
                 LEFT JOIN users r ON a.requester_id = r.user_id
                 ORDER BY a.start_date DESC, a.start_time DESC
                 LIMIT $1 OFFSET $2`,
                [parseInt(pageSize), parseInt(offset)]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM activities');
            res.json({ activities: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error fetching activities:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get an activity by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
    
        try {
            const result = await pool.query(`
                SELECT a.*, 
                       TO_CHAR(a.start_time, 'HH24:MI') AS start_time, 
                       TO_CHAR(a.end_time, 'HH24:MI') AS end_time, 
                       m.name as requester_name, 
                       a.required_skills::text AS required_skills  
                FROM activities a
                JOIN users m ON a.requester_id = m.user_id
                WHERE a.activity_id = $1
            `, [id]);
    
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Activity not found' });
            }
    
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error fetching activity details:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });
    
    
    
    
    

    // Create a new activity
    router.post('/', async (req, res) => {
        const { 
            title, description, location, start_date, start_time, end_date, end_time, 
            max_participants, requester_id, requester_phone, status, 
            time_tokens_required, time_tokens_per_participant, required_skills 
        } = req.body;
    
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
    
            // ✅ Ensure time values are stored in correct `TIME` format
            const result = await client.query(
                `INSERT INTO activities (title, description, location, start_date, start_time, end_date, end_time, 
                                         max_participants, requester_id, requester_phone, status, 
                                         time_tokens_required, time_tokens_per_participant, required_skills)
                 VALUES ($1, $2, $3, $4, $5::TIME, $6, $7::TIME, $8, $9, $10, $11, $12, $13, $14) 
                 RETURNING *`,
                [title, description, location, start_date, start_time, end_date, end_time, 
                 max_participants, requester_id, requester_phone, status, 
                 time_tokens_required, time_tokens_per_participant, required_skills]
            );
    
            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error creating activity:', err); 
            res.status(500).json({ error: `Activity creation failed: ${err.message}` });            
        } finally {
            client.release();
        }
    });
    
    
    

    // Update an activity
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, requester_phone, status, time_tokens_required, time_tokens_per_participant } = req.body;

        try {
            const result = await pool.query(
                'UPDATE activities SET title = $1, description = $2, location = $3, start_date = $4, start_time = $5, end_date = $6, end_time = $7, max_participants = $8, requester_id = $9, requester_phone = $10, status = $11, time_tokens_required = $12, time_tokens_per_participant = $13 WHERE activity_id = $14 RETURNING *',
                [title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, requester_phone, status, time_tokens_required, time_tokens_per_participant, id]
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
                SELECT u.user_id, u.name, u.phone,
                       ARRAY[
                           (SELECT name FROM skills WHERE skill_id = ms.skill_1),
                           (SELECT name FROM skills WHERE skill_id = ms.skill_2),
                           (SELECT name FROM skills WHERE skill_id = ms.skill_3)
                       ] AS skills
                FROM activity_participants ap
                JOIN users u ON ap.user_id = u.user_id
                LEFT JOIN member_skills ms ON u.user_id = ms.user_id
                WHERE ap.activity_id = $1
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

        console.log(`Attempting to join activity ${activityId} with user ${memberId}`);  // Debug log

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if activity exists
            const activityResult = await client.query('SELECT * FROM activities WHERE activity_id = $1', [activityId]);
            if (activityResult.rows.length === 0) {
                console.error(`Activity with ID ${activityId} not found`);
                return res.status(404).json({ error: 'Activity not found' });
            }

            const activity = activityResult.rows[0];

            // Check if the user is already a participant
            const checkParticipant = await client.query(
                'SELECT * FROM activity_participants WHERE activity_id = $1 AND user_id = $2',
                [activityId, memberId]
            );
            if (checkParticipant.rows.length > 0) {
                console.error(`User ${memberId} is already a participant in activity ${activityId}`);
                return res.status(400).json({ error: 'User is already a participant in this activity.' });
            }

            // Check if the activity is full
            const participantCount = await client.query(
                'SELECT COUNT(*) FROM activity_participants WHERE activity_id = $1',
                [activityId]
            );
            if (parseInt(participantCount.rows[0].count) >= activity.max_participants) {
                console.error(`Activity ${activityId} is already full.`);
                return res.status(400).json({ error: 'Activity is already full.' });
            }

            // Add participant to the activity
            await client.query(
                'INSERT INTO activity_participants (activity_id, user_id) VALUES ($1, $2)',
                [activityId, memberId]
            );

            console.log(`User ${memberId} successfully joined activity ${activityId}`);  // Success log

            await client.query('COMMIT');
            res.status(201).json({ message: 'Successfully joined the activity.' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error joining activity:', err);  // More detailed error logging
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
            const participantsResult = await client.query('SELECT user_id FROM activity_participants WHERE activity_id = $1', [activityId]);
            const participants = participantsResult.rows;

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
            const requesterResult = await client.query('SELECT user_id, time_credits FROM users WHERE user_id = $1', [activity.requester_id]);
            if (requesterResult.rows.length === 0) {
                throw new Error('Requester not found');
            }

            const requester = requesterResult.rows[0];
            const totalTokensRequired = participants.length * exchangeRate;

            if (requester.time_credits < totalTokensRequired) {
                res.status(400).json({ error: 'Not enough time credits', available_credits: requester.time_credits });
                return;
            }

            await client.query('UPDATE users SET time_credits = time_credits - $1 WHERE user_id = $2', [totalTokensRequired, requester.user_id]);

            // Log the transaction for the requester
            await client.query(
                'INSERT INTO transactions (user_id, activity_id, details, time_credits, transaction_type) VALUES ($1, $2, $3, $4, $5)',
                [requester.user_id, activityId, `Approved activity: ${activity.title}`, totalTokensRequired, 'spend']
            );

            // Add time credits to each participant
            for (const participant of participants) {
                await client.query('UPDATE users SET time_credits = time_credits + $1 WHERE user_id = $2', [activity.time_tokens_per_participant, participant.user_id]);

                // Log the transaction for each participant
                await client.query(
                    'INSERT INTO transactions (user_id, activity_id, details, time_credits, transaction_type) VALUES ($1, $2, $3, $4, $5)',
                    [participant.user_id, activityId, `Earned time credits for activity: ${activity.title}`, activity.time_tokens_per_participant, 'earn']
                );
            }

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