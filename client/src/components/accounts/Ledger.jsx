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

const Ledger = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
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
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [level3Balances, setLevel3Balances] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedAccount && dateRange.startDate && dateRange.endDate) {
      fetchTransactions();
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate]);

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
            level3_accounts: level3Accounts
          };
        });

        return {
          ...level1,
          level2_accounts: level2WithLevel3
        };
      });

      setLevel1Accounts(updatedLevel1Accounts);
      setLevel2Accounts(level2Data);
      setLevel3Accounts(allLevel3Accounts);
      setAccounts([...updatedLevel1Accounts, ...level2Data, ...allLevel3Accounts]);

      // Fetch balances for all level 3 accounts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endDate = tomorrow.toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const balances = {};
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
      setLevel3Balances(balances);

    } catch (error) {
      console.error('Error fetching accounts:', error);
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

  const formatTransactionDetails = (transaction) => {
    // Helper functions
    const formatQuantity = (qty) => Math.round(parseFloat(qty)).toString();
    const formatPrice = (price) => parseFloat(price).toFixed(2);

    // Special handling for sale returns
    if (transaction.entry_type === 'SALE_RETURN') {
      const quantity = transaction.return_quantity || transaction.quantity || 0;
      const price = transaction.price_per_unit || transaction.original_price || transaction.gep_price || 0;
      const unit = transaction.unit || 'unit';
      const itemType = transaction.paper_type || transaction.item_type || '';
      const formattedQuantity = formatQuantity(quantity);
      const formattedPrice = formatPrice(price);
      return `Return against GRN: ${transaction.original_grn_number} - ${formattedQuantity} ${unit} of ${itemType} @ Rs.${formattedPrice}/${unit}`;
    }

    // Special handling for purchase returns
    if (transaction.entry_type === 'PURCHASE_RETURN') {
      const quantity = transaction.return_quantity || transaction.quantity || 0;
      const price = transaction.price_per_unit || transaction.original_price || transaction.gep_price || 0;
      const unit = transaction.unit || 'unit';
      const itemType = transaction.paper_type || transaction.item_type || '';
      const formattedQuantity = formatQuantity(quantity);
      const formattedPrice = formatPrice(price);
      return `Return against GRN: ${transaction.original_grn_number} - ${formattedQuantity} ${unit} of ${itemType} @ Rs.${formattedPrice}/${unit}`;
    }

    // If we have item details, use them
    if (transaction.item_type) {
      const quantity = transaction.final_quantity || transaction.quantity || 0;
      const unit = transaction.unit || 'unit';
      const price = transaction.price_per_unit || 0;
      return `${formatQuantity(quantity)} ${unit} of ${transaction.item_type} @ Rs.${formatPrice(price)}/${unit}`;
    }

    // For store entries
    if (transaction.store_item_name || transaction.store_item_type) {
      const quantity = transaction.store_quantity || transaction.quantity || 0;
      const unit = transaction.store_unit || transaction.unit || 'unit';
      const price = transaction.price_per_unit || 0;
      return `${formatQuantity(quantity)} ${unit} of ${transaction.store_item_name || transaction.store_item_type} @ Rs.${formatPrice(price)}/${unit}`;
    }

    // For payment transactions, show description as is (bank name is already included)
    if (transaction.description?.includes('Payment received from')) {
      return transaction.description.replace('Payment received from', 'Receipt from');
    }
    if (transaction.description?.includes('Payment issued to')) {
      return transaction.description.replace('Payment issued to', 'Payment to');
    }
    
    // Special handling for store returns
    if (transaction.description === 'STORE_RETURN') {
      return `Return: ${formatQuantity(transaction.quantity)} ${transaction.unit} of ${transaction.item_name} @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.unit}`;
    }
    
    // Special handling for sales
    if (transaction.entry_type === 'SALE' || transaction.description?.includes('Sale')) {
      return `Sale: ${formatQuantity(transaction.quantity)} ${transaction.unit} of ${transaction.paper_type || transaction.item_type} @ Rs.${formatPrice(transaction.price_per_unit)}/${transaction.unit}`;
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

      console.log('Fetching transactions with params:', {
        accountId: selectedAccount,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });

      const response = await fetch(
        `${config.apiUrl}/accounts/ledger?` + 
        new URLSearchParams({
          accountId: selectedAccount,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          userRole: user.role
        })
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      
      if (!data.account_details) {
        throw new Error('Invalid response format: missing account details');
      }

      console.log('Received transactions:', data.transactions);
      
      setAccountDetails({
        ...data.account_details,
        opening_balance: parseFloat(data.account_details.opening_balance) || 0,
        current_balance: parseFloat(data.account_details.current_balance) || 0
      });
      
      // Process transactions
      const processedTransactions = data.transactions
        .map(t => {
          console.log('Processing transaction:', t);
          const processed = {
            ...t,
            date: t.date,
            amount: parseFloat(t.amount) || 0,
            type: t.entry_type === 'PURCHASE_RETURN' ? 'DEBIT' : t.entry_type || t.type,
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
          console.log('Processed transaction:', processed);
          return processed;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      console.log('Final processed transactions:', processedTransactions);
      setTransactions(processedTransactions);

    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message || 'Failed to fetch transactions');
      setTransactions([]);
      setAccountDetails(null);
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
    // Start with opening balance
    let finalBalance = accountDetails?.opening_balance || 0;
    
    // If opening balance type is DEBIT, make it negative
    if (accountDetails?.balance_type === 'DEBIT') {
      finalBalance = -Math.abs(finalBalance);
    } else {
      finalBalance = Math.abs(finalBalance);
    }

    return transactions.reduce((acc, t) => {
      if (t.type === 'CREDIT') {
        acc.totalCredits += t.amount;
        finalBalance += t.amount;
      } else if (t.type === 'DEBIT') {
        acc.totalDebits += t.amount;
        finalBalance -= t.amount;
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

  const getLevel3Balance = (level3Id) => {
    return level3Balances[level3Id] || 0;
  };

  const getLevel2NetBalance = (level2Id) => {
    let totalDebit = 0;
    let totalCredit = 0;
    level3Accounts.filter(acc => acc.level2_id === level2Id).forEach(acc => {
      const bal = getLevel3Balance(acc.id);
      if (bal < 0) totalDebit += Math.abs(bal);
      if (bal > 0) totalCredit += bal;
    });
    return totalCredit - totalDebit;
  };

  const getLevel1NetBalance = (level1Id) => {
    let sum = 0;
    level2Accounts.filter(acc => acc.level1_id === level1Id).forEach(level2 => {
      sum += getLevel2NetBalance(level2.id);
    });
    return sum;
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
                      onClick={() => setSelectedAccount(account.id)}
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
                              setSelectedAccount(level1Account.id);
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
                          {expandedAccounts[level1Account.id] && level1Account.level2_accounts?.map((level2Account) => (
                            <React.Fragment key={`level2-${level2Account.id}`}>
                              <TableRow 
                                onClick={() => {
                                  toggleExpand(level2Account.id);
                                  setSelectedAccount(level2Account.id);
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
                              {expandedAccounts[level2Account.id] && level2Account.level3_accounts?.map((level3Account) => (
                                <TableRow 
                                  key={`level3-${level3Account.id}`}
                                  onClick={() => setSelectedAccount(level3Account.id)}
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
                        <TableCell>{transaction.reference || '-'}</TableCell>
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