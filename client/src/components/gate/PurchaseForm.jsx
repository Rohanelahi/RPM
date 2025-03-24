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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';
import useAccounts from '../../hooks/useAccounts';
import { format } from 'date-fns';

const PurchaseForm = () => {
  const [loading, setLoading] = useState(false);
  const { accounts: suppliers, loading: suppliersLoading } = useAccounts('SUPPLIER');
  const [openNewSupplier, setOpenNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    address: ''
  });

  const [formData, setFormData] = useState({
    grnNumber: '',
    vehicleNumber: '',
    driverName: '',
    supplierId: '',
    dateTime: new Date(),
    itemType: '',
    supplierQuantity: '',
    receivedQuantity: '',
    finalQuantity: '',
    unit: '',
    remarks: ''
  });

  const [isPrinted, setIsPrinted] = useState(false);

  const itemTypes = [
    'Petti',
    'Mix Maal',
    'Dabbi',
    'Cement Bag',
    'Pulp',
    'Boiler Fuel (Toori)',
    'Boiler Fuel (Tukka)'
  ];

  const units = [
    'KG',
    'Piece',
    'Liter',
    'Vehicle',
    'Feet'
  ];

  // Modified generateGRN function
  const generateGRN = (supplierName = '', itemType = '') => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get first letters of supplier name (up to 3 characters)
    const supplierCode = supplierName
      ? supplierName
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 3)
      : 'XXX';
    
    // Get first letters of item type (up to 2 characters)
    const itemCode = itemType
      ? itemType
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'XX';

    // Random number for uniqueness
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `GRN-${supplierCode}${itemCode}-${year}${month}${day}-${random}`;
  };

  // Update useEffect to generate GRN when supplier and item type change
  useEffect(() => {
    if (formData.supplierId && formData.itemType) {
      const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
      const supplierName = selectedSupplier ? selectedSupplier.account_name : '';
      const grnNumber = generateGRN(supplierName, formData.itemType);
      setFormData(prev => ({
        ...prev,
        grnNumber
      }));
    }
  }, [formData.supplierId, formData.itemType, suppliers]);

  useEffect(() => {
    // Auto calculate final quantity
    if (formData.supplierQuantity && formData.receivedQuantity) {
      const supplierQty = parseFloat(formData.supplierQuantity);
      const receivedQty = parseFloat(formData.receivedQuantity);
      setFormData(prev => ({
        ...prev,
        finalQuantity: Math.min(supplierQty, receivedQty).toString()
      }));
    }
  }, [formData.supplierQuantity, formData.receivedQuantity]);

  const handleAddNewSupplier = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/accounts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_name: newSupplier.name.trim(),
          account_type: 'SUPPLIER',
          contact_person: newSupplier.contact?.trim() || null,
          phone: newSupplier.contact?.trim() || null,
          address: newSupplier.address?.trim() || null,
          opening_balance: 0,
          current_balance: 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add supplier');
      }

      setOpenNewSupplier(false);
      setNewSupplier({ name: '', contact: '', address: '' });
      
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Failed to add supplier: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gate In - Purchase Entry</title>
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
              margin-bottom: 2cm;
            }
            .company-name {
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 0.5cm;
            }
            .document-title {
              font-size: 16pt;
              text-transform: uppercase;
              margin: 1cm 0;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1cm;
              margin-bottom: 1cm;
            }
            .detail-item {
              margin-bottom: 0.5cm;
            }
            .label {
              font-weight: bold;
              color: #000 !important;
            }
            .value {
              margin-top: 0.2cm;
              color: #000 !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1cm 0;
              color: #000 !important;
            }
            th, td {
              border: 1px solid #000 !important;
              padding: 0.5cm;
              text-align: left;
            }
            th {
              background-color: #f0f0f0 !important;
              color: #000 !important;
              font-weight: bold;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
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
              border-top: 1px solid #000;
              padding-top: 0.5cm;
            }

            /* Ensure black borders print clearly */
            table, th, td {
              border-color: #000 !important;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Rose Paper Mill</div>
            <div class="document-title">Gate In - Purchase Entry</div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <div class="label">GRN Number:</div>
              <div class="value">${formData.grnNumber}</div>
            </div>
            <div class="detail-item">
              <div class="label">Date:</div>
              <div class="value">${currentDate}</div>
            </div>
            <div class="detail-item">
              <div class="label">Supplier:</div>
              <div class="value">${selectedSupplier?.account_name || ''}</div>
            </div>
            <div class="detail-item">
              <div class="label">Vehicle Number:</div>
              <div class="value">${formData.vehicleNumber}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Item Type</td>
                <td>${formData.itemType}</td>
              </tr>
              <tr>
                <td>Supplier Quantity</td>
                <td>${formData.supplierQuantity} ${formData.unit}</td>
              </tr>
              <tr>
                <td>Received Quantity</td>
                <td>${formData.receivedQuantity} ${formData.unit}</td>
              </tr>
              <tr>
                <td>Final Quantity</td>
                <td>${formData.finalQuantity} ${formData.unit}</td>
              </tr>
              ${formData.remarks ? `
                <tr>
                  <td>Remarks</td>
                  <td>${formData.remarks}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Gate Officer</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Supplier</div>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.itemType || !formData.vehicleNumber || 
        !formData.supplierQuantity || !formData.receivedQuantity || !formData.unit) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('http://localhost:5000/api/gate/in/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grnNumber: formData.grnNumber,
          supplierId: formData.supplierId,
          vehicleNumber: formData.vehicleNumber.toUpperCase(),
          driverName: formData.driverName || null,
          itemType: formData.itemType,
          quantity: parseFloat(formData.finalQuantity),
          unit: formData.unit,
          dateTime: formData.dateTime,
          remarks: `Supplier Qty: ${formData.supplierQuantity}, Received Qty: ${formData.receivedQuantity}, ${formData.remarks || ''}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase entry');
      }

      const result = await response.json();
      
      alert('Purchase entry created successfully');
      // Reset form
      setFormData({
        grnNumber: '',
        vehicleNumber: '',
        driverName: '',
        supplierId: '',
        dateTime: new Date(),
        itemType: '',
        supplierQuantity: '',
        receivedQuantity: '',
        finalQuantity: '',
        unit: '',
        remarks: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error creating purchase entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle enter key
  const handleKeyPress = (event, nextFieldId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  return (
    <div className="gate-form">
      <Paper className="content-paper">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Gate In Entry Form
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
                  label="Vehicle Number"
                  required
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleNumber: e.target.value
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
                  onKeyPress={(e) => handleKeyPress(e, 'supplierId')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    select
                    label="Supplier"
                    required
                    value={formData.supplierId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      supplierId: e.target.value
                    }))}
                    disabled={suppliersLoading}
                    onKeyPress={(e) => handleKeyPress(e, 'itemType')}
                  >
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.account_name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    onClick={() => setOpenNewSupplier(true)}
                  >
                    New
                  </Button>
                </Stack>
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

              {/* Item Details Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Item Details
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Item Type"
                  required
                  value={formData.itemType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    itemType: e.target.value
                  }))}
                >
                  {itemTypes.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
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
                >
                  {units.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Supplier Quantity"
                  required
                  type="number"
                  value={formData.supplierQuantity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supplierQuantity: e.target.value
                  }))}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Received Quantity"
                  required
                  type="number"
                  value={formData.receivedQuantity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    receivedQuantity: e.target.value
                  }))}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Final Quantity"
                  disabled
                  value={formData.finalQuantity}
                />
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
                    color="primary"
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

      {/* New Supplier Dialog */}
      <Dialog open={openNewSupplier} onClose={() => setOpenNewSupplier(false)}>
        <DialogTitle>Add New Supplier</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier Name"
                required
                value={newSupplier.name}
                onChange={(e) => setNewSupplier(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Number"
                value={newSupplier.contact}
                onChange={(e) => setNewSupplier(prev => ({
                  ...prev,
                  contact: e.target.value
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={3}
                value={newSupplier.address}
                onChange={(e) => setNewSupplier(prev => ({
                  ...prev,
                  address: e.target.value
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewSupplier(false)}>Cancel</Button>
          <Button onClick={handleAddNewSupplier} variant="contained">
            Add Supplier
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PurchaseForm; 