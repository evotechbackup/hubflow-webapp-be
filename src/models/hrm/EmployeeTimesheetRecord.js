const mongoose = require('mongoose');

const EmployeeTimesheetRecordSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  regular: {
    type: Number,
  },
  ot: {
    type: Number,
  },
  timesheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectTimesheet',
  },
  dailyTimesheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyTimesheet',
  },
  userTimesheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserTimesheet',
  },
});

module.exports = mongoose.model(
  'EmployeeTimesheetRecord',
  EmployeeTimesheetRecordSchema
);
