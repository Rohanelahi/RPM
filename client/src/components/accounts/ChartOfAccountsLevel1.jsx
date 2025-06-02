import React, { useState, useEffect } from 'react';
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
  Tooltip
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

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const fetchAllAccounts = async () => {
    try {
      setLoading(true);
      // Fetch all levels
      const [level1Res, level2Res, level3Res] = await Promise.all([
        axios.get(`${config.apiUrl}/accounts/chart/level1`),
        axios.get(`${config.apiUrl}/accounts/chart/level2`),
        axios.get(`${config.apiUrl}/accounts/chart/level3`)
      ]);
      setAccounts(level1Res.data);
      setLevel2Accounts(level2Res.data);
      // Flatten all level 3 accounts
      const allLevel3 = [];
      level3Res.data.forEach(level1 => {
        if (level1.level2_accounts) {
          level1.level2_accounts.forEach(level2 => {
            if (level2.level3_accounts) {
              level2.level3_accounts.forEach(level3 => {
                allLevel3.push({ ...level3, level2_id: level2.id });
              });
            }
          });
        }
      });
      setLevel3Accounts(allLevel3);
      // Fetch balances for all level 3 accounts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endDate = tomorrow.toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const balances = {};
      for (const acc of allLevel3) {
        try {
          const balanceResponse = await axios.get(
            `${config.apiUrl}/accounts/ledger?accountId=${acc.id}&startDate=${startDate}&endDate=${endDate}`
          );
          balances[acc.id] = balanceResponse.data.account_details.current_balance;
        } catch (error) {
          balances[acc.id] = 0;
        }
      }
      setAccountBalances(balances);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

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
      const bal = accountBalances[acc.id] || 0;
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
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => {
                const net = getLevel1NetBalance(account.id);
                return (
                  <TableRow key={account.id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell align="right">{parseFloat(account.opening_balance || 0).toFixed(2)} {account.balance_type}</TableCell>
                    <TableCell align="right">{account.account_type}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{net < 0 ? Math.abs(net).toFixed(2) : '0.00'}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{net > 0 ? net.toFixed(2) : '0.00'}</TableCell>
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