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
  Chip
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
    recordType: ''
  });

  const accountTypes = [
    { value: '', label: 'All Types' },
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'SUPPLIER', label: 'Supplier' },
    { value: 'VENDOR', label: 'Vendor' },
    { value: 'EXPENSE', label: 'Expense' }
  ];

  const recordTypes = [
    { value: '', label: 'All Records' },
    { value: 'PAYMENT', label: 'Payments' },
    { value: 'EXPENSE', label: 'Expenses' }
  ];

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.startDate) {
        const startDate = format(filters.startDate, 'yyyy-MM-dd');
        queryParams.append('startDate', startDate);
      }
      if (filters.endDate) {
        const endDate = format(filters.endDate, 'yyyy-MM-dd');
        queryParams.append('endDate', endDate);
      }
      if (filters.accountType) {
        queryParams.append('accountType', filters.accountType);
      }
      if (filters.recordType) {
        queryParams.append('paymentType', filters.recordType);
      }

      const url = `${config.apiUrl}/accounts/payments/history?${queryParams}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }

      const data = await response.json();
      // Map OTHER account type to EXPENSE in the display
      const processedData = data.map(record => ({
        ...record,
        record_type: record.account_type === 'OTHER' ? 'EXPENSE' : record.record_type
      }));
      setPayments(processedData);
    } catch (error) {
      console.error('Error fetching records:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const getRecordTypeColor = (type) => {
    switch (type) {
      case 'PAYMENT':
        return 'primary';
      case 'EXPENSE':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    { field: 'voucher_no', headerName: 'Voucher No', width: 130 },
    { field: 'date', headerName: 'Date', width: 130, 
      valueFormatter: (params) => {
        return params.value ? new Date(params.value).toLocaleDateString() : '';
      }
    },
    { 
      field: 'display_name', 
      headerName: 'Account/Expense Type', 
      width: 200,
      valueGetter: (params) => {
        if (params.row.account_type === 'OTHER') {
          const account = params.row;
          if (account.level3_name) {
            return `${account.level1_name} > ${account.level2_name} > ${account.level3_name}`;
          } else if (account.level2_name) {
            return `${account.level1_name} > ${account.level2_name}`;
          } else {
            return account.level1_name;
          }
        }
        return params.row.expense_type_name;
      }
    },
    { field: 'receiver_name', headerName: 'Receiver Name', width: 150 },
    { field: 'amount', headerName: 'Amount', width: 130,
      valueFormatter: (params) => {
        return params.value ? `Rs.${parseFloat(params.value).toLocaleString()}` : '';
      }
    },
    { field: 'remarks', headerName: 'Remarks', width: 200 },
    { 
      field: 'record_type', 
      headerName: 'Type', 
      width: 120,
      valueGetter: (params) => {
        if (params.row.account_type === 'OTHER') {
          return 'EXPENSE';
        }
        return params.row.record_type;
      }
    }
  ];

  return (
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Payment & Expense History
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
              label="Record Type"
              value={filters.recordType}
              onChange={(e) => setFilters(prev => ({ ...prev, recordType: e.target.value }))}
            >
              {recordTypes.map((type) => (
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
                <TableCell>Time</TableCell>
                <TableCell>Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Receiver</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>{format(new Date(record.payment_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{record.payment_time}</TableCell>
                  <TableCell>
                    {record.record_type === 'PAYMENT' ? record.receipt_no : record.voucher_no}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.record_type === 'PAYMENT' ? 'Payment' : 'Expense'}
                      color={getRecordTypeColor(record.record_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{record.account_name}</TableCell>
                  <TableCell>
                    {record.payment_mode === 'ONLINE' && record.bank_name 
                      ? `${record.payment_mode} (${record.bank_name})` 
                      : record.payment_mode}
                  </TableCell>
                  <TableCell>{record.receiver_name}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{
                      color: record.record_type === 'PAYMENT' ? 'success.main' : 'error.main',
                      fontFamily: 'monospace'
                    }}
                  >
                    ₨ {Number(record.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{record.remarks}</TableCell>
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