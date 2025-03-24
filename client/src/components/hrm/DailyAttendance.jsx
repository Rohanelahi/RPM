import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import '../../styles/forms/DailyAttendance.css';
import api from '../../services/api';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const attendanceStatuses = [
  'Present',
  'Absent',
  'Half Day',
];

const DailyAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const canEdit = user?.role === 'GATE' || user?.role === 'DIRECTOR';

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        
        const existingAttendance = await api.getAttendanceByDate(formattedDate);
        
        if (existingAttendance && existingAttendance.length > 0) {
          setAttendanceData(existingAttendance);
        } else {
          if (canEdit) {
            const employees = await api.getEmployees();
            
            const defaultAttendance = employees.map(emp => ({
              employee_id: emp.id,
              name: `${emp.first_name} ${emp.last_name}`,
              department: emp.department_name,
              status: 'Present',
              in_time: emp.department_name === 'Admin' ? '09:00' : '07:00',
              out_time: emp.department_name === 'Admin' ? '17:00' : '19:00',
              overtime: '0',
              remarks: ''
            }));
            setAttendanceData(defaultAttendance);
          }
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
        alert('Error loading attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedDate, canEdit]);

  const validateTimeEntry = (record, field, value) => {
    const isAdmin = record.department === 'Admin';
    const defaultInTime = isAdmin ? '09:00' : '07:00';
    const defaultOutTime = isAdmin ? '17:00' : '19:00';

    if (field === 'in_time') {
      if (value < (isAdmin ? '09:00' : '07:00')) {
        return defaultInTime;
      }
    } else if (field === 'out_time') {
      if (value < record.in_time) {
        return defaultOutTime;
      }
    }
    return value;
  };

  const calculateSalaryForDay = (record) => {
    const dailySalary = parseFloat(record.daily_salary) / 30;
    switch (record.status) {
      case 'Half Day':
        return dailySalary / 2;
      case 'Present':
        return dailySalary;
      default:
        return 0;
    }
  };

  const handleAttendanceChange = (employeeId, field, value) => {
    if (!canEdit) return;
    
    setAttendanceData(prev =>
      prev.map(record => {
        if (record.employee_id === employeeId) {
          const updatedRecord = { ...record, [field]: value };
          
          // Recalculate salary when status changes
          if (field === 'status') {
            updatedRecord.salary_for_day = calculateSalaryForDay(updatedRecord);
          }
          
          // Validate time entries
          if (field === 'in_time' || field === 'out_time') {
            updatedRecord[field] = validateTimeEntry(record, field, value);
          }
          
          return updatedRecord;
        }
        return record;
      })
    );
  };

  const handleSave = async () => {
    if (!canEdit) return;
    
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const attendanceRecords = attendanceData.map(record => ({
        employee_id: record.employee_id,
        attendance_date: formattedDate,
        status: record.status,
        in_time: record.in_time,
        out_time: record.out_time,
        overtime: record.overtime,
        remarks: record.remarks
      }));

      await api.saveAttendance(formattedDate, attendanceRecords);
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error saving attendance data');
    }
  };

  return (
    <div className="attendance-container">
      <Paper className="attendance-paper">
        <Box className="attendance-header">
          <Typography variant="h5">Daily Attendance</Typography>
          <Box className="attendance-controls">
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={setSelectedDate}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            </LocalizationProvider>
            {canEdit && (
              <Button 
                variant="contained"
                onClick={handleSave}
                className="action-button"
                disabled={loading}
              >
                Save Attendance
              </Button>
            )}
          </Box>
        </Box>

        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>In Time</TableCell>
                <TableCell>Out Time</TableCell>
                <TableCell>Overtime (hrs)</TableCell>
                <TableCell>Salary for Day</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">Loading...</TableCell>
                </TableRow>
              ) : attendanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">No attendance records found for this date</TableCell>
                </TableRow>
              ) : (
                attendanceData.map((record) => (
                  <TableRow key={record.employee_id}>
                    <TableCell>{record.employee_id}</TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>{record.department}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          size="small"
                          value={record.status}
                          onChange={(e) => handleAttendanceChange(record.employee_id, 'status', e.target.value)}
                        >
                          {attendanceStatuses.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        record.status
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <TextField
                          size="small"
                          type="time"
                          value={record.in_time}
                          onChange={(e) => handleAttendanceChange(record.employee_id, 'in_time', e.target.value)}
                        />
                      ) : (
                        record.in_time
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <TextField
                          size="small"
                          type="time"
                          value={record.out_time}
                          onChange={(e) => handleAttendanceChange(record.employee_id, 'out_time', e.target.value)}
                        />
                      ) : (
                        record.out_time
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <TextField
                          size="small"
                          type="number"
                          value={record.overtime}
                          onChange={(e) => handleAttendanceChange(record.employee_id, 'overtime', e.target.value)}
                        />
                      ) : (
                        record.overtime
                      )}
                    </TableCell>
                    <TableCell>
                      {record.status === 'Half Day' ? (
                        <Typography color="textSecondary">
                          Half Day - ₹{(record.salary_for_day || 0).toFixed(2)}
                        </Typography>
                      ) : (
                        record.salary_for_day ? `₹${record.salary_for_day.toFixed(2)}` : '₹0.00'
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <TextField
                          size="small"
                          value={record.remarks}
                          onChange={(e) => handleAttendanceChange(record.employee_id, 'remarks', e.target.value)}
                        />
                      ) : (
                        record.remarks
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
};

export default DailyAttendance;