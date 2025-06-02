import React, { useState, useEffect } from 'react';
import config from '../../config';
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
  Divider,
  Autocomplete
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';
import { format } from 'date-fns';

const SaleOutForm = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [isPrinted, setIsPrinted] = useState(false);
  const [paperTypes, setPaperTypes] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

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

  useEffect(() => {
    fetchCustomers();
    fetchPaperTypes();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      // Fetch customers from all levels
      const [level1Res, level2Res, level3Res] = await Promise.all([
        fetch(`${config.apiUrl}/accounts/chart/level1?account_type=CUSTOMER`),
        fetch(`${config.apiUrl}/accounts/chart/level2?account_type=CUSTOMER`),
        fetch(`${config.apiUrl}/accounts/chart/level3?account_type=CUSTOMER`)
      ]);

      if (!level1Res.ok || !level2Res.ok || !level3Res.ok) {
        throw new Error('Failed to fetch customers');
      }

      const [level1Data, level2Data, level3Data] = await Promise.all([
        level1Res.json(),
        level2Res.json(),
        level3Res.json()
      ]);

      // Extract all Level 3 accounts from the nested structure
      const allLevel3Accounts = [];
      level3Data.forEach(level1 => {
        if (level1.level2_accounts) {
          level1.level2_accounts.forEach(level2 => {
            if (level2.level3_accounts) {
              level2.level3_accounts.forEach(level3 => {
                if (level3.account_type === 'CUSTOMER') {
                  allLevel3Accounts.push({
                    ...level3,
                    level: 3,
                    level1_id: level1.id,
                    level2_id: level2.id,
                    level1_name: level1.name,
                    level2_name: level2.name,
                    displayName: `${level1.name} > ${level2.name} > ${level3.name}`
                  });
                }
              });
            }
          });
        }
      });

      // Filter and combine all customers from different levels
      const allCustomers = [
        ...level1Data
          .filter(customer => customer.account_type === 'CUSTOMER')
          .map(customer => ({
            ...customer,
            level: 1,
            displayName: customer.name
          })),
        ...level2Data
          .filter(customer => customer.account_type === 'CUSTOMER')
          .map(customer => ({
            ...customer,
            level: 2,
            displayName: `${customer.level1_name} > ${customer.name}`
          })),
        ...allLevel3Accounts
      ];

      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers: ' + error.message);
    } finally {
      setLoadingCustomers(false);
    }
  };

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

  // Generate GRN number when customer and paper type are selected
  useEffect(() => {
    const generateGRN = () => {
      if (!selectedCustomer || !formData.paperType) return;

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      // Get customer code from name
      const customerCode = selectedCustomer.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);

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
  }, [selectedCustomer, formData.paperType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || !formData.quantity || !formData.vehicleType || !formData.vehicleNumber) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/gate/out/sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grnNumber: formData.grnNumber,
          customerId: selectedCustomer.id,
          paperType: formData.paperType,
          quantity: formData.quantity,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          driverName: formData.driverName,
          dateTime: formData.dateTime,
          unit: formData.unit,
          remarks: formData.remarks
        })
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
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error recording sale out:', error);
      alert('Error recording sale out');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const currentTime = format(new Date(), 'HH:mm:ss');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Out Gate Pass</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              margin: 2cm;
              font-family: Arial, sans-serif;
              color: #000;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 1cm;
            }
            .company-name {
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 0.5cm;
            }
            .document-title {
              font-size: 16pt;
              text-transform: uppercase;
              margin-bottom: 1cm;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1cm;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
            }
            .signatures {
              margin-top: 2cm;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1cm;
            }
            .signature-box {
              text-align: center;
            }
            .signature-line {
              margin-top: 1cm;
              border-top: 1px solid #000;
              padding-top: 0.5cm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Rose Paper Mill</div>
            <div class="document-title">Sale Out Gate Pass</div>
          </div>

          <table>
            <tr>
              <th colspan="2">Basic Information</th>
            </tr>
            <tr>
              <td><strong>GRN Number:</strong></td>
              <td>${formData.grnNumber}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong></td>
              <td>${currentDate}</td>
            </tr>
            <tr>
              <td><strong>Time:</strong></td>
              <td>${currentTime}</td>
            </tr>
            <tr>
              <td><strong>Customer:</strong></td>
              <td>${selectedCustomer?.name || 'N/A'}</td>
            </tr>
          </table>

          <table>
            <tr>
              <th colspan="2">Vehicle Information</th>
            </tr>
            <tr>
              <td><strong>Vehicle Type:</strong></td>
              <td>${formData.vehicleType}</td>
            </tr>
            <tr>
              <td><strong>Vehicle Number:</strong></td>
              <td>${formData.vehicleNumber}</td>
            </tr>
            <tr>
              <td><strong>Driver Name:</strong></td>
              <td>${formData.driverName || 'N/A'}</td>
            </tr>
          </table>

          <table>
            <tr>
              <th colspan="2">Item Details</th>
            </tr>
            <tr>
              <td><strong>Paper Type:</strong></td>
              <td>${formData.paperType}</td>
            </tr>
            <tr>
              <td><strong>Quantity:</strong></td>
              <td>${formData.quantity} ${formData.unit}</td>
            </tr>
            ${formData.remarks ? `
            <tr>
              <td><strong>Remarks:</strong></td>
              <td>${formData.remarks}</td>
            </tr>
            ` : ''}
          </table>

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Gate Officer</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Customer</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Store Manager</div>
              </div>
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
      setIsPrinted(true);
    }, 250);
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
                <Autocomplete
                  options={customers}
                  getOptionLabel={(option) => option.displayName}
                  value={selectedCustomer}
                  onChange={(event, newValue) => {
                    setSelectedCustomer(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Customer"
                      required
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <div>
                        <div>{option.displayName}</div>
                        <div style={{ fontSize: '0.8em', color: 'gray' }}>
                          {option.level === 1 ? 'Level 1' : option.level === 2 ? 'Level 2' : 'Level 3'} - {option.account_type}
                        </div>
                      </div>
                    </li>
                  )}
                  disabled={loadingCustomers}
                />
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
                    <MenuItem key={type.id} value={type.name}>
                      {type.name}
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
                    disabled={loading || !isPrinted}
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