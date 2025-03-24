import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { Print } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import api from '../../services/api';
import '../../styles/forms/WorkersSalary.css';

const WorkersSalaryForm = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [salaryData, setSalaryData] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState({});
  const [totals, setTotals] = useState({
    byDepartment: {},
    grandTotal: 0
  });
  const [monthlyTotal, setMonthlyTotal] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [contractorPayments, setContractorPayments] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  const calculateAllSalaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const employees = await api.getEmployees();
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      const salaryPromises = employees.map(async (employee) => {
        try {
          const employeeDetail = await api.getEmployeeById(employee.id);
          const [attendance, loans] = await Promise.all([
            api.getMonthlyAttendance(
              employee.id,
              format(startDate, 'yyyy-MM-dd'),
              format(endDate, 'yyyy-MM-dd')
            ),
            api.getEmployeeLoans(employee.id)
          ]);

          // Calculate attendance counts
          const presentDays = attendance.filter(day => day.status === 'Present').length;
          const absentDays = attendance.filter(day => day.status === 'Absent').length;
          const halfDays = attendance.filter(day => day.status === 'Half Day').length;

          // Calculate standard hours and rates
          const standardHours = employeeDetail.department_name === 'Admin' ? 8 : 12;
          const monthlySalary = employeeDetail.salary;
          const dailyRate = monthlySalary / 31;
          const hourlyRate = dailyRate / standardHours;

          // Calculate salary based on actual hours worked
          const basicSalary = attendance.reduce((total, day) => {
            const hoursWorked = parseFloat(day.hours_worked || 0);
            const daySalary = hoursWorked * hourlyRate;
            return total + daySalary;
          }, 0);

          // Calculate overtime with 1.5x rate
          const overtimeAmount = attendance.reduce((total, day) => {
            const overtime = parseFloat(day.overtime || 0);
            return total + (overtime * hourlyRate * 1.5);
          }, 0);

          // Get active loans and calculate deductions
          const activeLoans = loans.filter(loan => {
            const startMonth = startOfMonth(new Date(loan.start_month));
            const endMonth = endOfMonth(new Date(loan.end_month));
            return (
              loan.status === 'APPROVED' &&
              startMonth <= endOfMonth(selectedMonth) && 
              endMonth >= startOfMonth(selectedMonth)
            );
          });

          const loanDeductions = activeLoans
            .filter(loan => loan.loan_type === 'loan')
            .reduce((sum, loan) => sum + parseFloat(loan.monthly_installment || 0), 0);

          const advanceDeductions = activeLoans
            .filter(loan => loan.loan_type === 'advance')
            .reduce((sum, loan) => sum + parseFloat(loan.monthly_installment || 0), 0);

          const totalHoursWorked = attendance.reduce((sum, day) => {
            return sum + parseFloat(day.hours_worked || 0);
          }, 0);

          console.log(`Employee ${employee.id} - Final Calculation:
            Total Hours: ${totalHoursWorked}
            Basic Salary: ${basicSalary}
            Overtime: ${overtimeAmount}
          `);

          return {
            id: employee.id,
            name: `${employeeDetail.first_name} ${employeeDetail.last_name}`,
            department: employeeDetail.department_name,
            presentDays,
            absentDays,
            halfDays,
            totalHoursWorked,
            basicSalary: Math.round(basicSalary),
            overtime: Math.round(overtimeAmount),
            deductions: Math.round(loanDeductions + advanceDeductions),
            netSalary: Math.round(basicSalary + overtimeAmount - loanDeductions - advanceDeductions),
            hourlyRate
          };
        } catch (error) {
          console.error(`Error calculating salary for employee ${employee.id}:`, error);
          return null;
        }
      });

      const salaries = (await Promise.all(salaryPromises)).filter(Boolean);

      // Sort by department and then by employee ID
      salaries.sort((a, b) => {
        if (a.department === b.department) {
          return a.id.localeCompare(b.id);
        }
        return a.department.localeCompare(b.department);
      });

      // Calculate department totals
      const deptTotals = {};
      let total = 0;

      salaries.forEach(salary => {
        if (!deptTotals[salary.department]) {
          deptTotals[salary.department] = 0;
        }
        deptTotals[salary.department] += salary.netSalary;
        total += salary.netSalary;
      });

      setSalaryData(salaries);
      setTotals({
        byDepartment: deptTotals,
        grandTotal: total
      });
    } catch (error) {
      console.error('Error calculating salaries:', error);
      alert('Error calculating salaries');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  // Add function to handle salary payment
  const handlePaySalaries = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      const response = await api.post('/hrm/salary-payments', {
        month,
        year,
        payments: salaryData.map(payment => ({
          id: payment.id,
          basicSalary: payment.basicSalary,
          overtime: payment.overtime,
          deductions: payment.deductions,
          netSalary: payment.netSalary
        }))
      });

      if (response.message) {
        await fetchPaymentStatus();
        alert('Salaries paid successfully!');
      }
    } catch (error) {
      console.error('Error paying salaries:', error);
      alert('Error processing salary payments');
    }
  };

  // Update fetchPaymentStatus
  const fetchPaymentStatus = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const response = await api.get(`/hrm/salary-payment-status/${month}/${year}`);
      setPaymentStatus(response.payments);
      setMonthlyTotal(response.monthlyTotal);
    } catch (error) {
      console.error('Error fetching payment status:', error);
    }
  };

  // Update useEffect to fetch payment status
  useEffect(() => {
    calculateAllSalaries();
    fetchPaymentStatus();
  }, [calculateAllSalaries]);

  // Update fetchContractors to include month and year
  const fetchContractors = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const response = await api.get(`/hrm/contractors?month=${month}&year=${year}`);
      setContractors(response);
      setContractorPayments(response.map(c => ({
        id: c.id,
        name: c.name,
        amount: c.monthly_salary
      })));
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  // Update useEffect to depend on selectedMonth
  useEffect(() => {
    fetchContractors();
  }, [selectedMonth]); // Add selectedMonth as dependency

  // Add contractor payment handler
  const handlePayContractors = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      await api.post('/hrm/contractor-payments', {
        month,
        year,
        payments: contractorPayments
      });

      alert('Contractor payments processed successfully!');
    } catch (error) {
      console.error('Error paying contractors:', error);
      alert('Error processing contractor payments');
    }
  };

  // Update this function to use post instead of put
  const handleContractorSalaryUpdate = async (contractorId, newSalary) => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      await api.post(`/hrm/contractors/${contractorId}`, {
        monthly_salary: newSalary,
        effective_month: month,
        effective_year: year
      });

      // Refresh the contractors data for the current month
      const updatedContractors = contractors.map(c => 
        c.id === contractorId ? { ...c, monthly_salary: newSalary } : c
      );
      setContractors(updatedContractors);
    } catch (error) {
      console.error('Error updating contractor salary:', error);
      alert('Failed to update contractor salary');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const monthYear = format(selectedMonth, 'MMMM yyyy');
    const contractorsTotal = contractors.reduce((sum, c) => sum + Number(c.monthly_salary), 0);
    const workersTotal = totals.grandTotal || 0;
    const grandTotal = workersTotal + contractorsTotal;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Workers & Contractors Salary Summary - ${monthYear}</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { 
              margin: 2cm;
              font-family: Arial, sans-serif;
              color: #000;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 1cm;
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
              margin: 0.5cm 0;
              font-weight: bold;
            }
            .date-container {
              text-align: right;
              margin-bottom: 0.5cm;
              font-size: 10pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0.5cm 0;
              font-size: 9pt;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #000;
              padding: 0.2cm;
              text-align: left;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .amount-cell {
              text-align: right;
            }
            .department-header {
              background: #f5f5f5;
              font-weight: bold;
            }
            .department-total {
              background: #f5f5f5;
              font-weight: bold;
            }
            .grand-total {
              background: #e3f2fd;
              font-weight: bold;
            }
            .signatures {
              position: fixed;
              bottom: 2cm;
              left: 2cm;
              right: 2cm;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-grid {
              display: flex;
              justify-content: space-between;
              margin-top: 2cm;
            }
            .signature-box {
              width: 45%;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              padding-top: 0.3cm;
            }
            @media print {
              .signatures {
                position: fixed;
                bottom: 2cm;
                left: 2cm;
                right: 2cm;
                display: none;
              }
              .signatures:last-child {
                display: block;
              }
            }

            /* Updated signature styles */
            .print-wrapper {
              position: relative;
              min-height: 100vh;
            }
            .content-wrapper {
              padding-bottom: 4cm;  /* Space for signatures */
            }
            .signature-section-print {
              position: absolute;
              bottom: 0;
              left: 2cm;
              right: 2cm;
              margin-top: 2cm;
              page-break-before: avoid;
              page-break-inside: avoid;
            }
            .signature-grid {
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              padding-top: 0.3cm;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            <div class="content-wrapper">
              <!-- Company header -->
              <div class="header">
                <div class="company-name">ROSE PAPER MILL</div>
                <div class="document-title">Workers & Contractors Salary Summary</div>
              </div>

              <!-- Date info -->
              <div class="date-container">
                <div>Date: ${currentDate}</div>
                <div>Month: ${monthYear}</div>
              </div>

              <!-- Workers Section -->
              <div class="section-title">Workers Salary</div>
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Present Days</th>
                    <th>Absent Days</th>
                    <th>Half Days</th>
                    <th>Total Hours</th>
                    <th>Basic Salary</th>
                    <th>Overtime</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  ${salaryData.map((row, index) => `
                    ${(index === 0 || row.department !== salaryData[index - 1].department) ? `
                      <tr class="department-header">
                        <td colspan="11">${row.department}</td>
                      </tr>
                    ` : ''}
                    <tr>
                      <td>${row.id}</td>
                      <td>${row.name}</td>
                      <td>${row.department}</td>
                      <td>${row.presentDays}</td>
                      <td>${row.absentDays}</td>
                      <td>${row.halfDays}</td>
                      <td>${row.totalHoursWorked.toFixed(2)}</td>
                      <td>${row.basicSalary.toLocaleString()}</td>
                      <td>${row.overtime.toLocaleString()}</td>
                      <td>${row.deductions.toLocaleString()}</td>
                      <td>${row.netSalary.toLocaleString()}</td>
                    </tr>
                    ${(index === salaryData.length - 1 || row.department !== salaryData[index + 1].department) ? `
                      <tr class="department-total">
                        <td colspan="10" class="amount-cell">${row.department} Total:</td>
                        <td class="amount-cell">${totals.byDepartment[row.department].toLocaleString()}</td>
                      </tr>
                    ` : ''}
                  `).join('')}
                  <tr class="grand-total">
                    <td colspan="10" class="amount-cell">Workers Total:</td>
                    <td class="amount-cell">${workersTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Contractors Section -->
              <div class="section-title" style="margin-top: 20px;">Contractors Salary</div>
              <table>
                <thead>
                  <tr>
                    <th>Contractor Name</th>
                    <th class="amount-cell">Monthly Salary</th>
                  </tr>
                </thead>
                <tbody>
                  ${contractors.map(contractor => `
                    <tr>
                      <td>${contractor.name}</td>
                      <td class="amount-cell">${contractor.monthly_salary.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                  <tr class="grand-total">
                    <td class="amount-cell">Contractors Total:</td>
                    <td class="amount-cell">${contractors.reduce((sum, c) => sum + Number(c.monthly_salary), 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Grand Total -->
              <table style="margin-top: 20px;">
                <tbody>
                  <tr class="grand-total" style="font-size: 14pt;">
                    <td class="amount-cell" style="width: 80%;">Grand Total:</td>
                    <td class="amount-cell">${grandTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Signatures at the bottom -->
            <div class="signature-section-print">
              <div class="signature-grid">
                <div class="signature-box">
                  <div class="signature-line">Prepared By</div>
                </div>
                <div class="signature-box">
                  <div class="signature-line">Approved By</div>
                </div>
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

  const handleSaveTotal = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      // Calculate grand total including both workers and contractors
      const grandTotal = totals.grandTotal + contractors.reduce((sum, c) => sum + Number(c.monthly_salary), 0);

      await api.post('/hrm/workers-salary-totals', {
        month,
        year,
        totalAmount: grandTotal // Now includes both workers and contractors total
      });

      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving total:', error);
      setSaveStatus('Error saving total');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div className="workers-salary-container">
      <Paper className="workers-salary-paper">
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Workers Salary Summary
              </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mt: 1,
                  color: monthlyTotal ? 'success.main' : 'error.main',
                  fontWeight: 500 
                }}
              >
                Status: {monthlyTotal 
                  ? `Paid on ${new Date(monthlyTotal.payment_date).toLocaleDateString()} (Total: ₹${monthlyTotal.total_amount.toLocaleString()})`
                  : 'Not Paid'
                }
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  views={['month', 'year']}
                  label="Select Month"
                  minDate={new Date('2000-01-01')}
                  maxDate={new Date('2100-01-01')}
                  value={selectedMonth}
                  onChange={(newValue) => {
                    setSelectedMonth(newValue);
                  }}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
              </LocalizationProvider>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                className="no-print"
              >
                Print
              </Button>
            </Box>
          </Box>

          {/* Table content */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Present Days</TableCell>
                  <TableCell>Absent Days</TableCell>
                  <TableCell>Half Days</TableCell>
                  <TableCell>Total Hours</TableCell>
                  <TableCell>Basic Salary</TableCell>
                  <TableCell>Overtime</TableCell>
                  <TableCell>Deductions</TableCell>
                  <TableCell>Net Salary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  salaryData.map((row, index) => (
                    <React.Fragment key={row.id}>
                      {/* Show department header when department changes */}
                      {(index === 0 || row.department !== salaryData[index - 1].department) && (
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={11}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {row.department}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.presentDays}</TableCell>
                        <TableCell>{row.absentDays}</TableCell>
                        <TableCell>{row.halfDays}</TableCell>
                        <TableCell>{row.totalHoursWorked.toFixed(2)}</TableCell>
                        <TableCell>{row.basicSalary.toLocaleString()}</TableCell>
                        <TableCell>{row.overtime.toLocaleString()}</TableCell>
                        <TableCell>{row.deductions.toLocaleString()}</TableCell>
                        <TableCell>{row.netSalary.toLocaleString()}</TableCell>
                      </TableRow>
                      {/* Show department total at the end of each department */}
                      {(index === salaryData.length - 1 || row.department !== salaryData[index + 1].department) && (
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={10} align="right">
                            <Typography variant="subtitle2">
                              {row.department} Total:
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {totals.byDepartment[row.department].toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}

                {/* Grand Total */}
                <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableCell colSpan={10} align="right">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Grand Total:
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {totals.grandTotal.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Signature section */}
          <Box className="final-signature-section">
            <Grid container spacing={8}>
              <Grid item xs={6}>
                <div className="signature-line">
                  <Typography>Prepared By</Typography>
                </div>
              </Grid>
              <Grid item xs={6}>
                <div className="signature-line">
                  <Typography>Approved By</Typography>
                </div>
              </Grid>
            </Grid>
          </Box>

          {/* Add Pay Salaries button at the bottom */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePaySalaries}
              disabled={!!monthlyTotal}
            >
              Pay All Salaries
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Contractors Section */}
      <Paper className="workers-salary-paper" sx={{ mt: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Contractors Salary
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Contractor Name</TableCell>
                  <TableCell align="right">Monthly Salary</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contractors.map((contractor) => (
                  <TableRow key={contractor.id}>
                    <TableCell>{contractor.name}</TableCell>
                    <TableCell align="right">
                      ₨ {contractor.monthly_salary.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const newSalary = prompt('Enter new salary:', contractor.monthly_salary);
                          if (newSalary && !isNaN(newSalary)) {
                            handleContractorSalaryUpdate(contractor.id, Number(newSalary));
                          }
                        }}
                      >
                        Update Salary
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>
                    <strong>Contractors Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      ₨ {contractors
                        .reduce((sum, c) => sum + Number(c.monthly_salary), 0)
                        .toLocaleString()}
                  </strong>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Grand Total Section */}
      <Paper className="workers-salary-paper" sx={{ mt: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Grand Total
          </Typography>
          <Typography variant="h4" align="right">
            ₨ {(totals.grandTotal + contractors.reduce((sum, c) => sum + Number(c.monthly_salary), 0)).toLocaleString()}
          </Typography>
        </Box>
      </Paper>

      <Paper className="workers-salary-paper" sx={{ mt: 3 }}>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="h5">Workers Salary Form</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  views={['year', 'month']}
                  label="Select Month"
                  minDate={new Date('2021-01-01')}
                  maxDate={new Date()}
                  value={selectedMonth}
                  onChange={(newValue) => setSelectedMonth(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveTotal}
                disabled={isLoading || totals.grandTotal === 0}
              >
                Save Total
              </Button>
              {saveStatus && (
                <Typography 
                  color={saveStatus.includes('Error') ? 'error' : 'success'}
                  sx={{ ml: 2, alignSelf: 'center' }}
                >
                  {saveStatus}
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </div>
  );
};

export default WorkersSalaryForm; 