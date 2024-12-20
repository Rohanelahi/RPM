import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = {
  // Employee/Appointment
  createEmployee: async (employeeData) => {
    const response = await axios.post(`${API_URL}/hrm/employees`, employeeData);
    return response.data;
  },
  
  getEmployees: async () => {
    const response = await axios.get(`${API_URL}/hrm/employees`);
    return response.data;
  },

  // Attendance
  getAttendanceByDate: async (date) => {
    const response = await axios.get(`${API_URL}/hrm/attendance/${date}`);
    return response.data;
  },

  saveAttendance: async (date, attendanceRecords) => {
    const response = await axios.post(`${API_URL}/hrm/attendance`, {
      date,
      attendance: attendanceRecords
    });
    return response.data;
  },

  // Leave Application
  submitLeaveApplication: async (data) => {
    const response = await axios.post(`${API_URL}/hrm/leaves`, data);
    return response.data;
  },

  // Loan Application
  submitLoanApplication: async (data) => {
    const response = await axios.post(`${API_URL}/hrm/loans`, data);
    return response.data;
  },

  getDepartments: async () => {
    const response = await axios.get(`${API_URL}/hrm/departments`);
    return response.data;
  },

  getMonthlyAttendance: async (employeeId, startDate, endDate) => {
    const response = await axios.get(`${API_URL}/hrm/attendance/${employeeId}/${startDate}/${endDate}`);
    return response.data;
  },

  getEmployeeLoans: async (employeeId) => {
    const response = await axios.get(`${API_URL}/hrm/loans/${employeeId}`);
    return response.data;
  }
};

export default api; 