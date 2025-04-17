import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print, ExpandMore, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Stock.css';
import config from '../../config';

const DailyActivityReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activities, setActivities] = useState({
    purchases: [],
    sales: [],
    expenses: [],
    payments: {
      received: [],
      issued: []
    },
    returns: {
      purchase: [],
      sale: []
    },
    maintenance: []
  });
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalExpenses: 0,
    totalPaymentsReceived: 0,
    totalPaymentsIssued: 0
  });
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchDailyActivities();
  }, [selectedDate]);

  const fetchDailyActivities = async () => {
    setLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch purchases
      const purchasesResponse = await fetch(`${config.apiUrl}/reports/daily-activity/purchases?date=${formattedDate}`);
      const purchasesData = await purchasesResponse.json();
      
      // Fetch sales
      const salesResponse = await fetch(`${config.apiUrl}/reports/daily-activity/sales?date=${formattedDate}`);
      const salesData = await salesResponse.json();
      
      // Fetch expenses
      const expensesResponse = await fetch(`${config.apiUrl}/reports/daily-activity/expenses?date=${formattedDate}`);
      const expensesData = await expensesResponse.json();
      
      // Fetch payments received
      const paymentsReceivedResponse = await fetch(`${config.apiUrl}/reports/daily-activity/payments/received?date=${formattedDate}`);
      const paymentsReceivedData = await paymentsReceivedResponse.json();
      
      // Fetch payments issued
      const paymentsIssuedResponse = await fetch(`${config.apiUrl}/reports/daily-activity/payments/issued?date=${formattedDate}`);
      const paymentsIssuedData = await paymentsIssuedResponse.json();
      
      // Fetch purchase returns
      const purchaseReturnsResponse = await fetch(`${config.apiUrl}/reports/daily-activity/returns/purchase?date=${formattedDate}`);
      const purchaseReturnsData = await purchaseReturnsResponse.json();
      
      // Fetch sale returns
      const saleReturnsResponse = await fetch(`${config.apiUrl}/reports/daily-activity/returns/sale?date=${formattedDate}`);
      const saleReturnsData = await saleReturnsResponse.json();
      
      // Fetch maintenance activities
      const maintenanceResponse = await fetch(`${config.apiUrl}/reports/daily-activity/maintenance?date=${formattedDate}`);
      const maintenanceData = await maintenanceResponse.json();
      
      // Calculate totals
      const totalPurchases = purchasesData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
      const totalSales = salesData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
      const totalExpenses = expensesData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const totalPaymentsReceived = paymentsReceivedData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const totalPaymentsIssued = paymentsIssuedData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      setActivities({
        purchases: purchasesData,
        sales: salesData,
        expenses: expensesData,
        payments: {
          received: paymentsReceivedData,
          issued: paymentsIssuedData
        },
        returns: {
          purchase: purchaseReturnsData,
          sale: saleReturnsData
        },
        maintenance: maintenanceData
      });
      
      setSummary({
        totalPurchases,
        totalSales,
        totalExpenses,
        totalPaymentsReceived,
        totalPaymentsIssued
      });
    } catch (error) {
      console.error('Error fetching daily activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert("Please allow pop-ups to print this report.");
      return;
    }
    
    const printStyles = `
      <style>
        @page { size: A4; margin: 1cm; }
        body { font-family: Arial, sans-serif; }
        .print-header { 
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        .print-date {
          font-size: 16px;
          margin-bottom: 15px;
          text-align: center;
        }
        .summary-box { 
          border: 1px solid #ddd; 
          padding: 15px; 
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .summary-item {
          margin-bottom: 10px;
        }
        .summary-label {
          font-weight: bold;
          font-size: 14px;
        }
        .summary-value {
          font-size: 16px;
        }
        .section-title {
          margin-top: 20px;
          margin-bottom: 10px;
          font-size: 18px;
          font-weight: bold;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left; 
          font-size: 12px;
        }
        th { 
          background-color: #f2f2f2; 
          font-weight: bold;
        }
        .total-row {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .text-right {
          text-align: right;
        }
        .no-data {
          font-style: italic;
          color: #666;
          margin-bottom: 15px;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    `;
    
    // Create a new document for printing
    let printDocument = '<div class="print-container">';
    
    // Add header
    printDocument += `
      <div class="print-header">
        <h1>Daily Activity Report</h1>
      </div>
      <div class="print-date">
        <strong>Date:</strong> ${format(selectedDate, 'MMMM d, yyyy')}
      </div>
    `;
    
    // Add summary
    printDocument += `
      <div class="summary-box">
        <h2 style="margin-top: 0;">Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Purchases:</div>
            <div class="summary-value">₨ ${Math.round(summary.totalPurchases).toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Sales:</div>
            <div class="summary-value">₨ ${Math.round(summary.totalSales).toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Expenses:</div>
            <div class="summary-value">₨ ${Math.round(summary.totalExpenses).toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Payments Received:</div>
            <div class="summary-value">₨ ${Math.round(summary.totalPaymentsReceived).toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Payments Issued:</div>
            <div class="summary-value">₨ ${Math.round(summary.totalPaymentsIssued).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
    
    // Add purchases section
    printDocument += `<h3 class="section-title">Purchases (${activities.purchases.length})</h3>`;
    if (activities.purchases.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Time</th>
              <th>Supplier</th>
              <th>Paper Type</th>
              <th class="text-right">Quantity</th>
              <th>Unit</th>
              <th class="text-right">Price/Unit</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.purchases.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.grn_number}</td>
            <td>${item.time}</td>
            <td>${item.supplier_name}</td>
            <td>${item.paper_type}</td>
            <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
            <td>${item.unit}</td>
            <td class="text-right">${item.price_per_unit ? `₨ ${Number(item.price_per_unit).toLocaleString()}` : '-'}</td>
            <td class="text-right">${item.total_amount ? `₨ ${Math.round(item.total_amount).toLocaleString()}` : '-'}</td>
          </tr>
        `;
      });
      
      printDocument += `
          <tr class="total-row">
            <td colspan="7" class="text-right">Total:</td>
            <td class="text-right">₨ ${Math.round(summary.totalPurchases).toLocaleString()}</td>
          </tr>
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No purchases for this date.</p>`;
    }
    
    // Add sales section
    printDocument += `<h3 class="section-title">Sales (${activities.sales.length})</h3>`;
    if (activities.sales.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Paper Type</th>
              <th class="text-right">Quantity</th>
              <th>Unit</th>
              <th class="text-right">Price/Unit</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.sales.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.grn_number}</td>
            <td>${item.time}</td>
            <td>${item.customer_name}</td>
            <td>${item.paper_type}</td>
            <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
            <td>${item.unit}</td>
            <td class="text-right">${item.price_per_unit ? `₨ ${Number(item.price_per_unit).toLocaleString()}` : '-'}</td>
            <td class="text-right">${item.total_amount ? `₨ ${Math.round(item.total_amount).toLocaleString()}` : '-'}</td>
          </tr>
        `;
      });
      
      printDocument += `
          <tr class="total-row">
            <td colspan="7" class="text-right">Total:</td>
            <td class="text-right">₨ ${Math.round(summary.totalSales).toLocaleString()}</td>
          </tr>
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No sales for this date.</p>`;
    }
    
    // Add expenses section
    printDocument += `<h3 class="section-title">Expenses (${activities.expenses.length})</h3>`;
    if (activities.expenses.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Payment Method</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.expenses.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.description}</td>
            <td>${item.category}</td>
            <td>${item.payment_method || '-'}</td>
            <td class="text-right">₨ ${Math.round(item.amount).toLocaleString()}</td>
          </tr>
        `;
      });
      
      printDocument += `
          <tr class="total-row">
            <td colspan="3" class="text-right">Total:</td>
            <td class="text-right">₨ ${Math.round(summary.totalExpenses).toLocaleString()}</td>
          </tr>
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No expenses for this date.</p>`;
    }
    
    // Add payments received section
    printDocument += `<h3 class="section-title">Payments Received (${activities.payments.received.length})</h3>`;
    if (activities.payments.received.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>Payment Method</th>
              <th>Remarks</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.payments.received.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.account_name}</td>
            <td>${item.payment_method}</td>
            <td>${item.remarks || '-'}</td>
            <td class="text-right">₨ ${Math.round(item.amount).toLocaleString()}</td>
          </tr>
        `;
      });
      
      printDocument += `
          <tr class="total-row">
            <td colspan="3" class="text-right">Total:</td>
            <td class="text-right">₨ ${Math.round(summary.totalPaymentsReceived).toLocaleString()}</td>
          </tr>
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No payments received for this date.</p>`;
    }
    
    // Add payments issued section
    printDocument += `<h3 class="section-title">Payments Issued (${activities.payments.issued.length})</h3>`;
    if (activities.payments.issued.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>To</th>
              <th>Payment Method</th>
              <th>Remarks</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.payments.issued.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.account_name}</td>
            <td>${item.payment_method}</td>
            <td>${item.remarks || '-'}</td>
            <td class="text-right">₨ ${Math.round(item.amount).toLocaleString()}</td>
          </tr>
        `;
      });
      
      printDocument += `
          <tr class="total-row">
            <td colspan="3" class="text-right">Total:</td>
            <td class="text-right">₨ ${Math.round(summary.totalPaymentsIssued).toLocaleString()}</td>
          </tr>
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No payments issued for this date.</p>`;
    }
    
    // Add returns sections
    printDocument += `<h3 class="section-title">Purchase Returns (${activities.returns.purchase.length})</h3>`;
    if (activities.returns.purchase.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Supplier</th>
              <th>Paper Type</th>
              <th class="text-right">Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.returns.purchase.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.grn_number}</td>
            <td>${item.supplier_name}</td>
            <td>${item.paper_type}</td>
            <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
            <td>${item.unit}</td>
          </tr>
        `;
      });
      
      printDocument += `
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No purchase returns for this date.</p>`;
    }
    
    printDocument += `<h3 class="section-title">Sale Returns (${activities.returns.sale.length})</h3>`;
    if (activities.returns.sale.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Customer</th>
              <th>Paper Type</th>
              <th class="text-right">Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.returns.sale.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.grn_number}</td>
            <td>${item.customer_name}</td>
            <td>${item.paper_type}</td>
            <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
            <td>${item.unit}</td>
          </tr>
        `;
      });
      
      printDocument += `
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No sale returns for this date.</p>`;
    }
    
    // Add maintenance section
    printDocument += `<h3 class="section-title">Maintenance (${activities.maintenance.length})</h3>`;
    if (activities.maintenance.length > 0) {
      printDocument += `
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>Description</th>
              <th>Status</th>
              <th class="text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.maintenance.forEach(item => {
        printDocument += `
          <tr>
            <td>${item.machine_name}</td>
            <td>${item.description}</td>
            <td>${item.status}</td>
            <td class="text-right">${item.cost ? `₨ ${Math.round(item.cost).toLocaleString()}` : '-'}</td>
          </tr>
        `;
      });
      
      printDocument += `
        </tbody>
        </table>
      `;
    } else {
      printDocument += `<p class="no-data">No maintenance activities for this date.</p>`;
    }
    
    // Close the print container
    printDocument += '</div>';
    
    // Write to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Activity Report - ${format(selectedDate, 'yyyy-MM-dd')}</title>
          ${printStyles}
        </head>
        <body>
          ${printDocument}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ ml: '260px', mt: '20px', p: 3 }} ref={printRef}>
        <Typography variant="h4" gutterBottom>
          Daily Activity Report
        </Typography>
        
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              startIcon={<Refresh />}
              onClick={fetchDailyActivities}
              size="small"
            >
              Refresh
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              size="small"
            >
              Print
            </Button>
          </Grid>
        </Grid>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Summary for {format(selectedDate, 'MMMM d, yyyy')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2}>
                  <Typography variant="subtitle2">Purchases:</Typography>
                  <Typography variant="h6">₨ {Math.round(summary.totalPurchases).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Typography variant="subtitle2">Sales:</Typography>
                  <Typography variant="h6">₨ {Math.round(summary.totalSales).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Typography variant="subtitle2">Expenses:</Typography>
                  <Typography variant="h6">₨ {Math.round(summary.totalExpenses).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Payments Received:</Typography>
                  <Typography variant="h6">₨ {Math.round(summary.totalPaymentsReceived).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Payments Issued:</Typography>
                  <Typography variant="h6">₨ {Math.round(summary.totalPaymentsIssued).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Purchases
                  <Chip 
                    label={activities.purchases.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {activities.purchases.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>GRN Number</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Supplier</TableCell>
                          <TableCell>Paper Type</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Price/Unit</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.purchases.map((item) => (
                          <TableRow key={item.grn_number} hover>
                            <TableCell>{item.grn_number}</TableCell>
                            <TableCell>{item.time}</TableCell>
                            <TableCell>{item.supplier_name}</TableCell>
                            <TableCell>{item.paper_type}</TableCell>
                            <TableCell align="right">{Number(item.quantity).toLocaleString()}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell align="right">
                              {item.price_per_unit ? `₨ ${Number(item.price_per_unit).toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {item.total_amount ? `₨ ${Math.round(item.total_amount).toLocaleString()}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={7} align="right">
                            <strong>Total:</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              ₨ {Math.round(summary.totalPurchases).toLocaleString()}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No purchases for this date.</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Sales
                  <Chip 
                    label={activities.sales.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {activities.sales.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>GRN Number</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Paper Type</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Price/Unit</TableCell>
                          <TableCell align="right">Total Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.sales.map((item) => (
                          <TableRow key={item.grn_number} hover>
                            <TableCell>{item.grn_number}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>{item.paper_type}</TableCell>
                            <TableCell align="right">{Number(item.quantity).toLocaleString()}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell align="right">
                              {item.price_per_unit ? `₨ ${Number(item.price_per_unit).toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {item.total_amount ? `₨ ${Math.round(item.total_amount).toLocaleString()}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={5} align="right">
                            <strong>Total:</strong>
                          </TableCell>
                          <TableCell />
                          <TableCell align="right">
                            <strong>
                              ₨ {Math.round(summary.totalSales).toLocaleString()}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No sales recorded for this date.</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Expenses
                  <Chip 
                    label={activities.expenses.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {activities.expenses.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Payment Method</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.expenses.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.payment_method}</TableCell>
                            <TableCell align="right">
                              ₨ {Math.round(item.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={3} align="right">
                            <strong>Total:</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              ₨ {Math.round(summary.totalExpenses).toLocaleString()}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No expenses recorded for this date.</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Payments
                  <Chip 
                    label={activities.payments.received.length + activities.payments.issued.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle1" gutterBottom>Payments Received</Typography>
                {activities.payments.received.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>From</TableCell>
                          <TableCell>Payment Method</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.payments.received.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{item.account_name}</TableCell>
                            <TableCell>{item.payment_method}</TableCell>
                            <TableCell>{item.reference_number || '-'}</TableCell>
                            <TableCell align="right">
                              ₨ {Math.round(item.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={3} align="right">
                            <strong>Total:</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              ₨ {Math.round(summary.totalPaymentsReceived).toLocaleString()}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" sx={{ mb: 3 }}>No payments received for this date.</Typography>
                )}

                <Typography variant="subtitle1" gutterBottom>Payments Issued</Typography>
                {activities.payments.issued.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>To</TableCell>
                          <TableCell>Payment Method</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.payments.issued.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{item.account_name}</TableCell>
                            <TableCell>{item.payment_method}</TableCell>
                            <TableCell>{item.reference_number || '-'}</TableCell>
                            <TableCell align="right">
                              ₨ {Math.round(item.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell colSpan={3} align="right">
                            <strong>Total:</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              ₨ {Math.round(summary.totalPaymentsIssued).toLocaleString()}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No payments issued for this date.</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Returns
                  <Chip 
                    label={activities.returns.purchase.length + activities.returns.sale.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle1" gutterBottom>Purchase Returns</Typography>
                {activities.returns.purchase.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>GRN Number</TableCell>
                          <TableCell>Supplier</TableCell>
                          <TableCell>Paper Type</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell>Unit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.returns.purchase.map((item) => (
                          <TableRow key={item.grn_number} hover>
                            <TableCell>{item.grn_number}</TableCell>
                            <TableCell>{item.supplier_name}</TableCell>
                            <TableCell>{item.paper_type}</TableCell>
                            <TableCell align="right">{Number(item.quantity).toLocaleString()}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" sx={{ mb: 3 }}>No purchase returns for this date.</Typography>
                )}

                <Typography variant="subtitle1" gutterBottom>Sale Returns</Typography>
                {activities.returns.sale.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>GRN Number</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Paper Type</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell>Unit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.returns.sale.map((item) => (
                          <TableRow key={item.grn_number} hover>
                            <TableCell>{item.grn_number}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>{item.paper_type}</TableCell>
                            <TableCell align="right">{Number(item.quantity).toLocaleString()}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No sale returns for this date.</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Maintenance
                  <Chip 
                    label={activities.maintenance.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {activities.maintenance.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Machine</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.maintenance.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{item.machine_name}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell align="right">
                              {item.cost ? `₨ ${Math.round(item.cost).toLocaleString()}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No maintenance activities for this date.</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default DailyActivityReport; 