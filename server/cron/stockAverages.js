const cron = require('node-cron');
const config = require('../config');
const https = require('https');

// Schedule task to run at 00:01 on the first day of each month
const scheduleMonthlyAverages = () => {
  cron.schedule('1 0 1 * *', async () => {
    try {
      console.log('Running monthly averages calculation...');
      
      const options = {
        hostname: new URL(config.apiUrl).hostname,
        port: 443,
        path: '/api/stock/monthly-averages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('Monthly averages saved:', JSON.parse(data));
          } else {
            console.error('Error saving monthly averages:', data);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error saving monthly averages:', error);
      });

      req.end();
    } catch (error) {
      console.error('Error in monthly averages calculation:', error);
    }
  }, {
    timezone: "Asia/Karachi"
  });
};

module.exports = scheduleMonthlyAverages; 