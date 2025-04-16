import React, { useState } from 'react';
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
import { Print } from '@mui/icons-material';
import { format } from 'date-fns';
import config from '../../config';
import '../../styles/Payment.css';

const ExpenseForm = () => {
  const [loading, setLoading] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(),
    expenseType: '',
    amount: '',
    receiverName: '',
    remarks: ''
  });

  const expenseTypes = [
    { value: 'PETROL', label: 'Petrol' },
    { value: 'MESS', label: 'Mess' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MISC', label: 'Miscellaneous' }
  ];

  const handlePrint = () => {
    if (!formData.amount || !formData.expenseType || !formData.receiverName) {
      alert('Please fill in all required fields before printing');
      return;
    }
    
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Expense Voucher</h2>
          <p style="margin: 5px 0;">Date: ${format(formData.date, 'dd/MM/yyyy')}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Expense Type:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${
                expenseTypes.find(type => type.value === formData.expenseType)?.label || formData.expenseType
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Receiver Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formData.receiverName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">Rs. ${formData.amount}</td>
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
    printWindow.document.write('<html><head><title>Expense Voucher</title></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    setIsPrinted(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPrinted) {
      alert('Please print the expense voucher before submitting');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/accounts/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit expense');
      }

      // Reset form
      setFormData({
        date: new Date(),
        expenseType: '',
        amount: '',
        receiverName: '',
        remarks: ''
      });
      setIsPrinted(false);

      alert('Expense submitted successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting expense: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="payment-container">
        <Paper elevation={3} className="payment-paper">
          <Typography variant="h5" gutterBottom>
            Add Expense
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(newValue) => setFormData(prev => ({ ...prev, date: newValue }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Expense Type"
                  value={formData.expenseType}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenseType: e.target.value }))}
                  required
                >
                  {expenseTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Receiver Name"
                  value={formData.receiverName}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={4}
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrint}
                    disabled={!formData.amount || !formData.expenseType || !formData.receiverName}
                  >
                    Print Voucher
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !isPrinted}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit Expense'}
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

export default ExpenseForm; 