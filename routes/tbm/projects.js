const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

module.exports = (pool) => {
    // Get all projects
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM projects ORDER BY project_name');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Add a new project
    router.post('/', async (req, res) => {
        const { project_name } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO projects (project_name) VALUES ($1) RETURNING *',
                [project_name]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error adding project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};