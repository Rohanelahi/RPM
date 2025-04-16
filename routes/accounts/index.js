const express = require('express');
const router = express.Router();
const pool = require('../../db');

const listAccounts = require('./listAccounts');
const createAccount = require('./createAccount');
const updateAccount = require('./updateAccount');
const pendingEntries = require('./pending');
const processEntry = require('./processEntry');
const processReturn = require('./processReturn');
const ledger = require('./ledger');
const storeInRoute = require('./storeInRoute');
const processStoreReturn = require('./processStoreReturn');
const incomeStatement = require('./incomeStatement');
const payments = require('./payments');
const expenses = require('./expenses');

router.use('/', listAccounts);
router.use('/', createAccount);
router.use('/', updateAccount);
router.use('/', pendingEntries);
router.use('/', processEntry);
router.use('/', processReturn);
router.use('/', ledger);
router.use('/', storeInRoute);
router.use('/', processStoreReturn);
router.use('/income-statement', incomeStatement);
router.use('/payments', payments);
router.use('/expenses', expenses);

// Add this route to handle GRN lookups
router.get('/grn/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    const { grnNumber } = req.params;
    
    const query = `
      SELECT 
        ge.*,
        gep.price_per_unit,
        gep.final_quantity,
        gep.total_amount,
        gep.cut_weight,
        a.account_name as supplier_name
      FROM gate_entries ge
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      LEFT JOIN accounts a ON ge.supplier_id::text = a.id::text
      WHERE ge.grn_number = $1
    `;
    
    const result = await client.query(query, [grnNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    console.log('GRN Data:', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching GRN details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add this route to handle GRN updates
router.put('/grn/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    const { grnNumber } = req.params;
    const { cut_weight, price_per_unit, final_quantity, total_amount } = req.body;
    
    const query = `
      UPDATE gate_entries_pricing 
      SET 
        cut_weight = $1,
        price_per_unit = $2,
        final_quantity = $3,
        total_amount = $4
      WHERE grn_number = $5
      RETURNING *
    `;
    
    const result = await client.query(query, [
      cut_weight,
      price_per_unit,
      final_quantity,
      total_amount,
      grnNumber
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating GRN details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Create cash tracking table
const createCashTrackingTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_tracking (
        id SERIAL PRIMARY KEY,
        cash_in_hand DECIMAL(10,2) DEFAULT 0,
        cash_in_bank DECIMAL(10,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert initial record if none exists
    await client.query(`
      INSERT INTO cash_tracking (cash_in_hand, cash_in_bank)
      SELECT 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM cash_tracking)
    `);
    
    console.log('Cash tracking table created successfully');
  } catch (error) {
    console.error('Error creating cash tracking table:', error);
  } finally {
    client.release();
  }
};

// Run the migration
createCashTrackingTable();

// Add endpoint to get cash balances
router.get('/cash-balances', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT cash_in_hand, cash_in_bank FROM cash_tracking LIMIT 1');
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching cash balances:', error);
    res.status(500).json({ message: 'Error fetching cash balances' });
  }
});

module.exports = router; 