import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import config from '../../config';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [cashBalances, setCashBalances] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up event listeners for updates
    const handlePaymentReceived = () => {
      fetchDashboardData();
    };
    const handleCashBalanceUpdated = () => {
      fetchDashboardData();
    };
    const handleBankBalanceUpdated = () => {
      fetchDashboardData();
    };
    
    window.addEventListener('paymentReceived', handlePaymentReceived);
    window.addEventListener('cashBalanceUpdated', handleCashBalanceUpdated);
    window.addEventListener('bankBalanceUpdated', handleBankBalanceUpdated);
    
    return () => {
      window.removeEventListener('paymentReceived', handlePaymentReceived);
      window.removeEventListener('cashBalanceUpdated', handleCashBalanceUpdated);
      window.removeEventListener('bankBalanceUpdated', handleBankBalanceUpdated);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
        setLoading(true);
      const [cashResponse, bankResponse, stockResponse, productionResponse] = await Promise.all([
        fetch(`${config.apiUrl}/accounts/cash-balances`),
        fetch(`${config.apiUrl}/accounts/bank-accounts`),
        fetch(`${config.apiUrl}/stock/overview`),
        fetch(`${config.apiUrl}/production/history`)
      ]);

      if (!cashResponse.ok || !bankResponse.ok || !stockResponse.ok || !productionResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [cashData, bankData, stockData, productionData] = await Promise.all([
        cashResponse.json(),
        bankResponse.json(),
        stockResponse.json(),
        productionResponse.json()
      ]);

      // Transform cash data into the expected format
      const transformedCashData = [{
        id: 1,
        name: 'Cash in Hand',
        amount: Number(cashData.cash_in_hand || 0)
      }];

      setCashBalances(transformedCashData);
      setBankAccounts(Array.isArray(bankData) ? bankData : []);
      setStockData(Array.isArray(stockData) ? stockData : []);
      setProductionData(Array.isArray(productionData) ? productionData : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      alert('Failed to fetch dashboard data');
      setCashBalances([]);
      setBankAccounts([]);
      setStockData([]);
      setProductionData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Helper function to safely format numbers
  const formatNumber = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Number(value).toLocaleString();
  };

  // Calculate total balance safely
  const calculateTotalBalance = () => {
    const cashTotal = cashBalances.reduce((sum, balance) => {
      const amount = Number(balance.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const bankTotal = bankAccounts.reduce((sum, account) => {
      const balance = Number(account.balance);
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

    return cashTotal + bankTotal;
  };

  return (
    <Box sx={{ p: 3, ml: '300px', mt: '20px' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
        <Tooltip title="Refresh dashboard">
            <IconButton 
              onClick={handleRefresh} 
            disabled={refreshing || loading}
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)' 
              } 
            }}
          >
            <Refresh 
              sx={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            />
            </IconButton>
          </Tooltip>
        </Box>

        {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
          {/* Cash Balances */}
            <Grid item xs={12} md={6}>
            <Paper elevation={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cash Balances
                        </Typography>
                  <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                          <TableCell>Account</TableCell>
                              <TableCell align="right">Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                        {cashBalances.length > 0 ? (
                          <>
                            {cashBalances.map((balance) => (
                              <TableRow key={balance.id}>
                                <TableCell>{balance.name || '-'}</TableCell>
                                <TableCell align="right">
                                  Rs. {formatNumber(balance.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell>
                                <strong>Total Cash</strong>
                              </TableCell>
                              <TableCell align="right">
                                <strong>
                                  Rs. {formatNumber(cashBalances.reduce((sum, balance) => {
                                    const amount = Number(balance.amount);
                                    return sum + (isNaN(amount) ? 0 : amount);
                                  }, 0))}
                                </strong>
                              </TableCell>
                            </TableRow>
                          </>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center">
                              No cash balances available
                            </TableCell>
                          </TableRow>
                        )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                </CardContent>
              </Card>
              </Paper>
            </Grid>

          {/* Bank Accounts */}
            <Grid item xs={12} md={6}>
            <Paper elevation={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bank Accounts
                  </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                          <TableCell>Bank</TableCell>
                          <TableCell>Account</TableCell>
                          <TableCell align="right">Balance</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                        {bankAccounts.length > 0 ? (
                          <>
                            {bankAccounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>{account.bank_name || '-'}</TableCell>
                                <TableCell>{account.account_number || '-'}</TableCell>
                              <TableCell align="right">
                                  Rs. {formatNumber(account.balance)}
                              </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell colSpan={2}>
                                <strong>Total Bank Balance</strong>
                              </TableCell>
                              <TableCell align="right">
                                <strong>
                                  Rs. {formatNumber(bankAccounts.reduce((sum, account) => {
                                    const balance = Number(account.balance);
                                    return sum + (isNaN(balance) ? 0 : balance);
                                  }, 0))}
                                </strong>
                              </TableCell>
                            </TableRow>
                          </>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              No bank accounts available
                            </TableCell>
                          </TableRow>
                        )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                </CardContent>
              </Card>
                  </Paper>
                </Grid>

          {/* Total Balance Card */}
                <Grid item xs={12}>
            <Paper elevation={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Available Balance
                                </Typography>
                  <Typography variant="h4" color="primary" align="center">
                    Rs. {formatNumber(calculateTotalBalance())}
                  </Typography>
                </CardContent>
              </Card>
              </Paper>
            </Grid>

          {/* Stock Overview */}
            <Grid item xs={12} md={6}>
            <Paper elevation={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Stock Overview
                    </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item Type</TableCell>
                          <TableCell align="right">Current Quantity</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Latest Price (Rs.)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stockData && stockData.length > 0 ? (
                          stockData.map((item) => (
                            <TableRow key={item.item_type}>
                              <TableCell>{item.item_type || '-'}</TableCell>
                              <TableCell align="right">
                                {formatNumber(item.current_quantity)}
                              </TableCell>
                              <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell align="right">
                                {item.latest_price ? 
                                  Number(item.latest_price).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  }) : 
                                  '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              No stock data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Paper>
          </Grid>

          {/* Production History */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Production
                    </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Paper Types</TableCell>
                          <TableCell align="right">Total Weight</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Cost per kg</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productionData.length > 0 ? (
                          productionData.slice(0, 5).map((record) => {
                            // Calculate common costs
                            const boilerFuelCost = parseFloat(record.boiler_fuel_quantity || 0) * parseFloat(record.boiler_fuel_price || 0);
                            const electricityCost = parseFloat(record.electricity_cost || 0);
                            const maintenanceCost = parseFloat(record.maintenance_cost || 0);
                            const laborCost = parseFloat(record.labor_cost || 0);
                            const contractorsCost = parseFloat(record.contractors_cost || 0);
                            const dailyExpenses = parseFloat(record.daily_expenses || 0);
                            const totalCommonCost = boilerFuelCost + electricityCost + maintenanceCost + 
                                                  laborCost + contractorsCost + dailyExpenses;

                            // Calculate total weight for all paper types
                            const totalWeight = record.paper_types?.reduce((sum, type) => 
                              sum + parseFloat(type.total_weight || 0), 0) || 0;

                            // Get all paper types and their costs
                            const paperTypes = record.paper_types || [];
                            const paperTypesList = paperTypes.map(pt => {
                              const paperTypeWeight = parseFloat(pt.total_weight || 0);
                              const weightRatio = totalWeight > 0 ? paperTypeWeight / totalWeight : 0;
                              
                              // Calculate recipe costs
                              const recipeCost = pt.recipe?.reduce((total, item) => {
                                return total + (parseFloat(item.quantity_used || 0) * parseFloat(item.unit_price || 0));
                              }, 0) || 0;

                              // Calculate total cost (recipe cost + proportional common costs)
                              const totalCost = recipeCost + (totalCommonCost * weightRatio);
                              const perKgCost = paperTypeWeight > 0 ? totalCost / paperTypeWeight : 0;

                              return {
                                name: pt.paper_type,
                                weight: paperTypeWeight,
                                costPerKg: perKgCost
                              };
                            });

                            // Calculate average cost per kg for the production
                            const totalCost = paperTypesList.reduce((sum, pt) => 
                              sum + (pt.costPerKg * pt.weight), 0);
                            const avgCostPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;

                            return (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {record.date_time ? new Date(record.date_time).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell>
                                  {paperTypesList.map(pt => `${pt.name} (${pt.costPerKg.toFixed(2)}/kg)`).join(', ')}
                                </TableCell>
                                <TableCell align="right">
                                  {formatNumber(totalWeight)}
                                </TableCell>
                                <TableCell>kg</TableCell>
                            <TableCell align="right">
                                  Rs. {avgCostPerKg.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              No production data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
  );
};

export default Dashboard; 