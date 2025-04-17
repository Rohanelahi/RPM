const pool = require('../db');

const calculateMonthlyAverages = async () => {
  console.log('Running monthly averages calculation...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get the previous month's dates
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const monthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const monthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

    // Calculate and save monthly averages
    await client.query(`
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
    `, [monthStart, monthEnd]);

    await client.query('COMMIT');
    console.log('Monthly averages saved successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving monthly averages:', error);
  } finally {
    client.release();
  }
};

// Schedule the first run
const now = new Date();
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 1, 0);
const timeUntilNextMonth = nextMonth - now;

setTimeout(() => {
  calculateMonthlyAverages();
  // Schedule next run for the following month
  setInterval(calculateMonthlyAverages, 30 * 24 * 60 * 60 * 1000); // Run every 30 days
}, timeUntilNextMonth);

module.exports = calculateMonthlyAverages; 