import React, { useState, useEffect } from 'react';
import config from '../../config';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import '../../styles/MaintenanceHistory.css';

const MaintenanceHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMaintenanceHistory();
  }, [dateRange]);

  const fetchMaintenanceHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/store/maintenance-history?` +
        `startDate=${dateRange.startDate.toISOString().split('T')[0]}&` +
        `endDate=${dateRange.endDate.toISOString().split('T')[0]}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch maintenance history');
      const data = await response.json();
      
      // Parse numeric values
      const parsedIssues = data.issues.map(issue => ({
        ...issue,
        quantity: parseFloat(issue.quantity),
        unit_price: parseFloat(issue.unit_price),
        total_price: parseFloat(issue.total_price)
      }));
      
      setHistory(parsedIssues);
      setTotalCost(parseFloat(data.totalCost));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch maintenance history');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `Rs. ${parseFloat(value).toFixed(2)}`;
  };

  const filteredHistory = history.filter(item =>
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box className="maintenance-container">
      <Paper elevation={3} className="maintenance-paper">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom className="maintenance-header">
            Maintenance History
          </Typography>

          <Stack direction="row" className="maintenance-date-filters maintenance-date-picker">
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
                renderInput={(params) => <TextField {...params} />}
              />
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
                renderInput={(params) => <TextField {...params} />}
                minDate={dateRange.startDate}
              />
            </LocalizationProvider>
          </Stack>
          
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search maintenance records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="maintenance-search"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {loading ? (
            <Box className="maintenance-loading">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer className="maintenance-table-container">
                <Table>
                  <TableHead>
                    <TableRow className="maintenance-table-header">
                      <TableCell>Date</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Item Code</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHistory
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((record) => (
                        <TableRow 
                          key={`${record.id}-${record.item_code}`}
                          className="maintenance-table-row"
                        >
                          <TableCell>{new Date(record.issue_date).toLocaleDateString()}</TableCell>
                          <TableCell>{record.department_name}</TableCell>
                          <TableCell>{record.item_name}</TableCell>
                          <TableCell>{record.item_code}</TableCell>
                          <TableCell>{record.unit}</TableCell>
                          <TableCell align="right">{record.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(record.unit_price)}</TableCell>
                          <TableCell align="right">{formatCurrency(record.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="maintenance-total-row">
                      <TableCell colSpan={7} align="right" sx={{ fontWeight: 'bold' }}>
                        Total Cost:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(totalCost)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                className="maintenance-pagination"
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredHistory.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MaintenanceHistory; 