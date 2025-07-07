const express = require('express');
const router = express.Router();
const pool = require('../../db');

const listAccounts = require('./listAccounts');
const createAccount = require('./createAccount');
const updateAccount = require('./updateAccount');
const pendingEntries = require('./pending');
const processEntry = require('./processEntry');
const processReturn = require('./processReturn');
const ledgerRouter = require('./ledger');
const storeInRoute = require('./storeInRoute');
const processStoreReturn = require('./processStoreReturn');
const incomeStatement = require('./incomeStatement');
const paymentsRouter = require('./payments');
const expensesRouter = require('./expenses');
const chartLevel1Router = require('./chart/level1');
const chartLevel2Router = require('./chart/level2');
const chartLevel3Router = require('./chart/level3');
const bankAccountsRouter = require('./bankAccounts');

router.use('/', listAccounts);
router.use('/create', createAccount);
router.use('/update', updateAccount);
router.use('/pending', pendingEntries);
router.use('/process-entry', processEntry);
router.use('/return', processReturn);
router.use('/ledger', ledgerRouter);
router.use('/store-in', storeInRoute);
router.use('/store-return', processStoreReturn);
router.use('/income-statement', incomeStatement);
router.use('/payments', paymentsRouter);
router.use('/expenses', expensesRouter);
router.use('/chart/level1', chartLevel1Router);
router.use('/chart/level2', chartLevel2Router);
router.use('/chart/level3', chartLevel3Router);
router.use('/bank-accounts', bankAccountsRouter);

