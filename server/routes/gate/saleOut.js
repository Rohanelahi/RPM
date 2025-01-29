const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Sale Out
router.post('/out/sale', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      grnNumber,
      purchaserId,
      vehicleType,
      vehicleNumber,
      driverName,
      paperType,
      quantity,
      unit,
      dateTime,
      remarks
    } = req.body;

    // 1. Create gate entry
    const saleEntry = await client.query(
      `INSERT INTO gate_entries (
        grn_number, entry_type, purchaser_id, vehicle_type, vehicle_number,
        driver_name, paper_type, quantity, unit, date_time, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [grnNumber, 'SALE_OUT', purchaserId, vehicleType, vehicleNumber,
       driverName, paperType, quantity, unit, dateTime, remarks]
    );

    // 2. Create pricing entry with default values
    await client.query(
      `INSERT INTO gate_entries_pricing (
        entry_type,
        grn_number,
        account_id,
        quantity,
        price_per_unit,
        total_amount,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'SALE',
        grnNumber,
        purchaserId,
        quantity,
        0, // default price_per_unit
        0, // default total_amount
        'PENDING'
      ]
    );

    await client.query('COMMIT');
    res.json(saleEntry.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in sale entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 