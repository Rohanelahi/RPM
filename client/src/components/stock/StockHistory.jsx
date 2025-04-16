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
  Button,
  TextField
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import config from '../../config';

const StockHistory = () => {
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchStockHistory();
  }, [selectedDate]);

  const fetchStockHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/stock/history?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch stock history');
      const data = await response.json();
      setStockHistory(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch stock history');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Stock History - ${selectedDate}</title>
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
              <div class="stock-title">Stock History - ${selectedDate}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${stockHistory.map(record => `
                  <tr>
                    <td>${record.item}</td>
                    <td>${record.type}</td>
                    <td>${record.quantity}</td>
                    <td>${new Date(record.date).toLocaleString()}</td>
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
    <Box component={Paper} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Stock History</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockHistory.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.item}</TableCell>
                <TableCell>{record.type}</TableCell>
                <TableCell>{record.quantity}</TableCell>
                <TableCell>{new Date(record.date).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default StockHistory; 