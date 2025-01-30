const express = require('express');
const dotenv = require('dotenv');
const authMiddleware = require('../../middleware/authMiddleware'); // Assuming you have an auth middleware

dotenv.config();

const transactionRoutes = (pool) => {
    const router = express.Router();

    // Get all activities
    router.get('/activities/all', async (req, res) => {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            const result = await pool.query(
                `SELECT a.*, 
                        COALESCE(r.name, '') AS requester_name
                 FROM activities a
                 LEFT JOIN users r ON a.requester_id = r.user_id
                 ORDER BY a.start_date DESC, a.start_time DESC
                 LIMIT $1 OFFSET $2`,
                [parseInt(pageSize), parseInt(offset)]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM activities');
            res.json({ activities: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    router.post('/transfer', authMiddleware, async (req, res) => {
        const { recipientId, amount } = req.body;
        const senderId = req.user.userId; // Get sender ID from logged-in user
    
        if (!recipientId || !amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid recipient ID or amount' });
        }
    
        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Start transaction
    
            // 🔹 Fetch sender's balance
            const senderResult = await client.query(
                'SELECT time_credits FROM users WHERE user_id = $1 FOR UPDATE', [senderId]
            );
    
            if (senderResult.rows.length === 0) throw new Error('Sender not found');
            const senderBalance = senderResult.rows[0].time_credits;
    
            if (senderBalance < amount) {
                throw new Error('Insufficient balance');
            }
    
            // 🔹 Check if recipient exists
            const recipientResult = await client.query(
                'SELECT user_id FROM users WHERE user_id = $1', [recipientId]
            );
    
            if (recipientResult.rows.length === 0) throw new Error('Recipient not found');
    
            // 🔹 Deduct from sender
            await client.query(
                'UPDATE users SET time_credits = time_credits - $1 WHERE user_id = $2',
                [amount, senderId]
            );
    
            // 🔹 Add to recipient
            await client.query(
                'UPDATE users SET time_credits = time_credits + $1 WHERE user_id = $2',
                [amount, recipientId]
            );
    
            // 🔹 Log transaction
            await client.query(
                'INSERT INTO user_transaction_transfer (sender_id, recipient_id, time_credit) VALUES ($1, $2, $3)',
                [senderId, recipientId, amount]
            );
    
            await client.query('COMMIT'); // Commit transaction
            res.status(200).json({ message: 'Transfer successful' });
    
        } catch (err) {
            await client.query('ROLLBACK'); // Rollback if error occurs
            console.error('❌ Transfer error:', err.message);
            res.status(500).json({ error: 'Transaction failed. Try again.' });
        } finally {
            client.release();
        }
    });
    

    return router;
};

module.exports = transactionRoutes;