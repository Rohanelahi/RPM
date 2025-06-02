const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get pricing details for a sale GRN
router.get('/pricing/:grnNumber', async (req, res) => {
  try {
    const { grnNumber } = req.params;
    
    const { rows } = await pool.query(
      `SELECT gep.price_per_unit, gep.total_amount, gep.quantity
       FROM gate_entries_pricing gep
       WHERE gep.grn_number = $1 AND gep.status = 'PROCESSED'
       ORDER BY gep.processed_at DESC
       LIMIT 1`,
      [grnNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pricing details not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching pricing details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    // Get the original sale details to get the price
    const { rows: [saleDetails] } = await client.query(
      `SELECT gep.price_per_unit, gep.total_amount, gep.quantity
       FROM gate_entries_pricing gep
       WHERE gep.grn_number = $1 AND gep.status = 'PROCESSED'
       ORDER BY gep.processed_at DESC
       LIMIT 1`,
      [saleGRN]
    );

    if (!saleDetails) {
      throw new Error('Original sale details not found');
    }

    // Calculate return amount based on original price
    const pricePerUnit = parseFloat(saleDetails.price_per_unit);
    const returnAmount = pricePerUnit * parseFloat(returnQuantity);

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
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'SALE_RETURN',
        returnNumber,
        purchaserId,
        returnQuantity,
        pricePerUnit,
        returnAmount,
        'PENDING'
      ]
    );

    // 3. Create transaction for the return
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
        purchaserId,
        dateTime,
        returnNumber,
        'DEBIT',
        returnAmount,
        `Sale Return: ${paperType} from ${saleGRN}`,
        paperType,
        returnQuantity,
        unit,
        pricePerUnit
      ]
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