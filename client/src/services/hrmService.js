import axios from 'axios';

const API_URL = 'http://localhost:5000/api/hrm';

export const hrmService = {
  // Employee endpoints
  getEmployees: () => axios.get(`${API_URL}/employees`),
  getEmployee: (id) => axios.get(`${API_URL}/employees/${id}`),
  createEmployee: (data) => axios.post(`${API_URL}/employees`, data),
  updateEmployee: (id, data) => axios.put(`${API_URL}/employees/${id}`, data),
  deleteEmployee: (id) => axios.delete(`${API_URL}/employees/${id}`),

  // Attendance endpoints
  getAttendance: (date) => axios.get(`${API_URL}/attendance?date=${date}`),
  markAttendance: (data) => axios.post(`${API_URL}/attendance`, data),
  updateAttendance: (id, data) => axios.put(`${API_URL}/attendance/${id}`, data),
}; 