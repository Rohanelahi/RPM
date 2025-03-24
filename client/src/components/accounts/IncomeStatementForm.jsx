import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import { format } from 'date-fns';
import './../../styles/IncomeStatement.css';

const AdjustmentDialog = ({ 
  open, 
  onClose, 
  adjustment, 
  setAdjustment, 
  onSubmit, 
  error, 
  isMonthEnded,
  materialTypes,
  boilerFuelTypes,
  fetchCurrentValue 
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Quantity Adjustment</DialogTitle>
    <DialogContent>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={adjustment.category}
          onChange={(e) => {
            const category = e.target.value;
            if (category === 'MATERIALS') {
              setAdjustment(prev => ({
                ...prev,
                category,
                subType: '',
                currentValue: 0,
                newValue: 0,
                difference: 0
              }));
            } else {
              fetchCurrentValue(category);
            }
          }}
        >
          <MenuItem value="MATERIALS">Raw Materials (kg)</MenuItem>
          <MenuItem value="BOILER_FUEL">Boiler Fuel (kg)</MenuItem>
          <MenuItem value="ENERGY">Electricity (units)</MenuItem>
        </Select>
      </FormControl>

      {adjustment.category === 'MATERIALS' && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Material Type</InputLabel>
          <Select
            value={adjustment.subType || ''}
            onChange={(e) => fetchCurrentValue('MATERIALS', e.target.value)}
          >
            {materialTypes.map(type => (
              <MenuItem key={type.raddi_type} value={type.raddi_type}>
                {type.raddi_type} ({type.total_quantity} kg)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {adjustment.category === 'BOILER_FUEL' && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Boiler Fuel Type</InputLabel>
          <Select
            value={adjustment.subType || ''}
            onChange={(e) => fetchCurrentValue('BOILER_FUEL', e.target.value)}
          >
            {boilerFuelTypes.map(type => (
              <MenuItem key={type.boiler_fuel_type} value={type.boiler_fuel_type}>
                {type.boiler_fuel_type} ({type.total_quantity} kg)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {adjustment.category === 'ENERGY' ? (
        <>
          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="Current Cost (Rs.)"
            type="number"
            value={adjustment.currentValue}
            disabled
          />

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="New Cost (Rs.)"
            type="number"
            value={adjustment.newValue}
            onChange={(e) => {
              const value = e.target.value;
              setAdjustment(prev => ({
                ...prev,
                newValue: value,
                difference: value === '' ? 0 : parseFloat(value) - prev.currentValue
              }));
            }}
            inputProps={{ 
              step: "0.01",
              min: "0"
            }}
          />

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="Difference (Rs.)"
            type="number"
            value={adjustment.difference}
            disabled
          />
        </>
      ) : (
        <>
          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label={`Current Quantity (kg)`}
            type="number"
            value={adjustment.currentValue}
            disabled
          />

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label={`New Quantity (kg)`}
            type="number"
            value={adjustment.newValue}
            onChange={(e) => {
              const value = e.target.value;
              setAdjustment(prev => ({
                ...prev,
                newValue: value,
                difference: value === '' ? 0 : parseFloat(value) - prev.currentValue
              }));
            }}
            inputProps={{ 
              step: "0.01",
              min: "0"
            }}
          />

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label={`Difference (kg)`}
            type="number"
            value={adjustment.difference}
            disabled
          />
        </>
      )}

      <TextField
        fullWidth
        sx={{ mt: 2 }}
        label="Remarks"
        multiline
        rows={4}
        value={adjustment.remarks}
        onChange={(e) => setAdjustment(prev => ({
          ...prev,
          remarks: e.target.value
        }))}
        placeholder="Please explain the reason for quantity adjustment..."
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button 
        onClick={onSubmit} 
        variant="contained"
        disabled={!isMonthEnded || adjustment.difference === 0}
      >
        Add Adjustment
      </Button>
    </DialogActions>
  </Dialog>
);

const IncomeStatementForm = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    labor: {
      total: 0
    },
    materials: {
      items: [],
      total: 0
    },
    boilerFuel: {
      items: [],
      total: 0
    },
    energy: {
      totalUnits: 0,
      averageRate: 0,
      totalCost: 0
    },
    maintenance: {
      total: 0
    },
    production: {
      items: [],
      totalRevenue: 0
    },
    summary: {
      totalExpenses: 0,
      totalRevenue: 0,
      netProfit: 0,
      profitMargin: 0
    },
    expenses: {
      items: [],
      total: 0
    }
  });
  const [isPrinted, setIsPrinted] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [adjustment, setAdjustment] = useState({
    category: 'MATERIALS',
    currentValue: 0,
    newValue: 0,
    difference: 0,
    remarks: ''
  });
  const [adjustmentError, setAdjustmentError] = useState('');
  const [materialTypes, setMaterialTypes] = useState([]);
  const [boilerFuelTypes, setBoilerFuelTypes] = useState([]);

  const categories = [
    { value: 'MATERIALS', label: 'Raw Materials (kg)' },
    { value: 'BOILER_FUEL', label: 'Boiler Fuel (kg)' },
    { value: 'ENERGY', label: 'Electricity (units)' }
  ];

  useEffect(() => {
    fetchIncomeStatementData();
  }, [selectedMonth]);

  const fetchIncomeStatementData = async () => {
    try {
      setLoading(true);
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      const response = await fetch(`http://localhost:5000/api/accounts/income-statement/${month}/${year}`);
      if (!response.ok) throw new Error('Failed to fetch income statement data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching income statement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return; // Guard clause to prevent printing if data is not loaded

    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0;">Income Statement</h2>
          <p style="margin: 5px 0;">For the Month of ${format(selectedMonth, 'MMMM yyyy')}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Production Costs</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Labor Cost:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.labor?.total || 0).toLocaleString()}
              </td>
            </tr>
            
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <strong>Raw Materials:</strong>
                <div style="padding-left: 20px;">
                  ${(data?.materials?.items || []).map(item => `
                    <div>${item.type}: ${item.quantity.toLocaleString()} kg @ Rs. ${item.unitPrice.toLocaleString()}/kg</div>
                  `).join('')}
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.materials?.total || 0).toLocaleString()}
                ${(data?.materials?.total !== data?.materials?.adjustedTotal) ? 
                  `<div style="color: #1976d2;">Adjusted: Rs. ${(data?.materials?.adjustedTotal || 0).toLocaleString()}</div>` : ''}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <strong>Boiler Fuel:</strong>
                <div style="padding-left: 20px;">
                  ${(data?.boilerFuel?.items || []).map(item => `
                    <div>${item.type}: ${item.quantity.toLocaleString()} kg @ Rs. ${item.unitPrice.toLocaleString()}/kg</div>
                  `).join('')}
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.boilerFuel?.total || 0).toLocaleString()}
                ${(data?.boilerFuel?.total !== data?.boilerFuel?.adjustedTotal) ? 
                  `<div style="color: #1976d2;">Adjusted: Rs. ${(data?.boilerFuel?.adjustedTotal || 0).toLocaleString()}</div>` : ''}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <strong>Energy Cost:</strong>
                <div style="padding-left: 20px;">
                  <div>Total Units: ${(data?.energy?.totalUnits || 0).toLocaleString()}</div>
                  <div>Rate: Rs. ${(data?.energy?.averageRate || 0).toLocaleString()}/unit</div>
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.energy?.total || 0).toLocaleString()}
                ${(data?.energy?.total !== data?.energy?.adjustedTotal) ? 
                  `<div style="color: #1976d2;">Adjusted: Rs. ${(data?.energy?.adjustedTotal || 0).toLocaleString()}</div>` : ''}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <strong>Maintenance Cost:</strong>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.maintenance?.total || 0).toLocaleString()}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <strong>Additional Expenses:</strong>
                <div style="padding-left: 20px;">
                  ${(data?.expenses?.items || []).map(expense => `
                    <div>${expense.type}: Rs. ${expense.amount.toLocaleString()}</div>
                  `).join('')}
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.expenses?.total || 0).toLocaleString()}
              </td>
            </tr>

            <tr style="background-color: #f5f5f5;">
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Expenses:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                <strong>Rs. ${(data?.summary?.totalExpenses || 0).toLocaleString()}</strong>
                ${(data?.summary?.totalExpenses !== data?.summary?.adjustedTotalExpenses) ? 
                  `<div style="color: #1976d2;">Adjusted: Rs. ${(data?.summary?.adjustedTotalExpenses || 0).toLocaleString()}</div>` : ''}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Production and Sales</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Paper Type</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Production (kg)</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Sales (kg)</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Avg. Price</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Revenue</th>
            </tr>
            ${(data?.production?.items || []).map(item => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.paperType}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.totalProduction.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.totalSold.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.averagePrice.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.revenue.toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Revenue:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.production?.totalRevenue || 0).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Expenses:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                Rs. ${(data?.summary?.totalExpenses || 0).toLocaleString()}
                ${(data?.summary?.totalExpenses !== data?.summary?.adjustedTotalExpenses) ? 
                  `<div style="color: #1976d2;">Adjusted: Rs. ${(data?.summary?.adjustedTotalExpenses || 0).toLocaleString()}</div>` : ''}
              </td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Net Profit/Loss:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                <strong style="color: ${(data?.summary?.netProfit || 0) >= 0 ? '#2e7d32' : '#d32f2f'}">
                  Rs. ${(data?.summary?.netProfit || 0).toLocaleString()}
                </strong>
                ${(data?.summary?.netProfit !== data?.summary?.adjustedNetProfit) ? 
                  `<div style="color: ${(data?.summary?.adjustedNetProfit || 0) >= 0 ? '#2e7d32' : '#d32f2f'}">
                    Adjusted: Rs. ${(data?.summary?.adjustedNetProfit || 0).toLocaleString()}
                  </div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Profit Margin:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                ${(data?.summary?.profitMargin || 0).toFixed(2)}%
                ${(data?.summary?.profitMargin !== data?.summary?.adjustedProfitMargin) ? 
                  `<div style="color: #1976d2;">Adjusted: ${(data?.summary?.adjustedProfitMargin || 0).toFixed(2)}%</div>` : ''}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div style="text-align: center;">
            <div style="margin-bottom: 40px;">____________________</div>
            <div>Prepared By</div>
          </div>
          <div style="text-align: center;">
            <div style="margin-bottom: 40px;">____________________</div>
            <div>Approved By</div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Income Statement - ${format(selectedMonth, 'MMMM yyyy')}</title>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const isMonthEnded = (date) => {
    const currentDate = new Date();
    const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date < firstDayOfCurrentMonth;
  };

  const fetchMaterialTypes = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await fetch(
        `http://localhost:5000/api/accounts/income-statement/materials-types/${month}/${year}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch material types');
      
      const data = await response.json();
      setMaterialTypes(data);
    } catch (error) {
      console.error('Error fetching material types:', error);
      setAdjustmentError('Failed to fetch material types');
    }
  };

  const fetchBoilerFuelTypes = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await fetch(
        `http://localhost:5000/api/accounts/income-statement/boiler-fuel-types/${month}/${year}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch boiler fuel types');
      
      const data = await response.json();
      setBoilerFuelTypes(data);
    } catch (error) {
      console.error('Error fetching boiler fuel types:', error);
      setAdjustmentError('Failed to fetch boiler fuel types');
    }
  };

  const fetchCurrentValue = async (category, subType = null) => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const url = subType 
        ? `http://localhost:5000/api/accounts/income-statement/current-value/${month}/${year}/${category}/${subType}`
        : `http://localhost:5000/api/accounts/income-statement/current-value/${month}/${year}/${category}`;
      
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch current value');
      
      const data = await response.json();
      setAdjustment(prev => ({
        ...prev,
        category,
        subType,
        currentValue: data.currentValue,
        newValue: data.currentValue,
        difference: 0
      }));
    } catch (error) {
      console.error('Error fetching current value:', error);
      setAdjustmentError('Failed to fetch current value');
    }
  };

  useEffect(() => {
    if (adjustmentDialog) {
      fetchMaterialTypes();
      if (adjustment.category === 'BOILER_FUEL') {
        fetchBoilerFuelTypes();
      }
      fetchCurrentValue(adjustment.category, adjustment.subType);
    }
  }, [adjustmentDialog, adjustment.category]);

  const handleAddAdjustment = async () => {
    try {
      setAdjustmentError('');
      
      if (!isMonthEnded(selectedMonth)) {
        setAdjustmentError('Adjustments can only be made for past months');
        return;
      }

      const response = await fetch('http://localhost:5000/api/accounts/income-statement/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: selectedMonth.getMonth() + 1,
          year: selectedMonth.getFullYear(),
          category: adjustment.category,
          subType: adjustment.subType,
          newValue: adjustment.newValue,
          remarks: adjustment.remarks
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setAdjustmentError(data.error);
        return;
      }
      
      // Refresh data and close dialog
      fetchIncomeStatementData();
      setAdjustmentDialog(false);
    } catch (error) {
      console.error('Error adding adjustment:', error);
      setAdjustmentError('Failed to add adjustment');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="income-statement-container">
        <Paper className="income-statement-paper">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom className="income-statement-title">
                Income Statement
              </Typography>
            </Grid>

            <Grid item xs={12} md={4} className="income-statement-filters">
              <DatePicker
                views={['year', 'month']}
                label="Select Month"
                minDate={new Date('2021-01-01')}
                maxDate={new Date()}
                value={selectedMonth}
                onChange={(newValue) => setSelectedMonth(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            {loading ? (
              <Grid item xs={12} className="income-statement-loading">
                <CircularProgress />
              </Grid>
            ) : (
              <>
                <Grid item xs={12}>
                  <TableContainer>
                    <Table className="income-statement-table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Amount (Rs.)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <Typography>Labor Cost</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">{data.labor.total.toLocaleString()}</Typography>
                          </TableCell>
                        </TableRow>

                        {/* Raw Materials Cost Row */}
                        <TableRow>
                          <TableCell>
                            <Typography>Raw Materials Cost</Typography>
                            <Box sx={{ pl: 2 }}>
                              {data?.materials?.items?.map((item, index) => (
                                <Box key={index}>
                                  <Typography variant="body2">
                                    {item.type}: {(item.quantity || 0).toLocaleString()} kg 
                                    @ Rs.{(item.unitPrice || 0).toFixed(2)}/kg
                                    = Rs.{(item.totalCost || 0).toLocaleString()}
                                  </Typography>
                                  {item.quantity !== item.adjustedQuantity && (
                                    <Typography color="primary" variant="body2" sx={{ pl: 2 }}>
                                      Adjusted: {(item.adjustedQuantity || 0).toLocaleString()} kg 
                                      @ Rs.{(item.unitPrice || 0).toFixed(2)}/kg
                                      = Rs.{(item.adjustedCost || 0).toLocaleString()}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">
                              Rs.{(data?.materials?.total || 0).toLocaleString()}
                            </Typography>
                            {data?.materials?.total !== data?.materials?.adjustedTotal && (
                              <Typography color="primary" variant="subtitle2">
                                Adjusted: Rs.{(data?.materials?.adjustedTotal || 0).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Boiler Fuel Cost Row */}
                        <TableRow>
                          <TableCell>
                            <Typography>Boiler Fuel Cost</Typography>
                            <Box sx={{ pl: 2 }}>
                              {data?.boilerFuel?.items?.map((item, index) => (
                                <Box key={index}>
                                  <Typography variant="body2">
                                    {item.type}: {(item.quantity || 0).toLocaleString()} kg 
                                    @ Rs.{(item.unitPrice || 0).toFixed(2)}/kg
                                    = Rs.{(item.totalCost || 0).toLocaleString()}
                                  </Typography>
                                  {item.quantity !== item.adjustedQuantity && (
                                    <Typography color="primary" variant="body2" sx={{ pl: 2 }}>
                                      Adjusted: {(item.adjustedQuantity || 0).toLocaleString()} kg 
                                      @ Rs.{(item.unitPrice || 0).toFixed(2)}/kg
                                      = Rs.{(item.adjustedCost || 0).toLocaleString()}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">
                              Rs.{(data?.boilerFuel?.total || 0).toLocaleString()}
                            </Typography>
                            {data?.boilerFuel?.items?.some(item => item.quantity !== item.adjustedQuantity) && (
                              <Typography color="primary" variant="subtitle2">
                                Adjusted: Rs.{data?.boilerFuel?.items?.reduce((sum, item) => 
                                  sum + (item.adjustedCost || item.totalCost), 0).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Energy Cost Row */}
                        <TableRow>
                          <TableCell>
                            <Typography>Energy Cost</Typography>
                            <Box sx={{ pl: 2 }}>
                              <Typography variant="body2">
                                Units Consumed: {(data?.energy?.totalUnits || 0).toLocaleString()} units
                                @ Rs.{(data?.energy?.averageRate || 0).toFixed(2)}/unit
                              </Typography>
                              <Typography variant="body2">
                                Total Cost: Rs.{(data?.energy?.totalCost || 0).toLocaleString()}
                                {data?.energy?.totalCost !== data?.energy?.adjustedCost && (
                                  <Typography color="primary" variant="body2" sx={{ pl: 2 }}>
                                    Adjusted Cost: Rs.{(data?.energy?.adjustedCost || 0).toLocaleString()}
                                  </Typography>
                                )}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">{(data?.energy?.totalCost || 0).toLocaleString()}</Typography>
                            {data?.energy?.totalCost !== data?.energy?.adjustedCost && (
                              <Typography color="primary" variant="subtitle2">
                                Adjusted: Rs.{(data?.energy?.adjustedCost || 0).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Maintenance Cost Row */}
                        <TableRow>
                          <TableCell>
                            <Typography>Maintenance Cost</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">{data.maintenance.total.toLocaleString()}</Typography>
                          </TableCell>
                        </TableRow>

                        {/* Additional Expenses Row */}
                        <TableRow>
                          <TableCell>
                            <Typography>Additional Expenses</Typography>
                            <Box sx={{ pl: 2 }}>
                              {data?.expenses?.items?.map((expense, index) => (
                                <Typography key={index} variant="body2">
                                  {expense.type}: Rs. {expense.amount.toLocaleString()}
                                </Typography>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">
                              Rs. {(data?.expenses?.total || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>

                        {/* Total Row with Adjusted Values */}
                        <TableRow>
                          <TableCell>
                            <Typography variant="subtitle1" fontWeight="bold">Total Expenses</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2">
                              Rs.{(data?.summary?.totalExpenses || 0).toLocaleString()}
                            </Typography>
                            {data?.summary?.totalExpenses !== data?.summary?.adjustedTotalExpenses && (
                              <Typography color="primary" variant="subtitle2">
                                Adjusted: Rs. {(data?.summary?.adjustedTotalExpenses || 0).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Production and Sales
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Paper Type</TableCell>
                          <TableCell align="right">Production (kg)</TableCell>
                          <TableCell align="right">Sales (kg)</TableCell>
                          <TableCell align="right">Avg. Price</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.production.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.paperType}</TableCell>
                            <TableCell align="right">{item.totalProduction.toLocaleString()}</TableCell>
                            <TableCell align="right">{item.totalSold.toLocaleString()}</TableCell>
                            <TableCell align="right">{item.averagePrice.toLocaleString()}</TableCell>
                            <TableCell align="right">{item.revenue.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Profit & Loss Summary
                  </Typography>
                  <Grid container spacing={3}>
                    {/* First Row */}
                    <Grid item xs={12} md={6} lg={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            Total Revenue
                          </Typography>
                          <Typography variant="h6">
                            Rs. {data.production.totalRevenue.toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            Total Expenses
                          </Typography>
                          <Typography variant="h6">
                            Rs. {(data?.summary?.totalExpenses || 0).toLocaleString()}
                          </Typography>
                          {data?.summary?.totalExpenses !== data?.summary?.adjustedTotalExpenses && (
                            <Typography color="primary" variant="h6">
                              Adjusted: Rs. {(data?.summary?.adjustedTotalExpenses || 0).toLocaleString()}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Second Row */}
                    <Grid item xs={12} md={6} lg={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            Net Profit/Loss
                          </Typography>
                          <Typography 
                            variant="h6"
                            color={data?.summary?.netProfit >= 0 ? 'success.main' : 'error.main'}
                          >
                            Rs. {(data?.summary?.netProfit || 0).toLocaleString()}
                          </Typography>
                          {data?.summary?.netProfit !== data?.summary?.adjustedNetProfit && (
                            <Typography 
                              variant="h6"
                              color={data?.summary?.adjustedNetProfit >= 0 ? 'success.main' : 'error.main'}
                            >
                              Adjusted: Rs. {(data?.summary?.adjustedNetProfit || 0).toLocaleString()}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            Profit Margin
                          </Typography>
                          <Typography variant="h6">
                            {(data?.summary?.profitMargin || 0).toFixed(2)}%
                          </Typography>
                          {data?.summary?.profitMargin !== data?.summary?.adjustedProfitMargin && (
                            <Typography color="primary" variant="h6">
                              Adjusted: {(data?.summary?.adjustedProfitMargin || 0).toFixed(2)}%
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => setAdjustmentDialog(true)}
                      disabled={!isMonthEnded(selectedMonth)}
                    >
                      Add Adjustment
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Print />}
                      onClick={handlePrint}
                    >
                      Print
                    </Button>
                  </Stack>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      </Box>
      <AdjustmentDialog 
        open={adjustmentDialog}
        onClose={() => setAdjustmentDialog(false)}
        adjustment={adjustment}
        setAdjustment={setAdjustment}
        onSubmit={handleAddAdjustment}
        error={adjustmentError}
        isMonthEnded={isMonthEnded(selectedMonth)}
        materialTypes={materialTypes}
        boilerFuelTypes={boilerFuelTypes}
        fetchCurrentValue={fetchCurrentValue}
      />
    </LocalizationProvider>
  );
};

export default IncomeStatementForm; 