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
  Calculate,
  ExitToApp,
  TrendingUp,
  Input,
  Output,
  Security,
  ShoppingCart,
  Inventory,
  Inventory2 as InventoryIcon,
  Build,
  History,
  Factory as FactoryIcon,
  Add as AddIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/Sidebar.css';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  {
    text: 'Gate',
    icon: <Security />,
    submenu: [
      { 
        text: 'Gate In', 
        icon: <Input />, 
        submenu: [
          { text: 'Purchase', icon: <ShoppingCart />, path: '/gate/in/purchase' },
          { text: 'Sale Return', icon: <ShoppingCart />, path: '/gate/in/sale-return' },
          { text: 'Store In', icon: <Inventory />, path: '/gate/in/store' }
        ]
      },
      { 
        text: 'Gate Out', 
        icon: <Output />, 
        submenu: [
          { text: 'Purchase Return', icon: <ShoppingCart />, path: '/gate/out/purchase-return' },
          { text: 'Sale Out', icon: <ShoppingCart />, path: '/gate/out/sale' },
          { text: 'Store Out', icon: <Inventory />, path: '/gate/out/store' }
        ]
      }
    ]
  },
  {
    text: 'HRM',
    icon: <People />,
    submenu: [
      { text: 'New Appointment', icon: <PersonAdd />, path: '/hrm/appointment' },
      { text: 'Daily Attendance', icon: <AccessTime />, path: '/hrm/attendance' },
      { text: 'Employee List', icon: <Assessment />, path: '/hrm/employees' },
      { text: 'Leave Application', icon: <EventNote />, path: '/hrm/leave-application' },
      { text: 'Loan Application', icon: <AccountBalance />, path: '/hrm/loan-application' },
      { text: 'Salary Form', icon: <Payments />, path: '/hrm/SalaryForm' },
      { text: 'Salary Increment', icon: <TrendingUp />, path: '/hrm/salary-increment' },
      { text: 'Workers Salary', icon: <Calculate />, path: '/hrm/workers-salary' },
      { text: 'Final Settlement', icon: <ExitToApp />, path: '/hrm/final-settlement' },
    ]
  },
  {
    text: 'Accounts',
    icon: <AccountBalance />,
    path: '/accounts'
  },
  {
    text: 'Store',
    icon: <Inventory />,
    submenu: [
      { text: 'Inventory', icon: <InventoryIcon />, path: '/store/inventory' }
    ]
  },
  {
    text: 'Maintenance',
    icon: <Build />,
    submenu: [
      { text: 'History', icon: <History />, path: '/maintenance/history' }
    ]
  }
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const { user } = useAuth();

  const handleClick = (item, parentText = '') => {
    if (item.submenu) {
      const menuKey = parentText ? `${parentText}-${item.text}` : item.text;
      setOpenMenus(prev => ({
        ...prev,
        [menuKey]: !prev[menuKey]
      }));
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const renderMenuItem = (item, level = 0, parentText = '') => {
    const menuKey = parentText ? `${parentText}-${item.text}` : item.text;
    const hasSubmenu = item.submenu && item.submenu.length > 0;

    return (
      <React.Fragment key={menuKey}>
        <ListItemButton
          onClick={() => handleClick(item, parentText)}
          selected={!hasSubmenu && isSelected(item.path)}
          className={`sidebar-menu-item level-${level}`}
          sx={{ pl: level * 2 + 2 }}
        >
          <ListItemIcon className="sidebar-menu-icon">
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.text} />
          {hasSubmenu && (
            openMenus[menuKey] ? <KeyboardArrowUp className="arrow-icon" /> : <KeyboardArrowDown className="arrow-icon" />
          )}
        </ListItemButton>
        
        {hasSubmenu && (
          <Collapse in={openMenus[menuKey]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map(subItem => renderMenuItem(subItem, level + 1, menuKey))}
            </List>
          </Collapse>
        )}
        {level === 0 && <Divider className="sidebar-divider" />}
      </React.Fragment>
    );
  };

  const isSelected = (path) => location.pathname === path;

  const getFilteredMenuItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'DIRECTOR':
        return [
          { text: 'Dashboard', icon: <Dashboard />, path: '/' },
          {
            text: 'Gate',
            icon: <Security />,
            submenu: [
              { 
                text: 'Gate In', 
                icon: <Input />, 
                submenu: [
                  { text: 'Purchase', icon: <ShoppingCart />, path: '/gate/in/purchase' },
                  { text: 'Sale Return', icon: <ShoppingCart />, path: '/gate/in/sale-return' },
                  { text: 'Store In', icon: <Inventory />, path: '/gate/in/store' }
                ]
              },
              { 
                text: 'Gate Out', 
                icon: <Output />, 
                submenu: [
                  { text: 'Purchase Return', icon: <ShoppingCart />, path: '/gate/out/purchase-return' },
                  { text: 'Sale Out', icon: <ShoppingCart />, path: '/gate/out/sale' },
                  { text: 'Store Out', icon: <Inventory />, path: '/gate/out/store' }
                ]
              },
              { text: 'Daily Attendance', icon: <AccessTime />, path: '/gate/attendance' }
            ]
          },
          {
            text: 'HRM',
            icon: <People />,
            submenu: [
              { text: 'New Appointment', icon: <PersonAdd />, path: '/hrm/appointment' },
              { text: 'Daily Attendance', icon: <AccessTime />, path: '/hrm/attendance' },
              { text: 'Employee List', icon: <Assessment />, path: '/hrm/employees' },
              { text: 'Leave Application', icon: <EventNote />, path: '/hrm/leave-application' },
              { text: 'Loan Application', icon: <AccountBalance />, path: '/hrm/loan-application' },
              { text: 'Salary Form', icon: <Payments />, path: '/hrm/SalaryForm' },
              { text: 'Salary Increment', icon: <TrendingUp />, path: '/hrm/salary-increment' },
              { text: 'Workers Salary', icon: <Calculate />, path: '/hrm/workers-salary' },
              { text: 'Final Settlement', icon: <ExitToApp />, path: '/hrm/final-settlement' },
            ]
          },
          {
            text: 'Accounts',
            icon: <AccountBalance />,
            path: '/accounts'
          },
          {
            text: 'Store',
            icon: <Inventory />,
            submenu: [
              { text: 'Inventory', icon: <InventoryIcon />, path: '/store/inventory' }
            ]
          },
          {
            text: 'Maintenance',
            icon: <Build />,
            submenu: [
              { text: 'History', icon: <History />, path: '/maintenance/history' }
            ]
          },
          {
            text: 'Stock Management',
            icon: <InventoryIcon />,
            submenu: [
              { 
                text: 'Stock Overview', 
                icon: <InventoryIcon />, 
                path: '/stock/overview' 
              },
              { 
                text: 'Stock History', 
                icon: <History />, 
                path: '/stock/history' 
              }
            ]
          },
        ];
      
      case 'GATE':
        return [
          {
            text: 'Gate',
            icon: <Security />,
            submenu: [
              { 
                text: 'Gate In', 
                icon: <Input />, 
                submenu: [
                  { text: 'Purchase', icon: <ShoppingCart />, path: '/gate/in/purchase' },
                  { text: 'Sale Return', icon: <ShoppingCart />, path: '/gate/in/sale-return' },
                  { text: 'Store In', icon: <Inventory />, path: '/gate/in/store' }
                ]
              },
              { 
                text: 'Gate Out', 
                icon: <Output />, 
                submenu: [
                  { text: 'Purchase Return', icon: <ShoppingCart />, path: '/gate/out/purchase-return' },
                  { text: 'Sale Out', icon: <ShoppingCart />, path: '/gate/out/sale' },
                  { text: 'Store Out', icon: <Inventory />, path: '/gate/out/store' }
                ]
              },
              { text: 'Daily Attendance', icon: <AccessTime />, path: '/gate/attendance' }
            ]
          }
        ];
      
      case 'STORE':
        return [
          {
            text: 'Store',
            icon: <Inventory />,
            submenu: [
              { text: 'Inventory', icon: <InventoryIcon />, path: '/store/inventory' }
            ]
          }
        ];
      
      case 'ACCOUNTS':
        return [
          {
            text: 'HRM',
            icon: <People />,
            submenu: [
              { text: 'New Appointment', icon: <PersonAdd />, path: '/hrm/appointment' },
              { text: 'Daily Attendance', icon: <AccessTime />, path: '/hrm/attendance' },
              { text: 'Employee List', icon: <Assessment />, path: '/hrm/employees' },
              { text: 'Leave Application', icon: <EventNote />, path: '/hrm/leave-application' },
              { text: 'Loan Application', icon: <AccountBalance />, path: '/hrm/loan-application' },
              { text: 'Salary Form', icon: <Payments />, path: '/hrm/SalaryForm' },
              { text: 'Salary Increment', icon: <TrendingUp />, path: '/hrm/salary-increment' },
              { text: 'Workers Salary', icon: <Calculate />, path: '/hrm/workers-salary' },
              { text: 'Final Settlement', icon: <ExitToApp />, path: '/hrm/final-settlement' },
            ]
          },
          {
            text: 'Accounts',
            icon: <AccountBalance />,
            path: '/accounts'
          },
          {
            text: 'Production',
            icon: <FactoryIcon />,
            submenu: [
              { 
                text: 'Add Production', 
                icon: <AddIcon />, 
                path: '/production/add' 
              },
              { 
                text: 'Production History', 
                icon: <ListIcon />, 
                path: '/production/history' 
              }
            ]
          },
        ];
      
      default:
        return [];
    }
  };

  return (
    <Box className="sidebar">
      <List component="nav">
        {getFilteredMenuItems().map(item => renderMenuItem(item))}
      </List>
    </Box>
  );
};

export default Sidebar;