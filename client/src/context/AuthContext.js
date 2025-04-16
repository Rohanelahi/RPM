import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

// Predefined users
const USERS = {
  gate: {
    username: 'gate',
    password: 'gate123',
    role: 'GATE'
  },
  store: {
    username: 'store',
    password: 'store123',
    role: 'STORE'
  },
  accounts: {
    username: 'accounts',
    password: 'accounts123',
    role: 'ACCOUNTS'
  },
  director: {
    username: 'director',
    password: 'director123',
    role: 'DIRECTOR'
  },
  tax: {
    username: 'tax',
    password: 'tax123',
    role: 'TAX',
    name: 'Tax Officer'
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (username, password) => {
    const foundUser = Object.values(USERS).find(
      u => u.username === username && u.password === password
    );
    
    if (foundUser) {
      setUser(foundUser);
      return { success: true, role: foundUser.role };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useAuth = () => useContext(AuthContext); 