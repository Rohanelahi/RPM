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
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Collapse,
  IconButton,
  Alert,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';

const AccountsList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [selectedLevels, setSelectedLevels] = useState({
    level1: '',
    level2: '',
    level3: '',
    level4: ''
  });
  const [levelOptions, setLevelOptions] = useState({
    level2: [],
    level3: [],
    level4: []
  });
  
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: '',
    chartAccountId: '',
    chartAccountLevel: 1
  });

  const accountTypes = ['SUPPLIER', 'CUSTOMER', 'VENDOR'];

  const [level1Accounts, setLevel1Accounts] = useState([]);
  const [level2Accounts, setLevel2Accounts] = useState([]);
  const [level3Accounts, setLevel3Accounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/accounts/list`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartAccounts = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/chart/level1`);
      if (!response.ok) {
        throw new Error('Failed to fetch chart accounts');
      }
      const data = await response.json();
      setChartAccounts(data);
    } catch (error) {
      console.error('Error fetching chart accounts:', error);
    }
  };

  const fetchLevelAccounts = async (level, parentId) => {
    try {
      let endpoint = '';
      if (level === 2) {
        endpoint = `${config.apiUrl}/accounts/chart/level2?level1_id=${parentId}`;
      } else if (level === 3) {
        endpoint = `${config.apiUrl}/accounts/chart/level3?level2_id=${parentId}`;
      } else if (level === 4) {
        endpoint = `${config.apiUrl}/accounts/chart/level4?level3_id=${parentId}`;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch level ${level} accounts`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching level ${level} accounts:`, error);
      return [];
    }
  };

  const fetchAccountBalances = async (level1Data, level2Data, level3Data) => {
    try {
      setBalancesLoading(true);
      const balances = {};

      // Set start date to January 1, 2025
      const startDate = '2025-01-01';
      // Use tomorrow's date to ensure today's transactions are included
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endDate = tomorrow.toISOString().split('T')[0];

      // Fetch balances for Level 1 accounts
      for (const account of level1Data) {
        try {
          const response = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=1&startDate=${startDate}&endDate=${endDate}`);
          balances[`L1-${account.id}`] = response.data.current_balance || 0;
        } catch (error) {
          console.error(`Error fetching balance for Level 1 account ${account.id}:`, error);
          balances[`L1-${account.id}`] = 0;
        }
      }

      // Fetch balances for Level 2 accounts
      for (const account of level2Data) {
        try {
          const response = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=2&startDate=${startDate}&endDate=${endDate}`);
          balances[`L2-${account.id}`] = response.data.current_balance || 0;
        } catch (error) {
          console.error(`Error fetching balance for Level 2 account ${account.id}:`, error);
          balances[`L2-${account.id}`] = 0;
        }
      }

      // Fetch balances for Level 3 accounts
      for (const account of level3Data) {
        try {
          const response = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=3&startDate=${startDate}&endDate=${endDate}`);
          balances[`L3-${account.id}`] = response.data.current_balance || 0;
        } catch (error) {
          console.error(`Error fetching balance for Level 3 account ${account.id}:`, error);
          balances[`L3-${account.id}`] = 0;
        }
      }

      setAccountBalances(balances);
    } catch (error) {
      console.error('Error fetching account balances:', error);
    } finally {
      setBalancesLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [level1Res, level2Res, level3Res] = await Promise.all([
        axios.get(`${config.apiUrl}/accounts/chart/level1`),
        axios.get(`${config.apiUrl}/accounts/chart/level2`),
        axios.get(`${config.apiUrl}/accounts/chart/level3`)
      ]);

      console.log('Level 1 Response:', JSON.stringify(level1Res.data, null, 2));
      console.log('Level 2 Response:', JSON.stringify(level2Res.data, null, 2));
      console.log('Level 3 Response:', JSON.stringify(level3Res.data, null, 2));

      // Process Level 1 accounts
      const level1Data = level1Res.data.map(acc => ({
        ...acc,
        level2_accounts: []
      }));

      // Process Level 2 accounts
      const level2Data = level2Res.data.map(acc => ({
        ...acc,
        level3_accounts: []
      }));

      // Extract all Level 3 accounts from the nested structure
      const allLevel3Accounts = [];
      level3Res.data.forEach(level1 => {
        if (level1.level2_accounts) {
          level1.level2_accounts.forEach(level2 => {
            if (level2.level3_accounts) {
              level2.level3_accounts.forEach(level3 => {
                allLevel3Accounts.push({
                  ...level3,
                  level1_id: level1.id,
                  level2_id: level2.id,
                  level1_name: level1.name,
                  level2_name: level2.name
                });
              });
            }
          });
        }
      });

      console.log('Extracted Level 3 Accounts:', allLevel3Accounts);

      // Update Level 1 accounts with their Level 2 accounts
      const updatedLevel1Accounts = level1Data.map(level1 => {
        // Find Level 2 accounts that belong to this Level 1
        const level2Accounts = level2Data.filter(level2 => level2.level1_id === level1.id);
        
        // For each Level 2 account, find its Level 3 accounts
        const level2WithLevel3 = level2Accounts.map(level2 => {
          // Find Level 3 accounts that belong to this Level 2
          const level3Accounts = allLevel3Accounts.filter(level3 => 
            level3.level1_id === level1.id && level3.level2_id === level2.id
          );
          
          console.log(`Level 2 ${level2.id} has Level 3 accounts:`, level3Accounts);
          return {
            ...level2,
            level3_accounts: level3Accounts
          };
        });

        return {
          ...level1,
          level2_accounts: level2WithLevel3
        };
      });

      console.log('Final Level 1 Accounts with hierarchy:', JSON.stringify(updatedLevel1Accounts, null, 2));

      setLevel1Accounts(updatedLevel1Accounts);
      setLevel2Accounts(level2Data);
      setLevel3Accounts(allLevel3Accounts);
      
      // Fetch current balances for all accounts
      await fetchAccountBalances(updatedLevel1Accounts, level2Data, allLevel3Accounts);
      setLevel3Accounts(allLevel3Accounts);

    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLevel1Change = async (level1Id) => {
    setSelectedLevels({
      level1: level1Id,
      level2: '',
      level3: '',
      level4: ''
    });
    setLevelOptions({
      level2: [],
      level3: [],
      level4: []
    });

    if (level1Id) {
      const level2Accounts = await fetchLevelAccounts(2, level1Id);
      setLevelOptions(prev => ({
        ...prev,
        level2: level2Accounts
      }));
    }
  };

  const handleLevel2Change = async (level2Id) => {
    setSelectedLevels(prev => ({
      ...prev,
      level2: level2Id,
      level3: '',
      level4: ''
    }));
    setLevelOptions(prev => ({
      ...prev,
      level3: [],
      level4: []
    }));

    if (level2Id) {
      const level3Accounts = await fetchLevelAccounts(3, level2Id);
      setLevelOptions(prev => ({
        ...prev,
        level3: level3Accounts
      }));
    }
  };

  const handleLevel3Change = async (level3Id) => {
    setSelectedLevels(prev => ({
      ...prev,
      level3: level3Id,
      level4: ''
    }));
    setLevelOptions(prev => ({
      ...prev,
      level4: []
    }));

    if (level3Id) {
      const level4Accounts = await fetchLevelAccounts(4, level3Id);
      setLevelOptions(prev => ({
        ...prev,
        level4: level4Accounts
      }));
    }
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setFormData({
      accountName: '',
      accountType: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      openingBalance: '',
      chartAccountId: '',
      chartAccountLevel: 1
    });
    setSelectedLevels({
      level1: '',
      level2: '',
      level3: '',
      level4: ''
    });
    setLevelOptions({
      level2: [],
      level3: [],
      level4: []
    });
    setDialogOpen(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.account_name,
      accountType: account.account_type,
      contactPerson: account.contact_person,
      phone: account.phone,
      email: account.email,
      address: account.address,
      openingBalance: account.opening_balance,
      chartAccountId: account.chart_account_id || '',
      chartAccountLevel: account.chart_account_level || 1
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.accountName || !formData.accountType) {
        alert('Account Name and Account Type are required');
        return;
      }

      setLoading(true);
      
      // Determine the highest selected level
      let selectedLevel = 1;
      let selectedId = selectedLevels.level1;
      
      if (selectedLevels.level4) {
        selectedLevel = 4;
        selectedId = selectedLevels.level4;
      } else if (selectedLevels.level3) {
        selectedLevel = 3;
        selectedId = selectedLevels.level3;
      } else if (selectedLevels.level2) {
        selectedLevel = 2;
        selectedId = selectedLevels.level2;
      }
      
      const accountData = {
        account_name: formData.accountName.trim(),
        account_type: formData.accountType,
        contact_person: formData.contactPerson?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        opening_balance: formData.openingBalance ? parseFloat(formData.openingBalance) : 0,
        current_balance: formData.openingBalance ? parseFloat(formData.openingBalance) : 0,
        chart_account_id: selectedId || null,
        chart_account_level: selectedLevel
      };

      if (editingAccount) {
        accountData.id = editingAccount.id;
      }

      const response = await fetch(`${config.apiUrl}/accounts/${editingAccount ? 'update' : 'create'}`, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save account');
      }
      
      setDialogOpen(false);
      fetchAccounts();
      
      setFormData({
        accountName: '',
        accountType: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        openingBalance: '',
        chartAccountId: '',
        chartAccountLevel: 1
      });
      setEditingAccount(null);
      
    } catch (error) {
      console.error('Error saving account:', error);
      alert(error.message || 'Error saving account');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const getLevel2Accounts = (level1Id) => {
    return level2Accounts.filter(account => account.level1_id === level1Id);
  };

  const getLevel3Accounts = (level2Id) => {
    return level3Accounts.filter(account => account.level2_id === level2Id);
  };

  const formatBalance = (balance, type) => {
    if (balance === null || balance === undefined) return { amount: 0, prefix: '' };
    const amount = parseFloat(balance);
    const adjustedAmount = type === 'DEBIT' ? amount : -amount;
    
    // Return object with amount and prefix
    if (adjustedAmount < 0) {
      return { amount: Math.abs(adjustedAmount), prefix: 'DB' };
    } else {
      return { amount: adjustedAmount, prefix: 'CR' };
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAccounts([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const allAccounts = [
      ...level1Accounts.map(acc => ({ ...acc, level: 'Level 1' })),
      ...level2Accounts.map(acc => ({ ...acc, level: 'Level 2' })),
      ...level3Accounts.map(acc => ({ ...acc, level: 'Level 3' }))
    ];

    const filtered = allAccounts.filter(account => 
      (account.name && account.name.toLowerCase().includes(searchLower)) ||
      (account.account_type && account.account_type.toLowerCase().includes(searchLower))
    );

    setFilteredAccounts(filtered);
  }, [searchTerm, level1Accounts, level2Accounts, level3Accounts]);

  if (loading) {
    return (
      <Box sx={{ p: 3, ml: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, ml: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, width: '100%', maxWidth: '1200px' }}>
        <Box>
          <Typography variant="h4" component="h1">
        Chart of Accounts
      </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Current balances from January 1, 2025
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchAccountBalances(level1Accounts, level2Accounts, level3Accounts)}
          disabled={balancesLoading}
        >
          {balancesLoading ? 'Refreshing...' : 'Refresh Balances'}
        </Button>
      </Box>

      <Box sx={{ mb: 4, width: '100%', maxWidth: '1200px' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search accounts by name or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '1200px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account Name</TableCell>
              <TableCell align="right">Opening Balance</TableCell>
              <TableCell align="right">Balance Type</TableCell>
              <TableCell align="right">Account Type</TableCell>
              <TableCell align="right">Current Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchTerm ? (
              filteredAccounts.map((account) => (
                <TableRow key={`${account.level}-${account.id}`}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell align="right">{parseFloat(account.opening_balance || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">{account.balance_type || 'DEBIT'}</TableCell>
                  <TableCell align="right">{account.account_type || 'ACCOUNT'}</TableCell>
                  <TableCell align="right">
                    {balancesLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      (() => {
                        const formatted = formatBalance(accountBalances[`${account.level === 'Level 1' ? 'L1' : account.level === 'Level 2' ? 'L2' : 'L3'}-${account.id}`] || 0, account.balance_type || 'DEBIT');
                        return `${formatted.prefix} ${formatted.amount.toFixed(2)}`;
                      })()
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              level1Accounts.map((level1Account) => (
                <React.Fragment key={`level1-${level1Account.id}`}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{level1Account.name}</TableCell>
                    <TableCell align="right">{parseFloat(level1Account.opening_balance || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{level1Account.balance_type || 'DEBIT'}</TableCell>
                    <TableCell align="right">{level1Account.account_type || 'ACCOUNT'}</TableCell>
                    <TableCell align="right">
                      {balancesLoading ? (
                        <CircularProgress size={16} />
                      ) : (
                        (() => {
                          const formatted = formatBalance(accountBalances[`L1-${level1Account.id}`] || 0, level1Account.balance_type || 'DEBIT');
                          return `${formatted.prefix} ${formatted.amount.toFixed(2)}`;
                        })()
                      )}
                    </TableCell>
                  </TableRow>
                  {level1Account.level2_accounts?.map((level2Account) => (
                    <React.Fragment key={`level2-${level2Account.id}`}>
                      <TableRow>
                        <TableCell sx={{ pl: 4 }}>{level2Account.name}</TableCell>
                        <TableCell align="right">{parseFloat(level2Account.opening_balance || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">{level2Account.balance_type || 'DEBIT'}</TableCell>
                        <TableCell align="right">{level2Account.account_type || 'ACCOUNT'}</TableCell>
                        <TableCell align="right">
                          {balancesLoading ? (
                            <CircularProgress size={16} />
                          ) : (
                            (() => {
                              const formatted = formatBalance(accountBalances[`L2-${level2Account.id}`] || 0, level2Account.balance_type || 'DEBIT');
                              return `${formatted.prefix} ${formatted.amount.toFixed(2)}`;
                            })()
                          )}
                        </TableCell>
                      </TableRow>
                      {level2Account.level3_accounts?.map((level3Account) => (
                        <TableRow key={`level3-${level3Account.id}`}>
                          <TableCell sx={{ pl: 8 }}>{level3Account.name}</TableCell>
                          <TableCell align="right">{parseFloat(level3Account.opening_balance || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">{level3Account.balance_type || 'DEBIT'}</TableCell>
                          <TableCell align="right">{level3Account.account_type || 'ACCOUNT'}</TableCell>
                          <TableCell align="right">
                            {balancesLoading ? (
                              <CircularProgress size={16} />
                            ) : (
                              (() => {
                                const formatted = formatBalance(accountBalances[`L3-${level3Account.id}`] || 0, level3Account.balance_type || 'DEBIT');
                                return `${formatted.prefix} ${formatted.amount.toFixed(2)}`;
                              })()
                            )}
                </TableCell>
              </TableRow>
            ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAccount ? 'Edit Account' : 'Add Account'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              required
              fullWidth
              label="Account Name"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                accountName: e.target.value
              }))}
              error={!formData.accountName}
              helperText={!formData.accountName ? "Account Name is required" : ""}
              sx={{ mb: 2 }}
            />

            <TextField
              required
              select
              fullWidth
              label="Account Type"
              value={formData.accountType}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                accountType: e.target.value
              }))}
              error={!formData.accountType}
              helperText={!formData.accountType ? "Account Type is required" : ""}
              sx={{ mb: 2 }}
            >
              {accountTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Chart of Accounts
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Level 1 Account</InputLabel>
              <Select
                value={selectedLevels.level1}
                onChange={(e) => handleLevel1Change(e.target.value)}
                label="Level 1 Account"
              >
                <MenuItem value="">None</MenuItem>
                {chartAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLevels.level1 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Level 2 Account</InputLabel>
                <Select
                  value={selectedLevels.level2}
                  onChange={(e) => handleLevel2Change(e.target.value)}
                  label="Level 2 Account"
                >
                  <MenuItem value="">Create New Level 2 Account</MenuItem>
                  {levelOptions.level2.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedLevels.level2 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Level 3 Account</InputLabel>
                <Select
                  value={selectedLevels.level3}
                  onChange={(e) => handleLevel3Change(e.target.value)}
                  label="Level 3 Account"
                >
                  <MenuItem value="">Create New Level 3 Account</MenuItem>
                  {levelOptions.level3.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedLevels.level3 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Level 4 Account</InputLabel>
                <Select
                  value={selectedLevels.level4}
                  onChange={(e) => setSelectedLevels(prev => ({
                    ...prev,
                    level4: e.target.value
                  }))}
                  label="Level 4 Account"
                >
                  <MenuItem value="">Create New Level 4 Account</MenuItem>
                  {levelOptions.level4.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                contactPerson: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                phone: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                email: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Address"
              multiline
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                address: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Opening Balance"
              type="number"
              value={formData.openingBalance}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                openingBalance: e.target.value
              }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.accountName || !formData.accountType}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsList; 