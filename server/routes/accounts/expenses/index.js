const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Create expenses and expense_types tables if they don't exist
const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        expense_type VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        receiver_name VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Expense tables created successfully or already exist');
  } catch (error) {
    console.error('Error creating expense tables:', error);
  } finally {
    client.release();
  }
};

// Run the migration when the server starts
createTables();

// Get all expense types
router.get('/types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM expense_types 
      WHERE status = 'ACTIVE'
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expense types:', error);
    res.status(500).json({ error: 'Failed to fetch expense types' });
  }
});

// Add new expense type
router.post('/types', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO expense_types (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding expense type:', error);
    res.status(500).json({ error: 'Failed to add expense type' });
  }
});

// Add new expense
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { date, expenseType, amount, receiverName, remarks } = req.body;

    // Get expense type name
    const { rows: [expenseTypeData] } = await client.query(
      'SELECT name FROM expense_types WHERE id = $1',
      [expenseType]
    );

    if (!expenseTypeData) {
      throw new Error('Invalid expense type');
    }

    // Update cash in hand
    await client.query(
      'UPDATE cash_tracking SET cash_in_hand = cash_in_hand - $1, last_updated = CURRENT_TIMESTAMP',
      [amount]
    );

    const { rows: [expense] } = await client.query(
      `INSERT INTO expenses (date, expense_type, amount, receiver_name, remarks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [new Date(date), expenseTypeData.name, amount, receiverName, remarks]
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
      SELECT 
        e.*,
        e.expense_type as expense_type_name
      FROM expenses e
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND DATE(e.date) >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND DATE(e.date) <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    if (expenseType) {
      const { rows: [expenseTypeData] } = await pool.query(
        'SELECT name FROM expense_types WHERE id = $1',
        [expenseType]
      );
      if (expenseTypeData) {
        query += ` AND e.expense_type = $${paramCount}`;
        queryParams.push(expenseTypeData.name);
        paramCount++;
      }
    }

    query += ` ORDER BY e.date DESC`;

    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching expense history:', error);
    res.status(500).json({ message: error.message || 'Error fetching expense history' });
  }
});

module.exports = router; 