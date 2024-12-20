import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stack,
  Autocomplete,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import { addMonths, format } from 'date-fns';
import '../../styles/Forms.css';
import api from '../../services/api';

const loanTypes = [
  { value: 'loan', label: 'Loan' },
  { value: 'advance', label: 'Advance' },
];

const LoanApplicationForm = () => {
  const initialFormState = {
    employeeId: null,
    employeeName: '',
    department: '',
    loanType: '',
    amount: '',
    installments: '',
    startMonth: null,
    endMonth: null,
  };

  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.getEmployees();
        setEmployees(response);
      } catch (error) {
        console.error('Error fetching employees:', error);
        alert('Error loading employees');
      }
    };
    fetchEmployees();
  }, []);

  const handleEmployeeChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        employeeId: newValue.id,
        employeeName: `${newValue.first_name} ${newValue.last_name}`,
        department: newValue.department_name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        employeeId: null,
        employeeName: '',
        department: ''
      }));
    }
  };

  // Calculate end month based on start month and number of installments
  useEffect(() => {
    if (formData.startMonth && formData.installments) {
      const endMonth = addMonths(formData.startMonth, parseInt(formData.installments) - 1);
      setFormData(prev => ({ ...prev, endMonth }));
    }
  }, [formData.startMonth, formData.installments]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      startMonth: date,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.submitLoanApplication({
        employeeId: formData.employeeId,
        loanType: formData.loanType,
        amount: formData.amount,
        installments: formData.installments,
        startMonth: formData.startMonth,
        endMonth: formData.endMonth,
        monthlyInstallment: calculateMonthlyInstallment()
      });
      alert('Loan application submitted successfully!');
      // Reset form
      setFormData(initialFormState);
    } catch (error) {
      alert('Error submitting loan application: ' + error.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateMonthlyInstallment = () => {
    if (formData.amount && formData.installments) {
      return (parseFloat(formData.amount) / parseInt(formData.installments)).toFixed(2);
    }
    return '0.00';
  };

  return (
    <div className="page-container print-container">
      <Paper className="content-paper">
        <Box sx={{ p: 3 }} className="printable-content">
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
            {formData.loanType === 'advance' ? 'Advance' : 'Loan'} Application Form
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={employees}
                  getOptionLabel={(option) => `${option.id} - ${option.first_name} ${option.last_name}`}
                  onChange={handleEmployeeChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Employee ID"
                      required
                      fullWidth
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Employee Name"
                  value={formData.employeeName}
                  disabled
                  sx={{ backgroundColor: '#f5f5f5' }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  disabled
                  sx={{ backgroundColor: '#f5f5f5' }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Type"
                  value={formData.loanType}
                  onChange={handleChange('loanType')}
                  required
                >
                  {loanTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange('amount')}
                  required
                  InputProps={{
                    startAdornment: 'PKR ',
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Number of Installments"
                  type="number"
                  value={formData.installments}
                  onChange={handleChange('installments')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Month"
                    views={['year', 'month']}
                    value={formData.startMonth}
                    onChange={handleDateChange}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Month"
                  value={formData.endMonth ? format(formData.endMonth, 'MMMM yyyy') : ''}
                  disabled
                  sx={{ backgroundColor: '#f5f5f5' }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Monthly Installment Amount"
                  value={`PKR ${calculateMonthlyInstallment()}`}
                  disabled
                  sx={{ backgroundColor: '#f5f5f5' }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ 
                  mt: 'auto',
                  pt: 15,
                  width: '100%'
                }} className="signature-section">
                  <Grid container spacing={4}>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        borderTop: '1px solid #000', 
                        pt: 1, 
                        textAlign: 'center'
                      }}>
                        <Typography>Employee Signature</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        borderTop: '1px solid #000', 
                        pt: 1, 
                        textAlign: 'center'
                      }}>
                        <Typography>Approved By</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12} className="no-print">
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrint}
                    className="action-button"
                  >
                    Print
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    className="action-button"
                  >
                    Submit Application
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Paper>
    </div>
  );
};

export default LoanApplicationForm; 