const { asyncHandler } = require('../../middleware/errorHandler');
const WebAttendance = require('../../models/hrm/WebAttendance');
const Employee = require('../../models/hrm/Employee');
// const { createActivityLog } = require("../../utilities/logUtils");
const mongoose = require('mongoose');
const User = require('../../models/auth/User');

const createWebAttendance = asyncHandler(async (req, res) => {
  const {
    email,
    employeeId,
    latitude,
    longitude,
    attendance,
    company,
    organization,
  } = req.body;
  const currDate = new Date();
  const attendanceObj = await WebAttendance.findOne({
    email,
    employeeId,
    date: currDate.toDateString(),
  });
  if (attendanceObj) {
    if (attendance === 'checkOut' && !attendanceObj.checkOut?.date) {
      attendanceObj.checkOut = {
        date: currDate,
        location: { latitude, longitude },
      };
    } else if (attendance === 'breakIn' && !attendanceObj.breakIn?.date) {
      attendanceObj.breakIn = {
        date: currDate,
        location: { latitude, longitude },
      };
    } else if (attendance === 'breakOut' && !attendanceObj.breakOut?.date) {
      attendanceObj.breakOut = {
        date: currDate,
        location: { latitude, longitude },
      };
    } else {
      throw new Error('Invalid request');
    }
    await attendanceObj.save();
  } else {
    const newAttendance = new WebAttendance({
      email,
      employeeId,
      date: currDate.toDateString(),
      [attendance]: {
        date: currDate,
        location: { latitude, longitude },
      },
      company,
      organization,
    });
    await newAttendance.save();

    res.status(201).json({
      success: true,
      message: 'Attendance created successfully',
      data: newAttendance,
    });
  }

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'update',
  //     type: 'webAttendance',
  //     actionId: email,
  //     organization: organization,
  //     company: company,
  //   });

  res.status(201).json({
    success: true,
    message: 'Attendance created successfully',
    data: attendanceObj,
  });
});

const createBulkWebAttendance = asyncHandler(async (req, res) => {
  const {
    date,
    employeeList,
    company,
    organization,
    projectId,
    latitude,
    longitude,
  } = req.body;

  const attendanceRecords = employeeList.map((employee) => ({
    date: new Date(date),
    employeeId: employee?.employeeId,
    email: employee?.email,
    company,
    organization,
    projectId: projectId ? projectId : null,
    checkIn: {
      date: new Date(employee.checkIn),
      location: {
        latitude,
        longitude,
      },
    },
    checkOut: employee.checkOut
      ? {
          date: new Date(employee.checkOut),
          location: {
            latitude,
            longitude,
          },
        }
      : undefined,
    breakIn: employee.breakIn
      ? {
          date: new Date(employee.breakIn),
          location: {
            latitude,
            longitude,
          },
        }
      : undefined,
    breakOut: employee.breakOut
      ? {
          date: new Date(employee.breakOut),
          location: {
            latitude,
            longitude,
          },
        }
      : undefined,
  }));

  await WebAttendance.insertMany(attendanceRecords);

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'webAttendance',
  //   actionId: 'Bulk Attendance Record',
  //   organization: organization,
  //   company: company,
  // });

  res.status(201).json({
    success: true,
    message: 'Bulk Attendance created successfully',
    data: attendanceRecords,
  });
});

const getTodaysAttendance = asyncHandler(async (req, res) => {
  const agent = await User.findById(req._id);

  if (!agent) {
    throw new Error('User not found');
  }

  const employee = await Employee.findOne({
    $or: [
      { email: agent.email },
      { optionalUserId: agent.userid },
      { employeeId: agent.employeeId },
    ],
    organization: agent.organization,
  }).populate('department', 'name');

  if (!employee) {
    throw new Error('Employee not found');
  }

  const currDate = new Date();

  const attendance = await WebAttendance.findOne({
    employeeId: employee._id,
    date: {
      $gte: new Date(currDate.setHours(0, 0, 0, 0)),
      $lt: new Date(currDate.setHours(24, 0, 0, 0)),
    },
  });

  res.status(200).json({
    success: true,
    message: 'Today Attendance retrieved successfully',
    data: attendance,
  });
});

