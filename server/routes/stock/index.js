const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get stock overview
router.get('/overview', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ge.item_type,
        SUM(
          CASE 
            WHEN ge.entry_type = 'PURCHASE_IN' THEN COALESCE(gep.final_quantity, ge.quantity)
            WHEN ge.entry_type = 'PURCHASE_RETURN' THEN -COALESCE(gep.final_quantity, ge.quantity)
            WHEN ge.entry_type = 'SALE_OUT' THEN -ge.quantity
            WHEN ge.entry_type = 'SALE_RETURN' THEN ge.quantity
          END
        ) as current_quantity,
        ge.unit,
        MAX(ge.date_time) as last_updated
       FROM gate_entries ge
       LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
       WHERE ge.entry_type IN ('PURCHASE_IN', 'PURCHASE_RETURN', 'SALE_OUT', 'SALE_RETURN')
       GROUP BY ge.item_type, ge.unit
       HAVING SUM(
         CASE 
           WHEN ge.entry_type = 'PURCHASE_IN' THEN COALESCE(gep.final_quantity, ge.quantity)
           WHEN ge.entry_type = 'PURCHASE_RETURN' THEN -COALESCE(gep.final_quantity, ge.quantity)
           WHEN ge.entry_type = 'SALE_OUT' THEN -ge.quantity
           WHEN ge.entry_type = 'SALE_RETURN' THEN ge.quantity
         END
       ) > 0
       ORDER BY ge.item_type`
    );

    console.log('Stock overview result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock history
router.get('/history', async (req, res) => {
  try {
    const { itemType, startDate, endDate } = req.query;
    let params = [];
    let conditions = ['ge.entry_type = \'PURCHASE_IN\''];
    
    let query = `
      SELECT 
        ge.id,
        ge.date_time as date,
        ge.grn_number as reference_number,
        ge.item_type,
        COALESCE(gep.final_quantity, ge.quantity) as quantity,
        ge.unit,
        a.account_name as supplier_name
      FROM gate_entries ge
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      LEFT JOIN accounts a ON ge.supplier_id::text = a.id::text
      WHERE a.account_type = 'SUPPLIER'
    `;
    
    if (itemType) {
      params.push(itemType);
      conditions.push(`ge.item_type = $${params.length}`);
    }
    
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      params.push(new Date(startDate));
      conditions.push(`ge.date_time >= $${params.length}`);
    }
    
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      params.push(new Date(endDate));
      conditions.push(`ge.date_time <= $${params.length}`);
    }
    
    query += ` AND ${conditions.join(' AND ')} ORDER BY ge.date_time DESC`;

    console.log('Query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);
    console.log('Stock history result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 