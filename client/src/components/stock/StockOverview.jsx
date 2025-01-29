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
  CircularProgress
} from '@mui/material';
import '../../styles/Stock.css';

const StockOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    fetchStockData();
    
    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch data whenever lastUpdate changes
  useEffect(() => {
    fetchStockData();
  }, [lastUpdate]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      // Add cache-busting query parameter
      const response = await fetch(`http://localhost:5000/api/stock/overview?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch stock data');
      const data = await response.json();
      setStockData(data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add manual refresh function
  const handleRefresh = () => {
    setLastUpdate(Date.now());
  };

  return (
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Stock Overview
        </Typography>
      </Paper>

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
                    {new Date(item.last_updated).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StockOverview; 