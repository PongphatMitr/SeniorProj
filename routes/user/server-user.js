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
const projectRoutes = require('./projects');

const router = express.Router();

module.exports = (pool, io) => {
    router.use('/auth', authRoutes(pool, io));
    router.use('/members', memberRoutes(pool, io));
    router.use('/activities', activityRoutes(pool, io));
    router.use('/skills', skillRoutes(pool, io));
    router.use('/community-config', communityConfigRoutes(pool, io));
    router.use('/exchange-rates', exchangeRatesRoutes(pool, io));
    router.use('/transactions', transactionRoutes(pool, io));
    router.use('/contact', contactRoutes(pool, io));
    router.use('/branches', branchRoutes(pool, io)); // Ensure contact routes are used
    router.use('/announcements', announcementRoutes(pool, io));
    router.use('/projects', projectRoutes(pool, io));

    return router;
};
