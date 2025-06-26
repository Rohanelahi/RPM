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
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stack,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { KeyboardArrowDown, KeyboardArrowUp, Print, FilterList, ExpandMore, ExpandLess } from '@mui/icons-material';
import { format } from 'date-fns';
import config from '../../config';

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
  const [paperTypes, setPaperTypes] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchPaperTypes();
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
        const costs = await calculatePerKgCost(row);
        setPerKgCosts(prev => ({
          ...prev,
          [row.id]: costs  // Use production ID as key
        }));
      });
    }
  }, [history]);

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

      const response = await fetch(`${config.apiUrl}/production/history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch history data');
      const data = await response.json();
      
      // Process the data to include paper types and their details
      const processedData = data.map(record => ({
        ...record,
        paper_types: record.paper_types || [],
        totalWeight: record.paper_types?.reduce((sum, type) => sum + parseFloat(type.total_weight || 0), 0) || 0
      }));
      
      setHistory(processedData);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRaddiUsed = (paperTypes) => {
    if (!paperTypes) return '';
    return paperTypes.map(type => 
      type.recipe?.map(item => 
        `${item.raddi_type}: ${parseFloat(item.quantity_used || 0).toFixed(2)} kg`
      ).join(', ')
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

      const response = await fetch(`${config.apiUrl}/accounts/expenses/history?${queryParams}`);
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
    if (!row || !row.paper_types) return {};

    const costs = {};
    let totalRecipeCost = 0;
    
    // Calculate recipe costs
    row.paper_types.forEach(paperType => {
      if (paperType.recipe) {
        paperType.recipe.forEach(item => {
          const quantity = parseFloat(item.quantity_used) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const itemCost = quantity * unitPrice;
          totalRecipeCost += itemCost;
          
          // Store individual recipe item costs
          if (!costs[item.raddi_type]) {
            costs[item.raddi_type] = 0;
          }
          costs[item.raddi_type] += itemCost;
        });
      }
    });

    // Calculate total common costs
    const boilerFuelCost = parseFloat(row.boiler_fuel_quantity || 0) * parseFloat(row.boiler_fuel_price || 0);
    const electricityCost = parseFloat(row.electricity_cost || 0);
    const maintenanceCost = parseFloat(row.maintenance_cost || 0);
    const laborCost = parseFloat(row.labor_cost || 0);
    const contractorsCost = parseFloat(row.contractors_cost || 0);
    const dailyExpenses = parseFloat(row.daily_expenses || 0);
    
    const totalCommonCost = boilerFuelCost + electricityCost + maintenanceCost + 
                           laborCost + contractorsCost + dailyExpenses;
    
    const totalCost = totalRecipeCost + totalCommonCost;
    const totalWeight = row.paper_types.reduce((sum, type) => 
      sum + parseFloat(type.total_weight || 0), 0);
    
    const costPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;

    return {
      ...costs,
      boiler_fuel_cost: boilerFuelCost,
      electricity_cost: electricityCost,
      maintenance_cost: maintenanceCost,
      labor_cost: laborCost,
      contractors_cost: contractorsCost,
      daily_expenses: dailyExpenses,
      total_cost: totalCost,
      cost_per_kg: costPerKg
    };
  };

  const handlePrintCosts = async (row) => {
    const printWindow = window.open('', '_blank');
    const dailyExpense = dailyExpenses[row.date_time] || await fetchDailyExpenses(row.date_time);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Production Report - ${format(new Date(row.date_time), 'dd/MM/yyyy')}</title>
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
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
            }
            .total-row {
              font-weight: bold;
              background-color: #f8f8f8;
            }
            .cost-summary {
              margin-top: 30px;
              padding: 15px;
              background-color: #f9f9f9;
              border: 1px solid #ddd;
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
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">Production Report</div>
            <div>Date: ${format(new Date(row.date_time), 'dd/MM/yyyy')}</div>
          </div>

          <div class="section">
            <div class="section-title">Production Summary</div>
            <table>
              <tr>
                <th>Total Weight</th>
                <td>${row.paper_types?.reduce((sum, type) => 
                  sum + parseFloat(type.total_weight || 0), 0).toFixed(2)} kg</td>
              </tr>
              <tr>
                <th>Electricity Units</th>
                <td>${row.electricity_units} units</td>
              </tr>
              <tr>
                <th>Boiler Fuel</th>
                <td>${row.boiler_fuel_type}: ${row.boiler_fuel_quantity} kg</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Paper Types</div>
            ${row.paper_types?.map(paperType => `
              <div style="margin-bottom: 20px;">
                <h3>${paperType.paper_type}</h3>
                <table>
                  <tr>
                    <th>Weight</th>
                    <td>${paperType.total_weight} kg</td>
                  </tr>
                  <tr>
                    <th>Cost per kg</th>
                    <td>Rs. ${formatNumber(
                      (Number(perKgCosts[row.id]?.boiler_fuel_cost || 0) + 
                      Number(perKgCosts[row.id]?.electricity_cost || 0) + 
                      Number(perKgCosts[row.id]?.maintenance_cost || 0) + 
                      Number(perKgCosts[row.id]?.labor_cost || 0) + 
                      Number(perKgCosts[row.id]?.contractors_cost || 0) + 
                      Number(perKgCosts[row.id]?.daily_expenses || 0) +
                      Object.entries(perKgCosts[row.id] || {}).reduce((sum, [key, value]) => 
                        !key.includes('_cost') && key !== 'cost_per_kg' && key !== 'daily_expenses' ? 
                        sum + Number(value || 0) : sum, 0)) / 
                      (parseFloat(paperType.total_weight) || 1)
                    )}</td>
                  </tr>
                  <tr>
                    <th colspan="2">Recipe</th>
                  </tr>
                  ${paperType.recipe?.map(item => `
                    <tr>
                      <td>${item.raddi_type}</td>
                      <td>
                        ${item.percentage_used}% (${item.quantity_used} kg) - 
                        Yield: ${item.yield_percentage}%
                      </td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <div class="section-title">Cost Breakdown</div>
            <table>
              <tr>
                <th>Cost Type</th>
                <th>Amount (Rs)</th>
              </tr>
              ${Object.entries(perKgCosts[row.id] || {}).filter(([key]) => 
                !key.includes('_cost') && 
                key !== 'cost_per_kg' && 
                key !== 'daily_expenses'
              ).map(([type, cost]) => `
                <tr>
                  <td>${type} Cost</td>
                  <td>${formatNumber(cost)}</td>
                </tr>
              `).join('')}
              <tr>
                <td>Boiler Fuel</td>
                <td>${formatNumber(perKgCosts[row.id]?.boiler_fuel_cost || 0)}</td>
              </tr>
              <tr>
                <td>Electricity</td>
                <td>${formatNumber(row.electricity_cost || 0)}</td>
              </tr>
              <tr>
                <td>Maintenance</td>
                <td>${formatNumber(row.maintenance_cost || 0)}</td>
              </tr>
              <tr>
                <td>Labor</td>
                <td>${formatNumber(row.labor_cost || 0)}</td>
              </tr>
              <tr>
                <td>Contractors</td>
                <td>${formatNumber(row.contractors_cost || 0)}</td>
              </tr>
              <tr>
                <td>Daily Expenses</td>
                <td>${formatNumber(dailyExpense || 0)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Cost</td>
                <td>${formatNumber(
                  Number(perKgCosts[row.id]?.boiler_fuel_cost || 0) + 
                  Number(row.electricity_cost || 0) + 
                  Number(row.maintenance_cost || 0) + 
                  Number(row.labor_cost || 0) + 
                  Number(row.contractors_cost || 0) + 
                  Number(dailyExpense || 0) +
                  Object.entries(perKgCosts[row.id] || {}).reduce((sum, [key, value]) => 
                    !key.includes('_cost') && key !== 'cost_per_kg' && key !== 'daily_expenses' ? 
                    sum + Number(value || 0) : sum, 0)
                )}</td>
              </tr>
              <tr>
                <td>Cost per kg:</td>
                <td>Rs. ${formatNumber(
                  (Number(perKgCosts[row.id]?.boiler_fuel_cost || 0) + 
                  Number(row.electricity_cost || 0) + 
                  Number(row.maintenance_cost || 0) + 
                  Number(row.labor_cost || 0) + 
                  Number(row.contractors_cost || 0) + 
                  Number(dailyExpense || 0) +
                  Object.entries(perKgCosts[row.id] || {}).reduce((sum, [key, value]) => 
                    !key.includes('_cost') && key !== 'cost_per_kg' && key !== 'daily_expenses' ? 
                    sum + Number(value || 0) : sum, 0)) / 
                  (row.paper_types?.reduce((sum, type) => 
                    sum + parseFloat(type.total_weight || 0), 0) || 1)
                )}</td>
              </tr>
            </table>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Production Manager</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Store Manager</div>
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

  const combineRecipeItems = (recipe, totalWeight) => {
    const combined = {};
    recipe.forEach(item => {
      if (!combined[item.raddi_type]) {
        combined[item.raddi_type] = {
          raddi_type: item.raddi_type,
          percentage_used: item.percentage_used,
          yield_percentage: item.yield_percentage,
          quantity_used: 0
        };
      }
      // Calculate quantity based on percentage and yield
      const percentageUsed = parseFloat(item.percentage_used) || 0;
      const yieldPercentage = parseFloat(item.yield_percentage) || 0;
      const quantity = (totalWeight * (percentageUsed / 100)) / (yieldPercentage / 100);
      combined[item.raddi_type].quantity_used = quantity;
    });
    return Object.values(combined);
  };

  // Add formatNumber function
  const formatNumber = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Number(value).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  };

  return (
    <Box className="production-history-container">
      <Paper className="production-history-paper" elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" className="production-history-title">
            Production History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </Box>

        {showFilters && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3}>
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
                      <MenuItem key={type.id} value={type.name}>{type.name}</MenuItem>
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
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Summary View" />
              <Tab label="Detailed View" />
            </Tabs>

            {activeTab === 0 ? (
              <TableContainer>
                <Table className="production-history-table">
                  <TableHead>
                    <TableRow className="production-history-table-header">
                      <TableCell width="50px" />
                      <TableCell>Date</TableCell>
                      <TableCell>Paper Types</TableCell>
                      <TableCell align="right">Total Weight (kg)</TableCell>
                      <TableCell>Boiler Fuel</TableCell>
                      <TableCell align="right">Electricity Cost (Rs)</TableCell>
                      <TableCell align="right">Cost per kg</TableCell>
                      <TableCell width="50px" />
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
                              {expandedRow === row.id ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{formatDate(row.date_time)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              {row.paper_types?.map(type => (
                                <Chip 
                                  key={type.id}
                                  label={`${type.paper_type}: ${type.total_weight} kg`}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {row.paper_types?.reduce((sum, type) => 
                              sum + parseFloat(type.total_weight || 0), 0).toFixed(2)}
                          </TableCell>
                          <TableCell>{`${row.boiler_fuel_type} (${row.boiler_fuel_quantity} kg)`}</TableCell>
                          <TableCell align="right">
                            {`${row.electricity_units} units @ Rs.${row.electricity_unit_price}/unit = Rs.${row.electricity_cost}`}
                          </TableCell>
                          <TableCell align="right">
                            <Stack spacing={0.5}>
                              {row.paper_types?.map(type => (
                                <Typography key={type.id} variant="body2">
                                  {type.paper_type}: Rs. {formatNumber(
                                    (Number(perKgCosts[row.id]?.boiler_fuel_cost || 0) + 
                                    Number(perKgCosts[row.id]?.electricity_cost || 0) + 
                                    Number(perKgCosts[row.id]?.maintenance_cost || 0) + 
                                    Number(perKgCosts[row.id]?.labor_cost || 0) + 
                                    Number(perKgCosts[row.id]?.contractors_cost || 0) + 
                                    Number(perKgCosts[row.id]?.daily_expenses || 0) +
                                    Object.entries(perKgCosts[row.id] || {}).reduce((sum, [key, value]) => 
                                      !key.includes('_cost') && key !== 'cost_per_kg' && key !== 'daily_expenses' ? 
                                      sum + Number(value || 0) : sum, 0)) / 
                                    (parseFloat(type.total_weight) || 1)
                                  )}
                                </Typography>
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handlePrintCosts(row)}
                            >
                              <Print />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="production-history-collapse" colSpan={8}>
                            <Collapse in={expandedRow === row.id} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2 }}>
                                <Grid container spacing={2}>
                                  {row.paper_types?.map(paperType => (
                                    <Grid item xs={12} md={6} key={paperType.id}>
                                      <Card>
                                        <CardContent>
                                          <Typography variant="h6" gutterBottom>
                                            {paperType.paper_type} Details
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
                                              {combineRecipeItems(paperType.recipe || [], paperType.total_weight).map((item) => (
                                                <TableRow key={item.raddi_type}>
                                                  <TableCell>{item.raddi_type}</TableCell>
                                                  <TableCell align="right">{item.percentage_used}%</TableCell>
                                                  <TableCell align="right">{item.yield_percentage}%</TableCell>
                                                  <TableCell align="right">{item.quantity_used.toFixed(2)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box>
                {history.map((row) => (
                  <Card key={row.id} sx={{ mb: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                          {formatDate(row.date_time)}
                        </Typography>
                        <IconButton onClick={() => handlePrintCosts(row)}>
                          <Print />
                        </IconButton>
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Production Summary
                          </Typography>
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell>Total Weight</TableCell>
                                <TableCell align="right">
                                  {row.paper_types?.reduce((sum, type) => 
                                    sum + parseFloat(type.total_weight || 0), 0).toFixed(2)} kg
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Boiler Fuel</TableCell>
                                <TableCell align="right">
                                  {`${row.boiler_fuel_type} (${row.boiler_fuel_quantity} kg)`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Electricity</TableCell>
                                <TableCell align="right">
                                  {`${row.electricity_units} units @ Rs.${row.electricity_unit_price}/unit`}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Cost Summary
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Cost Type</TableCell>
                                  <TableCell align="right">Amount (Rs.)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {/* Recipe Costs */}
                                {Object.entries(perKgCosts[row.id] || {}).filter(([key]) => 
                                  !key.includes('_cost') && 
                                  key !== 'cost_per_kg' && 
                                  key !== 'daily_expenses'
                                ).map(([type, cost]) => (
                                  <TableRow key={type}>
                                    <TableCell>{type} Cost</TableCell>
                                    <TableCell align="right">{formatNumber(cost)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell>Boiler Fuel Cost</TableCell>
                                  <TableCell align="right">{formatNumber(perKgCosts[row.id]?.boiler_fuel_cost || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Electricity Cost</TableCell>
                                  <TableCell align="right">{formatNumber(perKgCosts[row.id]?.electricity_cost || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Maintenance Cost</TableCell>
                                  <TableCell align="right">{formatNumber(perKgCosts[row.id]?.maintenance_cost || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Labor Cost</TableCell>
                                  <TableCell align="right">{formatNumber(perKgCosts[row.id]?.labor_cost || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Contractors Cost</TableCell>
                                  <TableCell align="right">{formatNumber(perKgCosts[row.id]?.contractors_cost || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Daily Expenses</TableCell>
                                  <TableCell align="right">{formatNumber(perKgCosts[row.id]?.daily_expenses || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell><strong>Total Cost</strong></TableCell>
                                  <TableCell align="right"><strong>{formatNumber(perKgCosts[row.id]?.total_cost || 0)}</strong></TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell><strong>Cost per kg</strong></TableCell>
                                  <TableCell align="right"><strong>Rs. {formatNumber(perKgCosts[row.id]?.cost_per_kg || 0)}</strong></TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>

                        {row.paper_types?.map(paperType => (
                          <Grid item xs={12} key={paperType.id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                  {paperType.paper_type} Details
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
                                    {combineRecipeItems(paperType.recipe || [], paperType.total_weight).map((item) => (
                                      <TableRow key={item.raddi_type}>
                                        <TableCell>{item.raddi_type}</TableCell>
                                        <TableCell align="right">{item.percentage_used}%</TableCell>
                                        <TableCell align="right">{item.yield_percentage}%</TableCell>
                                        <TableCell align="right">{item.quantity_used.toFixed(2)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ProductionHistory; 