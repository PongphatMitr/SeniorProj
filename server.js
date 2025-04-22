const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const cors = require('cors');
const authMiddleware = require('./middleware/authMiddleware');
const tbmRoutes = require('./routes/tbm/server-tbm');
const userRoutes = require('./routes/user/server-user'); // Ensure correct relative path

const cron = require('node-cron');

cron.schedule('* * * * *', async () => {
    console.log("🔄 Checking and updating activity statuses...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            -- 0. ไม่มีผู้เข้าร่วม → ผู้เข้าร่วมไม่ครบ
            UPDATE activities
            SET status = 'ผู้เข้าร่วมไม่ครบ',
                updated_at = NOW()
            WHERE status = 'กำลังจะเริ่ม'
              AND (start_date::timestamp + start_time) <= NOW()
              AND (end_date::timestamp + end_time) >= NOW()
              AND NOT EXISTS (
                  SELECT 1 FROM activity_participants ap 
                  WHERE ap.activity_id = activities.activity_id
              );
        
            -- 1. จาก "กำลังจะเริ่ม" → "กำลังทำกิจกรรม"
            UPDATE activities
            SET status = 'กำลังทำกิจกรรม',
                updated_at = NOW()
            WHERE status = 'กำลังจะเริ่ม'
              AND (start_date::timestamp + start_time) <= NOW()
              AND (end_date::timestamp + end_time) >= NOW();
        
            -- 2. จาก "กำลังทำกิจกรรม" → "รอผู้ขอยืนยันผล"
            UPDATE activities
            SET status = 'รอผู้ขอยืนยันผล',
                updated_at = NOW()
            WHERE status = 'กำลังทำกิจกรรม'
              AND (end_date::timestamp + end_time) < NOW()
              AND (end_date::timestamp + end_time + INTERVAL '1 day') >= NOW();
        
            -- 3. จาก "รอผู้ขอยืนยันผล" → "เกินเวลา"
            UPDATE activities
            SET status = 'เกินเวลา',
                updated_at = NOW()
            WHERE status = 'รอผู้ขอยืนยันผล'
              AND (end_date::timestamp + end_time + INTERVAL '1 day') < NOW();
        `);
        

        await client.query('COMMIT');
        console.log("✅ Updated all relevant activity statuses.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error during CRON job:", err.message);
    } finally {
        client.release();
    }
});


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS
app.use(cors());

// Use the TBM and User routes
app.use('/api/tbm', tbmRoutes(pool));
app.use('/api/user', userRoutes(pool));

app.get('/', (req, res) => {
    res.send('Welcome to Time Bank API');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});