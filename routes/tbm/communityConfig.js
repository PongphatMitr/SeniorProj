const express = require('express');

const communityConfigRoutes = (pool) => {
    const router = express.Router();

    // Get logs of community config changes
    router.get('/logs', async (req, res) => {
        try {
            const result = await pool.query(`
            SELECT * FROM community_config_log ORDER BY changed_at DESC
        `);
            res.json({ logs: result.rows });
        } catch (err) {
            console.error('Error fetching community config logs:', err.message);
            res.status(500).json({ error: 'An error occurred while fetching logs' });
        }
    });

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
        const { default_time_token, default_exchange_rate_id, branch_name, branch_id, minimum_time_token_hours, minimum_time_token_minutes } = req.body;

        // Validate input
        if (typeof default_time_token !== 'number' || default_time_token < 0) {
            return res.status(400).json({ error: 'Invalid default_time_token value' });
        }

        if (typeof default_exchange_rate_id !== 'number' || default_exchange_rate_id < 0) {
            return res.status(400).json({ error: 'Invalid default_exchange_rate_id value' });
        }

        if (branch_name && typeof branch_name !== 'string') {
            return res.status(400).json({ error: 'Invalid branch_name value' });
        }

        if (typeof branch_id !== 'number' || branch_id < 0) {
            return res.status(400).json({ error: 'Invalid branch_id value' });
        }

        if (typeof minimum_time_token_hours !== 'number' || minimum_time_token_hours < 0) {
            return res.status(400).json({ error: 'Invalid minimum_time_token_hours value' });
        }

        if (typeof minimum_time_token_minutes !== 'number' || minimum_time_token_minutes < 0) {
            return res.status(400).json({ error: 'Invalid minimum_time_token_minutes value' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Fetch current config before update
            const currentResult = await client.query('SELECT * FROM community_config LIMIT 1');
            const current = currentResult.rows[0];
            const changes = {};

            if (current.default_time_token !== default_time_token) {
                changes.default_time_token = `${current.default_time_token} → ${default_time_token}`;
            }
            if (current.default_exchange_rate_id !== default_exchange_rate_id) {
                changes.default_exchange_rate_id = `${current.default_exchange_rate_id} → ${default_exchange_rate_id}`;
            }
            if (current.minimum_time_token_hours !== minimum_time_token_hours) {
                changes.minimum_time_token_hours = `${current.minimum_time_token_hours} → ${minimum_time_token_hours}`;
            }
            if (current.minimum_time_token_minutes !== minimum_time_token_minutes) {
                changes.minimum_time_token_minutes = `${current.minimum_time_token_minutes} → ${minimum_time_token_minutes}`;
            }

            // Update branch name if provided
            if (branch_name) {
                await client.query(
                    'UPDATE branches SET branch_name = $1 WHERE branch_id = $2',
                    [branch_name, branch_id]
                );
            }

            // Update community config
            const result = await client.query(
                'UPDATE community_config SET default_time_token = $1, default_exchange_rate_id = $2, minimum_time_token_hours = $3, minimum_time_token_minutes = $4 RETURNING *',
                [default_time_token, default_exchange_rate_id, minimum_time_token_hours, minimum_time_token_minutes]
            );

            // Log the change
            await client.query(`
    INSERT INTO community_config_log (config_id, changed_by, change_description, changed_fields)
    VALUES ($1, $2, $3, $4)
`, [
                result.rows[0].config_id,
                req.user?.user_id || 1,
                Object.keys(changes).length > 0
                    ? 'มีการเปลี่ยนแปลงค่าการตั้งค่าชุมชน'
                    : 'ไม่มีการเปลี่ยนแปลง',
                JSON.stringify(changes)
            ]);



            await client.query('COMMIT');

            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Community configuration not found' });
            }
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error updating community configuration:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    return router;
};

module.exports = communityConfigRoutes;