const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all store items
router.get('/items', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM store_items ORDER BY item_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching store items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Store In entry
router.post('/in', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      grnNumber,
      vendorId,
      vehicleNumber,
      driverName,
      dateTime,
      remarks,
      items  // Array of items from the frontend
    } = req.body;

    // Verify vendor exists in chart of accounts
    const vendorCheck = await client.query(
      `SELECT id FROM (
        SELECT id FROM chart_of_accounts_level1 WHERE id = $1
        UNION ALL
        SELECT id FROM chart_of_accounts_level2 WHERE id = $1
        UNION ALL
        SELECT id FROM chart_of_accounts_level3 WHERE id = $1
      ) as vendor WHERE id = $1`,
      [vendorId]
    );

    if (vendorCheck.rows.length === 0) {
      throw new Error('Invalid vendor ID');
    }

    // Generate a unique GRN number
    let uniqueGRN = grnNumber;
    let increment = 0;
    let isUnique = false;

    while (!isUnique) {
      try {
        const suffix = increment === 0 ? '' : `-${increment}`;
        uniqueGRN = `${grnNumber}${suffix}`;
        
        // Check if GRN exists
        const existingGRN = await client.query(
          'SELECT id FROM store_entries WHERE grn_number = $1 LIMIT 1',
          [uniqueGRN]
        );

        if (existingGRN.rows.length === 0) {
          isUnique = true;
        } else {
          increment++;
          if (increment > 999) {
            throw new Error('Unable to generate unique GRN number');
          }
        }
      } catch (err) {
        if (err.code === '23505') { // Unique violation error code
          increment++;
          if (increment > 999) {
            throw new Error('Unable to generate unique GRN number');
          }
          continue;
        }
        throw err;
      }
    }

    // Process each item with a unique sub-GRN
    for (const [index, item] of items.entries()) {
      const itemGRN = `${uniqueGRN}-${(index + 1).toString().padStart(2, '0')}`;
      
      // Create store entry
      const storeEntry = await client.query(
        `INSERT INTO store_entries (
          grn_number, entry_type, item_id, quantity, unit,
          vendor_id, vehicle_number, driver_name, date_time, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [itemGRN, 'STORE_IN', item.itemId, item.quantity, item.unit,
         vendorId, vehicleNumber, driverName, dateTime, remarks]
      );

      // Create pricing entry
      await client.query(
        `INSERT INTO pricing_entries (
          entry_type, reference_id, status, quantity, unit
        ) VALUES ($1, $2, $3, $4, $5)`,
        ['STORE_PURCHASE', storeEntry.rows[0].id, 'PENDING', item.quantity, item.unit]
      );

      // Update store item stock
      await client.query(
        `UPDATE store_items 
         SET current_stock = current_stock + $1
         WHERE id = $2`,
        [item.quantity, item.itemId]
      );
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Store in entries created successfully',
      grnNumber: uniqueGRN 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in store in entry:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Store Out entry
router.post('/out', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      grnNumber,
      itemId,
      quantity,
      unit,
      department,
      issuedTo,
      vehicleNumber,
      driverName,
      dateTime,
      remarks
    } = req.body;

    // Check stock availability
    const stockResult = await client.query(
      'SELECT current_stock FROM store_items WHERE id = $1',
      [itemId]
    );

    if (stockResult.rows[0].current_stock < quantity) {
      throw new Error('Insufficient stock');
    }

    // Create store entry
    await client.query(
      `INSERT INTO store_entries (
        grn_number, entry_type, item_id, quantity, unit,
        department, issued_to, vehicle_number, driver_name,
        date_time, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [grnNumber, 'STORE_OUT', itemId, quantity, unit,
       department, issuedTo, vehicleNumber, driverName,
       dateTime, remarks]
    );

    // Update store item stock
    await client.query(
      `UPDATE store_items 
       SET current_stock = current_stock - $1
       WHERE id = $2`,
      [quantity, itemId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Store out entry created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in store out entry:', error);
    res.status(500).json({ 
      error: error.message === 'Insufficient stock' 
        ? 'Insufficient stock' 
        : 'Internal server error' 
    });
  } finally {
    client.release();
  }
});

// Add new store item
router.post('/items', async (req, res) => {
  try {
    const { item_name, item_code, category, unit } = req.body;

    // Validate required fields
    if (!item_name || !item_code || !category || !unit) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if item code already exists
    const existingItem = await pool.query(
      'SELECT id FROM store_items WHERE item_code = $1',
      [item_code]
    );

    if (existingItem.rows.length > 0) {
      return res.status(400).json({ error: 'Item code already exists' });
    }

    // Insert new item
    const result = await pool.query(
      `INSERT INTO store_items (
        item_name, item_code, category, unit, current_stock
      ) VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [item_name, item_code, category, unit, 0]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding store item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get GRNs for a specific date
router.get('/grns', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('Fetching GRNs for date:', date); // Debug log

    const query = `
      SELECT 
        se.grn_number,
        si.item_name,
        si.unit,
        se.quantity,
        COALESCE(sr.returned_quantity, 0) as returned_quantity
      FROM store_entries se
      JOIN store_items si ON se.item_id = si.id
      LEFT JOIN (
        SELECT grn_number, SUM(quantity) as returned_quantity
        FROM store_returns
        GROUP BY grn_number
      ) sr ON sr.grn_number = se.grn_number
      WHERE DATE(se.date_time) = DATE($1)
      AND se.entry_type = 'STORE_OUT'
      AND se.grn_number IS NOT NULL
      AND (se.quantity > COALESCE(sr.returned_quantity, 0))
      ORDER BY se.date_time DESC
    `;
    
    const result = await pool.query(query, [date]);
    console.log('Found GRNs:', result.rows.length); // Debug log
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get GRN details
router.get('/grn-details/:grnNumber', async (req, res) => {
  try {
    const { grnNumber } = req.params;
    const query = `
      WITH current_stock AS (
        SELECT 
          item_id,
          SUM(CASE 
            WHEN entry_type = 'STORE_IN' THEN quantity 
            WHEN entry_type = 'STORE_OUT' THEN -quantity 
          END) as current_stock
        FROM store_entries
        GROUP BY item_id
      )
      SELECT 
        se.grn_number,
        se.item_id,
        se.quantity as original_quantity,
        si.unit,
        se.date_time,
        si.item_name,
        a.account_name as vendor_name,
        COALESCE(sr.returned_quantity, 0) as returned_quantity,
        COALESCE(cs.current_stock, 0) as current_stock
      FROM store_entries se
      JOIN store_items si ON se.item_id = si.id
      LEFT JOIN accounts a ON se.vendor_id = a.id
      LEFT JOIN current_stock cs ON cs.item_id = se.item_id
      LEFT JOIN (
        SELECT grn_number, SUM(quantity) as returned_quantity
        FROM store_returns
        GROUP BY grn_number
      ) sr ON sr.grn_number = se.grn_number
      WHERE se.grn_number = $1
      AND se.entry_type = 'STORE_IN'
    `;
    
    const result = await pool.query(query, [grnNumber]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching GRN details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process store return
router.post('/return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { originalGRN, quantity, dateTime, remarks, vendorId, itemId, returnGRN } = req.body;

    console.log('Processing store return with data:', {
      originalGRN,
      quantity,
      dateTime,
      remarks,
      vendorId,
      itemId,
      returnGRN
    });

    // Get original entry details with item information
    const originalResult = await client.query(
      `SELECT 
        se.*,
        si.item_name,
        si.unit,
        pe.price_per_unit,
        COALESCE(
          (SELECT SUM(quantity) 
           FROM store_returns 
           WHERE grn_number = se.grn_number
          ), 0
        ) as returned_quantity
       FROM store_entries se
       JOIN store_items si ON se.item_id = si.id
       JOIN pricing_entries pe ON pe.reference_id = se.id
       LEFT JOIN store_returns sr ON sr.grn_number = se.grn_number
       WHERE se.grn_number = $1
       AND se.entry_type = 'STORE_IN'
       GROUP BY se.id, si.id, pe.price_per_unit`,
      [originalGRN]
    );

    const original = originalResult.rows[0];
    console.log('Found original entry:', original);

    if (!original) {
      throw new Error('Original GRN not found');
    }

    if (quantity > (original.quantity - original.returned_quantity)) {
      throw new Error('Return quantity exceeds available quantity');
    }

    // Generate short return GRN
    const dateObj = new Date(dateTime);
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    const random = Math.floor(100 + Math.random() * 900); // 3-digit random number
    const shortReturnGRN = `SRET-${dd}${mm}${yy}-${random}`;

    // Create store return entry
    const returnResult = await client.query(
      `INSERT INTO store_returns (
        return_grn,
        grn_number,
        quantity,
        date_time,
        remarks,
        item_name,
        unit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, return_grn`,
      [shortReturnGRN, originalGRN, quantity, dateTime, remarks, original.item_name, original.unit]
    );

    console.log('Store return entry created:', returnResult.rows[0]);

    if (!returnResult.rows || !returnResult.rows[0] || !returnResult.rows[0].id) {
      throw new Error('Failed to create store return entry - no ID returned');
    }

    const returnId = returnResult.rows[0].id;

    // Create pending pricing entry with STORE_RETURN type
    const pricingResult = await client.query(
      `INSERT INTO pricing_entries (
        entry_type, 
        reference_id, 
        status, 
        quantity, 
        unit,
        price_per_unit,
        total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      ['STORE_RETURN', returnId, 'PENDING', quantity, original.unit,
       original.price_per_unit, (quantity * original.price_per_unit)]
    );

    console.log('Pricing entry created:', pricingResult.rows[0]);

    // Update store item stock
    const stockResult = await client.query(
      `UPDATE store_items 
       SET current_stock = current_stock - $1
       WHERE id = $2
       RETURNING id, current_stock`,
      [quantity, original.item_id]
    );

    console.log('Stock updated:', stockResult.rows[0]);

    await client.query('COMMIT');
    res.json({ 
      message: 'Store return processed successfully',
      returnId: returnId,
      returnGRN: returnGRN
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing store return:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  } finally {
    client.release();
  }
});

// Get GRNs for a specific vendor
router.get('/vendor-grns/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const query = `
      SELECT 
        se.grn_number,
        si.item_name,
        si.unit,
        se.quantity,
        COALESCE(sr.returned_quantity, 0) as returned_quantity,
        se.date_time as issue_date,
        se.item_id
      FROM store_entries se
      JOIN store_items si ON se.item_id = si.id
      LEFT JOIN (
        SELECT grn_number, SUM(quantity) as returned_quantity
        FROM store_returns
        GROUP BY grn_number
      ) sr ON sr.grn_number = se.grn_number
      WHERE se.vendor_id = $1
      AND se.entry_type = 'STORE_IN'
      AND se.grn_number IS NOT NULL
      AND (se.quantity > COALESCE(sr.returned_quantity, 0))
      ORDER BY se.date_time DESC
    `;
    
    console.log('Executing query for vendor:', vendorId); // Debug log
    const result = await pool.query(query, [vendorId]);
    console.log('Found GRNs:', result.rows.length); // Debug log
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendor GRNs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router; 