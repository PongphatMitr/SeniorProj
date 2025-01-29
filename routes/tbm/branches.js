const express = require('express');

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

    return router;
};

module.exports = branchRoutes;