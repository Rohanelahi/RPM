import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = {
  // Department methods
  getDepartments: async () => {
    try {
      const response = await axios.get(`${API_URL}/hrm/departments`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch departments');
    }
  },

  // Employee methods
  createEmployee: async (employeeData) => {
    const response = await axios.post(`${API_URL}/hrm/employees`, employeeData);
    return response.data;
  },
  
  getEmployees: async () => {
    const response = await axios.get(`${API_URL}/hrm/employees`);
    return response.data;
  },

  getEmployeeById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/hrm/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch employee data');
    }
  },

  // Attendance methods
  getAttendanceByDate: async (date) => {
    try {
      const response = await axios.get(`${API_URL}/hrm/attendance/${date}`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch attendance data');
    }
  },

  saveAttendance: async (date, attendance) => {
    try {
      const response = await axios.post(`${API_URL}/hrm/attendance`, {
        date,
        attendance
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to save attendance data');
    }
  },

  getMonthlyAttendance: async (employeeId, startDate, endDate) => {
    try {
      const response = await axios.get(`${API_URL}/hrm/attendance/${employeeId}/${startDate}/${endDate}`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch attendance data');
    }
  },

  // Loan methods
  submitLoanApplication: async (loanData) => {
    try {
      const response = await axios.post(`${API_URL}/hrm/loans`, loanData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to submit loan application');
    }
  },

  getEmployeeLoans: async (employeeId) => {
    try {
      const response = await axios.get(`${API_URL}/hrm/loans/${employeeId}`);
      console.log('Loans API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch loan data');
    }
  },

  // Leave methods
  submitLeaveApplication: async (leaveData) => {
    try {
      const response = await axios.post(`${API_URL}/hrm/leaves`, leaveData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to submit leave application');
    }
  },

  // Final Settlement methods
  submitFinalSettlement: async (settlementData) => {
    try {
      const response = await axios.post(`${API_URL}/hrm/settlements`, settlementData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to submit final settlement');
    }
  },

  updateEmployeeStatus: async (employeeId, status) => {
    try {
      const response = await axios.patch(`${API_URL}/hrm/employees/${employeeId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to update employee status');
    }
  },

  // Create salary increment
  createSalaryIncrement: async (data) => {
    const response = await fetch(`${API_URL}/hrm/salary-increments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to process salary increment');
    }
    return response.json();
  },

  // ... any other API methods ...
};

export default api; 