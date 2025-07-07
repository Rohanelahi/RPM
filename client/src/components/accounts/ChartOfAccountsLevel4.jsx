import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Print, Search as SearchIcon, Visibility, Close } from '@mui/icons-material';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

// LedgerEntries component for inline display
const LedgerEntries = ({ account, dateRange, onViewLedger }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    if (account && dateRange.startDate && dateRange.endDate) {
      fetchLedgerEntries();
    }
  }, [account?.id, dateRange.startDate, dateRange.endDate]);

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      
      // Determine the level based on account structure
      let level = 1;
      if (account.level1_name && account.level2_name && account.name) {
        level = 3; // Level 3 account
      } else if (account.level1_name && account.name) {
        level = 2; // Level 2 account
      } else {
        level = 1; // Level 1 account
      }
      
      // Fetch opening balance as of start date (exclusive)
      const openingResponse = await fetch(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=${level}&endDate=${startDate}`);
      const openingData = await openingResponse.json();
      const openingBal = openingResponse.ok ? (openingData.current_balance || 0) : 0;
      setOpeningBalance(openingBal);
      
      // Fetch transactions for the date range (inclusive of end date)
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const response = await fetch(`${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=${level}&startDate=${startDate}&endDate=${nextDayStr}`);
      const data = await response.json();
      
      if (response.ok) {
        setEntries(data.transactions || []);
      } else {
        setError(data.error || 'Failed to fetch ledger entries');
      }
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      setError('Failed to fetch ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(entry => {
      if (entry.entry_type === 'DEBIT') {
        totalDebit += parseFloat(entry.amount || 0);
      } else if (entry.entry_type === 'CREDIT') {
        totalCredit += parseFloat(entry.amount || 0);
      }
    });

    return {
      totalDebit,
      totalCredit,
      finalBalance: openingBalance + (totalCredit - totalDebit)
    };
  };

  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={10} align="center" sx={{ pl: 12 }}>
          <CircularProgress size={20} />
        </TableCell>
      </TableRow>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={10} align="center" sx={{ pl: 12, color: 'error.main' }}>
          Error: {error}
        </TableCell>
      </TableRow>
    );
  }

  if (entries.length === 0) {
    return (
      <>
        {/* Balance as of Start Date Row */}
        <TableRow sx={{ backgroundColor: '#f0f8ff', fontWeight: 'bold' }}>
          <TableCell colSpan={10} sx={{ pl: 12, fontSize: '11px', fontWeight: 'bold' }}>
            Balance as of {format(dateRange.startDate, 'MMM dd, yyyy')} - {parseFloat(openingBalance).toFixed(2)}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={10} align="center" sx={{ pl: 12, fontStyle: 'italic', color: 'text.secondary' }}>
            No transactions found for this period
          </TableCell>
        </TableRow>
      </>
    );
  }

  const totals = calculateTotals();

  return (
    <>
      {/* Balance as of Start Date Row */}
      <TableRow sx={{ backgroundColor: '#f0f8ff', fontWeight: 'bold' }}>
        <TableCell colSpan={10} sx={{ pl: 12, fontSize: '11px', fontWeight: 'bold' }}>
          Balance as of {format(dateRange.startDate, 'MMM dd, yyyy')} - {parseFloat(openingBalance).toFixed(2)}
        </TableCell>
      </TableRow>

      {entries.map((entry) => {
        // Calculate running balance starting from opening balance
        const entryIndex = entries.indexOf(entry);
        let runningBalance = openingBalance;
        
        // Add all previous entries to calculate current running balance
        for (let i = 0; i <= entryIndex; i++) {
          const prevEntry = entries[i];
          if (prevEntry.entry_type === 'CREDIT') {
            runningBalance += parseFloat(prevEntry.amount || 0);
          } else if (prevEntry.entry_type === 'DEBIT') {
            runningBalance -= parseFloat(prevEntry.amount || 0);
          }
        }

        return (
          <TableRow key={entry.id} sx={{ backgroundColor: '#fefefe' }}>
            <TableCell sx={{ pl: 12, fontSize: '11px' }}>
              {format(new Date(entry.display_date), 'MMM dd, yyyy')}
            </TableCell>
            <TableCell sx={{ fontSize: '11px' }}>
              {entry.entry_type === 'CREDIT' && entry.voucher_no ? 
                entry.voucher_no : 
                entry.reference_no
              }
            </TableCell>
            <TableCell sx={{ fontSize: '11px' }}>
              {entry.description || entry.entry_type}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {entry.qnt || '-'}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {entry.ded || '-'}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {entry.net_qnt || '-'}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {entry.price ? parseFloat(entry.price).toFixed(2) : '-'}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {entry.entry_type === 'DEBIT' ? parseFloat(entry.amount || 0).toFixed(2) : '-'}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {entry.entry_type === 'CREDIT' ? parseFloat(entry.amount || 0).toFixed(2) : '-'}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px' }}>
              {runningBalance.toFixed(2)}
            </TableCell>
          </TableRow>
        );
      })}
      
      {/* Totals Row */}
      <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
        <TableCell sx={{ pl: 12, fontSize: '12px', fontWeight: 'bold' }}>
          Total for {account.name}
        </TableCell>
        <TableCell sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          -
        </TableCell>
        <TableCell sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          -
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          -
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          -
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          -
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          -
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold', color: '#d32f2f' }}>
          {totals.totalDebit.toFixed(2)}
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold', color: '#2e7d32' }}>
          {totals.totalCredit.toFixed(2)}
        </TableCell>
        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
          {totals.finalBalance.toFixed(2)}
        </TableCell>
      </TableRow>
    </>
  );
};

const ChartOfAccountsLevel4 = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [accountTypeFilter, setAccountTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const { user } = useAuth();

  // Chart of accounts state
  const [level1Accounts, setLevel1Accounts] = useState([]);
  const [level2Accounts, setLevel2Accounts] = useState([]);
  const [level3Accounts, setLevel3Accounts] = useState([]);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [accountBalances, setAccountBalances] = useState({});
  const [levelBalances, setLevelBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(false);
  
  // Ledger dialog state
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState(null);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Ledger entries state for inline display
  const [ledgerEntries, setLedgerEntries] = useState({});
  const [ledgerLoadingStates, setLedgerLoadingStates] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAccountBalances();
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    filterAccounts();
  }, [searchTerm, accountTypeFilter, levelFilter, accounts, accountBalances]);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate && level1Accounts.length > 0) {
      fetchAllBalances();
    }
  }, [dateRange.startDate, dateRange.endDate, level1Accounts.length]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching accounts from:', config.apiUrl);
      
      // Test each API endpoint individually
      console.log('Testing Level 1 API...');
      const level1Response = await fetch(`${config.apiUrl}/accounts/chart/level1`);
      console.log('Level 1 response status:', level1Response.status);
      const level1Res = await level1Response.json();
      console.log('Level 1 raw data:', level1Res);

      console.log('Testing Level 2 API...');
      const level2Response = await fetch(`${config.apiUrl}/accounts/chart/level2`);
      console.log('Level 2 response status:', level2Response.status);
      const level2Res = await level2Response.json();
      console.log('Level 2 raw data:', level2Res);

      console.log('Testing Level 3 API...');
      const level3Response = await fetch(`${config.apiUrl}/accounts/chart/level3`);
      console.log('Level 3 response status:', level3Response.status);
      const level3Res = await level3Response.json();
      console.log('Level 3 raw data:', level3Res);

      // Extract the actual data from the response format
      const level1Data = level1Res.value || level1Res;
      const level2Data = level2Res.value || level2Res;
      const level3Data = level3Res.value || level3Res;

      // Process Level 1 accounts - handle both array and object responses
      let processedLevel1Data = [];
      if (Array.isArray(level1Data)) {
        processedLevel1Data = level1Data.map(acc => ({
          ...acc,
          level: 1,
          level2_accounts: []
        }));
      } else if (level1Data && typeof level1Data === 'object') {
        // If it's a single object, convert to array
        processedLevel1Data = [{
          ...level1Data,
          level: 1,
          level2_accounts: []
        }];
      }
      console.log('Processed Level 1 data:', processedLevel1Data);

      // Process Level 2 accounts
      let processedLevel2Data = [];
      if (Array.isArray(level2Data)) {
        processedLevel2Data = level2Data.map(acc => ({
          ...acc,
          level: 2,
          level3_accounts: []
        }));
      } else if (level2Data && typeof level2Data === 'object') {
        processedLevel2Data = [{
          ...level2Data,
          level: 2,
          level3_accounts: []
        }];
      }
      console.log('Processed Level 2 data:', processedLevel2Data);

      // Extract all Level 3 accounts
      const allLevel3Accounts = [];
      if (Array.isArray(level3Data)) {
        level3Data.forEach(level1 => {
          if (level1.level2_accounts && Array.isArray(level1.level2_accounts)) {
            level1.level2_accounts.forEach(level2 => {
              if (level2.level3_accounts && Array.isArray(level2.level3_accounts)) {
                level2.level3_accounts.forEach(level3 => {
                  allLevel3Accounts.push({
                    ...level3,
                    level: 3,
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
      }
      console.log('Processed Level 3 data:', allLevel3Accounts);

      // Update Level 1 accounts with their Level 2 accounts
      const updatedLevel1Accounts = processedLevel1Data.map(level1 => {
        const level2Accounts = processedLevel2Data.filter(level2 => level2.level1_id === level1.id);
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

      console.log('Final processed data:');
      console.log('Level 1 accounts:', updatedLevel1Accounts);
      console.log('Level 2 accounts:', processedLevel2Data);
      console.log('Level 3 accounts:', allLevel3Accounts);

      setLevel1Accounts(updatedLevel1Accounts);
      setLevel2Accounts(processedLevel2Data);
      setLevel3Accounts(allLevel3Accounts);
      setAccounts([...updatedLevel1Accounts, ...processedLevel2Data, ...allLevel3Accounts]);
      
      console.log('State updated successfully');
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountBalances = async () => {
    try {
      setLoading(true);
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      const balances = {};

      // Fetch balances for all accounts with proper level parameters
      const allAccounts = [...level1Accounts, ...level2Accounts, ...level3Accounts];
      
      for (const account of allAccounts) {
        try {
          // Determine the level based on account structure
          let level = 1;
          if (account.level1_name && account.level2_name && account.name) {
            level = 3; // Level 3 account
          } else if (account.level1_name && account.name) {
            level = 2; // Level 2 account
          } else {
            level = 1; // Level 1 account
          }
          
          const balanceResponse = await fetch(
            `${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=${level}&startDate=${startDate}&endDate=${endDate}`
          );
          if (balanceResponse.ok) {
            const data = await balanceResponse.json();
            balances[account.id] = data.current_balance || 0;
          } else {
            balances[account.id] = 0;
          }
        } catch (error) {
          console.error(`Error fetching balance for account ${account.id}:`, error);
          balances[account.id] = 0;
        }
      }

      setAccountBalances(balances);
    } catch (error) {
      console.error('Error fetching account balances:', error);
      setError('Failed to fetch account balances');
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(searchLower) ||
        (account.account_type && account.account_type.toLowerCase().includes(searchLower))
      );
    }

    // Apply account type filter
    if (accountTypeFilter !== 'ALL') {
      filtered = filtered.filter(account => account.account_type === accountTypeFilter);
    }

    // Apply level filter
    if (levelFilter !== 'ALL') {
      const level = parseInt(levelFilter);
      filtered = filtered.filter(account => account.level === level);
    }

    setFilteredAccounts(filtered);
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

  const getAccountBalance = async (accountId) => {
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const response = await fetch(`${config.apiUrl}/accounts/ledger?accountId=${accountId}&level=3&endDate=${nextDayStr}`);
      if (response.ok) {
        const data = await response.json();
        return data.current_balance || 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error fetching balance for account ${accountId}:`, error);
      return 0;
    }
  };

  const getLevel2NetBalance = async (level2Id) => {
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const response = await fetch(`${config.apiUrl}/accounts/ledger?accountId=${level2Id}&level=2&endDate=${nextDayStr}`);
      if (response.ok) {
        const data = await response.json();
        return data.current_balance || 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error fetching balance for level 2 account ${level2Id}:`, error);
      return 0;
    }
  };

  const getLevel1NetBalance = async (level1Id) => {
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const response = await fetch(`${config.apiUrl}/accounts/ledger?accountId=${level1Id}&level=1&endDate=${nextDayStr}`);
      if (response.ok) {
        const data = await response.json();
        return data.current_balance || 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error fetching balance for level 1 account ${level1Id}:`, error);
      return 0;
    }
  };

  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.MuiTableContainer-root');
    if (!printContent) {
      console.error('Table content not found');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chart of Accounts Level 4 - Ledger</title>
          <style>
            @page { size: A4; margin: 1cm; }
            body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; font-size: 12px; line-height: 1.4; color: #000 !important; }
            table { width: 100%; border-collapse: collapse !important; border-spacing: 0 !important; margin-bottom: 15px; page-break-inside: avoid; }
            th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: top; color: #000 !important; }
            th { background-color: #f0f0f0; font-weight: bold; font-size: 11px; text-align: center; padding: 4px 5px; color: #000 !important; }
            .print-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .print-header h1 { margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #000 !important; }
            .print-header h2 { margin: 8px 0; font-size: 14px; font-weight: normal; color: #000 !important; }
            .print-header p { margin: 8px 0; font-size: 12px; font-weight: bold; color: #000 !important; }
            .level1-header, .level2-header, .level3-header { color: #000 !important; font-weight: bold !important; background: #fff !important; }
            .level1-header { font-size: 14px !important; background: #e3f2fd !important; }
            .level2-header { font-size: 12px !important; background: #f3e5f5 !important; }
            .level3-header { font-size: 11px !important; background: #fff3e0 !important; }
            .ledger-entry { font-size: 10px; background: #fefefe; color: #000 !important; }
            .totals-row { font-weight: bold; background: #f5f5f5; font-size: 11px; color: #000 !important; }
            .debit-amount { color: #d32f2f !important; font-weight: bold; }
            .credit-amount { color: #2e7d32 !important; font-weight: bold; }
            .no-print { display: none !important; }
            /* Force black text everywhere */
            * { color: #000 !important; }
            div, span, p, h1, h2, h3, h4, h5, h6, td, th, tr, table { color: #000 !important; }
            /* Material-UI overrides */
            .MuiTableCell-root, .MuiTableCell-head, .MuiTableCell-body, .MuiTableRow-root, .MuiTableRow-head, .MuiTableBody-root, .MuiTableHead-root, .MuiTable-root, .MuiTableContainer-root, .MuiTypography-root, .MuiTypography-colorTextPrimary, .MuiTypography-colorTextSecondary, .MuiTableCell-colorTextPrimary, .MuiTableCell-colorTextSecondary { color: #000 !important; }
            @media print {
              body { margin: 0; font-size: 12px !important; color: #000 !important; }
              .no-print { display: none !important; }
              table { page-break-inside: avoid; }
              th, td { color: #000 !important; }
              * { color: #000 !important; }
              .level1-header, .level2-header, .level3-header { color: #000 !important; font-weight: bold !important; background: #fff !important; }
              .level1-header { font-size: 14px !important; background: #e3f2fd !important; }
              .level2-header { font-size: 12px !important; background: #f3e5f5 !important; }
              .level3-header { font-size: 11px !important; background: #fff3e0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>CHART OF ACCOUNTS LEVEL 4</h1>
            <h2>LEDGER VIEW</h2>
            <p>From: ${format(dateRange.startDate, 'MMM dd, yyyy')} To: ${format(dateRange.endDate, 'MMM dd, yyyy')}</p>
          </div>
          ${printContent.innerHTML.replace(/(<tr[^>]*class="level[123]-header"[^>]*)(>)/g, '$1 style="color:#000 !important;font-weight:bold !important;"$2')}
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

  const handleViewLedger = async (account) => {
    setSelectedAccountForLedger(account);
    setLedgerDialogOpen(true);
    setLedgerLoading(true);
    
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      
      console.log('Fetching ledger for account:', account.id, 'from', startDate, 'to', endDate);
      
      // Determine the level based on account structure
      let level = 1;
      if (account.level1_name && account.level2_name && account.name) {
        level = 3; // Level 3 account
      } else if (account.level1_name && account.name) {
        level = 2; // Level 2 account
      } else {
        level = 1; // Level 1 account
      }
      
      // Fetch opening balance as of start date (exclusive)
      const openingResponse = await fetch(
        `${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=${level}&endDate=${startDate}`
      );
      const openingData = await openingResponse.json();
      const openingBalance = openingResponse.ok ? (openingData.current_balance || 0) : 0;
      
      // Fetch transactions for the date range (inclusive of end date)
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const response = await fetch(
        `${config.apiUrl}/accounts/ledger?accountId=${account.id}&level=${level}&startDate=${startDate}&endDate=${nextDayStr}`
      );
      
      console.log('Ledger response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Ledger response data:', data);
        
        // Handle different response formats
        const transactions = data.transactions || data.value || [];
        console.log('Extracted transactions:', transactions);
        
        // Add opening balance to transactions data
        const transactionsWithOpening = {
          openingBalance,
          transactions
        };
        
        // Also log account details for debugging
        if (data.account_details) {
          console.log('Account details:', data.account_details);
        }
        
        setLedgerTransactions(transactionsWithOpening);
      } else {
        console.error('Ledger response not ok:', response.status);
        setLedgerTransactions({ openingBalance: 0, transactions: [] });
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      setLedgerTransactions({ openingBalance: 0, transactions: [] });
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleCloseLedger = () => {
    setLedgerDialogOpen(false);
    setSelectedAccountForLedger(null);
    setLedgerTransactions([]);
  };

  const formatTransactionDetails = (transaction) => {
    if (transaction.description) return transaction.description;
    if (transaction.item_name) return transaction.item_name;
    if (transaction.payment_remarks) return transaction.payment_remarks;
    return transaction.entry_type === 'CREDIT' ? 'Payment Received' : 'Payment Made';
  };

  const formatDateTime = (date, entryType) => {
    const dateObj = new Date(date);
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  };

  const getAccountTypeOptions = () => {
    const types = new Set();
    accounts.forEach(account => {
      if (account.account_type) {
        types.add(account.account_type);
      }
    });
    return Array.from(types).sort();
  };

  const getLevelOptions = () => {
    const levels = new Set();
    accounts.forEach(account => {
      if (account.level) {
        levels.add(account.level);
      }
    });
    return Array.from(levels).sort();
  };

  const fetchAllBalances = async () => {
    try {
      setBalancesLoading(true);
      const balances = {};
      
      // Fetch Level 1 balances
      for (const level1Account of level1Accounts) {
        const balance = await getLevel1NetBalance(level1Account.id);
        balances[`L1-${level1Account.id}`] = balance;
      }
      
      // Fetch Level 2 balances
      for (const level2Account of level2Accounts) {
        const balance = await getLevel2NetBalance(level2Account.id);
        balances[`L2-${level2Account.id}`] = balance;
      }
      
      // Fetch Level 3 balances
      for (const level3Account of level3Accounts) {
        const balance = await getAccountBalance(level3Account.id);
        balances[`L3-${level3Account.id}`] = balance;
      }
      
      setLevelBalances(balances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setBalancesLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="page-container" sx={{ p: 3 }}>
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center" 
          sx={{ mb: 3 }}
          className="no-print"
        >
          <Typography variant="h4">Chart of Accounts Level 4 - Trial Balance</Typography>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
          >
            Print Trial Balance
          </Button>
        </Stack>

        <Box className="print-only" sx={{ mb: 3 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Trial Balance
          </Typography>
          <Typography variant="h6" align="center" gutterBottom>
            Period: {format(dateRange.startDate, 'MMM dd, yyyy')} - {format(dateRange.endDate, 'MMM dd, yyyy')}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }} className="no-print">
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Debug: Level 1 Accounts: {level1Accounts.length} | 
                Level 2 Accounts: {level2Accounts.length} | 
                Level 3 Accounts: {level3Accounts.length} |
                API URL: {config.apiUrl}
              </Typography>
            </Box>
          )}
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
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
            
            <Grid item xs={12} md={3}>
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

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  label="Account Type"
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  {getAccountTypeOptions().map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  label="Level"
                >
                  <MenuItem value="ALL">All Levels</MenuItem>
                  {getLevelOptions().map(level => (
                    <MenuItem key={level} value={level}>Level {level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Search Accounts"
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
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : level1Accounts.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No accounts found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {error || 'Please check your connection and try again.'}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={fetchAllData}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
            
            {/* Test data to verify component is working */}
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Component Test Data:
              </Typography>
              <Typography variant="body2">
                Level 1 Count: {level1Accounts.length} | 
                Level 2 Count: {level2Accounts.length} | 
                Level 3 Count: {level3Accounts.length}
              </Typography>
              <Typography variant="body2">
                API URL: {config.apiUrl}
              </Typography>
              <Typography variant="body2">
                Error: {error || 'None'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ width: '100%', minWidth: 900, maxWidth: 'none', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Voucher No.</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Qnt</TableCell>
                  <TableCell align="right">Ded</TableCell>
                  <TableCell align="right">Net Qnt</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchTerm || accountTypeFilter !== 'ALL' || levelFilter !== 'ALL' ? (
                  // Show filtered accounts
                  filteredAccounts.map((account) => {
                    let balance = 0;
                    if (account.level === 3) {
                      balance = getAccountBalance(account.id);
                    } else if (account.level === 2) {
                      balance = getLevel2NetBalance(account.id);
                    } else if (account.level === 1) {
                      balance = getLevel1NetBalance(account.id);
                    }

                    return (
                      <TableRow key={`${account.level}-${account.id}`}>
                        <TableCell>
                          {account.level === 3 ? (
                            `${account.level1_name} > ${account.level2_name} > ${account.name}`
                          ) : account.level === 2 ? (
                            `${account.level1_name} > ${account.name}`
                          ) : (
                            account.name
                          )}
                        </TableCell>
                        <TableCell align="right">{parseFloat(account.opening_balance || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">{account.balance_type || 'DEBIT'}</TableCell>
                        <TableCell align="right">{account.account_type || 'ACCOUNT'}</TableCell>
                        <TableCell align="right">Level {account.level}</TableCell>
                        <TableCell align="right" style={{ color: '#d32f2f' }}>
                          {balance < 0 ? formatAmount(balance) : '0.00'}
                        </TableCell>
                        <TableCell align="right" style={{ color: '#2e7d32' }}>
                          {balance > 0 ? formatAmount(balance) : '0.00'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  // Show hierarchical structure with ledger entries
                  level1Accounts.map((level1Account) => {
                    const level1Balance = levelBalances[`L1-${level1Account.id}`] || 0;
                    return (
                      <React.Fragment key={`level1-${level1Account.id}`}>
                        {/* Level 1 Header with Balance */}
                        <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                          <TableCell colSpan={9} sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {level1Account.name}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {balancesLoading ? 'Loading...' : formatAmount(level1Balance)}
                          </TableCell>
                        </TableRow>
                        
                        {/* Level 2 Accounts */}
                        {level1Account.level2_accounts?.map((level2Account) => {
                          const level2Balance = levelBalances[`L2-${level2Account.id}`] || 0;
                          return (
                            <React.Fragment key={`level2-${level2Account.id}`}>
                              {/* Level 2 Header with Balance */}
                              <TableRow sx={{ backgroundColor: '#f3e5f5', fontWeight: 'bold' }}>
                                <TableCell colSpan={9} sx={{ pl: 4, fontSize: '14px', fontWeight: 'bold' }}>
                                  {level2Account.name}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '14px', fontWeight: 'bold' }}>
                                  {balancesLoading ? 'Loading...' : formatAmount(level2Balance)}
                                </TableCell>
                              </TableRow>
                              
                              {/* Level 3 Accounts or Direct Ledger */}
                              {level2Account.level3_accounts && level2Account.level3_accounts.length > 0 ? (
                                // Show Level 3 accounts
                                level2Account.level3_accounts.map((level3Account) => {
                                  const level3Balance = levelBalances[`L3-${level3Account.id}`] || 0;
                                  return (
                                    <React.Fragment key={`level3-${level3Account.id}`}>
                                      {/* Level 3 Header with Balance */}
                                      <TableRow sx={{ backgroundColor: '#fff3e0', fontWeight: 'bold' }}>
                                        <TableCell colSpan={9} sx={{ pl: 8, fontSize: '12px', fontWeight: 'bold' }}>
                                          {level3Account.name}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
                                          {balancesLoading ? 'Loading...' : formatAmount(level3Balance)}
                                        </TableCell>
                                      </TableRow>
                                      
                                      {/* Level 3 Ledger Entries */}
                                      <LedgerEntries account={level3Account} dateRange={dateRange} onViewLedger={handleViewLedger} />
                                    </React.Fragment>
                                  );
                                })
                              ) : (
                                // Show Level 2 ledger entries directly if no Level 3 accounts
                                <LedgerEntries account={level2Account} dateRange={dateRange} onViewLedger={handleViewLedger} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {/* Ledger Dialog */}
        <Dialog 
          open={ledgerDialogOpen} 
          onClose={handleCloseLedger}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Ledger for {selectedAccountForLedger?.name}
              </Typography>
              <IconButton onClick={handleCloseLedger}>
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {ledgerLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Debug: {ledgerTransactions.transactions?.length || 0} transactions found for account {selectedAccountForLedger?.name} (ID: {selectedAccountForLedger?.id})
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
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
                      {(!ledgerTransactions.transactions || ledgerTransactions.transactions.length === 0) ? (
                        <>
                          {/* Balance as of Start Date Row */}
                          <TableRow sx={{ backgroundColor: '#f0f8ff', fontWeight: 'bold' }}>
                            <TableCell colSpan={10} sx={{ pl: 12, fontSize: '11px', fontWeight: 'bold' }}>
                              Balance as of {format(dateRange.startDate, 'MMM dd, yyyy')} - {parseFloat(ledgerTransactions.openingBalance || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={10} align="center">
                              No transactions found for this period
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <>
                          {/* Balance as of Start Date Row */}
                          <TableRow sx={{ backgroundColor: '#f0f8ff', fontWeight: 'bold' }}>
                            <TableCell colSpan={10} sx={{ pl: 12, fontSize: '11px', fontWeight: 'bold' }}>
                              Balance as of {format(dateRange.startDate, 'MMM dd, yyyy')} - {parseFloat(ledgerTransactions.openingBalance || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>

                          {ledgerTransactions.transactions.map((transaction, index) => {
                            // Calculate running balance starting from opening balance
                            let runningBalance = parseFloat(ledgerTransactions.openingBalance || 0);
                            
                            // Add all previous entries to calculate current running balance
                            for (let i = 0; i <= index; i++) {
                              const prevTransaction = ledgerTransactions.transactions[i];
                              if (prevTransaction.entry_type === 'CREDIT') {
                                runningBalance += parseFloat(prevTransaction.amount || 0);
                              } else if (prevTransaction.entry_type === 'DEBIT') {
                                runningBalance -= parseFloat(prevTransaction.amount || 0);
                              }
                            }

                            return (
                              <TableRow key={transaction.id}>
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
                                <TableCell align="right">{runningBalance.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLedger}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ChartOfAccountsLevel4; 