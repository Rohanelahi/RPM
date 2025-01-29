const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Purchase In
router.post('/in/purchase', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      grnNumber,
      supplierId,
      vehicleNumber,
      driverName,
      itemType,
      quantity,
      unit,
      dateTime,
      remarks
    } = req.body;

    // 1. Create gate entry
    const gateEntry = await client.query(
      `INSERT INTO gate_entries (
        grn_number, entry_type, supplier_id, vehicle_number,
        driver_name, item_type, quantity, unit, date_time, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [grnNumber, 'PURCHASE_IN', supplierId, vehicleNumber,
       driverName, itemType, quantity, unit, dateTime, remarks]
    );

    // 2. Create pricing entry with default values for required fields
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
        'PURCHASE', 
        grnNumber, 
        supplierId, 
        quantity, 
        0, // default price_per_unit
        0, // default total_amount
        'PENDING'
      ]
    );

    await client.query('COMMIT');
    res.json(gateEntry.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in purchase entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 