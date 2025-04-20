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
import useItems from '../../hooks/useItems';
import '../../styles/Stock.css';
import config from '../../config';

const PurchaseSummary = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [itemSummary, setItemSummary] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [filters, setFilters] = useState({
    itemType: '',
    supplierId: '',
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  });
  const [activeTab, setActiveTab] = useState(0);
  const printRef = useRef();
  const { user } = useAuth();

  useEffect(() => {
    fetchSuppliers();
    fetchItemTypes();
  }, []);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchData();
    }
  }, [filters]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/list?type=SUPPLIER`);
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchItemTypes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/gate/item-types`);
      if (!response.ok) throw new Error('Failed to fetch item types');
      const data = await response.json();
      setItemTypes(data);
    } catch (error) {
      console.error('Error fetching item types:', error);
      alert('Failed to fetch item types');
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
      
      if (filters.itemType) queryParams.append('itemType', filters.itemType);
      if (filters.supplierId) queryParams.append('supplierId', filters.supplierId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());

      const response = await fetch(`${config.apiUrl}/stock/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch history data');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching purchase history data:', error);
    }
  };

  const fetchItemSummary = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.supplierId) queryParams.append('supplierId', filters.supplierId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());

      const response = await fetch(`${config.apiUrl}/stock/item-summary?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch item summary');
      const data = await response.json();
      setItemSummary(data);
    } catch (error) {
      console.error('Error fetching purchase summary:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
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
        body { font-family: Arial, sans-serif; margin: 20px; }
        .report-header { text-align: center; margin-bottom: 20px; }
        .report-title { font-size: 24px; font-weight: bold; }
        .report-subtitle { font-size: 16px; margin-top: 5px; color: #555; }
        .section-header { font-size: 18px; font-weight: bold; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .text-right { text-align: right; }
        .totals-row { font-weight: bold; background-color: #f5f5f5; }
        .filters-info { margin-bottom: 15px; font-size: 14px; }
        .filters-info p { margin: 5px 0; }
      </style>
    `;
    
    let printableContent = `
      <div class="report-header">
        <div class="report-title">Purchase Summary Report</div>
        <div class="report-subtitle">Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </div>
      <div class="filters-info">
        <p><strong>Date Range:</strong> ${format(filters.startDate, 'dd/MM/yyyy')} to ${format(filters.endDate, 'dd/MM/yyyy')}</p>
        ${filters.itemType ? `<p><strong>Item Type:</strong> ${filters.itemType}</p>` : ''}
        ${filters.supplierId ? `<p><strong>Supplier:</strong> ${suppliers.find(s => s.id === filters.supplierId)?.account_name || ''}</p>` : ''}
      </div>
    `;
    
    printableContent += `
      <div class="section-header">Item-wise Purchase Summary</div>
      <table>
        <thead>
          <tr>
            <th>Item Type</th>
            <th class="text-right">Total Quantity</th>
            <th>Unit</th>
            <th class="text-right">Average Price</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemSummary.map(item => `
            <tr>
              <td>${item.item_type || 'N/A'}</td>
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
    
    printableContent += `
      <div class="section-header">Detailed Purchase History</div>
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>GRN Number</th>
            <th>Item Type</th>
            <th>Supplier</th>
            <th class="text-right">Quantity</th>
            <th>Unit</th>
            <th class="text-right">Price</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(entry => `
            <tr>
              <td>${formatDate(entry.date)}</td>
              <td>${entry.reference_number || 'N/A'}</td>
              <td>${entry.item_type || 'N/A'}</td>
              <td>${entry.supplier_name || 'N/A'}</td>
              <td class="text-right">${entry.quantity}</td>
              <td>${entry.unit || 'N/A'}</td>
              <td class="text-right">${entry.price ? `₨ ${Number(entry.price).toLocaleString()}` : '-'}</td>
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
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Summary Report</title>
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
    <Box className="stock-container" sx={{ ml: '300px', mt: '20px' }}>
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
                <MenuItem key={type.id} value={type.name}>
                  {type.name}
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
          <Tab label="Detailed Purchase History" />
          <Tab label="Item-wise Summary" />
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
                No purchase data found for the selected filters
              </Typography>
            </Box>
          ) : activeTab === 0 ? (
            <TableContainer component={Paper} className="stock-table-container">
              <Table>
                <TableHead>
                  <TableRow className="stock-table-header">
                    <TableCell>Date & Time</TableCell>
                    <TableCell>GRN Number</TableCell>
                    <TableCell>Item Type</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Price</TableCell>
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

export default PurchaseSummary; 