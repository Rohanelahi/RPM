import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/Header.css'; // Import header styles

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(formData.username, formData.password);
    
    if (result.success) {
      // Redirect based on role
      switch (result.role) {
        case 'GATE':
          navigate('/gate');
          break;
        case 'STORE':
          navigate('/store');
          break;
        case 'ACCOUNTS':
          navigate('/accounts');
          break;
        case 'DIRECTOR':
          navigate('/dashboard');
          break;
        default:
          navigate('/');
      }
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Company Name Header */}
        <Typography 
          className="company-name"
          sx={{ 
            mb: 4,
            background: '#000000 !important',  // Force black background with !important
            backgroundColor: '#000000 !important', // Additional backup
            padding: '20px 64px',   
            borderRadius: '8px',
            width: '120%',          
            maxWidth: '600px',      
            textAlign: 'center',
            transform: 'scale(1.1)', 
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            '&.company-name': {     // Override the class styles
              background: '#000000 !important',
              backgroundColor: '#000000 !important'
            }
          }}
        >
          Rose Paper Mill PVT
        </Typography>

        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px'
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              autoFocus
              value={formData.username}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                username: e.target.value
              }))}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                password: e.target.value
              }))}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                background: 'linear-gradient(60deg, #000000 0%, #470101 50%, #000000 100%)',
                '&:hover': {
                  background: 'linear-gradient(60deg, #1a1a1a 0%, #5c0101 50%, #1a1a1a 100%)'
                }
              }}
            >
              Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage; 