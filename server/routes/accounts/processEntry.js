const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Process entry
router.post('/process-entry', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { entryId, pricePerUnit, cutWeight, totalAmount, finalQuantity } = req.body;
    
    // 1. Get the pricing entry with account info
    const { rows: [pricing] } = await client.query(
      `SELECT gep.*, 
        CASE 
          WHEN gep.entry_type = 'SALE' THEN ge.purchaser_id
          ELSE ge.supplier_id
        END as account_id,
        gep.entry_type
       FROM gate_entries_pricing gep
       JOIN gate_entries ge ON gep.grn_number = ge.grn_number
       WHERE gep.id = $1`,
      [entryId]
    );

    if (!pricing) {
      throw new Error('Entry not found');
    }

    // 2. Update pricing information and status
    await client.query(
      `UPDATE gate_entries_pricing 
       SET price_per_unit = $1, 
           total_amount = $2, 
           status = 'PROCESSED',
           processed_at = CURRENT_TIMESTAMP,
           cut_weight = $3,
           final_quantity = $4
       WHERE id = $5`,
      [pricePerUnit, totalAmount, cutWeight, finalQuantity, entryId]
    );

    // 3. Update account balance
    const balanceModifier = pricing.entry_type === 'SALE' ? 1 : -1;
    await client.query(
      'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
      [totalAmount * balanceModifier, pricing.account_id]
    );

    // 4. Create transaction record
    await client.query(
      `INSERT INTO transactions (
        transaction_date,
        account_id,
        reference_no,
        entry_type,
        amount,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        new Date(),
        pricing.account_id,
        pricing.grn_number,
        pricing.entry_type === 'SALE' ? 'CREDIT' : 'DEBIT',
        totalAmount,
        `${pricing.entry_type === 'SALE' ? 'Sale' : 'Purchase'} against GRN: ${pricing.grn_number}`
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Entry processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing entry:', error);
    res.status(500).json({ message: error.message || 'Error processing entry' });
  } finally {
    client.release();
  }
});

module.exports = router; 