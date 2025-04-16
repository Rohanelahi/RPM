import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TableFooter,
  Grid,
  Button,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Refresh, Print as PrintIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import config from '../../config';
import '../../styles/Stock.css';

const StockOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      // Add filters to query parameters
      const queryParams = new URLSearchParams({
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        t: Date.now() // Cache-busting
      });
      
      const response = await fetch(`${config.apiUrl}/stock/overview?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch stock data');
      const data = await response.json();
      setStockData(data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      alert('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleDateChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchStockData();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Stock Overview</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .company-name { font-size: 24px; font-weight: bold; }
              .stock-title { font-size: 18px; margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">Rose Paper Mill PVT</div>
              <div class="stock-title">Stock Overview</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Current Stock</th>
                  <th>Unit</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${stockData.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>${new Date(item.lastUpdated).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Item-wise Purchase Summary
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleDateChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleDateChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </LocalizationProvider>
          <Grid item xs={12} md={4}>
            <Button 
              variant="contained" 
              onClick={applyFilters}
              startIcon={<Refresh />}
              fullWidth
              sx={{ height: '56px' }}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box className="stock-loading">
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Stock Overview</Typography>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </Box>
      )}

      {loading ? (
        <Box className="stock-loading">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} className="stock-table-container">
          <Table>
            <TableHead>
              <TableRow className="stock-table-header">
                <TableCell>Item Type</TableCell>
                <TableCell align="right">Current Quantity</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Latest Price (Rs.)</TableCell>
                <TableCell align="right">Monthly Avg. Price (Rs.)</TableCell>
                <TableCell align="right">Stock Value (Rs.)</TableCell>
                <TableCell align="right">Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockData.map((item) => (
                <TableRow key={item.item_type} hover>
                  <TableCell>{item.item_type}</TableCell>
                  <TableCell align="right">{item.current_quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell align="right">
                    {item.latest_price ? 
                      Number(item.latest_price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }) : 
                      '-'}
                  </TableCell>
                  <TableCell align="right">
                    {item.monthly_avg_price ? 
                      Number(item.monthly_avg_price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }) : 
                      '-'}
                  </TableCell>
                  <TableCell align="right">
                    {item.latest_price ? 
                      Number(item.latest_price * item.current_quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }) : 
                      '-'}
                  </TableCell>
                  <TableCell align="right">
                    {new Date(item.last_updated).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} align="right">
                  <strong>Total Stock Value:</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>
                    {Number(stockData.reduce((total, item) => {
                      const value = item.latest_price ? 
                        parseFloat(item.latest_price) * parseFloat(item.current_quantity) : 
                        0;
                      return total + value;
                    }, 0)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </strong>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StockOverview; 