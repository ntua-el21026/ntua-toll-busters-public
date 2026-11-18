const express = require('express');
const router = express.Router();
const { createInvoices, payInvoice } = require('../controllers/invoiceController');
const { authenticateUser } = require('../middleware/authMiddleware'); // Ensure auth exists

router.get('/invoice/generate', authenticateUser, createInvoices);
router.post('/invoice/pay', authenticateUser, payInvoice);

module.exports = router;
