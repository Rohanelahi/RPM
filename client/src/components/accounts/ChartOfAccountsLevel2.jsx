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

const ChartOfAccountsLevel2 = () => {
  const [level1Accounts, setLevel1Accounts] = useState([]);
  const [level2Accounts, setLevel2Accounts] = useState([]);
  const [level3Accounts, setLevel3Accounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLevel1, setSelectedLevel1] = useState('');
  const [name, setName] = useState('');
  const [opening_balance, setOpeningBalance] = useState('');
  const [balance_type, setBalanceType] = useState('DEBIT');
  const [account_type, setAccountType] = useState('ACCOUNT');
  const [level1_id, setLevel1Id] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setLevel1Accounts(level1Res.data);
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
      setError('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (level1Id) => {
    setSelectedLevel1(level1Id);
    setName('');
    setOpeningBalance('');
    setBalanceType('DEBIT');
    setAccountType('ACCOUNT');
    setLevel1Id(level1Id);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setName('');
    setOpeningBalance('');
    setBalanceType('DEBIT');
    setAccountType('ACCOUNT');
    setLevel1Id('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);
    } else if (name === 'opening_balance') {
      setOpeningBalance(value);
    } else if (name === 'balance_type') {
      setBalanceType(value);
    } else if (name === 'level1_id') {
      setLevel1Id(value);
    } else if (name === 'account_type') {
      setAccountType(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${config.apiUrl}/accounts/chart/level2`, {
        name,
        opening_balance: parseFloat(opening_balance),
        balance_type,
        level1_id,
        account_type
      });

      setSuccess('Account created successfully');
      setName('');
      setOpeningBalance('');
      setBalanceType('DEBIT');
      setAccountType('ACCOUNT');
      setLevel1Id('');
      fetchAllAccounts();
    } catch (err) {
      console.error('Error creating account:', err);
      setError(err.response?.data?.error || 'Error creating account. Please try again.');
    }
  };

  const getLevel2AccountsForLevel1 = (level1Id) => {
    return level2Accounts.filter(account => account.level1_id === level1Id);
  };

  const getLevel3AccountsForLevel2 = (level2Id) => {
    return level3Accounts.filter(account => account.level2_id === level2Id);
  };

  const getLevel2Totals = (level2Id) => {
    let totalDebit = 0;
    let totalCredit = 0;
    getLevel3AccountsForLevel2(level2Id).forEach(acc => {
      const bal = accountBalances[acc.id] || 0;
      if (bal < 0) totalDebit += Math.abs(bal);
      if (bal > 0) totalCredit += bal;
    });
    const netBalance = totalCredit - totalDebit;
    return {
      debit: netBalance < 0 ? Math.abs(netBalance).toFixed(2) : '0.00',
      credit: netBalance > 0 ? netBalance.toFixed(2) : '0.00'
    };
  };

  return (
    <Box sx={{ p: 3, ml: '300px' }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Chart of Accounts Level 2
      </Typography>
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
              {level1Accounts.map((level1Account) => {
                // Calculate totals for this level 1 account
                let totalDebit = 0;
                let totalCredit = 0;
                const level2s = getLevel2AccountsForLevel1(level1Account.id);
                level2s.forEach((level2Account) => {
                  const totals = getLevel2Totals(level2Account.id);
                  totalDebit += parseFloat(totals.debit);
                  totalCredit += parseFloat(totals.credit);
                });
                const netBalance = totalCredit - totalDebit;
                return (
                  <React.Fragment key={level1Account.id}>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell colSpan={6}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {level1Account.name}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {level2s.map((level2Account) => {
                      const totals = getLevel2Totals(level2Account.id);
                      return (
                        <TableRow key={level2Account.id}>
                          <TableCell sx={{ pl: 4 }}>{level2Account.name}</TableCell>
                          <TableCell align="right">
                            {parseFloat(level2Account.opening_balance || 0).toFixed(2)} {level2Account.balance_type}
                          </TableCell>
                          <TableCell align="right">{level2Account.account_type}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>{totals.debit}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>{totals.credit}</TableCell>
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
                    {/* Total row for Level 1 */}
                    <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                      <TableCell sx={{ pl: 4, fontWeight: 'bold' }}>Total</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>{totalDebit.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>{totalCredit.toFixed(2)}</TableCell>
                      <TableCell />
                    </TableRow>
                    {/* Net Balance row for Level 1 */}
                    <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                      <TableCell sx={{ pl: 4, fontWeight: 'bold' }}>Balance</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell colSpan={2} align="right" style={{ fontWeight: 'bold' }}>
                        {netBalance > 0
                          ? `${netBalance.toFixed(2)} CR`
                          : netBalance < 0
                            ? `${Math.abs(netBalance).toFixed(2)} DB`
                            : '0.00'}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenDialog(level1Account.id)}
                        >
                          Add Sub-Account
                        </Button>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Sub-Account</DialogTitle>
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
            <FormControl fullWidth margin="dense">
              <InputLabel>Level 1 Account</InputLabel>
              <Select
                name="level1_id"
                value={level1_id}
                onChange={handleInputChange}
                required
              >
                <MenuItem value="">Select Level 1 Account</MenuItem>
                {level1Accounts.map(account => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
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

export default ChartOfAccountsLevel2; 