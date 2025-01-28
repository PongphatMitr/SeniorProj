const express = require('express');
const authRoutes = require('./auth');
const memberRoutes = require('./members');
const activityRoutes = require('./activities');
const skillRoutes = require('./skills');
const communityConfigRoutes = require('./communityConfig');
const exchangeRatesRoutes = require('./exchangeRates');
const transactionRoutes = require('./transactions');

const router = express.Router();

module.exports = (pool) => {
    router.use('/auth', authRoutes(pool));
    router.use('/members', memberRoutes(pool));
    router.use('/activities', activityRoutes(pool));
    router.use('/skills', skillRoutes(pool));
    router.use('/community-config', communityConfigRoutes(pool));
    router.use('/exchange-rates', exchangeRatesRoutes(pool));
    router.use('/transactions', transactionRoutes(pool));

    return router;
};