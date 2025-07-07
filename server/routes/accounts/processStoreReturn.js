const express = require('express');
const router = express.Router();
const pool = require('../../db');

router.post('/process-store-return', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { entryId, pricePerUnit } = req.body;
    console.log('Processing store return entry:', { entryId, pricePerUnit });

    // Get the pricing entry
    const { rows: [pricing] } = await client.query(
      `SELECT 
        pe.*,
        sr.return_grn,
        sr.grn_number,
        sr.quantity,
        sr.unit,
        sr.item_name,
        se.vendor_id,
        COALESCE(
          (SELECT name FROM chart_of_accounts_level3 WHERE id = se.vendor_id),
          (SELECT name FROM chart_of_accounts_level2 WHERE id = se.vendor_id),
          (SELECT name FROM chart_of_accounts_level1 WHERE id = se.vendor_id)
        ) as vendor_name
       FROM pricing_entries pe
       JOIN store_returns sr ON pe.reference_id = sr.id
       JOIN store_entries se ON sr.grn_number = se.grn_number
       WHERE pe.id = $1
       AND pe.entry_type = 'STORE_RETURN'`,
      [entryId]
    );

    if (!pricing) {
      throw new Error('Pricing entry not found');
    }

    console.log('Found pricing entry with vendor details:', {
      id: pricing.id,
      vendor_id: pricing.vendor_id,
      vendor_name: pricing.vendor_name,
      return_grn: pricing.return_grn,
      grn_number: pricing.grn_number
    });

    // Calculate total amount
    const totalAmount = pricing.quantity * pricePerUnit;
    console.log('Calculated total amount:', totalAmount);

    // Update pricing entry
    const { rows: [updatedPricing] } = await client.query(
      `UPDATE pricing_entries 
       SET status = 'PROCESSED',
           price_per_unit = $1,
           total_amount = $2,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [pricePerUnit, totalAmount, entryId]
    );

    console.log('Updated pricing entry:', updatedPricing);

    // Get the vendor account directly from chart of accounts
    const { rows: [vendorAccount] } = await client.query(
      `SELECT id, name FROM (
        SELECT id, name FROM chart_of_accounts_level3 WHERE id = $1
        UNION ALL
        SELECT id, name FROM chart_of_accounts_level2 WHERE id = $1
        UNION ALL
        SELECT id, name FROM chart_of_accounts_level1 WHERE id = $1
      ) as vendor WHERE id = $1`,
      [pricing.vendor_id]
    );

    if (!vendorAccount) {
      throw new Error(`Vendor account not found for ID ${pricing.vendor_id}`);
    }

    console.log('Found vendor account:', {
      id: vendorAccount.id,
      name: vendorAccount.name,
      expected_vendor: pricing.vendor_name
    });

    // Prepare transaction data
    const transactionData = {
      transaction_date: new Date(),
      account_id: vendorAccount.id,
      reference_no: pricing.return_grn,
      entry_type: 'DEBIT',
      amount: totalAmount,
      description: `Store Return: ${pricing.item_name} (${pricing.quantity} ${pricing.unit} @ Rs.${pricePerUnit}/unit) to ${pricing.vendor_name} - Against GRN: ${pricing.grn_number}`,
      item_name: pricing.item_name,
      quantity: pricing.quantity,
      unit: pricing.unit,
      price_per_unit: pricePerUnit
    };

    console.log('Attempting to create transaction with data:', JSON.stringify(transactionData, null, 2));

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
      [transactionData.account_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }

    const unified_account_id = accountResult.rows[0].unified_account_id;

    // Create transaction record with item details
    let transaction;
    try {
      const result = await client.query(
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          transactionData.transaction_date,
          transactionData.account_id,
          unified_account_id,
          transactionData.reference_no,
          transactionData.entry_type,
          transactionData.amount,
          transactionData.description,
          transactionData.item_name,
          transactionData.quantity,
          transactionData.unit,
          transactionData.price_per_unit
        ]
      );
      transaction = result.rows[0];
      console.log('Created transaction:', transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      console.error('Transaction data:', JSON.stringify(transactionData, null, 2));
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        constraint: error.constraint
      });
      throw error;
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Store return processed successfully',
      transaction: transaction
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing store return:', error);
    res.status(500).json({ error: 'Failed to process store return', message: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;