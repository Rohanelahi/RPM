import { InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
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
  Stack,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth } from 'date-fns';
import { Print } from '@mui/icons-material';
import '../../styles/Ledger.css';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Ledger = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  });
  const { user } = useAuth();

  // Chart of accounts state
  const [level1Accounts, setLevel1Accounts] = useState([]);
  const [level2Accounts, setLevel2Accounts] = useState([]);
  const [level3Accounts, setLevel3Accounts] = useState([]);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [level3Balances, setLevel3Balances] = useState({});
  const [openingBalance, setOpeningBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showAccountSelection, setShowAccountSelection] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedAccount && dateRange.startDate && dateRange.endDate) {
      fetchTransactions(selectedAccount);
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAccounts([]);
      return;
    }
  
    const searchLower = searchTerm.toLowerCase();
    
    // Create properly structured account objects for each level
    const level1AccountsWithHierarchy = level1Accounts.map(acc => ({
      ...acc,
      level: 'Level 1',
      level1_id: acc.id,
      level2_id: null,
      level1_name: acc.name,
      level2_name: null
    }));

    const level2AccountsWithHierarchy = level2Accounts.map(acc => ({
      ...acc,
      level: 'Level 2',
      level1_id: acc.level1_id,
      level2_id: acc.id,
      level1_name: level1Accounts.find(l1 => l1.id === acc.level1_id)?.name || '',
      level2_name: acc.name
    }));

    const level3AccountsWithHierarchy = level3Accounts.map(acc => ({
      ...acc,
      level: 'Level 3',
      level1_id: acc.level1_id,
      level2_id: acc.level2_id,
      level1_name: acc.level1_name || '',
      level2_name: acc.level2_name || ''
    }));

    const allAccounts = [
      ...level1AccountsWithHierarchy,
      ...level2AccountsWithHierarchy,
      ...level3AccountsWithHierarchy
    ];

    const filtered = allAccounts.filter(account => 
      account.name.toLowerCase().includes(searchLower) ||
      (account.account_type && account.account_type.toLowerCase().includes(searchLower))
    );
  
    setFilteredAccounts(filtered);
  }, [searchTerm, level1Accounts, level2Accounts, level3Accounts]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [level1Res, level2Res, level3Res] = await Promise.all([
        fetch(`${config.apiUrl}/accounts/chart/level1`).then(res => res.json()),
        fetch(`${config.apiUrl}/accounts/chart/level2`).then(res => res.json()),
        fetch(`${config.apiUrl}/accounts/chart/level3`).then(res => res.json())
      ]);

      // Process Level 1 accounts
      const level1Data = level1Res.map(acc => ({
        ...acc,
        level2_accounts: []
      }));

      // Process Level 2 accounts
      const level2Data = level2Res.map(acc => ({
        ...acc,
        level3_accounts: []
      }));

      // Extract all Level 3 accounts
      const allLevel3Accounts = [];
      level3Res.forEach(level1 => {
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

      // Update Level 1 accounts with their Level 2 accounts
      const updatedLevel1Accounts = level1Data.map(level1 => {
        const level2Accounts = level2Data.filter(level2 => level2.level1_id === level1.id);
        const level2WithLevel3 = level2Accounts.map(level2 => {
          const level3Accounts = allLevel3Accounts.filter(level3 => 
            level3.level1_id === level1.id && level3.level2_id === level2.id
          );
          return {
            ...level2,
            level3_accounts: level3Accounts,
            has_level3: level3Accounts.length > 0
          };
        });

        return {
          ...level1,
          level2_accounts: level2WithLevel3,
          has_level2: level2WithLevel3.length > 0
        };
      });

      setLevel1Accounts(updatedLevel1Accounts);
      setLevel2Accounts(level2Data);
      setLevel3Accounts(allLevel3Accounts);
      setAccounts([...updatedLevel1Accounts, ...level2Data, ...allLevel3Accounts]);

      // Fetch balances for all accounts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endDate = tomorrow.toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const balances = {};

      // Fetch balances for Level 3 accounts
      for (const acc of allLevel3Accounts) {
        try {
          const balanceResponse = await fetch(
            `${config.apiUrl}/accounts/ledger?accountId=${acc.id}&startDate=${startDate}&endDate=${endDate}`
          );
          const data = await balanceResponse.json();
          balances[acc.id] = data.account_details?.current_balance || 0;
        } catch (error) {
          balances[acc.id] = 0;
        }
      }

      // Fetch balances for Level 2 accounts
      for (const acc of level2Data) {
        try {
          const balanceResponse = await fetch(
            `${config.apiUrl}/accounts/ledger?accountId=${acc.id}&startDate=${startDate}&endDate=${endDate}`
          );
          const data = await balanceResponse.json();
          balances[acc.id] = data.account_details?.current_balance || 0;
        } catch (error) {
          balances[acc.id] = 0;
        }
      }

      // Fetch balances for Level 1 accounts
      for (const acc of level1Data) {
        try {
          const balanceResponse = await fetch(
            `${config.apiUrl}/accounts/ledger?accountId=${acc.id}&startDate=${startDate}&endDate=${endDate}`
          );
          const data = await balanceResponse.json();
          balances[acc.id] = data.account_details?.current_balance || 0;
        } catch (error) {
          balances[acc.id] = 0;
        }
      }

      setLevel3Balances(balances);

    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const formatTransactionDetails = (transaction) => {
    if (!transaction) return '-';

    // For payment received entries
    if (transaction.entry_type === 'CREDIT' && transaction.payment_date) {
      return `Payment ${transaction.payment_mode ? `(${transaction.payment_mode})` : ''} ${transaction.receiver_name ? `to ${transaction.receiver_name}` : ''} ${transaction.payment_remarks ? `- ${transaction.payment_remarks}` : ''}`;
    }

    // For long vouchers
    if (transaction.entry_type === 'CREDIT' && transaction.reference_no?.startsWith('LV-')) {
      return `Long Voucher: ${transaction.description}`;
    }

    // For purchase entries
    if (transaction.entry_type === 'CREDIT' && transaction.reference_no?.startsWith('GRN-')) {
      return transaction.item_name ? `Purchase - ${transaction.item_name}` : 'Purchase';
    }

    // For sale entries
    if (transaction.entry_type === 'DEBIT' && transaction.reference_no?.startsWith('GRN-')) {
      return transaction.item_name ? `Sale - ${transaction.item_name}` : 'Sale';
    }

    return transaction.description || '-';
  };

  const formatDateTime = (date, entryType) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    // Format: DD/MM/YYYY HH:mm:ss
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleAccountSelect = (account) => {
    console.log('handleAccountSelect called with account:', account);
    
    // Convert level string to number if needed
    const level = typeof account.level === 'string' 
      ? parseInt(account.level.replace('Level ', ''))
      : account.level;
    
    console.log('Account from search results with level:', account.level);

    // Create a new account object with the correct level
    const selectedAccount = {
      ...account,
      level: level,
      // Ensure we have the correct hierarchy information
      level1_id: account.level1_id,
      level1_name: account.level1_name,
      level2_id: account.level2_id,
      level2_name: account.level2_name,
      level3_accounts: account.level3_accounts || []
    };

    setSelectedAccount(selectedAccount);
    setSearchTerm('');
    fetchTransactions(selectedAccount);
  };

  const fetchTransactions = async (account) => {
    try {
      console.log('Fetching transactions for account:', account);
      setLoading(true);
      setError(null);
      
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();

      console.log('Date range:', { formattedStartDate, formattedEndDate });

      const response = await fetch(
        `${config.apiUrl}/accounts/ledger?accountId=${account.id}&startDate=${formattedStartDate}&endDate=${formattedEndDate}${user?.role ? `&userRole=${user.role}` : ''}`
      );
      const data = await response.json();

      console.log('Received ledger data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      // Preserve the selected account's details
      const accountDetails = {
        ...account,
        current_balance: data.current_balance
      };

      setAccountDetails(accountDetails);
      setTransactions(data.transactions);
      setOpeningBalance(data.opening_balance);
      setCurrentBalance(data.current_balance);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (index) => {
    let balance = accountDetails?.opening_balance || 0;
    
    // For opening balance (index === -1), use the account's balance_type
    if (index === -1) {
      const absAmount = Math.abs(balance);
      return `${absAmount.toFixed(2)} ${accountDetails?.balance_type}`;
    }

    // Calculate running balance for transactions
    for (let i = 0; i <= index; i++) {
      const transaction = transactions[i];
      if (transaction.type === 'CREDIT') {
        balance += transaction.amount;
      } else if (transaction.type === 'DEBIT') {
        balance -= transaction.amount;
      }
    }

    // For transaction balances, determine suffix based on amount
    const suffix = balance >= 0 ? 'CREDIT' : 'DEBIT';
    return `${Math.abs(balance).toFixed(2)} ${suffix}`;
  };

  const calculateTotals = () => {
    let totalDebits = 0;
    let totalCredits = 0;

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      if (transaction.entry_type === 'DEBIT') {
        totalDebits += amount;
      } else if (transaction.entry_type === 'CREDIT') {
        totalCredits += amount;
      }
    });

    const balance = totalCredits - totalDebits;

    return {
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      balance: balance.toFixed(2)
    };
  };

  const totals = calculateTotals();

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
              size: A4 landscape; 
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
              margin-bottom: 0.5cm;
              border-bottom: 2px solid #000;
              padding-bottom: 0.3cm;
            }
            .company-name {
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 0.2cm;
              font-family: 'Times New Roman', Times, serif;
            }
            .document-title {
              font-size: 16pt;
              text-transform: uppercase;
              margin: 0.2cm 0;
              font-weight: bold;
            }
            .date-container {
              text-align: right;
              margin-bottom: 0.2cm;
              font-size: 9pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0.2cm 0;
              font-size: 8pt;
            }
            th, td {
              border: 1px solid #000;
              padding: 0.1cm 0.15cm;
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
            /* Column widths for landscape */
            th:nth-child(1), td:nth-child(1) { width: 10%; } /* Date & Time */
            th:nth-child(2), td:nth-child(2) { width: 8%; } /* Voucher No */
            th:nth-child(3), td:nth-child(3) { width: 20%; } /* Description */
            th:nth-child(4), td:nth-child(4) { width: 6%; } /* Qnt */
            th:nth-child(5), td:nth-child(5) { width: 6%; } /* Ded */
            th:nth-child(6), td:nth-child(6) { width: 6%; } /* Net Qnt */
            th:nth-child(7), td:nth-child(7) { width: 6%; } /* Price */
            th:nth-child(8), td:nth-child(8) { width: 12%; } /* Debit */
            th:nth-child(9), td:nth-child(9) { width: 12%; } /* Credit */
            th:nth-child(10), td:nth-child(10) { width: 14%; } /* Balance */

            .amount-cell {
              text-align: right;
              font-family: monospace;
              font-size: 8pt;
              white-space: nowrap;
            }
            .totals-section {
              margin-top: 0.5cm;
              border: 1px solid #000;
              padding: 0.3cm;
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
            .account-details {
              margin: 0.3cm 0;
              padding: 0.2cm;
              border: 1px solid #ddd;
              background: #f9f9f9;
              display: flex;
              justify-content: space-between;
            }
            .account-details p {
              margin: 0.1cm 0;
              font-size: 9pt;
            }
            .account-hierarchy {
              font-size: 9pt;
              color: #666;
              margin-bottom: 0.2cm;
            }
            .account-info {
              display: flex;
              gap: 2cm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">Account Ledger</div>
            <div style="font-size: 12pt; margin: 0.1cm 0;">${accountDetails.name}</div>
            <div style="font-size: 10pt;">Period: ${periodText}</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
          </div>

          <div class="account-details">
            <div class="account-info">
              <div>
                <div class="account-hierarchy">
                  ${accountDetails.level1_name && accountDetails.level1_name !== accountDetails.name ? 
                    `${accountDetails.level1_name} › ` : ''}
                  ${accountDetails.level2_name && accountDetails.level2_name !== accountDetails.name ? 
                    `${accountDetails.level2_name} › ` : ''}
                  ${accountDetails.level3_name && accountDetails.level3_name !== accountDetails.name ? 
                    `${accountDetails.level3_name} › ` : ''}
                  ${accountDetails.name}
                </div>
                <p><strong>Account Name:</strong> ${accountDetails.name}</p>
              </div>
              <div>
                <p><strong>Opening Balance:</strong> Rs.${Math.abs(accountDetails.opening_balance).toFixed(2)} 
                   ${accountDetails.opening_balance >= 0 ? 'CR' : 'DB'}</p>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Voucher No.</th>
                <th>Description</th>
                <th>Qnt</th>
                <th>Ded</th>
                <th>Net Qnt</th>
                <th>Price</th>
                <th class="amount-cell">Debit</th>
                <th class="amount-cell">Credit</th>
                <th class="amount-cell">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="7">Opening Balance</td>
                <td class="amount-cell" colspan="3">
                  Rs.${Math.abs(accountDetails.opening_balance).toFixed(2)}
                  ${accountDetails.opening_balance >= 0 ? ' CR' : ' DB'}
                </td>
              </tr>
              ${transactions.map((transaction, index) => `
                <tr>
                  <td>${formatDateTime(transaction.display_date)}</td>
                  <td>${transaction.entry_type === 'CREDIT' && transaction.voucher_no ? 
                    transaction.voucher_no : 
                    transaction.reference_no
                  }</td>
                  <td>${formatTransactionDetails(transaction)}</td>
                  <td class="amount-cell">${transaction.qnt || '-'}</td>
                  <td class="amount-cell">${transaction.ded || '-'}</td>
                  <td class="amount-cell">${transaction.net_qnt || '-'}</td>
                  <td class="amount-cell">${transaction.price ? formatAmount(transaction.price) : '-'}</td>
                  <td class="amount-cell">${transaction.entry_type === 'DEBIT' ? formatAmount(transaction.amount) : ''}</td>
                  <td class="amount-cell">${transaction.entry_type === 'CREDIT' ? formatAmount(transaction.amount) : ''}</td>
                  <td class="amount-cell">${formatAmount(transaction.running_balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-grid">
              <div class="total-item">
                <div>Total Debits:</div>
                <div style="color: #d32f2f;">
                  Rs.${totals.totalDebits}
                </div>
              </div>
              <div class="total-item">
                <div>Total Credits:</div>
                <div style="color: #2e7d32;">
                  Rs.${totals.totalCredits}
                </div>
              </div>
              <div class="total-item">
                <div>Current Balance:</div>
                <div>
                  Rs.${totals.balance} CR
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

  const getLevel3Balance = (level3Id) => {
    return level3Balances[level3Id] || 0;
  };

  const getLevel2NetBalance = (level2Id) => {
    const level2Account = level2Accounts.find(acc => acc.id === level2Id);
    if (!level2Account) return 0;

    // If the Level 2 account has Level 3 children, sum their balances
    if (level2Account.has_level3) {
      const level3Accounts = level3Accounts.filter(acc => acc.level2_id === level2Id);
      return level3Accounts.reduce((sum, acc) => sum + getLevel3Balance(acc.id), 0);
    }

    // If the Level 2 account has no Level 3 children, use its own balance
    return level3Balances[level2Id] || 0;
  };

  const getLevel1NetBalance = (level1Id) => {
    const level1Account = level1Accounts.find(acc => acc.id === level1Id);
    if (!level1Account) return 0;

    // If the Level 1 account has Level 2 children, sum their balances
    if (level1Account.has_level2) {
      const level2Accounts = level1Account.level2_accounts;
      return level2Accounts.reduce((sum, acc) => sum + getLevel2NetBalance(acc.id), 0);
    }

    // If the Level 1 account has no Level 2 children, use its own balance
    return level3Balances[level1Id] || 0;
  };

  const formatAmount = (amount) => {
    if (!amount) return '';
    const numAmount = parseFloat(amount);
    return isNaN(numAmount) ? '' : numAmount.toFixed(2);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="rpm-ledger-main">
        <Box className="rpm-ledger-controls no-print">
          <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
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
              sx={{ mb: 2 }}
            />

              <TableContainer component={Paper} sx={{ width: '100%', minWidth: 900, maxWidth: 'none', overflow: 'auto' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Account Name</TableCell>
                      <TableCell align="right">Opening Balance</TableCell>
                      <TableCell align="right">Balance Type</TableCell>
                      <TableCell align="right">Account Type</TableCell>
                      <TableCell align="right">Debit Balance</TableCell>
                      <TableCell align="right">Credit Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
              {searchTerm ? (
                filteredAccounts.map((account) => {
                  let net = 0;
                  if (account.level === 'Level 3') {
                    net = getLevel3Balance(account.id);
                  } else if (account.level === 'Level 2') {
                    net = getLevel2NetBalance(account.id);
                  } else if (account.level === 'Level 1') {
                    net = getLevel1NetBalance(account.id);
                  }
                  return (
                    <TableRow 
                      key={`${account.level}-${account.id}`}
                            onClick={() => handleAccountSelect(account)}
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedAccount === account.id ? '#e3f2fd' : 'inherit',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                    >
                      <TableCell>
                        {account.level === 'Level 3' ? (
                          `${account.level1_name} > ${account.level2_name} > ${account.name}`
                        ) : account.level === 'Level 2' ? (
                          `${account.level1_name} > ${account.name}`
                        ) : (
                          account.name
                        )}
                      </TableCell>
                      <TableCell align="right">{parseFloat(account.opening_balance || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">{account.balance_type || 'DEBIT'}</TableCell>
                      <TableCell align="right">{account.account_type || 'ACCOUNT'}</TableCell>
                      <TableCell align="right" style={{ color: '#d32f2f' }}>{net < 0 ? Math.abs(net).toFixed(2) : '0.00'}</TableCell>
                      <TableCell align="right" style={{ color: '#2e7d32' }}>{net > 0 ? net.toFixed(2) : '0.00'}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                      level1Accounts.map((level1Account) => (
                        <React.Fragment key={`level1-${level1Account.id}`}>
                          <TableRow 
                            onClick={() => {
                              toggleExpand(level1Account.id);
                              handleAccountSelect(level1Account);
                            }}
                            sx={{ 
                              cursor: 'pointer',
                              backgroundColor: selectedAccount === level1Account.id ? '#e3f2fd' : 'inherit',
                              '&:hover': { backgroundColor: '#f5f5f5' }
                            }}
                          >
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {level1Account.name}
                            </TableCell>
                            <TableCell align="right">{parseFloat(level1Account.opening_balance || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">{level1Account.balance_type || 'DEBIT'}</TableCell>
                            <TableCell align="right">{level1Account.account_type || 'ACCOUNT'}</TableCell>
                            <TableCell align="right">
                              {parseFloat(level1Account.current_balance || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {expandedAccounts.has(level1Account.id) && level1Account.level2_accounts?.map((level2Account) => (
                            <React.Fragment key={`level2-${level2Account.id}`}>
                              <TableRow 
                                onClick={() => {
                                  if (!level2Account.has_level3) {
                                    handleAccountSelect(level2Account);
                                  } else {
                                  toggleExpand(level2Account.id);
                                  }
                                }}
                                sx={{ 
                                  cursor: 'pointer',
                                  backgroundColor: selectedAccount === level2Account.id ? '#e3f2fd' : 'inherit',
                                  '&:hover': { backgroundColor: '#f5f5f5' }
                                }}
                              >
                                <TableCell sx={{ pl: 4 }}>{level2Account.name}</TableCell>
                                <TableCell align="right">{parseFloat(level2Account.opening_balance || 0).toFixed(2)}</TableCell>
                                <TableCell align="right">{level2Account.balance_type || 'DEBIT'}</TableCell>
                                <TableCell align="right">{level2Account.account_type || 'ACCOUNT'}</TableCell>
                                <TableCell align="right">
                                  {parseFloat(level2Account.current_balance || 0).toFixed(2)}
                                </TableCell>
                              </TableRow>
                              {expandedAccounts.has(level2Account.id) && level2Account.level3_accounts?.map((level3Account) => (
                                <TableRow 
                                  key={`level3-${level3Account.id}`}
                                  onClick={() => handleAccountSelect(level3Account)}
                                  sx={{ 
                                    cursor: 'pointer',
                                    backgroundColor: selectedAccount === level3Account.id ? '#e3f2fd' : 'inherit',
                                    '&:hover': { backgroundColor: '#f5f5f5' }
                                  }}
                                >
                                  <TableCell sx={{ pl: 8 }}>{level3Account.name}</TableCell>
                                  <TableCell align="right">{parseFloat(level3Account.opening_balance || 0).toFixed(2)}</TableCell>
                                  <TableCell align="right">{level3Account.balance_type || 'DEBIT'}</TableCell>
                                  <TableCell align="right">{level3Account.account_type || 'ACCOUNT'}</TableCell>
                                  <TableCell align="right">
                                    {parseFloat(level3Account.current_balance || 0).toFixed(2)}
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
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                      {accountDetails.level1_name && accountDetails.level1_name !== accountDetails.name && (
                        <>
                          <Typography variant="body2" sx={{ color: 'primary.main' }}>
                            {accountDetails.level1_name}
                          </Typography>
                          <Typography variant="body2">›</Typography>
                        </>
                      )}
                      {accountDetails.level2_name && accountDetails.level2_name !== accountDetails.name && (
                        <>
                          <Typography variant="body2" sx={{ color: 'primary.main' }}>
                            {accountDetails.level2_name}
                          </Typography>
                          <Typography variant="body2">›</Typography>
                        </>
                      )}
                      {accountDetails.level3_name && accountDetails.level3_name !== accountDetails.name && (
                        <>
                          <Typography variant="body2" sx={{ color: 'primary.main' }}>
                            {accountDetails.level3_name}
                          </Typography>
                          <Typography variant="body2">›</Typography>
                        </>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {accountDetails.name}
                      </Typography>
                    </Box>
                  </Grid>
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
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Voucher No.</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Qnt</TableCell>
                      <TableCell>Ded</TableCell>
                      <TableCell>Net Qnt</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Debit</TableCell>
                      <TableCell>Credit</TableCell>
                      <TableCell>Balance</TableCell>
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
                          {formatDateTime(transaction.display_date, transaction.entry_type)}
                        </TableCell>
                        <TableCell>
                          {transaction.entry_type === 'CREDIT' && transaction.voucher_no ? 
                            transaction.voucher_no : 
                            transaction.reference_no
                          }
                        </TableCell>
                        <TableCell>
                          {formatTransactionDetails(transaction)}
                        </TableCell>
                        <TableCell align="right">{transaction.qnt || '-'}</TableCell>
                        <TableCell align="right">{transaction.ded || '-'}</TableCell>
                        <TableCell align="right">{transaction.net_qnt || '-'}</TableCell>
                        <TableCell align="right">{transaction.price ? formatAmount(transaction.price) : '-'}</TableCell>
                        <TableCell align="right">
                          {transaction.entry_type === 'DEBIT' ? formatAmount(transaction.amount) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {transaction.entry_type === 'CREDIT' ? formatAmount(transaction.amount) : '-'}
                        </TableCell>
                        <TableCell align="right">{formatAmount(transaction.running_balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={7} align="right"><strong>Totals</strong></TableCell>
                      <TableCell align="right"><strong>{formatAmount(calculateTotals().totalDebits)}</strong></TableCell>
                      <TableCell align="right"><strong>{formatAmount(calculateTotals().totalCredits)}</strong></TableCell>
                      <TableCell align="right"><strong>{formatAmount(calculateTotals().balance)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Ledger; 