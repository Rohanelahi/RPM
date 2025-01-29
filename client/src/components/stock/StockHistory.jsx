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
  TextField,
  MenuItem,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import '../../styles/Stock.css';

const StockHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({
    itemType: '',
    startDate: null,
    endDate: null
  });

  const itemTypes = [
    'Petti',
    'Mix Maal',
    'Dabbi',
    'Cement Bag',
    'Pulp',
    'Boiler Fuel (Toori)',
    'Boiler Fuel (Tukka)'
  ];

  useEffect(() => {
    fetchHistoryData();
  }, [filters]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const pakistanTime = new Date(date.getTime() + (5 * 60 * 60 * 1000)); // Add 5 hours for Pakistan timezone

    return pakistanTime.toLocaleString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
  };

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        itemType: filters.itemType,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      });

      const response = await fetch(`http://localhost:5000/api/stock/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch history data');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Stock History
        </Typography>
      </Paper>

      <Paper className="stock-filters">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Item Type"
              value={filters.itemType}
              onChange={(e) => setFilters(prev => ({ ...prev, itemType: e.target.value }))}
            >
              <MenuItem value="">All Items</MenuItem>
              {itemTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </LocalizationProvider>
        </Grid>
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
                <TableCell>Date</TableCell>
                <TableCell>GRN Number</TableCell>
                <TableCell>Item Type</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Unit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{entry.reference_number}</TableCell>
                  <TableCell>{entry.item_type}</TableCell>
                  <TableCell>{entry.supplier_name || '-'}</TableCell>
                  <TableCell align="right">{entry.quantity}</TableCell>
                  <TableCell>{entry.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StockHistory; 