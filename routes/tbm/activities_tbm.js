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
        const {
            title,
            location,
            status,
            description,
            required_skill,
            start_date,
            end_date,
            requester_id,
            page = 1,
            pageSize = 10
        } = req.query;

        const offset = (page - 1) * pageSize;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (title) {
            conditions.push(`LOWER(a.title) LIKE LOWER($${idx++})`);
            values.push(`%${title}%`);
        }

        if (location) {
            conditions.push(`LOWER(a.location) LIKE LOWER($${idx++})`);
            values.push(`%${location}%`);
        }

        if (status) {
            conditions.push(`a.status = $${idx++}`);
            values.push(status);
        }

        if (description) {
            conditions.push(`LOWER(a.description) LIKE LOWER($${idx++})`);
            values.push(`%${description}%`);
        }

        if (required_skill) {
            conditions.push(`a.required_skills = $${idx++}`);
            values.push(required_skill);
        }

        if (start_date) {
            conditions.push(`a.start_date = $${idx++}`);
            values.push(start_date);
        }

        if (end_date) {
            conditions.push(`a.end_date = $${idx++}`);
            values.push(end_date);
        }

        if (requester_id) {
            conditions.push(`a.requester_id = $${idx++}`);
            values.push(requester_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        try {
            const query = `
                SELECT a.*, 
                       COALESCE(r.name, '') AS requester_name,
                       s.name AS required_skill_name
                FROM activities a
                LEFT JOIN users r ON a.requester_id = r.user_id
                LEFT JOIN skills s ON a.required_skills = s.skill_id
                ${whereClause}
                ORDER BY a.start_date DESC, a.start_time DESC
                LIMIT $${idx++} OFFSET $${idx}
            `;

            values.push(parseInt(pageSize), parseInt(offset));

            const result = await pool.query(query, values);
            const countResult = await pool.query(`SELECT COUNT(*) FROM activities ${whereClause}`, values.slice(0, -2));

            // Group activities by date
            const activitiesByDate = result.rows.reduce((acc, activity) => {
                const date = activity.start_date.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(activity);
                return acc;
            }, {});

            res.json({ activities: activitiesByDate, total: parseInt(countResult.rows[0].count, 10) });
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
                       s.name AS required_skill_name  
                FROM activities a
                JOIN users m ON a.requester_id = m.user_id
                LEFT JOIN skills s ON a.required_skills = s.skill_id
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

        if (isNaN(required_skills)) {
            return res.status(400).json({ error: 'Invalid required_skills. It should be a valid skill_id (integer).' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

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
        const { title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, requester_phone, status, time_tokens_required, time_tokens_per_participant, required_skills } = req.body;

        if (isNaN(required_skills)) {
            return res.status(400).json({ error: 'Invalid required_skills. It should be a valid skill_id (integer).' });
        }

        try {
            const result = await pool.query(
                `UPDATE activities 
                 SET title = $1, description = $2, location = $3, start_date = $4, start_time = $5, 
                     end_date = $6, end_time = $7, max_participants = $8, requester_id = $9, 
                     requester_phone = $10, status = $11, time_tokens_required = $12, 
                     time_tokens_per_participant = $13, required_skills = $14
                 WHERE activity_id = $15 RETURNING *`,
                [title, description, location, start_date, start_time, end_date, end_time,
                    max_participants, requester_id, requester_phone, status,
                    time_tokens_required, time_tokens_per_participant, required_skills, id]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error updating activity:', err.message);
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
                       ARRAY(
                           SELECT name FROM skills WHERE skill_id = ANY(ARRAY[ms.skill_1, ms.skill_2, ms.skill_3])
                       ) AS skills
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
        const { userId } = req.body;

        console.log(`🔹 Checking join eligibility for activity ${activityId} and user ${userId}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get activity details
            const activityResult = await client.query(
                `SELECT required_skills, max_participants FROM activities WHERE activity_id = $1`,
                [activityId]
            );
            if (activityResult.rows.length === 0) {
                return res.status(404).json({ error: 'ไม่พบกิจกรรมที่คุณต้องการเข้าร่วม' });
            }
            const { required_skills: requiredSkillId, max_participants: maxParticipants } = activityResult.rows[0];

            // Get user's skills
            const skillResult = await client.query(
                `SELECT skill_1, skill_2, skill_3 FROM member_skills WHERE user_id = $1`,
                [userId]
            );
            if (skillResult.rows.length === 0) {
                return res.status(400).json({ error: 'ผู้เข้าร่วมยังไม่ได้ลงทะเบียนทักษะของคุณ' });
            }

            const { skill_1, skill_2, skill_3 } = skillResult.rows[0];

            // Check if the user has the required skill
            if (![skill_1, skill_2, skill_3].includes(requiredSkillId)) {
                return res.status(403).json({ error: 'คุณไม่มีทักษะที่เหมาะสมสำหรับกิจกรรมนี้' });
            }

            // Check if the user is already a participant
            const participantCheck = await client.query(
                `SELECT * FROM activity_participants WHERE activity_id = $1 AND user_id = $2`,
                [activityId, userId]
            );
            if (participantCheck.rows.length > 0) {
                return res.status(400).json({ error: 'คุณได้เข้าร่วมกิจกรรมนี้แล้ว' });
            }

            // Check if the activity is full
            const participantCount = await client.query(
                `SELECT COUNT(*) FROM activity_participants WHERE activity_id = $1`,
                [activityId]
            );
            if (parseInt(participantCount.rows[0].count) >= maxParticipants) {
                return res.status(400).json({ error: 'กิจกรรมนี้เต็มแล้ว ไม่สามารถเข้าร่วมได้' });
            }

            // Add participant to the activity
            await client.query(
                `INSERT INTO activity_participants (activity_id, user_id) VALUES ($1, $2)`,
                [activityId, userId]
            );

            await client.query('COMMIT');
            res.status(201).json({ message: 'เข้าร่วมกิจกรรมสำเร็จ!' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Error joining activity:', err);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าร่วมกิจกรรม กรุณาลองใหม่อีกครั้ง' });
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

            // 🧹 Remove old/duplicate logs (with null requester_id and participant_id)
            await client.query(`
                DELETE FROM transactions
                WHERE activity_id = $1
                AND requester_id IS NULL
                AND participant_id IS NULL
            `, [activityId]);

            // Get activity details
            const activityRes = await client.query('SELECT * FROM activities WHERE activity_id = $1', [activityId]);
            if (activityRes.rows.length === 0) throw new Error('Activity not found');
            const activity = activityRes.rows[0];

            // Get participants
            const participantsRes = await client.query('SELECT user_id FROM activity_participants WHERE activity_id = $1', [activityId]);
            const participants = participantsRes.rows;
            if (!participants || participants.length === 0) throw new Error('No participants found');

            // Get requester
            const requesterRes = await client.query('SELECT user_id, time_credits FROM users WHERE user_id = $1', [activity.requester_id]);
            if (requesterRes.rows.length === 0) throw new Error('Requester not found');
            const requester = requesterRes.rows[0];

            // Get exchange rate
            const configRes = await client.query(`
                SELECT cc.default_exchange_rate_id, er.description
                FROM community_config cc
                JOIN exchange_rates er ON cc.default_exchange_rate_id = er.rate_id
                LIMIT 1
            `);
            if (configRes.rows.length === 0) throw new Error('Community config not found');

            const exchangeRateText = configRes.rows[0].description;
            const exchangeRate = parseInt(exchangeRateText.split(' ')[0], 10);
            if (isNaN(exchangeRate)) throw new Error('Invalid exchange rate format');

            const totalTokens = exchangeRate * participants.length;
            if (requester.time_credits < totalTokens) {
                return res.status(400).json({
                    error: 'Requester has insufficient time credits',
                    available_credits: requester.time_credits
                });
            }

            // Update activity status to เสร็จสิ้น
            const statusRes = await client.query(
                'UPDATE activities SET status = $1, updated_at = NOW() WHERE activity_id = $2 RETURNING *',
                ['เสร็จสิ้น', activityId]
            );

            // Loop through each participant
            for (const participant of participants) {
                const participantId = participant.user_id;

                // Log: requester spends credits
                await client.query(`
                    INSERT INTO transactions (
                        user_id, activity_id, requester_id, participant_id,
                        details, time_credits, transaction_type, date, time
                    ) VALUES (
                        $1, $2, $3, $4,
                        $5, $6, $7, CURRENT_DATE, CURRENT_TIME
                    )
                `, [
                    requester.user_id,
                    activityId,
                    requester.user_id,
                    participantId,
                    `Approved activity: ${activity.title}`,
                    exchangeRate,
                    'spend'
                ]);

                // Log: participant earns credits
                await client.query(`
                    INSERT INTO transactions (
                        user_id, activity_id, requester_id, participant_id,
                        details, time_credits, transaction_type, date, time
                    ) VALUES (
                        $1, $2, $3, $4,
                        $5, $6, $7, CURRENT_DATE, CURRENT_TIME
                    )
                `, [
                    participantId,
                    activityId,
                    requester.user_id,
                    participantId,
                    `Earned time credits for activity: ${activity.title}`,
                    exchangeRate,
                    'earn'
                ]);

                // Update participant balance
                await client.query(
                    'UPDATE users SET time_credits = time_credits + $1 WHERE user_id = $2',
                    [exchangeRate, participantId]
                );
            }

            // Deduct time credits from requester (only once)
            await client.query(
                'UPDATE users SET time_credits = time_credits - $1 WHERE user_id = $2',
                [totalTokens, requester.user_id]
            );

            await client.query('COMMIT');
            res.json(statusRes.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Error approving activity:', err.message);
            console.error(err.stack);
            res.status(500).json({ error: 'An error occurred during approval process' });
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

    // Cancel an activity by updating its status
    router.put('/:id/cancel', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query(
                `UPDATE activities 
                SET status = 'ยกเลิก' 
                WHERE activity_id = $1 
                RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการยกเลิก' });
            }

            res.json({ message: 'กิจกรรมถูกยกเลิกเรียบร้อยแล้ว', activity: result.rows[0] });
        } catch (err) {
            console.error('Error cancelling activity:', err.message);
            res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
        }
    });

    

    return router;
};

module.exports = activityRoutes;