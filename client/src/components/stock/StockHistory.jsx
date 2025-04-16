import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  MenuItem,
  Grid,
  Button,
  Stack,
  Tabs,
  Tab
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';
import '../../styles/Stock.css';
import config from '../../config';

const StockHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [itemSummary, setItemSummary] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({
    itemType: '',
    supplierId: '',
    startDate: null,
    endDate: null
  });
  const [activeTab, setActiveTab] = useState(0);
  const printRef = useRef();

  const itemTypes = [
    'Petti',
    'Mix Maal',
    'Dabbi',
    'Cement Bag',
    'Pulp',
    'Boiler Fuel (Toori)',
    'Boiler Fuel (Tukka)'
  ];

  useEffect(() => {
    fetchSuppliers();
    fetchData();
  }, [filters]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/accounts/list?type=SUPPLIER');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const pakistanTime = new Date(date.getTime() + (5 * 60 * 60 * 1000)); // Add 5 hours for Pakistan timezone

    return pakistanTime.toLocaleString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchHistoryData(),
      fetchItemSummary()
    ]);
    setLoading(false);
  };

  const fetchHistoryData = async () => {
    try {
      const queryParams = new URLSearchParams({
        itemType: filters.itemType,
        supplierId: filters.supplierId,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      });

      const response = await fetch(`http://localhost:5000/api/stock/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch history data');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history data:', error);
    }
  };

  const fetchItemSummary = async () => {
    try {
      const queryParams = new URLSearchParams({
        supplierId: filters.supplierId,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      });

      const response = await fetch(`http://localhost:5000/api/stock/item-summary?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch item summary');
      const data = await response.json();
      setItemSummary(data);
    } catch (error) {
      console.error('Error fetching item summary:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    const originalContents = document.body.innerHTML;
    
    const printStyles = `
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          font-family: Arial, sans-serif;
        }
        .print-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .print-header h1 {
          margin: 0;
          font-size: 24px;
          color: #1976d2;
        }
        .print-header p {
          margin: 5px 0;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
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
        .text-right {
          text-align: right;
        }
        .totals-row {
          font-weight: bold;
          background-color: #f5f5f5;
        }
        .filter-info {
          margin-bottom: 15px;
          font-size: 12px;
        }
        .section-header {
          margin-top: 30px;
          margin-bottom: 10px;
          font-size: 18px;
          color: #1976d2;
        }
        .supplier-column {
          width: 25%;
        }
      </style>
    `;
    
    // Get supplier name if selected
    const selectedSupplier = suppliers.find(s => s.id === filters.supplierId);
    const supplierName = selectedSupplier ? selectedSupplier.account_name : 'All Suppliers';
    
    // Format date range for display
    const startDateStr = filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Any';
    const endDateStr = filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Any';
    
    let printableContent = `
      <div class="print-header">
        <h1>Purchase Summary</h1>
        <p>Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <div class="filter-info">
          <p>Item Type: ${filters.itemType || 'All'} | Supplier: ${supplierName} | Date Range: ${startDateStr} to ${endDateStr}</p>
        </div>
      </div>
    `;
    
    // Add item summary section
    printableContent += `
      <div class="section-header">Item-wise Purchase Summary</div>
      <table>
        <thead>
          <tr>
            <th>Item Type</th>
            <th class="text-right">Total Quantity</th>
            <th class="text-right">Average Price</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemSummary.map(item => `
            <tr>
              <td>${item.item_type}</td>
              <td class="text-right">${Number(item.total_quantity).toLocaleString()} ${item.unit}</td>
              <td class="text-right">₨ ${Number(item.avg_price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
              <td class="text-right">₨ ${Math.round(item.total_amount).toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="2" class="text-right">Grand Total:</td>
            <td></td>
            <td class="text-right">₨ ${Math.round(itemSummary.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    `;
    
    // Add detailed purchase history section if we're on that tab or if we want to include both
    if (activeTab === 0 || true) { // Always include both sections
      printableContent += `
        <div class="section-header">Detailed Purchase History</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="supplier-column">Supplier</th>
              <th>Item Type</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Price/Unit</th>
              <th class="text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(entry => `
              <tr>
                <td>${formatDate(entry.date)}</td>
                <td class="supplier-column">${entry.supplier_name || '-'}</td>
                <td>${entry.item_type}</td>
                <td class="text-right">${entry.quantity} ${entry.unit}</td>
                <td class="text-right">${entry.price ? `₨ ${Number(entry.price).toLocaleString()}` : '-'}</td>
                <td class="text-right">${entry.total_amount ? `₨ ${Math.round(entry.total_amount).toLocaleString()}` : '-'}</td>
              </tr>
            `).join('')}
            <tr class="totals-row">
              <td colspan="3" class="text-right">Totals:</td>
              <td class="text-right">${history.reduce((sum, entry) => sum + Number(entry.quantity), 0).toLocaleString()}</td>
              <td></td>
              <td class="text-right">₨ ${Math.round(history.reduce((sum, entry) => sum + Number(entry.total_amount || 0), 0)).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      `;
    }
    
    const windowContent = `
      <html>
        <head>
          ${printStyles}
        </head>
        <body>
          ${printableContent}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(windowContent);
    printWindow.document.close();
    
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    };
  };

  return (
    <Box className="stock-container">
      <Paper className="stock-header">
        <Typography variant="h4">
          Purchase Summary
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
          <Grid item xs={12} md={2.5}>
            <TextField
              select
              label="Item Type"
              value={filters.itemType}
              onChange={(e) => setFilters(prev => ({ ...prev, itemType: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">All Items</MenuItem>
              {itemTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <TextField
              select
              label="Supplier"
              value={filters.supplierId}
              onChange={(e) => setFilters(prev => ({ ...prev, supplierId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">All Suppliers</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.account_name}
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
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
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
          <Tab label="Detailed Purchase History" />
          <Tab label="Item-wise Summary" />
        </Tabs>
      </Paper>

      <div id="printable-area" ref={printRef} style={{ display: 'none' }}></div>

      {loading ? (
        <Box className="stock-loading">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {activeTab === 0 ? (
            <TableContainer component={Paper} className="stock-table-container">
              <Table>
                <TableHead>
                  <TableRow className="stock-table-header">
                    <TableCell>Date</TableCell>
                    <TableCell>GRN Number</TableCell>
                    <TableCell>Item Type</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Price/Unit</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.reference_number}</TableCell>
                      <TableCell>{entry.item_type}</TableCell>
                      <TableCell>{entry.supplier_name || '-'}</TableCell>
                      <TableCell align="right">{entry.quantity}</TableCell>
                      <TableCell>{entry.unit}</TableCell>
                      <TableCell align="right">
                        {entry.price ? `₨ ${Number(entry.price).toLocaleString()}` : '-'}
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
                        {history.reduce((sum, entry) => sum + Number(entry.quantity), 0).toLocaleString()}
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
                    <TableCell>Item Type</TableCell>
                    <TableCell align="right">Total Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Average Price</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemSummary.map((item) => (
                    <TableRow key={item.item_type} hover>
                      <TableCell>{item.item_type}</TableCell>
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

export default StockHistory; 