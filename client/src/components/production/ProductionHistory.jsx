import React, { useState, useEffect } from 'react';
import './../../styles/ProductionHistory.css';
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
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { KeyboardArrowDown, KeyboardArrowUp, Print } from '@mui/icons-material';
import { format } from 'date-fns';

const ProductionHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [newEntryId, setNewEntryId] = useState(null);
  const [filters, setFilters] = useState({
    paperType: '',
    startDate: null,
    endDate: null
  });
  const [dailyExpenses, setDailyExpenses] = useState({});
  const [perKgCosts, setPerKgCosts] = useState({});

  const paperTypes = ['SUPER', 'CMP', 'BOARD'];

  useEffect(() => {
    fetchHistoryData();
  }, [filters]);

  useEffect(() => {
    if (newEntryId) {
      setExpandedRow(newEntryId);
      const timer = setTimeout(() => {
        setNewEntryId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newEntryId]);

  useEffect(() => {
    if (history.length > 0) {
      history.forEach(async (row) => {
        const cost = await calculatePerKgCost(row);
        setPerKgCosts(prev => ({
          ...prev,
          [row.id]: cost
        }));
      });
    }
  }, [history]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
  };

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        paperType: filters.paperType,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      });

      const response = await fetch(`http://localhost:5000/api/production/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch history data');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRaddiUsed = (recipe) => {
    if (!recipe) return '';
    return recipe.map(item => 
      `${item.raddi_type}: ${parseFloat(item.quantity_used || 0).toFixed(2)} kg`
    ).join(', ');
  };

  const fetchDailyExpenses = async (date) => {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const queryParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await fetch(`http://localhost:5000/api/accounts/expenses/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      
      const data = await response.json();
      const totalExpense = data.reduce((sum, expense) => sum + Number(expense.amount), 0);
      setDailyExpenses(prev => ({
        ...prev,
        [date]: totalExpense
      }));
      return totalExpense;
    } catch (error) {
      console.error('Error fetching daily expenses:', error);
      return 0;
    }
  };

  const calculatePerKgCost = async (row) => {
    if (!row || !row.recipe) return '0.00';
    
    // Ensure recipe is an array
    const recipe = Array.isArray(row.recipe) ? row.recipe : [];
    
    const raddiCost = recipe.reduce((total, item) => {
      return total + (parseFloat(item.quantity_used || 0) * parseFloat(item.unit_price || 0));
    }, 0);

    const boilerFuelCost = parseFloat(row.boiler_fuel_quantity || 0) * parseFloat(row.boiler_fuel_price || 0);
    const electricityCost = parseFloat(row.electricity_cost || 0);
    const maintenanceCost = parseFloat(row.maintenance_cost || 0);
    const laborCost = parseFloat(row.labor_cost || 0);
    const contractorsCost = parseFloat(row.contractors_cost || 0);
    const dailyExpenses = parseFloat(row.daily_expenses || 0);

    const totalCost = raddiCost + boilerFuelCost + electricityCost + maintenanceCost + 
                     laborCost + contractorsCost + dailyExpenses;

    return (totalCost / parseFloat(row.total_weight || 1)).toFixed(2);
  };

  const handlePrintCosts = async (row) => {
    const dailyExpense = dailyExpenses[row.date_time] || await fetchDailyExpenses(row.date_time);
    const printWindow = window.open('', '_blank');
    
    // Calculate all costs
    const raddiCost = row.recipe.reduce((total, item) => {
      return total + (parseFloat(item.quantity_used || 0) * parseFloat(item.unit_price || 0));
    }, 0);

    const boilerFuelCost = parseFloat(row.boiler_fuel_quantity || 0) * parseFloat(row.boiler_fuel_price || 0);
    const electricityCost = parseFloat(row.electricity_cost || 0);
    const maintenanceCost = parseFloat(row.maintenance_cost || 0);
    const laborCost = parseFloat(row.labor_cost || 0);
    const contractorsCost = parseFloat(row.contractors_cost || 0);
    const totalCost = raddiCost + boilerFuelCost + electricityCost + maintenanceCost + 
                      laborCost + contractorsCost + dailyExpense;
    const totalWeight = parseFloat(row.total_weight || 1);
    const perKgCost = totalCost / totalWeight;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Production Costs - ${format(new Date(row.date_time), 'dd/MM/yyyy')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .document-title {
              font-size: 20px;
              margin-bottom: 10px;
            }
            .cost-section {
              margin-bottom: 30px;
            }
            .cost-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .cost-table th, .cost-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .cost-table th {
              background-color: #f5f5f5;
            }
            .total-row {
              font-weight: bold;
              background-color: #f8f8f8;
            }
            .per-kg-cost {
              font-size: 18px;
              font-weight: bold;
              text-align: right;
              margin-top: 20px;
              color: #2196F3;
            }
            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 200px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 50px;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">Production Cost Analysis</div>
            <div>Date: ${format(new Date(row.date_time), 'dd/MM/yyyy')}</div>
            <div>Paper Type: ${row.paper_type}</div>
            <div>Total Weight: ${row.total_weight} kg</div>
          </div>

          <div class="cost-section">
            <table class="cost-table">
              <thead>
                <tr>
                  <th>Cost Component</th>
                  <th>Details</th>
                  <th>Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Raw Material (Raddi)</td>
                  <td>${row.recipe.map(item => 
                    `${item.raddi_type}: ${parseFloat(item.quantity_used || 0).toFixed(2)} kg @ ${parseFloat(item.unit_price || 0).toFixed(2)}/kg`
                  ).join('<br>')}</td>
                  <td>${raddiCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Boiler Fuel</td>
                  <td>${row.boiler_fuel_type}: ${row.boiler_fuel_quantity} kg @ ${parseFloat(row.boiler_fuel_price || 0).toFixed(2)}/kg</td>
                  <td>${boilerFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Electricity</td>
                  <td>${row.electricity_units} units @ ${row.electricity_unit_price}/unit</td>
                  <td>${electricityCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Maintenance</td>
                  <td>Daily maintenance cost</td>
                  <td>${maintenanceCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Labor</td>
                  <td>Daily labor cost</td>
                  <td>${laborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Contractors</td>
                  <td>Daily contractors cost</td>
                  <td>${contractorsCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Daily Expenses</td>
                  <td>Misc. expenses for the day</td>
                  <td>${dailyExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">Total Cost</td>
                  <td>${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="per-kg-cost">
              Cost per kg: PKR ${perKgCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Accounts Manager</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Production Manager</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Director</div>
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
    <Box className="production-history-container">
      <Paper className="production-history-paper">
        <Typography variant="h5" className="production-history-title">
          Production History
        </Typography>

        {/* Filters */}
        <Grid container spacing={3} className="production-history-filters">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Paper Type"
              value={filters.paperType}
              onChange={(e) => setFilters(prev => ({ ...prev, paperType: e.target.value }))}
            >
              <MenuItem value="">All Types</MenuItem>
              {paperTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </LocalizationProvider>
        </Grid>

        {loading ? (
          <Box className="production-history-loading">
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table className="production-history-table">
              <TableHead>
                <TableRow className="production-history-table-header">
                  <TableCell />
                  <TableCell>Date</TableCell>
                  <TableCell>Paper Type</TableCell>
                  <TableCell align="right">Total Weight (kg)</TableCell>
                  <TableCell>Raddi Used</TableCell>
                  <TableCell>Boiler Fuel</TableCell>
                  <TableCell align="right">Electricity Cost (Rs)</TableCell>
                  <TableCell align="right">Cost per kg</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow 
                      className={`production-history-row ${newEntryId === row.id ? 'highlight-new' : ''}`}
                      hover
                    >
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                        >
                          {expandedRow === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handlePrintCosts(row)}
                          sx={{ ml: 1 }}
                        >
                          <Print />
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(row.date_time)}</TableCell>
                      <TableCell>{row.paper_type}</TableCell>
                      <TableCell align="right">{row.total_weight}</TableCell>
                      <TableCell>{formatRaddiUsed(row.recipe)}</TableCell>
                      <TableCell>{`${row.boiler_fuel_type} (${row.boiler_fuel_quantity} kg)`}</TableCell>
                      <TableCell align="right">
                        {`${row.electricity_units} units @ Rs.${row.electricity_unit_price}/unit = Rs.${row.electricity_cost}`}
                      </TableCell>
                      <TableCell align="right">
                        {perKgCosts[row.id] ? `Rs. ${perKgCosts[row.id]}` : <CircularProgress size={20} />}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="production-history-collapse" colSpan={7}>
                        <Collapse in={expandedRow === row.id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Reels
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Size</TableCell>
                                  <TableCell align="right">Weight (kg)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {row.reels?.map((reel) => (
                                  <TableRow key={reel.id}>
                                    <TableCell>{reel.size}</TableCell>
                                    <TableCell align="right">{reel.weight}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>

                            <Typography variant="h6" gutterBottom component="div" sx={{ mt: 2 }}>
                              Recipe
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Raddi Type</TableCell>
                                  <TableCell align="right">Percentage</TableCell>
                                  <TableCell align="right">Yield (%)</TableCell>
                                  <TableCell align="right">Quantity (kg)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {row.recipe?.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.raddi_type}</TableCell>
                                    <TableCell align="right">{item.percentage_used}%</TableCell>
                                    <TableCell align="right">{item.yield_percentage}%</TableCell>
                                    <TableCell align="right">{item.quantity_used}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>

                            <Typography variant="h6" gutterBottom component="div" sx={{ mt: 2 }}>
                              Electricity Details
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Units Consumed</TableCell>
                                  <TableCell align="right">Unit Price (Rs)</TableCell>
                                  <TableCell align="right">Total Cost (Rs)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                <TableRow>
                                  <TableCell>{row.electricity_units}</TableCell>
                                  <TableCell align="right">{row.electricity_unit_price}</TableCell>
                                  <TableCell align="right">{row.electricity_cost}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default ProductionHistory; 