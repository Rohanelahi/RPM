const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Process store purchase
router.post('/process-store-purchase', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { entryId, pricePerUnit, totalAmount } = req.body;

    // Get store entry details with complete item information
    const { rows: [entry] } = await client.query(
      `SELECT 
         pe.id as pricing_id,
         pe.price_per_unit,
         se.quantity,
         se.unit,
         se.grn_number,
         se.vendor_id,
         CURRENT_TIMESTAMP as process_time,
         si.item_name,
         si.item_code,
         si.unit as item_unit
       FROM pricing_entries pe
       JOIN store_entries se ON pe.reference_id = se.id
       JOIN store_items si ON se.item_id = si.id
       WHERE pe.id = $1`,
      [entryId]
    );

    if (!entry) {
      throw new Error('Store entry not found');
    }

    // Create transaction for vendor with description containing all details
    await client.query(
      `INSERT INTO transactions (
        account_id, 
        transaction_date, 
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
        entry.vendor_id,
        entry.process_time,
        entry.grn_number,
        'CREDIT',
        totalAmount,
        `Store Purchase: ${entry.item_name}`,
        entry.item_name,
        entry.quantity,
        entry.unit,
        pricePerUnit
      ]
    );

    // Update pricing entry status
    await client.query(
      `UPDATE pricing_entries 
       SET status = 'PROCESSED', 
           price_per_unit = $1,
           total_amount = $2,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [pricePerUnit, totalAmount, entryId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Store purchase processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing store purchase:', error);
    res.status(500).json({ 
      message: 'Error processing store purchase',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

module.exports = router; 