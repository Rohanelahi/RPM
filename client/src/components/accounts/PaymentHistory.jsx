import React, { useState, useEffect } from 'react';
import config from '../../config';
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
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import '../../styles/PaymentHistory.css';

const PaymentHistory = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    accountType: '',
    paymentType: ''
  });

  const accountTypes = [
    { value: '', label: 'All Types' },
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'SUPPLIER', label: 'Supplier' },
    { value: 'VENDOR', label: 'Vendor' },
    { value: 'EXPENSES', label: 'Expenses' }
  ];

  const paymentTypes = [
    { value: '', label: 'All Payments' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'ISSUED', label: 'Issued' }
  ];

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      // Format dates and add only if they exist
      if (filters.startDate) {
        const startDate = format(filters.startDate, 'yyyy-MM-dd');
        queryParams.append('startDate', startDate);
        console.log('Start Date:', startDate);
      }
      if (filters.endDate) {
        const endDate = format(filters.endDate, 'yyyy-MM-dd');
        queryParams.append('endDate', endDate);
        console.log('End Date:', endDate);
      }
      
      // Add other filters only if they have values
      if (filters.accountType) {
        queryParams.append('accountType', filters.accountType);
        console.log('Account Type:', filters.accountType);
      }
      if (filters.paymentType) {
        queryParams.append('paymentType', filters.paymentType);
        console.log('Payment Type:', filters.paymentType);
      }

      const url = `http://localhost:5000/api/payments/history?${queryParams}`;
      console.log('Requesting URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch payments: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Payment History
        </Typography>
      </Paper>

      <Paper className="stock-filters">
        <Grid container spacing={2}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(newValue) => setFilters(prev => ({ ...prev, startDate: newValue }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(newValue) => setFilters(prev => ({ ...prev, endDate: newValue }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </LocalizationProvider>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Account Type"
              value={filters.accountType}
              onChange={(e) => setFilters(prev => ({ ...prev, accountType: e.target.value }))}
            >
              {accountTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Payment Type"
              value={filters.paymentType}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
            >
              {paymentTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
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
                <TableCell>Type</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Receiver</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{payment.payment_type}</TableCell>
                  <TableCell>{payment.account_name}</TableCell>
                  <TableCell>
                    {payment.payment_mode === 'ONLINE' && payment.bank_name 
                      ? `${payment.payment_mode} (${payment.bank_name})` 
                      : payment.payment_mode}
                  </TableCell>
                  <TableCell>{payment.receiver_name}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{
                      color: payment.payment_type === 'RECEIVED' ? 'success.main' : 'error.main',
                      fontFamily: 'monospace'
                    }}
                  >
                    ₨ {Number(payment.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{payment.remarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PaymentHistory; 