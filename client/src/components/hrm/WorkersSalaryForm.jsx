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
  const [totals, setTotals] = useState({
    byDepartment: {},
    grandTotal: 0
  });

  const calculateAllSalaries = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all employees with their salary information
      const employees = await api.getEmployees();
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      const daysInMonth = getDaysInMonth(selectedMonth);

      const salaryPromises = employees.map(async (employee) => {
        try {
          // Get detailed employee info including salary
          const employeeDetail = await api.getEmployeeById(employee.id);
          const [attendance, loans] = await Promise.all([
            api.getMonthlyAttendance(
              employee.id,
              format(startDate, 'yyyy-MM-dd'),
              format(endDate, 'yyyy-MM-dd')
            ),
            api.getEmployeeLoans(employee.id)
          ]);

          // Calculate attendance
          const presentDays = attendance.filter(a => a.status === 'Present').length;
          const absentDays = daysInMonth - presentDays;

          // Calculate rates
          const dailyRate = employeeDetail.salary / daysInMonth;
          const hourlyRate = dailyRate / 12; // 12 hours per day
          const overtimeRate = hourlyRate * 1.5; // 1.5x for overtime

          // Calculate basic salary based on present days
          const basicSalary = dailyRate * presentDays;

          // Calculate overtime
          const totalOvertime = attendance.reduce((sum, day) => {
            if (day.status === 'Present' && day.overtime) {
              return sum + parseFloat(day.overtime || 0);
            }
            return sum;
          }, 0);

          // Calculate overtime amount
          const overtimeAmount = totalOvertime * overtimeRate;

          // Filter active loans for the current month
          const activeLoans = loans.filter(loan => {
            const startMonth = startOfMonth(new Date(loan.start_month));
            const endMonth = endOfMonth(new Date(loan.end_month));
            const currentMonth = selectedMonth;
            
            return (
              loan.status === 'APPROVED' &&
              startMonth <= endOfMonth(currentMonth) && 
              endMonth >= startOfMonth(currentMonth)
            );
          });

          // Calculate loan deductions
          const loanDeductions = activeLoans
            .filter(loan => loan.loan_type === 'loan')
            .reduce((sum, loan) => sum + parseFloat(loan.monthly_installment || 0), 0);

          // Calculate advance deductions
          const advanceDeductions = activeLoans
            .filter(loan => loan.loan_type === 'advance')
            .reduce((sum, loan) => sum + parseFloat(loan.monthly_installment || 0), 0);

          // Calculate net salary
          const netSalary = basicSalary + overtimeAmount - loanDeductions - advanceDeductions;

          return {
            id: employee.id,
            name: `${employeeDetail.first_name} ${employeeDetail.last_name}`,
            department: employeeDetail.department_name,
            basicSalary: Math.round(basicSalary),
            overtime: Math.round(overtimeAmount),
            deductions: Math.round(loanDeductions + advanceDeductions),
            netSalary: Math.round(netSalary),
            presentDays,
            absentDays
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

  useEffect(() => {
    calculateAllSalaries();
  }, [calculateAllSalaries]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const monthYear = format(selectedMonth, 'MMMM yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Workers Salary Summary - ${monthYear}</title>
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
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">Workers Salary Summary</div>
          </div>

          <div class="date-container">
            <div>Date: ${currentDate}</div>
            <div>Month: ${monthYear}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th class="amount-cell">Basic Salary</th>
                <th class="amount-cell">Overtime</th>
                <th class="amount-cell">Deductions</th>
                <th class="amount-cell">Net Salary</th>
                <th class="amount-cell">Present/Absent</th>
              </tr>
            </thead>
            <tbody>
              ${salaryData.map((row, index) => `
                ${(index === 0 || row.department !== salaryData[index - 1].department) ? `
                  <tr class="department-header">
                    <td colspan="8">${row.department}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td>${row.id}</td>
                  <td>${row.name}</td>
                  <td>${row.department}</td>
                  <td class="amount-cell">${row.basicSalary.toLocaleString()}</td>
                  <td class="amount-cell">${row.overtime.toLocaleString()}</td>
                  <td class="amount-cell">${row.deductions.toLocaleString()}</td>
                  <td class="amount-cell">${row.netSalary.toLocaleString()}</td>
                  <td class="amount-cell">${row.presentDays}/${row.absentDays}</td>
                </tr>
                ${(index === salaryData.length - 1 || row.department !== salaryData[index + 1].department) ? `
                  <tr class="department-total">
                    <td colspan="6" class="amount-cell">${row.department} Total:</td>
                    <td class="amount-cell" colspan="2">${totals.byDepartment[row.department].toLocaleString()}</td>
                  </tr>
                ` : ''}
              `).join('')}
              <tr class="grand-total">
                <td colspan="6" class="amount-cell">Grand Total:</td>
                <td class="amount-cell" colspan="2">${totals.grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Prepared By</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Approved By</div>
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
    <div className="workers-salary-container">
      <Paper className="workers-salary-paper">
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Workers Salary Summary
            </Typography>
            
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
                  <TableCell align="right">Basic Salary</TableCell>
                  <TableCell align="right">Overtime</TableCell>
                  <TableCell align="right">Deductions</TableCell>
                  <TableCell align="right">Net Salary</TableCell>
                  <TableCell align="right">Present/Absent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  salaryData.map((row, index) => (
                    <React.Fragment key={row.id}>
                      {/* Show department header when department changes */}
                      {(index === 0 || row.department !== salaryData[index - 1].department) && (
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={8}>
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
                        <TableCell align="right">{row.basicSalary.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.overtime.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.deductions.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.netSalary.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.presentDays}/{row.absentDays}</TableCell>
                      </TableRow>
                      {/* Show department total at the end of each department */}
                      {(index === salaryData.length - 1 || row.department !== salaryData[index + 1].department) && (
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={6} align="right">
                            <Typography variant="subtitle2">
                              {row.department} Total:
                            </Typography>
                          </TableCell>
                          <TableCell align="right" colSpan={2}>
                            <Typography variant="subtitle2">
                              {totals.byDepartment[row.department].toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}

                {/* Grand Total */}
                <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableCell colSpan={6} align="right">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Grand Total:
                    </Typography>
                  </TableCell>
                  <TableCell align="right" colSpan={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {totals.grandTotal.toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Signature section */}
          <Box className="signature-section">
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
        </Box>
      </Paper>
    </div>
  );
};

export default WorkersSalaryForm; 