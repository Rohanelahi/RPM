import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  MenuItem,
  Grid,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import config from '../../config';
import '../../styles/ExpenseHistory.css';

const ExpenseHistory = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    expenseType: ''
  });

  const expenseTypes = [
    { value: '', label: 'All' },
    { value: 'PETROL', label: 'Petrol' },
    { value: 'MESS', label: 'Mess' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MISC', label: 'Miscellaneous' }
  ];

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());
      if (filters.expenseType) queryParams.append('expenseType', filters.expenseType);

      const response = await fetch(`${config.apiUrl}/accounts/expenses/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="expense-history-container">
        <Typography variant="h5" className="expense-history-title">
          Expense History
        </Typography>
        
        <Paper elevation={3} className="expense-history-paper">
          <Grid container spacing={2} className="expense-history-filters">
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(newValue) => setFilters(prev => ({ ...prev, startDate: newValue }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(newValue) => setFilters(prev => ({ ...prev, endDate: newValue }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Expense Type"
                value={filters.expenseType}
                onChange={(e) => setFilters(prev => ({ ...prev, expenseType: e.target.value }))}
              >
                {expenseTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box className="expense-history-loading">
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table className="expense-history-table">
              <TableHead>
                <TableRow className="expense-history-table-header">
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="expense-history-row">
                    <TableCell className="expense-history-cell">
                      {format(new Date(expense.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="expense-history-cell">
                      {format(new Date(expense.date), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell className="expense-history-cell">
                      {expense.expense_type}
                    </TableCell>
                    <TableCell className="expense-history-cell">
                      {expense.receiver_name}
                    </TableCell>
                    <TableCell className="expense-history-cell">
                      {expense.amount}
                    </TableCell>
                    <TableCell className="expense-history-cell">
                      {expense.remarks}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ExpenseHistory; 