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
        voucher_no VARCHAR(20),
        created_by INTEGER,
        processed_by_role VARCHAR(50),
        account_id INTEGER,
        account_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        account_type VARCHAR(50),
        level1_id INTEGER,
        level2_id INTEGER,
        level3_id INTEGER,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (level1_id) REFERENCES chart_of_accounts(id),
        FOREIGN KEY (level2_id) REFERENCES chart_of_accounts(id),
        FOREIGN KEY (level3_id) REFERENCES chart_of_accounts(id)
      );

      CREATE TABLE IF NOT EXISTS ledger_entries (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        account_id INTEGER NOT NULL,
        debit_amount DECIMAL(10,2) DEFAULT 0,
        credit_amount DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        voucher_no VARCHAR(20),
        created_by INTEGER,
        processed_by_role VARCHAR(50),
        account_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add voucher_no column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'expenses' 
          AND column_name = 'voucher_no'
        ) THEN 
          ALTER TABLE expenses ADD COLUMN voucher_no VARCHAR(20);
        END IF;
      END $$;

      -- Add created_by column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'expenses' 
          AND column_name = 'created_by'
        ) THEN 
          ALTER TABLE expenses ADD COLUMN created_by INTEGER;
        END IF;
      END $$;

      -- Add processed_by_role column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'expenses' 
          AND column_name = 'processed_by_role'
        ) THEN 
          ALTER TABLE expenses ADD COLUMN processed_by_role VARCHAR(50);
        END IF;
      END $$;

      -- Add account_id and account_type columns if they don't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'expenses' 
          AND column_name = 'account_id'
        ) THEN 
          ALTER TABLE expenses ADD COLUMN account_id INTEGER;
        END IF;

        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'expenses' 
          AND column_name = 'account_type'
        ) THEN 
          ALTER TABLE expenses ADD COLUMN account_type VARCHAR(50);
        END IF;
      END $$;

      -- Add account_type column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'ledger_entries' 
          AND column_name = 'account_type'
        ) THEN 
          ALTER TABLE ledger_entries ADD COLUMN account_type VARCHAR(50);
        END IF;
      END $$;
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

