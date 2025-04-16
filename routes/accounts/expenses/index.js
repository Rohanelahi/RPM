const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Create expenses table if it doesn't exist
const createExpensesTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        expense_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        receiver_name VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Expenses table created successfully or already exists');
  } catch (error) {
    console.error('Error creating expenses table:', error);
  } finally {
    client.release();
  }
};

// Run the migration when the server starts
createExpensesTable();

// Add new expense
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { date, expenseType, amount, receiverName, remarks } = req.body;

    // Update cash in hand
    await client.query(
      'UPDATE cash_tracking SET cash_in_hand = cash_in_hand - $1, last_updated = CURRENT_TIMESTAMP',
      [amount]
    );

    const { rows: [expense] } = await client.query(
      `INSERT INTO expenses (date, expense_type, amount, receiver_name, remarks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [new Date(date), expenseType, amount, receiverName, remarks]
    );

    await client.query('COMMIT');
    res.json(expense);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding expense:', error);
    res.status(500).json({ message: error.message || 'Error adding expense' });
  } finally {
    client.release();
  }
});

// Get expense history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, expenseType } = req.query;
    
    let query = `
      SELECT * FROM expenses 
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND DATE(date) >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND DATE(date) <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    if (expenseType) {
      query += ` AND expense_type = $${paramCount}`;
      queryParams.push(expenseType);
      paramCount++;
    }

    query += ` ORDER BY date DESC`;

    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching expense history:', error);
    res.status(500).json({ message: error.message || 'Error fetching expense history' });
  }
});

module.exports = router; 