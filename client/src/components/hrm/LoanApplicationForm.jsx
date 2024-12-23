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
import '../../styles/forms/LoanApplication.css';
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
      // Format dates properly
      const formattedData = {
        employeeId: formData.employeeId,
        loanType: formData.loanType,
        amount: parseFloat(formData.amount),
        installments: parseInt(formData.installments),
        startMonth: format(formData.startMonth, 'yyyy-MM-dd'),
        endMonth: format(formData.endMonth, 'yyyy-MM-dd'),
        monthlyInstallment: parseFloat(calculateMonthlyInstallment())
      };

      await api.submitLoanApplication(formattedData);
      alert('Loan application submitted successfully!');
      setFormData(initialFormState);
    } catch (error) {
      alert('Error submitting loan application: ' + error.message);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loan Application - ${formData.employeeName}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              margin: 2cm;
              font-family: Arial, sans-serif;
              color: #000;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 2cm;
            }
            .company-name {
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 0.5cm;
              font-family: 'Times New Roman', Times, serif;
            }
            .document-title {
              font-size: 16pt;
              text-transform: uppercase;
              margin: 1cm 0;
              font-weight: bold;
            }
            .date-container {
              text-align: right;
              margin-bottom: 1cm;
              font-size: 10pt;
            }
            .section {
              margin-bottom: 1cm;
            }
            .section-title {
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 0.5cm;
              border-bottom: 1px solid #000;
              padding-bottom: 0.2cm;
            }
            .field-row {
              display: flex;
              margin-bottom: 0.5cm;
            }
            .field-label {
              width: 40%;
              font-weight: bold;
            }
            .field-value {
              width: 60%;
            }
            .amount-box {
              border: 2px solid #000;
              padding: 0.5cm;
              margin: 1cm 0;
              text-align: center;
              font-weight: bold;
            }
            .signatures {
              position: fixed;
              bottom: 3cm;
              left: 2cm;
              right: 2cm;
            }
            .signature-grid {
              display: flex;
              justify-content: space-between;
              margin-top: 2cm;
            }
            .signature-box {
              width: 30%;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              padding-top: 0.3cm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">${formData.loanType === 'advance' ? 'Advance' : 'Loan'} Application Form</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
          </div>

          <div class="section">
            <div class="section-title">Employee Information</div>
            <div class="field-row">
              <div class="field-label">Employee ID:</div>
              <div class="field-value">${formData.employeeId || ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Employee Name:</div>
              <div class="field-value">${formData.employeeName}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Department:</div>
              <div class="field-value">${formData.department}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Loan Details</div>
            <div class="field-row">
              <div class="field-label">Type:</div>
              <div class="field-value">${formData.loanType === 'advance' ? 'Advance' : 'Loan'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Amount:</div>
              <div class="field-value">PKR ${formData.amount}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Number of Installments:</div>
              <div class="field-value">${formData.installments}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Start Month:</div>
              <div class="field-value">${formData.startMonth ? format(formData.startMonth, 'MMMM yyyy') : ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">End Month:</div>
              <div class="field-value">${formData.endMonth ? format(formData.endMonth, 'MMMM yyyy') : ''}</div>
            </div>
          </div>

          <div class="amount-box">
            Monthly Installment Amount: PKR ${calculateMonthlyInstallment()}
          </div>

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Employee Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">HR Manager</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Director</div>
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

  const calculateMonthlyInstallment = () => {
    if (formData.amount && formData.installments) {
      return (parseFloat(formData.amount) / parseInt(formData.installments)).toFixed(2);
    }
    return '0.00';
  };

  return (
    <div className="loan-form-container">
      <Paper className="loan-content-paper">
        <Box sx={{ p: 3 }} className="printable-content">
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            {formData.loanType === 'advance' ? 'Advance' : 'Loan'} Application Form
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
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
                  className="monthly-installment"
                  sx={{ backgroundColor: '#f5f5f5' }}
                />
              </Grid>
              
              <Grid item xs={12} className="signature-section print-only">
                <Box sx={{ 
                  mt: 'auto',
                  pt: 8,
                  width: '100%'
                }}>
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
                  >
                    Print
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
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