// Generate next voucher number
const generateVoucherNo = async (type, client) => {
  const year = new Date().getFullYear();
  const prefix = 'EV'; // Expense Voucher
  
  const { rows } = await client.query(
    `SELECT voucher_no
     FROM expenses 
     WHERE voucher_no LIKE $1 
     ORDER BY id DESC
     LIMIT 1`,
    [`${prefix}${year}%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0 && rows[0].voucher_no) {
    const lastNumber = parseInt(rows[0].voucher_no.substring(6)); // Skip prefix and year
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
};

// Add new expense
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { date, expenseType, amount, receiverName, remarks, voucherNo, account_type, account_id } = req.body;
    
    // Convert amount to number and ensure it's properly formatted
    const numericAmount = Math.round(parseFloat(amount) * 100) / 100; // Round to 2 decimal places
    
    console.log('Received request body:', {
      date,
      expenseType,
      originalAmount: amount,
      numericAmount: numericAmount,
      amountType: typeof amount,
      numericAmountType: typeof numericAmount,
      receiverName,
      remarks,
      voucherNo,
      account_type,
      account_id
    });

    let expenseTypeName;
    let accountDetails = null;

    // Handle different types of expense entries
    if (account_type === 'OTHER') {
      console.log('Processing OTHER type expense with account_id:', account_id);
      
      // For OTHER type, get the account details from all level tables
      const accountQuery = `
        SELECT 
          a.*,
          l1.name as level1_name,
          l2.name as level2_name,
          l3.name as level3_name
        FROM (
          SELECT 
            id::integer,
            name::text,
            account_type::text,
            id::integer as level1_id,
            NULL::integer as level2_id,
            NULL::integer as level3_id,
            'LEVEL1'::text as level
          FROM chart_of_accounts_level1
          WHERE id = $1
          UNION ALL
          SELECT 
            id::integer,
            name::text,
            account_type::text,
            level1_id::integer,
            id::integer as level2_id,
            NULL::integer as level3_id,
            'LEVEL2'::text as level
          FROM chart_of_accounts_level2
          WHERE id = $1
          UNION ALL
          SELECT 
            id::integer,
            name::text,
            account_type::text,
            level1_id::integer,
            level2_id::integer,
            id::integer as level3_id,
            'LEVEL3'::text as level
          FROM chart_of_accounts_level3
          WHERE id = $1
        ) a
        LEFT JOIN chart_of_accounts_level1 l1 ON a.level1_id = l1.id
        LEFT JOIN chart_of_accounts_level2 l2 ON a.level2_id = l2.id
        LEFT JOIN chart_of_accounts_level3 l3 ON a.level3_id = l3.id
      `;
      
      console.log('Executing account query:', accountQuery, 'with params:', [account_id]);
      
      const { rows: [accountData] } = await client.query(accountQuery, [account_id]);
      
      console.log('Account query result:', accountData);

      if (!accountData) {
        console.log('No account found for id:', account_id);
        throw new Error('Invalid account selected');
      }

      accountDetails = accountData;
      // Use the full account hierarchy name
      const parts = [];
      if (accountData.level1_name) parts.push(accountData.level1_name);
      if (accountData.level2_name) parts.push(accountData.level2_name);
      if (accountData.level3_name) parts.push(accountData.level3_name);
      
      expenseTypeName = parts.length > 0 ? parts.join(' > ') : accountData.name;
          
      console.log('Account data for hierarchy:', {
        level1_name: accountData.level1_name,
        level2_name: accountData.level2_name,
        level3_name: accountData.level3_name,
        name: accountData.name,
        constructed: expenseTypeName
      });
    } else if (isNaN(expenseType)) {
      // If it's a string, use it directly as the expense type name
      expenseTypeName = expenseType;
    } else {
      // If it's a number, get the expense type name from the database
    const { rows: [expenseTypeData] } = await client.query(
      'SELECT name FROM expense_types WHERE id = $1',
      [expenseType]
    );

    if (!expenseTypeData) {
      throw new Error('Invalid expense type');
      }
      expenseTypeName = expenseTypeData.name;
    }

    // Generate voucher number if not provided
    const finalVoucherNo = voucherNo || await generateVoucherNo('EXPENSE', client);

    // Update cash in hand
    await client.query(
      'UPDATE cash_tracking SET cash_in_hand = cash_in_hand - $1, last_updated = CURRENT_TIMESTAMP',
      [numericAmount]
    );

    // Create cash_transactions entry for dashboard
    const cashBalanceResult = await client.query(`
      SELECT COALESCE(
        SUM(CASE 
          WHEN type = 'CREDIT' THEN amount 
          WHEN type = 'DEBIT' THEN -amount 
          ELSE 0 
        END),
        0
      ) as current_balance
      FROM cash_transactions
      WHERE transaction_date <= $1
    `, [new Date(date)]);
    
    const currentBalance = Number(cashBalanceResult.rows[0].current_balance);
    const newBalance = currentBalance - numericAmount;

    console.log('Creating cash_transactions entry for expense:', {
      type: 'DEBIT',
      amount: numericAmount,
      reference: finalVoucherNo,
      remarks: `Expense payment to ${receiverName}${remarks ? ` - ${remarks}` : ''}`,
      currentBalance,
      newBalance,
      transactionDate: new Date(date)
    });

    await client.query(
      `INSERT INTO cash_transactions (
        type, amount, reference, remarks, balance, balance_after, transaction_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'DEBIT',
        numericAmount,
        finalVoucherNo,
        `Expense payment to ${receiverName}${remarks ? ` - ${remarks}` : ''}`,
        currentBalance,
        newBalance,
        new Date(date)
      ]
    );

    console.log('Cash transaction created successfully for expense');

    // Insert into expenses table
    const { rows: [expense] } = await client.query(
      `INSERT INTO expenses (
        date, 
        expense_type, 
        amount, 
        receiver_name, 
        remarks, 
        voucher_no,
        created_by,
        processed_by_role,
        account_id,
        account_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        new Date(date), 
        expenseTypeName, 
        numericAmount, 
        receiverName, 
        remarks, 
        finalVoucherNo,
        req.body.created_by,
        req.body.processed_by_role,
        account_type === 'OTHER' ? account_id : null,
        account_type
      ]
    );

    // Create ledger entry for OTHER type accounts
    if (account_type === 'OTHER' && accountDetails) {
      console.log('Creating ledger entries for OTHER type account:', accountDetails);
      
      // Create ledger entry for the expense account
      const expenseLedgerResult = await client.query(
        `INSERT INTO ledger_entries (
          date,
          account_id,
          debit_amount,
          credit_amount,
          description,
          voucher_no,
          created_by,
          processed_by_role,
          account_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          new Date(date),
          account_id,
          numericAmount,
          0,
          `Expense payment to ${receiverName} (${expenseTypeName}) - ${remarks || 'No remarks'}`,
          finalVoucherNo,
          req.body.created_by,
          req.body.processed_by_role,
          accountDetails.level // Use the level from account details
        ]
      );
      console.log('Created expense ledger entry:', expenseLedgerResult.rows[0]);

      // Create cash ledger entry
      const cashLedgerResult = await client.query(
        `INSERT INTO ledger_entries (
          date,
          account_id,
          debit_amount,
          credit_amount,
          description,
          voucher_no,
          created_by,
          processed_by_role,
          account_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          new Date(date),
          1, // Assuming 1 is the cash account ID
          0,
          numericAmount,
          `Expense payment to ${receiverName} (${expenseTypeName}) - ${remarks || 'No remarks'}`,
          finalVoucherNo,
          req.body.created_by,
          req.body.processed_by_role,
          'CASH'
        ]
      );
      console.log('Created cash ledger entry:', cashLedgerResult.rows[0]);

      // Also create entries for parent accounts if they exist
      if (accountDetails.level1_id) {
        const level1Result = await client.query(
          `INSERT INTO ledger_entries (
            date,
            account_id,
            debit_amount,
            credit_amount,
            description,
            voucher_no,
            created_by,
            processed_by_role,
            account_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            new Date(date),
            accountDetails.level1_id,
            numericAmount,
            0,
            `Expense payment to ${receiverName} (${expenseTypeName}) - ${remarks || 'No remarks'}`,
            finalVoucherNo,
            req.body.created_by,
            req.body.processed_by_role,
            'LEVEL1'
          ]
        );
        console.log('Created level1 ledger entry:', level1Result.rows[0]);
      }

      if (accountDetails.level2_id) {
        const level2Result = await client.query(
          `INSERT INTO ledger_entries (
            date,
            account_id,
            debit_amount,
            credit_amount,
            description,
            voucher_no,
            created_by,
            processed_by_role,
            account_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            new Date(date),
            accountDetails.level2_id,
            numericAmount,
            0,
            `Expense payment to ${receiverName} (${expenseTypeName}) - ${remarks || 'No remarks'}`,
            finalVoucherNo,
            req.body.created_by,
            req.body.processed_by_role,
            'LEVEL2'
          ]
    );
        console.log('Created level2 ledger entry:', level2Result.rows[0]);
      }

      // Update ledger balances
      await client.query(
        `UPDATE ledgers 
         SET amount = amount + $1 
         WHERE account_id = $2 AND account_type = $3`,
        [numericAmount, account_id, accountDetails.level]
      );

      if (accountDetails.level1_id) {
        await client.query(
          `UPDATE ledgers 
           SET amount = amount + $1 
           WHERE account_id = $2 AND account_type = $3`,
          [numericAmount, accountDetails.level1_id, 'LEVEL1']
        );
      }

      if (accountDetails.level2_id) {
        await client.query(
          `UPDATE ledgers 
           SET amount = amount + $1 
           WHERE account_id = $2 AND account_type = $3`,
          [numericAmount, accountDetails.level2_id, 'LEVEL2']
        );
      }

      // Update cash balance
      await client.query(
        `UPDATE ledgers 
         SET amount = amount - $1 
         WHERE account_id = $2 AND account_type = $3`,
        [numericAmount, 1, 'CASH']
      );

      // Create transaction entry for the ledger view
      // Get the unified_account_id and account hierarchy for the account
      const unifiedAccountResult = await client.query(
        `SELECT 
          COALESCE(l1.unified_id, l2.unified_id, l3.unified_id) as unified_account_id,
          CASE 
            WHEN l3.id IS NOT NULL THEN CONCAT(l1.name, ' > ', l2.name, ' > ', l3.name)
            WHEN l2.id IS NOT NULL THEN CONCAT(l1.name, ' > ', l2.name)
            ELSE l1.name
          END as account_hierarchy
         FROM (
           SELECT id, unified_id FROM chart_of_accounts_level1 WHERE id = $1
           UNION ALL
           SELECT id, unified_id FROM chart_of_accounts_level2 WHERE id = $1
           UNION ALL
           SELECT id, unified_id FROM chart_of_accounts_level3 WHERE id = $1
         ) AS accounts(id, unified_id)
         LEFT JOIN chart_of_accounts_level1 l1 ON accounts.id = l1.id
         LEFT JOIN chart_of_accounts_level2 l2 ON accounts.id = l2.id
         LEFT JOIN chart_of_accounts_level3 l3 ON accounts.id = l3.id
         WHERE accounts.id = $1`,
        [account_id]
      );

      if (unifiedAccountResult.rows.length > 0) {
        const unified_account_id = unifiedAccountResult.rows[0].unified_account_id;
        const account_hierarchy = unifiedAccountResult.rows[0].account_hierarchy;
        
        console.log('About to create transaction entry for ledger view:', {
          account_id,
          unified_account_id,
          account_hierarchy,
          finalVoucherNo,
          amount: numericAmount,
          description: `Expense payment to ${receiverName} (${account_hierarchy})${remarks ? ` - ${remarks}` : ''}`
        });
        
        // Create transaction record for the ledger view
        const transactionResult = await client.query(
          `INSERT INTO transactions (
            transaction_date,
            account_id,
            unified_account_id,
            reference_no,
            entry_type,
            amount,
            description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            new Date(date),
            account_id,
            unified_account_id,
            finalVoucherNo,
            'DEBIT',
            amount,
            `Expense payment to ${receiverName} (${account_hierarchy})${remarks ? ` - ${remarks}` : ''}`
          ]
        );
        
        console.log('Successfully created transaction entry for ledger view:', transactionResult.rows[0]);
      } else {
        console.log('No unified_account_id found for account_id:', account_id);
      }
    }

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

