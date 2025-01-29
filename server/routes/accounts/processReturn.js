const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Process return entry
router.post('/process-return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { entryId, pricePerUnit, totalAmount } = req.body;
    
    // 1. Get the pricing entry with account info
    const { rows: [pricing] } = await client.query(
      `SELECT 
        gep.*,
        gr.return_type,
        gr.return_number,
        gr.original_grn_number,
        CASE 
          WHEN gr.return_type = 'SALE_RETURN' THEN ge.purchaser_id
          ELSE ge.supplier_id
        END as account_id
       FROM gate_entries_pricing gep
       JOIN gate_returns gr ON gep.grn_number = gr.return_number
       JOIN gate_entries ge ON gr.original_grn_number = ge.grn_number
       WHERE gep.id = $1`,
      [entryId]
    );

    if (!pricing) {
      throw new Error('Entry not found');
    }

    // 2. Update pricing information
    await client.query(
      `UPDATE gate_entries_pricing 
       SET price_per_unit = $1, 
           total_amount = $2, 
           status = 'PROCESSED',
           processed_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [pricePerUnit, totalAmount, entryId]
    );

    // 3. Update account balance
    const balanceModifier = pricing.return_type === 'SALE_RETURN' ? 1 : -1;
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
        pricing.return_number,
        pricing.return_type === 'SALE_RETURN' ? 'CREDIT' : 'DEBIT',
        totalAmount,
        `${pricing.return_type} against GRN: ${pricing.original_grn_number}`
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Return processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing return:', error);
    res.status(500).json({ message: error.message || 'Error processing return' });
  } finally {
    client.release();
  }
});

module.exports = router; 