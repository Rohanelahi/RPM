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

const ProductionForm = () => {
  const [formData, setFormData] = useState({
    date: new Date(),
    paperType: '',
    reels: [{ size: '', weight: '' }],
    totalWeight: '0',
    boilerFuelType: '',
    boilerFuelQuantity: '',
    boilerFuelCost: '',
    recipe: [{ raddiType: '', percentageUsed: '', quantityUsed: '', yield: '' }],
    totalYield: ''
  });

  const paperTypes = ['SUPER', 'CMP', 'BOARD'];
  const boilerFuelTypes = ['TOORI', 'TUKKA'];
  const raddiTypes = ['PETTI', 'DABBI', 'CEMENT BAG'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      recipe: [...prev.recipe, { raddiType: '', percentageUsed: '', quantityUsed: '', yield: '' }]
    }));
  };

  const removeRecipe = (index) => {
    setFormData(prev => ({
      ...prev,
      recipe: prev.recipe.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/production/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to add production record');
      }

      // Reset form or show success message
      alert('Production record added successfully');
      
    } catch (error) {
      console.error('Error adding production:', error);
      alert('Failed to add production record');
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
                      <TableCell>Quantity Used</TableCell>
                      <TableCell>Yield (%)</TableCell>
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
                            value={item.quantityUsed}
                            onChange={(e) => handleRecipeChange(index, 'quantityUsed', e.target.value)}
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