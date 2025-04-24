import React, { useState, useEffect, useRef } from 'react';
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
  Tabs,
  Tab,
  Divider,
  Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import PrintIcon from '@mui/icons-material/Print';
import '../../styles/CashFlowSummary.css';
import config from '../../config';

const CashFlowSummary = () => {
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [summary, setSummary] = useState({
    totalCredit: 0,
    totalDebit: 0,
    netCashFlow: 0
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    transactionType: '',
    sourceType: ''
  });
  
  const printRef = useRef();

  const transactionTypes = [
    { value: '', label: 'All Transactions' },
    { value: 'CREDIT', label: 'Credit' },
    { value: 'DEBIT', label: 'Debit' }
  ];

  const sourceTypes = [
    { value: '', label: 'All Sources' },
    { value: 'PAYMENT', label: 'Payments' },
    { value: 'EXPENSE', label: 'Expenses' },
    { value: 'BANK', label: 'Bank Transactions' }
  ];

  useEffect(() => {
    fetchCashFlowData();
  }, [filters]);

  const fetchCashFlowData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      // Format dates and add only if they exist
      if (filters.startDate) {
        const startDate = format(filters.startDate, 'yyyy-MM-dd');
        queryParams.append('startDate', startDate);
      }
      if (filters.endDate) {
        const endDate = format(filters.endDate, 'yyyy-MM-dd');
        queryParams.append('endDate', endDate);
      }
      
      // Add other filters only if they have values
      if (filters.transactionType) {
        queryParams.append('transactionType', filters.transactionType);
      }
      if (filters.sourceType) {
        queryParams.append('sourceType', filters.sourceType);
      }

      const url = `${config.apiUrl}/reports/cash-flow?${queryParams}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      
      // Sort transactions by date (ascending - oldest first)
      const sortedTransactions = [...(data.transactions || [])].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      
      // Add running balance to each transaction
      let runningBalance = 0;
      const transactionsWithBalance = sortedTransactions.map(transaction => {
        if (transaction.flow_type === 'CREDIT') {
          runningBalance += Number(transaction.amount);
        } else {
          runningBalance -= Number(transaction.amount);
        }
        return {
          ...transaction,
          balance: runningBalance,
          balanceType: runningBalance >= 0 ? 'CR' : 'DB',
          balanceAmount: Math.abs(runningBalance)
        };
      });
      
      setCashFlowData(transactionsWithBalance);
      
      // Calculate summary
      const totalCredit = data.summary?.totalCredit || 0;
      const totalDebit = data.summary?.totalDebit || 0;
      const netCashFlow = totalCredit - totalDebit;
      
      setSummary({
        totalCredit,
        totalDebit,
        netCashFlow
      });
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      setCashFlowData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getFilteredData = () => {
    if (tabValue === 0) return cashFlowData;
    
    return cashFlowData.filter(item => {
      if (tabValue === 1) return item.flow_type === 'CREDIT';
      if (tabValue === 2) return item.flow_type === 'DEBIT';
      return true;
    });
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'PAYMENT':
        return '💰';
      case 'EXPENSE':
        return '💸';
      case 'BANK':
        return '🏦';
      default:
        return '📝';
    }
  };
  
  const handlePrint = () => {
    const content = document.getElementById('printable-content');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cash Flow Report</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Source+Sans+Pro:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Source Sans Pro', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 30px;
              color: #000;
              line-height: 1.5;
              font-weight: 600;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 2px solid #000;
            }
            .header h1 {
              margin-bottom: 8px;
              font-weight: 700;
              color: #000;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0;
              color: #000;
              font-size: 14px;
              font-weight: 600;
            }
            .summary {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .summary-box {
              border: 1px solid #000;
              border-radius: 8px;
              padding: 15px;
              width: 30%;
              text-align: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .summary-box h3 {
              margin-top: 0;
              margin-bottom: 10px;
              font-weight: 700;
              color: #000;
              font-size: 16px;
            }
            .summary-box p {
              margin: 0;
              font-size: 22px;
              font-weight: 700;
              color: #000;
            }
            .summary-box.credit {
              background-color: rgba(76, 175, 80, 0.05);
              border-color: #000;
            }
            .summary-box.debit {
              background-color: rgba(244, 67, 54, 0.05);
              border-color: #000;
            }
            .summary-box.positive {
              background-color: rgba(33, 150, 243, 0.05);
              border-color: #000;
            }
            .summary-box.negative {
              background-color: rgba(255, 152, 0, 0.05);
              border-color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 13px;
              font-weight: 600;
            }
            th, td {
              border: 1px solid #000;
              padding: 10px;
            }
            th {
              background-color: #f9f9f9;
              font-weight: 700;
              color: #000;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #f5f5f5;
            }
            .credit-amount, .debit-amount, .balance-cell {
              font-family: 'Roboto Mono', 'Courier New', monospace;
              font-weight: 700;
              font-size: 13px;
              text-align: right;
              color: #000;
            }
            .date-column {
              font-weight: 700;
              text-align: center;
            }
            .description-column {
              width: 40%;
              max-width: 400px;
              font-weight: 600;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #000;
              padding-top: 15px;
              border-top: 1px solid #000;
              font-weight: 600;
            }
            .company-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .company-info h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            @media print {
              body {
                margin: 0.5cm;
              }
              .summary-box {
                break-inside: avoid;
              }
              thead {
                display: table-header-group;
              }
              tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="company-info">
            <h2>Rose Paper Mill</h2>
          </div>
          
          <div class="header">
            <h1>Cash Flow Report</h1>
            <p>Period: ${filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'All time'} - ${filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Present'}</p>
          </div>
          
          <div class="summary">
            <div class="summary-box credit">
              <h3>Total Credit</h3>
              <p>${Number(summary.totalCredit).toLocaleString()}</p>
            </div>
            <div class="summary-box debit">
              <h3>Total Debit</h3>
              <p>${Number(summary.totalDebit).toLocaleString()}</p>
            </div>
            <div class="summary-box ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}">
              <h3>Net Cash Flow</h3>
              <p>${Math.abs(Number(summary.netCashFlow)).toLocaleString()} ${summary.netCashFlow >= 0 ? 'CR' : 'DB'}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th class="description-column">Description</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${getFilteredData().map(item => `
                <tr>
                  <td class="date-column">${format(new Date(item.date), 'dd/MM/yyyy HH:mm')}</td>
                  <td class="description-column">
                    ${item.source_type === 'PAYMENT' ? `
                      ${item.payment_type === 'RECEIVED' ? 'Receipt' : 'Payment'} 
                      ${item.payment_mode === 'ONLINE' && item.bank_name ? `(ONLINE - ${item.bank_name})` : `(${item.payment_mode})`} 
                      ${item.voucher_no ? `[${item.voucher_no}]` : ''}
                      from ${item.related_account_name || item.receiver_name}
                      ${item.receiver_name && item.receiver_name !== item.related_account_name ? ` (${item.receiver_name})` : ''}
                      ${item.remarks ? ` - ${item.remarks}` : ''}
                    ` : item.description}
                  </td>
                  <td class="credit-amount">${item.flow_type === 'CREDIT' ? Number(item.amount).toLocaleString() : ''}</td>
                  <td class="debit-amount">${item.flow_type === 'DEBIT' ? Number(item.amount).toLocaleString() : ''}</td>
                  <td class="balance-cell">${Number(item.balanceAmount).toLocaleString()} ${item.balanceType}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Report generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            <p>This is a computer-generated document. No signature is required.</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing (optional)
      // printWindow.close();
    }, 500);
  };

  return (
    <Box className="cash-flow-container">
      <Paper className="cash-flow-header">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Cash Flow Summary</Typography>
          <Button 
            variant="outlined" 
            startIcon={<PrintIcon />} 
            onClick={handlePrint}
          >
            Print
          </Button>
        </Box>
        <Divider />
      </Paper>

      <Paper className="cash-flow-filters">
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
              label="Transaction Type"
              value={filters.transactionType}
              onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
            >
              {transactionTypes.map((type) => (
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
              label="Source Type"
              value={filters.sourceType}
              onChange={(e) => setFilters(prev => ({ ...prev, sourceType: e.target.value }))}
            >
              {sourceTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper className="cash-flow-tabs">
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="All Transactions" />
          <Tab label="Credit" />
          <Tab label="Debit" />
        </Tabs>
      </Paper>

      <div id="printable-content" ref={printRef}>
        <Paper className="cash-flow-summary">
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box className="summary-box credit">
                <Typography variant="subtitle1">Total Credit</Typography>
                <Typography variant="h5">{Number(summary.totalCredit).toLocaleString()}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="summary-box debit">
                <Typography variant="subtitle1">Total Debit</Typography>
                <Typography variant="h5">{Number(summary.totalDebit).toLocaleString()}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className={`summary-box ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                <Typography variant="subtitle1">Net Cash Flow</Typography>
                <Typography variant="h5">
                  {Math.abs(Number(summary.netCashFlow)).toLocaleString()} {summary.netCashFlow >= 0 ? 'CR' : 'DB'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box className="cash-flow-loading">
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} className="cash-flow-table-container">
            <Table>
              <TableHead>
                <TableRow className="cash-flow-table-header">
                  <TableCell>Date</TableCell>
                  <TableCell className="description-column">Description</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredData().map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{format(new Date(item.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="description-column">
                      {item.source_type === 'PAYMENT' ? (
                        <>
                          {item.payment_type === 'RECEIVED' ? 'Receipt' : 'Payment'} {' '}
                          {item.payment_mode === 'ONLINE' && item.bank_name ? `(ONLINE - ${item.bank_name})` : `(${item.payment_mode})`} {' '}
                          {item.voucher_no && `[${item.voucher_no}] `}
                          from {item.related_account_name || item.receiver_name}
                          {item.receiver_name && item.receiver_name !== item.related_account_name ? ` (${item.receiver_name})` : ''}
                          {item.remarks && ` - ${item.remarks}`}
                        </>
                      ) : item.description}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        color: 'success.main',
                        fontFamily: 'monospace',
                        fontWeight: item.flow_type === 'CREDIT' ? 'bold' : 'normal'
                      }}
                    >
                      {item.flow_type === 'CREDIT' ? Number(item.amount).toLocaleString() : ''}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        color: 'error.main',
                        fontFamily: 'monospace',
                        fontWeight: item.flow_type === 'DEBIT' ? 'bold' : 'normal'
                      }}
                    >
                      {item.flow_type === 'DEBIT' ? Number(item.amount).toLocaleString() : ''}
                    </TableCell>
                    <TableCell 
                      align="right"
                      className={`balance-cell ${item.balanceType === 'CR' ? 'balance-positive' : 'balance-negative'}`}
                    >
                      {Number(item.balanceAmount).toLocaleString()} {item.balanceType}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
    </Box>
  );
};

export default CashFlowSummary; 