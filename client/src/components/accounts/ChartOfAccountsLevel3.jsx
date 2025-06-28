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
  Tooltip,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import config from '../../config';

const ChartOfAccountsLevel3 = () => {
  const [name, setName] = useState('');
  const [opening_balance, setOpeningBalance] = useState('');
  const [balance_type, setBalanceType] = useState('DEBIT');
  const [account_type, setAccountType] = useState('ACCOUNT');
  const [level1_id, setLevel1Id] = useState('');
  const [level2_id, setLevel2Id] = useState('');
  const [level1Accounts, setLevel1Accounts] = useState([]);
  const [level2Accounts, setLevel2Accounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [accountBalances, setAccountBalances] = useState({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (level1_id) {
      const level1Account = level1Accounts.find(acc => acc.id === parseInt(level1_id));
      if (level1Account) {
        setLevel2Accounts(level1Account.level2_accounts || []);
      }
    } else {
      setLevel2Accounts([]);
      setLevel2Id('');
    }
  }, [level1_id, level1Accounts]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiUrl}/accounts/chart/level3`);
      setLevel1Accounts(response.data);
      
      // Get tomorrow's date and date 30 days ago for balance fetching
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endDate = tomorrow.toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Fetch current balances for all level 3 accounts
      const balances = {};
      for (const level1 of response.data) {
        for (const level2 of level1.level2_accounts || []) {
          for (const level3 of level2.level3_accounts || []) {
            try {
              const balanceResponse = await axios.get(
                `${config.apiUrl}/accounts/ledger?accountId=${level3.id}&startDate=${startDate}&endDate=${endDate}`
              );
              balances[level3.id] = balanceResponse.data.account_details.current_balance;
            } catch (error) {
              console.error(`Error fetching balance for account ${level3.id}:`, error);
              balances[level3.id] = 0;
            }
          }
        }
      }
      setAccountBalances(balances);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (level1Id, level2Id) => {
    setLevel1Id(level1Id);
    setLevel2Id(level2Id);
    setName('');
    setOpeningBalance('');
    setBalanceType('DEBIT');
    setAccountType('ACCOUNT');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setName('');
    setOpeningBalance('');
    setBalanceType('DEBIT');
    setAccountType('ACCOUNT');
    setLevel1Id('');
    setLevel2Id('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${config.apiUrl}/accounts/chart/level3`, {
        name,
        opening_balance: parseFloat(opening_balance) || 0,
        balance_type,
        level1_id: parseInt(level1_id),
        level2_id: parseInt(level2_id),
        account_type
      });

      setSuccess('Account created successfully');
      fetchAccounts();
      handleCloseDialog();
    } catch (err) {
      console.error('Error creating account:', err);
      setError(err.response?.data?.error || 'Error creating account. Please try again.');
    }
  };

  const getBalanceDisplay = (accountId) => {
    const balance = accountBalances[accountId] || 0;
    return {
      debit: balance < 0 ? Math.abs(balance).toFixed(2) : '0.00',
      credit: balance > 0 ? balance.toFixed(2) : '0.00'
    };
  };

  return (
    <Box sx={{ p: 3, ml: '300px' }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Chart of Accounts Level 3
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
              {level1Accounts.map((level1Account) => (
                <React.Fragment key={level1Account.id}>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell colSpan={6}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {level1Account.name}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {level1Account.level2_accounts?.map((level2Account) => {
                    // Calculate totals for this level 2 account
                    let totalDebit = 0;
                    let totalCredit = 0;
                    (level2Account.level3_accounts || []).forEach((level3Account) => {
                      const balance = getBalanceDisplay(level3Account.id);
                      totalDebit += parseFloat(balance.debit);
                      totalCredit += parseFloat(balance.credit);
                    });
                    const netBalance = totalCredit - totalDebit;
                    return (
                      <React.Fragment key={level2Account.id}>
                        <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
                          <TableCell colSpan={6} sx={{ pl: 4 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                              {level2Account.name}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        {(level2Account.level3_accounts || []).map((level3Account) => {
                          const balance = getBalanceDisplay(level3Account.id);
                          return (
                            <TableRow key={level3Account.id}>
                              <TableCell sx={{ pl: 8 }}>{level3Account.name}</TableCell>
                              <TableCell align="right">
                                {parseFloat(level3Account.opening_balance || 0).toFixed(2)} {level3Account.balance_type}
                              </TableCell>
                              <TableCell align="right">{level3Account.account_type}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>
                                {balance.debit}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'success.main' }}>
                                {balance.credit}
                              </TableCell>
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
                        {/* Total row for Level 2 */}
                        <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                          <TableCell sx={{ pl: 8, fontWeight: 'bold' }}>Total</TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>{totalDebit.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>{totalCredit.toFixed(2)}</TableCell>
                          <TableCell />
                        </TableRow>
                        {/* Net Balance row for Level 2 */}
                        <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                          <TableCell sx={{ pl: 8, fontWeight: 'bold' }}>Balance</TableCell>
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
                          <TableCell colSpan={6} align="right" sx={{ pl: 4 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenDialog(level1Account.id, level2Account.id)}
                            >
                              Add Sub-Account
                            </Button>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Sub-Account</DialogTitle>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
          {success && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Account Name"
              type="text"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              margin="dense"
              name="opening_balance"
              label="Opening Balance"
              type="number"
              fullWidth
              value={opening_balance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              required
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Balance Type</InputLabel>
              <Select
                name="balance_type"
                value={balance_type}
                onChange={(e) => setBalanceType(e.target.value)}
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
                onChange={(e) => setAccountType(e.target.value)}
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

export default ChartOfAccountsLevel3; 