const getAllAttendance = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const attendance = await WebAttendance.find({
    organization: orgid,
    date: {
      $gte: new Date(new Date().setDate(new Date().getDate() - 90)),
    },
  }).sort({ date: 1 });
  const attendanceCount = {};
  attendance.forEach((a) => {
    const formattedDate = a.date.toISOString().split('T')[0];
    if (attendanceCount[formattedDate]) {
      attendanceCount[formattedDate] += 1;
    } else {
      attendanceCount[formattedDate] = 1;
    }
  });
  res.status(200).json({
    success: true,
    message: 'All Attendance retrieved successfully',
    data: attendanceCount,
  });
});

const getEmployeeWorkingHours = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { from, to } = req.body;
  const attendance = await WebAttendance.find({
    employeeId: { $in: employeeId },
    date: {
      $gte: new Date(from),
      $lte: new Date(to),
    },
  });
  if (!attendance) {
    throw new Error('WebAttendance record not found');
  }
  let totalWorkingHours = 0;
  attendance.forEach((a) => {
    if (a.checkOut && a.checkIn) {
      const diff = a.checkOut.date - a.checkIn.date;
      totalWorkingHours += diff / 1000 / 60 / 60;
    }
    if (a.breakOut && a.breakOut.date && a.breakIn && a.breakIn.date) {
      const diff = a.breakOut.date - a.breakIn.date;
      totalWorkingHours -= diff / 1000 / 60 / 60;
    }
  });
  res.status(200).json({
    success: true,
    message: 'Employee Working Hours retrieved successfully',
    data: totalWorkingHours,
  });
});

const getEmployeeWorkingHoursByDate = asyncHandler(async (req, res) => {
  const { startDate, endDate, employeeIds } = req.body;
  const attendance = await WebAttendance.find({
    employeeId: { $in: employeeIds },
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  });
  if (!attendance) {
    throw new Error('WebAttendance record not found');
  }

  const employeeHours = {};
  attendance.forEach((a) => {
    if (!employeeHours[a.employeeId]) {
      employeeHours[a.employeeId] = {
        regularHours: 0,
        overTimeHours: 0,
      };
    }

    if (a.checkOut && a.checkIn) {
      const diff = a.checkOut.date - a.checkIn.date;
      employeeHours[a.employeeId].regularHours += diff / 1000 / 60 / 60;
      employeeHours[a.employeeId].regularHours = Math.round(
        employeeHours[a.employeeId].regularHours
      );
    }
    if (a.breakOut && a.breakOut.date && a.breakIn && a.breakIn.date) {
      const diff = a.breakOut.date - a.breakIn.date;
      employeeHours[a.employeeId].regularHours -= diff / 1000 / 60 / 60;
      employeeHours[a.employeeId].regularHours = Math.round(
        employeeHours[a.employeeId].regularHours
      );
    }
    if (employeeHours[a.employeeId].regularHours > 10) {
      employeeHours[a.employeeId].overTimeHours +=
        employeeHours[a.employeeId].regularHours - 10;
      employeeHours[a.employeeId].overTimeHours = Math.round(
        employeeHours[a.employeeId].overTimeHours
      );
      employeeHours[a.employeeId].regularHours = 10;
    }
  });
  res.status(200).json({
    success: true,
    message: 'Employee Working Hours retrieved successfully',
    data: employeeHours,
  });
});

const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { orgid, date } = req.body;
  const attendance = await WebAttendance.find({
    organization: orgid,
    date: {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(date).setHours(24, 0, 0, 0)),
    },
  }).populate('employeeId', ['firstName', 'lastName']);
  const present = [];
  const presentIds = [];
  attendance.forEach((record) => {
    //   record.attendance.forEach((entry) => {
    //     if (entry.date.toDateString() === new Date(date).toDateString()) {
    //       if (entry.inTime) {
    //         present.push(record.employeeId);
    //         presentIds.push(record.employeeId?._id.toString());
    //       }
    //     }
    //   });
    if (record.checkIn) {
      present.push(record.employeeId);
      presentIds.push(record.employeeId?._id.toString());
    }
  });
  res.status(200).json({
    success: true,
    message: 'Attendance retrieved successfully',
    data: { present, presentIds },
  });
});

