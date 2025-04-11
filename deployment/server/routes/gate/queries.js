const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get GRNs by supplier (excluding already returned items)
router.get('/grns/supplier/:supplierId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ge.*, 
        COALESCE(SUM(gr.return_quantity), 0) as returned_quantity
       FROM gate_entries ge
       LEFT JOIN gate_returns gr ON ge.grn_number = gr.original_grn_number
       WHERE ge.supplier_id = $1 
       AND ge.entry_type = 'PURCHASE_IN'
       GROUP BY ge.id
       HAVING ge.quantity > COALESCE(SUM(gr.return_quantity), 0)
       ORDER BY ge.date_time DESC`,
      [req.params.supplierId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier GRNs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get GRNs by purchaser
router.get('/grns/purchaser/:purchaserId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM gate_entries 
       WHERE purchaser_id = $1 AND entry_type = 'SALE_OUT'
       ORDER BY date_time DESC`,
      [req.params.purchaserId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchaser GRNs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 