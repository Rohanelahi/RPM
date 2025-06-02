const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Get pending purchase entries
router.get('/purchase', async (req, res) => {
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
        ge.item_type,
        COALESCE(
          (SELECT name FROM chart_of_accounts_level3 WHERE id = ge.supplier_id),
          (SELECT name FROM chart_of_accounts_level2 WHERE id = ge.supplier_id),
          (SELECT name FROM chart_of_accounts_level1 WHERE id = ge.supplier_id)
        ) as supplier_name,
        TO_CHAR(ge.date_time, 'DD/MM/YYYY HH24:MI') as date_time
       FROM gate_entries_pricing gep
       JOIN gate_entries ge ON gep.grn_number = ge.grn_number
       WHERE gep.status = 'PENDING'
       AND gep.entry_type = 'PURCHASE'
       ORDER BY ge.date_time DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending purchase entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 