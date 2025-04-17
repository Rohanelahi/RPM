const config = require('../config');
const http = require('http');

const calculateMonthlyAverages = () => {
  console.log('Running monthly averages calculation...');
  
  const options = {
    hostname: new URL(config.apiUrl).hostname,
    port: config.port,
    path: '/api/stock/monthly-averages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
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