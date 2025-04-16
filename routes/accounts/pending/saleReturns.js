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
        gr.return_number as grn_number,
        gep.account_id,
        gr.return_quantity as quantity,
        gep.status,
        ge.unit,
        ge.paper_type,
        ge.has_return,
        p.account_name as purchaser_name,
        gep.original_grn_number,
        gr.return_reason,
        gr.date_time,
        gr.vehicle_type,
        gr.vehicle_number,
        gr.driver_name
       FROM gate_entries_pricing gep
       JOIN gate_returns gr ON gr.return_number = gep.grn_number
       JOIN gate_entries ge ON gep.original_grn_number = ge.grn_number
       JOIN accounts p ON ge.purchaser_id = p.id
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