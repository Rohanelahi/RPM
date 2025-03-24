import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Checkbox,
  FormControlLabel,
  Stack,
  Autocomplete,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import { format } from 'date-fns';
import ProfessionalFormLayout from '../common/ProfessionalFormLayout';
import '../../styles/forms/LeaveApplication.css';
import api from '../../services/api';

const LeaveApplicationForm = () => {
  const initialFormState = {
    employeeId: null,
    employeeName: '',
    department: '',
    startDate: null,
    endDate: null,
    reason: '',
    leaveWithPay: true,
  };

  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isPrinted, setIsPrinted] = useState(false);

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

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date,
    });
  };

  const handleCheckboxChange = (event) => {
    setFormData({
      ...formData,
      leaveWithPay: event.target.checked,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.submitLeaveApplication({
        employeeId: formData.employeeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        leaveWithPay: formData.leaveWithPay
      });
      alert('Leave application submitted successfully!');
      // Reset form
      setFormData(initialFormState);
    } catch (error) {
      alert('Error submitting leave application: ' + error.message);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Leave Application - ${formData.employeeName}</title>
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
            .reason-box {
              margin: 1cm 0;
              padding: 0.5cm;
              border: 1px solid #000;
            }
            .reason-title {
              font-weight: bold;
              margin-bottom: 0.3cm;
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
            <div class="document-title">Leave Application Form</div>
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
            <div class="section-title">Leave Details</div>
            <div class="field-row">
              <div class="field-label">Leave Type:</div>
              <div class="field-value">${formData.leaveWithPay ? 'Leave with Pay' : 'Leave without Pay'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Start Date:</div>
              <div class="field-value">${formData.startDate ? format(formData.startDate, 'dd/MM/yyyy') : ''}</div>
            </div>
            <div class="field-row">
              <div class="field-label">End Date:</div>
              <div class="field-value">${formData.endDate ? format(formData.endDate, 'dd/MM/yyyy') : ''}</div>
            </div>
          </div>

          <div class="reason-box">
            <div class="reason-title">Reason for Leave:</div>
            <div>${formData.reason}</div>
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
      setIsPrinted(true);
    }, 250);
  };

  return (
    <div className="leave-form-container">
      <Paper className="leave-content-paper">
        <Box sx={{ p: 3 }} className="printable-content">
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            Leave Application Form
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
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={formData.startDate}
                    onChange={handleDateChange('startDate')}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={formData.endDate}
                    onChange={handleDateChange('endDate')}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Reason for Leave"
                  value={formData.reason}
                  onChange={handleChange('reason')}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.leaveWithPay}
                      onChange={handleCheckboxChange}
                      color="primary"
                    />
                  }
                  label="Leave with Pay"
                />
              </Grid>

              <Grid item xs={12} className="signature-section print-only">
                <Box sx={{ 
                  mt: 'auto',
                  pt: 8,
                  width: '100%'
                }}>
                  <Grid container spacing={4}>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        borderTop: '1px solid #000', 
                        pt: 1, 
                        textAlign: 'center'
                      }}>
                        <Typography>Employee Signature</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        borderTop: '1px solid #000', 
                        pt: 1, 
                        textAlign: 'center'
                      }}>
                        <Typography>HR Manager</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        borderTop: '1px solid #000', 
                        pt: 1, 
                        textAlign: 'center'
                      }}>
                        <Typography>Director</Typography>
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
                    disabled={!isPrinted}
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

export default LeaveApplicationForm; 