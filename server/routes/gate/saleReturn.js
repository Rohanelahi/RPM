const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Sale Return
router.post('/in/sale-return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      returnNumber,
      saleGRN,
      purchaserId,
      returnQuantity,
      returnReason,
      vehicleType,
      vehicleNumber,
      driverName,
      dateTime,
      paperType,
      unit,
      remarks
    } = req.body;

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
        saleGRN,
        'SALE_RETURN',
        returnQuantity,
        returnReason,
        vehicleType,
        vehicleNumber,
        driverName,
        dateTime,
        remarks
      ]
    );

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
        'SALE_RETURN',
        returnNumber,
        purchaserId,
        returnQuantity,
        0,
        0,
        'PENDING',
        saleGRN
      ]
    );

    // 3. Update the original entry to mark it as having a return
    await client.query(
      `UPDATE gate_entries 
       SET has_return = true 
       WHERE grn_number = $1`,
      [saleGRN]
    );

    await client.query('COMMIT');
    res.json(returnEntry.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in sale return:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router; 