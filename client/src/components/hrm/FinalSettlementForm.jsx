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
import { format, differenceInDays, startOfMonth, getDaysInMonth, endOfMonth } from 'date-fns';
import '../../styles/forms/FinalSettlement.css';
import api from '../../services/api';

const separationTypes = [
  { value: 'terminate', label: 'Termination' },
  { value: 'resign', label: 'Resignation' },
];

const FinalSettlementForm = () => {
  const [formData, setFormData] = useState({
    employeeId: null,
    employeeName: '',
    department: '',
    separationType: '',
    lastWorkingDate: null,
    salary: 0,
    dueSalary: 0,
    totalOvertime: 0,
    overtimeAmount: 0,
    presentDays: 0,
    absentDays: 0,
    totalWorkingDays: 0,
    netSettlement: 0,
    grossAmount: 0,
    totalDeductions: 0,
    totalLoanBalance: 0,
    totalAdvanceBalance: 0,
    loans: [],
    advances: [],
    settlementStatus: 'TO_PAY'
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

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
      const [employee, loansData] = await Promise.all([
        api.getEmployeeById(newValue.id),
        api.getEmployeeLoans(newValue.id)
      ]);

      console.log('Fetched employee:', employee); // Debug log
      console.log('Fetched loans data:', loansData); // Debug log

      // Ensure loans and advances are arrays
      const loans = Array.isArray(loansData.loans) ? loansData.loans : [];
      const advances = Array.isArray(loansData.advances) ? loansData.advances : [];

      setFormData(prev => ({
        ...prev,
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        department: employee.department_name,
        salary: employee.salary,
        loans,
        advances,
        totalLoanBalance: loans.reduce((sum, loan) => sum + parseFloat(loan.remaining_amount || 0), 0),
        totalAdvanceBalance: advances.reduce((sum, advance) => sum + parseFloat(advance.remaining_amount || 0), 0),
        netSettlement: 0
      }));

    } catch (error) {
      console.error('Error fetching employee:', error);
      alert('Error fetching employee data');
    } finally {
      setLoading(false);
    }
  };

  const calculateSettlement = async () => {
    if (!formData.lastWorkingDate || !formData.employeeId) return;

    try {
      setLoading(true);
      const startDate = startOfMonth(new Date());
      const endDate = formData.lastWorkingDate;
      const daysInMonth = getDaysInMonth(startDate);

      // Fetch attendance and loans
      const [attendance, loans] = await Promise.all([
        api.getMonthlyAttendance(
          formData.employeeId,
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        ),
        api.getEmployeeLoans(formData.employeeId)
      ]);

      // Filter active loans
      const activeLoans = loans.filter(loan => loan.status === 'APPROVED');
      
      // Separate loans and advances with remaining amounts
      const activeLoansList = activeLoans
        .filter(loan => loan.loan_type === 'loan')
        .map(loan => ({
          ...loan,
          remaining_installments: Math.ceil(parseFloat(loan.remaining_amount) / parseFloat(loan.monthly_installment)),
          total_remaining: parseFloat(loan.remaining_amount)
        }));

      const activeAdvancesList = activeLoans
        .filter(loan => loan.loan_type === 'advance')
        .map(advance => ({
          ...advance,
          remaining_installments: Math.ceil(parseFloat(advance.remaining_amount) / parseFloat(advance.monthly_installment)),
          total_remaining: parseFloat(advance.remaining_amount)
        }));

      // Calculate attendance and salary components
      const presentDays = (attendance || []).filter(a => a.status === 'Present').length;
      const absentDays = (attendance || []).filter(a => a.status === 'Absent').length;
      const totalOvertime = (attendance || []).reduce((sum, day) => {
        if (day.status === 'Present') {
          return sum + parseFloat(day.overtime || 0);
        }
        return sum;
      }, 0);

      // Calculate salary
      const dailyRate = formData.salary / daysInMonth;
      const hourlyRate = dailyRate / 12;
      const overtimeRate = hourlyRate * 1.5;
      const basicSalary = dailyRate * presentDays;
      const overtimeAmount = totalOvertime * overtimeRate;

      // Calculate total deductions
      const totalLoanBalance = activeLoansList.reduce((sum, loan) => 
        sum + loan.total_remaining, 0);
      const totalAdvanceBalance = activeAdvancesList.reduce((sum, advance) => 
        sum + advance.total_remaining, 0);
      const totalDeductions = totalLoanBalance + totalAdvanceBalance;

      // Calculate final settlement
      const grossAmount = basicSalary + overtimeAmount;
      const netSettlement = grossAmount - totalDeductions;

      setFormData(prev => ({
        ...prev,
        dueSalary: Math.round(basicSalary),
        totalOvertime,
        overtimeAmount: Math.round(overtimeAmount),
        grossAmount: Math.round(grossAmount),
        loans: activeLoansList,
        advances: activeAdvancesList,
        totalLoanBalance: Math.round(totalLoanBalance),
        totalAdvanceBalance: Math.round(totalAdvanceBalance),
        totalDeductions: Math.round(totalDeductions),
        presentDays,
        absentDays,
        totalWorkingDays: daysInMonth,
        netSettlement: Math.round(netSettlement),
        settlementStatus: netSettlement >= 0 ? 'TO_PAY' : 'TO_RECEIVE'
      }));

    } catch (error) {
      console.error('Error calculating settlement:', error);
      alert('Error calculating settlement details');
    } finally {
      setLoading(false);
    }
  };

  // Call calculateSettlement when lastWorkingDate changes
  useEffect(() => {
    if (formData.lastWorkingDate && formData.employeeId) {
      calculateSettlement();
    }
  }, [formData.lastWorkingDate, formData.employeeId]);

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      lastWorkingDate: date
    }));
  };

  const handleTypeChange = (event) => {
    setFormData(prev => ({
      ...prev,
      separationType: event.target.value
    }));
  };

  const handleUpdate = async () => {
    if (!window.confirm('Are you sure you want to process this settlement? This will deactivate the employee.')) {
      return;
    }

    try {
      // Update employee status
      await api.updateEmployee(formData.employeeId, {
        status: 'INACTIVE',
        separation_type: formData.separationType,
        separation_date: format(formData.lastWorkingDate, 'yyyy-MM-dd')
      });

      // Clear loans/advances if any
      await api.clearEmployeeLoans(formData.employeeId);

      alert('Settlement processed successfully');
      setFormData({
        employeeId: null,
        employeeName: '',
        department: '',
        separationType: '',
        lastWorkingDate: null,
        salary: 0,
        dueSalary: 0,
        totalOvertime: 0,
        overtimeAmount: 0,
        presentDays: 0,
        absentDays: 0,
        totalWorkingDays: 0,
        netSettlement: 0,
        loans: [],
        advances: []
      });
    } catch (error) {
      console.error('Error processing settlement:', error);
      alert('Error processing settlement');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Final Settlement - ${formData.employeeName}</title>
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
            .employee-details {
              margin-bottom: 1cm;
              padding: 0.5cm;
              background: #f5f5f5;
            }
            .settlement-details {
              margin: 1cm 0;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #ddd;
              padding: 0.3cm 0;
            }
            .total-row {
              font-weight: bold;
              border-top: 2px solid #000;
              margin-top: 0.5cm;
              padding-top: 0.5cm;
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
            <div class="document-title">Final Settlement</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
          </div>

          <div class="employee-details">
            <p><strong>Employee Name:</strong> ${formData.employeeName}</p>
            <p><strong>Department:</strong> ${formData.department}</p>
            <p><strong>Separation Type:</strong> ${
              separationTypes.find(t => t.value === formData.separationType)?.label
            }</p>
            <p><strong>Last Working Date:</strong> ${
              format(formData.lastWorkingDate, 'dd/MM/yyyy')
            }</p>
          </div>

          <div class="settlement-details">
            <div class="amount-row">
              <span>Due Salary</span>
              <span>${formData.dueSalary.toLocaleString()}</span>
            </div>
            ${formData.loans.map(loan => `
              <div class="amount-row">
                <span>Loan Balance #${loan.id}</span>
                <span>-${parseFloat(loan.remaining_amount).toLocaleString()}</span>
              </div>
            `).join('')}
            ${formData.advances.map(advance => `
              <div class="amount-row">
                <span>Advance Balance #${advance.id}</span>
                <span>-${parseFloat(advance.remaining_amount).toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="amount-row total-row">
              <span>Net Settlement</span>
              <span>${formData.netSettlement.toLocaleString()}</span>
            </div>
          </div>

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Employee</div>
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

  return (
    <div className="settlement-form-container">
      <Paper className="settlement-content-paper">
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            Final Settlement Form
          </Typography>

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
                select
                fullWidth
                label="Separation Type"
                value={formData.separationType}
                onChange={handleTypeChange}
                required
              >
                {separationTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Last Working Date"
                  value={formData.lastWorkingDate}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Salary"
                value={`PKR ${formData.dueSalary.toLocaleString()}`}
                disabled
                sx={{ backgroundColor: '#f5f5f5' }}
              />
            </Grid>

            {formData.loans && formData.loans.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Outstanding Loans
                </Typography>
                {formData.loans.map(loan => (
                  <Box key={loan.id} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Loan #{loan.id} - {loan.remaining_installments || 0} installments remaining
                    </Typography>
                    <TextField
                      fullWidth
                      label={`Total Outstanding Amount`}
                      value={`PKR ${(loan.total_remaining || 0).toLocaleString()}`}
                      disabled
                      sx={{ backgroundColor: '#f5f5f5', mb: 1 }}
                    />
                  </Box>
                ))}
              </Grid>
            )}

            {formData.advances && formData.advances.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Outstanding Advances
                </Typography>
                {formData.advances.map(advance => (
                  <Box key={advance.id} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Advance #{advance.id} - {advance.remaining_installments || 0} installments remaining
                    </Typography>
                    <TextField
                      fullWidth
                      label={`Total Outstanding Amount`}
                      value={`PKR ${(advance.total_remaining || 0).toLocaleString()}`}
                      disabled
                      sx={{ backgroundColor: '#f5f5f5', mb: 1 }}
                    />
                  </Box>
                ))}
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Settlement Summary
              </Typography>
              <TextField
                fullWidth
                label="Gross Amount (Salary + Overtime)"
                value={`PKR ${(formData.grossAmount || 0).toLocaleString()}`}
                disabled
                sx={{ backgroundColor: '#f5f5f5', mb: 2 }}
              />
              <TextField
                fullWidth
                label="Total Deductions (Loans + Advances)"
                value={`PKR ${(formData.totalDeductions || 0).toLocaleString()}`}
                disabled
                sx={{ backgroundColor: '#f5f5f5', mb: 2 }}
              />
              <TextField
                fullWidth
                label={formData.settlementStatus === 'TO_PAY' ? 'Final Amount to Pay' : 'Final Amount to Receive'}
                value={`PKR ${Math.abs(formData.netSettlement || 0).toLocaleString()}`}
                disabled
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  '& input': { 
                    fontWeight: 'bold',
                    color: formData.settlementStatus === 'TO_PAY' ? 'green' : 'red'
                  } 
                }}
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
                      <Typography>Employee</Typography>
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
                  variant="contained"
                  color="primary"
                  onClick={handleUpdate}
                  disabled={!formData.employeeId || !formData.lastWorkingDate || !formData.separationType}
                >
                  Process Settlement
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </div>
  );
};

export default FinalSettlementForm; 