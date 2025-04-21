const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const memberRoutes = (pool) => {
    const router = express.Router();

    // Create a new member (actually a user with role 'Member')
    router.post('/', async (req, res) => {
        const { user_id, name, phone, address, branch, time_credits } = req.body;

        try {
            // Fetch branch_id from branches table
            let branchId = null;
            if (branch) {
                const branchResult = await pool.query('SELECT branch_id FROM branches WHERE branch_name = $1', [branch]);
                if (branchResult.rows.length > 0) {
                    branchId = branchResult.rows[0].branch_id;
                } else {
                    // Insert new branch if it doesn't exist
                    const newBranchResult = await pool.query(
                        'INSERT INTO branches (branch_name) VALUES ($1) RETURNING branch_id',
                        [branch]
                    );
                    branchId = newBranchResult.rows[0].branch_id;
                }
            }

            const result = await pool.query(
                `UPDATE users SET name = $1, phone = $2, address = $3, branch_id = $4, time_credits = $5, role = 'Member' WHERE user_id = $6 RETURNING *`,
                [name, phone, address, branchId, time_credits, user_id]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error creating member:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update or insert member skills
    router.put('/:memberId/skills', async (req, res) => {
        const { memberId } = req.params;
        const { skill_1, skill_2, skill_3 } = req.body;

        try {
            const updateResult = await pool.query(
                `UPDATE member_skills 
             SET skill_1 = $1, skill_2 = $2, skill_3 = $3, updated_at = NOW() 
             WHERE user_id = $4 RETURNING *`,
                [skill_1, skill_2, skill_3, memberId]
            );

            if (updateResult.rowCount === 0) {
                // No row to update, insert instead
                const insertResult = await pool.query(
                    `INSERT INTO member_skills (user_id, skill_1, skill_2, skill_3)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                    [memberId, skill_1, skill_2, skill_3]
                );
                return res.status(201).json({ message: 'Skills added successfully' });
            }

            res.status(200).json({ message: 'Skills updated successfully' });
        } catch (err) {
            console.error('Error upserting skills:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });


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
                `SELECT u.user_id, u.username, u.name, u.email, 
            ARRAY_REMOVE(ARRAY[
                s1.name, 
                s2.name, 
                s3.name
            ], NULL) AS skills
     FROM users u
     LEFT JOIN member_skills ms ON u.user_id = ms.user_id
     LEFT JOIN skills s1 ON ms.skill_1 = s1.skill_id
     LEFT JOIN skills s2 ON ms.skill_2 = s2.skill_id
     LEFT JOIN skills s3 ON ms.skill_3 = s3.skill_id
     WHERE LOWER(u.name) LIKE LOWER($1) 
        OR LOWER(u.username) LIKE LOWER($1) 
        OR CAST(u.user_id AS TEXT) LIKE $1
     GROUP BY u.user_id, u.username, u.name, u.email, s1.name, s2.name, s3.name
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
            const result = await pool.query(`
            SELECT 
                ms.skill_1, s1.name AS skill_1_name, c1.category AS skill_1_category,
                ms.skill_2, s2.name AS skill_2_name, c2.category AS skill_2_category,
                ms.skill_3, s3.name AS skill_3_name, c3.category AS skill_3_category
            FROM member_skills ms
            LEFT JOIN skills s1 ON ms.skill_1 = s1.skill_id
            LEFT JOIN categories c1 ON s1.category_id = c1.category_id
            LEFT JOIN skills s2 ON ms.skill_2 = s2.skill_id
            LEFT JOIN categories c2 ON s2.category_id = c2.category_id
            LEFT JOIN skills s3 ON ms.skill_3 = s3.skill_id
            LEFT JOIN categories c3 ON s3.category_id = c3.category_id
            WHERE ms.user_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.json({ skills: [] });
            }

            const skills = [
                { skill_id: result.rows[0].skill_1 || null, name: result.rows[0].skill_1_name || 'ยังไม่มีทักษะ', category: result.rows[0].skill_1_category || 'ไม่ระบุ' },
                { skill_id: result.rows[0].skill_2 || null, name: result.rows[0].skill_2_name || 'ยังไม่มีทักษะ', category: result.rows[0].skill_2_category || 'ไม่ระบุ' },
                { skill_id: result.rows[0].skill_3 || null, name: result.rows[0].skill_3_name || 'ยังไม่มีทักษะ', category: result.rows[0].skill_3_category || 'ไม่ระบุ' }
            ];

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
            const result = await pool.query(`
                SELECT activities.activity_id, activities.title, activities.status
                FROM activity_participants
                JOIN activities ON activity_participants.activity_id = activities.activity_id
                WHERE activity_participants.user_id = $1
            `, [id]);
            res.json({ activities: result.rows });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update a member by ID
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, phone, address, branch_id, time_credits, status } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        // Validate status value
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET name = $1, phone = $2, address = $3, branch_id = $4, time_credits = $5, status = $6 WHERE user_id = $7 RETURNING *',
                [name, phone, address, branch_id, time_credits, status, id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Deactivate a member by ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET status = $1 WHERE user_id = $2 RETURNING *',
                ['inactive', id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Member not found' });
            }
            res.status(200).json({ message: 'Member deactivated successfully' });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Restore a member by ID
    router.put('/:id/restore', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET status = $1 WHERE user_id = $2 RETURNING *',
                ['active', id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Member not found' });
            }
            res.status(200).json({ message: 'Member restored successfully' });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Approve a user to become a member
    router.put('/:id/approve', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET role = $1 WHERE user_id = $2 AND role = $3 RETURNING *',
                ['Member', id, 'User']
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'User not found or already a member' });
            }
            res.status(200).json({ message: 'User approved to become a member successfully' });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Promote a member by ID
    router.put('/:id/promote', async (req, res) => {
        const { id } = req.params;
        const { newRole } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        const validRoles = ['Member', 'TimeBankManager', 'Admin'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING *',
                [newRole, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Member not found' });
            }
            res.status(200).json({ message: `Member promoted to ${newRole} successfully` });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Demote a member by ID (kick out of community)
    router.put('/:id/demote', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET role = $1 WHERE user_id = $2 AND role != $3 RETURNING *',
                ['User', id, 'User']
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Member not found or already a user' });
            }
            res.status(200).json({ message: 'Member demoted to user successfully' });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Demote a TimeBankManager by ID
    router.put('/:id/demote-timebankmanager', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET role = $1 WHERE user_id = $2 AND role = $3 RETURNING *',
                ['Member', id, 'TimeBankManager']
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'TimeBankManager not found or already demoted' });
            }
            res.status(200).json({ message: 'TimeBankManager demoted to member successfully' });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Demote an Admin by ID
    router.put('/:id/demote-admin', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET role = $1 WHERE user_id = $2 AND role = $3 RETURNING *',
                ['TimeBankManager', id, 'Admin']
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Admin not found or already demoted' });
            }
            res.status(200).json({ message: 'Admin demoted to TimeBankManager successfully' });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get user information
    router.get('/user', async (req, res) => {
        try {
            const userId = req.user.id; // Assuming you have user information in req.user
            const result = await pool.query('SELECT u.*, b.branch_name FROM users u JOIN branches b ON u.branch_id = b.branch_id WHERE u.user_id = $1', [userId]);
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        } catch (err) {
            console.error('Error fetching user information:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get user role
    router.get('/user-role', async (req, res) => {
        try {
            const userId = req.user.id; // Assuming you have user information in req.user
            const result = await pool.query('SELECT role FROM users WHERE user_id = $1', [userId]);
            if (result.rows.length > 0) {
                res.json({ role: result.rows[0].role });
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        } catch (err) {
            console.error('Error fetching user role:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = memberRoutes;