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
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import '../../styles/Payment.css';
import { Print } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const PaymentReceived = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isPrinted, setIsPrinted] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(),
    paymentMode: '',
    accountType: '',
    accountId: '',
    bankAccountId: '',
    amount: '',
    remarks: '',
    receiverName: '',
    voucherNo: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    if (formData.accountType) {
      fetchAccounts();
    }
  }, [formData.accountType]);

  useEffect(() => {
    const generateVoucherNumber = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/accounts/payments/generate-voucher/RECEIVED`);
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
  }, []);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const paymentModes = [
    { value: 'CASH', label: 'Cash' },
    { value: 'ONLINE', label: 'Online Transaction' },
    { value: 'CHEQUE', label: 'Bank Cheque' }
  ];

  const accountTypes = [
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'SUPPLIER', label: 'Supplier' },
    { value: 'VENDOR', label: 'Vendor' }
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

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/bank-accounts`);
      const data = await response.json();
      setBankAccounts(data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handlePrint = () => {
    if (!formData.amount || !formData.accountId || !formData.receiverName) {
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

    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #1976d2;">ROSE PAPER MILL</h1>
          <h2 style="margin: 10px 0;">Payment Receipt</h2>
          <p style="margin: 5px 0;">Receipt No: ${formData.voucherNo}</p>
          <p style="margin: 5px 0;">Date: ${format(formData.date, 'dd/MM/yyyy')}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Receiver Name:</strong></td>
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
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${accounts.find(acc => acc.id === formData.accountId)?.displayName || ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">Rs. ${parseFloat(formData.amount).toLocaleString()}</td>
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
    printWindow.document.write('<html><head><title>Payment Receipt</title></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    setIsPrinted(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPrinted) {
      alert('Please print the receipt before submitting');
      return;
    }

    // Validate bank account selection for online payments
    if (formData.paymentMode === 'ONLINE' && !formData.bankAccountId) {
      alert('Please select a bank account for online payment');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/accounts/payments/received`, {
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

      const result = await response.json();
      console.log('Payment submitted successfully:', result);
      
      // Generate new voucher number
      const newVoucherResponse = await fetch(`${config.apiUrl}/accounts/payments/generate-voucher/RECEIVED`);
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
        bankAccountId: '',
        amount: '',
        remarks: '',
        receiverName: '',
        voucherNo: newVoucherData.voucherNo
      }));
      setIsPrinted(false);
      setAccounts([]); // Clear accounts list

      alert(`Payment submitted successfully. Receipt No: ${result.voucher_no}`);
      
      // Dispatch events to update dashboard
      if (formData.paymentMode === 'CASH') {
        console.log('Dispatching cash payment events');
      window.dispatchEvent(new Event('paymentReceived'));
      window.dispatchEvent(new Event('cashBalanceUpdated'));
      } else if (formData.paymentMode === 'ONLINE') {
        console.log('Dispatching bank payment events');
        window.dispatchEvent(new Event('paymentReceived'));
        window.dispatchEvent(new Event('bankBalanceUpdated'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="payment-container">
        <Paper elevation={3} className="payment-paper">
          <Typography variant="h6" className="payment-title">
            Receipt
          </Typography>
          <form onSubmit={handleSubmit} className="payment-form">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  fullWidth
                  label="Receipt Number"
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
                  onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value, accountId: '' }))}
                >
                  {accountTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
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
              <Grid item xs={12} md={6} className="payment-field">
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  className="payment-amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
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
              {formData.paymentMode === 'ONLINE' && (
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
                    disabled={!formData.amount || !formData.accountId}
                  >
                    Print Receipt
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !isPrinted}
                    className="payment-submit-button received"
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit Payment'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default PaymentReceived; 