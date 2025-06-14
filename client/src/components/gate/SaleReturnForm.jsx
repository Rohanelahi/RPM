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

const SaleReturnForm = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [saleGRNs, setSaleGRNs] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPrinted, setIsPrinted] = useState(false);
  const [paperTypes, setPaperTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    returnNumber: '',
    saleGRN: '',
    purchaserId: '',
    vehicleType: '',
    vehicleNumber: '',
    driverName: '',
    paperType: '',
    originalQuantity: '',
    returnQuantity: '',
    unit: '',
    returnReason: '',
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

  const returnReasons = [
    'Quality Issue',
    'Wrong Delivery',
    'Excess Quantity',
    'Payment Issue',
    'Other'
  ];

  // Update the fetchCustomers function to match SaleOutForm
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
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
      setCustomersLoading(false);
    }
  };

  // Update useEffect to call fetchCustomers
  useEffect(() => {
    fetchCustomers();
    fetchPaperTypes();
  }, []);

  // Update the customer selection handler
  const handleCustomerSelect = (event, newValue) => {
    setSelectedCustomer(newValue);
    setFormData(prev => ({
      ...prev,
      purchaserId: newValue?.id || '',
      saleGRN: ''
    }));
  };

  // Generate return number
  useEffect(() => {
    const generateReturnNumber = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `SRET-${year}${month}${day}-${random}`;
    };

    setFormData(prev => ({
      ...prev,
      returnNumber: generateReturnNumber()
    }));
  }, []);

  // Update the fetchSaleGRNs function to filter out GRNs that already have returns
  useEffect(() => {
    const fetchSaleGRNs = async () => {
      if (!formData.purchaserId) {
        setSaleGRNs([]);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`${config.apiUrl}/gate/grns/purchaser/${formData.purchaserId}`);
        if (!response.ok) throw new Error('Failed to fetch GRNs');
        const data = await response.json();
        // Filter out GRNs that already have returns
        const availableGRNs = data.filter(grn => !grn.has_return);
        setSaleGRNs(availableGRNs);
      } catch (error) {
        console.error('Error fetching GRNs:', error);
        alert('Error fetching GRNs');
      } finally {
        setLoading(false);
      }
    };

    fetchSaleGRNs();
  }, [formData.purchaserId]);

  // Update the handleGRNSelect function to populate all details
  const handleGRNSelect = async (grnNumber) => {
    const selectedGRN = saleGRNs.find(grn => grn.grn_number === grnNumber);
    if (selectedGRN) {
      try {
        // Get the pricing details for this GRN
        const response = await fetch(`${config.apiUrl}/gate/sale-return/pricing/${grnNumber}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.warn('No pricing details found for GRN:', grnNumber);
            // Continue with default values
            setFormData(prev => ({
              ...prev,
              saleGRN: grnNumber,
              originalQuantity: selectedGRN.quantity,
              paperType: selectedGRN.paper_type || selectedGRN.item_type,
              unit: selectedGRN.unit,
              vehicleType: selectedGRN.vehicle_type,
              vehicleNumber: selectedGRN.vehicle_number,
              driverName: selectedGRN.driver_name,
              dateTime: new Date(),
              remarks: `Return against Sale GRN: ${grnNumber}`
            }));
            return;
          }
          throw new Error('Failed to fetch pricing details');
        }
        
        const pricingData = await response.json();
        
        setFormData(prev => ({
          ...prev,
          saleGRN: grnNumber,
          originalQuantity: selectedGRN.quantity,
          paperType: selectedGRN.paper_type || selectedGRN.item_type,
          unit: selectedGRN.unit,
          vehicleType: selectedGRN.vehicle_type,
          vehicleNumber: selectedGRN.vehicle_number,
          driverName: selectedGRN.driver_name,
          dateTime: new Date(),
          remarks: `Return against Sale GRN: ${grnNumber}`
        }));
      } catch (error) {
        console.error('Error fetching pricing details:', error);
        // Continue with default values even if pricing fetch fails
        setFormData(prev => ({
          ...prev,
          saleGRN: grnNumber,
          originalQuantity: selectedGRN.quantity,
          paperType: selectedGRN.paper_type || selectedGRN.item_type,
          unit: selectedGRN.unit,
          vehicleType: selectedGRN.vehicle_type,
          vehicleNumber: selectedGRN.vehicle_number,
          driverName: selectedGRN.driver_name,
          dateTime: new Date(),
          remarks: `Return against Sale GRN: ${grnNumber}`
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.purchaserId || !formData.saleGRN || !formData.returnQuantity || !formData.returnReason) {
      alert('Please fill all required fields');
      return;
    }

    if (parseFloat(formData.returnQuantity) > parseFloat(formData.originalQuantity)) {
      alert('Return quantity cannot be greater than original quantity');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/gate/in/sale-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dateTime: formData.dateTime.toISOString(),
          entryType: 'SALE_RETURN'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record sale return');
      }

      const result = await response.json();
      console.log('Sale return recorded:', result);
      
      alert('Sale return recorded successfully');
      
      // Reset form
      setFormData({
        returnNumber: '',
        saleGRN: '',
        purchaserId: '',
        vehicleType: '',
        vehicleNumber: '',
        driverName: '',
        paperType: '',
        originalQuantity: '',
        returnQuantity: '',
        unit: '',
        returnReason: '',
        dateTime: new Date(),
        remarks: ''
      });
      setSelectedCustomer(null);

      // Refresh GRNs list to remove the one just returned
      if (formData.purchaserId) {
        const response = await fetch(`${config.apiUrl}/gate/grns/purchaser/${formData.purchaserId}`);
        if (response.ok) {
          const data = await response.json();
          const availableGRNs = data.filter(grn => !grn.has_return);
          setSaleGRNs(availableGRNs);
        }
      }

      // Generate new return number
      const generateReturnNumber = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `SRET-${year}${month}${day}-${random}`;
      };

      setFormData(prev => ({
        ...prev,
        returnNumber: generateReturnNumber()
      }));

    } catch (error) {
      console.error('Error:', error);
      alert('Error recording sale return: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const currentTime = format(new Date(), 'HH:mm:ss');
    const selectedCustomer = customers.find(c => c.id === formData.purchaserId);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Return Gate Pass</title>
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
            <div class="document-title">Sale Return Gate Pass</div>
          </div>

          <table>
            <tr>
              <th colspan="2">Basic Information</th>
            </tr>
            <tr>
              <td><strong>Return Number:</strong></td>
              <td>${formData.returnNumber}</td>
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
            <tr>
              <td><strong>Sale GRN:</strong></td>
              <td>${formData.saleGRN}</td>
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
              <td><strong>Original Quantity:</strong></td>
              <td>${formData.originalQuantity} ${formData.unit}</td>
            </tr>
            <tr>
              <td><strong>Return Quantity:</strong></td>
              <td>${formData.returnQuantity} ${formData.unit}</td>
            </tr>
            <tr>
              <td><strong>Return Reason:</strong></td>
              <td>${formData.returnReason}</td>
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

  const handleKeyPress = (event, nextFieldId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  useEffect(() => {
    fetchPaperTypes();
  }, []);

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

  return (
    <div className="gate-form">
      <Paper className="content-paper">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Sale Return Form
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
                  label="Return Number"
                  value={formData.returnNumber}
                  disabled
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={customers}
                  getOptionLabel={(option) => option.displayName}
                  value={selectedCustomer}
                  onChange={handleCustomerSelect}
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
                  disabled={customersLoading}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Sale GRN"
                  required
                  value={formData.saleGRN}
                  onChange={(e) => handleGRNSelect(e.target.value)}
                  disabled={!formData.purchaserId || loading}
                  onKeyPress={(e) => handleKeyPress(e, 'vehicleType')}
                >
                  {saleGRNs.map((grn) => (
                    <MenuItem key={grn.grn_number} value={grn.grn_number}>
                      {grn.grn_number} - {grn.paper_type} ({grn.quantity} {grn.unit})
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
                  onKeyPress={(e) => handleKeyPress(e, 'vehicleNumber')}
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
                  onKeyPress={(e) => handleKeyPress(e, 'driverName')}
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
                  onKeyPress={(e) => handleKeyPress(e, 'returnQuantity')}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Return Details Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Return Details
                </Typography>
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
                  disabled // Disable since it's auto-populated from sale GRN
                >
                  {paperTypes.map((type) => (
                    <MenuItem key={type.id} value={type.name}>
                      {type.name}
                    </MenuItem>
                  ))}
                </TextField>
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
                  disabled // Disable since it's auto-populated from sale GRN
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Original Sale Quantity"
                  type="number"
                  value={formData.originalQuantity || ''}
                  disabled
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Return Quantity"
                  required
                  type="number"
                  value={formData.returnQuantity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    returnQuantity: e.target.value
                  }))}
                  onKeyPress={(e) => handleKeyPress(e, 'returnReason')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Return Reason"
                  required
                  value={formData.returnReason}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    returnReason: e.target.value
                  }))}
                  onKeyPress={(e) => handleKeyPress(e, 'remarks')}
                >
                  {returnReasons.map((reason) => (
                    <MenuItem key={reason} value={reason}>
                      {reason}
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
                    {loading ? <CircularProgress size={24} /> : 'Submit Return'}
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

export default SaleReturnForm; 