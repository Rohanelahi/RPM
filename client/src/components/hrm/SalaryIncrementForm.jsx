import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Stack,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/api';
import '../../styles/forms/SalaryIncrement.css';

const SalaryIncrementForm = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: null,
    employeeName: '',
    department: '',
    currentSalary: 0,
    newSalary: 0,
    effectiveDate: null,
    remarks: ''
  });

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

  const handleEmployeeChange = async (event, newValue) => {
    if (!newValue) return;

    try {
      setLoading(true);
      const employee = await api.getEmployeeById(newValue.id);
      
      setFormData(prev => ({
        ...prev,
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        department: employee.department_name,
        currentSalary: employee.salary,
        newSalary: employee.salary // Initialize with current salary
      }));
    } catch (error) {
      console.error('Error fetching employee:', error);
      alert('Error fetching employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.employeeId || !formData.newSalary || !formData.effectiveDate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.createSalaryIncrement({
        employeeId: formData.employeeId,
        previousSalary: formData.currentSalary,
        newSalary: formData.newSalary,
        effectiveDate: format(formData.effectiveDate, 'yyyy-MM-dd'),
        remarks: formData.remarks
      });

      alert('Salary increment processed successfully');
      // Reset form
      setFormData(prev => ({
        ...prev,
        newSalary: 0,
        effectiveDate: null,
        remarks: ''
      }));
    } catch (error) {
      console.error('Error processing increment:', error);
      alert('Error processing salary increment');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Increment Form</title>
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
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1cm 0;
              border: 1px solid #000;
            }
            th, td {
              border: 1px solid #000;
              padding: 0.3cm;
              text-align: left;
              font-size: 10pt;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .amount-cell {
              text-align: right;
              font-family: monospace;
            }
            .signatures {
              position: fixed;
              bottom: 3cm;
              left: 2cm;
              right: 2cm;
              page-break-inside: avoid;
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
            <div class="document-title">Salary Increment Form</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Details</th>
                <th class="amount-cell">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Employee ID</td>
                <td colspan="2">${formData.employeeId || ''}</td>
              </tr>
              <tr>
                <td>Employee Name</td>
                <td colspan="2">${formData.employeeName || ''}</td>
              </tr>
              <tr>
                <td>Department</td>
                <td colspan="2">${formData.department || ''}</td>
              </tr>
              <tr>
                <td>Current Salary</td>
                <td colspan="2" class="amount-cell">
                  ${formData.currentSalary.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td>New Salary</td>
                <td colspan="2" class="amount-cell">
                  ${formData.newSalary.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td>Increment Amount</td>
                <td colspan="2" class="amount-cell">
                  ${(formData.newSalary - formData.currentSalary).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td>Effective Date</td>
                <td colspan="2">${formData.effectiveDate ? format(formData.effectiveDate, 'dd/MM/yyyy') : ''}</td>
              </tr>
              <tr>
                <td>Remarks</td>
                <td colspan="2">${formData.remarks || 'N/A'}</td>
              </tr>
            </tbody>
          </table>

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
    <div className="salary-increment-form page-container">
      <Paper className="content-paper">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Salary Increment Form
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.id})`}
                onChange={handleEmployeeChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Employee"
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Salary"
                value={formData.currentSalary.toLocaleString()}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="New Salary"
                type="number"
                required
                value={formData.newSalary}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newSalary: parseFloat(e.target.value)
                }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Effective Date"
                  value={formData.effectiveDate}
                  onChange={(newValue) => setFormData(prev => ({
                    ...prev,
                    effectiveDate: newValue
                  }))}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  remarks: e.target.value
                }))}
              />
            </Grid>

            <Grid item xs={12} className="signature-section print-only">
              <Box sx={{ mt: 8 }}>
                <Grid container spacing={4}>
                  <Grid item xs={4}>
                    <Box sx={{ borderTop: '1px solid #000', pt: 1, textAlign: 'center' }}>
                      <Typography>Employee</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ borderTop: '1px solid #000', pt: 1, textAlign: 'center' }}>
                      <Typography>HR Manager</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ borderTop: '1px solid #000', pt: 1, textAlign: 'center' }}>
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
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={loading || !formData.employeeId || !formData.newSalary || !formData.effectiveDate || !isPrinted}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </div>
  );
};

export default SalaryIncrementForm; 