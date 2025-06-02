const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Sale Out
router.post('/out/sale', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      grnNumber,
      customerId,
      paperType,
      quantity,
      unit,
      vehicleType,
      vehicleNumber,
      driverName,
      dateTime,
      remarks
    } = req.body;

    // Verify customer exists in any level of chart of accounts and is of type CUSTOMER
    const customerResult = await client.query(
      `SELECT * FROM (
        SELECT id, name, account_type, 1 as level 
        FROM chart_of_accounts_level1 
        WHERE account_type = 'CUSTOMER'
        UNION ALL
        SELECT id, name, account_type, 2 as level 
        FROM chart_of_accounts_level2 
        WHERE account_type = 'CUSTOMER'
        UNION ALL
        SELECT id, name, account_type, 3 as level 
        FROM chart_of_accounts_level3 
        WHERE account_type = 'CUSTOMER'
      ) all_accounts
      WHERE id = $1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      throw new Error('Invalid customer selected');
    }

    const customer = customerResult.rows[0];

    // Get or create account for the customer
    const { rows: [account] } = await client.query(
      `INSERT INTO accounts (
        account_name,
        account_type,
        chart_account_id,
        current_balance
      ) 
      SELECT $1, $2, $3, $4
      WHERE NOT EXISTS (
        SELECT 1 FROM accounts WHERE chart_account_id = $3
      )
      RETURNING id`,
      [customer.name, 'CUSTOMER', customerId, 0]
    );

    // If no account was created (because it already exists), get the existing one
    let accountId;
    if (!account) {
      const { rows: [existingAccount] } = await client.query(
        'SELECT id FROM accounts WHERE chart_account_id = $1',
        [customerId]
      );
      accountId = existingAccount.id;
    } else {
      accountId = account.id;
    }

    // 1. Create gate entry using the account ID
    const saleEntry = await client.query(
      `INSERT INTO gate_entries (
        grn_number, entry_type, purchaser_id, vehicle_type, vehicle_number,
        driver_name, paper_type, quantity, unit, date_time, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [grnNumber, 'SALE_OUT', accountId, vehicleType, vehicleNumber,
       driverName, paperType, quantity, unit, dateTime, remarks]
    );

    // 2. Create pricing entry with default values
    await client.query(
      `INSERT INTO gate_entries_pricing (
        entry_type,
        grn_number,
        account_id,
        quantity,
        price_per_unit,
        total_amount,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'SALE',
        grnNumber,
        accountId,
        quantity,
        0, // default price_per_unit
        0, // default total_amount
        'PENDING'
      ]
    );

    await client.query('COMMIT');
    res.json(saleEntry.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in sale entry:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get pending sale entries
router.get('/pending/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT 
        ge.*,
        gep.price_per_unit,
        gep.total_amount,
        gep.status,
        gep.processed_at,
        a.account_name as customer_name,
        COALESCE(
          (SELECT l1.name FROM chart_of_accounts_level1 l1 
           JOIN chart_of_accounts_level3 l3 ON l3.level1_id = l1.id 
           JOIN accounts a2 ON a2.chart_account_id = l3.id 
           WHERE a2.id = ge.purchaser_id),
          (SELECT l1.name FROM chart_of_accounts_level1 l1 
           JOIN chart_of_accounts_level2 l2 ON l2.level1_id = l1.id 
           JOIN accounts a2 ON a2.chart_account_id = l2.id 
           WHERE a2.id = ge.purchaser_id),
          (SELECT l1.name FROM chart_of_accounts_level1 l1 
           JOIN accounts a2 ON a2.chart_account_id = l1.id 
           WHERE a2.id = ge.purchaser_id)
        ) as level1_name,
        COALESCE(
          (SELECT l2.name FROM chart_of_accounts_level2 l2 
           JOIN chart_of_accounts_level3 l3 ON l3.level2_id = l2.id 
           JOIN accounts a2 ON a2.chart_account_id = l3.id 
           WHERE a2.id = ge.purchaser_id),
          (SELECT l2.name FROM chart_of_accounts_level2 l2 
           JOIN accounts a2 ON a2.chart_account_id = l2.id 
           WHERE a2.id = ge.purchaser_id),
          NULL
        ) as level2_name
      FROM gate_entries ge
      JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      JOIN accounts a ON ge.purchaser_id = a.id
      WHERE ge.entry_type = 'SALE_OUT'
      AND gep.status = 'PENDING'
      ORDER BY ge.date_time DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Process sale entry
router.post('/process/sale', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      grnNumber,
      pricePerUnit,
      totalAmount,
      customerId
    } = req.body;

    // Get the account ID for the customer
    const { rows: [account] } = await client.query(
      'SELECT id FROM accounts WHERE chart_account_id = $1',
      [customerId]
    );

    if (!account) {
      throw new Error('Invalid customer account');
    }

    // 1. Update pricing entry
    await client.query(
      `UPDATE gate_entries_pricing 
       SET price_per_unit = $1,
           total_amount = $2,
           status = 'PROCESSED',
           processed_at = CURRENT_TIMESTAMP
       WHERE grn_number = $3`,
      [pricePerUnit, totalAmount, grnNumber]
    );

    // 2. Create transaction for the customer
    await client.query(
      `INSERT INTO transactions (
        account_id,
        entry_type,
        amount,
        reference_no,
        description,
        transaction_date
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        account.id,
        'DEBIT', // For sales, we DEBIT the customer's account
        totalAmount,
        grnNumber,
        `Sale of ${grnNumber}`
      ]
    );

    // 3. Update customer's current balance in accounts table
    await client.query(
      'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
      [totalAmount, account.id] // Add to balance for DEBIT transaction
    );

    await client.query('COMMIT');
    res.json({ message: 'Sale entry processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing sale entry:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;