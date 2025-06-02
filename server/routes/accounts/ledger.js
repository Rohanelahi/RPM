const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get ledger entries
router.get('/', async (req, res) => {
    const { accountId, startDate, endDate, userRole } = req.query;
  const client = await pool.connect();

  try {
    // First, let's check for duplicate transactions
    const { rows: duplicateCheck } = await client.query(
      `SELECT reference_no, account_id, COUNT(*) as count
       FROM transactions
       WHERE account_id = $1
       GROUP BY reference_no, account_id
       HAVING COUNT(*) > 1`,
      [accountId]
    );

    if (duplicateCheck.length > 0) {
      console.log('Found duplicate transactions:', duplicateCheck);
    }

    // First, get the account details from the appropriate chart level
    const { rows: [account] } = await client.query(
      `WITH account_details AS (
        SELECT 
          id::text,
          name,
          opening_balance,
          balance_type,
          account_type,
          NULL::text as level1_id,
          NULL::text as level2_id,
          1 as level
        FROM chart_of_accounts_level1
        WHERE id = $1
        UNION ALL
        SELECT 
          id::text,
          name,
          opening_balance,
          balance_type,
        account_type,
          level1_id::text,
          NULL::text as level2_id,
          2 as level
        FROM chart_of_accounts_level2
        WHERE id = $1
        UNION ALL
        SELECT 
          id::text,
          name,
        opening_balance,
          balance_type,
          account_type,
          level1_id::text,
          level2_id::text,
          3 as level
        FROM chart_of_accounts_level3
        WHERE id = $1
      )
      SELECT 
        a.*,
        CASE 
          WHEN a.level = 1 THEN a.name
          WHEN a.level = 2 THEN l1.name
          WHEN a.level = 3 THEN l1.name
        END as level1_name,
        CASE 
          WHEN a.level = 1 THEN NULL
          WHEN a.level = 2 THEN a.name
          WHEN a.level = 3 THEN l2.name
        END as level2_name,
        CASE 
          WHEN a.level = 1 THEN NULL
          WHEN a.level = 2 THEN NULL
          WHEN a.level = 3 THEN a.name
        END as level3_name
      FROM account_details a
      LEFT JOIN chart_of_accounts_level1 l1 ON a.level1_id::integer = l1.id
      LEFT JOIN chart_of_accounts_level2 l2 ON a.level2_id::integer = l2.id`,
      [accountId]
    );

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get child accounts based on the account's level
    let childAccounts = [];
    if (account.level === 1) {
      // For level 1, get all level 2 and level 3 accounts
      const { rows: level2Accounts } = await client.query(
        `SELECT id::text as id
         FROM chart_of_accounts_level2
         WHERE level1_id = $1`,
        [accountId]
      );
      
      const { rows: level3Accounts } = await client.query(
        `SELECT id::text as id
         FROM chart_of_accounts_level3
         WHERE level1_id = $1`,
        [accountId]
      );
      
      childAccounts = [...level2Accounts, ...level3Accounts].map(acc => acc.id);
    } else if (account.level === 2) {
      // For level 2, get all level 3 accounts
      const { rows: level3Accounts } = await client.query(
        `SELECT id::text as id
         FROM chart_of_accounts_level3
         WHERE level2_id = $1`,
        [accountId]
      );
      
      childAccounts = level3Accounts.map(acc => acc.id);
    }

    // Get transactions for the account and its children
    const { rows: transactions } = await client.query(
      `WITH all_accounts AS (
        SELECT id::text, level FROM (
          SELECT id, 1 as level FROM chart_of_accounts_level1 WHERE id = ANY($1::integer[])
          UNION ALL
          SELECT id, 2 as level FROM chart_of_accounts_level2 WHERE id = ANY($1::integer[])
          UNION ALL
          SELECT id, 3 as level FROM chart_of_accounts_level3 WHERE id = ANY($1::integer[])
        ) accounts
      ),
      unique_transactions AS (
        SELECT DISTINCT ON (t.id) t.*
        FROM transactions t
        JOIN all_accounts a ON t.account_id::text = a.id
        WHERE t.transaction_date BETWEEN $2 AND $3
        ORDER BY t.id, t.transaction_date
      )
      SELECT DISTINCT ON (ut.reference_no)
        ut.*,
        CASE 
          WHEN a.level = 1 THEN l1.name
          WHEN a.level = 2 THEN l2.name
          WHEN a.level = 3 THEN l3.name
        END as account_name,
        ge.grn_number,
        ge.item_type,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        gep.price_per_unit as gep_price,
        gep.final_quantity,
        gep.cut_weight,
        si.item_name as store_item_name,
        se.unit as store_unit,
        se.quantity as store_quantity,
        si.item_name as store_item_type,
        se.grn_number as store_grn,
        COALESCE(ut.price_per_unit, pe.price_per_unit, gep.price_per_unit, gep_original.price_per_unit) as price_per_unit,
        pe.total_amount as store_total_amount,
        pe.status as pricing_status,
        pe.processed_at as pricing_processed_at,
        gr.return_number,
        gr.return_quantity,
        gr.return_reason,
        gr.original_grn_number,
        gep_original.price_per_unit as original_price,
        gep_original.quantity as original_quantity,
        CASE 
          WHEN ut.entry_type = 'STORE_RETURN' THEN 'DEBIT'
          WHEN ut.entry_type = 'PURCHASE_RETURN' THEN 'DEBIT'
          ELSE ut.entry_type
        END as entry_type,
        CASE
          WHEN ut.entry_type IN ('CREDIT', 'DEBIT') THEN ut.reference_no
          ELSE COALESCE(ut.reference_no, gr.return_number, ge.grn_number, se.grn_number)
        END as reference
      FROM unique_transactions ut
      JOIN all_accounts a ON ut.account_id::text = a.id
      LEFT JOIN chart_of_accounts_level1 l1 ON a.id::integer = l1.id AND a.level = 1
      LEFT JOIN chart_of_accounts_level2 l2 ON a.id::integer = l2.id AND a.level = 2
      LEFT JOIN chart_of_accounts_level3 l3 ON a.id::integer = l3.id AND a.level = 3
      LEFT JOIN gate_entries ge ON ut.reference_no = ge.grn_number
      LEFT JOIN gate_returns gr ON ut.reference_no = gr.return_number
      LEFT JOIN store_entries se ON ut.reference_no = se.grn_number
      LEFT JOIN store_items si ON se.item_id = si.id
      LEFT JOIN pricing_entries pe ON pe.reference_id = se.id 
        AND pe.entry_type = 'STORE_PURCHASE'
        AND pe.status = 'PROCESSED'
        AND pe.processed_at = (
          SELECT MAX(processed_at)
          FROM pricing_entries pe2
          WHERE pe2.reference_id = se.id
          AND pe2.entry_type = 'STORE_PURCHASE'
          AND pe2.status = 'PROCESSED'
        )
      LEFT JOIN LATERAL (
        SELECT *
        FROM gate_entries_pricing gep2
        WHERE gep2.grn_number = COALESCE(ge.grn_number, gr.return_number) 
        AND gep2.status = 'PROCESSED'
        AND gep2.entry_type = CASE 
          WHEN ut.entry_type = 'SALE_RETURN' THEN 'SALE_RETURN'
          ELSE gep2.entry_type
        END
        ORDER BY gep2.processed_at DESC
        LIMIT 1
      ) gep ON TRUE
      LEFT JOIN LATERAL (
        SELECT *
        FROM gate_entries_pricing gep3
        WHERE gep3.grn_number = gr.original_grn_number
        AND gep3.status = 'PROCESSED'
        AND gep3.entry_type = 'SALE'
        ORDER BY gep3.processed_at DESC
        LIMIT 1
      ) gep_original ON TRUE
      ORDER BY ut.reference_no, ut.transaction_date DESC, ut.id ASC`,
      [[accountId, ...childAccounts], startDate, endDate]
    );

    // Calculate opening balance
    const { rows: [{ opening_balance }] } = await client.query(
      `WITH all_accounts AS (
        SELECT id::text FROM (
          SELECT id FROM chart_of_accounts_level1 WHERE id = ANY($1::integer[])
          UNION ALL
          SELECT id FROM chart_of_accounts_level2 WHERE id = ANY($1::integer[])
        UNION ALL
          SELECT id FROM chart_of_accounts_level3 WHERE id = ANY($1::integer[])
        ) accounts
      )
      SELECT COALESCE(SUM(
        CASE 
          WHEN entry_type = 'CREDIT' THEN amount
          WHEN entry_type = 'DEBIT' THEN -amount
          ELSE 0
        END
      ), 0) as opening_balance
      FROM transactions
      WHERE account_id::text IN (SELECT id FROM all_accounts)
      AND transaction_date < $2`,
      [[accountId, ...childAccounts], startDate]
    );

    // Calculate current balance
    const { rows: [{ current_balance }] } = await client.query(
      `WITH all_accounts AS (
        SELECT id::text FROM (
          SELECT id FROM chart_of_accounts_level1 WHERE id = ANY($1::integer[])
          UNION ALL
          SELECT id FROM chart_of_accounts_level2 WHERE id = ANY($1::integer[])
          UNION ALL
          SELECT id FROM chart_of_accounts_level3 WHERE id = ANY($1::integer[])
        ) accounts
      )
      SELECT COALESCE(SUM(
        CASE 
          WHEN entry_type = 'CREDIT' THEN amount
          WHEN entry_type = 'DEBIT' THEN -amount
          ELSE 0
        END
      ), 0) as current_balance
      FROM transactions
      WHERE account_id::text IN (SELECT id FROM all_accounts)
      AND transaction_date <= $2`,
      [[accountId, ...childAccounts], endDate]
    );

    // Calculate the final balances based on balance_type
    const accountOpeningBalance = parseFloat(account.opening_balance || 0);
    const transactionOpeningBalance = parseFloat(opening_balance);
    const transactionCurrentBalance = parseFloat(current_balance);

    // For opening balance, use the account's balance_type
    let finalOpeningBalance = accountOpeningBalance;
    if (account.balance_type === 'DEBIT') {
      finalOpeningBalance = -Math.abs(accountOpeningBalance);
    } else {
      finalOpeningBalance = Math.abs(accountOpeningBalance);
    }

    let finalCurrentBalance = finalOpeningBalance + transactionCurrentBalance;

    // Format balances with proper suffix
    const formatBalance = (amount, balanceType, isOpeningBalance = false) => {
      const absAmount = Math.abs(amount);
      let suffix;
      
      if (isOpeningBalance) {
        // For opening balance, always use the account's balance_type
        suffix = balanceType;
      } else {
        // For transaction balances, determine based on amount
        suffix = amount >= 0 ? 'CREDIT' : 'DEBIT';
      }
      
      return `${absAmount.toFixed(2)} ${suffix}`;
    };

    res.json({
      account_details: {
        ...account,
        opening_balance: finalOpeningBalance,
        opening_balance_display: formatBalance(accountOpeningBalance, account.balance_type, true),
        current_balance: finalCurrentBalance,
        current_balance_display: formatBalance(finalCurrentBalance, account.balance_type),
        balance_type: account.balance_type
      },
      transactions: transactions.map((t, index) => {
        const amount = parseFloat(t.amount);
        let runningBalance = accountOpeningBalance;
        
        // Calculate running balance up to this transaction
        for (let i = 0; i <= index; i++) {
          const curr = transactions[i];
          const currAmount = parseFloat(curr.amount);
          
          if (curr.entry_type === 'CREDIT') {
            runningBalance += currAmount;
          } else {
            runningBalance -= currAmount;
          }
        }

        // Format transaction details based on type
        let details = '';
        if (t.description && t.description.startsWith('Store Return:')) {
          // For store return, show formatted details with original GRN
          const quantity = t.quantity || 0;
          const unit = t.unit || 'unit';
          const itemName = t.item_name || t.store_item_name || '';
          const price = t.price_per_unit || 0;
          const originalGRN = t.original_grn_number || '-';
          details = `Store Return against GRN: ${originalGRN} - ${quantity} ${unit} of ${itemName} @ Rs.${price}/${unit}`;
        } else if (t.entry_type === 'SALE_RETURN') {
          const quantity = t.return_quantity || t.quantity || t.original_quantity || 0;
          const price = t.price_per_unit || t.original_price || t.gep_price || 0;
          const unit = t.unit || 'unit';
          const itemType = t.paper_type || t.item_type || '';
          details = `Return against GRN: ${t.original_grn_number} - ${quantity} ${unit} of ${itemType} @ Rs.${price}/${unit}`;
        } else if (t.entry_type === 'PURCHASE_RETURN') {
          const quantity = t.return_quantity || t.quantity || t.original_quantity || 0;
          const price = t.price_per_unit || t.original_price || t.gep_price || 0;
          const unit = t.unit || 'unit';
          const itemType = t.paper_type || t.item_type || '';
          details = `Return against GRN: ${t.original_grn_number} - ${quantity} ${unit} of ${itemType} @ Rs.${price}/${unit}`;
        } else if (t.item_type) {
          details = `${t.final_quantity || t.quantity} ${t.unit} of ${t.item_type} @ Rs.${t.price_per_unit}/${t.unit}`;
        } else if (t.store_item_name) {
          details = `${t.store_quantity} ${t.store_unit} of ${t.store_item_name} @ Rs.${t.price_per_unit}/${t.store_unit}`;
        } else {
          details = t.description;
        }

        return {
          ...t,
          date: t.transaction_date,
          type: t.entry_type,
          amount: amount,
          reference: t.return_grn || t.return_number || t.grn_number || t.store_grn || t.reference,
          details: details,
          balance_display: formatBalance(runningBalance, account.balance_type)
        };
      })
    });
  } catch (error) {
    console.error('Error in ledger route:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 