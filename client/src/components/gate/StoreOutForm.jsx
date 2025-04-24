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
import { format } from 'date-fns';

const StoreOutForm = () => {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [isPrinted, setIsPrinted] = useState(false);
  
  const [formData, setFormData] = useState({
    vendorId: '',
    grnNumber: '',
    itemId: '',
    quantity: '',
    unit: '',
    dateTime: new Date(),
    remarks: '',
    originalQuantity: 0,
    returnedQuantity: 0,
    vendorName: '',
    itemName: '',
    currentStock: 0,
    returnGRN: ''
  });

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/accounts/vendors`);
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch vendors');
    }
  };

  // Fetch GRNs based on selected vendor
  const fetchVendorGRNs = async (vendorId) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/store/vendor-grns/${vendorId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch GRNs');
      }
      
      const data = await response.json();
      console.log('Fetched GRNs:', data);
      setGrnList(data);
      
      // Reset GRN selection when vendor changes
      setFormData(prev => ({
        ...prev,
        vendorId,
        grnNumber: '',
      }));
      setSelectedGRN(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch GRNs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch GRN details when selected
  const fetchGRNDetails = async (grnNumber) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/store/grn-details/${grnNumber}`);
      if (!response.ok) throw new Error('Failed to fetch GRN details');
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        grnNumber,
        itemId: data.item_id,
        unit: data.unit,
        itemName: data.item_name,
        originalQuantity: data.original_quantity,
        returnedQuantity: data.returned_quantity,
        currentStock: data.current_stock,
        vendorName: data.vendor_name
      }));
      
      setSelectedGRN(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch GRN details');
    } finally {
      setLoading(false);
    }
  };

  // Add this function to generate return GRN
  const generateReturnGRN = (originalGRN) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 23).replace(/[:.]/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const returnGRN = `R${date}${time}${random}`;
    
    // Set the returnGRN in formData
    setFormData(prev => ({
      ...prev,
      returnGRN: returnGRN
    }));
    
    return returnGRN;
  };

  // Modified submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const remainingQuantity = selectedGRN.quantity - selectedGRN.returned_quantity;
    if (Number(formData.quantity) > remainingQuantity) {
      alert(`Return quantity cannot exceed remaining quantity (${remainingQuantity})`);
      return;
    }

    try {
      setLoading(true);
      // Generate return GRN and store it in formData
      const returnGRN = generateReturnGRN(formData.grnNumber);
      
      console.log('Generated Return GRN:', returnGRN); // Debug log

      const requestBody = {
        returnGRN,
        originalGRN: formData.grnNumber,
        quantity: Number(formData.quantity),
        dateTime: formData.dateTime,
        remarks: formData.remarks,
        entryType: 'STORE_RETURN',
        vendorId: formData.vendorId,
        itemId: formData.itemId,
        unit: formData.unit
      };

      console.log('Sending request:', requestBody); // Debug log

      const response = await fetch(`${config.apiUrl}/store/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      alert('Store return processed successfully');
      // Reset form
      setFormData({
        vendorId: '',
        grnNumber: '',
        itemId: '',
        quantity: '',
        unit: '',
        dateTime: new Date(),
        remarks: '',
        originalQuantity: 0,
        returnedQuantity: 0,
        vendorName: '',
        itemName: '',
        currentStock: 0,
        returnGRN: ''
      });
      setSelectedGRN(null);
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const currentTime = format(new Date(), 'HH:mm:ss');
    const selectedVendor = vendors.find(v => v.id === formData.vendorId);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Store Out Gate Pass</title>
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
            <div class="document-title">Store Out Gate Pass</div>
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
              <td><strong>Original GRN:</strong></td>
              <td>${selectedGRN?.grn_number || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Vendor:</strong></td>
              <td>${selectedVendor?.account_name || 'N/A'}</td>
            </tr>
          </table>

          <table>
            <tr>
              <th colspan="2">Item Details</th>
            </tr>
            <tr>
              <td><strong>Item Name:</strong></td>
              <td>${formData.itemName || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Original Quantity:</strong></td>
              <td>${formData.originalQuantity} ${formData.unit}</td>
            </tr>
            <tr>
              <td><strong>Out Quantity:</strong></td>
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
                <div class="signature-line">Vendor</div>
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="gate-form">
        <Paper className="content-paper">
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Store Return Entry Form
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Return Date & Time"
                    value={formData.dateTime}
                    onChange={(newValue) => setFormData(prev => ({ ...prev, dateTime: newValue }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    id="vendorId"
                    fullWidth
                    select
                    label="Select Vendor"
                    value={formData.vendorId}
                    onChange={(e) => fetchVendorGRNs(e.target.value)}
                    disabled={loading}
                    onKeyPress={(e) => handleKeyPress(e, 'grnNumber')}
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {formData.vendorId && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      id="grnNumber"
                      fullWidth
                      select
                      label="GRN Number"
                      value={formData.grnNumber}
                      onChange={(e) => fetchGRNDetails(e.target.value)}
                      disabled={loading || !grnList.length}
                      onKeyPress={(e) => handleKeyPress(e, 'quantity')}
                    >
                      {grnList.map((grn) => (
                        <MenuItem key={grn.grn_number} value={grn.grn_number}>
                          {`${grn.grn_number} - ${grn.item_name} (Available: ${grn.quantity - grn.returned_quantity} ${grn.unit || ''})`}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}

                {selectedGRN && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Original GRN Number"
                        value={formData.grnNumber || ''}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Return GRN Number (Preview)"
                        value={formData.returnGRN || (formData.grnNumber ? generateReturnGRN(formData.grnNumber) : '')}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Item Name"
                        value={formData.itemName || ''}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Unit"
                        value={formData.unit || ''}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Original Entry Quantity"
                        value={formData.originalQuantity || ''}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Current Stock"
                        value={formData.currentStock || ''}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Already Returned"
                        value={formData.returnedQuantity || '0'}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        id="quantity"
                        fullWidth
                        type="number"
                        label="Return Quantity"
                        required
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          quantity: e.target.value
                        }))}
                        inputProps={{
                          min: 1,
                          max: Math.min(
                            formData.currentStock,
                            formData.originalQuantity - formData.returnedQuantity
                          )
                        }}
                        onKeyPress={(e) => handleKeyPress(e, 'remarks')}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        id="remarks"
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
                  </>
                )}

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
    </LocalizationProvider>
  );
};

export default StoreOutForm; 