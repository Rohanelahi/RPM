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
import '../../styles/Forms.css';
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
    window.print();
  };

  return (
    <div className="page-container print-container">
      <Paper className="content-paper">
        <Box sx={{ p: 3 }} className="printable-content">
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
            Leave Application Form
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
              
              <Grid item xs={12}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Leave Start Date"
                        value={formData.startDate}
                        onChange={handleDateChange('startDate')}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth required />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Leave End Date"
                        value={formData.endDate}
                        onChange={handleDateChange('endDate')}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth required />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
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
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Leave"
                  value={formData.reason}
                  onChange={handleChange('reason')}
                  required
                  multiline
                  rows={4}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ 
                  mt: 'auto',
                  pt: 15,
                  width: '100%'
                }} className="signature-section">
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
                        <Typography>HOD Signature</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        borderTop: '1px solid #000', 
                        pt: 1, 
                        textAlign: 'center'
                      }}>
                        <Typography>Director Signature</Typography>
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

export default LeaveApplicationForm; 