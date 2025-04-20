import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import { format, startOfMonth } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Stock.css';
import config from '../../config';

const SaleSummary = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [itemSummary, setItemSummary] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paperTypes, setPaperTypes] = useState([]);
  const [filters, setFilters] = useState({
    paperType: '',
    customerId: '',
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  });
  const [activeTab, setActiveTab] = useState(0);
  const printRef = useRef();
  const { user } = useAuth();

  useEffect(() => {
    fetchCustomers();
    fetchPaperTypes();
  }, []);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchData();
    }
  }, [filters]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/list?type=CUSTOMER`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPaperTypes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/production/paper-types`);
      if (!response.ok) throw new Error('Failed to fetch paper types');
      const data = await response.json();
      setPaperTypes(data);
    } catch (error) {
      console.error('Error fetching paper types:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchHistoryData(),
        fetchItemSummary()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.paperType) queryParams.append('paperType', filters.paperType);
      if (filters.customerId) queryParams.append('customerId', filters.customerId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());

      console.log('Fetching sale history with params:', Object.fromEntries(queryParams));
      
      const response = await fetch(`${config.apiUrl}/reports/sale-history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch history data');
      const data = await response.json();
      console.log('Sale history data:', data);
      setHistory(data);
    } catch (error) {
      console.error('Error fetching sale history data:', error);
    }
  };

  const fetchItemSummary = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.customerId) queryParams.append('customerId', filters.customerId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());

      console.log('Fetching sale summary with params:', Object.fromEntries(queryParams));
      
      const response = await fetch(`${config.apiUrl}/reports/sale-summary?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch item summary');
      const data = await response.json();
      console.log('Sale summary data:', data);
      setItemSummary(data);
    } catch (error) {
      console.error('Error fetching sale summary:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      // Check if the date is already formatted (DD/MM/YYYY)
      if (dateString.includes('/')) {
        return dateString;
      }
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    const printStyles = `
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        .report-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .report-title {
          font-size: 24px;
          font-weight: bold;
        }
        .report-subtitle {
          font-size: 16px;
          margin-top: 5px;
          color: #555;
        }
        .section-header {
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0 10px;
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
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .text-right {
          text-align: right;
        }
        .totals-row {
          font-weight: bold;
          background-color: #f5f5f5;
        }
        .filters-info {
          margin-bottom: 15px;
          font-size: 14px;
        }
        .filters-info p {
          margin: 5px 0;
        }
      </style>
    `;
    
    // Create header with filter information
    let printableContent = `
      <div class="report-header">
        <div class="report-title">Sale Summary Report</div>
        <div class="report-subtitle">Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </div>
      <div class="filters-info">
        <p><strong>Date Range:</strong> ${format(filters.startDate, 'dd/MM/yyyy')} to ${format(filters.endDate, 'dd/MM/yyyy')}</p>
        ${filters.paperType ? `<p><strong>Paper Type:</strong> ${filters.paperType}</p>` : ''}
        ${filters.customerId ? `<p><strong>Customer:</strong> ${customers.find(c => c.id === filters.customerId)?.account_name || ''}</p>` : ''}
      </div>
    `;
    
    // Add item summary section
    printableContent += `
      <div class="section-header">Paper-wise Sale Summary</div>
      <table>
        <thead>
          <tr>
            <th>Paper Type</th>
            <th class="text-right">Total Quantity</th>
            <th>Unit</th>
            <th class="text-right">Average Price</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemSummary.map(item => `
            <tr>
              <td>${item.paper_type || 'N/A'}</td>
              <td class="text-right">${Number(item.total_quantity).toLocaleString()}</td>
              <td>${item.unit || 'N/A'}</td>
              <td class="text-right">₨ ${Number(item.avg_price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
              <td class="text-right">₨ ${Math.round(item.total_amount).toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="3" class="text-right">Grand Total:</td>
            <td></td>
            <td class="text-right">₨ ${Math.round(itemSummary.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    `;
    
    // Add detailed history section
    printableContent += `
      <div class="section-header">Detailed Sale History</div>
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>GRN Number</th>
            <th>Paper Type</th>
            <th>Customer</th>
            <th class="text-right">Quantity</th>
            <th>Unit</th>
            <th class="text-right">Price</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(entry => `
            <tr>
              <td>${formatDate(entry.date_time)}</td>
              <td>${entry.grn_number || 'N/A'}</td>
              <td>${entry.paper_type || 'N/A'}</td>
              <td>${entry.customer_name || 'N/A'}</td>
              <td class="text-right">${entry.quantity}</td>
              <td>${entry.unit || 'N/A'}</td>
              <td class="text-right">${entry.price_per_unit ? `₨ ${Number(entry.price_per_unit).toLocaleString()}` : '-'}</td>
              <td class="text-right">${entry.total_amount ? `₨ ${Math.round(entry.total_amount).toLocaleString()}` : '-'}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="4" class="text-right">Totals:</td>
            <td class="text-right">${history.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0).toLocaleString()}</td>
            <td></td>
            <td></td>
            <td class="text-right">₨ ${Math.round(history.reduce((sum, entry) => sum + Number(entry.total_amount || 0), 0)).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    `;
    
    // Print the content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Summary Report</title>
          ${printStyles}
        </head>
        <body>
          ${printableContent}
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
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Sale Summary
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
          <Grid item xs={12} md={2.5}>
            <TextField
              select
              label="Paper Type"
              value={filters.paperType}
              onChange={(e) => setFilters(prev => ({ ...prev, paperType: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">All Papers</MenuItem>
              {paperTypes.map((type) => (
                <MenuItem key={type.id} value={type.name}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={2.5}>
            <TextField
              select
              label="Customer"
              value={filters.customerId}
              onChange={(e) => setFilters(prev => ({ ...prev, customerId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">All Customers</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.account_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={2.5}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Grid>
          </LocalizationProvider>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              fullWidth
              disabled={history.length === 0 && itemSummary.length === 0}
              sx={{ height: '56px' }}
            >
              Print Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mt: 2, mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Detailed Sale History" />
          <Tab label="Paper-wise Summary" />
        </Tabs>
      </Paper>

      <div id="printable-area" ref={printRef} style={{ display: 'none' }}></div>

      {loading ? (
        <Box className="stock-loading">
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading data...
          </Typography>
        </Box>
      ) : (
        <>
          {history.length === 0 && itemSummary.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No sale data found for the selected filters
              </Typography>
            </Box>
          ) : activeTab === 0 ? (
            <TableContainer component={Paper} className="stock-table-container">
              <Table>
                <TableHead>
                  <TableRow className="stock-table-header">
                    <TableCell>Date & Time</TableCell>
                    <TableCell>GRN Number</TableCell>
                    <TableCell>Paper Type</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>{formatDate(entry.date_time)}</TableCell>
                      <TableCell>{entry.grn_number}</TableCell>
                      <TableCell>{entry.paper_type}</TableCell>
                      <TableCell>{entry.customer_name || '-'}</TableCell>
                      <TableCell align="right">{entry.quantity}</TableCell>
                      <TableCell>{entry.unit}</TableCell>
                      <TableCell align="right">
                        {entry.price_per_unit ? `₨ ${Number(entry.price_per_unit).toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {entry.total_amount ? `₨ ${Math.round(entry.total_amount).toLocaleString()}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell colSpan={4} align="right">
                      <strong>Totals:</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>
                        {history.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0).toLocaleString()}
                      </strong>
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell align="right">
                      <strong>
                        ₨ {Math.round(history.reduce((sum, entry) => sum + Number(entry.total_amount || 0), 0)).toLocaleString()}
                      </strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <TableContainer component={Paper} className="stock-table-container">
              <Table>
                <TableHead>
                  <TableRow className="stock-table-header">
                    <TableCell>Paper Type</TableCell>
                    <TableCell align="right">Total Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Average Price</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemSummary.map((item) => (
                    <TableRow key={item.paper_type} hover>
                      <TableCell>{item.paper_type}</TableCell>
                      <TableCell align="right">{Number(item.total_quantity).toLocaleString()}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell align="right">
                        ₨ {Number(item.avg_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell align="right">
                        ₨ {Math.round(item.total_amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell colSpan={3} align="right">
                      <strong>Grand Total:</strong>
                    </TableCell>
                    <TableCell />
                    <TableCell align="right">
                      <strong>
                        ₨ {Math.round(itemSummary.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)).toLocaleString()}
                      </strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};

export default SaleSummary; 