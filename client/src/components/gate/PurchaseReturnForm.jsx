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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print, Add } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';
import useAccounts from '../../hooks/useAccounts';
import { format } from 'date-fns';

const PurchaseReturnForm = () => {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [purchaseGRNs, setPurchaseGRNs] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isPrinted, setIsPrinted] = useState(false);
  const [itemTypes, setItemTypes] = useState([]);
  const [openNewItemType, setOpenNewItemType] = useState(false);
  const [newItemType, setNewItemType] = useState({
    name: '',
    description: ''
  });
  
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
        const response = await fetch(`${config.apiUrl}/gate/grns/supplier/${formData.supplierId}`);
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

  // Fetch item types on component mount
  useEffect(() => {
    fetchItemTypes();
  }, []);

  const fetchItemTypes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/gate/item-types`);
      if (!response.ok) throw new Error('Failed to fetch item types');
      const data = await response.json();
      setItemTypes(data);
    } catch (error) {
      console.error('Error fetching item types:', error);
      alert('Failed to fetch item types');
    }
  };

  const handleAddNewItemType = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/gate/item-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItemType),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item type');
      }

      const result = await response.json();
      setItemTypes(prev => [...prev, result]);
      setOpenNewItemType(false);
      setNewItemType({ name: '', description: '' });
      
    } catch (error) {
      console.error('Error adding item type:', error);
      alert('Failed to add item type: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

    if (parseFloat(formData.returnQuantity) > parseFloat(formData.originalQuantity)) {
      alert('Return quantity cannot be greater than original quantity');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/gate/out/purchase-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnNumber: formData.returnNumber,
          purchaseGRN: formData.purchaseGRN,
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit return');
      }

      const data = await response.json();
      console.log('Response:', data);
      alert('Purchase return recorded successfully');
      
      // Reset form
      setFormData({
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
      alert('Error recording purchase return: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const currentTime = format(new Date(), 'HH:mm:ss');
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
            <div class="company-name">Rose Paper Mill</div>
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
              <td><strong>Time:</strong></td>
              <td>${currentTime}</td>
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

  // Update the fetchSuppliers function to match PurchaseForm
  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      // Fetch suppliers from all levels
      const [level1Res, level2Res, level3Res] = await Promise.all([
        fetch(`${config.apiUrl}/accounts/chart/level1?account_type=SUPPLIER`),
        fetch(`${config.apiUrl}/accounts/chart/level2?account_type=SUPPLIER`),
        fetch(`${config.apiUrl}/accounts/chart/level3?account_type=SUPPLIER`)
      ]);

      if (!level1Res.ok || !level2Res.ok || !level3Res.ok) {
        throw new Error('Failed to fetch suppliers');
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
                if (level3.account_type === 'SUPPLIER') {
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

      // Filter and combine all suppliers from different levels
      const allSuppliers = [
        ...level1Data
          .filter(supplier => supplier.account_type === 'SUPPLIER')
          .map(supplier => ({
            ...supplier,
            level: 1,
            displayName: supplier.name
          })),
        ...level2Data
          .filter(supplier => supplier.account_type === 'SUPPLIER')
          .map(supplier => ({
            ...supplier,
            level: 2,
            displayName: `${supplier.level1_name} > ${supplier.name}`
          })),
        ...allLevel3Accounts
      ];

      setSuppliers(allSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      alert('Failed to fetch suppliers: ' + error.message);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // Update useEffect to call fetchSuppliers
  useEffect(() => {
    fetchSuppliers();
    fetchItemTypes();
  }, []);

  // Update the supplier selection handler
  const handleSupplierSelect = (event, newValue) => {
    setSelectedSupplier(newValue);
    setFormData(prev => ({
      ...prev,
      supplierId: newValue?.id || '',
      purchaseGRN: ''
    }));
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
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.displayName}
                  value={selectedSupplier}
                  onChange={handleSupplierSelect}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Supplier"
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
                  disabled={loadingSuppliers}
                />
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
                <Stack direction="row" spacing={1}>
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
                    {itemTypes.map((type) => (
                      <MenuItem key={type.id} value={type.name}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    onClick={() => setOpenNewItemType(true)}
                    startIcon={<Add />}
                  >
                    New
                  </Button>
                </Stack>
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

      {/* New Item Type Dialog */}
      <Dialog open={openNewItemType} onClose={() => setOpenNewItemType(false)}>
        <DialogTitle>Add New Item Type</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item Type Name"
                required
                value={newItemType.name}
                onChange={(e) => setNewItemType(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newItemType.description}
                onChange={(e) => setNewItemType(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewItemType(false)}>Cancel</Button>
          <Button onClick={handleAddNewItemType} variant="contained">
            Add Item Type
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PurchaseReturnForm; 