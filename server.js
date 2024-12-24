const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const cors = require('cors');
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

// Enable CORS
app.use(cors());

// Routes
app.use('/api/auth', authRoutes(pool));
app.use('/api/members', authMiddleware, memberRoutes(pool));
app.use('/api/activities', authMiddleware, activityRoutes(pool));
app.use('/api/skills', authMiddleware, skillRoutes(pool));
app.use('/api/funds', authMiddleware, fundRoutes(pool));

app.get('/', (req, res) => {
    res.send('Welcome to Time Bank API');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});