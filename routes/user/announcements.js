const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Pool } = require('pg');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = (pool, io) => {
    // Get all announcements
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT a.*, b.branch_name
                FROM announcements a
                JOIN branches b ON a.branch_id = b.branch_id
                ORDER BY a.date DESC
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get a specific announcement by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(`
                SELECT a.*, b.branch_name
                FROM announcements a
                JOIN branches b ON a.branch_id = b.branch_id
                WHERE a.announcement_id = $1
            `, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching announcement:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Add a new announcement
    router.post('/', upload.single('image'), async (req, res) => {
        const { date, title, description, branch_id } = req.body;
        const image = req.file ? req.file.buffer : null;
        try {
            await pool.query(
                'INSERT INTO announcements (date, title, description, image, branch_id) VALUES ($1, $2, $3, $4, $5)',
                [date, title, description, image, branch_id]
            );
            res.status(201).json({ message: 'Announcement added successfully' });
        } catch (error) {
            console.error('Error adding announcement:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update an existing announcement
    router.put('/:id', upload.single('image'), async (req, res) => {
        const { id } = req.params;
        const { date, title, description, branch_id } = req.body;
        const image = req.file ? req.file.buffer : null;
        try {
            const result = await pool.query(
                'UPDATE announcements SET date = $1, title = $2, description = $3, image = COALESCE($4, image), branch_id = $5 WHERE announcement_id = $7',
                [date, title, description, image, branch_id, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            res.json({ message: 'Announcement updated successfully' });
        } catch (error) {
            console.error('Error updating announcement:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete an announcement
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                'DELETE FROM announcements WHERE announcement_id = $1',
                [id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            res.json({ message: 'Announcement deleted successfully' });
        } catch (error) {
            console.error('Error deleting announcement:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get all branches
    router.get('/branches', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM branches ORDER BY branch_name');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching branches:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Add a new branch
    router.post('/branches', async (req, res) => {
        const { branch_name } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO branches (branch_name) VALUES ($1) RETURNING *',
                [branch_name]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error adding branch:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get all projects
    router.get('/projects', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM projects ORDER BY project_name');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Add a new project
    router.post('/projects', async (req, res) => {
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