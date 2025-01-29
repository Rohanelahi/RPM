const express = require('express');
const router = express.Router();

const listAccounts = require('./listAccounts');
const createAccount = require('./createAccount');
const updateAccount = require('./updateAccount');
const pendingEntries = require('./pending');
const processEntry = require('./processEntry');
const processReturn = require('./processReturn');
const ledger = require('./ledger');
const storeInRoute = require('./storeInRoute');
const processStoreReturn = require('./processStoreReturn');

router.use('/', listAccounts);
router.use('/', createAccount);
router.use('/', updateAccount);
router.use('/', pendingEntries);
router.use('/', processEntry);
router.use('/', processReturn);
router.use('/', ledger);
router.use('/', storeInRoute);
router.use('/', processStoreReturn);

module.exports = router; 