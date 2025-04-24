const express = require('express');
const authRoutes = require('./auth');
const memberRoutes = require('./members');
const activityRoutes = require('./activities_tbm');
const skillRoutes = require('./skills');
const fundRoutes = require('./funds');
const communityConfigRoutes = require('./communityConfig');
const exchangeRatesRoutes = require('./exchangeRates');
const transactionRoutes = require('./transactions');
const reportRoutes = require('./reportRoutes');
const branchRoutes = require('./branches');
const feedbackRoutes = require('./feedback');
const announcementRoutes = require('./announcements');
const projectRoutes = require('./projects'); // Add this line

const router = express.Router();

module.exports = (pool, io) => {
    router.use('/auth', authRoutes(pool, io));
    router.use('/members', memberRoutes(pool, io));
    router.use('/activities', activityRoutes(pool, io));
    router.use('/skills', skillRoutes(pool, io));
    router.use('/funds', fundRoutes(pool, io));
    router.use('/community-config', communityConfigRoutes(pool, io));
    router.use('/exchange-rates', exchangeRatesRoutes(pool, io));
    router.use('/transactions', transactionRoutes(pool, io));
    router.use('/report', reportRoutes(pool, io));
    router.use('/branches', branchRoutes(pool, io));
    router.use('/feedback', feedbackRoutes(pool, io));
    router.use('/announcements', announcementRoutes(pool, io));
    router.use('/projects', projectRoutes(pool, io)); // Add this line

    return router;
};