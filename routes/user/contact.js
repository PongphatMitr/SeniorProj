const express = require('express');
const router = express.Router();

const contactRoutes = (pool) => {
    // Handle POST request to save contact form data
    router.post('/', async (req, res) => {
        const { name, email, subject, message } = req.body;

        // Validate input fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const query = `
            INSERT INTO Contact_us (name, email, subject, message)
            VALUES ($1, $2, $3, $4)
        `;

        try {
            await pool.query(query, [name, email, subject, message]);
            res.status(201).json({ message: 'Message submitted successfully!' });
        } catch (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
};

// Exporting the contactRoutes function
module.exports = contactRoutes;
