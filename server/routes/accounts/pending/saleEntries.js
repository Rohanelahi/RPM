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
        c.name as customer_name,
        c.level1_name,
        c.level2_name,
        TO_CHAR(ge.date_time, 'DD/MM/YYYY HH24:MI') as date_time
       FROM gate_entries_pricing gep
       JOIN gate_entries ge ON gep.grn_number = ge.grn_number
       JOIN (
         SELECT 
           l3.id,
           l3.name,
           l1.name as level1_name,
           l2.name as level2_name
         FROM chart_of_accounts_level3 l3
         JOIN chart_of_accounts_level1 l1 ON l3.level1_id = l1.id
         JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id
       ) c ON ge.purchaser_id = c.id
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