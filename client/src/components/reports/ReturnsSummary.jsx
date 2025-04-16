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
  Tabs,
  Tab,
  Chip,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print, Refresh } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import config from '../../config';
import PropTypes from 'prop-types';

const ReturnsSummary = ({ data, totals, type }) => {
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [returnsData, setReturnsData] = useState({
    purchaseReturns: { data: [], totals: { totalQuantity: 0, totalAmount: 0 } },
    saleReturns: { data: [], totals: { totalQuantity: 0, totalAmount: 0 } },
    storeReturns: { data: [], totals: { totalQuantity: 0, totalAmount: 0 } },
    grandTotal: { totalQuantity: 0, totalAmount: 0 }
  });
  const printRef = useRef(null);

  const fetchReturnsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/reports/returns-summary?` +
        `startDate=${format(dateRange.startDate, "yyyy-MM-dd'T'00:00:00.000'Z'")}&` +
        `endDate=${format(dateRange.endDate, "yyyy-MM-dd'T'23:59:59.999'Z'")}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch returns data');
      const data = await response.json();
      setReturnsData(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch returns data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnsData();
  }, [dateRange]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Returns Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .date-range { text-align: center; margin-bottom: 20px; }
            .totals { margin-top: 20px; font-weight: bold; }
            .section { margin-bottom: 30px; }
            @media print {
              .no-break { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Returns Summary Report</h2>
          </div>
          <div class="date-range">
            <p>Period: ${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}</p>
          </div>
          ${generatePrintContent()}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  const generatePrintContent = () => {
    const sections = [
      {
        title: 'Purchase Returns',
        data: returnsData.purchaseReturns.data,
        totals: returnsData.purchaseReturns.totals
      },
      {
        title: 'Sale Returns',
        data: returnsData.saleReturns.data,
        totals: returnsData.saleReturns.totals
      },
      {
        title: 'Store Returns',
        data: returnsData.storeReturns.data,
        totals: returnsData.storeReturns.totals
      }
    ];

    return sections.map(section => `
      <div class="section no-break">
        <h3>${section.title}</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Return #</th>
              <th>Original GRN</th>
              <th>${section.title === 'Sale Returns' ? 'Customer' : section.title === 'Purchase Returns' ? 'Supplier' : 'Vendor'}</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Price/Unit</th>
              <th>Total Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${section.data.map(item => `
              <tr>
                <td>${format(new Date(item.return_date), 'dd/MM/yyyy')}</td>
                <td>${item.return_number}</td>
                <td>${item.original_grn_number}</td>
                <td>${item.supplier_name || item.customer_name || item.vendor_name}</td>
                <td>${item.item_type}</td>
                <td style="text-align: right">${parseFloat(item.return_quantity).toFixed(2)}</td>
                <td>${item.unit}</td>
                <td style="text-align: right">${parseFloat(item.price_per_unit).toFixed(2)}</td>
                <td style="text-align: right">${parseFloat(item.total_amount).toFixed(2)}</td>
                <td>${item.pricing_status || 'N/A'}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background-color: #f5f5f5;">
              <td colspan="5">Total ${section.title}</td>
              <td style="text-align: right">${section.totals.totalQuantity.toFixed(2)}</td>
              <td></td>
              <td></td>
              <td style="text-align: right">${section.totals.totalAmount.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `).join('') + `
      <div class="totals">
        <p>Grand Total Quantity: ${returnsData.grandTotal.totalQuantity.toFixed(2)}</p>
        <p>Grand Total Amount: ₨ ${returnsData.grandTotal.totalAmount.toFixed(2)}</p>
      </div>
    `;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ ml: '260px', mt: '20px', p: 3 }} ref={printRef}>
        <Typography variant="h4" gutterBottom>
          Returns Summary
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item>
            <DatePicker
              label="Start Date"
              value={dateRange.startDate}
              onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Grid>
          <Grid item>
            <DatePicker
              label="End Date"
              value={dateRange.endDate}
              onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchReturnsData}
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

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Purchase Returns" />
            <Tab label="Sale Returns" />
            <Tab label="Store Returns" />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <ReturnTable
                  data={returnsData.purchaseReturns.data}
                  totals={returnsData.purchaseReturns.totals}
                  type="purchase"
                />
              )}
              {tabValue === 1 && (
                <ReturnTable
                  data={returnsData.saleReturns.data}
                  totals={returnsData.saleReturns.totals}
                  type="sale"
                />
              )}
              {tabValue === 2 && (
                <ReturnTable
                  data={returnsData.storeReturns.data}
                  totals={returnsData.storeReturns.totals}
                  type="store"
                />
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

ReturnsSummary.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    // Add specific shape validation based on your data structure
  })).isRequired,
  totals: PropTypes.shape({
    totalQuantity: PropTypes.number.isRequired,
    totalAmount: PropTypes.number.isRequired
  }).isRequired,
  type: PropTypes.string.isRequired
};

const ReturnTable = ({ data, totals, type }) => {
  if (data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No {type} returns found for the selected period
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Return #</TableCell>
            <TableCell>Original GRN</TableCell>
            <TableCell>{type === 'sale' ? 'Customer' : type === 'purchase' ? 'Supplier' : 'Vendor'}</TableCell>
            <TableCell>Item</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell align="right">Price/Unit</TableCell>
            <TableCell align="right">Total Amount</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} hover>
              <TableCell>{format(new Date(item.return_date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>{item.return_number}</TableCell>
              <TableCell>{item.original_grn_number}</TableCell>
              <TableCell>{item.supplier_name || item.customer_name || item.vendor_name}</TableCell>
              <TableCell>{item.item_type}</TableCell>
              <TableCell align="right">{parseFloat(item.return_quantity).toFixed(2)}</TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell align="right">{parseFloat(item.price_per_unit).toFixed(2)}</TableCell>
              <TableCell align="right">{parseFloat(item.total_amount).toFixed(2)}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={item.pricing_status || 'N/A'}
                  color={item.pricing_status === 'PROCESSED' ? 'success' : 'warning'}
                />
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
            <TableCell colSpan={5}>Total {type.charAt(0).toUpperCase() + type.slice(1)} Returns</TableCell>
            <TableCell align="right">{totals.totalQuantity.toFixed(2)}</TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell align="right">{totals.totalAmount.toFixed(2)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

ReturnTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    return_date: PropTypes.string.isRequired,
    return_number: PropTypes.string.isRequired,
    original_grn_number: PropTypes.string.isRequired,
    supplier_name: PropTypes.string,
    customer_name: PropTypes.string,
    vendor_name: PropTypes.string,
    item_type: PropTypes.string.isRequired,
    return_quantity: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    price_per_unit: PropTypes.number.isRequired,
    total_amount: PropTypes.number.isRequired,
    pricing_status: PropTypes.string
  })).isRequired,
  totals: PropTypes.shape({
    totalQuantity: PropTypes.number.isRequired,
    totalAmount: PropTypes.number.isRequired
  }).isRequired,
  type: PropTypes.oneOf(['purchase', 'sale', 'store']).isRequired
};

export default ReturnsSummary; 