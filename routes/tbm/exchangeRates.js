const express = require('express');

const exchangeRatesRoutes = (pool) => {
    const router = express.Router();

    // Get all exchange rates
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM exchange_rates');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching exchange rates:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Add a new exchange rate
    router.post('/', async (req, res) => {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        try {
            const result = await pool.query(
                'INSERT INTO exchange_rates (description) VALUES ($1) RETURNING *',
                [description]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error adding new exchange rate:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = exchangeRatesRoutes;