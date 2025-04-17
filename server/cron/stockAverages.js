const cron = require('node-cron');
const config = require('../config');
const fetch = require('node-fetch');

// Schedule task to run at 00:01 on the first day of each month
const scheduleMonthlyAverages = () => {
  cron.schedule('1 0 1 * *', async () => {
    try {
      console.log('Running monthly averages calculation...');
      const response = await fetch(`${config.apiUrl}/api/stock/monthly-averages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Monthly averages saved:', data);
    } catch (error) {
      console.error('Error saving monthly averages:', error);
    }
  }, {
    timezone: "Asia/Karachi"
  });
};

module.exports = scheduleMonthlyAverages; 