const pool = require('../db');

const calculateMonthlyAverages = async () => {
  console.log('Starting monthly averages calculation...');
  const client = await pool.connect();
  
  try {
    console.log('Beginning transaction...');
    await client.query('BEGIN');

    // Get the previous month's dates
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const monthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const monthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);
    
    console.log('Calculating averages for period:', {
      start: monthStart,
      end: monthEnd
    });

    // First check if we have any data for this period
    const checkData = await client.query(`
      SELECT COUNT(*) as count
      FROM gate_entries ge
      JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      WHERE ge.entry_type = 'PURCHASE_IN'
      AND ge.date_time >= $1
      AND ge.date_time <= $2
    `, [monthStart, monthEnd]);
    
    console.log('Found entries for period:', checkData.rows[0].count);

    if (checkData.rows[0].count > 0) {
      // Calculate and save monthly averages
      const result = await client.query(`
        INSERT INTO monthly_price_averages (
          item_type,
          month,
          year,
          average_price
        )
        SELECT 
          item_type,
          EXTRACT(MONTH FROM date_time) as month,
          EXTRACT(YEAR FROM date_time) as year,
          AVG(price_per_unit) as average_price
        FROM gate_entries ge
        JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
        WHERE ge.entry_type = 'PURCHASE_IN'
        AND ge.date_time >= $1
        AND ge.date_time <= $2
        GROUP BY item_type, EXTRACT(MONTH FROM date_time), EXTRACT(YEAR FROM date_time)
        ON CONFLICT (item_type, month, year) 
        DO UPDATE SET average_price = EXCLUDED.average_price
        RETURNING item_type, month, year, average_price;
      `, [monthStart, monthEnd]);

      console.log('Updated averages for items:', result.rows);
    } else {
      console.log('No data found for the period, skipping calculation');
    }

    await client.query('COMMIT');
    console.log('Monthly averages calculation completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in monthly averages calculation:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Schedule the first run
const now = new Date();
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 1, 0);
const timeUntilNextMonth = nextMonth - now;

console.log('Scheduling first run in', timeUntilNextMonth / (1000 * 60 * 60), 'hours');

setTimeout(() => {
  calculateMonthlyAverages();
  // Schedule next run for the following month
  setInterval(calculateMonthlyAverages, 30 * 24 * 60 * 60 * 1000); // Run every 30 days
}, timeUntilNextMonth);

module.exports = calculateMonthlyAverages;