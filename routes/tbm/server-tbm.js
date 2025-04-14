const express = require('express');
const authRoutes = require('./auth');
const memberRoutes = require('./members');
const activityRoutes = require('./activities');
const skillRoutes = require('./skills');
const fundRoutes = require('./funds');
const communityConfigRoutes = require('./communityConfig');
const exchangeRatesRoutes = require('./exchangeRates');
const transactionRoutes = require('./transactions');
const reportRoutes = require('./reportRoutes');
const branchRoutes = require('./branches');
const feedbackRoutes = require('./feedback');
const announcementRoutes = require('./announcements'); // Add this line

const router = express.Router();

module.exports = (pool) => {
    router.use('/auth', authRoutes(pool));
    router.use('/members', memberRoutes(pool));
    router.use('/activities', activityRoutes(pool));
    router.use('/skills', skillRoutes(pool));
    router.use('/funds', fundRoutes(pool));
    router.use('/community-config', communityConfigRoutes(pool));
    router.use('/exchange-rates', exchangeRatesRoutes(pool));
    router.use('/transactions', transactionRoutes(pool));
    router.use('/report', reportRoutes(pool));
    router.use('/branches', branchRoutes(pool));
    router.use('/feedback', feedbackRoutes(pool));
    router.use('/announcements', announcementRoutes(pool)); // Add this line

    return router;
};