import React, { useState, useEffect } from 'react';
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
  const [filters, setFilters] = useState({
    paperType: '',
    startDate: null,
    endDate: null
  });

  const paperTypes = ['SUPER', 'CMP', 'BOARD'];

  useEffect(() => {
    fetchHistoryData();
  }, [filters]);

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

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Production History
        </Typography>

        {/* Filters */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
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
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Date</TableCell>
                  <TableCell>Paper Type</TableCell>
                  <TableCell align="right">Total Weight (kg)</TableCell>
                  <TableCell align="right">Total Reels</TableCell>
                  <TableCell>Boiler Fuel</TableCell>
                  <TableCell align="right">Yield (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow hover>
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
                      <TableCell align="right">{row.total_reels}</TableCell>
                      <TableCell>{`${row.boiler_fuel_type} (${row.boiler_fuel_quantity} kg)`}</TableCell>
                      <TableCell align="right">{row.total_yield_percentage}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={expandedRow === row.id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Reels
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Reel Number</TableCell>
                                  <TableCell>Size</TableCell>
                                  <TableCell align="right">Weight (kg)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {row.reels?.map((reel) => (
                                  <TableRow key={reel.id}>
                                    <TableCell>{reel.reel_number}</TableCell>
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
                                  <TableCell align="right">Quantity (kg)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {row.recipe?.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.raddi_type}</TableCell>
                                    <TableCell align="right">{item.percentage_used}%</TableCell>
                                    <TableCell align="right">{item.quantity_used}</TableCell>
                                  </TableRow>
                                ))}
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