const express = require('express');
const authRoutes = require('./auth');
const memberRoutes = require('./members');
const activityRoutes = require('./activities_user');
const skillRoutes = require('./skills');
const communityConfigRoutes = require('./communityConfig');
const exchangeRatesRoutes = require('./exchangeRates');
const transactionRoutes = require('./transactions');
const contactRoutes = require('./contact');
const branchRoutes = require('./branches');
const announcementRoutes = require('./announcements');

const router = express.Router();

module.exports = (pool) => {
    router.use('/auth', authRoutes(pool));
    router.use('/members', memberRoutes(pool));
    router.use('/activities', activityRoutes(pool));
    router.use('/skills', skillRoutes(pool));
    router.use('/community-config', communityConfigRoutes(pool));
    router.use('/exchange-rates', exchangeRatesRoutes(pool));
    router.use('/transactions', transactionRoutes(pool));
    router.use('/contact', contactRoutes(pool));
    router.use('/branches', branchRoutes(pool)); // Ensure contact routes are used
    router.use('/announcements', announcementRoutes(pool));

    return router;
};