// Add endpoint to generate next expense voucher number
router.get('/generate-voucher', async (req, res) => {
  const client = await pool.connect();
  try {
    const voucherNo = await generateVoucherNo('EXPENSE', client);
    res.json({ voucherNo });
  } catch (error) {
    console.error('Error generating voucher number:', error);
    res.status(500).json({ message: 'Error generating voucher number' });
  } finally {
    client.release();
  }
});

// Get expense history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, expenseType } = req.query;
    
    console.log('Fetching expense history with params:', { startDate, endDate, expenseType });
    
    let query = `
      SELECT 
        e.*,
        e.expense_type as expense_type_name,
        CASE 
          WHEN e.account_type = 'OTHER' THEN 
            CASE 
              WHEN a.level = 'LEVEL3' THEN CONCAT(l1.name, ' > ', l2.name, ' > ', l3.name)
              WHEN a.level = 'LEVEL2' THEN CONCAT(l1.name, ' > ', l2.name)
              ELSE l1.name
            END
          ELSE e.expense_type
        END as display_name,
        a.id as account_id,
        a.name as account_name,
        a.level1_id,
        a.level2_id,
        a.level3_id,
        l1.name as level1_name,
        l2.name as level2_name,
        l3.name as level3_name
      FROM expenses e
      LEFT JOIN (
        SELECT 
          id,
          name,
          account_type,
          level1_id,
          level2_id,
          level3_id,
          'LEVEL1' as level
        FROM chart_of_accounts_level1
        UNION ALL
        SELECT 
          id,
          name,
          account_type,
          level1_id,
          level2_id,
          level3_id,
          'LEVEL2' as level
        FROM chart_of_accounts_level2
        UNION ALL
        SELECT 
          id,
          name,
          account_type,
          level1_id,
          level2_id,
          level3_id,
          'LEVEL3' as level
        FROM chart_of_accounts_level3
      ) a ON e.account_id = a.id
      LEFT JOIN chart_of_accounts_level1 l1 ON a.level1_id = l1.id
      LEFT JOIN chart_of_accounts_level2 l2 ON a.level2_id = l2.id
      LEFT JOIN chart_of_accounts_level3 l3 ON a.level3_id = l3.id
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
      if (isNaN(expenseType)) {
        query += ` AND e.expense_type = $${paramCount}`;
        queryParams.push(expenseType);
      } else {
      const { rows: [expenseTypeData] } = await pool.query(
        'SELECT name FROM expense_types WHERE id = $1',
        [expenseType]
      );
      if (expenseTypeData) {
        query += ` AND e.expense_type = $${paramCount}`;
        queryParams.push(expenseTypeData.name);
        }
      }
      paramCount++;
    }

    query += ` ORDER BY e.date DESC`;

    console.log('Executing history query:', query);
    console.log('With params:', queryParams);

    const { rows } = await pool.query(query, queryParams);
    console.log('History query results:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching expense history:', error);
    res.status(500).json({ message: error.message || 'Error fetching expense history' });
  }
});

module.exports = router; 