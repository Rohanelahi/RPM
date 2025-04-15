const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Get pending sale entries
router.get('/sale', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        gep.id as pricing_id,
        gep.entry_type,
        gep.grn_number,
        gep.account_id,
        gep.quantity,
        gep.status,
        ge.unit,
        ge.paper_type,
        p.account_name as purchaser_name,
        TO_CHAR(ge.date_time, 'DD/MM/YYYY HH24:MI') as date_time
       FROM gate_entries_pricing gep
       JOIN gate_entries ge ON gep.grn_number = ge.grn_number
       JOIN accounts p ON ge.purchaser_id = p.id
       WHERE gep.status = 'PENDING'
       AND gep.entry_type = 'SALE'
       ORDER BY ge.date_time DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending sale entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 