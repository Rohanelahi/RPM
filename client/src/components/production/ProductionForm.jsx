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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
    paperTypes: [{
    paperType: '',
    totalWeight: '0',
      recipe: [{ raddiType: '', percentageUsed: '', yield: '' }]
    }],
    boilerFuelType: '',
    boilerFuelQuantity: '',
    boilerFuelCost: '',
    electricityUnits: '',
    electricityUnitPrice: '',
    electricityCost: '0'
  });

  const [isPrinted, setIsPrinted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paperTypes, setPaperTypes] = useState([]);
  const [openNewPaperType, setOpenNewPaperType] = useState(false);
  const [newPaperType, setNewPaperType] = useState({
    name: '',
    description: ''
  });

  const boilerFuelTypes = ['Boiler Fuel (Toori)', 'Boiler Fuel (Tukka)'];
  const raddiTypes = ['Petti', 'DABBI', 'CEMENT BAG','Mix Maal','Pulp'];

  // Fetch paper types on component mount
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
      alert('Failed to fetch paper types');
    }
  };

  const handleAddNewPaperType = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/production/paper-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPaperType),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add paper type');
      }

      const result = await response.json();
      setPaperTypes(prev => [...prev, result]);
      setOpenNewPaperType(false);
      setNewPaperType({ name: '', description: '' });
      
    } catch (error) {
      console.error('Error adding paper type:', error);
      alert('Failed to add paper type: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePaperTypeChange = (index, field, value) => {
    const newPaperTypes = [...formData.paperTypes];
    newPaperTypes[index][field] = value;
    setFormData(prev => ({
      ...prev,
      paperTypes: newPaperTypes
    }));
  };

  const handleRecipeChange = (paperTypeIndex, recipeIndex, field, value) => {
    const newPaperTypes = [...formData.paperTypes];
    newPaperTypes[paperTypeIndex].recipe[recipeIndex][field] = value;
    setFormData(prev => ({
      ...prev,
      paperTypes: newPaperTypes
    }));
  };

  const addPaperType = () => {
    setFormData(prev => ({
      ...prev,
      paperTypes: [...prev.paperTypes, {
        paperType: '',
        totalWeight: '0',
        recipe: [{ raddiType: '', percentageUsed: '', yield: '' }]
      }]
    }));
  };

  const removePaperType = (index) => {
    setFormData(prev => ({
      ...prev,
      paperTypes: prev.paperTypes.filter((_, i) => i !== index)
    }));
  };

  const addRecipe = (paperTypeIndex) => {
    const newPaperTypes = [...formData.paperTypes];
    newPaperTypes[paperTypeIndex].recipe.push({ raddiType: '', percentageUsed: '', yield: '' });
    setFormData(prev => ({
      ...prev,
      paperTypes: newPaperTypes
    }));
  };

  const removeRecipe = (paperTypeIndex, recipeIndex) => {
    const newPaperTypes = [...formData.paperTypes];
    newPaperTypes[paperTypeIndex].recipe = newPaperTypes[paperTypeIndex].recipe.filter((_, i) => i !== recipeIndex);
    setFormData(prev => ({
      ...prev,
      paperTypes: newPaperTypes
    }));
  };

  const calculateRaddiQuantities = () => {
    return formData.paperTypes.map(paperType => {
      const recipeWithQuantities = paperType.recipe.map(item => {
        if (!item.percentageUsed || !item.yield) return { ...item, quantityUsed: '0' };
        
        const totalWeight = parseFloat(paperType.totalWeight) || 0;
        const percentageUsed = parseFloat(item.percentageUsed) || 0;
        const yieldPercentage = parseFloat(item.yield) || 0;
        
        // Calculate quantity used based on percentage and yield
        const quantityUsed = (totalWeight * (percentageUsed / 100)) / (yieldPercentage / 100);
        
        return {
          ...item,
          quantityUsed: quantityUsed.toFixed(2)
        };
      });
      return {
        ...paperType,
        recipe: recipeWithQuantities
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
      paperTypes: [{
      paperType: '',
      totalWeight: '0',
        recipe: [{ raddiType: '', percentageUsed: '', yield: '' }]
      }],
      boilerFuelType: '',
      boilerFuelQuantity: '',
      boilerFuelCost: '',
      electricityUnits: '',
      electricityUnitPrice: '',
      electricityCost: '0'
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
              <td>${formData.paperTypes[0].paperType}</td>
            </tr>
            <tr>
              <td><strong>Total Weight:</strong></td>
              <td>${formData.paperTypes[0].totalWeight} kg</td>
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
            ${formData.paperTypes[0].recipe.map(item => {
              const totalWeight = parseFloat(formData.paperTypes[0].totalWeight);
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

      // Validate paper type
      if (!formData.paperTypes[0]?.paperType) {
        throw new Error('Paper type is required');
      }

      const recipeWithQuantities = calculateRaddiQuantities();
      
      // Extract all recipe items into a flat array
      const allRecipeItems = recipeWithQuantities.flatMap(paperType => 
        paperType.recipe.map(item => ({
          raddiType: item.raddiType,
          quantityUsed: parseFloat(item.quantityUsed) // Ensure quantity is a number
        }))
      );
      
      await checkStockAvailability(allRecipeItems);

      const submissionData = {
        date: formData.date,
        paperTypes: recipeWithQuantities.map(paperType => ({
          paperType: paperType.paperType,
          totalWeight: paperType.totalWeight,
          recipe: paperType.recipe.map(item => ({
            raddiType: item.raddiType,
            percentageUsed: item.percentageUsed,
            yield: item.yield,
            quantityUsed: parseFloat(item.quantityUsed) // Ensure quantity is a number
          }))
        })),
        boilerFuelType: formData.boilerFuelType,
        boilerFuelQuantity: formData.boilerFuelQuantity,
        boilerFuelCost: formData.boilerFuelCost,
        electricityUnits: formData.electricityUnits,
        electricityUnitPrice: formData.electricityUnitPrice,
        electricityCost: formData.electricityCost
      };

      const response = await fetch(`${config.apiUrl}/production/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add production');
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
      alert('Failed to add production: ' + error.message);
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
            {/* Date */}
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

            {/* Paper Types Section */}
            {formData.paperTypes.map((paperTypeData, paperTypeIndex) => (
              <React.Fragment key={paperTypeIndex}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">
                        Paper Type {paperTypeIndex + 1}
                      </Typography>
                      {formData.paperTypes.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => removePaperType(paperTypeIndex)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Paper Type</InputLabel>
                <Select
                            value={paperTypeData.paperType}
                            onChange={(e) => handlePaperTypeChange(paperTypeIndex, 'paperType', e.target.value)}
                            required
                >
                  {paperTypes.map(type => (
                              <MenuItem key={type.name} value={type.name}>{type.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
                        <Button
                          variant="outlined"
                          onClick={() => setOpenNewPaperType(true)}
                          sx={{ mt: 1 }}
                          startIcon={<AddIcon />}
                        >
                          Add New Paper Type
                        </Button>
            </Grid>

                      <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Weight Produced (kg)"
                type="number"
                          value={paperTypeData.totalWeight}
                          onChange={(e) => handlePaperTypeChange(paperTypeIndex, 'totalWeight', e.target.value)}
                          required
                        />
                      </Grid>

                      {/* Recipe Section */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          Recipe
                          <IconButton 
                            color="primary" 
                            onClick={() => addRecipe(paperTypeIndex)}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Typography>
                        <TableContainer>
                          <Table size="small">
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
                              {paperTypeData.recipe.map((item, recipeIndex) => (
                                <TableRow key={recipeIndex}>
                                  <TableCell>
                                    <FormControl fullWidth>
                                      <Select
                                        value={item.raddiType}
                                        onChange={(e) => handleRecipeChange(paperTypeIndex, recipeIndex, 'raddiType', e.target.value)}
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
                                      onChange={(e) => handleRecipeChange(paperTypeIndex, recipeIndex, 'percentageUsed', e.target.value)}
                                      fullWidth
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      type="number"
                                      value={item.yield}
                                      onChange={(e) => handleRecipeChange(paperTypeIndex, recipeIndex, 'yield', e.target.value)}
                                      fullWidth
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {item.percentageUsed && item.yield ? 
                                      (() => {
                                        const totalWeight = parseFloat(paperTypeData.totalWeight);
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
                                      onClick={() => removeRecipe(paperTypeIndex, recipeIndex)}
                                      disabled={paperTypeData.recipe.length === 1}
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
                    </Grid>
                  </Paper>
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={addPaperType}
                startIcon={<AddIcon />}
              >
                Add Another Paper Type
              </Button>
            </Grid>

            {/* Common Costs Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Common Costs
              </Typography>
              <Grid container spacing={2}>
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
                  <Typography variant="subtitle1" gutterBottom>
                Electricity Cost
              </Typography>
                  <Grid container spacing={2}>
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
              </Grid>
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

      {/* Add New Paper Type Dialog */}
      <Dialog open={openNewPaperType} onClose={() => setOpenNewPaperType(false)}>
        <DialogTitle>Add New Paper Type</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Paper Type Name"
            type="text"
            fullWidth
            value={newPaperType.name}
            onChange={(e) => setNewPaperType(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={newPaperType.description}
            onChange={(e) => setNewPaperType(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewPaperType(false)}>Cancel</Button>
          <Button onClick={handleAddNewPaperType} disabled={loading || !newPaperType.name}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

ProductionForm.propTypes = {
  onProductionAdded: PropTypes.func
};

export default ProductionForm; 