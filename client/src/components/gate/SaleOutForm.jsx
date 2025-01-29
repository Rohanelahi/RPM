import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Stack,
  MenuItem,
  CircularProgress,
  Divider
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';
import useAccounts from '../../hooks/useAccounts';

const SaleOutForm = () => {
  const [loading, setLoading] = useState(false);
  const { accounts: customers, loading: customersLoading } = useAccounts('CUSTOMER');

  const [formData, setFormData] = useState({
    grnNumber: '',
    customerId: '',
    paperType: '',
    vehicleType: '',
    vehicleNumber: '',
    driverName: '',
    quantity: '',
    unit: '',
    dateTime: new Date(),
    remarks: ''
  });

  const paperTypes = [
    'White Paper',
    'Kraft Paper',
    'Newspaper',
    'Books',
    'Mixed Paper',
    'Other'
  ];

  const vehicleTypes = [
    'Mazda',
    '6 Wheeler',
    '10 Wheeler',
    '18 Wheeler',
    'Other'
  ];

  const units = [
    { value: 'KG', label: 'Kilograms (KG)' },
    { value: 'TON', label: 'Tons' }
  ];

  // Generate GRN number when purchaser and paper type are selected
  useEffect(() => {
    const generateGRN = () => {
      if (!formData.customerId || !formData.paperType) return;

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      // Get customer name
      const customer = customers.find(c => c.id === formData.customerId);
      const customerCode = customer
        ? customer.account_name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 3)
        : 'XXX';

      // Get paper type code
      const paperCode = formData.paperType
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      const grnNumber = `SO-${customerCode}${paperCode}-${year}${month}${day}-${random}`;
      
      setFormData(prev => ({
        ...prev,
        grnNumber: grnNumber
      }));
    };

    generateGRN();
  }, [formData.customerId, formData.paperType, customers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId || !formData.paperType || !formData.vehicleType || 
        !formData.vehicleNumber || !formData.quantity) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const requestData = {
        ...formData,
        purchaserId: formData.customerId,
      };
      delete requestData.customerId;

      const response = await fetch('http://localhost:5000/api/gate/out/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit sale entry');
      }

      alert('Sale out recorded successfully');
      // Reset form
      setFormData({
        grnNumber: '',
        customerId: '',
        paperType: '',
        vehicleType: '',
        vehicleNumber: '',
        driverName: '',
        quantity: '',
        unit: '',
        dateTime: new Date(),
        remarks: ''
      });
    } catch (error) {
      console.error('Error recording sale out:', error);
      alert('Error recording sale out');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Print functionality will be added
  };

  return (
    <div className="gate-form">
      <Paper className="content-paper">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Sale Out Form
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Basic Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GRN Number"
                  value={formData.grnNumber}
                  disabled
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Customer"
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customerId: e.target.value
                  }))}
                  disabled={customersLoading}
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.account_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Paper Type"
                  required
                  value={formData.paperType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paperType: e.target.value
                  }))}
                >
                  {paperTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Date & Time"
                    value={formData.dateTime}
                    onChange={(newValue) => setFormData(prev => ({
                      ...prev,
                      dateTime: newValue
                    }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Vehicle Information Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Vehicle Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Vehicle Type"
                  required
                  value={formData.vehicleType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleType: e.target.value
                  }))}
                >
                  {vehicleTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vehicle Number"
                  required
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleNumber: e.target.value.toUpperCase()
                  }))}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Driver Name"
                  value={formData.driverName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    driverName: e.target.value
                  }))}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Quantity Information Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Quantity Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    quantity: e.target.value
                  }))}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Unit"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    unit: e.target.value
                  }))}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    remarks: e.target.value
                  }))}
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrint}
                  >
                    Print
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Paper>
    </div>
  );
};

export default SaleOutForm; 