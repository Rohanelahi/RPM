const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get purchases for a specific date
router.get('/daily-activity/purchases', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        ge.grn_number,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        TO_CHAR(ge.date_time, 'HH24:MI') as time,
        a.account_name as supplier_name,
        gep.price_per_unit,
        gep.total_amount
      FROM gate_entries ge
      LEFT JOIN accounts a ON ge.purchaser_id = a.id
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      WHERE ge.entry_type = 'PURCHASE'
      AND DATE(ge.date_time) = $1
      ORDER BY ge.date_time
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily purchases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales for a specific date
router.get('/daily-activity/sales', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        ge.grn_number,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        TO_CHAR(ge.date_time, 'HH24:MI') as time,
        a.account_name as customer_name,
        gep.price_per_unit,
        gep.total_amount
      FROM gate_entries ge
      LEFT JOIN accounts a ON ge.purchaser_id = a.id
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      WHERE ge.entry_type = 'SALE_OUT'
      AND DATE(ge.date_time) = $1
      ORDER BY ge.date_time
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expenses for a specific date
router.get('/daily-activity/expenses', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        e.id,
        e.expense_type as category,
        e.amount,
        e.receiver_name,
        e.remarks as description,
        TO_CHAR(e.date, 'HH24:MI') as time
      FROM expenses e
      WHERE DATE(e.date) = $1
      ORDER BY e.date
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments received for a specific date
router.get('/daily-activity/payments/received', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        p.id,
        p.amount,
        p.payment_mode as payment_method,
        p.remarks,
        p.receiver_name,
        TO_CHAR(p.payment_date, 'HH24:MI') as time,
        a.account_name
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.payment_type = 'RECEIVED'
      AND DATE(p.payment_date) = $1
      ORDER BY p.payment_date
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily payments received:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments issued for a specific date
router.get('/daily-activity/payments/issued', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        p.id,
        p.amount,
        p.payment_mode as payment_method,
        p.remarks,
        p.receiver_name,
        TO_CHAR(p.payment_date, 'HH24:MI') as time,
        a.account_name
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.payment_type = 'ISSUED'
      AND DATE(p.payment_date) = $1
      ORDER BY p.payment_date
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily payments issued:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get maintenance activities for a specific date
router.get('/daily-activity/maintenance', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // Return empty array for now since maintenance table doesn't exist yet
    res.json([]);
    
    /* Uncomment this when maintenance table is created
    const query = `
      SELECT 
        m.id,
        m.machine_name,
        m.description,
        m.status,
        m.cost,
        TO_CHAR(m.maintenance_date, 'HH24:MI') as time
      FROM maintenance m
      WHERE DATE(m.maintenance_date) = $1
      ORDER BY m.maintenance_date
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
    */
  } catch (error) {
    console.error('Error fetching daily maintenance activities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get purchase returns for a specific date
router.get('/daily-activity/returns/purchase', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        ge.grn_number,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        TO_CHAR(ge.date_time, 'HH24:MI') as time,
        a.account_name as supplier_name
      FROM gate_entries ge
      LEFT JOIN accounts a ON ge.purchaser_id = a.id
      WHERE ge.entry_type = 'PURCHASE_RETURN'
      AND DATE(ge.date_time) = $1
      ORDER BY ge.date_time
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily purchase returns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sale returns for a specific date
router.get('/daily-activity/returns/sale', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const query = `
      SELECT 
        ge.grn_number,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        TO_CHAR(ge.date_time, 'HH24:MI') as time,
        a.account_name as customer_name
      FROM gate_entries ge
      LEFT JOIN accounts a ON ge.purchaser_id = a.id
      WHERE ge.entry_type = 'SALE_RETURN'
      AND DATE(ge.date_time) = $1
      ORDER BY ge.date_time
    `;
    
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily sale returns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 