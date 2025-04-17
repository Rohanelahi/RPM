import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  Stack,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Print } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import config from '../../config';

const ProductionForm = ({ onProductionAdded }) => {
  const [formData, setFormData] = useState({
    date: new Date(),
    paperType: '',
    totalWeight: '0',
    boilerFuelType: '',
    boilerFuelQuantity: '',
    boilerFuelCost: '',
    electricityUnits: '',
    electricityUnitPrice: '',
    electricityCost: '0',
    recipe: [{ raddiType: '', percentageUsed: '', yield: '' }],
    totalYield: ''
  });

  const [isPrinted, setIsPrinted] = useState(false);
  const [loading, setLoading] = useState(false);

  const paperTypes = ['SUPER', 'CMP', 'BOARD'];
  const boilerFuelTypes = ['Boiler Fuel (Toori)', 'Boiler Fuel (Tukka)'];
  const raddiTypes = ['Petti', 'DABBI', 'CEMENT BAG'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: value
      };

      // Calculate electricity cost when either units or unit price changes
      if (name === 'electricityUnits' || name === 'electricityUnitPrice') {
        const units = name === 'electricityUnits' ? value : prev.electricityUnits;
        const unitPrice = name === 'electricityUnitPrice' ? value : prev.electricityUnitPrice;
        newState.electricityCost = calculateElectricityCost(units, unitPrice);
      }

      return newState;
    });
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date
    }));
  };

  const handleRecipeChange = (index, field, value) => {
    const newRecipe = [...formData.recipe];
    newRecipe[index][field] = value;
    setFormData(prev => ({
      ...prev,
      recipe: newRecipe
    }));
  };

  const addRecipe = () => {
    setFormData(prev => ({
      ...prev,
      recipe: [...prev.recipe, { raddiType: '', percentageUsed: '', yield: '' }]
    }));
  };

  const removeRecipe = (index) => {
    setFormData(prev => ({
      ...prev,
      recipe: prev.recipe.filter((_, i) => i !== index)
    }));
  };

  const calculateRaddiQuantities = () => {
    return formData.recipe.map(item => {
      if (!item.percentageUsed || !item.yield) return { ...item, quantityUsed: '0' };
      
      const totalWeight = parseFloat(formData.totalWeight) || 0;
      const percentageUsed = parseFloat(item.percentageUsed) || 0;
      const yieldPercentage = parseFloat(item.yield) || 0;
      
      // New formula: (totalWeight + (totalWeight - totalWeight * (yield/100))) * (percentage/100)
      const wastage = totalWeight - (totalWeight * (yieldPercentage / 100));
      const totalRequired = totalWeight + wastage;
      const quantityUsed = totalRequired * (percentageUsed / 100);
      
      return {
        ...item,
        quantityUsed: quantityUsed.toFixed(2)
      };
    });
  };

  const calculateElectricityCost = (units, unitPrice) => {
    const calculatedCost = (parseFloat(units) || 0) * (parseFloat(unitPrice) || 0);
    return calculatedCost.toFixed(2);
  };

  const checkStockAvailability = async (recipe) => {
    const response = await fetch(`${config.apiUrl}/production/check-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipe })
    });

    if (!response.ok) throw new Error('Failed to check stock');
    const stockChecks = await response.json();

    const insufficientStock = stockChecks.filter(check => !check.sufficient);
    if (insufficientStock.length > 0) {
      const message = insufficientStock.map(item => 
        `${item.raddiType}: Need ${item.required}kg, Available ${item.available}kg`
      ).join('\n');
      throw new Error(`Insufficient stock:\n${message}`);
    }

    return true;
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      paperType: '',
      totalWeight: '0',
      boilerFuelType: '',
      boilerFuelQuantity: '',
      boilerFuelCost: '',
      electricityUnits: '',
      electricityUnitPrice: '',
      electricityCost: '0',
      recipe: [{ raddiType: '', percentageUsed: '', yield: '' }],
      totalYield: ''
    });
  };

  const handlePrint = () => {
    const currentDate = format(formData.date, 'dd/MM/yyyy');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Production Form</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 2cm;
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
            <div class="company-name">ROSE PAPER MILL</div>
            <div class="document-title">Production Form</div>
            <div>Date: ${currentDate}</div>
          </div>

          <table>
            <tr>
              <th colspan="2">Basic Information</th>
            </tr>
            <tr>
              <td><strong>Paper Type:</strong></td>
              <td>${formData.paperType}</td>
            </tr>
            <tr>
              <td><strong>Total Weight:</strong></td>
              <td>${formData.totalWeight} kg</td>
            </tr>
          </table>

          <table>
            <tr>
              <th colspan="4">Recipe</th>
            </tr>
            <tr>
              <th>Raddi Type</th>
              <th>Percentage Used</th>
              <th>Yield (%)</th>
              <th>Quantity (kg)</th>
            </tr>
            ${formData.recipe.map(item => {
              const totalWeight = parseFloat(formData.totalWeight);
              const wastage = totalWeight - (totalWeight * (parseFloat(item.yield) / 100));
              const totalRequired = totalWeight + wastage;
              const quantity = totalRequired * (parseFloat(item.percentageUsed) / 100);
              return `
                <tr>
                  <td>${item.raddiType}</td>
                  <td>${item.percentageUsed}%</td>
                  <td>${item.yield}%</td>
                  <td>${quantity.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </table>

          <table>
            <tr>
              <th colspan="2">Electricity Details</th>
            </tr>
            <tr>
              <td><strong>Units Consumed:</strong></td>
              <td>${formData.electricityUnits}</td>
            </tr>
            <tr>
              <td><strong>Unit Price:</strong></td>
              <td>Rs. ${formData.electricityUnitPrice}</td>
            </tr>
            <tr>
              <td><strong>Total Cost:</strong></td>
              <td>Rs. ${formData.electricityCost}</td>
            </tr>
          </table>

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Production Manager</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Store Manager</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Director</div>
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
    try {
      setLoading(true);
      const recipeWithQuantities = calculateRaddiQuantities();
      
      await checkStockAvailability(recipeWithQuantities);

      const submissionData = {
        ...formData,
        recipe: recipeWithQuantities
      };

      const response = await fetch(`${config.apiUrl}/production/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        throw new Error('Failed to add production');
      }

      const result = await response.json();
      alert('Production record added successfully');
      
      resetForm();
      setIsPrinted(false);
      
      if (onProductionAdded) {
        onProductionAdded(result.id);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to add production');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Add Production Record
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Date and Paper Type */}
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Production Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Paper Type</InputLabel>
                <Select
                  name="paperType"
                  value={formData.paperType}
                  onChange={handleChange}
                  label="Paper Type"
                >
                  {paperTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Total Weight Section */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total Weight Produced (kg)"
                type="number"
                name="totalWeight"
                value={formData.totalWeight}
                onChange={handleChange}
              />
            </Grid>

            {/* Boiler Fuel Section */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Boiler Fuel Type</InputLabel>
                <Select
                  name="boilerFuelType"
                  value={formData.boilerFuelType}
                  onChange={handleChange}
                  label="Boiler Fuel Type"
                >
                  {boilerFuelTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Fuel Quantity"
                type="number"
                name="boilerFuelQuantity"
                value={formData.boilerFuelQuantity}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Fuel Cost"
                type="number"
                name="boilerFuelCost"
                value={formData.boilerFuelCost}
                onChange={handleChange}
              />
            </Grid>

            {/* Electricity Cost Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Electricity Cost
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Units Consumed"
                    type="number"
                    name="electricityUnits"
                    value={formData.electricityUnits}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Unit Price"
                    type="number"
                    name="electricityUnitPrice"
                    value={formData.electricityUnitPrice}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Total Electricity Cost"
                    type="number"
                    value={formData.electricityCost}
                    disabled
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Recipe Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Recipe
                <IconButton color="primary" onClick={addRecipe}>
                  <AddIcon />
                </IconButton>
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Raddi Type</TableCell>
                      <TableCell>Percentage Used</TableCell>
                      <TableCell>Yield (%)</TableCell>
                      <TableCell>Calculated Quantity (kg)</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.recipe.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <FormControl fullWidth>
                            <Select
                              value={item.raddiType}
                              onChange={(e) => handleRecipeChange(index, 'raddiType', e.target.value)}
                            >
                              {raddiTypes.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.percentageUsed}
                            onChange={(e) => handleRecipeChange(index, 'percentageUsed', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.yield}
                            onChange={(e) => handleRecipeChange(index, 'yield', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          {item.percentageUsed && item.yield ? 
                            (() => {
                              const totalWeight = parseFloat(formData.totalWeight);
                              const wastage = totalWeight - (totalWeight * (parseFloat(item.yield) / 100));
                              const totalRequired = totalWeight + wastage;
                              return (totalRequired * (parseFloat(item.percentageUsed) / 100)).toFixed(2);
                            })()
                            : '0'
                          }
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => removeRecipe(index)}
                            disabled={formData.recipe.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Submit Button */}
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
                  size="large"
                  disabled={!isPrinted || loading}
                >
                  Add Production Record
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

ProductionForm.propTypes = {
  onProductionAdded: PropTypes.func
};

export default ProductionForm; 