import React, { useState, useEffect } from 'react';
import config from '../../config';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth } from 'date-fns';
import { Print } from '@mui/icons-material';
import '../../styles/Ledger.css';
import { useAuth } from '../../context/AuthContext';

const Ledger = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount && dateRange.startDate && dateRange.endDate) {
      fetchTransactions();
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/accounts/list');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch accounts');
    }
  };

  const formatTransactionDetails = (transaction) => {
    // For payment transactions, show description as is (bank name is already included)
    if (transaction.description?.includes('Payment received from') || 
        transaction.description?.includes('Payment issued to')) {
      return transaction.description;
    }
    
    // Helper functions
    const formatQuantity = (qty) => Math.round(parseFloat(qty)).toString();
    const formatPrice = (price) => parseFloat(price).toFixed(2);
    
    // Special handling for store returns
    if (transaction.description === 'STORE_RETURN') {
      return `Return: ${formatQuantity(transaction.quantity)} ${transaction.unit} of ${transaction.item_name} @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.unit}`;
    }
    
    // Special handling for sales
    if (transaction.entry_type?.includes('SALE') || transaction.description?.includes('Sale')) {
      return `Sale: ${formatQuantity(transaction.quantity)} ${transaction.unit} of ${transaction.item_name} @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.unit}`;
    }
    
    // Keep existing logic for all other cases
    if (transaction.reference?.startsWith('STI-')) {
      return `${formatQuantity(transaction.quantity)} ${transaction.unit} of ${transaction.item_name} @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.unit}`;
    }
    
    // Special handling for purchase entries
    if (transaction.description?.includes('Purchase against GRN')) {
      return `${formatQuantity(transaction.quantity)} ${transaction.gate_unit || transaction.unit || 'unit'} of ${transaction.item_type || transaction.paper_type} @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.gate_unit || transaction.unit || 'unit'}`;
    }
    
    if (transaction.weight && (transaction.item_type || transaction.paper_type)) {
      return `${formatQuantity(transaction.weight)} ${transaction.gate_unit || transaction.unit || 'unit'} of ${transaction.item_type || transaction.paper_type}${transaction.price_per_unit ? ` @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.gate_unit || transaction.unit || 'unit'}` : ''}`;
    }
    
    if (transaction.description) {
      return transaction.description;
    }
    
    return '-';
  };

  const formatDateTime = (date, transactionType) => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date:', date);
        return '-';
      }
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return '-';
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const formattedStartDate = format(dateRange.startDate, "yyyy-MM-dd'T'00:00:00.000'Z'");
      const formattedEndDate = format(dateRange.endDate, "yyyy-MM-dd'T'23:59:59.999'Z'");

      const response = await fetch(
        `http://localhost:5000/api/accounts/ledger?` + 
        `accountId=${selectedAccount}&` +
        `startDate=${formattedStartDate}&` +
        `endDate=${formattedEndDate}&` +
        `userRole=${user.role}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      
      setAccountDetails({
        ...data.account_details,
        opening_balance: parseFloat(data.account_details.opening_balance) || 0,
        current_balance: parseFloat(data.account_details.current_balance) || 0
      });
      
      // Process transactions
      setTransactions(data.transactions.map(t => {
        return {
          ...t,
          date: t.date,
          amount: parseFloat(t.amount) || 0,
          type: t.type,
          entry_type: t.entry_type || t.type,
          details: formatTransactionDetails({
            ...t,
            quantity: t.quantity || t.weight || 0,
            unit: t.unit || t.gate_unit || 'unit',
            item_type: t.item_type || t.paper_type || '',
            item_name: t.item_name || '',
            price_per_unit: parseFloat(t.price_per_unit) || 0,
            weight: t.weight || 0,
            gate_unit: t.gate_unit || '',
            paper_type: t.paper_type || ''
          }),
          quantity: t.quantity || t.weight || 0,
          unit: t.unit || t.gate_unit || 'unit',
          item_type: t.item_type || t.paper_type || '',
          item_name: t.item_name || '',
          price_per_unit: parseFloat(t.price_per_unit) || 0
        };
      }));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (index) => {
    let balance = accountDetails?.opening_balance || 0;
    for (let i = 0; i <= index; i++) {
      const transaction = transactions[i];
      if (transaction.type === 'DEBIT') {
        balance -= transaction.amount;
      } else if (transaction.type === 'CREDIT') {
        balance += transaction.amount;
      }
    }
    const suffix = balance >= 0 ? ' CR' : ' DB';
    return `${Math.abs(balance).toFixed(2)}${suffix}`;
  };

  const calculateTotals = () => {
    let finalBalance = accountDetails?.opening_balance || 0;
    return transactions.reduce((acc, t) => {
      if (t.type === 'DEBIT') {
        acc.totalDebits += t.amount;
        finalBalance -= t.amount; // Payments (DEBIT) decrease balance
      } else if (t.type === 'CREDIT') {
        acc.totalCredits += t.amount;
        finalBalance += t.amount; // Purchases (CREDIT) increase balance
      }
      return { ...acc, finalBalance };
    }, { totalDebits: 0, totalCredits: 0, finalBalance });
  };

  const { totalDebits, totalCredits, finalBalance } = calculateTotals();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const periodText = `${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Account Ledger - ${accountDetails.name}</title>
          <style>
            @page { 
              size: A4 portrait; 
              margin: 1cm; 
            }
            body { 
              margin: 0;
              padding: 1cm;
              font-family: Arial, sans-serif;
              color: #000;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 0.8cm;
            }
            .company-name {
              font-size: 22pt;
              font-weight: bold;
              margin-bottom: 0.3cm;
              font-family: 'Times New Roman', Times, serif;
            }
            .document-title {
              font-size: 14pt;
              text-transform: uppercase;
              margin: 0.3cm 0;
              font-weight: bold;
            }
            .date-container {
              text-align: right;
              margin-bottom: 0.3cm;
              font-size: 9pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0.3cm 0;
              font-size: 8pt;
            }
            th, td {
              border: 1px solid #000;
              padding: 0.15cm 0.2cm;
              text-align: left;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
              white-space: nowrap;
            }
            td {
              font-size: 8pt;
            }
            /* Column widths */
            th:nth-child(1), td:nth-child(1) { width: 15%; } /* Date & Time */
            th:nth-child(2), td:nth-child(2) { width: 12%; } /* Reference */
            th:nth-child(3), td:nth-child(3) { width: 33%; } /* Details */
            th:nth-child(4), td:nth-child(4) { width: 12%; } /* Debit */
            th:nth-child(5), td:nth-child(5) { width: 12%; } /* Credit */
            th:nth-child(6), td:nth-child(6) { width: 16%; } /* Balance */

            .amount-cell {
              text-align: right;
              font-family: monospace;
              font-size: 8pt;
              white-space: nowrap;
            }
            .totals-section {
              margin-top: 0.8cm;
              border: 1px solid #000;
              padding: 0.4cm;
              background: #f8f9fa;
            }
            .totals-grid {
              display: flex;
              justify-content: space-between;
            }
            .total-item {
              width: 30%;
              text-align: center;
            }
            .total-item div:first-child {
              font-size: 9pt;
              margin-bottom: 0.1cm;
            }
            .total-item div:last-child {
              font-size: 12pt;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">Account Ledger</div>
            <div>${accountDetails.name}</div>
            <div style="font-size: 10pt;">Period: ${periodText}</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Reference</th>
                <th>Details</th>
                <th class="amount-cell">Debit</th>
                <th class="amount-cell">Credit</th>
                <th class="amount-cell">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5">Opening Balance</td>
                <td class="amount-cell">
                  Rs.${Math.abs(accountDetails.opening_balance).toFixed(2)}
                  ${accountDetails.opening_balance >= 0 ? ' CR' : ' DB'}
                </td>
              </tr>
              ${transactions.map((transaction, index) => `
                <tr>
                  <td>${formatDateTime(transaction.date, transaction.entry_type)}</td>
                  <td>${transaction.reference}</td>
                  <td>${formatTransactionDetails(transaction)}</td>
                  <td class="amount-cell">${transaction.type === 'DEBIT' ? transaction.amount.toFixed(2) : ''}</td>
                  <td class="amount-cell">${transaction.type === 'CREDIT' ? transaction.amount.toFixed(2) : ''}</td>
                  <td class="amount-cell">${calculateBalance(index)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-grid">
              <div className="total-item">
                <div>Total Debits:</div>
                <div style="color: #d32f2f; font-weight: bold; font-size: 14pt;">
                  Rs.${totalDebits.toFixed(2)}
                </div>
              </div>
              <div className="total-item">
                <div>Total Credits:</div>
                <div style="color: #2e7d32; font-weight: bold; font-size: 14pt;">
                  Rs.${totalCredits.toFixed(2)}
                </div>
              </div>
              <div className="total-item">
                <div>Current Balance:</div>
                <div style="font-weight: bold; font-size: 14pt;">
                  Rs.${Math.abs(finalBalance).toFixed(2)}${finalBalance >= 0 ? ' CR' : ' DB'}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="rpm-ledger-main">
        <Box className="rpm-ledger-controls no-print">
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Select Account"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.account_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateRange(prev => ({
                      ...prev,
                      startDate: newValue
                    }));
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateRange(prev => ({
                      ...prev,
                      endDate: newValue
                    }));
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          selectedAccount && accountDetails && (
            <Box className="rpm-ledger-content">
              <Stack 
                direction="row" 
                justifyContent="space-between" 
                alignItems="center" 
                sx={{ mb: 2 }}
                className="rpm-ledger-actions no-print"
              >
                <Typography variant="h5">Account Ledger</Typography>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handlePrint}
                >
                  Print Ledger
                </Button>
              </Stack>

              <Box className="rpm-ledger-print-header print-only">
                <Typography variant="h4" align="center" gutterBottom>
                  Account Ledger
                </Typography>
                <Typography variant="h6" align="center" gutterBottom>
                  {accountDetails.name}
                </Typography>
                <Typography variant="body1" align="center" gutterBottom>
                  Period: {format(dateRange.startDate, 'MMM dd, yyyy')} - {format(dateRange.endDate, 'MMM dd, yyyy')}
                </Typography>
              </Box>

              <Box className="rpm-ledger-account-details">
                <Typography variant="h6" gutterBottom>
                  Account Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Account Name:</strong> {accountDetails.name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Opening Balance:</strong> {Math.abs(accountDetails.opening_balance).toFixed(2)}{accountDetails.opening_balance >= 0 ? ' CR' : ' DB'}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <TableContainer component={Paper} className="rpm-ledger-table-container">
                <Table className="rpm-ledger-table">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white' }}>Date & Time</TableCell>
                      <TableCell sx={{ color: 'white' }}>Reference</TableCell>
                      <TableCell sx={{ color: 'white' }}>Details</TableCell>
                      <TableCell sx={{ color: 'white' }} align="right">Debit</TableCell>
                      <TableCell sx={{ color: 'white' }} align="right">Credit</TableCell>
                      <TableCell sx={{ color: 'white' }} align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell colSpan={5}>
                        <Typography variant="subtitle2">Opening Balance</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">
                          Rs.{Math.abs(accountDetails.opening_balance).toFixed(2)}
                          {accountDetails.opening_balance >= 0 ? ' CR' : ' DB'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    
                    {transactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction.id}
                        sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}
                      >
                        <TableCell>
                          {formatDateTime(transaction.date)}
                        </TableCell>
                        <TableCell>{transaction.reference}</TableCell>
                        <TableCell>
                          {formatTransactionDetails(transaction)}
                        </TableCell>
                        <TableCell align="right">
                          {transaction.type === 'DEBIT' && 
                            transaction.amount.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {transaction.type === 'CREDIT' && 
                            transaction.amount.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {calculateBalance(index)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Paper className="rpm-ledger-totals">
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2">Total Debits:</Typography>
                    <Typography variant="h6" color="error">
                      {totalDebits.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2">Total Credits:</Typography>
                    <Typography variant="h6" color="success.main">
                      {totalCredits.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2">Current Balance:</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      Rs.{Math.abs(finalBalance).toFixed(2)}{finalBalance >= 0 ? ' CR' : ' DB'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Ledger; 