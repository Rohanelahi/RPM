const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get sale history with filters
router.get('/sale-history', async (req, res) => {
  try {
    const { paperType, customerId, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        ge.id,
        ge.grn_number,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        ge.date_time,
        a.account_name as customer_name,
        gep.price_per_unit,
        gep.total_amount
      FROM gate_entries ge
      LEFT JOIN accounts a ON ge.purchaser_id = a.id
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      WHERE ge.entry_type = 'SALE_OUT'
    `;
    
    const queryParams = [];
    
    // Add filters
    if (paperType) {
      queryParams.push(paperType);
      query += ` AND ge.paper_type = $${queryParams.length}`;
    }
    
    if (customerId) {
      queryParams.push(customerId);
      query += ` AND ge.purchaser_id = $${queryParams.length}`;
    }
    
    if (startDate) {
      queryParams.push(startDate);
      query += ` AND ge.date_time >= $${queryParams.length}`;
    }
    
    if (endDate) {
      queryParams.push(endDate);
      query += ` AND ge.date_time <= $${queryParams.length}`;
    }
    
    query += ` ORDER BY ge.date_time DESC`;
    
    console.log('Sale history query:', query);
    console.log('Query params:', queryParams);
    
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} sale history records`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sale history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paper-wise sale summary
router.get('/sale-summary', async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        ge.paper_type,
        SUM(ge.quantity) as total_quantity,
        ge.unit,
        AVG(COALESCE(gep.price_per_unit, 0)) as avg_price,
        SUM(COALESCE(gep.total_amount, 0)) as total_amount
      FROM gate_entries ge
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      WHERE ge.entry_type = 'SALE_OUT'
    `;
    
    const queryParams = [];
    
    // Add filters
    if (customerId) {
      queryParams.push(customerId);
      query += ` AND ge.purchaser_id = $${queryParams.length}`;
    }
    
    if (startDate) {
      queryParams.push(startDate);
      query += ` AND ge.date_time >= $${queryParams.length}`;
    }
    
    if (endDate) {
      queryParams.push(endDate);
      query += ` AND ge.date_time <= $${queryParams.length}`;
    }
    
    query += ` GROUP BY ge.paper_type, ge.unit ORDER BY total_amount DESC`;
    
    console.log('Sale summary query:', query);
    console.log('Query params:', queryParams);
    
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} sale summary records`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sale summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 