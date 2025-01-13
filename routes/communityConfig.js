const express = require('express');

const communityConfigRoutes = (pool) => {
    const router = express.Router();

    // Get community configuration
    router.get('/', async (req, res) => {
        try {
            const configResult = await pool.query(`
                SELECT cc.*, er.description AS default_exchange_rate_description
                FROM community_config cc
                LEFT JOIN exchange_rates er ON cc.default_exchange_rate_id = er.rate_id
                LIMIT 1
            `);

            const exchangeRatesResult = await pool.query('SELECT * FROM exchange_rates');

            if (configResult.rows.length > 0) {
                const config = configResult.rows[0];
                config.exchange_rates = exchangeRatesResult.rows;
                res.json(config);
            } else {
                res.status(404).json({ error: 'Community configuration not found' });
            }
        } catch (err) {
            console.error('Error fetching community configuration:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update community configuration
    router.put('/', async (req, res) => {
        const { default_time_token, default_exchange_rate_id, new_exchange_rate_description } = req.body;

        // Validate input
        if (typeof default_time_token !== 'number' || default_time_token < 0) {
            return res.status(400).json({ error: 'Invalid default_time_token value' });
        }

        if (typeof default_exchange_rate_id !== 'number' || default_exchange_rate_id < 0) {
            return res.status(400).json({ error: 'Invalid default_exchange_rate_id value' });
        }

        try {
            let newExchangeRateId = default_exchange_rate_id;

            if (new_exchange_rate_description) {
                const newRateResult = await pool.query(
                    'INSERT INTO exchange_rates (description) VALUES ($1) RETURNING rate_id',
                    [new_exchange_rate_description]
                );
                newExchangeRateId = newRateResult.rows[0].rate_id;
            }

            const result = await pool.query(
                'UPDATE community_config SET default_time_token = $1, default_exchange_rate_id = $2 RETURNING *',
                [default_time_token, newExchangeRateId]
            );

            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Community configuration not found' });
            }
        } catch (err) {
            console.error('Error updating community configuration:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    return router;
};

module.exports = communityConfigRoutes;