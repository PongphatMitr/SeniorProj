const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Get report data
    router.get('/', async (req, res) => {
        try {
            const client = await pool.connect();

            // Total number of transactions
            const totalTransactionsResult = await client.query('SELECT COUNT(*) AS total_transactions FROM transactions');
            const totalTransactions = totalTransactionsResult.rows[0].total_transactions;

            // Daily volume flow
            const dailyVolumeResult = await client.query(`
                SELECT date, COUNT(transaction_id) AS daily_volume
                FROM transactions
                GROUP BY date
                ORDER BY date
            `);
            const dailyVolume = dailyVolumeResult.rows;

            // Monthly volume flow
            const monthlyVolumeResult = await client.query(`
                SELECT DATE_TRUNC('month', date) AS month, COUNT(transaction_id) AS monthly_volume
                FROM transactions
                GROUP BY month
                ORDER BY month
            `);
            const monthlyVolume = monthlyVolumeResult.rows;

            // Yearly volume flow
            const yearlyVolumeResult = await client.query(`
                SELECT DATE_TRUNC('year', date) AS year, COUNT(transaction_id) AS yearly_volume
                FROM transactions
                GROUP BY year
                ORDER BY year
            `);
            const yearlyVolume = yearlyVolumeResult.rows;

            // Total number of activities
            const totalActivitiesResult = await client.query('SELECT COUNT(*) AS total_activities FROM activities');
            const totalActivities = totalActivitiesResult.rows[0].total_activities;

            // Top ranking members active in doing activities
            const topMembersResult = await client.query(`
                SELECT u.name, COUNT(ap.activity_id) AS activity_count
                FROM users u
                JOIN activity_participants ap ON u.user_id = ap.user_id
                GROUP BY u.name
                ORDER BY activity_count DESC
                LIMIT 10
            `);
            const topMembers = topMembersResult.rows;

            res.json({
                totalTransactions,
                dailyVolume,
                monthlyVolume,
                yearlyVolume,
                totalActivities,
                topMembers
            });

            client.release();
        } catch (error) {
            console.error('Error fetching report data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
};