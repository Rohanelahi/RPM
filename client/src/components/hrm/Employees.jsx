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
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Search, Refresh, Delete, MoreVert, Block, CheckCircle } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import api from '../../services/api';
import '../../styles/forms/Employees.css';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEmployees();
      console.log('Fetched employees:', data);
      setEmployees(data);
    } catch (error) {
      console.error('Error details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleRefresh = () => {
    fetchEmployees();
  };

  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
    setPassword('');
    setPasswordError('');
  };

  const handleDeleteConfirm = async () => {
    try {
      const passwordCheck = await api.verifyPassword(password);
      
      if (!passwordCheck.success) {
        setPasswordError('Incorrect password');
        return;
      }

      await api.deleteEmployee(selectedEmployee.id);
      
      fetchEmployees();
      
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
      setPassword('');
      setPasswordError('');
      
    } catch (error) {
      console.error('Error deleting employee:', error);
      setPasswordError('Error deleting employee: ' + error.message);
    }
  };

  const handleStatusChange = async () => {
    try {
      const passwordCheck = await api.verifyPassword(password);
      
      if (!passwordCheck.success) {
        setPasswordError('Incorrect password');
        return;
      }

      const newStatus = selectedEmployee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updateEmployeeStatus(selectedEmployee.id, newStatus);
      
      fetchEmployees();
      
      setStatusDialogOpen(false);
      setSelectedEmployee(null);
      setPassword('');
      setPasswordError('');
      
    } catch (error) {
      console.error('Error updating employee status:', error);
      setPasswordError('Error updating status: ' + error.message);
    }
  };

  const handleMenuClick = (event, employee) => {
    setAnchorEl(event.currentTarget);
    setSelectedEmployee(employee);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusClick = () => {
    setStatusDialogOpen(true);
    setPassword('');
    setPasswordError('');
    handleMenuClose();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      Error: {error}
      <Button onClick={handleRefresh}>Retry</Button>
    </div>
  );

  const filteredEmployees = employees.filter(employee => 
    employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'error';
      case 'ON_LEAVE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return format(date, 'dd MMM yyyy');
    } catch (error) {
      console.error('Date parsing error:', error);
      return '-';
    }
  };

  return (
    <div className="employees-container">
      <Paper className="employees-paper">
        <Box className="employees-header">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Employee List
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell>Joining Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Loading...</TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No employees found</TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow 
                    key={employee.id}
                    sx={{
                      opacity: employee.status === 'INACTIVE' ? 0.7 : 1,
                      backgroundColor: employee.status === 'INACTIVE' ? '#f5f5f5' : 'inherit'
                    }}
                  >
                    <TableCell>{employee.id}</TableCell>
                    <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                    <TableCell>{employee.department_name}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>{formatDate(employee.joining_date)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={employee.status}
                        color={getStatusColor(employee.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, employee)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleStatusClick}>
          <ListItemIcon>
            {selectedEmployee?.status === 'ACTIVE' ? <Block color="error" /> : <CheckCircle color="success" />}
          </ListItemIcon>
          <ListItemText>
            {selectedEmployee?.status === 'ACTIVE' ? 'Set Inactive' : 'Set Active'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeleteClick(selectedEmployee);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Delete color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete employee {selectedEmployee?.first_name} {selectedEmployee?.last_name}?
            This will delete all records associated with this employee.
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Enter Password to Confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!passwordError}
            helperText={passwordError}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={!password}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>
          {selectedEmployee?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Employee
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to {selectedEmployee?.status === 'ACTIVE' ? 'deactivate' : 'activate'} employee {selectedEmployee?.first_name} {selectedEmployee?.last_name}?
            {selectedEmployee?.status === 'ACTIVE' 
              ? ' This will hide the employee from attendance and salary processing.'
              : ' This will make the employee available for attendance and salary processing.'}
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Enter Password to Confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!passwordError}
            helperText={passwordError}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStatusChange}
            color={selectedEmployee?.status === 'ACTIVE' ? 'error' : 'success'}
            variant="contained"
            disabled={!password}
          >
            {selectedEmployee?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Employees; 