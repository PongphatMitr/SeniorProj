const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Pool } = require('pg');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = (pool) => {
    // Get all announcements
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM announcements ORDER BY date DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Add a new announcement
    router.post('/', upload.single('image'), async (req, res) => {
        const { date, title, description } = req.body;
        const image = req.file.buffer;

        try {
            await pool.query(
                'INSERT INTO announcements (date, title, description, image) VALUES ($1, $2, $3, $4)',
                [date, title, description, image]
            );
            res.status(201).json({ message: 'Announcement added successfully' });
        } catch (error) {
            console.error('Error adding announcement:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};