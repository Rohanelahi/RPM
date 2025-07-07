const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Purchase Return
router.post('/out/purchase-return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      returnNumber,
      purchaseGRN,
      supplierId,
      returnQuantity,
      returnReason,
      vehicleType,
      vehicleNumber,
      driverName,
      dateTime,
      itemType,
      unit,
      remarks
    } = req.body;

    console.log('Received data:', { returnNumber, purchaseGRN, supplierId }); // Add this for debugging
    console.log('Creating return entry with purchaseGRN:', purchaseGRN);
    console.log('Request body:', req.body);
    console.log('purchaseGRN:', purchaseGRN);

    // 1. Create return entry
    const returnEntry = await client.query(
      `INSERT INTO gate_returns (
        return_number,
        original_grn_number,
        return_type,
        return_quantity,
        return_reason,
        vehicle_type,
        vehicle_number,
        driver_name,
        date_time,
        remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        returnNumber,
        purchaseGRN,
        'PURCHASE_RETURN',
        returnQuantity,
        returnReason,
        vehicleType,
        vehicleNumber,
        driverName,
        dateTime,
        remarks
      ]
    );

    console.log('Return entry created:', returnEntry.rows[0]);

    // 2. Create pricing entry
    const pricingEntry = await client.query(
      `INSERT INTO gate_entries_pricing (
        entry_type,
        grn_number,
        account_id,
        quantity,
        price_per_unit,
        total_amount,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        'PURCHASE_RETURN',
        returnNumber,
        supplierId,
        returnQuantity,
        0,
        0,
        'PENDING'
      ]
    );

    console.log('Pricing entry created:', pricingEntry.rows[0]);

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
      [supplierId]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }

    const unified_account_id = accountResult.rows[0].unified_account_id;

    // 3. Create transaction entry
    const { rows: [transaction] } = await client.query(
      `INSERT INTO transactions (
        account_id,
        unified_account_id,
        transaction_date,
        reference_no,
        description,
        amount,
        entry_type,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        supplierId,
        unified_account_id,
        new Date(),
        returnNumber,
        `Purchase Return against GRN: ${purchaseGRN}`,
        0, // Amount will be updated when pricing is processed
        'DEBIT', // Set entry type as DEBIT for purchase returns
        req.user.id
      ]
    );

    await client.query('COMMIT');
    res.json(returnEntry.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in purchase return:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router; 