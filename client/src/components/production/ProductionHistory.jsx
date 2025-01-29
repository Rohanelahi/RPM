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
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

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
                      </TableCell>
                      <TableCell>{formatDate(row.date_time)}</TableCell>
                      <TableCell>{row.paper_type}</TableCell>
                      <TableCell align="right">{row.total_weight}</TableCell>
                      <TableCell>{formatRaddiUsed(row.recipe)}</TableCell>
                      <TableCell>{`${row.boiler_fuel_type} (${row.boiler_fuel_quantity} kg)`}</TableCell>
                      <TableCell align="right">{row.electricity_cost}</TableCell>
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