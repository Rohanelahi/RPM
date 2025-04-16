import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import config from '../../config';

const GatePassList = ({ onEdit, onDelete }) => {
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGatePasses();
  }, []);

  const fetchGatePasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/gate/passes`);
      if (!response.ok) throw new Error('Failed to fetch gate passes');
      const data = await response.json();
      setGatePasses(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch gate passes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component={Paper} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Gate Passes
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vehicle Number</TableCell>
              <TableCell>Driver Name</TableCell>
              <TableCell>Purpose</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gatePasses.map((pass) => (
              <TableRow key={pass.id}>
                <TableCell>{pass.vehicleNumber}</TableCell>
                <TableCell>{pass.driverName}</TableCell>
                <TableCell>{pass.purpose}</TableCell>
                <TableCell>{pass.items}</TableCell>
                <TableCell>{new Date(pass.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton onClick={() => onEdit(pass)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => onDelete(pass.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

GatePassList.propTypes = {
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default GatePassList; 