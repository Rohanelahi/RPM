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
    await client.query(
      `INSERT INTO gate_entries_pricing (
        entry_type,
        grn_number,
        account_id,
        quantity,
        price_per_unit,
        total_amount,
        status,
        original_grn_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'PURCHASE_RETURN',
        returnNumber,
        supplierId,
        returnQuantity,
        0,
        0,
        'PENDING',
        purchaseGRN
      ]
    );

    console.log('Pricing entry created:', returnEntry.rows[0]);

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