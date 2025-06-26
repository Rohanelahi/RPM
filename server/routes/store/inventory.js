const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get inventory items with current stock levels and latest prices
router.get('/inventory', async (req, res) => {
  try {
    console.log('Starting inventory query...');
    
    const query = `
      WITH item_stock AS (
        -- Calculate stock levels for each item with vendor info
        SELECT 
          si.id as item_id,
          si.item_name,
          si.item_code,
          si.category as item_type,
          si.unit,
          COALESCE(SUM(
            CASE 
              WHEN se.entry_type = 'STORE_IN' THEN se.quantity
              WHEN se.entry_type = 'STORE_OUT' THEN -se.quantity
            END
          ), 0) + COALESCE(SUM(
            CASE 
              WHEN sr.id IS NOT NULL THEN sr.quantity
            END
          ), 0) as quantity,
          MAX(COALESCE(sr.date_time, se.date_time)) as last_updated,
          STRING_AGG(DISTINCT 
            COALESCE(l3.name, l2.name, l1.name), ', ' 
            ORDER BY COALESCE(l3.name, l2.name, l1.name)
          ) FILTER (WHERE se.entry_type = 'STORE_IN' AND se.vendor_id IS NOT NULL) as vendor_names
        FROM store_items si
        LEFT JOIN store_entries se ON si.id = se.item_id
        LEFT JOIN store_returns sr ON sr.grn_number = se.grn_number
        LEFT JOIN chart_of_accounts_level3 l3 ON se.vendor_id = l3.id
        LEFT JOIN chart_of_accounts_level2 l2 ON se.vendor_id = l2.id
        LEFT JOIN chart_of_accounts_level1 l1 ON se.vendor_id = l1.id
        GROUP BY si.id, si.item_name, si.item_code, si.category, si.unit
        HAVING COALESCE(SUM(
          CASE 
            WHEN se.entry_type = 'STORE_IN' THEN se.quantity
            WHEN se.entry_type = 'STORE_OUT' THEN -se.quantity
          END
        ), 0) + COALESCE(SUM(
          CASE 
            WHEN sr.id IS NOT NULL THEN sr.quantity
          END
        ), 0) > 0
      ),
      item_prices AS (
        -- Get latest price for each item
        SELECT 
          se.item_id,
          pe.price_per_unit,
          ROW_NUMBER() OVER (PARTITION BY se.item_id ORDER BY se.date_time DESC) as rn
        FROM store_entries se
        JOIN pricing_entries pe ON pe.reference_id = se.id AND pe.entry_type = 'STORE_PURCHASE'
        WHERE se.entry_type = 'STORE_IN'
      )
      SELECT 
        ROW_NUMBER() OVER (ORDER BY istock.item_name) as id,
        istock.item_name,
        istock.item_code,
        istock.item_type,
        istock.unit,
        istock.quantity,
        istock.last_updated,
        COALESCE(ip.price_per_unit, 0) as last_price,
        COALESCE(istock.vendor_names, '') as vendor_name
      FROM item_stock istock
      LEFT JOIN item_prices ip ON istock.item_id = ip.item_id AND ip.rn = 1
      ORDER BY istock.item_name;
    `;

    console.log('Executing inventory query...'); // Debug log
    const { rows } = await pool.query(query);
    console.log('Found inventory items:', rows.length); // Debug log
    
    // Debug: Check vendor data
    if (rows.length > 0) {
      console.log('Sample inventory items:', rows.slice(0, 3).map(item => ({
        name: item.item_name,
        quantity: item.quantity,
        vendor: item.vendor_name,
        price: item.last_price
      })));
      
      // Debug: Check raw vendor data
      const debugQuery = `
        SELECT 
          se.item_id,
          se.vendor_id,
          a.account_name,
          a.chart_account_id,
          l1.name as level1_name,
          l2.name as level2_name,
          l3.name as level3_name
        FROM store_entries se
        JOIN accounts a ON se.vendor_id = a.id
        LEFT JOIN chart_of_accounts_level1 l1 ON a.chart_account_id = l1.id
        LEFT JOIN chart_of_accounts_level2 l2 ON a.chart_account_id = l2.id
        LEFT JOIN chart_of_accounts_level3 l3 ON a.chart_account_id = l3.id
        WHERE se.entry_type = 'STORE_IN' AND se.vendor_id IS NOT NULL
        LIMIT 5
      `;
      
      try {
        const debugResult = await pool.query(debugQuery);
        console.log('Debug vendor data:', debugResult.rows);
      } catch (debugError) {
        console.log('Debug query error:', debugError.message);
      }
      
      // Debug: Check all store entries
      const allStoreEntriesQuery = `
        SELECT 
          se.id,
          se.entry_type,
          se.vendor_id,
          se.item_id,
          se.quantity,
          se.grn_number,
          a.account_name,
          si.item_name
        FROM store_entries se
        LEFT JOIN accounts a ON se.vendor_id = a.id
        LEFT JOIN store_items si ON se.item_id = si.id
        ORDER BY se.date_time DESC
        LIMIT 10
      `;
      
      try {
        const allEntriesResult = await pool.query(allStoreEntriesQuery);
        console.log('All store entries:', allEntriesResult.rows);
      } catch (allEntriesError) {
        console.log('All entries query error:', allEntriesError.message);
      }
      
      // Debug: Check what accounts exist
      const accountsQuery = `
        SELECT 
          id,
          account_name,
          account_type,
          chart_account_id
        FROM accounts
        ORDER BY id
        LIMIT 10
      `;
      
      try {
        const accountsResult = await pool.query(accountsQuery);
        console.log('Available accounts:', accountsResult.rows);
      } catch (accountsError) {
        console.log('Accounts query error:', accountsError.message);
      }
      
      // Debug: Check chart of accounts
      const chartQuery = `
        SELECT 
          'level1' as level,
          id,
          name
        FROM chart_of_accounts_level1
        UNION ALL
        SELECT 
          'level2' as level,
          id,
          name
        FROM chart_of_accounts_level2
        UNION ALL
        SELECT 
          'level3' as level,
          id,
          name
        FROM chart_of_accounts_level3
        ORDER BY level, id
        LIMIT 20
      `;
      
      try {
        const chartResult = await pool.query(chartQuery);
        console.log('Chart of accounts:', chartResult.rows);
      } catch (chartError) {
        console.log('Chart query error:', chartError.message);
      }
    }
    
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
          grn_number,
          item_id,
          entry_type,
          quantity,
          unit,
          department,
          issued_to,
          date_time,
          remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        `ISSUE-${issue.id}-${Date.now()}`, // Generate a unique GRN
        itemDetails.id,
        'STORE_OUT',
        item.quantity,
        itemDetails.unit,
        department,
        'Maintenance Issue',
        issueDate,
        `Maintenance issue ID: ${issue.id}`
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