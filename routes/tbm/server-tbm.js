const express = require('express');
const memberRoutes = require('./routes/tbm/members');
const activityRoutes = require('./routes/tbm/activities');
const skillRoutes = require('./routes/tbm/skills');
const fundRoutes = require('./routes/tbm/funds');
const communityConfigRoutes = require('./routes/tbm/communityConfig');
const exchangeRatesRoutes = require('./routes/tbm/exchangeRates');
const transactionRoutes = require('./routes/tbm/transactions');
const reportRoutes = require('./routes/tbm/reportRoutes');

const router = express.Router();

module.exports = (pool) => {
    router.use('/members', memberRoutes(pool));
    router.use('/activities', activityRoutes(pool));
    router.use('/skills', skillRoutes(pool));
    router.use('/funds', fundRoutes(pool));
    router.use('/community-config', communityConfigRoutes(pool));
    router.use('/exchange-rates', exchangeRatesRoutes(pool));
    router.use('/transactions', transactionRoutes(pool));
    router.use('/report', reportRoutes(pool));

    return router;
};