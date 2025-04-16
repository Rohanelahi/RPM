const express = require('express');
const router = express.Router();

const purchaseIn = require('./purchaseIn');
const saleOut = require('./saleOut');
const purchaseReturn = require('./purchaseReturn');
const saleReturn = require('./saleReturn');
const queries = require('./queries');

router.use('/', purchaseIn);
router.use('/', saleOut);
router.use('/', purchaseReturn);
router.use('/', saleReturn);
router.use('/', queries);

module.exports = router; 