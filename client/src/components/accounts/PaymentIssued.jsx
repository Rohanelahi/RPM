import React, { useState, useEffect } from 'react';
import config from '../../config';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import '../../styles/Payment.css';
import { Print, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const PaymentIssued = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [isPrinted, setIsPrinted] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newExpenseType, setNewExpenseType] = useState({ name: '', description: '' });
  const [formData, setFormData] = useState({
    date: new Date(),
    paymentMode: '',
    accountType: '',
    accountId: '',
    accountLevel: null,
    bankAccountId: '',
    amount: '',
    remarks: '',
    receiverName: '',
    voucherNo: '',
    expenseType: ''
  });
  const { user } = useAuth();
  const [allAccounts, setAllAccounts] = useState([]);

  useEffect(() => {
    if (formData.accountType) {
      if (formData.accountType === 'EXPENSE') {
        fetchExpenseTypes();
      } else if (formData.accountType === 'OTHER') {
          fetchAllAccounts();
      } else {
        fetchAccounts();
      }
    }
  }, [formData.accountType]);

  useEffect(() => {
    const generateVoucherNumber = async () => {
      try {
        const endpoint = (formData.accountType === 'EXPENSE' || formData.accountType === 'OTHER')
          ? `${config.apiUrl}/accounts/expenses/generate-voucher`
          : `${config.apiUrl}/accounts/payments/generate-voucher/ISSUED`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to generate voucher number');
        }
        const data = await response.json();
        setFormData(prev => ({ ...prev, voucherNo: data.voucherNo }));
      } catch (error) {
        console.error('Error generating voucher number:', error);
      }
    };

    generateVoucherNumber();
  }, [formData.accountType]);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (formData.accountType === 'EXPENSE' || formData.accountType === 'OTHER') {
      setFormData(prev => ({ ...prev, paymentMode: 'CASH' }));
    }
  }, [formData.accountType]);

  const paymentModes = [
    { value: 'CASH', label: 'Cash' },
    { value: 'ONLINE', label: 'Online Transaction' },
    { value: 'CHEQUE', label: 'Bank Cheque' }
  ];

  const accountTypes = [
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'SUPPLIER', label: 'Supplier' },
    { value: 'VENDOR', label: 'Vendor' },
    { value: 'OTHER', label: 'Other' }
  ];

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      // Fetch accounts from all levels
      const [level1Res, level2Res, level3Res] = await Promise.all([
        fetch(`${config.apiUrl}/accounts/chart/level1?account_type=${formData.accountType}`),
        fetch(`${config.apiUrl}/accounts/chart/level2?account_type=${formData.accountType}`),
        fetch(`${config.apiUrl}/accounts/chart/level3?account_type=${formData.accountType}`)
      ]);

      if (!level1Res.ok || !level2Res.ok || !level3Res.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const [level1Data, level2Data, level3Data] = await Promise.all([
        level1Res.json(),
        level2Res.json(),
        level3Res.json()
      ]);

      // Extract all Level 3 accounts from the nested structure
      const allLevel3Accounts = [];
      level3Data.forEach(level1 => {
        if (level1.level2_accounts) {
          level1.level2_accounts.forEach(level2 => {
            if (level2.level3_accounts) {
              level2.level3_accounts.forEach(level3 => {
                if (level3.account_type === formData.accountType) {
                  allLevel3Accounts.push({
                    ...level3,
                    level: 3,
                    level1_id: level1.id,
                    level2_id: level2.id,
                    level1_name: level1.name,
                    level2_name: level2.name,
                    displayName: `${level1.name} > ${level2.name} > ${level3.name}`
                  });
                }
              });
            }
          });
        }
      });

      // Filter and combine all accounts from different levels
      const allAccounts = [
        ...level1Data
          .filter(account => account.account_type === formData.accountType)
          .map(account => ({
            ...account,
            level: 1,
            displayName: account.name
          })),
        ...level2Data
          .filter(account => account.account_type === formData.accountType)
          .map(account => ({
            ...account,
            level: 2,
            displayName: `${account.level1_name} > ${account.name}`
          })),
        ...allLevel3Accounts
      ];

      setAccounts(allAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      alert('Failed to fetch accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseTypes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/expenses/types`);
      if (!response.ok) throw new Error('Failed to fetch expense types');
      const data = await response.json();
      setExpenseTypes(data);
    } catch (error) {
      console.error('Error fetching expense types:', error);
      alert('Failed to fetch expense types');
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/bank-accounts`);
      const data = await response.json();
      setBankAccounts(data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchAllAccounts = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/accounts/chart/all`);
      const data = await res.json();
      console.log('Fetched accounts:', data);
      setAllAccounts(data);
    } catch (err) {
      console.error('Error fetching all accounts:', err);
      setAllAccounts([]);
    }
  };

  const handleAddExpenseType = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/expenses/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpenseType),
      });

      if (!response.ok) throw new Error('Failed to add expense type');

      const data = await response.json();
      setExpenseTypes([...expenseTypes, data]);
      setNewExpenseType({ name: '', description: '' });
      setOpenDialog(false);
      alert('Expense type added successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error adding expense type: ' + error.message);
    }
  };

  const handlePrint = () => {
    if (!formData.amount || !formData.receiverName) {
      alert('Please fill in all required fields before printing');
      return;
    }

    const selectedBankAccount = formData.paymentMode === 'ONLINE' 
      ? bankAccounts.find(acc => acc.id === formData.bankAccountId) 
      : null;

    const bankDetails = formData.paymentMode === 'ONLINE' && selectedBankAccount 
      ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Bank Name:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${selectedBankAccount.bank_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${selectedBankAccount.account_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Title:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${selectedBankAccount.account_title || '-'}</td>
        </tr>
      `
      : '';

    const expenseTypeDetails = formData.accountType === 'EXPENSE'
      ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Expense Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${
            expenseTypes.find(type => type.id === formData.expenseType)?.name || formData.expenseType
          }</td>
        </tr>
      `
      : '';

    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #1976d2;">ROSE PAPER MILL</h1>
          <h2 style="margin: 10px 0;">${formData.accountType === 'EXPENSE' ? 'Expense' : 'Payment'} Voucher</h2>
          <p style="margin: 5px 0;">Voucher No: ${formData.voucherNo}</p>
          <p style="margin: 5px 0;">Date: ${format(formData.date, 'dd/MM/yyyy')}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Paid To:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formData.receiverName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Mode:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${paymentModes.find(mode => mode.value === formData.paymentMode)?.label || ''}</td>
            </tr>
            ${bankDetails}
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Type:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${accountTypes.find(type => type.value === formData.accountType)?.label || ''}</td>
            </tr>
            ${expenseTypeDetails}
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${
                formData.accountType === 'EXPENSE' 
                  ? expenseTypes.find(type => type.id === formData.expenseType)?.name 
                  : formData.accountType === 'OTHER'
                    ? (() => {
                        const selectedAccount = allAccounts.find(acc => 
                          acc.uniqueId === `${formData.accountLevel}-${formData.accountId}`
                        );
                        return selectedAccount ? selectedAccount.displayName : '';
                      })()
                    : accounts.find(acc => acc.id === formData.accountId)?.displayName || ''
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">Rs.${parseFloat(formData.amount).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Remarks:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formData.remarks || '-'}</td>
            </tr>
          </table>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 50px;">
          <div style="text-align: center;">
            <div>_________________</div>
            <div>Prepared By</div>
          </div>
          <div style="text-align: center;">
            <div>_________________</div>
            <div>Approved By</div>
          </div>
          <div style="text-align: center;">
            <div>_________________</div>
            <div>Received By</div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Payment Voucher</title></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    setIsPrinted(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPrinted) {
      alert('Please print the voucher before submitting');
      return;
    }

    // Validate bank account selection for online payments
    if (formData.paymentMode === 'ONLINE' && !formData.bankAccountId) {
      alert('Please select a bank account for online payment');
      return;
    }

    setLoading(true);
    try {
      if (formData.accountType === 'EXPENSE' || formData.accountType === 'OTHER') {
        // Handle expense submission
        const selectedAccount = formData.accountType === 'OTHER' 
          ? allAccounts.find(acc => String(acc.id) === String(formData.accountId))
          : null;

        console.log('Selected account:', selectedAccount);
        console.log('Form data:', formData);

        if (formData.accountType === 'OTHER' && !selectedAccount) {
          throw new Error('Please select a valid account');
        }

        const requestBody = {
          date: formData.date,
          amount: formData.amount,
          receiverName: formData.receiverName,
          remarks: formData.remarks,
          voucherNo: formData.voucherNo,
          expenseType: formData.accountType === 'EXPENSE' 
            ? formData.expenseType 
            : selectedAccount?.name || selectedAccount?.displayName,
          account_type: formData.accountType,
          account_id: formData.accountType === 'OTHER' ? selectedAccount.id : null,
          created_by: user.id,
          processed_by_role: user.role
        };

        console.log('Sending request body:', requestBody);

        const response = await fetch(`${config.apiUrl}/accounts/expenses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit expense');
        }
      } else {
        // Handle payment submission
        const response = await fetch(`${config.apiUrl}/accounts/payments/issued`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_id: formData.accountId,
            amount: formData.amount,
            payment_date: formData.date,
            payment_mode: formData.paymentMode,
            receiver_name: formData.receiverName,
            remarks: formData.remarks,
            voucher_no: formData.voucherNo,
            is_tax_payment: false,
            created_by: user.id,
            processed_by_role: user.role,
            account_type: formData.accountType,
            bank_account_id: formData.paymentMode === 'ONLINE' ? formData.bankAccountId : null
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit payment');
        }
      }

      // Generate new voucher number based on account type
      const endpoint = (formData.accountType === 'EXPENSE' || formData.accountType === 'OTHER')
        ? `${config.apiUrl}/accounts/expenses/generate-voucher`
        : `${config.apiUrl}/accounts/payments/generate-voucher/ISSUED`;
      
      const newVoucherResponse = await fetch(endpoint);
      if (!newVoucherResponse.ok) {
        throw new Error('Failed to generate new voucher number');
      }
      const newVoucherData = await newVoucherResponse.json();
      
      // Reset form with new voucher number
      setFormData(prev => ({
        date: new Date(),
        paymentMode: '',
        accountType: '',
        accountId: '',
        accountLevel: null,
        bankAccountId: '',
        amount: '',
        remarks: '',
        receiverName: '',
        voucherNo: newVoucherData.voucherNo,
        expenseType: ''
      }));
      setIsPrinted(false);
      setAccounts([]); // Clear accounts list

      alert(`${formData.accountType === 'EXPENSE' || formData.accountType === 'OTHER' ? 'Expense' : 'Payment'} submitted successfully!`);
      
      // Dispatch events to update dashboard and bank manager
      window.dispatchEvent(new Event('paymentIssued'));
      window.dispatchEvent(new Event('cashBalanceUpdated'));
      window.dispatchEvent(new Event('bankBalanceUpdated'));
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error submitting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="payment-container">
        <Paper elevation={3} className="payment-paper">
          <Typography variant="h6" className="payment-title">
            Payment/Expense
          </Typography>
          <form onSubmit={handleSubmit} className="payment-form">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  fullWidth
                  label="Voucher Number"
                  value={formData.voucherNo || 'Will be generated automatically'}
                  disabled
                  sx={{ 
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#666",
                      fontWeight: "bold"
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  fullWidth
                  label="Receiver Name"
                  value={formData.receiverName}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6} className="payment-field">
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(newValue) => setFormData(prev => ({ ...prev, date: newValue }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  select
                  fullWidth
                  className="payment-select"
                  label="Payment Mode"
                  value={formData.paymentMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value }))}
                  disabled={formData.accountType === 'EXPENSE'}
                >
                  {paymentModes.map((mode) => (
                    <MenuItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  select
                  fullWidth
                  className="payment-select"
                  label="Account Type"
                  value={formData.accountType}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value, accountId: '', expenseType: '' }))}
                >
                  {accountTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {formData.accountType === 'EXPENSE' ? (
                <Grid item xs={12} md={6} className="payment-field">
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      select
                      fullWidth
                      label="Expense Type"
                      value={formData.expenseType}
                      onChange={(e) => setFormData(prev => ({ ...prev, expenseType: e.target.value }))}
                      required
                    >
                      {expenseTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Tooltip title="Add New Expense Type">
                      <IconButton
                        onClick={() => setOpenDialog(true)}
                        sx={{ 
                          bgcolor: '#1a1a1a', 
                          '&:hover': { bgcolor: '#000' },
                          color: 'white'
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              ) : formData.accountType === 'OTHER' ? (
                <Grid item xs={12} md={6} className="payment-field">
                  <Autocomplete
                    options={allAccounts}
                    getOptionLabel={(option) => {
                      if (!option) return '';
                      return option.displayName;
                    }}
                    value={allAccounts.find(acc => acc.uniqueId === `${formData.accountLevel}-${formData.accountId}`) || null}
                    onChange={(_, value) => {
                      console.log('Selected value:', value);
                      if (value) {
                        setFormData(prev => ({ 
                          ...prev, 
                          accountId: value.id,
                          accountLevel: value.level
                        }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          accountId: '',
                          accountLevel: null
                        }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Account" required />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <div>
                          <div>{option.displayName}</div>
                          <div style={{ fontSize: '0.8em', color: 'gray' }}>
                            Level {option.level} - {option.account_type}
                          </div>
                        </div>
                      </li>
                    )}
                    groupBy={(option) => option.level1_name}
                    isOptionEqualToValue={(option, value) => {
                      if (!option || !value) return false;
                      return option.uniqueId === value.uniqueId;
                    }}
                    filterOptions={(options, { inputValue }) => {
                      const searchTerm = inputValue.toLowerCase();
                      return options.filter(option => 
                        option.displayName.toLowerCase().includes(searchTerm) ||
                        option.name.toLowerCase().includes(searchTerm) ||
                        option.level1_name.toLowerCase().includes(searchTerm) ||
                        (option.level2_name && option.level2_name.toLowerCase().includes(searchTerm))
                      );
                    }}
                  />
                </Grid>
              ) : (
                <Grid item xs={12} md={6} className="payment-field">
                  <TextField
                    select
                    fullWidth
                    className="payment-select"
                    label="Account"
                    value={formData.accountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    disabled={!formData.accountType || loading}
                  >
                    {accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        <div>
                          <div>{account.displayName}</div>
                          <div style={{ fontSize: '0.8em', color: 'gray' }}>
                            {account.level === 1 ? 'Level 1' : account.level === 2 ? 'Level 2' : 'Level 3'} - {account.account_type}
                          </div>
                        </div>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  className="payment-amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} className="payment-remarks">
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={4}
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </Grid>
              {formData.paymentMode === 'ONLINE' && formData.accountType !== 'EXPENSE' && (
                <Grid item xs={12} md={6} className="payment-field">
                  <TextField
                    select
                    fullWidth
                    required
                    label="Select Bank Account"
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountId: e.target.value }))}
                  >
                    {bankAccounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.bank_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrint}
                    disabled={!formData.amount || (!formData.accountId && !formData.expenseType)}
                  >
                    Print Voucher
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !isPrinted}
                    className="payment-submit-button issued"
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Paper>

        {/* Add Expense Type Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Add New Expense Type</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={newExpenseType.name}
                onChange={(e) => setNewExpenseType(prev => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
                required
              />
              <TextField
                fullWidth
                label="Description"
                value={newExpenseType.description}
                onChange={(e) => setNewExpenseType(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAddExpenseType}
              variant="contained"
              disabled={!newExpenseType.name}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PaymentIssued;