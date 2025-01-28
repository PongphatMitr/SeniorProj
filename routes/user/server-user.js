const express = require('express');
const authRoutes = require('./auth');
const memberRoutes = require('./members');

const router = express.Router();

module.exports = (pool) => {
    router.use('/auth', authRoutes(pool));
    router.use('/members', memberRoutes(pool));

    return router;
};