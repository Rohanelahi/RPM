const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rpm',
  password: '1234',
  port: 5432,
});

async function cleanupDuplicateTransactions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all duplicate transactions
    const { rows: duplicates } = await client.query(`
      WITH duplicate_groups AS (
        SELECT 
          reference_no,
          account_id,
          COUNT(*) as count
        FROM transactions
        GROUP BY reference_no, account_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        t.id,
        t.reference_no,
        t.account_id,
        t.transaction_date,
        t.description,
        t.amount
      FROM transactions t
      JOIN duplicate_groups dg 
        ON t.reference_no = dg.reference_no 
        AND t.account_id = dg.account_id
      ORDER BY t.reference_no, t.account_id, t.transaction_date DESC
    `);

    if (duplicates.length === 0) {
      console.log('No duplicate transactions found.');
      return;
    }

    console.log(`Found ${duplicates.length} transactions that need cleanup.`);

    // Group duplicates by reference_no and account_id
    const groups = duplicates.reduce((acc, transaction) => {
      const key = `${transaction.reference_no}-${transaction.account_id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    }, {});

    // For each group, keep the most recent transaction and delete others
    for (const [key, transactions] of Object.entries(groups)) {
      const [keepTransaction, ...deleteTransactions] = transactions;
      console.log(`\nProcessing GRN: ${keepTransaction.reference_no}`);
      console.log(`Keeping transaction ID: ${keepTransaction.id} (Date: ${keepTransaction.transaction_date})`);
      console.log(`Amount: ${keepTransaction.amount}, Description: ${keepTransaction.description}`);
      
      for (const transaction of deleteTransactions) {
        console.log(`Deleting transaction ID: ${transaction.id} (Date: ${transaction.transaction_date})`);
        await client.query('DELETE FROM transactions WHERE id = $1', [transaction.id]);
      }
    }

    await client.query('COMMIT');
    console.log('\nCleanup completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the cleanup
cleanupDuplicateTransactions(); 