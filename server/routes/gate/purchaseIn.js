const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get all item types
router.get('/item-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM item_types ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching item types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new item type
router.post('/item-types', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Item type name is required' });
    }

    const result = await pool.query(
      'INSERT INTO item_types (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding item type:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Item type already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

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

    // Verify supplier exists in any level of chart of accounts and is of type SUPPLIER
    const supplierResult = await client.query(
      `SELECT * FROM (
        SELECT id, name, account_type, 1 as level 
        FROM chart_of_accounts_level1 
        WHERE account_type = 'SUPPLIER'
        UNION ALL
        SELECT id, name, account_type, 2 as level 
        FROM chart_of_accounts_level2 
        WHERE account_type = 'SUPPLIER'
        UNION ALL
        SELECT id, name, account_type, 3 as level 
        FROM chart_of_accounts_level3 
        WHERE account_type = 'SUPPLIER'
      ) all_accounts
      WHERE id = $1`,
      [supplierId]
    );

    if (supplierResult.rows.length === 0) {
      throw new Error('Invalid supplier selected');
    }

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
        id,
        entry_type, 
        grn_number, 
        account_id, 
        quantity, 
        price_per_unit, 
        total_amount,
        status
      ) VALUES (
        nextval('gate_entries_pricing_id_seq'),
        $1, $2, $3, $4, $5, $6, $7
      )`,
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
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 