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
  'On Leave',
  'Holiday',
  'Weekend',
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
              in_time: '09:00',
              out_time: '17:00',
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

  const handleAttendanceChange = (employeeId, field, value) => {
    if (!canEdit) return;
    
    setAttendanceData(prev =>
      prev.map(record =>
        record.employee_id === employeeId ? { ...record, [field]: value } : record
      )
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