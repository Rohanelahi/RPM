import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  Autocomplete
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import api from '../../services/api';
import '../../styles/forms/SalaryForm.css';

const SalaryForm = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salaryDetails, setSalaryDetails] = useState({
    basicSalary: 0,
    totalOvertime: 0,
    overtimeAmount: 0,
    loanDeductions: 0,
    advanceDeductions: 0,
    presentDays: 0,
    absentDays: 0,
    totalWorkingDays: 0,
    netSalary: 0,
    halfDayDates: [],
    absentDates: []
  });
  const [loanDetails, setLoanDetails] = useState({
    loans: [],
    advances: []
  });

  // Fetch employees on component mount
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
      setEmployeeData(null); // Reset previous employee data
      fetchEmployeeData(newValue.id);
    }
  };

  const fetchEmployeeData = async (id) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const employee = await api.getEmployeeById(id);
      setEmployeeData(employee);
      calculateSalary(employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      alert('Error fetching employee data');
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = async (employee) => {
    try {
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      const daysInMonth = getDaysInMonth(selectedMonth);
      
      // Fetch attendance and loans
      const [attendance, loans] = await Promise.all([
        api.getMonthlyAttendance(
          employee.id,
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        ),
        api.getEmployeeLoans(employee.id)
      ]);

      // Get detailed attendance records
      const halfDayRecords = attendance
        .filter(a => a.status === 'Half Day')
        .map(a => format(new Date(a.attendance_date), 'dd/MM/yyyy'));

      const absentRecords = attendance
        .filter(a => a.status === 'Absent')
        .map(a => format(new Date(a.attendance_date), 'dd/MM/yyyy'));

      // Calculate attendance
      const presentDays = attendance.filter(a => a.status === 'Present').length;
      const halfDays = attendance.filter(a => a.status === 'Half Day').length;
      const effectivePresentDays = presentDays + (halfDays * 0.5);
      const absentDays = daysInMonth - effectivePresentDays;

      // Calculate overtime
      const totalOvertime = attendance.reduce((sum, day) => {
        if (day.status === 'Present') {
          const overtime = parseFloat(day.overtime || 0);
          return sum + overtime;
        }
        return sum;
      }, 0);

      // Calculate rates
      const dailyRate = employee.salary / daysInMonth;
      const hourlyRate = dailyRate / 12; // 12 hours per day
      const overtimeRate = hourlyRate * 1.5; // 1.5x for overtime

      // Calculate salary components
      const basicSalary = dailyRate * effectivePresentDays;
      const overtimeAmount = totalOvertime * overtimeRate;

      // Calculate deductions
      const loanDeductions = loans
        .filter(loan => loan.loan_type === 'loan')
        .reduce((sum, loan) => sum + parseFloat(loan.monthly_installment), 0);

      const advanceDeductions = loans
        .filter(loan => loan.loan_type === 'advance')
        .reduce((sum, loan) => sum + parseFloat(loan.monthly_installment), 0);

      // Calculate net salary
      const netSalary = basicSalary + overtimeAmount - loanDeductions - advanceDeductions;

      setSalaryDetails({
        basicSalary: Math.round(basicSalary),
        totalOvertime,
        overtimeAmount: Math.round(overtimeAmount),
        loanDeductions: Math.round(loanDeductions),
        advanceDeductions: Math.round(advanceDeductions),
        presentDays: effectivePresentDays,
        absentDays,
        totalWorkingDays: daysInMonth,
        netSalary: Math.round(netSalary),
        halfDayDates: halfDayRecords,
        absentDates: absentRecords
      });
    } catch (error) {
      console.error('Error calculating salary:', error);
      alert('Error calculating salary');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${employeeData?.first_name} ${employeeData?.last_name}</title>
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
            .detail-row {
              display: flex;
              margin-bottom: 0.3cm;
            }
            .detail-label {
              width: 30%;
              font-weight: bold;
            }
            .detail-value {
              width: 70%;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1cm 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 0.3cm;
              text-align: left;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .amount-cell {
              text-align: right;
            }
            .total-row td {
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
            <div class="document-title">Salary Slip</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
            <div>Month: ${format(selectedMonth, 'MMMM yyyy')}</div>
          </div>

          <div class="employee-details">
            <div class="detail-row">
              <div class="detail-label">Employee Name:</div>
              <div class="detail-value">${employeeData?.first_name} ${employeeData?.last_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Department:</div>
              <div class="detail-value">${employeeData?.department_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Designation:</div>
              <div class="detail-value">${employeeData?.designation}</div>
            </div>
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
                <td>Basic Salary</td>
                <td>${salaryDetails.presentDays} days present, ${salaryDetails.absentDays} days absent</td>
                <td class="amount-cell">${salaryDetails.basicSalary.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Overtime</td>
                <td>${salaryDetails.totalOvertime} hours</td>
                <td class="amount-cell">${salaryDetails.overtimeAmount.toLocaleString()}</td>
              </tr>
              ${loanDetails.loans.map(loan => `
                <tr>
                  <td>Loan Deduction #${loan.id}</td>
                  <td>Installment ${format(new Date(selectedMonth), 'MMM yyyy')}</td>
                  <td class="amount-cell">-${parseFloat(loan.monthly_installment).toLocaleString()}</td>
                </tr>
              `).join('')}
              ${loanDetails.advances.map(advance => `
                <tr>
                  <td>Advance Deduction #${advance.id}</td>
                  <td>Installment ${format(new Date(selectedMonth), 'MMM yyyy')}</td>
                  <td class="amount-cell">-${parseFloat(advance.monthly_installment).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Net Salary</td>
                <td class="amount-cell">${salaryDetails.netSalary.toLocaleString()}</td>
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
    }, 250);
  };

  return (
    <div className="salary-form-container">
      <Paper className="salary-content-paper">
        <Box sx={{ p: 3 }} className="printable-content">
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
            Salary Calculation Form
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
                    label="Select Employee"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Month"
                  views={['year', 'month']}
                  value={selectedMonth}
                  onChange={(newValue) => {
                    setSelectedMonth(newValue);
                    if (employeeData) {
                      calculateSalary(employeeData);
                    }
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            {loading && (
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Grid>
            )}

            {employeeData && !loading && (
              <>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Employee Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="textSecondary">Name:</Typography>
                        <Typography>{employeeData.first_name} {employeeData.last_name}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="textSecondary">Department:</Typography>
                        <Typography>{employeeData.department_name}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="textSecondary">Designation:</Typography>
                        <Typography>{employeeData.designation}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Details</TableCell>
                          <TableCell align="right">Amount (PKR)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Basic Salary</TableCell>
                          <TableCell align="right">
                            {`${salaryDetails.presentDays} days present, ${salaryDetails.absentDays} days absent (Total: ${salaryDetails.totalWorkingDays} days)`}
                          </TableCell>
                          <TableCell align="right">
                            {salaryDetails.basicSalary.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>Overtime</TableCell>
                          <TableCell align="right">
                            {`${salaryDetails.totalOvertime} hours`}
                          </TableCell>
                          <TableCell align="right">
                            {salaryDetails.overtimeAmount.toLocaleString()}
                          </TableCell>
                        </TableRow>

                        {/* Attendance Summary Row */}
                        <TableRow>
                          <TableCell>Attendance Summary</TableCell>
                          <TableCell colSpan={2} align="right">
                            <Typography variant="body2" color="textSecondary">
                              Present: {salaryDetails.presentDays} days | 
                              Absent: {salaryDetails.absentDays} days | 
                              Working Days: {salaryDetails.totalWorkingDays} days
                            </Typography>
                          </TableCell>
                        </TableRow>

                        {/* Loan Deductions Section */}
                        {loanDetails.loans.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell colSpan={3}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  Loan Deductions
                                </Typography>
                              </TableCell>
                            </TableRow>
                            {loanDetails.loans.map((loan, index) => (
                              <TableRow key={`loan-${index}`}>
                                <TableCell>Loan #{loan.id}</TableCell>
                                <TableCell align="right">
                                  {`Installment ${format(new Date(selectedMonth), 'MMM yyyy')}`}
                                </TableCell>
                                <TableCell align="right">
                                  -{parseFloat(loan.monthly_installment).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}

                        {/* Advance Deductions Section */}
                        {loanDetails.advances.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell colSpan={3}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  Advance Deductions
                                </Typography>
                              </TableCell>
                            </TableRow>
                            {loanDetails.advances.map((advance, index) => (
                              <TableRow key={`advance-${index}`}>
                                <TableCell>Advance #{advance.id}</TableCell>
                                <TableCell align="right">
                                  {`Installment ${format(new Date(selectedMonth), 'MMM yyyy')}`}
                                </TableCell>
                                <TableCell align="right">
                                  -{parseFloat(advance.monthly_installment).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}

                        <TableRow>
                          <TableCell colSpan={2}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Net Salary
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {salaryDetails.netSalary.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
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
                  </Stack>
                </Grid>

                <Grid item xs={12} className="no-print">
                  <Box sx={{ mt: 3 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Attendance Details
                      </Typography>
                      
                      {salaryDetails.halfDayDates.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle1" color="primary">
                            Half Days ({salaryDetails.halfDayDates.length}):
                          </Typography>
                          <Typography>
                            {salaryDetails.halfDayDates.join(', ')}
                          </Typography>
                        </Box>
                      )}

                      {salaryDetails.absentDates.length > 0 && (
                        <Box>
                          <Typography variant="subtitle1" color="error">
                            Absent Days ({salaryDetails.absentDates.length}):
                          </Typography>
                          <Typography>
                            {salaryDetails.absentDates.join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Paper>
    </div>
  );
};

export default SalaryForm;