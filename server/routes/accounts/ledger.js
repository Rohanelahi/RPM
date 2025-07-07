const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get ledger entries
router.get('/', async (req, res) => {
    const { accountId, level, startDate, endDate, userRole } = req.query;
    console.log('Ledger request:', { accountId, level, startDate, endDate, userRole });
    console.log('Level type:', typeof level, 'Level value:', level);
    
    // Adjust end date to include the full day
    let adjustedEndDate = endDate;
    if (endDate) {
      // Parse the date and create a date-only string to avoid timezone issues
      const endDateObj = new Date(endDate);
      const year = endDateObj.getFullYear();
      const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(endDateObj.getDate()).padStart(2, '0');
      adjustedEndDate = `${year}-${month}-${day}`;
    }
    
    console.log('Original end date:', endDate);
    console.log('Adjusted end date:', adjustedEndDate);
    
    // Validate level parameter
    if (level !== undefined && level !== null) {
      const levelNum = parseInt(level);
      console.log('Parsed level:', levelNum);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 3) {
        console.error('Invalid level value:', level, 'parsed as:', levelNum);
        return res.status(400).json({ error: `Invalid level specified: ${level}` });
      }
    }
    
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
    let accountQuery;
    let accountParams = [accountId];
    
    if (level) {
      // If level is specified, query only that specific level
      switch (parseInt(level)) {
        case 1:
          accountQuery = `
            SELECT 
              id::text,
              name,
              opening_balance,
              balance_type,
              account_type,
              1 as level,
              id::text as level1_id,
              NULL::text as level2_id,
              name as level1_name,
              NULL::text as level2_name,
              NULL::text as level3_name,
              name as account_name,
              'Level 1' as account_level
            FROM chart_of_accounts_level1
            WHERE id = $1
          `;
          break;
        case 2:
          accountQuery = `
            SELECT 
              l2.id::text,
              l2.name,
              l2.opening_balance,
              l2.balance_type,
              l2.account_type,
              2 as level,
              l2.level1_id::text as level1_id,
              l2.id::text as level2_id,
              l1.name as level1_name,
              l2.name as level2_name,
              NULL::text as level3_name,
              l2.name as account_name,
              'Level 2' as account_level
            FROM chart_of_accounts_level2 l2
            JOIN chart_of_accounts_level1 l1 ON l2.level1_id = l1.id
            WHERE l2.id = $1
          `;
          break;
        case 3:
          accountQuery = `
            SELECT 
              l3.id::text,
              l3.name,
              l3.opening_balance,
              l3.balance_type,
              l3.account_type,
              3 as level,
              l3.level1_id::text as level1_id,
              l3.level2_id::text as level2_id,
              l1.name as level1_name,
              l2.name as level2_name,
              l3.name as level3_name,
              l3.name as account_name,
              'Level 3' as account_level
            FROM chart_of_accounts_level3 l3
            JOIN chart_of_accounts_level1 l1 ON l3.level1_id = l1.id
            JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id
            WHERE l3.id = $1
          `;
          break;
        default:
          return res.status(400).json({ error: 'Invalid level specified' });
      }
    } else {
      // Fallback to original logic if no level specified
      accountQuery = `
        WITH level1_accounts AS (
        SELECT 
          id::text,
          name,
          opening_balance,
          balance_type,
          account_type,
            1 as level,
            id::text as level1_id,
            NULL::text as level2_id
        FROM chart_of_accounts_level1
        WHERE id = $1
        ),
        level2_accounts AS (
          SELECT 
            l2.id::text,
            l2.name,
            l2.opening_balance,
            l2.balance_type,
            l2.account_type,
            2 as level,
            l2.level1_id::text as level1_id,
            l2.id::text as level2_id
          FROM chart_of_accounts_level2 l2
          WHERE l2.id = $1
        ),
        level3_accounts AS (
          SELECT 
            l3.id::text,
            l3.name,
            l3.opening_balance,
            l3.balance_type,
            l3.account_type,
            3 as level,
            l3.level1_id::text as level1_id,
            l3.level2_id::text as level2_id
          FROM chart_of_accounts_level3 l3
          WHERE l3.id = $1
        ),
        all_accounts AS (
          SELECT * FROM level1_accounts
        UNION ALL
          SELECT * FROM level2_accounts
        UNION ALL
          SELECT * FROM level3_accounts
      )
      SELECT 
        a.*,
          l1.name as level1_name,
          l2.name as level2_name,
          l3.name as level3_name,
        CASE 
            WHEN a.level = 1 THEN l1.name
            WHEN a.level = 2 THEN l2.name
            WHEN a.level = 3 THEN l3.name
          END as account_name,
        CASE 
            WHEN a.level = 1 THEN 'Level 1'
            WHEN a.level = 2 THEN 'Level 2'
            WHEN a.level = 3 THEN 'Level 3'
          END as account_level
        FROM all_accounts a
      LEFT JOIN chart_of_accounts_level1 l1 ON a.level1_id::integer = l1.id
        LEFT JOIN chart_of_accounts_level2 l2 ON a.level2_id::integer = l2.id
        LEFT JOIN chart_of_accounts_level3 l3 ON a.id::integer = l3.id AND a.level = 3
        WHERE a.id = $1::text
        AND (
          (a.level = 1 AND EXISTS (SELECT 1 FROM level1_accounts WHERE id = $1::text))
          OR (a.level = 2 AND EXISTS (SELECT 1 FROM level2_accounts WHERE id = $1::text))
          OR (a.level = 3 AND EXISTS (SELECT 1 FROM level3_accounts WHERE id = $1::text))
        )
      `;
    }

    const { rows: [account] } = await client.query(accountQuery, accountParams);
      
      console.log('Found account:', account);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }

      // Get transactions based on the account level
      let transactionQuery;
      let transactionParams = [accountId, startDate, adjustedEndDate];
      
      if (level) {
        // Use level-specific transaction queries
        switch (parseInt(level)) {
          case 1:
            // For Level 1, get transactions for the account itself AND all its child accounts (Level 2 and Level 3)
            transactionQuery = `
              SELECT 
                t.id,
                t.transaction_date,
                t.reference_no,
                t.entry_type,
                t.amount,
                t.description,
                COALESCE(t.item_name, ge.item_type, ge.paper_type) as item_name,
                p.voucher_no,
                p.payment_date,
                p.payment_mode,
                p.receiver_name,
                p.remarks as payment_remarks,
                t.quantity as qnt,
                gep.cut_weight as ded,
                COALESCE(t.quantity - gep.cut_weight, t.quantity) as net_qnt,
                t.price_per_unit as price,
                CASE 
                  WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                  ELSE t.transaction_date
                END as display_date,
                COALESCE(
                  ABS(
                    (SELECT opening_balance FROM (
                      SELECT COALESCE(SUM(
                        CASE 
                          WHEN t2.entry_type = 'CREDIT' THEN t2.amount
                          WHEN t2.entry_type = 'DEBIT' THEN -t2.amount
                          ELSE 0
                        END
                      ), 0) as opening_balance
                      FROM transactions t2
                      WHERE DATE(t2.transaction_date) < DATE($2)
                      AND (
                        t2.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1)
                        OR t2.unified_account_id IN (
                          SELECT l2.unified_id FROM chart_of_accounts_level2 l2 WHERE l2.level1_id = $1
                        )
                        OR t2.unified_account_id IN (
                          SELECT l3.unified_id FROM chart_of_accounts_level3 l3 
                          JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id 
                          WHERE l2.level1_id = $1
                        )
                      )
                    ) opening_balance_subquery) +
                    SUM(
                      CASE 
                        WHEN t.entry_type = 'CREDIT' THEN t.amount
                        WHEN t.entry_type = 'DEBIT' THEN -t.amount
                        ELSE 0
                      END
                    ) OVER (
                      ORDER BY 
                        CASE 
                          WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                          ELSE t.transaction_date
                        END,
                        t.id
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    )
                  ),
                  0
                ) as running_balance
              FROM transactions t
              LEFT JOIN payments p ON t.reference_no = p.voucher_no AND t.entry_type = 'CREDIT'
              LEFT JOIN gate_entries_pricing gep ON t.reference_no = gep.grn_number
              LEFT JOIN gate_entries ge ON t.reference_no = ge.grn_number
              WHERE DATE(t.transaction_date) BETWEEN DATE($2) AND DATE($3)
              AND (
                t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1)
                OR t.unified_account_id IN (
                  SELECT l2.unified_id FROM chart_of_accounts_level2 l2 WHERE l2.level1_id = $1
                )
                OR t.unified_account_id IN (
                  SELECT l3.unified_id FROM chart_of_accounts_level3 l3 
                  JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id 
                  WHERE l2.level1_id = $1
                )
              )
              ORDER BY 
                CASE 
                  WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                  ELSE t.transaction_date
                END,
                t.id
            `;
            break;
          case 2:
            // For Level 2, get transactions for the account itself and its Level 3 children
            // Exclude transactions that belong to Level 3 accounts that are NOT children of this Level 2
            transactionQuery = `
              SELECT 
                t.id,
                t.transaction_date,
                t.reference_no,
                t.entry_type,
                t.amount,
                t.description,
                COALESCE(t.item_name, ge.item_type, ge.paper_type) as item_name,
                p.voucher_no,
                p.payment_date,
                p.payment_mode,
                p.receiver_name,
                p.remarks as payment_remarks,
                t.quantity as qnt,
                gep.cut_weight as ded,
                COALESCE(t.quantity - gep.cut_weight, t.quantity) as net_qnt,
                t.price_per_unit as price,
                CASE 
                  WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                  ELSE t.transaction_date
                END as display_date,
                COALESCE(
                  ABS(
                    (SELECT opening_balance FROM (
                      SELECT COALESCE(SUM(
                        CASE 
                          WHEN t2.entry_type = 'CREDIT' THEN t2.amount
                          WHEN t2.entry_type = 'DEBIT' THEN -t2.amount
                          ELSE 0
                        END
                      ), 0) as opening_balance
                      FROM transactions t2
                      WHERE DATE(t2.transaction_date) < DATE($2)
                      AND (
                        t2.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1)
                        OR t2.unified_account_id IN (
                          SELECT l3.unified_id FROM chart_of_accounts_level3 l3 WHERE l3.level2_id = $1
                        )
                      )
                    ) opening_balance_subquery) +
                    SUM(
                      CASE 
                        WHEN t.entry_type = 'CREDIT' THEN t.amount
                        WHEN t.entry_type = 'DEBIT' THEN -t.amount
                        ELSE 0
                      END
                    ) OVER (
                      ORDER BY 
                        CASE 
                          WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                          ELSE t.transaction_date
                        END,
                        t.id
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    )
                  ),
                  0
                ) as running_balance
              FROM transactions t
              LEFT JOIN payments p ON t.reference_no = p.voucher_no AND t.entry_type = 'CREDIT'
              LEFT JOIN gate_entries_pricing gep ON t.reference_no = gep.grn_number
              LEFT JOIN gate_entries ge ON t.reference_no = ge.grn_number
              WHERE DATE(t.transaction_date) BETWEEN DATE($2) AND DATE($3)
              AND (
                t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1)
                OR t.unified_account_id IN (
                  SELECT l3.unified_id FROM chart_of_accounts_level3 l3 WHERE l3.level2_id = $1
                )
              )
              ORDER BY 
                CASE 
                  WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                  ELSE t.transaction_date
                END,
                t.id
            `;
            break;
          case 3:
            // For Level 3, get transactions only for this specific account
            transactionQuery = `
              SELECT 
                t.id,
                t.transaction_date,
                t.reference_no,
                t.entry_type,
                t.amount,
                t.description,
                COALESCE(t.item_name, ge.item_type, ge.paper_type) as item_name,
                p.voucher_no,
                p.payment_date,
                p.payment_mode,
                p.receiver_name,
                p.remarks as payment_remarks,
                t.quantity as qnt,
                gep.cut_weight as ded,
                COALESCE(t.quantity - gep.cut_weight, t.quantity) as net_qnt,
                t.price_per_unit as price,
                CASE 
                  WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                  ELSE t.transaction_date
                END as display_date,
                COALESCE(
                  ABS(
                    (SELECT opening_balance FROM (
                      SELECT COALESCE(SUM(
                        CASE 
                          WHEN t2.entry_type = 'CREDIT' THEN t2.amount
                          WHEN t2.entry_type = 'DEBIT' THEN -t2.amount
                          ELSE 0
                        END
                      ), 0) as opening_balance
                      FROM transactions t2
                      WHERE DATE(t2.transaction_date) < DATE($2)
                      AND t2.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1)
                    ) opening_balance_subquery) +
                    SUM(
                      CASE 
                        WHEN t.entry_type = 'CREDIT' THEN t.amount
                        WHEN t.entry_type = 'DEBIT' THEN -t.amount
                        ELSE 0
                      END
                    ) OVER (
                      ORDER BY 
                        CASE 
                          WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                          ELSE t.transaction_date
                        END,
                        t.id
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    )
                  ),
                  0
                ) as running_balance
              FROM transactions t
              LEFT JOIN payments p ON t.reference_no = p.voucher_no AND t.entry_type = 'CREDIT'
              LEFT JOIN gate_entries_pricing gep ON t.reference_no = gep.grn_number
              LEFT JOIN gate_entries ge ON t.reference_no = ge.grn_number
              WHERE DATE(t.transaction_date) BETWEEN DATE($2) AND DATE($3)
              AND t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1)
              ORDER BY 
                CASE 
                  WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                  ELSE t.transaction_date
                END,
                t.id
            `;
            break;
          default:
            return res.status(400).json({ error: 'Invalid level specified' });
        }
      } else {
        // Fallback to original complex query if no level specified
        transactionQuery = `
          WITH account_hierarchy AS (
        SELECT 
          id::text,
          level,
            level1_id::text,
            level2_id::text
        FROM (
            SELECT id::text, 1 as level, NULL::text as level1_id, NULL::text as level2_id FROM chart_of_accounts_level1 WHERE id = $1::integer
          UNION ALL
            SELECT id::text, 2 as level, level1_id::text, NULL::text as level2_id FROM chart_of_accounts_level2 WHERE id = $1::integer
          UNION ALL
            SELECT id::text, 3 as level, level1_id::text, level2_id::text FROM chart_of_accounts_level3 WHERE id = $1::integer
        ) accounts
          WHERE id = $1::text
      ),
      child_accounts AS (
        SELECT 
          CASE 
              WHEN ah.level = 1 THEN l2.id::text
              WHEN ah.level = 2 THEN l3.id::text
              ELSE NULL
          END as child_id
        FROM account_hierarchy ah
          LEFT JOIN chart_of_accounts_level2 l2 ON ah.level = 1 AND ah.id::integer = l2.level1_id
          LEFT JOIN chart_of_accounts_level3 l3 ON ah.level = 2 AND ah.id::integer = l3.level2_id
          WHERE ah.id = $1::text
        )
        SELECT 
          t.id,
          t.transaction_date,
          t.reference_no,
          t.entry_type,
          t.amount,
          t.description,
          COALESCE(t.item_name, ge.item_type, ge.paper_type) as item_name,
          p.voucher_no,
          p.payment_date,
          p.payment_mode,
          p.receiver_name,
          p.remarks as payment_remarks,
          t.quantity as qnt,
          gep.cut_weight as ded,
          COALESCE(t.quantity - gep.cut_weight, t.quantity) as net_qnt,
          t.price_per_unit as price,
          CASE 
            WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
            ELSE t.transaction_date
          END as display_date,
          COALESCE(
            ABS(
              SUM(
                CASE 
                  WHEN t.entry_type = 'CREDIT' THEN t.amount
                  WHEN t.entry_type = 'DEBIT' THEN -t.amount
                  ELSE 0
                END
              ) OVER (
                ORDER BY 
                  CASE 
                    WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
                    ELSE t.transaction_date
                  END,
                  t.id
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
              )
            ),
            0
          ) as running_balance
        FROM transactions t
        LEFT JOIN payments p ON t.reference_no = p.voucher_no AND t.entry_type = 'CREDIT'
        LEFT JOIN gate_entries_pricing gep ON t.reference_no = gep.grn_number
        LEFT JOIN gate_entries ge ON t.reference_no = ge.grn_number
        WHERE t.transaction_date BETWEEN $2 AND $3
        AND (
          t.unified_account_id = (
            SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1::integer
            UNION
            SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1::integer
            UNION
            SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1::integer
          )
          OR (
            EXISTS (
              SELECT 1 FROM child_accounts ca 
              WHERE ca.child_id = t.account_id::text
            )
            AND EXISTS (
              SELECT 1 FROM account_hierarchy ah 
              WHERE ah.id = $1::text 
              AND ah.level = (
                SELECT level 
                FROM account_hierarchy 
                WHERE id = $1::text
                LIMIT 1
              )
              AND (
                -- For level 1 accounts, include all level 2 and level 3 transactions
                (ah.level = 1) OR
                -- For level 2 accounts, only include level 3 transactions
                (ah.level = 2 AND EXISTS (
                  SELECT 1 FROM chart_of_accounts_level3 l3 
                  WHERE l3.level2_id = $1::integer 
                  AND l3.unified_id = t.unified_account_id
                ))
              )
            )
          )
        )
        ORDER BY 
          CASE 
            WHEN t.entry_type = 'CREDIT' AND p.payment_date IS NOT NULL THEN p.payment_date
            ELSE t.transaction_date
          END,
            t.id
        `;
      }

      const { rows: transactions } = await client.query(transactionQuery, transactionParams);

      console.log('Found transactions:', {
        count: transactions.length,
        accountLevel: account.level,
        accountId: accountId,
        level: level,
        startDate: startDate,
        endDate: endDate,
        firstTransaction: transactions[0],
        lastTransaction: transactions[transactions.length - 1]
      });

    // Calculate opening balance based on the account level
    let openingBalanceQuery;
    let openingBalanceParams = [accountId, startDate];
    
    if (level) {
      // Use level-specific opening balance queries
      switch (parseInt(level)) {
        case 1:
          // For Level 1, include transactions for the account itself AND all its child accounts (Level 2 and Level 3)
          openingBalanceQuery = `
            SELECT COALESCE(SUM(
              CASE 
                WHEN t.entry_type = 'CREDIT' THEN t.amount
                WHEN t.entry_type = 'DEBIT' THEN -t.amount
                ELSE 0
              END
            ), 0) as opening_balance
            FROM transactions t
            WHERE DATE(t.transaction_date) < DATE($2)
            AND (
              t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1)
              OR t.unified_account_id IN (
                SELECT l2.unified_id FROM chart_of_accounts_level2 l2 WHERE l2.level1_id = $1
              )
              OR t.unified_account_id IN (
                SELECT l3.unified_id FROM chart_of_accounts_level3 l3 
                JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id 
                WHERE l2.level1_id = $1
              )
            )
          `;
          break;
        case 2:
          // For Level 2, include transactions for the account itself and its Level 3 children
          openingBalanceQuery = `
            SELECT COALESCE(SUM(
              CASE 
                WHEN t.entry_type = 'CREDIT' THEN t.amount
                WHEN t.entry_type = 'DEBIT' THEN -t.amount
                ELSE 0
              END
            ), 0) as opening_balance
            FROM transactions t
            WHERE DATE(t.transaction_date) < DATE($2)
            AND (
              t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1)
              OR t.unified_account_id IN (
                SELECT l3.unified_id FROM chart_of_accounts_level3 l3 WHERE l3.level2_id = $1
              )
            )
          `;
          break;
        case 3:
          // For Level 3, include transactions only for this specific account
          openingBalanceQuery = `
            SELECT COALESCE(SUM(
              CASE 
                WHEN t.entry_type = 'CREDIT' THEN t.amount
                WHEN t.entry_type = 'DEBIT' THEN -t.amount
                ELSE 0
              END
            ), 0) as opening_balance
            FROM transactions t
            WHERE DATE(t.transaction_date) < DATE($2)
            AND t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1)
          `;
          break;
        default:
          return res.status(400).json({ error: 'Invalid level specified' });
      }
    } else {
      // Fallback to original complex query if no level specified
      openingBalanceQuery = `
        WITH account_hierarchy AS (
        SELECT 
          id::text,
          level,
            level1_id::text,
            level2_id::text
        FROM (
            SELECT id::text, 1 as level, NULL::text as level1_id, NULL::text as level2_id FROM chart_of_accounts_level1 WHERE id = $1::integer
          UNION ALL
            SELECT id::text, 2 as level, level1_id::text, NULL::text as level2_id FROM chart_of_accounts_level2 WHERE id = $1::integer
          UNION ALL
            SELECT id::text, 3 as level, level1_id::text, level2_id::text FROM chart_of_accounts_level3 WHERE id = $1::integer
        ) accounts
          WHERE id = $1::text
      ),
      child_accounts AS (
        SELECT 
          CASE 
              WHEN ah.level = 1 THEN l2.id::text
              WHEN ah.level = 2 THEN l3.id::text
              ELSE NULL
          END as child_id
        FROM account_hierarchy ah
          LEFT JOIN chart_of_accounts_level2 l2 ON ah.level = 1 AND ah.id::integer = l2.level1_id
          LEFT JOIN chart_of_accounts_level3 l3 ON ah.level = 2 AND ah.id::integer = l3.level2_id
          WHERE ah.id = $1::text
      )
      SELECT COALESCE(SUM(
        CASE 
          WHEN t.entry_type = 'CREDIT' THEN t.amount
          WHEN t.entry_type = 'DEBIT' THEN -t.amount
          ELSE 0
        END
      ), 0      ) as opening_balance
      FROM transactions t
      WHERE DATE(t.transaction_date) < DATE($2)
      AND (
          t.unified_account_id = (
            SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1::integer
            UNION
            SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1::integer
            UNION
            SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1::integer
          )
          OR (
            EXISTS (
              SELECT 1 FROM child_accounts ca 
              WHERE ca.child_id = t.account_id::text
            )
            AND EXISTS (
              SELECT 1 FROM account_hierarchy ah 
              WHERE ah.id = $1::text 
              AND ah.level = (
                SELECT level 
                FROM account_hierarchy 
                WHERE id = $1::text
                LIMIT 1
              )
              AND (
                -- For level 1 accounts, include all level 2 and level 3 transactions
                (ah.level = 1) OR
                -- For level 2 accounts, only include level 3 transactions
                (ah.level = 2 AND EXISTS (
                  SELECT 1 FROM chart_of_accounts_level3 l3 
                  WHERE l3.level2_id = $1::integer 
                  AND l3.unified_id = t.unified_account_id
                ))
              )
            )
          )
        )
      `;
    }

    const { rows: [{ opening_balance }] } = await client.query(openingBalanceQuery, openingBalanceParams);

      console.log('Opening balance:', opening_balance);

    // Calculate current balance based on the account level
    let currentBalanceQuery;
    let currentBalanceParams = [accountId, adjustedEndDate];
    
    if (level) {
      // Use level-specific current balance queries
      switch (parseInt(level)) {
        case 1:
          // For Level 1, include transactions for the account itself AND all its child accounts (Level 2 and Level 3)
          currentBalanceQuery = `
            SELECT COALESCE(SUM(
              CASE 
                WHEN t.entry_type = 'CREDIT' THEN t.amount
                WHEN t.entry_type = 'DEBIT' THEN -t.amount
                ELSE 0
              END
            ), 0) as current_balance
            FROM transactions t
            WHERE DATE(t.transaction_date) <= DATE($2)
            AND (
              t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1)
              OR t.unified_account_id IN (
                SELECT l2.unified_id FROM chart_of_accounts_level2 l2 WHERE l2.level1_id = $1
              )
              OR t.unified_account_id IN (
                SELECT l3.unified_id FROM chart_of_accounts_level3 l3 
                JOIN chart_of_accounts_level2 l2 ON l3.level2_id = l2.id 
                WHERE l2.level1_id = $1
              )
            )
          `;
          break;
        case 2:
          // For Level 2, include transactions for the account itself and its Level 3 children
          currentBalanceQuery = `
            SELECT COALESCE(SUM(
              CASE 
                WHEN t.entry_type = 'CREDIT' THEN t.amount
                WHEN t.entry_type = 'DEBIT' THEN -t.amount
                ELSE 0
              END
            ), 0) as current_balance
            FROM transactions t
            WHERE DATE(t.transaction_date) <= DATE($2)
            AND (
              t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1)
              OR t.unified_account_id IN (
                SELECT l3.unified_id FROM chart_of_accounts_level3 l3 WHERE l3.level2_id = $1
              )
            )
          `;
          break;
        case 3:
          // For Level 3, include transactions only for this specific account
          currentBalanceQuery = `
            SELECT COALESCE(SUM(
              CASE 
                WHEN t.entry_type = 'CREDIT' THEN t.amount
                WHEN t.entry_type = 'DEBIT' THEN -t.amount
                ELSE 0
              END
            ), 0) as current_balance
            FROM transactions t
            WHERE DATE(t.transaction_date) <= DATE($2)
            AND t.unified_account_id = (SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1)
          `;
          break;
        default:
          return res.status(400).json({ error: 'Invalid level specified' });
      }
    } else {
      // Fallback to original complex query if no level specified
      currentBalanceQuery = `
        WITH account_hierarchy AS (
        SELECT 
          id::text,
          level,
            level1_id::text,
            level2_id::text
        FROM (
            SELECT id::text, 1 as level, NULL::text as level1_id, NULL::text as level2_id FROM chart_of_accounts_level1 WHERE id = $1::integer
          UNION ALL
            SELECT id::text, 2 as level, level1_id::text, NULL::text as level2_id FROM chart_of_accounts_level2 WHERE id = $1::integer
          UNION ALL
            SELECT id::text, 3 as level, level1_id::text, level2_id::text FROM chart_of_accounts_level3 WHERE id = $1::integer
        ) accounts
          WHERE id = $1::text
      ),
      child_accounts AS (
        SELECT 
          CASE 
              WHEN ah.level = 1 THEN l2.id::text
              WHEN ah.level = 2 THEN l3.id::text
              ELSE NULL
          END as child_id
        FROM account_hierarchy ah
          LEFT JOIN chart_of_accounts_level2 l2 ON ah.level = 1 AND ah.id::integer = l2.level1_id
          LEFT JOIN chart_of_accounts_level3 l3 ON ah.level = 2 AND ah.id::integer = l3.level2_id
          WHERE ah.id = $1::text
      )
      SELECT COALESCE(SUM(
        CASE 
          WHEN t.entry_type = 'CREDIT' THEN t.amount
          WHEN t.entry_type = 'DEBIT' THEN -t.amount
          ELSE 0
        END
      ), 0) as current_balance
      FROM transactions t
      WHERE DATE(t.transaction_date) <= DATE($2)
      AND (
          t.unified_account_id = (
            SELECT unified_id FROM chart_of_accounts_level1 WHERE id = $1::integer
            UNION
            SELECT unified_id FROM chart_of_accounts_level2 WHERE id = $1::integer
            UNION
            SELECT unified_id FROM chart_of_accounts_level3 WHERE id = $1::integer
          )
          OR (
            EXISTS (
              SELECT 1 FROM child_accounts ca 
              WHERE ca.child_id = t.account_id::text
            )
            AND EXISTS (
              SELECT 1 FROM account_hierarchy ah 
              WHERE ah.id = $1::text 
              AND ah.level = (
                SELECT level 
                FROM account_hierarchy 
                WHERE id = $1::text
                LIMIT 1
              )
              AND (
                -- For level 1 accounts, include all level 2 and level 3 transactions
                (ah.level = 1) OR
                -- For level 2 accounts, only include level 3 transactions
                (ah.level = 2 AND EXISTS (
                  SELECT 1 FROM chart_of_accounts_level3 l3 
                  WHERE l3.level2_id = $1::integer 
                  AND l3.unified_id = t.unified_account_id
                ))
              )
            )
          )
        )
      `;
    }

    const { rows: [{ current_balance }] } = await client.query(currentBalanceQuery, currentBalanceParams);

      console.log('Current balance:', current_balance);

      // Calculate final balances
      const finalBalances = {
        accountOpeningBalance: parseFloat(account.opening_balance || 0),
        transactionOpeningBalance: parseFloat(opening_balance || 0),
        transactionCurrentBalance: parseFloat(current_balance || 0),
        finalOpeningBalance: parseFloat(account.opening_balance || 0) + parseFloat(opening_balance || 0),
        finalCurrentBalance: parseFloat(account.opening_balance || 0) + parseFloat(current_balance || 0)
      };

      console.log('Final balances:', finalBalances);

    res.json({
      account_details: {
        ...account,
          current_balance: finalBalances.finalCurrentBalance
      },
        transactions,
        opening_balance: finalBalances.finalOpeningBalance,
        current_balance: finalBalances.finalCurrentBalance
    });
  } catch (error) {
    console.error('Error in ledger route:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 