const express = require('express');
const authRoutes = require('./routes/user/auth');
const memberRoutes = require('./routes/user/members');

const router = express.Router();

module.exports = (pool) => {
    router.use('/auth', authRoutes(pool));
    router.use('/members', memberRoutes(pool));

    return router;
};