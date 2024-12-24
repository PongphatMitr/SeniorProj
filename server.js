const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const activityRoutes = require('./routes/activities');
const skillRoutes = require('./routes/skills');
const fundRoutes = require('./routes/funds');
const authMiddleware = require('./middleware/authMiddleware');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Middleware to parse JSON bodies
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/members', authMiddleware, memberRoutes);
app.use('/api/activities', authMiddleware, activityRoutes);
app.use('/api/skills', authMiddleware, skillRoutes);
app.use('/api/funds', authMiddleware, fundRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to Time Bank API');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});