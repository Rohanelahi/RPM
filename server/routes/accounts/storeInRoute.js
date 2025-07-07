const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Process store purchase
router.post('/process-store-purchase', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { entryId, pricePerUnit, totalAmount } = req.body;
    console.log('Processing store purchase:', { entryId, pricePerUnit, totalAmount });

    // Get store entry details with complete item information
    const { rows: [entry] } = await client.query(
      `SELECT 
         pe.id as pricing_id,
         pe.price_per_unit,
         se.quantity,
         se.unit,
         se.grn_number,
         se.vendor_id,
         se.id as store_entry_id,
         CURRENT_TIMESTAMP as process_time,
         si.item_name,
         si.item_code,
         si.unit as item_unit,
         COALESCE(
           (SELECT name FROM chart_of_accounts_level3 WHERE id = se.vendor_id),
           (SELECT name FROM chart_of_accounts_level2 WHERE id = se.vendor_id),
           (SELECT name FROM chart_of_accounts_level1 WHERE id = se.vendor_id)
         ) as vendor_name
       FROM pricing_entries pe
       JOIN store_entries se ON pe.reference_id = se.id
       JOIN store_items si ON se.item_id = si.id
       WHERE pe.id = $1`,
      [entryId]
    );

    if (!entry) {
      throw new Error('Store entry not found');
    }

    console.log('Found store entry:', entry);

    // Verify vendor exists in chart of accounts
    const vendorCheck = await client.query(
      `SELECT id FROM (
        SELECT id FROM chart_of_accounts_level1 WHERE id = $1
        UNION ALL
        SELECT id FROM chart_of_accounts_level2 WHERE id = $1
        UNION ALL
        SELECT id FROM chart_of_accounts_level3 WHERE id = $1
      ) as vendor WHERE id = $1`,
      [entry.vendor_id]
    );

    if (vendorCheck.rows.length === 0) {
      throw new Error('Invalid vendor ID');
    }

    // Get the unified_account_id for the account
    const accountResult = await client.query(
      `SELECT 
        COALESCE(l1.unified_id, l2.unified_id, l3.unified_id) as unified_account_id
       FROM (
         SELECT id, unified_id FROM chart_of_accounts_level1 WHERE id = $1
         UNION ALL
         SELECT id, unified_id FROM chart_of_accounts_level2 WHERE id = $1
         UNION ALL
         SELECT id, unified_id FROM chart_of_accounts_level3 WHERE id = $1
       ) AS accounts(id, unified_id)
       LEFT JOIN chart_of_accounts_level1 l1 ON accounts.id = l1.id
       LEFT JOIN chart_of_accounts_level2 l2 ON accounts.id = l2.id
       LEFT JOIN chart_of_accounts_level3 l3 ON accounts.id = l3.id
       WHERE accounts.id = $1`,
      [entry.vendor_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }

    const unified_account_id = accountResult.rows[0].unified_account_id;

    // Create transaction for vendor with description containing all details
    const transactionResult = await client.query(
      `INSERT INTO transactions (
        account_id, 
        unified_account_id,
        transaction_date, 
        reference_no,
        entry_type, 
        amount, 
        description,
        item_name,
        quantity,
        unit,
        price_per_unit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        entry.vendor_id,
        unified_account_id,
        entry.process_time,
        entry.grn_number,
        'CREDIT',
        totalAmount,
        `Store Purchase: ${entry.item_name} from ${entry.vendor_name}`,
        entry.item_name,
        entry.quantity,
        entry.unit,
        pricePerUnit
      ]
    );

    console.log('Created transaction:', transactionResult.rows[0]);

    // Update pricing entry status and details
    const pricingResult = await client.query(
      `UPDATE pricing_entries 
       SET status = 'PROCESSED', 
           price_per_unit = $1,
           total_amount = $2,
           processed_at = CURRENT_TIMESTAMP,
           quantity = $3,
           unit = $4,
           reference_id = $5
       WHERE id = $6
       RETURNING *`,
      [pricePerUnit, totalAmount, entry.quantity, entry.unit, entry.store_entry_id, entryId]
    );

    console.log('Updated pricing entry:', pricingResult.rows[0]);

    await client.query('COMMIT');
    res.json({ 
      message: 'Store purchase processed successfully',
      transaction: transactionResult.rows[0],
      pricing: pricingResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing store purchase:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 