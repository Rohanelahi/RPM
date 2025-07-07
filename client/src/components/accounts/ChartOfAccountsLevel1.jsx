import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import config from '../../config';
import CircularProgress from '@mui/material/CircularProgress';

const ChartOfAccountsLevel1 = () => {
  const [accounts, setAccounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [name, setName] = useState('');
  const [opening_balance, setOpeningBalance] = useState('');
  const [balance_type, setBalanceType] = useState('DEBIT');
  const [account_type, setAccountType] = useState('ACCOUNT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [level2Accounts, setLevel2Accounts] = useState([]);
  const [level3Accounts, setLevel3Accounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [openingBalances, setOpeningBalances] = useState({});
  const [movement, setMovement] = useState({});
  const [closingBalances, setClosingBalances] = useState({});
  const printRef = useRef();

  const fetchAllAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const [level1Res, level2Res, level3Res] = await Promise.all([
        axios.get(`${config.apiUrl}/accounts/chart/level1`),
        axios.get(`${config.apiUrl}/accounts/chart/level2`),
        axios.get(`${config.apiUrl}/accounts/chart/level3`)
      ]);
      
      // Add namespaced IDs to Level 1 accounts using unified_id
      const level1WithNamespacedIds = level1Res.data.map(acc => ({
        ...acc,
        namespacedId: `L1-${acc.unified_id || acc.id}`
      }));
      setAccounts(level1WithNamespacedIds);
      
      // Add namespaced IDs to Level 2 accounts using unified_id
      const level2WithNamespacedIds = level2Res.data.map(acc => ({
        ...acc,
        namespacedId: `L2-${acc.unified_id || acc.id}`
      }));
      setLevel2Accounts(level2WithNamespacedIds);
      
      // Flatten all level 3 accounts and add namespaced IDs
      const allLevel3 = [];
      level3Res.data.forEach(level1 => {
        if (level1.level2_accounts) {
          level1.level2_accounts.forEach(level2 => {
            if (level2.level3_accounts) {
              level2.level3_accounts.forEach(level3 => {
                allLevel3.push({ 
                  ...level3, 
                  level2_id: level2.id,
                  namespacedId: `L3-${level3.unified_id || level3.id}`
                });
              });
            }
          });
        }
      });
      setLevel3Accounts(allLevel3);
      
      // For each Level 1, fetch opening, movement, closing using unified ID and level
      const openingBalancesTemp = {};
      const movementTemp = {};
      const closingBalancesTemp = {};
      await Promise.all(level1WithNamespacedIds.map(async (account) => {
        // Opening balance as of startDate (exclusive)
        const openingRes = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=1&endDate=${startDate}`);
        openingBalancesTemp[account.namespacedId] = openingRes.data.current_balance || 0;
        // Net movement between startDate and endDate (inclusive)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        const movementRes = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=1&startDate=${startDate}&endDate=${nextDayStr}`);
        let debit = 0, credit = 0;
        (movementRes.data.transactions || []).forEach(txn => {
          if (txn.entry_type === 'DEBIT') debit += parseFloat(txn.amount);
          if (txn.entry_type === 'CREDIT') credit += parseFloat(txn.amount);
        });
        movementTemp[account.namespacedId] = { debit, credit };
        // Closing balance as of endDate (inclusive)
        const closingRes = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=1&endDate=${nextDayStr}`);
        closingBalancesTemp[account.namespacedId] = closingRes.data.current_balance || 0;
      }));
      setOpeningBalances(openingBalancesTemp);
      setMovement(movementTemp);
      setClosingBalances(closingBalancesTemp);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  const getLevel2AccountsForLevel1 = (level1Id) => {
    return level2Accounts.filter(account => account.level1_id === level1Id);
  };

  const getLevel3AccountsForLevel2 = (level2Id) => {
    return level3Accounts.filter(account => account.level2_id === level2Id);
  };

  const getLevel2NetBalance = (level2Id) => {
    let totalDebit = 0;
    let totalCredit = 0;
    getLevel3AccountsForLevel2(level2Id).forEach(acc => {
      const bal = accountBalances[acc.namespacedId] || 0;
      if (bal < 0) totalDebit += Math.abs(bal);
      if (bal > 0) totalCredit += bal;
    });
    const netBalance = totalCredit - totalDebit;
    return netBalance;
  };

  const getLevel1NetBalance = (level1Id) => {
    let sum = 0;
    getLevel2AccountsForLevel1(level1Id).forEach(level2 => {
      sum += getLevel2NetBalance(level2.id);
    });
    return sum;
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setName('');
    setOpeningBalance('');
    setBalanceType('DEBIT');
    setAccountType('ACCOUNT');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);
    } else if (name === 'opening_balance') {
      setOpeningBalance(value);
    } else if (name === 'balance_type') {
      setBalanceType(value);
    } else if (name === 'account_type') {
      setAccountType(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${config.apiUrl}/accounts/chart/level1`, {
        name,
        opening_balance: parseFloat(opening_balance),
        balance_type,
        account_type
      });

      setSuccess('Account created successfully');
      setName('');
      setOpeningBalance('');
      setBalanceType('DEBIT');
      setAccountType('ACCOUNT');
      fetchAllAccounts();
    } catch (err) {
      console.error('Error creating account:', err);
      setError(err.response?.data?.error || 'Error creating account. Please try again.');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Trial Balance</title>
          <style>
            @page { size: A4; margin: 1cm; }
            body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; font-size: 14px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse !important; border-spacing: 0 !important; margin-bottom: 15px; page-break-inside: avoid; }
            th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; font-size: 13px; text-align: center; padding: 4px 6px; }
            .print-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .print-header h1 { margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .print-header h2 { margin: 8px 0; font-size: 16px; font-weight: normal; }
            .print-header p { margin: 8px 0; font-size: 14px; font-weight: bold; }
            .level1-header, .level1-header td, tr.level1-header { font-size: 16px !important; font-weight: 900 !important; font-family: Arial, sans-serif !important; letter-spacing: 0.5px !important; padding: 2px 8px !important; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>TRIAL BALANCE</h1>
            <h2>(OPENING, MOVEMENT & CLOSING)</h2>
            <p>From: ${startDate} To: ${endDate}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Opening Balance</th>
                <th>Account Type</th>
                <th>Debit Balance</th>
                <th>Credit Balance</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${accounts.map(account => `
                <tr>
                  <td>${account.name}</td>
                  <td style="text-align:right">${parseFloat(openingBalances[account.namespacedId] || 0).toFixed(2)}</td>
                  <td>${account.account_type}</td>
                  <td style="text-align:right">${parseFloat(movement[account.namespacedId]?.debit || 0).toFixed(2)}</td>
                  <td style="text-align:right">${parseFloat(movement[account.namespacedId]?.credit || 0).toFixed(2)}</td>
                  <td style="text-align:right">${parseFloat(closingBalances[account.namespacedId] || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <Box sx={{ p: 3, ml: '300px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Chart of Accounts Level 1
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Account
        </Button>
      </Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={handlePrint}>Print</Button>
      </Stack>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account Name</TableCell>
                <TableCell align="right">Opening Balance</TableCell>
                <TableCell align="right">Account Type</TableCell>
                <TableCell align="right">Debit Balance</TableCell>
                <TableCell align="right">Credit Balance</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => {
                const net = getLevel1NetBalance(account.id);
                return (
                  <TableRow key={account.namespacedId}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell align="right">{parseFloat(openingBalances[account.namespacedId] || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{account.account_type}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{parseFloat(movement[account.namespacedId]?.debit || 0).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{parseFloat(movement[account.namespacedId]?.credit || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{parseFloat(closingBalances[account.namespacedId] || 0).toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Account</DialogTitle>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Account Name"
              type="text"
              fullWidth
              value={name}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="opening_balance"
              label="Opening Balance"
              type="number"
              fullWidth
              value={opening_balance}
              onChange={handleInputChange}
              required
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Balance Type</InputLabel>
              <Select
                name="balance_type"
                value={balance_type}
                onChange={handleInputChange}
                required
              >
                <MenuItem value="DEBIT">Debit</MenuItem>
                <MenuItem value="CREDIT">Credit</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel>Account Type</InputLabel>
              <Select
                name="account_type"
                value={account_type}
                onChange={handleInputChange}
                required
              >
                <MenuItem value="ACCOUNT">Account</MenuItem>
                <MenuItem value="SUPPLIER">Supplier</MenuItem>
                <MenuItem value="CUSTOMER">Customer</MenuItem>
                <MenuItem value="VENDOR">Vendor</MenuItem>
                <MenuItem value="EXPENSE">Expense</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Add Account
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ChartOfAccountsLevel1; 