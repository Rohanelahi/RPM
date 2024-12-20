import React, { useState } from 'react';
import {
  Box,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  People,
  PersonAdd,
  AccessTime,
  Assessment,
  AccountBalance,
  EventNote,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Payments,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/Sidebar.css';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  {
    text: 'HRM',
    icon: <People />,
    submenu: [
      { text: 'New Appointment', icon: <PersonAdd />, path: '/hrm/appointment' },
      { text: 'Daily Attendance', icon: <AccessTime />, path: '/hrm/attendance' },
      { text: 'Employee List', icon: <Assessment />, path: '/hrm/employees' },
      { text: 'Leave Application', icon: <EventNote />, path: '/hrm/leave-application' },
      { text: 'Loan Application', icon: <AccountBalance />, path: '/hrm/loan-application' },
      { text: 'Salary Calculation', icon: <Payments />, path: '/hrm/salary' }
    ]
  }
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openHRM, setOpenHRM] = useState(false);

  const handleClick = (item) => {
    if (item.submenu) {
      setOpenHRM(!openHRM);
    } else {
      navigate(item.path);
    }
  };

  const isSelected = (path) => location.pathname === path;

  return (
    <Box className="sidebar">
      <List component="nav">
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            <ListItemButton
              onClick={() => handleClick(item)}
              selected={!item.submenu && isSelected(item.path)}
              className="sidebar-menu-item"
            >
              <ListItemIcon className="sidebar-menu-icon">
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
              {item.submenu && (
                openHRM ? <KeyboardArrowUp className="arrow-icon" /> : <KeyboardArrowDown className="arrow-icon" />
              )}
            </ListItemButton>
            
            {item.submenu && (
              <Collapse in={openHRM} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.submenu.map((subItem) => (
                    <ListItemButton
                      key={subItem.text}
                      onClick={() => navigate(subItem.path)}
                      selected={isSelected(subItem.path)}
                      className="sidebar-submenu-item"
                    >
                      <ListItemIcon className="sidebar-menu-icon">
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText primary={subItem.text} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
            <Divider className="sidebar-divider" />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;