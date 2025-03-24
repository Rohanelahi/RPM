import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import api from '../../services/api';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({
    accountId: '',
    startDate: null,
    endDate: null,
    transactionType: ''
  });

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchAccounts = async () => {
    try {
      const response = await api.getBankAccounts();
      setAccounts(response);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = {
        accountId: filters.accountId,
        startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
        endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null,
        transactionType: filters.transactionType
      };
      const response = await api.getBankTransactions(params);
      setTransactions(response);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'CREDIT':
        return 'success.main';
      case 'DEBIT':
        return 'error.main';
      default:
        return 'text.primary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Bank Transaction History
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={filters.accountId}
                label="Bank Account"
                onChange={(e) => handleFilterChange('accountId', e.target.value)}
              >
                <MenuItem value="">All Accounts</MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={filters.transactionType}
                label="Transaction Type"
                onChange={(e) => handleFilterChange('transactionType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="CREDIT">Credit</MenuItem>
                <MenuItem value="DEBIT">Debit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{transaction.accountNumber}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.reference}</TableCell>
                  <TableCell sx={{ color: getTransactionTypeColor(transaction.type) }}>
                    {transaction.type}
                  </TableCell>
                  <TableCell align="right" sx={{ color: getTransactionTypeColor(transaction.type) }}>
                    ₹{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">₹{transaction.balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default TransactionHistory; 