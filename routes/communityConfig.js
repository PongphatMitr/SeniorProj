const express = require('express');

const communityConfigRoutes = (pool) => {
    const router = express.Router();

    // Get community configuration
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM community_config LIMIT 1');
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Community configuration not found' });
            }
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update community configuration
    router.put('/', async (req, res) => {
        const { defaultTimeToken, exchangeRates } = req.body;

        try {
            const result = await pool.query(
                'UPDATE community_config SET default_time_token = $1, exchange_rates = $2 RETURNING *',
                [defaultTimeToken, JSON.stringify(exchangeRates)]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = communityConfigRoutes;