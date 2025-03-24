import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend,
  LineChart,
  Line,
  ComposedChart,
  ResponsiveContainer
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [productionData, setProductionData] = useState(null);
  const [electricityData, setElectricityData] = useState([]);
  const [estimatedProduction, setEstimatedProduction] = useState([]);
  const [cashBalances, setCashBalances] = useState({ cash_in_hand: 0, cash_in_bank: 0 });
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [bankAccounts, setBankAccounts] = useState([]);
  const [perKgCost, setPerKgCost] = useState(null);
  const [dailyExpenses, setDailyExpenses] = useState({});
  const [todayProductionData, setTodayProductionData] = useState(null);
  const [yesterdayProductionData, setYesterdayProductionData] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState({
    electricity: 0,
    rawMaterials: [],
    boilerFuel: []
  });
  const [dailyProductionData, setDailyProductionData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    
    const handleCashUpdate = () => {
      console.log('Cash balance update triggered');
      setLastUpdate(Date.now());
    };
    
    window.addEventListener('cashBalanceUpdated', handleCashUpdate);
    
    // Remove the interval refresh
    return () => {
      window.removeEventListener('cashBalanceUpdated', handleCashUpdate);
    };
  }, []);

  // Only refresh when lastUpdate changes
  useEffect(() => {
    fetchDashboardData();
  }, [lastUpdate]);

  const fetchDashboardData = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      // Fetch today's production data
      const todayResponse = await fetch('http://localhost:5000/api/production/today');
      const todayData = await todayResponse.json();
      setTodayProductionData(todayData);

      // Fetch yesterday's production data
      const yesterdayResponse = await fetch('http://localhost:5000/api/production/yesterday');
      const yesterdayData = await yesterdayResponse.json();
      setYesterdayProductionData(yesterdayData);

      // Fetch cash balances
      const cashResponse = await fetch(`http://localhost:5000/api/accounts/cash-balances?t=${Date.now()}`);
      const cashData = await cashResponse.json();
      
      // Fetch bank accounts
      const bankResponse = await fetch('http://localhost:5000/api/accounts/bank-accounts');
      const bankData = await bankResponse.json();
      
      // Only update if values are different to prevent unnecessary rerenders
      setCashBalances(prev => {
        const newCashInHand = Number(cashData.cash_in_hand || 0);
        const newCashInBank = Number(cashData.cash_in_bank || 0);
        if (prev.cash_in_hand !== newCashInHand || prev.cash_in_bank !== newCashInBank) {
          return {
            cash_in_hand: newCashInHand,
            cash_in_bank: newCashInBank
          };
        }
        return prev;
      });

      setBankAccounts(bankData);

      // Rest of your fetch calls with similar optimization...
      const stockResponse = await fetch(`http://localhost:5000/api/stock/overview`);
      const stockData = await stockResponse.json();
      setStockData(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(stockData)) {
          return stockData;
        }
        return prev;
      });

      const productionResponse = await fetch(`http://localhost:5000/api/production/dashboard`);
      const productionData = await productionResponse.json();
      setProductionData(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(productionData)) {
          return productionData;
        }
        return prev;
      });

      // Calculate estimated production only if stock or production data changed
      const estimates = stockData.map(item => ({
        item_type: item.item_type,
        current_stock: item.current_quantity,
        estimated_production: calculateEstimatedProduction(item, productionData?.recipe || [])
      }));
      setEstimatedProduction(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(estimates)) {
          return estimates;
        }
        return prev;
      });

      // Fetch monthly statistics
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthlyStatsResponse = await fetch(`http://localhost:5000/api/production/monthly-stats?startDate=${monthStart.toISOString()}`);
      const monthlyStatsData = await monthlyStatsResponse.json();
      setMonthlyStats(monthlyStatsData);

      // Fetch last 7 days production data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dailyProductionResponse = await fetch(
        `http://localhost:5000/api/production/daily-stats?startDate=${sevenDaysAgo.toISOString()}`
      );
      const dailyProductionData = await dailyProductionResponse.json();
      setDailyProductionData(dailyProductionData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateEstimatedProduction = (stockItem, recipe) => {
    if (!recipe.length) return 0;
    
    const itemRecipe = recipe.find(r => r.raddi_type === stockItem.item_type);
    if (!itemRecipe) return 0;

    // Calculate how many production runs possible with current stock
    return Math.floor(stockItem.current_quantity / itemRecipe.quantity_used);
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
    
    let dailyExpense = dailyExpenses[row.date_time] || await fetchDailyExpenses(row.date_time);

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

    const totalCost = raddiCost + boilerFuelCost + electricityCost + maintenanceCost + 
                     laborCost + contractorsCost + dailyExpense;

    const totalWeight = parseFloat(row.total_weight || 1);
    const perKgCost = totalCost / totalWeight;

    return perKgCost.toFixed(2);
  };

  // Manual refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    setLastUpdate(Date.now());
  };

  useEffect(() => {
    if (productionData) {
      calculatePerKgCost(productionData).then(cost => {
        setPerKgCost(cost);
      });
    }
  }, [productionData, dailyExpenses]);

  // Helper function to calculate cost per kg
  const calculateCostPerKg = (data) => {
    if (!data || !data.recipe) return '0.00';
    
    const recipe = Array.isArray(data.recipe) ? data.recipe : [];
    
    const raddiCost = recipe.reduce((total, item) => {
      return total + (parseFloat(item.quantity_used || 0) * parseFloat(item.unit_price || 0));
    }, 0);

    const boilerFuelCost = parseFloat(data.boiler_fuel_quantity || 0) * parseFloat(data.boiler_fuel_price || 0);
    const electricityCost = parseFloat(data.electricity_cost || 0);
    const maintenanceCost = parseFloat(data.maintenance_cost || 0);
    const laborCost = parseFloat(data.labor_cost || 0);
    const contractorsCost = parseFloat(data.contractors_cost || 0);
    const dailyExpenses = parseFloat(data.daily_expenses || 0);

    const totalCost = raddiCost + boilerFuelCost + electricityCost + maintenanceCost + 
                     laborCost + contractorsCost + dailyExpenses;

    return (totalCost / parseFloat(data.total_weight || 1)).toFixed(2);
  };

  return (
    <div className="dashboard-container">
      <Box className="content-paper">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">
            Dashboard
          </Typography>
          <Tooltip title="Refresh data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={loading || refreshing}
              sx={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" m={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Cash Balances - Left Side */}
            <Grid item xs={12} md={6}>
              <Paper className="dashboard-section">
                <Typography variant="h6">Cash & Bank Balances</Typography>
                <Box mt={2}>
                  <Grid container spacing={2}>
                    {/* Cash in Hand */}
                    <Grid item xs={12}>
                      <Paper elevation={2} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Typography variant="subtitle1">Cash in Hand</Typography>
                        <Typography variant="h6" color="primary">
                          Rs. {cashBalances.cash_in_hand?.toLocaleString() || '0'}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Bank Accounts */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Bank Accounts</Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 200, overflow: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Bank Name</TableCell>
                              <TableCell>Account Number</TableCell>
                              <TableCell align="right">Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {bankAccounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>{account.bank_name}</TableCell>
                                <TableCell>{account.account_number}</TableCell>
                                <TableCell align="right">
                                  Rs. {Number(account.balance).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    {/* Totals */}
                    <Grid item xs={12}>
                      <Paper elevation={2} sx={{ p: 2, mt: 2, bgcolor: '#e3f2fd' }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1">Total Bank Balance</Typography>
                            <Typography variant="h6" color="primary">
                              Rs. {bankAccounts.reduce((sum, account) => sum + Number(account.balance), 0).toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1">Total Cash + Bank</Typography>
                            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                              Rs. {(bankAccounts.reduce((sum, account) => sum + Number(account.balance), 0) + Number(cashBalances.cash_in_hand || 0)).toLocaleString()}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Stock Overview and Production - Right Side */}
            <Grid item xs={12} md={6}>
              <Grid container spacing={3}>
                {/* Stock Overview */}
                <Grid item xs={12}>
                  <Paper className="dashboard-section">
                    <Typography variant="h6" gutterBottom>Stock Overview</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Item Type</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell align="right">Latest Price (Rs.)</TableCell>
                            <TableCell align="right">Monthly Avg. Price (Rs.)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stockData.slice(0, 5).map((item) => (
                            <TableRow key={item.item_type}>
                              <TableCell>{item.item_type}</TableCell>
                              <TableCell align="right">
                                {item.current_quantity}
                              </TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell align="right">
                                {item.latest_price ? 
                                  Number(item.latest_price).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  }) : 
                                  '-'
                                }
                              </TableCell>
                              <TableCell align="right">
                                {item.monthly_avg_price ? 
                                  Number(item.monthly_avg_price).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  }) : 
                                  '-'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>

                {/* Production Overview */}
                <Grid item xs={12}>
                  <Paper className="dashboard-section">
                    <Typography variant="h6">Production Overview</Typography>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>Production Overview</Typography>
                      <Grid container spacing={3}>
                        {/* Yesterday's Production */}
                        <Grid item xs={12} md={6}>
                          <Box sx={{ p: 2, borderRight: { md: '1px solid #eee' } }}>
                            <Typography variant="subtitle1" color="primary">Yesterday's Production</Typography>
                            {yesterdayProductionData ? (
                              <>
                                <Typography>Paper Type: {yesterdayProductionData.paper_type}</Typography>
                                <Typography>Total Weight: {yesterdayProductionData.total_weight} kg</Typography>
                                <Typography sx={{ fontWeight: 'bold' }}>
                                  Cost per kg: Rs. {calculateCostPerKg(yesterdayProductionData)}
                                </Typography>
                                <Typography>Electricity Units: {yesterdayProductionData.electricity_units}</Typography>
                              </>
                            ) : (
                              <Typography color="textSecondary">No production data for yesterday</Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* Today's Production */}
                        <Grid item xs={12} md={6}>
                          <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle1" color="primary">Today's Production</Typography>
                            {todayProductionData ? (
                              <>
                                <Typography>Paper Type: {todayProductionData.paper_type}</Typography>
                                <Typography>Total Weight: {todayProductionData.total_weight} kg</Typography>
                                <Typography sx={{ fontWeight: 'bold' }}>
                                  Cost per kg: Rs. {calculateCostPerKg(todayProductionData)}
                                </Typography>
                                <Typography>Electricity Units: {todayProductionData.electricity_units}</Typography>
                              </>
                            ) : (
                              <Typography color="textSecondary">No production data for today</Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            {/* Daily Production Graph */}
            <Grid item xs={12}>
              <Paper className="dashboard-section">
                <Typography variant="h6">Production Analysis (Last 7 Days)</Typography>
                <Box sx={{ 
                  p: 2, 
                  width: '100%',
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart
                      data={dailyProductionData.map(row => ({
                        ...row,
                        // Ensure cost_per_unit matches ProductionHistory calculation
                        cost_per_unit: Number((
                          (
                            // Raw material (raddi) cost
                            row.recipe?.reduce((total, item) => 
                              total + (parseFloat(item.quantity_used || 0) * parseFloat(item.unit_price || 0)), 0) +
                            // Boiler fuel cost - use quantity * price
                            parseFloat(row.boiler_fuel_quantity || 0) * parseFloat(row.boiler_fuel_price || 0) +
                            // Other costs
                            parseFloat(row.electricity_cost || 0) +
                            parseFloat(row.maintenance_cost || 0) +
                            parseFloat(row.labor_cost || 0) +
                            parseFloat(row.contractors_cost || 0) +
                            parseFloat(row.daily_expenses || 0)
                          ) / parseFloat(row.total_weight || 1)
                        ).toFixed(2))
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      />
                      <YAxis 
                        yAxisId="left"
                        label={{ value: 'Production (kg)', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right"
                        label={{ value: 'Cost per kg (Rs)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                        formatter={(value, name) => [
                          name === 'total_weight' 
                            ? `${value.toLocaleString()} kg`
                            : `Rs. ${value.toFixed(2)}`,
                          name === 'total_weight' ? 'Production' : 'Cost per kg'
                        ]}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="total_weight" 
                        fill="#8884d8" 
                        name="Production"
                        barSize={40}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cost_per_unit" 
                        stroke="#ff7300" 
                        name="Cost per kg"
                        strokeWidth={2}
                        dot={{ 
                          r: 4,
                          strokeWidth: 2,
                          fill: "#fff"
                        }}
                        label={{
                          position: 'top',
                          formatter: (value) => `Rs.${value.toFixed(2)}`,
                          fontSize: 12,
                          fill: '#ff7300'
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                    This graph shows daily production quantity (bars) and cost per kg (line) to track both output and efficiency
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Monthly Statistics */}
            <Grid item xs={12} md={6}>
              <Paper className="dashboard-section">
                <Typography variant="h6">Monthly Statistics</Typography>
                <Box sx={{ p: 2 }}>
                  {/* Electricity */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="primary">
                      Electricity Consumption
                    </Typography>
                    <Typography>
                      Total Units: {monthlyStats.electricity.toLocaleString()} units
                    </Typography>
                  </Box>

                  {/* Raw Materials */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="primary">
                      Raw Materials Used
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Quantity (kg)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {monthlyStats.rawMaterials.map((material) => (
                          <TableRow key={material.type}>
                            <TableCell>{material.type}</TableCell>
                            <TableCell align="right">
                              {material.quantity.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>

                  {/* Boiler Fuel */}
                  <Box>
                    <Typography variant="subtitle1" color="primary">
                      Boiler Fuel Used
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Quantity (kg)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {monthlyStats.boilerFuel.map((fuel) => (
                          <TableRow key={fuel.type}>
                            <TableCell>{fuel.type}</TableCell>
                            <TableCell align="right">
                              {fuel.quantity.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </div>
  );
};

export default Dashboard; 