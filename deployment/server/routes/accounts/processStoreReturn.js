const express = require('express');
const router = express.Router();
const pool = require('../../db');

router.post('/process-store-return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { entryId, pricePerUnit, totalAmount } = req.body;
    console.log('Processing store return with:', { entryId, pricePerUnit, totalAmount });

    // Get the store return details with item information
    const { rows: [entry] } = await client.query(
      `SELECT 
        pe.*,
        sr.return_grn,
        sr.grn_number as original_grn,
        sr.quantity,
        sr.item_name,
        sr.unit,
        se.vendor_id,
        CURRENT_TIMESTAMP as process_time
       FROM pricing_entries pe
       JOIN store_returns sr ON pe.reference_id = sr.id
       JOIN store_entries se ON sr.grn_number = se.grn_number
       WHERE pe.id = $1 AND pe.entry_type = 'STORE_RETURN'`,
      [entryId]
    );

    console.log('Found entry:', entry); // Debug log

    if (!entry) {
      throw new Error('Store return entry not found');
    }

    // Update pricing entry status and price
    await client.query(
      `UPDATE pricing_entries 
       SET status = 'PROCESSED', 
           price_per_unit = $1,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [pricePerUnit, entryId]
    );

    // Update account balance for vendor (Debit for returns)
    await client.query(
      'UPDATE accounts SET current_balance = current_balance - $1 WHERE id = $2',
      [totalAmount, entry.vendor_id]
    );

    // Log the values before inserting into transactions
    console.log('Inserting transaction with values:', {
      process_time: entry.process_time,
      vendor_id: entry.vendor_id,
      return_grn: entry.return_grn,
      item_name: entry.item_name,
      quantity: entry.quantity,
      unit: entry.unit,
      price_per_unit: pricePerUnit
    });

    // Create transaction record with item details
    const { rows: [transaction] } = await client.query(
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        entry.process_time,
        entry.vendor_id,
        entry.return_grn,
        'DEBIT',
        totalAmount,
        'STORE_RETURN',
        entry.item_name,
        entry.quantity,
        entry.unit,
        pricePerUnit
      ]
    );

    console.log('Created transaction:', transaction); // Debug log

    await client.query('COMMIT');
    res.json({ 
      message: 'Store return processed successfully',
      transaction: transaction // Return the transaction details in response
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing store return:', error);
    res.status(500).json({ error: 'Failed to process store return', message: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;