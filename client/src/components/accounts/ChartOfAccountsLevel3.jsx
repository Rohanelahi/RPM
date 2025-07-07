import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CircularProgress,
  Stack
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Print as PrintIcon } from '@mui/icons-material';
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
  const printRef = useRef();
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

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiUrl}/accounts/chart/level3`);
      
      // Add namespaced IDs to Level 1 accounts in the hierarchical structure using unified_id
      const level1WithNamespacedIds = response.data.map(level1 => ({
        ...level1,
        namespacedId: `L1-${level1.unified_id || level1.id}`,
        level2_accounts: level1.level2_accounts?.map(level2 => ({
          ...level2,
          namespacedId: `L2-${level2.unified_id || level2.id}`,
          level3_accounts: level2.level3_accounts?.map(level3 => ({
            ...level3,
            namespacedId: `L3-${level3.unified_id || level3.id}`
          }))
        }))
      }));
      
      setLevel1Accounts(level1WithNamespacedIds);
      const openingBalancesTemp = {};
      const movementTemp = {};
      const closingBalancesTemp = {};
      const allLevel3 = [];
      for (const level1 of level1WithNamespacedIds) {
        for (const level2 of level1.level2_accounts || []) {
          for (const level3 of level2.level3_accounts || []) {
            allLevel3.push(level3.id);
          }
        }
      }
      await Promise.all(allLevel3.map(async (accountId) => {
        // Opening balance as of startDate (exclusive)
        const openingRes = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${accountId}&level=3&endDate=${startDate}`);
        openingBalancesTemp[`L3-${accountId}`] = openingRes.data.current_balance || 0;
        // Net movement between startDate and endDate (inclusive)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        const movementRes = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${accountId}&level=3&startDate=${startDate}&endDate=${nextDayStr}`);
        let debit = 0, credit = 0;
        (movementRes.data.transactions || []).forEach(txn => {
          if (txn.entry_type === 'DEBIT') debit += parseFloat(txn.amount);
          if (txn.entry_type === 'CREDIT') credit += parseFloat(txn.amount);
        });
        movementTemp[`L3-${accountId}`] = { debit, credit };
        // Closing balance as of endDate (inclusive)
        const closingRes = await axios.get(`${config.apiUrl}/accounts/ledger?accountId=${accountId}&level=3&endDate=${nextDayStr}`);
        closingBalancesTemp[`L3-${accountId}`] = closingRes.data.current_balance || 0;
      }));
      setOpeningBalances(openingBalancesTemp);
      setMovement(movementTemp);
      setClosingBalances(closingBalancesTemp);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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

  const calculateNetBalance = (account, balance) => {
    const openingBalance = parseFloat(account.opening_balance) || 0;
    const currentBalance = parseFloat(balance.credit) - parseFloat(balance.debit);
    
    // If opening balance is debit, add current balance
    // If opening balance is credit, subtract current balance
    let netBalance;
    if (account.balance_type === 'DEBIT') {
      netBalance = openingBalance + currentBalance;
    } else {
      netBalance = openingBalance - currentBalance;
    }
    
    return netBalance;
  };

  const calculateLevel1Totals = (level1Account) => {
    let totalOpening = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalClosing = 0;
    level1Account.level2_accounts?.forEach((level2Account) => {
      level2Account.level3_accounts?.forEach((level3Account) => {
        const id = `L3-${level3Account.id}`;
        totalOpening += parseFloat(openingBalances[id]) || 0;
        totalDebit += parseFloat(movement[id]?.debit) || 0;
        totalCredit += parseFloat(movement[id]?.credit) || 0;
        totalClosing += parseFloat(closingBalances[id]) || 0;
      });
    });
    return { totalOpening, totalDebit, totalCredit, totalClosing };
  };

  const calculateGrandTotals = () => {
    let grandOpening = 0;
    let grandDebit = 0;
    let grandCredit = 0;
    let grandClosing = 0;
    level1Accounts.forEach((level1Account) => {
      const { totalOpening, totalDebit, totalCredit, totalClosing } = calculateLevel1Totals(level1Account);
      grandOpening += totalOpening;
      grandDebit += totalDebit;
      grandCredit += totalCredit;
      grandClosing += totalClosing;
    });
    return { grandOpening, grandDebit, grandCredit, grandClosing };
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
            .level1-header { font-size: 16px; font-weight: 900; font-family: Arial, sans-serif; letter-spacing: 0.5px; background: #f5f5f5; }
            .level2-header { font-size: 14px; font-weight: 700; font-family: Arial, sans-serif; letter-spacing: 0.2px; background: #f0f0f0; }
            .level2-totals { font-weight: bold; background: #e0e0e0; }
            .level1-totals { font-weight: bold; background: #d0d0d0; }
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
              ${level1Accounts.map(level1Account => {
                let level1TotalOpening = 0, level1TotalDebit = 0, level1TotalCredit = 0, level1TotalClosing = 0;
                const level1Rows = level1Account.level2_accounts?.map(level2Account => {
                  let level2TotalOpening = 0, level2TotalDebit = 0, level2TotalCredit = 0, level2TotalClosing = 0;
                  const level2Rows = level2Account.level3_accounts?.map(level3Account => {
                    const opening = parseFloat(openingBalances[`L3-${level3Account.id}`] || 0).toFixed(2);
                    const debit = parseFloat(movement[`L3-${level3Account.id}`]?.debit || 0).toFixed(2);
                    const credit = parseFloat(movement[`L3-${level3Account.id}`]?.credit || 0).toFixed(2);
                    const closing = parseFloat(closingBalances[`L3-${level3Account.id}`] || 0).toFixed(2);
                    level2TotalOpening += parseFloat(opening);
                    level2TotalDebit += parseFloat(debit);
                    level2TotalCredit += parseFloat(credit);
                    level2TotalClosing += parseFloat(closing);
                    return `<tr>
                      <td>${level3Account.name}</td>
                      <td style="text-align:right">${opening}</td>
                      <td>${level3Account.account_type}</td>
                      <td style="text-align:right">${debit}</td>
                      <td style="text-align:right">${credit}</td>
                      <td style="text-align:right">${closing}</td>
                    </tr>`;
                  }).join('') || '';
                  level1TotalOpening += level2TotalOpening;
                  level1TotalDebit += level2TotalDebit;
                  level1TotalCredit += level2TotalCredit;
                  level1TotalClosing += level2TotalClosing;
                  return `
                    <tr class="level2-header"><td colspan="6">${level2Account.name}</td></tr>
                    ${level2Rows}
                    <tr class="level2-totals">
                      <td>Total</td>
                      <td style="text-align:right">${level2TotalOpening.toFixed(2)}</td>
                      <td></td>
                      <td style="text-align:right">${level2TotalDebit.toFixed(2)}</td>
                      <td style="text-align:right">${level2TotalCredit.toFixed(2)}</td>
                      <td style="text-align:right">${level2TotalClosing.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('') || '';
                return `
                  <tr class="level1-header"><td colspan="6">${level1Account.name}</td></tr>
                  ${level1Rows}
                  <tr class="level1-totals">
                    <td>Total</td>
                    <td style="text-align:right">${level1TotalOpening.toFixed(2)}</td>
                    <td></td>
                    <td style="text-align:right">${level1TotalDebit.toFixed(2)}</td>
                    <td style="text-align:right">${level1TotalCredit.toFixed(2)}</td>
                    <td style="text-align:right">${level1TotalClosing.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
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

  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  // Add on-screen heading styles
  const headingStyles = `
    .level1-header, .level1-header td, tr.level1-header {
      font-size: 16px !important;
      font-weight: 900 !important;
      font-family: Arial, sans-serif !important;
      letter-spacing: 0.5px !important;
      padding: 8px 16px !important;
    }
    .level2-header, .level2-header td, tr.level2-header {
      font-size: 14px !important;
      font-weight: 700 !important;
      font-family: Arial, sans-serif !important;
      letter-spacing: 0.2px !important;
      padding: 8px 16px !important;
    }
  `;

  return (
    <>
      <style>{headingStyles}</style>
    <Box sx={{ p: 3, ml: '300px' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1">
        Chart of Accounts Level 3
      </Typography>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}
          >
            Print Trial Balance
          </Button>
        </Stack>

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
        </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
          <div ref={printRef}>
            {/* Print Header - Hidden on screen, shown in print window */}
            <Box sx={{ display: 'none' }}>
              <Typography variant="h4" align="center" sx={{ fontWeight: 'bold', mb: 1 }}>
                TRIAL BALANCE
              </Typography>
              <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                (OPENING, MOVEMENT & CLOSING)
              </Typography>
              <Typography variant="body1" align="center" sx={{ mb: 3 }}>
                As of {new Date().toLocaleDateString()}
              </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ '@media print': { boxShadow: 'none' } }}>
              <Table sx={{ '@media print': { fontSize: '12px' } }}>
            <TableHead>
                  <TableRow sx={{ '@media print': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Account Name</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Opening Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Account Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Debit Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Credit Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Balance</TableCell>
                    <TableCell align="center" className="no-print">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                  {level1Accounts.map((level1Account) => {
                    const { totalOpening, totalDebit, totalCredit, totalClosing } = calculateLevel1Totals(level1Account);
                    
                    return (
                <React.Fragment key={level1Account.namespacedId}>
                        <TableRow className="level1-header">
                    <TableCell colSpan={6}>
                        {level1Account.name}
                    </TableCell>
                  </TableRow>
                  {level1Account.level2_accounts?.map((level2Account) => {
                    // Calculate totals for this level 2 account
                          let level2TotalOpening = 0;
                          let level2TotalDebit = 0;
                          let level2TotalCredit = 0;
                          let level2TotalClosing = 0;
                    (level2Account.level3_accounts || []).forEach((level3Account) => {
                      const id = `L3-${level3Account.id}`;
                      level2TotalOpening += parseFloat(openingBalances[id]) || 0;
                      level2TotalDebit += parseFloat(movement[id]?.debit) || 0;
                      level2TotalCredit += parseFloat(movement[id]?.credit) || 0;
                      level2TotalClosing += parseFloat(closingBalances[id]) || 0;
                    });
                    return (
                      <React.Fragment key={level2Account.namespacedId}>
                              <TableRow className="level2-header">
                          <TableCell colSpan={6} sx={{ pl: 4 }}>
                              {level2Account.name}
                          </TableCell>
                        </TableRow>
                        {(level2Account.level3_accounts || []).map((level3Account) => {
                          const id = `L3-${level3Account.id}`;
                          return (
                                  <TableRow key={level3Account.namespacedId} className="level3-account">
                                    <TableCell className="account-name" sx={{ pl: 8 }}>{level3Account.name}</TableCell>
                                    <TableCell align="right" className="opening-balance">
                                      {formatAmount(openingBalances[id])} {level3Account.balance_type}
                              </TableCell>
                              <TableCell align="right">{level3Account.account_type}</TableCell>
                                    <TableCell align="right" className="amount-column debit-amount">
                                {formatAmount(movement[id]?.debit)}
                              </TableCell>
                                    <TableCell align="right" className="amount-column credit-amount">
                                {formatAmount(movement[id]?.credit)}
                              </TableCell>
                                    <TableCell align="right" className="balance-column">
                                      {formatAmount(closingBalances[id])}
                                    </TableCell>
                                    <TableCell align="center" className="no-print">
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
                              <TableRow className="level2-total">
                                <TableCell sx={{ pl: 8, fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Total</TableCell>
                          <TableCell />
                          <TableCell />
                                <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>{level2TotalDebit.toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>{level2TotalCredit.toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>
                                  {level2TotalClosing > 0
                                    ? `${level2TotalClosing.toFixed(2)} CR`
                                    : level2TotalClosing < 0
                                      ? `${Math.abs(level2TotalClosing).toFixed(2)} DB`
                                      : '0.00'}
                                </TableCell>
                                <TableCell className="no-print" />
                        </TableRow>
                        {/* Net Balance row for Level 2 */}
                              <TableRow className="level2-total">
                                <TableCell sx={{ pl: 8, fontWeight: 'bold', '@media print': { fontSize: '12px' } }}>Balance</TableCell>
                          <TableCell />
                          <TableCell />
                                <TableCell colSpan={2} align="right" style={{ fontWeight: 'bold' }} sx={{ '@media print': { fontSize: '12px' } }}>
                                  {level2TotalClosing > 0
                                    ? `${level2TotalClosing.toFixed(2)} CR`
                                    : level2TotalClosing < 0
                                      ? `${Math.abs(level2TotalClosing).toFixed(2)} DB`
                                : '0.00'}
                          </TableCell>
                                <TableCell className="no-print" />
                        </TableRow>
                              <TableRow className="no-print">
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
                        {/* Level 1 Total Row */}
                        <TableRow className="level1-total">
                          <TableCell sx={{ fontWeight: 'bold', '@media print': { fontSize: '13px' } }}>
                            {level1Account.name} - Total
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold', '@media print': { fontSize: '13px' } }}>{totalDebit.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold', '@media print': { fontSize: '13px' } }}>{totalCredit.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '13px' } }}>
                            {totalClosing > 0
                              ? `${totalClosing.toFixed(2)} CR`
                              : totalClosing < 0
                                ? `${Math.abs(totalClosing).toFixed(2)} DB`
                                : '0.00'}
                          </TableCell>
                          <TableCell className="no-print" />
                        </TableRow>
                        {/* Level 1 Net Balance Row */}
                        <TableRow className="level1-total">
                          <TableCell sx={{ fontWeight: 'bold', '@media print': { fontSize: '13px' } }}>
                            {level1Account.name} - Balance
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell colSpan={2} align="right" style={{ fontWeight: 'bold' }} sx={{ '@media print': { fontSize: '13px' } }}>
                            {totalClosing > 0
                              ? `${totalClosing.toFixed(2)} CR`
                              : totalClosing < 0
                                ? `${Math.abs(totalClosing).toFixed(2)} DB`
                                : '0.00'}
                          </TableCell>
                          <TableCell className="no-print" />
                        </TableRow>
                </React.Fragment>
                    );
                  })}
                  
                  {/* Grand Totals Row */}
                  {(() => {
                    const { grandOpening, grandDebit, grandCredit, grandClosing } = calculateGrandTotals();
                    return (
                      <TableRow className="grand-total">
                        <TableCell colSpan={3} sx={{ fontWeight: 'bold', '@media print': { fontSize: '14px' } }}>
                          GRAND TOTAL
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '14px' } }}>{grandDebit.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '14px' } }}>{grandCredit.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '14px' } }}>
                          {grandClosing > 0
                            ? `${grandClosing.toFixed(2)} CR`
                            : grandClosing < 0
                              ? `${Math.abs(grandClosing).toFixed(2)} DB`
                              : '0.00'}
                        </TableCell>
                        <TableCell className="no-print" />
                      </TableRow>
                    );
                  })()}
                  
                  {/* Grand Net Balance Row */}
                  {(() => {
                    const { grandClosing } = calculateGrandTotals();
                    return (
                      <TableRow className="net-balance">
                        <TableCell colSpan={3} sx={{ fontWeight: 'bold', '@media print': { fontSize: '14px' } }}>
                          NET BALANCE
                        </TableCell>
                        <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold', '@media print': { fontSize: '14px' } }}>
                          {grandClosing > 0
                            ? `${grandClosing.toFixed(2)} CR`
                            : grandClosing < 0
                              ? `${Math.abs(grandClosing).toFixed(2)} DB`
                              : '0.00'}
                        </TableCell>
                        <TableCell className="no-print" />
                      </TableRow>
                    );
                  })()}
            </TableBody>
          </Table>
        </TableContainer>
          </div>
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
    </>
  );
};

export default ChartOfAccountsLevel3; 