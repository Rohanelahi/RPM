import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Fab,
  Modal,
  MenuItem,
  Chip,
  Select,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  AccountBalance as AccountBalanceIcon,
  Print,
} from '@mui/icons-material';
import axios from 'axios';
import config from '../../config';
import '../../styles/BankManager.css';
import { format } from 'date-fns';

const BankManager = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    branch_name: '',
    ifsc_code: '',
    account_type: 'CURRENT',
    opening_balance: '0',
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    account_id: '',
    amount: '',
    remarks: '',
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    bankAccount: ''
  });
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch accounts and transactions
  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
    fetchBanks();

    // Set up event listeners for updates
    const handlePaymentReceived = () => {
      fetchAccounts();
      fetchTransactions();
    };
    const handlePaymentIssued = () => {
      fetchAccounts();
      fetchTransactions();
    };
    const handleBankBalanceUpdated = () => {
      fetchAccounts();
      fetchTransactions();
    };
    
    window.addEventListener('paymentReceived', handlePaymentReceived);
    window.addEventListener('paymentIssued', handlePaymentIssued);
    window.addEventListener('bankBalanceUpdated', handleBankBalanceUpdated);
    
    return () => {
      window.removeEventListener('paymentReceived', handlePaymentReceived);
      window.removeEventListener('paymentIssued', handlePaymentIssued);
      window.removeEventListener('bankBalanceUpdated', handleBankBalanceUpdated);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      fetchTransactions();
    }
  }, [activeTab, filters]);

  const showAlert = (message, type = 'error') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'info' }), 3000);
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/accounts/bank-accounts`);
      
      // Normalize the account data to ensure consistent property names
      const normalizedAccounts = response.data.map(account => ({
        ...account,
        // Ensure current_balance is a number and handle different property names
        current_balance: Number(account.current_balance || account.balance || 0)
      }));
      
      setAccounts(normalizedAccounts);
    } catch (error) {
      showAlert('Error fetching bank accounts');
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      let url = `${config.apiUrl}/accounts/bank-transactions`;
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.bankAccount) params.append('accountId', filters.bankAccount);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showAlert('Error fetching transactions');
    }
  };

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/accounts/bank-accounts`);
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      const data = await response.json();
      setBanks(data);
    } catch (error) {
      console.error('Error:', error);
      showAlert('Failed to fetch bank accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editMode) {
        await axios.put(`${config.apiUrl}/accounts/bank-accounts/${selectedAccount.id}`, {
          ...formData,
          account_type: 'CURRENT'
        });
        showAlert('Bank account updated successfully', 'success');
      } else {
        await axios.post(`${config.apiUrl}/accounts/bank-accounts`, {
          ...formData,
          account_type: 'CURRENT'
        });
        showAlert('Bank account added successfully', 'success');
      }
      resetForm();
      fetchAccounts();
      handleCloseModal();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Error saving bank account');
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setFormData(account);
    setSelectedAccount(account);
    setEditMode(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${config.apiUrl}/accounts/bank-accounts/${id}`);
      showAlert('Bank account deleted successfully', 'success');
      fetchAccounts();
    } catch (error) {
      showAlert('Error deleting bank account');
      console.error('Error deleting account:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      bank_name: '',
      account_name: '',
      account_number: '',
      branch_name: '',
      ifsc_code: '',
      account_type: 'CURRENT',
      opening_balance: '0',
    });
    setEditMode(false);
    setSelectedAccount(null);
  };

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditMode(false);
    setSelectedAccount(null);
    resetForm();
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      if (!withdrawData.account_id || !withdrawData.amount) {
        showAlert('Please fill in all required fields');
        return;
      }

      const amount = Number(withdrawData.amount);
      if (amount <= 0) {
        showAlert('Amount must be greater than 0');
        return;
      }

      // Process withdrawal and update cash in a single transaction
      await axios.post(`${config.apiUrl}/accounts/bank-transactions`, {
        account_id: withdrawData.account_id,
        type: 'DEBIT',
        amount: amount,
        reference: withdrawData.remarks || 'Cash Withdrawal',
        updateCash: true  // This flag tells the server to also update cash
      });

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('cashBalanceUpdated'));

      showAlert('Cash withdrawn successfully', 'success');
      await fetchAccounts();
      await fetchTransactions();
      setWithdrawModal(false);
      setWithdrawData({ account_id: '', amount: '', remarks: '' });
    } catch (error) {
      showAlert(error.response?.data?.error || 'Error processing withdrawal');
      console.error('Error:', error);
    }
  };

  const handlePrintTransactions = () => {
    const selectedAccount = accounts.find(acc => acc.id === filters.bankAccount);
    const dateRange = filters.startDate && filters.endDate 
      ? `${format(new Date(filters.startDate), 'dd/MM/yyyy')} - ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`
      : 'All Time';

    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #1976d2;">ROSE PAPER MILL</h1>
          <h2 style="margin: 10px 0;">Bank Transaction History</h2>
          <p style="margin: 5px 0;">Period: ${dateRange}</p>
          ${selectedAccount ? `<p style="margin: 5px 0;">Account: ${selectedAccount.bank_name} - ${selectedAccount.account_number}</p>` : ''}
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Date</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Bank Account</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Reference</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Amount</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Balance</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(transaction => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${format(new Date(transaction.transaction_date), 'dd/MM/yyyy HH:mm')}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${transaction.bank_name} - ${transaction.account_number}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${transaction.reference}
                  ${transaction.receiver_name ? `
                    <div style="font-size: 12px; color: #666;">
                      ${transaction.payment_type === 'RECEIVED' ? 'From: ' : 'To: '}
                      ${transaction.receiver_name}
                    </div>
                  ` : ''}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${transaction.type === 'CREDIT' ? 'green' : 'red'}; font-weight: bold;">
                  ${transaction.type === 'CREDIT' ? '+' : '-'}${Number(transaction.amount).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${Number(transaction.running_balance) >= 0 ? 'green' : 'red'}">
                  ${Number(transaction.running_balance).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                  <span style="
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    background-color: ${transaction.type === 'CREDIT' ? '#e8f5e9' : '#ffebee'};
                    color: ${transaction.type === 'CREDIT' ? '#2e7d32' : '#d32f2f'};
                  ">
                    ${transaction.type}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Bank Transactions</title></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const renderAccountsOverview = () => (
    <TableContainer component={Paper} className="bank-accounts-table">
      <Table>
        <TableHead>
          <TableRow className="table-header">
            <TableCell>Bank Name</TableCell>
            <TableCell>Account Number</TableCell>
            <TableCell>Branch</TableCell>
            <TableCell align="right">Current Balance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.bank_name}</TableCell>
              <TableCell>{account.account_number}</TableCell>
              <TableCell>{account.branch_name}</TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  color: Number(account.current_balance) >= 0 ? 'green' : 'red',
                  fontWeight: 'bold'
                }}
              >
                {Number(account.current_balance).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTransactionsTable = () => (
    <TableContainer component={Paper} className="bank-accounts-table">
      <Table>
        <TableHead>
          <TableRow className="table-header">
            <TableCell>Date</TableCell>
            <TableCell>Bank Account</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell>Related Account</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Balance</TableCell>
            <TableCell align="center">Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {new Date(transaction.transaction_date).toLocaleString()}
              </TableCell>
              <TableCell>
                {transaction.bank_name} - {transaction.account_number}
              </TableCell>
              <TableCell>
                {transaction.reference}
                {transaction.receiver_name && (
                  <Typography variant="caption" display="block" color="textSecondary">
                    {transaction.payment_type === 'RECEIVED' ? 'From: ' : 'To: '}
                    {transaction.receiver_name}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {transaction.related_account_name && (
                  <Chip 
                    label={transaction.related_account_name}
                    size="small"
                    variant="outlined"
                  />
                )}
              </TableCell>
              <TableCell align="right" sx={{ 
                color: transaction.type === 'CREDIT' ? 'green' : 'red',
                fontWeight: 'bold'
              }}>
                {transaction.type === 'CREDIT' ? '+' : '-'}
                {Number(transaction.amount).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </TableCell>
              <TableCell align="right" sx={{
                fontWeight: 'bold',
                color: Number(transaction.running_balance) >= 0 ? 'green' : 'red'
              }}>
                {Number(transaction.running_balance).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={transaction.type} 
                  color={transaction.type === 'CREDIT' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAccountForm = () => (
    <Modal open={openModal} onClose={handleCloseModal}>
      <Box className="form-modal">
        <div className="form-header">
          <Typography variant="h6">
            {editMode ? 'Edit Bank Account' : 'Add New Bank Account'}
          </Typography>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </div>
        
        <form onSubmit={handleSubmit} className="form-content">
          <TextField
            fullWidth
            label="Bank Name"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Account Name"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Account Number"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Branch Name"
            value={formData.branch_name}
            onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
            required
          />
          <TextField
            fullWidth
            type="number"
            label="Opening Balance"
            value={formData.opening_balance}
            onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
            required
            disabled={editMode}
          />
          
          <div className="form-actions">
            <Button onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000' } }}
            >
              {editMode ? 'Update Account' : 'Add Account'}
            </Button>
          </div>
        </form>
      </Box>
    </Modal>
  );

  const renderFilters = () => (
    <Paper className="filters-container" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            type="date"
            label="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <FormControl fullWidth>
            <InputLabel>Bank Account</InputLabel>
            <Select
              value={filters.bankAccount}
              onChange={(e) => setFilters({ ...filters, bankAccount: e.target.value })}
            >
              <MenuItem value="">All Accounts</MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.bank_name} - {account.account_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button 
            fullWidth
            variant="outlined"
            onClick={() => setFilters({ startDate: '', endDate: '', bankAccount: '' })}
          >
            Clear Filters
          </Button>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrintTransactions}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000' } }}
          >
            Print
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Box className="bank-manager-container">
      {alert.show && (
        <Alert severity={alert.type} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <div className="bank-manager-header">
        <Typography variant="h2">
          Bank Accounts
        </Typography>
        <div className="header-actions">
          <Button
            variant="contained"
            startIcon={<AccountBalanceIcon />}
            onClick={() => setWithdrawModal(true)}
            sx={{ 
              bgcolor: '#1a1a1a', 
              '&:hover': { bgcolor: '#000' },
              mr: 2 
            }}
          >
            Withdraw Cash
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000' } }}
          >
            Add New Account
          </Button>
        </div>
      </div>

      <Paper className="bank-manager-tabs">
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              minWidth: '120px'
            }
          }}
        >
          <Tab label="Accounts Overview" />
          <Tab label="Transaction History" />
        </Tabs>
      </Paper>

      {activeTab === 0 && renderAccountsOverview()}

      {activeTab === 1 && (
        <>
          {renderFilters()}
          {renderTransactionsTable()}
        </>
      )}

      {renderAccountForm()}

      {/* Withdraw Modal */}
      <Modal open={withdrawModal} onClose={() => setWithdrawModal(false)}>
        <Box className="form-modal">
          <div className="form-header">
            <Typography variant="h6">
              Withdraw Cash
            </Typography>
            <IconButton onClick={() => setWithdrawModal(false)} size="small">
              <CloseIcon />
            </IconButton>
          </div>
          
          <form onSubmit={handleWithdraw} className="form-content">
            <FormControl fullWidth>
              <InputLabel>Select Account</InputLabel>
              <Select
                value={withdrawData.account_id}
                onChange={(e) => setWithdrawData({ ...withdrawData, account_id: e.target.value })}
                required
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              type="number"
              label="Amount"
              value={withdrawData.amount}
              onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Remarks"
              value={withdrawData.remarks}
              onChange={(e) => setWithdrawData({ ...withdrawData, remarks: e.target.value })}
              placeholder="Enter remarks (optional)"
              multiline
              rows={2}
            />
            
            <div className="form-actions">
              <Button onClick={() => setWithdrawModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000' } }}
              >
                Withdraw
              </Button>
            </div>
          </form>
        </Box>
      </Modal>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Bank Account</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Bank Name"
              value={formData.bank_name}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Account Number"
              value={formData.account_number}
              onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Branch"
              value={formData.branch_name}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="IFSC Code"
              value={formData.ifsc_code}
              onChange={(e) => setFormData(prev => ({ ...prev, ifsc_code: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Opening Balance"
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BankManager; 