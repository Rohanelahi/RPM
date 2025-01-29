import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { Login, Logout } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Header.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLoginClick = () => {
    if (user) {
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="new-header">
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100%',
        padding: '0 20px',
        position: 'relative'
      }}>
        <Typography className="company-name">
          Rose Paper Mill PVT
        </Typography>
        
        <Button 
          className="login-button"
          variant="contained" 
          color="primary"
          startIcon={user ? <Logout /> : <Login />}
          onClick={handleLoginClick}
          sx={{ 
            position: 'absolute',
            right: '20px',
            textTransform: 'none',
            backgroundColor: 'transparent',
            border: '2px solid #ffffff',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'translateY(-1px)'
            }
          }}
        >
          {user ? 'Logout' : 'Login'}
        </Button>
      </Box>
    </div>
  );
};

export default Navbar;