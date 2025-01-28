const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const cors = require('cors');
const authRoutes = require('./routes/tbm/auth');
const memberRoutes = require('./routes/tbm/members');
const activityRoutes = require('./routes/tbm/activities');
const skillRoutes = require('./routes/tbm/skills');
const fundRoutes = require('./routes/tbm/funds');
const communityConfigRoutes = require('./routes/tbm/communityConfig');
const exchangeRatesRoutes = require('./routes/tbm/exchangeRates');
const transactionRoutes = require('./routes/tbm/transactions');
const reportRoutes = require('./routes/tbm/reportRoutes'); // Import the new report routes
const authMiddleware = require('./middleware/authMiddleware');

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

// Routes
app.use('/api/auth', authRoutes(pool));
app.use('/api/members/tbm', authMiddleware, memberRoutes(pool));
app.use('/api/activities/tbm', authMiddleware, activityRoutes(pool));
app.use('/api/skills/tbm', authMiddleware, skillRoutes(pool));
app.use('/api/funds/tbm', authMiddleware, fundRoutes(pool));
app.use('/api/community-config/tbm', authMiddleware, communityConfigRoutes(pool));
app.use('/api/exchange-rates/tbm', authMiddleware, exchangeRatesRoutes(pool));
app.use('/api/transactions/tbm', authMiddleware, transactionRoutes(pool));
app.use('/api/report/tbm', authMiddleware, reportRoutes(pool)); // Use the new report routes

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