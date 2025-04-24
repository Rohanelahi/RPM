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

// Get payment details by voucher number
router.get('/payment/:voucherNo', async (req, res) => {
  const client = await pool.connect();
  try {
    const { voucherNo } = req.params;
    
    const query = `
      SELECT 
        p.*,
        a.account_name,
        a.account_type,
        CASE 
          WHEN p.bank_account_id IS NOT NULL THEN b.bank_name
          ELSE NULL
        END as bank_name,
        TO_CHAR(p.payment_date, 'DD/MM/YYYY HH24:MI:SS') as payment_date_time
      FROM payments p
      JOIN accounts a ON p.account_id = a.id
      LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
      WHERE p.voucher_no = $1
    `;
    
    const result = await client.query(query, [voucherNo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get store entry details by GRN number
router.get('/store-entry/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    const { grnNumber } = req.params;
    
    const query = `
      SELECT 
        se.*,
        si.item_name,
        si.unit,
        a.account_name as vendor_name,
        COALESCE(sr.returned_quantity, 0) as returned_quantity,
        TO_CHAR(se.date_time, 'DD/MM/YYYY HH24:MI:SS') as date_time,
        pe.price_per_unit,
        pe.total_amount
      FROM store_entries se
      JOIN store_items si ON se.item_id = si.id
      LEFT JOIN accounts a ON se.vendor_id = a.id
      LEFT JOIN (
        SELECT grn_number, SUM(quantity) as returned_quantity
        FROM store_returns
        GROUP BY grn_number
      ) sr ON sr.grn_number = se.grn_number
      LEFT JOIN pricing_entries pe ON pe.reference_id = se.id AND pe.entry_type = 'STORE_PURCHASE'
      WHERE se.grn_number = $1
      AND se.entry_type = 'STORE_IN'
    `;
    
    const result = await client.query(query, [grnNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching store entry details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update payment details
router.put('/payment/:voucherNo', async (req, res) => {
  const client = await pool.connect();
  try {
    const { voucherNo } = req.params;
    const { amount, remarks } = req.body;
    
    const query = `
      UPDATE payments 
      SET 
        amount = $1,
        remarks = COALESCE($2, remarks)
      WHERE voucher_no = $3
      RETURNING *
    `;
    
    const result = await client.query(query, [amount, remarks, voucherNo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update store entry details
router.put('/store-entry/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { grnNumber } = req.params;
    const { quantity, price_per_unit, total_amount, remarks } = req.body;
    
    // Update store entry
    const storeQuery = `
      UPDATE store_entries 
      SET 
        quantity = $1,
        remarks = COALESCE($2, remarks)
      WHERE grn_number = $3
      RETURNING *
    `;
    
    const storeResult = await client.query(storeQuery, [quantity, remarks, grnNumber]);
    
    if (storeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Store entry not found' });
    }
    
    // First check if pricing entry exists
    const checkPricingQuery = `
      SELECT id, total_amount FROM pricing_entries 
      WHERE reference_id = $1 AND entry_type = 'STORE_PURCHASE'
    `;
    const pricingCheck = await client.query(checkPricingQuery, [storeResult.rows[0].id]);
    
    let pricingResult;
    if (pricingCheck.rows.length > 0) {
      // Calculate the difference in amount for ledger update
      const oldAmount = pricingCheck.rows[0].total_amount || 0;
      const amountDiff = total_amount - oldAmount;
      
      // Update existing pricing entry
      const updatePricingQuery = `
        UPDATE pricing_entries 
        SET 
          price_per_unit = $1,
          total_amount = $2,
          status = 'PROCESSED',
          processed_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      pricingResult = await client.query(updatePricingQuery, [
        price_per_unit,
        total_amount,
        pricingCheck.rows[0].id
      ]);
      
      // Update account balance if amount changed
      if (amountDiff !== 0) {
        // First update the account balance
        await client.query(
          'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
          [amountDiff, storeResult.rows[0].vendor_id]
        );
        
        // Then update the transaction record with all details
        await client.query(
          `UPDATE transactions 
           SET 
             amount = $1,
             quantity = $2,
             price_per_unit = $3,
             description = $4
           WHERE reference_no = $5 AND entry_type = 'CREDIT'`,
          [
            total_amount,
            quantity,
            price_per_unit,
            `Purchase against GRN: ${grnNumber}`,
            grnNumber
          ]
        );
      }
    } else {
      // Insert new pricing entry
      const insertPricingQuery = `
        INSERT INTO pricing_entries (
          entry_type,
          reference_id,
          price_per_unit,
          total_amount,
          status,
          quantity,
          unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      pricingResult = await client.query(insertPricingQuery, [
        'STORE_PURCHASE',
        storeResult.rows[0].id,
        price_per_unit,
        total_amount,
        'PROCESSED',
        quantity,
        storeResult.rows[0].unit
      ]);
      
      // Update account balance for new entry
      await client.query(
        'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
        [total_amount, storeResult.rows[0].vendor_id]
      );
      
      // Create a new transaction record
      await client.query(
        `INSERT INTO transactions (
          transaction_date,
          account_id,
          reference_no,
          entry_type,
          amount,
          description,
          item_name,
          quantity,
          unit,
          price_per_unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          new Date(),
          storeResult.rows[0].vendor_id,
          grnNumber,
          'CREDIT',
          total_amount,
          `Purchase against GRN: ${grnNumber}`,
          storeResult.rows[0].item_name,
          quantity,
          storeResult.rows[0].unit,
          price_per_unit
        ]
      );
    }
    
    await client.query('COMMIT');
    res.json({
      ...storeResult.rows[0],
      price_per_unit: pricingResult.rows[0].price_per_unit,
      total_amount: pricingResult.rows[0].total_amount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating store entry details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router; 