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
                 LEFT JOIN users r ON a.requester_id = r.user_id
                 WHERE t.user_id = $1 OR t.requester_id = $1 OR t.participant_id = $1
                 ORDER BY t.date DESC, t.time DESC
                 LIMIT $2 OFFSET $3`,
                [id, pageSize, offset]
            );
            const totalResult = await pool.query(
                'SELECT COUNT(*) FROM transactions WHERE user_id = $1 OR requester_id = $1 OR participant_id = $1',
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
                 JOIN users r ON t.requester_id = r.user_id
                 JOIN users p ON t.participant_id = p.user_id
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

    // Search members by name or user_id
    router.get('/search', async (req, res) => {
        const { term, page = 1, pageSize = 10 } = req.query;

        if (!term) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT u.user_id, u.username, u.name, u.email, array_agg(s.name) as skills
                 FROM users u
                 LEFT JOIN member_skills ms ON u.user_id = ms.user_id
                 LEFT JOIN skills s ON ms.skill_id = s.skill_id
                 WHERE LOWER(u.name) LIKE LOWER($1) OR LOWER(u.username) LIKE LOWER($1) OR CAST(u.user_id AS TEXT) LIKE $1
                 GROUP BY u.user_id, u.username, u.name, u.email
                 LIMIT $2 OFFSET $3`,
                [`%${term}%`, pageSize, offset]
            );
            const totalResult = await pool.query(
                `SELECT COUNT(*) FROM users WHERE LOWER(name) LIKE LOWER($1) OR LOWER(username) LIKE LOWER($1) OR CAST(user_id AS TEXT) LIKE $1`,
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
            const result = await pool.query('SELECT * FROM users LIMIT $1 OFFSET $2', [pageSize, offset]);
            const totalResult = await pool.query('SELECT COUNT(*) FROM users');
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
            const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
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
            const result = await pool.query(
                `SELECT 
                    s1.skill_id AS skill_1_id, s1.name AS skill_1_name, c1.category AS skill_1_category,
                    s2.skill_id AS skill_2_id, s2.name AS skill_2_name, c2.category AS skill_2_category,
                    s3.skill_id AS skill_3_id, s3.name AS skill_3_name, c3.category AS skill_3_category
                FROM member_skills
                LEFT JOIN skills s1 ON member_skills.skill_1 = s1.skill_id
                LEFT JOIN categories c1 ON s1.category_id = c1.category_id
                LEFT JOIN skills s2 ON member_skills.skill_2 = s2.skill_id
                LEFT JOIN categories c2 ON s2.category_id = c2.category_id
                LEFT JOIN skills s3 ON member_skills.skill_3 = s3.skill_id
                LEFT JOIN categories c3 ON s3.category_id = c3.category_id
                WHERE member_skills.user_id = $1`,
                [id]
            );
    
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No skills found for this member' });
            }
    
            const skills = [
                { skill_id: result.rows[0].skill_1_id, name: result.rows[0].skill_1_name, category: result.rows[0].skill_1_category },
                { skill_id: result.rows[0].skill_2_id, name: result.rows[0].skill_2_name, category: result.rows[0].skill_2_category },
                { skill_id: result.rows[0].skill_3_id, name: result.rows[0].skill_3_name, category: result.rows[0].skill_3_category }
            ].filter(skill => skill.skill_id !== null); // Remove null skills
    
            res.json({ skills });
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
            const result = await pool.query(
                `SELECT activities.activity_id, activities.title, activities.status
                 FROM activity_participants
                 JOIN activities ON activity_participants.activity_id = activities.activity_id
                 WHERE activity_participants.user_id = $1`,
                [id]
            );
            res.json({ activities: result.rows });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update skills of a member (Top 3 prioritized skills)
    router.put('/:id/skills', async (req, res) => {
        const { id } = req.params;
        let { skill_1, skill_2, skill_3 } = req.body;
    
        console.log("🔹 Received User ID:", id);
        console.log("🔹 Received Payload:", req.body);
    
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }
    
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
    
            // Fetch existing skills for this user
            const existingSkillsQuery = await client.query(
                'SELECT skill_1, skill_2, skill_3 FROM member_skills WHERE user_id = $1',
                [id]
            );
    
            console.log("🔹 Existing Skills:", existingSkillsQuery.rows);
    
            let existingSkills = existingSkillsQuery.rows[0] || {};
            let existingSkillIds = [existingSkills.skill_1, existingSkills.skill_2, existingSkills.skill_3].filter(Boolean);
    
            // Ensure selected skills are unique
            const selectedSkills = [skill_1, skill_2, skill_3].filter(Boolean);
            const uniqueSkills = new Set(selectedSkills);
    
            if (selectedSkills.length !== uniqueSkills.size) {
                return res.status(400).json({ error: 'ไม่สามารถลงทะเบียนทักษะซ้ำกันได้ กรุณาเลือกทักษะอื่น' });
            }
    
            // Validate if skills exist in the database
            const skillCheck = await pool.query(
                `SELECT skill_id FROM skills WHERE skill_id IN ($1, $2, $3)`,
                [skill_1, skill_2, skill_3]
            );
    
            console.log("🔹 Skill Check in DB:", skillCheck.rows);
    
            if (skillCheck.rowCount !== selectedSkills.length) {
                return res.status(400).json({ error: 'One or more skills do not exist in the database' });
            }
    
            // Update skills, keeping null if no change
            skill_1 = skill_1 || existingSkills.skill_1 || null;
            skill_2 = skill_2 || existingSkills.skill_2 || null;
            skill_3 = skill_3 || existingSkills.skill_3 || null;
    
            console.log("🔹 Final Skill Values:", { skill_1, skill_2, skill_3 });
    
            // Remove existing entry before inserting a new one
            await client.query('DELETE FROM member_skills WHERE user_id = $1', [id]);
    
            // Insert new skills
            await client.query(
                'INSERT INTO member_skills (user_id, skill_1, skill_2, skill_3) VALUES ($1, $2, $3, $4)',
                [id, skill_1, skill_2, skill_3]
            );
    
            await client.query('COMMIT');
            res.status(200).json({ message: 'อัปเดตทักษะของสมาชิกเรียบร้อยแล้ว' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Server Error:', err.message);
            res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
        } finally {
            client.release();
        }
    });
    
    



    // Create a new member
    router.post('/', async (req, res) => {
        const { username, password, email, role, name, phone, address, branch } = req.body;

        try {
            // Fetch default time token from community_config
            const configResult = await pool.query('SELECT default_time_token FROM community_config LIMIT 1');
            const defaultTimeToken = configResult.rows[0].default_time_token;

            const result = await pool.query(
                'INSERT INTO users (username, password, email, role, name, phone, address, branch, time_credits, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
                [username, password, email, role, name, phone, address, branch, defaultTimeToken, 'active']
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
                'UPDATE users SET name = $1, phone = $2, address = $3, branch = $4, time_credits = $5, status = $6 WHERE user_id = $7 RETURNING *',
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
            await client.query('DELETE FROM member_skills WHERE user_id = $1', [id]);
            await client.query('DELETE FROM activity_participants WHERE user_id = $1', [id]);
            await client.query('DELETE FROM transactions WHERE user_id = $1', [id]);

            // Delete the member
            const result = await client.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [id]);
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