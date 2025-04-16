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
  Divider
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';
import useAccounts from '../../hooks/useAccounts';
import { format } from 'date-fns';

const PurchaseReturnForm = () => {
  const [loading, setLoading] = useState(false);
  const { accounts: suppliers, loading: suppliersLoading } = useAccounts('SUPPLIER');
  const [purchaseGRNs, setPurchaseGRNs] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isPrinted, setIsPrinted] = useState(false);
  
  const [formData, setFormData] = useState({
    returnNumber: '',
    purchaseGRN: '',
    supplierId: '',
    vehicleNumber: '',
    driverName: '',
    itemType: '',
    originalQuantity: '',
    returnQuantity: '',
    unit: '',
    returnReason: '',
    dateTime: new Date(),
    remarks: ''
  });

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

  const returnReasons = [
    'Quality Issue',
    'Wrong Delivery',
    'Excess Quantity',
    'Damaged in Transit',
    'Specification Mismatch',
    'Other'
  ];

  // Generate return number
  useEffect(() => {
    const generateReturnNumber = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `RET-${year}${month}${day}-${random}`;
    };

    setFormData(prev => ({
      ...prev,
      returnNumber: generateReturnNumber()
    }));
  }, []);

  // Fetch GRNs when supplier changes
  useEffect(() => {
    const fetchPurchaseGRNs = async () => {
      if (!formData.supplierId) {
        setPurchaseGRNs([]);
        setSelectedPurchase(null);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/gate/grns/supplier/${formData.supplierId}`);
        if (!response.ok) throw new Error('Failed to fetch GRNs');
        const data = await response.json();
        setPurchaseGRNs(data);
      } catch (error) {
        console.error('Error fetching GRNs:', error);
        alert('Error fetching GRNs');
        setPurchaseGRNs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseGRNs();
  }, [formData.supplierId]);

  // Update form when GRN is selected
  const handleGRNSelect = (grnNumber) => {
    const selected = purchaseGRNs.find(grn => grn.grn_number === grnNumber);
    if (selected) {
      console.log('Selected GRN:', selected); // Debug log
      const remainingQuantity = selected.quantity - (selected.returned_quantity || 0);
      setSelectedPurchase(selected);
      setFormData(prev => ({
        ...prev,
        purchaseGRN: selected.grn_number, // This is the original GRN
        itemType: selected.item_type,
        originalQuantity: remainingQuantity.toString(),
        unit: selected.unit,
        vehicleNumber: selected.vehicle_number || '',
        driverName: selected.driver_name || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplierId || !formData.purchaseGRN || !formData.returnQuantity || !formData.returnReason) {
      alert('Please fill all required fields');
      return;
    }

    console.log('Submitting form with GRN:', formData.purchaseGRN); // Debug log

    if (parseFloat(formData.returnQuantity) > parseFloat(formData.originalQuantity)) {
      alert('Return quantity cannot be greater than original quantity');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/gate/out/purchase-return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnNumber: formData.returnNumber,
          purchaseGRN: formData.purchaseGRN, // Make sure this is being sent
          supplierId: formData.supplierId,
          returnQuantity: formData.returnQuantity,
          returnReason: formData.returnReason,
          vehicleType: selectedPurchase?.vehicle_type || '',
          vehicleNumber: formData.vehicleNumber,
          driverName: formData.driverName,
          dateTime: formData.dateTime,
          itemType: formData.itemType,
          unit: formData.unit,
          remarks: formData.remarks
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit return');
      }

      const data = await response.json();
      console.log('Response:', data); // Debug log
      alert('Purchase return recorded successfully');
      
      // Reset form
      setFormData({
        returnNumber: '',
        purchaseGRN: '', // Clear the original GRN
        supplierId: '',
        vehicleNumber: '',
        driverName: '',
        itemType: '',
        originalQuantity: '',
        returnQuantity: '',
        unit: '',
        returnReason: '',
        dateTime: new Date(),
        remarks: ''
      });
      setSelectedPurchase(null);
      
      // Generate new return number
      const generateReturnNumber = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `RET-${year}${month}${day}-${random}`;
      };

      setFormData(prev => ({
        ...prev,
        returnNumber: generateReturnNumber()
      }));

    } catch (error) {
      console.error('Error recording purchase return:', error);
      alert('Error recording purchase return');
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
          <title>Purchase Return Gate Pass</title>
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
            <div class="company-name">ACME PAPER PRODUCTS</div>
            <div class="document-title">Purchase Return Gate Pass</div>
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
              <td><strong>Supplier:</strong></td>
              <td>${selectedSupplier?.account_name || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Purchase GRN:</strong></td>
              <td>${formData.purchaseGRN}</td>
            </tr>
          </table>

          <table>
            <tr>
              <th colspan="2">Vehicle Information</th>
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
              <td><strong>Item Type:</strong></td>
              <td>${formData.itemType}</td>
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
            Purchase Return Form
          </Typography>
          {/* Debug info */}
          {formData.purchaseGRN && (
            <Typography variant="caption" color="text.secondary">
              Selected GRN: {formData.purchaseGRN}
            </Typography>
          )}
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
                <TextField
                  fullWidth
                  select
                  label="Supplier"
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supplierId: e.target.value,
                    purchaseGRN: ''
                  }))}
                  disabled={suppliersLoading}
                  onKeyPress={(e) => handleKeyPress(e, 'purchaseGRN')}
                >
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.account_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Purchase GRN"
                  required
                  value={formData.purchaseGRN}
                  onChange={(e) => handleGRNSelect(e.target.value)}
                  disabled={!formData.supplierId || loading}
                  onKeyPress={(e) => handleKeyPress(e, 'vehicleNumber')}
                >
                  {purchaseGRNs.map((grn) => (
                    <MenuItem key={grn.grn_number} value={grn.grn_number}>
                      {grn.grn_number} - {grn.item_type} ({grn.quantity} {grn.unit})
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
                  onKeyPress={(e) => handleKeyPress(e, 'itemType')}
                />
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
                  onKeyPress={(e) => handleKeyPress(e, 'unit')}
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
                  onKeyPress={(e) => handleKeyPress(e, 'originalQuantity')}
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
                  label="Original Quantity"
                  required
                  type="number"
                  value={formData.originalQuantity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    originalQuantity: e.target.value
                  }))}
                  onKeyPress={(e) => handleKeyPress(e, 'returnQuantity')}
                />
              </Grid>

              <Grid item xs={12} md={4}>
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
                  {returnReasons.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
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

export default PurchaseReturnForm; 