//  router for getting all the attendance records of an employee
const getEmployeeAttendance = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const attendance = await WebAttendance.find({
    employeeId: { $in: employeeId },
  })
    .populate('employeeId', ['firstName', 'lastName'])
    .sort({ createdAt: -1 });
  if (!attendance) {
    throw new Error('WebAttendance record not found');
  }
  res.status(200).json({
    success: true,
    message: 'Employee Attendance retrieved successfully',
    data: attendance,
  });
});

//  router for getting all the attendance records of an employee upd=til 90 days
const getEmployeeAttendanceCount = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const attendance = await WebAttendance.find({
    employeeId: { $in: employeeId },
    date: {
      $gte: new Date(new Date().setDate(new Date().getDate() - 90)),
    },
  }).sort({ date: 1 });
  if (!attendance) {
    throw new Error('WebAttendance record not found');
  }
  const attendanceCount = {};
  attendance.forEach((a) => {
    if (attendanceCount[a.date]) {
      attendanceCount[a.date] += 1;
    } else {
      attendanceCount[a.date] = 1;
    }
  });
  res.status(200).json({
    success: true,
    message: 'Employee Attendance Count retrieved successfully',
    data: attendanceCount,
  });
});

// router for getting all the employee attendance records of an organization
const getEmployeeAttendanceList = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const attendance = await Employee.find({
    organization: orgid,
    isActivated: true,
  }).select('_id firstName lastName');
  res.status(201).json({
    success: true,
    message: 'Employee Attendance retrieved successfully',
    data: attendance,
  });
});

const getEmployeeAttendanceMonthly = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const attendance = await WebAttendance.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
        totalAttendance: { $sum: 1 },
        uniqueEmployees: { $addToSet: '$employeeId' },
      },
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: '$_id.month' },
          ],
        },
        totalAttendance: 1,
        employeeCount: { $size: '$uniqueEmployees' },
      },
    },
    {
      $sort: { month: -1 },
    },
  ]);
  res.status(201).json({
    success: true,
    message: 'Employee Attendance Monthly retrieved successfully',
    data: attendance,
  });
});

const getEmployeeAttendancesMonthly = asyncHandler(async (req, res) => {
  const { month, orgid } = req.params;
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0);

  const attendance = await WebAttendance.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' },
        },
        totalAttendance: { $sum: 1 },
        uniqueEmployees: { $addToSet: '$employeeId' },
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: '$_id.month' },
            '-',
            { $toString: '$_id.day' },
          ],
        },
        totalAttendance: 1,
        employeeCount: { $size: '$uniqueEmployees' },
      },
    },
    {
      $sort: { date: 1 },
    },
  ]);

  res.status(201).json({
    success: true,
    message: 'Employee Attendance Monthly retrieved successfully',
    data: attendance,
  });
});

const getEmployeeAttendanceByDate = asyncHandler(async (req, res) => {
  const { date, orgid } = req.params;
  const attendance = await WebAttendance.find({
    organization: orgid,
    date: {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(date).setHours(24, 0, 0, 0)),
    },
  })
    .populate('employeeId', ['firstName', 'lastName', 'role'])
    .sort({ date: -1 });
  if (!attendance) {
    throw new Error('WebAttendance record not found');
  }
  res.status(201).json({
    success: true,
    message: 'Employee Attendance By Date retrieved successfully',
    data: attendance,
  });
});
module.exports = {
  createWebAttendance,
  createBulkWebAttendance,
  getTodaysAttendance,
  getEmployeeAttendance,
  getEmployeeAttendanceCount,
  getEmployeeAttendanceMonthly,
  getEmployeeAttendanceByDate,
  getEmployeeWorkingHours,
  getEmployeeWorkingHoursByDate,
  getEmployeeAttendanceList,
  getEmployeeAttendancesMonthly,
  getAttendanceByDate,
  getAllAttendance,
};
