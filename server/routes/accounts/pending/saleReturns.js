const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Get pending sale return entries
router.get('/sale-returns', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        gep.id as pricing_id,
        gep.entry_type,
        gep.grn_number,
        gep.account_id,
        gep.quantity,
        gep.status,
        gr.return_reason,
        gr.date_time as return_date,
        gr.vehicle_type,
        gr.vehicle_number,
        gr.driver_name,
        p.account_name as purchaser_name,
        ge.paper_type as item_type,
        ge.unit
       FROM gate_entries_pricing gep
       JOIN gate_returns gr ON gr.return_number = gep.grn_number
       JOIN gate_entries ge ON gr.original_grn_number = ge.grn_number
       JOIN accounts p ON gep.account_id = p.id
       WHERE gep.status = 'PENDING'
       AND gep.entry_type = 'SALE_RETURN'
       ORDER BY gr.date_time DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending sale returns:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 