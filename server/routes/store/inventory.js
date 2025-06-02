const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get inventory items with current stock levels and latest prices
router.get('/inventory', async (req, res) => {
  try {
    const query = `
      WITH store_transactions AS (
        -- Store In transactions
        SELECT 
          si.item_name,
          si.item_code,
          si.category as item_type,
          si.unit,
          se.quantity as qty_in,
          0 as qty_out,
          COALESCE(pe.price_per_unit, 0) as price_per_unit,
          se.created_at as transaction_date,
          COALESCE(
            (SELECT l1.name FROM chart_of_accounts_level1 l1 
             JOIN chart_of_accounts_level3 l3 ON l3.level1_id = l1.id 
             JOIN accounts a2 ON a2.chart_account_id = l3.id 
             WHERE a2.id = se.vendor_id),
            (SELECT l1.name FROM chart_of_accounts_level1 l1 
             JOIN chart_of_accounts_level2 l2 ON l2.level1_id = l1.id 
             JOIN accounts a2 ON a2.chart_account_id = l2.id 
             WHERE a2.id = se.vendor_id),
            (SELECT l1.name FROM chart_of_accounts_level1 l1 
             JOIN accounts a2 ON a2.chart_account_id = l1.id 
             WHERE a2.id = se.vendor_id)
          ) as vendor_name
        FROM store_entries se
        JOIN store_items si ON se.item_id = si.id
        LEFT JOIN pricing_entries pe ON pe.reference_id = se.id
        LEFT JOIN accounts a ON se.vendor_id = a.id
        WHERE se.entry_type = 'STORE_IN'
        
        UNION ALL
        
        -- Store Out transactions (including returns)
        SELECT 
          si.item_name,
          si.item_code,
          si.category as item_type,
          si.unit,
          0 as qty_in,
          CASE 
            WHEN se.entry_type = 'STORE_OUT' THEN se.quantity
            WHEN sr.id IS NOT NULL THEN sr.quantity
          END as qty_out,
          0 as price_per_unit,
          COALESCE(sr.date_time, se.created_at) as transaction_date,
          NULL as vendor_name
        FROM store_entries se
        JOIN store_items si ON se.item_id = si.id
        LEFT JOIN store_returns sr ON sr.grn_number = se.grn_number
        WHERE se.entry_type = 'STORE_OUT' OR sr.id IS NOT NULL
      ),
      current_stock AS (
        SELECT 
          item_name,
          item_code,
          item_type,
          unit,
          SUM(COALESCE(qty_in, 0) - COALESCE(qty_out, 0)) as quantity,
          MAX(transaction_date) as last_updated,
          MAX(CASE WHEN price_per_unit > 0 THEN price_per_unit END) as last_price,
          STRING_AGG(DISTINCT vendor_name, ', ' ORDER BY vendor_name) FILTER (WHERE vendor_name IS NOT NULL) as vendors
        FROM store_transactions
        GROUP BY item_name, item_code, item_type, unit
        HAVING SUM(COALESCE(qty_in, 0) - COALESCE(qty_out, 0)) > 0
      )
      SELECT 
        ROW_NUMBER() OVER (ORDER BY item_name) as id,
        item_name,
        item_code,
        item_type,
        unit,
        quantity,
        last_updated,
        last_price,
        vendors as vendor_name
      FROM current_stock
      ORDER BY item_name;
    `;

    console.log('Executing inventory query...'); // Debug log
    const { rows } = await pool.query(query);
    console.log('Found inventory items:', rows.length); // Debug log
    
    res.json(rows);

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      detail: error.detail
    });
  }
});

// Modify the issue route to remove GRN requirement
router.post('/issue', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const { department, issueDate, items } = req.body;

    // Insert into maintenance_issues table
    const issueQuery = `
      INSERT INTO maintenance_issues (department_code, issue_date)
      VALUES ($1, $2)
      RETURNING id
    `;
    const issueResult = await client.query(issueQuery, [department, issueDate]);
    const issue = issueResult.rows[0];
    
    if (!issue) {
      throw new Error('Failed to create maintenance issue');
    }

    // Process each item
    for (const item of items) {
      // Get current price and item details
      const itemQuery = `
        SELECT 
          si.id,
          si.unit,
          COALESCE(
            (
              SELECT price_per_unit 
              FROM pricing_entries pe
              JOIN store_entries se ON pe.reference_id = se.id
              WHERE se.item_id = si.id
              AND se.entry_type = 'STORE_IN'
              ORDER BY se.date_time DESC
              LIMIT 1
            ),
            0
          ) as current_price
        FROM store_items si
        WHERE si.item_code = $1
      `;
      const itemResult = await client.query(itemQuery, [item.itemCode]);
      const itemDetails = itemResult.rows[0];
      
      if (!itemDetails) {
        throw new Error(`Item not found: ${item.itemCode}`);
      }

      // Verify stock availability
      const stockQuery = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN entry_type = 'STORE_IN' THEN quantity 
              WHEN entry_type = 'STORE_OUT' THEN -quantity 
            END
          ), 0) as available_stock
        FROM store_entries
        WHERE item_id = $1
      `;
      const stockResult = await client.query(stockQuery, [itemDetails.id]);
      const available_stock = stockResult.rows[0]?.available_stock || 0;
      
      if (available_stock < item.quantity) {
        throw new Error(`Insufficient stock for item ${item.itemCode}. Available: ${available_stock}`);
      }

      // Insert issue details
      await client.query(`
        INSERT INTO maintenance_issue_items 
        (issue_id, item_code, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [
        issue.id,
        item.itemCode,
        item.quantity,
        itemDetails.current_price
      ]);
      
      // Update inventory (create STORE_OUT entry without GRN)
      await client.query(`
        INSERT INTO store_entries (
          item_id,
          entry_type,
          quantity,
          reference_type,
          reference_id,
          unit,
          date_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        itemDetails.id,
        'STORE_OUT',
        item.quantity,
        'MAINTENANCE',
        issue.id,
        itemDetails.unit,
        issueDate
      ]);
    }
    
    await client.query('COMMIT');
    res.json({ 
      success: true, 
      issueId: issue.id
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in issue items:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  } finally {
    client.release();
  }
});

// Add route for fetching maintenance history
router.get('/maintenance-history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = `
      SELECT 
        mi.id,
        mi.issue_date,
        mi.department_code,
        d.name as department_name,
        mii.item_code,
        si.item_name,
        si.unit,
        mii.quantity,
        mii.unit_price,
        (mii.quantity * mii.unit_price) as total_price
      FROM maintenance_issues mi
      JOIN maintenance_issue_items mii ON mi.id = mii.issue_id
      JOIN store_items si ON mii.item_code = si.item_code
      JOIN departments d ON mi.department_code = d.code
      WHERE mi.issue_date BETWEEN $1 AND $2
      ORDER BY mi.issue_date DESC
    `;
    
    const { rows } = await pool.query(query, [startDate, endDate]);
    
    // Calculate total cost
    const totalCost = rows.reduce((sum, row) => sum + parseFloat(row.total_price), 0);
    
    res.json({
      issues: rows,
      totalCost
    });
    
  } catch (error) {
    console.error('Error fetching maintenance history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 