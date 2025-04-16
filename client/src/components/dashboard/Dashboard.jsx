import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import config from '../../config';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [cashBalances, setCashBalances] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [productionData, setProductionData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
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

      setCashBalances(cashData);
      setBankAccounts(bankData);
      setStockData(stockData);
      setProductionData(productionData);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
        {loading ? (
            <CircularProgress />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
            <Paper>
              <Card>
                <CardContent>
                  <Typography variant="h6">Cash Balances</Typography>
                  {cashBalances.map((balance) => (
                    <Typography key={balance.id}>
                      {balance.name}: Rs. {balance.amount.toLocaleString()}
                        </Typography>
                  ))}
                </CardContent>
              </Card>
                      </Paper>
                    </Grid>
          <Grid item xs={12} md={6}>
            <Paper>
              <Card>
                <CardContent>
                  <Typography variant="h6">Bank Accounts</Typography>
                            {bankAccounts.map((account) => (
                    <Typography key={account.id}>
                      {account.name}: Rs. {account.balance.toLocaleString()}
                            </Typography>
                  ))}
                </CardContent>
              </Card>
                  </Paper>
                </Grid>
                        <Grid item xs={12} md={6}>
            <Paper>
              <Card>
                <CardContent>
                  <Typography variant="h6">Stock Overview</Typography>
                  {stockData.map((item) => (
                    <Typography key={item.id}>
                      {item.name}: {item.quantity} {item.unit}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper>
              <Card>
                <CardContent>
                  <Typography variant="h6">Production History</Typography>
                  {productionData.map((record) => (
                    <Typography key={record.id}>
                      {record.date}: {record.quantity} kg
                    </Typography>
                  ))}
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