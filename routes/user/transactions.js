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
                [parseInt(pageSize, 10), parseInt(offset, 10)]
            );
            const totalResult = await pool.query('SELECT COUNT(*) FROM activities');
            res.json({ activities: result.rows, total: parseInt(totalResult.rows[0].count, 10) });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Transfer time credits
    router.post('/transfer', authMiddleware, async (req, res) => {
        const { recipientId, amount } = req.body;
        const senderId = req.user.userId;

        const transferAmount = parseInt(amount, 10); // Ensure amount is an integer

        if (!recipientId || isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({ error: 'Invalid recipient ID or amount' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Fetch sender's balance
            const senderResult = await client.query(
                'SELECT time_credits FROM users WHERE user_id = $1 FOR UPDATE', 
                [senderId]
            );
            if (senderResult.rows.length === 0) throw new Error('Sender not found');

            const senderBalance = parseInt(senderResult.rows[0].time_credits, 10);
            if (senderBalance < transferAmount) {
                throw new Error('Insufficient balance');
            }

            // Fetch recipient's balance
            const recipientResult = await client.query(
                'SELECT time_credits FROM users WHERE user_id = $1 FOR UPDATE', 
                [recipientId]
            );
            if (recipientResult.rows.length === 0) throw new Error('Recipient not found');

            const recipientBalance = parseInt(recipientResult.rows[0].time_credits, 10);

            // Update balances
            const newSenderBalance = senderBalance - transferAmount;
            const newRecipientBalance = recipientBalance + transferAmount;

            await client.query(
                'UPDATE users SET time_credits = $1 WHERE user_id = $2',
                [newSenderBalance, senderId]
            );

            await client.query(
                'UPDATE users SET time_credits = $1 WHERE user_id = $2',
                [newRecipientBalance, recipientId]
            );

            // Log transaction for sender (โอนออก)
            await client.query(
                `INSERT INTO user_transaction_transfer 
                    (sender_id, recipient_id, time_credit, transaction_type, sender_balance, recipient_balance) 
                 VALUES 
                    ($1, $2, $3, $4, $5, $6)`,
                [senderId, recipientId, transferAmount, 'โอนออก', newSenderBalance, newRecipientBalance]
            );

            // Log transaction for recipient (โอนเข้า)
            await client.query(
                `INSERT INTO user_transaction_transfer 
                    (sender_id, recipient_id, time_credit, transaction_type, sender_balance, recipient_balance) 
                 VALUES 
                    ($1, $2, $3, $4, $5, $6)`,
                [recipientId, senderId, transferAmount, 'โอนเข้า', newRecipientBalance, newSenderBalance]
            );

            await client.query('COMMIT');
            res.status(200).json({ message: 'โอนเวลาเครดิตสำเร็จ' }); // Transfer successful in Thai

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Transfer error:', err.message);
            res.status(500).json({ error: `การทำธุรกรรมล้มเหลว กรุณาลองใหม่อีกครั้ง. ข้อผิดพลาด: ${err.message}` });
        } finally {
            client.release();
        }
    });

// Get user transaction history (Merged sender and recipient)
router.get('/log', authMiddleware, async (req, res) => {
    const userId = req.user.userId;

    try {
        const result = await pool.query(`
            SELECT transaction_id, sender_id, recipient_id, time_credit, sender_balance, recipient_balance, date
            FROM user_transaction_transfer
            WHERE (sender_id = $1 OR recipient_id = $1) AND transaction_type = 'โอนออก'
            ORDER BY date DESC
        `, [userId]);

        const transactions = result.rows.map(transaction => {
            const isSender = transaction.sender_id === userId;
            const otherPartyId = isSender ? transaction.recipient_id : transaction.sender_id;
            const transactionType = isSender ? 'โอนออก' : 'โอนเข้า';
            const balanceAfter = isSender ? transaction.sender_balance : transaction.recipient_balance;

            return {
                transaction_id: transaction.transaction_id,
                transaction_type: transactionType,
                other_party_id: otherPartyId,
                time_credit: transaction.time_credit,
                balance_after: balanceAfter,
                date: transaction.date
            };
        });

        res.json({ transactions });
    } catch (err) {
        console.error('Error fetching transaction history:', err.message);
        res.status(500).json({ error: 'ไม่สามารถดึงประวัติการทำธุรกรรมได้' });
    }
});




    return router;
};

module.exports = transactionRoutes;