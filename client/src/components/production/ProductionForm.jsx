import React, { useState } from 'react';
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
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ProductionForm = ({ onProductionAdded }) => {
  const [formData, setFormData] = useState({
    date: new Date(),
    paperType: '',
    reels: [{ size: '', weight: '' }],
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

  const paperTypes = ['SUPER', 'CMP', 'BOARD'];
  const boilerFuelTypes = ['TOORI', 'TUKKA'];
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

  const handleReelChange = (index, field, value) => {
    const newReels = [...formData.reels];
    newReels[index][field] = value;
    setFormData(prev => ({
      ...prev,
      reels: newReels,
      totalWeight: calculateTotalWeight(newReels)
    }));
  };

  const calculateTotalWeight = (reels) => {
    return reels.reduce((sum, reel) => sum + (parseFloat(reel.weight) || 0), 0).toString();
  };

  const handleRecipeChange = (index, field, value) => {
    const newRecipe = [...formData.recipe];
    newRecipe[index][field] = value;
    setFormData(prev => ({
      ...prev,
      recipe: newRecipe
    }));
  };

  const addReel = () => {
    setFormData(prev => ({
      ...prev,
      reels: [...prev.reels, { size: '', weight: '' }]
    }));
  };

  const removeReel = (index) => {
    setFormData(prev => ({
      ...prev,
      reels: prev.reels.filter((_, i) => i !== index)
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
    try {
      const response = await fetch('http://localhost:5000/api/production/check-stock', {
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
    } catch (error) {
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      paperType: '',
      reels: [{ size: '', weight: '' }],
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const recipeWithQuantities = calculateRaddiQuantities();
      
      await checkStockAvailability(recipeWithQuantities);

      const submissionData = {
        ...formData,
        recipe: recipeWithQuantities
      };

      const response = await fetch('http://localhost:5000/api/production/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        throw new Error('Failed to add production record');
      }

      const result = await response.json();
      alert('Production record added successfully');
      
      // Reset form after successful submission
      resetForm();
      
      if (onProductionAdded) {
        onProductionAdded(result.id);
      }
      
    } catch (error) {
      console.error('Error adding production:', error);
      alert(error.message);
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

            {/* Reels Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Reels
                <IconButton color="primary" onClick={addReel}>
                  <AddIcon />
                </IconButton>
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Size</TableCell>
                      <TableCell>Weight (kg)</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.reels.map((reel, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            value={reel.size}
                            onChange={(e) => handleReelChange(index, 'size', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={reel.weight}
                            onChange={(e) => handleReelChange(index, 'weight', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => removeReel(index)}
                            disabled={formData.reels.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                Total Weight: {formData.totalWeight} kg
              </Typography>
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
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
              >
                Add Production Record
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ProductionForm; 