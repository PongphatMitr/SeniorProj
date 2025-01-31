const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');

const branchRoutes = (pool) => {
    const router = express.Router();

    // Get branches with optional search term
    router.get('/', async (req, res) => {
        const { search } = req.query;

        try {
            let query = 'SELECT * FROM branches';
            let params = [];

            if (search) {
                query += ' WHERE LOWER(branch_name) LIKE LOWER($1)';
                params.push(`%${search}%`);
            }

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching branches:', err.message);
            res.status(500).json({ error: 'Internal server error. Please try again.' });
        }
    });

    // Get a branch by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid branch ID' });
        }

        try {
            const result = await pool.query('SELECT * FROM branches WHERE branch_id = $1', [id]);
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Branch not found' });
            }
        } catch (err) {
            console.error('Error fetching branch:', err.message);
            res.status(500).json({ error: 'Internal server error. Please try again.' });
        }
    });

    // Create a new branch (Admin only)
    router.post('/', authMiddleware, async (req, res) => {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { branch_name } = req.body;

        if (!branch_name) {
            return res.status(400).json({ error: 'Branch name is required' });
        }

        try {
            const result = await pool.query(
                'INSERT INTO branches (branch_name) VALUES ($1) RETURNING *',
                [branch_name]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error creating branch:', err.message);
            res.status(500).json({ error: 'Internal server error. Please try again.' });
        }
    });

    // Update a branch by ID
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { branch_name } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid branch ID' });
        }

        if (!branch_name) {
            return res.status(400).json({ error: 'Branch name is required' });
        }

        try {
            const result = await pool.query(
                'UPDATE branches SET branch_name = $1, updated_at = NOW() WHERE branch_id = $2 RETURNING *',
                [branch_name, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Branch not found' });
            }
        } catch (err) {
            console.error('Error updating branch:', err.message);
            res.status(500).json({ error: 'Internal server error. Please try again.' });
        }
    });

    return router;
};

module.exports = branchRoutes;