// Add this route to handle GRN lookups
router.get('/grn/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    const { grnNumber } = req.params;
    
    const query = `
      SELECT 
        ge.*,
        gep.price_per_unit,
        gep.final_quantity,
        gep.total_amount,
        gep.cut_weight,
        a.account_name as supplier_name
      FROM gate_entries ge
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      LEFT JOIN accounts a ON ge.supplier_id::text = a.id::text
      WHERE ge.grn_number = $1
    `;
    
    const result = await client.query(query, [grnNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    console.log('GRN Data:', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching GRN details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add this route to handle GRN updates
router.put('/grn/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    const { grnNumber } = req.params;
    const { cut_weight, price_per_unit, final_quantity, total_amount } = req.body;
    
    const query = `
      UPDATE gate_entries_pricing 
      SET 
        cut_weight = $1,
        price_per_unit = $2,
        final_quantity = $3,
        total_amount = $4
      WHERE grn_number = $5
      RETURNING *
    `;
    
    const result = await client.query(query, [
      cut_weight,
      price_per_unit,
      final_quantity,
      total_amount,
      grnNumber
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating GRN details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Create cash tracking table
const createCashTrackingTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_tracking (
        id SERIAL PRIMARY KEY,
        cash_in_hand DECIMAL(10,2) DEFAULT 0,
        cash_in_bank DECIMAL(10,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert initial record if none exists
    await client.query(`
      INSERT INTO cash_tracking (cash_in_hand, cash_in_bank)
      SELECT 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM cash_tracking)
    `);
    
    console.log('Cash tracking table created successfully');
  } catch (error) {
    console.error('Error creating cash tracking table:', error);
  } finally {
    client.release();
  }
};

// Run the migration
createCashTrackingTable();

// Get payment details by voucher number
router.get('/payment/:voucherNo', async (req, res) => {
  const client = await pool.connect();
  try {
    const { voucherNo } = req.params;
    
    const query = `
      SELECT 
        p.*,
        a.account_name,
        a.account_type,
        CASE 
          WHEN p.bank_account_id IS NOT NULL THEN b.bank_name
          ELSE NULL
        END as bank_name,
        TO_CHAR(p.payment_date, 'DD/MM/YYYY HH24:MI:SS') as payment_date_time
      FROM payments p
      JOIN accounts a ON p.account_id = a.id
      LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
      WHERE p.voucher_no = $1
    `;
    
    const result = await client.query(query, [voucherNo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get store entry details by GRN number
router.get('/store-entry/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    const { grnNumber } = req.params;
    
    const query = `
      SELECT 
        se.*,
        si.item_name,
        si.unit,
        COALESCE(
          (SELECT name FROM chart_of_accounts_level3 WHERE id = se.vendor_id),
          (SELECT name FROM chart_of_accounts_level2 WHERE id = se.vendor_id),
          (SELECT name FROM chart_of_accounts_level1 WHERE id = se.vendor_id)
        ) as vendor_name,
        COALESCE(sr.returned_quantity, 0) as returned_quantity,
        TO_CHAR(se.date_time, 'DD/MM/YYYY HH24:MI:SS') as date_time,
        pe.price_per_unit,
        pe.total_amount
      FROM store_entries se
      JOIN store_items si ON se.item_id = si.id
      LEFT JOIN (
        SELECT grn_number, SUM(quantity) as returned_quantity
        FROM store_returns
        GROUP BY grn_number
      ) sr ON sr.grn_number = se.grn_number
      LEFT JOIN pricing_entries pe ON pe.reference_id = se.id AND pe.entry_type = 'STORE_PURCHASE'
      WHERE se.grn_number = $1
      AND se.entry_type = 'STORE_IN'
    `;
    
    const result = await client.query(query, [grnNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching store entry details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update payment details
router.put('/payment/:voucherNo', async (req, res) => {
  const client = await pool.connect();
  try {
    const { voucherNo } = req.params;
    const { amount, remarks } = req.body;
    
    const query = `
      UPDATE payments 
      SET 
        amount = $1,
        remarks = COALESCE($2, remarks)
      WHERE voucher_no = $3
      RETURNING *
    `;
    
    const result = await client.query(query, [amount, remarks, voucherNo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update store entry details
router.put('/store-entry/:grnNumber', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { grnNumber } = req.params;
    const { quantity, price_per_unit, total_amount, remarks } = req.body;
    
    // Update store entry
    const storeQuery = `
      UPDATE store_entries 
      SET 
        quantity = $1,
        remarks = COALESCE($2, remarks)
      WHERE grn_number = $3
      RETURNING *
    `;
    
    const storeResult = await client.query(storeQuery, [quantity, remarks, grnNumber]);
    
    if (storeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Store entry not found' });
    }
    
    // First check if pricing entry exists
    const checkPricingQuery = `
      SELECT id, total_amount FROM pricing_entries 
      WHERE reference_id = $1 AND entry_type = 'STORE_PURCHASE'
    `;
    const pricingCheck = await client.query(checkPricingQuery, [storeResult.rows[0].id]);
    
    let pricingResult;
    if (pricingCheck.rows.length > 0) {
      // Calculate the difference in amount for ledger update
      const oldAmount = pricingCheck.rows[0].total_amount || 0;
      const amountDiff = total_amount - oldAmount;
      
      // Update existing pricing entry
      const updatePricingQuery = `
        UPDATE pricing_entries 
        SET 
          price_per_unit = $1,
          total_amount = $2,
          status = 'PROCESSED',
          processed_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      pricingResult = await client.query(updatePricingQuery, [
        price_per_unit,
        total_amount,
        pricingCheck.rows[0].id
      ]);
      
      // Update account balance if amount changed
      if (amountDiff !== 0) {
        // First update the account balance
        await client.query(
          'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
          [amountDiff, storeResult.rows[0].vendor_id]
        );
        
        // Then update the transaction record with all details
        await client.query(
          `UPDATE transactions 
           SET 
             amount = $1,
             quantity = $2,
             price_per_unit = $3,
             description = $4
           WHERE reference_no = $5 AND entry_type = 'CREDIT'`,
          [
            total_amount,
            quantity,
            price_per_unit,
            `Purchase against GRN: ${grnNumber}`,
            grnNumber
          ]
        );
      }
    } else {
      // Insert new pricing entry
      const insertPricingQuery = `
        INSERT INTO pricing_entries (
          entry_type,
          reference_id,
          price_per_unit,
          total_amount,
          status,
          quantity,
          unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      pricingResult = await client.query(insertPricingQuery, [
        'STORE_PURCHASE',
        storeResult.rows[0].id,
        price_per_unit,
        total_amount,
        'PROCESSED',
        quantity,
        storeResult.rows[0].unit
      ]);
      
      // Update account balance for new entry
      await client.query(
        'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
        [total_amount, storeResult.rows[0].vendor_id]
      );
      
      // Get the unified_account_id for the account
      const accountResult = await client.query(
        `SELECT 
          COALESCE(l1.unified_id, l2.unified_id, l3.unified_id) as unified_account_id
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
        [storeResult.rows[0].vendor_id]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const unified_account_id = accountResult.rows[0].unified_account_id;

      // Create a new transaction record
      await client.query(
        `INSERT INTO transactions (
          transaction_date,
          account_id,
          unified_account_id,
          reference_no,
          entry_type,
          amount,
          description,
          item_name,
          quantity,
          unit,
          price_per_unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          new Date(),
          storeResult.rows[0].vendor_id,
          unified_account_id,
          grnNumber,
          'CREDIT',
          total_amount,
          `Purchase against GRN: ${grnNumber}`,
          storeResult.rows[0].item_name,
          quantity,
          storeResult.rows[0].unit,
          price_per_unit
        ]
      );
    }
    
    await client.query('COMMIT');
    res.json({
      ...storeResult.rows[0],
      price_per_unit: pricingResult.rows[0].price_per_unit,
      total_amount: pricingResult.rows[0].total_amount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating store entry details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/payments/long-voucher', async (req, res) => {
  const client = await pool.connect();
  try {
    const { fromAccount, toAccount, amount, date, description } = req.body;
    
    console.log('Long voucher request received:', {
      fromAccount,
      toAccount,
      amount,
      date,
      description
    });
    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert amount to number and ensure it's properly formatted
    const numericAmount = Math.round(parseFloat(amount) * 100) / 100; // Round to 2 decimal places
    
    console.log('Long voucher request:', {
      fromAccount,
      toAccount,
      originalAmount: amount,
      numericAmount: numericAmount,
      amountType: typeof amount,
      numericAmountType: typeof numericAmount,
      date,
      description
    });

    // Create date object with current time in local timezone
    const now = new Date();
    const dateObj = new Date();
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj.setFullYear(year, month - 1, day);
    }
    // Set the current time
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    // Generate short voucher number
    const yy = String(dateObj.getFullYear()).slice(-2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const random = Math.floor(100 + Math.random() * 900);
    const voucherNo = `LV-${yy}${mm}${dd}-${random}`;

    // Get account names with hierarchy
    const fromAccountQuery = `
      SELECT 
        l1.name as level1_name,
        l2.name as level2_name,
        l3.name as level3_name
      FROM chart_of_accounts_level3 l3
      JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id
      JOIN chart_of_accounts_level1 l1 ON l2.level1_id = l1.id
      WHERE l3.id = $1
      UNION ALL
      SELECT 
        l1.name as level1_name,
        l2.name as level2_name,
        NULL as level3_name
      FROM chart_of_accounts_level2 l2
      JOIN chart_of_accounts_level1 l1 ON l2.level1_id = l1.id
      WHERE l2.id = $1
      UNION ALL
      SELECT 
        name as level1_name,
        NULL as level2_name,
        NULL as level3_name
      FROM chart_of_accounts_level1
      WHERE id = $1
    `;

    const toAccountQuery = fromAccountQuery;

    const { rows: fromRows } = await client.query(fromAccountQuery, [fromAccount]);
    const { rows: toRows } = await client.query(toAccountQuery, [toAccount]);

    console.log('Account query results:', {
      fromAccount,
      toAccount,
      fromRows,
      toRows
    });

    const fromName = fromRows[0] ? 
      [fromRows[0].level1_name, fromRows[0].level2_name, fromRows[0].level3_name]
        .filter(Boolean)
        .join(' > ') : 'Account';

    const toName = toRows[0] ? 
      [toRows[0].level1_name, toRows[0].level2_name, toRows[0].level3_name]
        .filter(Boolean)
        .join(' > ') : 'Account';

    console.log('Account names:', {
      fromName,
      toName
    });

    // Create a more concise description
    const detail = description && description.trim().length > 0
      ? description
      : `${fromName} to ${toName}`;

    // Get unified_account_ids for both accounts - improved to handle accounts that exist in multiple levels
    const fromAccountResult = await client.query(
      `SELECT unified_account_id FROM (
        SELECT l3.unified_id as unified_account_id, 3 as priority
        FROM chart_of_accounts_level3 l3 WHERE l3.id = $1
        UNION ALL
        SELECT l2.unified_id as unified_account_id, 2 as priority
        FROM chart_of_accounts_level2 l2 WHERE l2.id = $1
        UNION ALL
        SELECT l1.unified_id as unified_account_id, 1 as priority
        FROM chart_of_accounts_level1 l1 WHERE l1.id = $1
      ) accounts
      ORDER BY priority DESC
      LIMIT 1`,
      [fromAccount]
    );

    const toAccountResult = await client.query(
      `SELECT unified_account_id FROM (
        SELECT l3.unified_id as unified_account_id, 3 as priority
        FROM chart_of_accounts_level3 l3 WHERE l3.id = $1
        UNION ALL
        SELECT l2.unified_id as unified_account_id, 2 as priority
        FROM chart_of_accounts_level2 l2 WHERE l2.id = $1
        UNION ALL
        SELECT l1.unified_id as unified_account_id, 1 as priority
        FROM chart_of_accounts_level1 l1 WHERE l1.id = $1
      ) accounts
      ORDER BY priority DESC
      LIMIT 1`,
      [toAccount]
    );

    if (fromAccountResult.rows.length === 0 || toAccountResult.rows.length === 0) {
      throw new Error('One or both accounts not found');
    }

    const fromUnifiedId = fromAccountResult.rows[0].unified_account_id;
    const toUnifiedId = toAccountResult.rows[0].unified_account_id;

    console.log('Unified account IDs:', {
      fromAccount,
      toAccount,
      fromUnifiedId,
      toUnifiedId,
      fromAccountResult: fromAccountResult.rows[0],
      toAccountResult: toAccountResult.rows[0]
    });

    console.log('Long voucher transaction details:', {
      fromAccount,
      toAccount,
      fromUnifiedId,
      toUnifiedId,
      fromName,
      toName,
      voucherNo,
      numericAmount,
      detail
    });

    await client.query('BEGIN');
    // CREDIT from account
    const creditResult = await client.query(
      `INSERT INTO transactions (transaction_date, account_id, unified_account_id, reference_no, entry_type, amount, description, created_at)
       VALUES ($1, $2, $3, $4, 'CREDIT', $5, $6, NOW())
       RETURNING id, account_id, unified_account_id`,
      [dateObj, fromAccount, fromUnifiedId, voucherNo, numericAmount, detail]
    );
    
    console.log('Created CREDIT transaction:', creditResult.rows[0]);
    
    // DEBIT to account
    const debitResult = await client.query(
      `INSERT INTO transactions (transaction_date, account_id, unified_account_id, reference_no, entry_type, amount, description, created_at)
       VALUES ($1, $2, $3, $4, 'DEBIT', $5, $6, NOW())
       RETURNING id, account_id, unified_account_id`,
      [dateObj, toAccount, toUnifiedId, voucherNo, numericAmount, detail]
    );
    
    console.log('Created DEBIT transaction:', debitResult.rows[0]);
    await client.query('COMMIT');
    res.json({ message: 'Long voucher created', voucherNo });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/chart/all', async (req, res) => {
  const client = await pool.connect();
  try {
    // Level 1
    const { rows: l1 } = await client.query(`
      SELECT 
        id, 
        name, 
        1 as level,
        account_type,
        name as level1_name,
        NULL as level2_name,
        NULL as level3_name,
        id as level1_id,
        NULL as level2_id,
        NULL as level3_id
      FROM chart_of_accounts_level1
    `);

    // Level 2 with parent
    const { rows: l2 } = await client.query(`
      SELECT 
        l2.id, 
        l2.name, 
        2 as level,
        l2.account_type,
        l1.name as level1_name,
        l2.name as level2_name,
        NULL as level3_name,
        l1.id as level1_id,
        l2.id as level2_id,
        NULL as level3_id
      FROM chart_of_accounts_level2 l2
      JOIN chart_of_accounts_level1 l1 ON l2.level1_id = l1.id
    `);

    // Level 3 with parents
    const { rows: l3 } = await client.query(`
      SELECT 
        l3.id, 
        l3.name, 
        3 as level,
        l3.account_type,
        l1.name as level1_name,
        l2.name as level2_name,
        l3.name as level3_name,
        l1.id as level1_id,
        l2.id as level2_id,
        l3.id as level3_id
      FROM chart_of_accounts_level3 l3
      JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id
      JOIN chart_of_accounts_level1 l1 ON l2.level1_id = l1.id
    `);

    // Combine all accounts and format them
    const allAccounts = [...l1, ...l2, ...l3].map(account => ({
      ...account,
      displayName: account.level === 1 
        ? account.name 
        : account.level === 2 
          ? `${account.level1_name} > ${account.name}`
          : `${account.level1_name} > ${account.level2_name} > ${account.name}`,
      uniqueId: `${account.level}-${account.id}` // Add a unique identifier
    })).sort((a, b) => {
      if (a.level1_name !== b.level1_name) {
        return a.level1_name.localeCompare(b.level1_name);
      }
      if (a.level2_name !== b.level2_name) {
        return (a.level2_name || '').localeCompare(b.level2_name || '');
      }
      return a.name.localeCompare(b.name);
    });

    res.json(allAccounts);
  } catch (err) {
    console.error('Error fetching all accounts:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add route for process-store-purchase
router.post('/process-store-purchase', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { entryId, pricePerUnit, totalAmount, finalQuantity, processedBy } = req.body;
    console.log('Processing store purchase:', { entryId, pricePerUnit, totalAmount, finalQuantity, processedBy });

    // Get store entry details with complete item information
    const { rows: [entry] } = await client.query(
      `SELECT 
         pe.id as pricing_id,
         pe.price_per_unit,
         se.quantity,
         se.unit,
         se.grn_number,
         se.vendor_id,
         se.id as store_entry_id,
         CURRENT_TIMESTAMP as process_time,
         si.item_name,
         si.item_code,
         si.unit as item_unit,
         COALESCE(
           (SELECT name FROM chart_of_accounts_level3 WHERE id = se.vendor_id),
           (SELECT name FROM chart_of_accounts_level2 WHERE id = se.vendor_id),
           (SELECT name FROM chart_of_accounts_level1 WHERE id = se.vendor_id)
         ) as vendor_name
       FROM pricing_entries pe
       JOIN store_entries se ON pe.reference_id = se.id
       JOIN store_items si ON se.item_id = si.id
       WHERE pe.id = $1`,
      [entryId]
    );

    if (!entry) {
      throw new Error('Store entry not found');
    }

    console.log('Found store entry:', entry);

    // Verify vendor exists in chart of accounts
    const vendorCheck = await client.query(
      `SELECT id FROM (
        SELECT id FROM chart_of_accounts_level1 WHERE id = $1
        UNION ALL
        SELECT id FROM chart_of_accounts_level2 WHERE id = $1
        UNION ALL
        SELECT id FROM chart_of_accounts_level3 WHERE id = $1
      ) as vendor WHERE id = $1`,
      [entry.vendor_id]
    );

    if (vendorCheck.rows.length === 0) {
      throw new Error('Invalid vendor ID');
    }

    // Get the unified_account_id for the account
    const accountResult = await client.query(
      `SELECT 
        COALESCE(l1.unified_id, l2.unified_id, l3.unified_id) as unified_account_id
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
      [entry.vendor_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }

    const unified_account_id = accountResult.rows[0].unified_account_id;

    // Create transaction for vendor with description containing all details
    const transactionResult = await client.query(
      `INSERT INTO transactions (
        account_id, 
        unified_account_id,
        transaction_date, 
        reference_no,
        entry_type, 
        amount, 
        description,
        item_name,
        quantity,
        unit,
        price_per_unit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        entry.vendor_id,
        unified_account_id,
        entry.process_time,
        entry.grn_number,
        'CREDIT',
        totalAmount,
        `Store Purchase: ${entry.item_name} from ${entry.vendor_name}`,
        entry.item_name,
        finalQuantity || entry.quantity,
        entry.unit,
        pricePerUnit
      ]
    );

    console.log('Created transaction:', transactionResult.rows[0]);

    // Update pricing entry status and details
    const pricingResult = await client.query(
      `UPDATE pricing_entries 
       SET status = 'PROCESSED', 
           price_per_unit = $1,
           total_amount = $2,
           processed_at = CURRENT_TIMESTAMP,
           quantity = $3,
           unit = $4,
           reference_id = $5
       WHERE id = $6
       RETURNING *`,
      [pricePerUnit, totalAmount, finalQuantity || entry.quantity, entry.unit, entry.store_entry_id, entryId]
    );

    console.log('Updated pricing entry:', pricingResult.rows[0]);

    await client.query('COMMIT');
    res.json({ 
      message: 'Store purchase processed successfully',
      transaction: transactionResult.rows[0],
      pricing: pricingResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing store purchase:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 