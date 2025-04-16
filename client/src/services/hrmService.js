import axios from 'axios';
import config from '../config';

const API_URL = `${config.apiUrl}/hrm`;

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

export default API_URL; 