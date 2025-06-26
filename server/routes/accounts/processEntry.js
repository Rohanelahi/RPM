const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Helper function to clean up duplicate transactions
async function cleanupDuplicateTransactions(client, grnNumber, accountId) {
  // Get all transactions for this GRN and account
  const { rows: transactions } = await client.query(
    `SELECT id, description, transaction_date 
     FROM transactions 
     WHERE reference_no = $1 AND account_id = $2
     ORDER BY transaction_date DESC`,
    [grnNumber, accountId]
  );

  if (transactions.length > 1) {
    // Keep the most recent transaction, delete others
    const [keepTransaction, ...deleteTransactions] = transactions;
    console.log(`Found ${transactions.length} transactions for GRN ${grnNumber}, keeping most recent one`);
    
    for (const transaction of deleteTransactions) {
      await client.query('DELETE FROM transactions WHERE id = $1', [transaction.id]);
    }
  }
}

// Process entry
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { entryId, pricePerUnit, cutWeight, totalAmount, finalQuantity, processedBy, freight, freightAmount } = req.body;
    
    // 1. Get the pricing entry with account info
    const { rows: [pricing] } = await client.query(
      `SELECT gep.*, 
        CASE 
          WHEN gep.entry_type = 'SALE' THEN ge.purchaser_id
          ELSE ge.supplier_id
        END as account_id,
        gep.entry_type,
        ge.item_type,
        ge.paper_type,
        ge.quantity,
        ge.unit,
        COALESCE(ge.item_type, ge.paper_type) as item_name
       FROM gate_entries_pricing gep
       JOIN gate_entries ge ON gep.grn_number = ge.grn_number
       WHERE gep.id = $1`,
      [entryId]
    );

    if (!pricing) {
      throw new Error('Entry not found');
    }

    // 2. Update pricing information and status
    await client.query(
      `UPDATE gate_entries_pricing 
       SET price_per_unit = $1, 
           total_amount = $2, 
           status = 'PROCESSED',
           processed_at = CURRENT_TIMESTAMP,
           cut_weight = $3,
           final_quantity = $4,
           processed_by_role = $5
       WHERE id = $6`,
      [pricePerUnit, totalAmount, cutWeight, finalQuantity, processedBy, entryId]
    );

    // 3. Update account balance
    const balanceModifier = pricing.entry_type === 'SALE' ? 1 : -1;
    await client.query(
      'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
      [totalAmount * balanceModifier, pricing.account_id]
    );

    // 4. Clean up any existing duplicate transactions
    await cleanupDuplicateTransactions(client, pricing.grn_number, pricing.account_id);

    // 5. Create new transaction record (original sale/purchase transaction)
    const { rows: [existingTransaction] } = await client.query(
      `SELECT id FROM transactions 
       WHERE reference_no = $1 AND account_id = $2
       ORDER BY transaction_date DESC
       LIMIT 1`,
      [pricing.grn_number, pricing.account_id]
    );

    if (!existingTransaction) {
      await client.query(
        `INSERT INTO transactions (
          transaction_date,
          account_id,
          reference_no,
          entry_type,
          amount,
          description,
          item_name,
          quantity,
          unit,
          price_per_unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          new Date(),
          pricing.account_id,
          pricing.grn_number,
          // Explicitly set entry_type
          (pricing.entry_type === 'PURCHASE' ? 'CREDIT' : (pricing.entry_type === 'SALE' ? 'DEBIT' : 'CREDIT')),
          totalAmount,
          pricing.entry_type === 'SALE' ? `Sale ${pricing.item_name}` : 'Purchase',  // Include paper type in description
          pricing.item_name,
          finalQuantity || pricing.quantity,
          pricing.unit,
          pricePerUnit
        ]
      );
    }

    // 6. Create freight transaction if freight is checked (for SALE entries only)
    if (freight && freightAmount && pricing.entry_type === 'SALE' && parseFloat(freightAmount) > 0) {
      // Update account balance for freight (credit for sale - customer owes more)
      await client.query(
        'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2',
        [parseFloat(freightAmount), pricing.account_id]
      );

      // Create freight transaction
      const freightGrn = `FR-${pricing.grn_number}`; // Add FR prefix for freight
      await client.query(
        `INSERT INTO transactions (
          transaction_date,
          account_id,
          reference_no,
          entry_type,
          amount,
          description,
          item_name,
          quantity,
          unit,
          price_per_unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          new Date(),
          pricing.account_id,
          freightGrn,
          'CREDIT', // Credit for freight adjustment
          parseFloat(freightAmount),
          'Freight Adjustment',
          pricing.item_name,
          finalQuantity || pricing.quantity,
          pricing.unit,
          0 // No price per unit for freight
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Entry processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing entry:', error);
    res.status(500).json({ message: error.message || 'Error processing entry' });
  } finally {
    client.release();
  }
});

module.exports = router; 