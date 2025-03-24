import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import '../../styles/forms/AppointmentForm.css';
import api from '../../services/api';

const AppointmentForm = () => {
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    department: '',
    designation: '',
    joiningDate: null,
    salary: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  // Fetch departments from database
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.getDepartments();
        setDepartments(response);
      } catch (error) {
        console.error('Error fetching departments:', error);
        alert('Error loading departments');
      }
    };

    fetchDepartments();
  }, []);

  // Auto-generate employee ID based on department
  useEffect(() => {
    if (formData.department) {
      const dept = departments.find(d => d.name === formData.department);
      if (dept) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const year = new Date().getFullYear().toString().slice(-2);
        const newEmployeeId = `${year}${dept.code}${randomNum}`;
        setFormData(prev => ({ ...prev, employeeId: newEmployeeId }));
      }
    }
  }, [formData.department, departments]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      joiningDate: date,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.department || 
          !formData.designation || !formData.joiningDate || !formData.salary || 
          !formData.phone || !formData.emergencyContactName || !formData.emergencyContactPhone) {
        throw new Error('Please fill in all required fields');
      }

      // Get department ID based on selected department name
      const selectedDept = departments.find(d => d.name === formData.department);
      if (!selectedDept) {
        throw new Error('Please select a valid department');
      }

      // Format the data according to your database schema
      const employeeData = {
        id: formData.employeeId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        departmentId: selectedDept.id,
        designation: formData.designation,
        joiningDate: format(formData.joiningDate, 'yyyy-MM-dd'),
        salary: parseFloat(formData.salary),
        phone: formData.phone,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone
      };

      console.log('Submitting employee data:', employeeData);

      // Send data to backend
      const response = await api.createEmployee(employeeData);
      console.log('Server response:', response);

      // Show success message
      alert('Employee created successfully!');

      // Reset form
      setFormData({
        employeeId: '',
        firstName: '',
        lastName: '',
        department: '',
        designation: '',
        joiningDate: null,
        salary: '',
        phone: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
      });

    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Error creating employee: ' + error.message);
    }
  };

  return (
    <div className="appointment-form-container">
      <Paper className="appointment-content-paper">
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
            New Employee Appointment
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={formData.employeeId}
                  disabled
                  sx={{ backgroundColor: '#f5f5f5' }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Department"
                  value={formData.department}
                  onChange={handleChange('department')}
                  required
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  value={formData.designation}
                  onChange={handleChange('designation')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Joining Date"
                    value={formData.joiningDate}
                    onChange={handleDateChange}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Salary"
                  type="number"
                  value={formData.salary}
                  onChange={handleChange('salary')}
                  required
                  InputProps={{
                    startAdornment: 'PKR ',
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Emergency Contact Name"
                  value={formData.emergencyContactName}
                  onChange={handleChange('emergencyContactName')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Emergency Contact Number"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange('emergencyContactPhone')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  className="action-button"
                  sx={{
                    minWidth: 200,
                    height: 48,
                    textTransform: 'none',
                    fontSize: '1rem'
                  }}
                >
                  Create Employee
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Paper>
    </div>
  );
};

export default AppointmentForm; 