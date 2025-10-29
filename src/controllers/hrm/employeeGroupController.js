const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const EmployeeGroup = require('../../models/hrm/EmployeeGroup');
const Employee = require('../../models/hrm/Employee');
const mongoose = require('mongoose');
// const { createActivityLog } = require("../../utilities/logUtils");

const createEmployeeGroup = asyncHandler(async (req, res) => {
  const { name, employees, company, organization, code } = req.body;

  const newEmployeeGroup = new EmployeeGroup({
    name,
    employees,
    code,
    company,
    organization,
  });

  await newEmployeeGroup.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'employeeDepartment',
  //   actionId: `${savedDepartment.name} - ${savedDepartment.code}`,
  //   organization: savedDepartment.organization,
  //   company: savedDepartment.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Employee Group created successfully',
    data: newEmployeeGroup,
  });
});

const updateEmployeeGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, employees, code } = req.body;

  const updatedEmployeeGroup = await EmployeeGroup.findByIdAndUpdate(
    id,
    { name, employees, code },
    { new: true }
  );
  if (!updatedEmployeeGroup) {
    throw new NotFoundError('Employee Group not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'employeeDepartment',
  //   actionId: `${updatedDepartment.name} - ${updatedDepartment.code}`,
  //   organization: updatedDepartment.organization,
  //   company: updatedDepartment.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Employee Group updated successfully',
    data: updatedEmployeeGroup,
  });
});

const getEmployeeGroups = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const employeeGroups = await EmployeeGroup.find({
    organization: orgid,
  }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: employeeGroups,
  });
});

const getemployeegroupbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeGroup = await EmployeeGroup.findById(id);
  if (!employeeGroup) {
    throw new NotFoundError('Employee Group not found');
  }
  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: employeeGroup,
  });
});

const adddivision = asyncHandler(async (req, res) => {
  const { division } = req.body;

  const updatedEmployeeGroup = await EmployeeGroup.findByIdAndUpdate(
    req.params.id,
    { $push: { division } },
    { new: true }
  );

  for (const employee of division.employees) {
    const updatedEmployee = await Employee.findByIdAndUpdate(employee, {
      $set: {
        employeeGroup: updatedEmployeeGroup._id,
        division: division.name,
      },
    });

    // Generate embedding for search and analytics
    try {
      await updatedEmployee.generateEmbedding();
    } catch (error) {
      console.error('Error generating embedding for employee:', error);
    }
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'employeeDivision',
  //   actionId: `${division.name} - ${division.code}`,
  //   organization: updatedEmployeeGroup.organization,
  //   company: updatedEmployeeGroup.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Employee Group updated successfully',
    data: updatedEmployeeGroup,
  });
});

const removedivision = asyncHandler(async (req, res) => {
  const { divisionId } = req.body;

  const employeeGroup = await EmployeeGroup.findById(req.params.id);

  if (!employeeGroup) {
    throw new NotFoundError('Employee group not found');
  }

  employeeGroup.division = employeeGroup.division.filter(
    (div) => div._id.toString() !== divisionId
  );

  await employeeGroup.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'delete',
  //   type: 'employeeDivision',
  //   actionId: `${employeeGroup.name} - ${employeeGroup.code}`,
  //   organization: employeeGroup.organization,
  //   company: employeeGroup.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Employee Group updated successfully',
    data: employeeGroup,
  });
});

const updatedivisionnamecode = asyncHandler(async (req, res) => {
  const { division } = req.body;

  const employeeGroup = await EmployeeGroup.findById(req.params.id);

  const updatedDivisions = employeeGroup.division.map((div) => {
    if (div._id.toString() === division._id.toString()) {
      return {
        name: division.name,
        code: division.code,
        employees: div.employees,
      };
    }
    return div;
  });

  employeeGroup.division = updatedDivisions;

  await employeeGroup.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'employeeDivision',
  //   actionId: `${division.name} - ${division.code}`,
  //   organization: employeeGroup.organization,
  //   company: employeeGroup.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Employee Group updated successfully',
    data: employeeGroup,
  });
});

const updatedivision = asyncHandler(async (req, res) => {
  const { division } = req.body;
  if (!division || !division._id) {
    throw new Error('Invalid division data');
  }

  const employeeGroup = await EmployeeGroup.findById(req.params.id);
  if (!employeeGroup) {
    throw new NotFoundError('Employee group not found');
  }

  // Update division in current employee group
  employeeGroup.division = employeeGroup.division.map((div) =>
    div._id.toString() === division._id.toString() ? division : div
  );

  // Collect all employee updates
  const employeeUpdates = [];
  const employeeGroupUpdates = new Map();

  for (const employeeId of division.employees) {
    const employeeData = await Employee.findById(employeeId);
    if (!employeeData) continue;

    const currentGroupId = employeeData.employeeGroup?.toString();
    const newGroupId = employeeGroup._id.toString();

    if (currentGroupId && currentGroupId !== newGroupId) {
      // Employee is moving from another group
      if (!employeeGroupUpdates.has(currentGroupId)) {
        const oldGroup = await EmployeeGroup.findById(currentGroupId);
        if (oldGroup) {
          oldGroup.division = oldGroup.division.map((div) => ({
            ...div,
            employees: div.employees.filter(
              (emp) => emp.toString() !== employeeId.toString()
            ),
          }));
          employeeGroupUpdates.set(currentGroupId, oldGroup);
        }
      }

      employeeUpdates.push({
        updateOne: {
          filter: { _id: employeeId },
          update: {
            $set: {
              employeeGroup: employeeGroup._id,
              division: division.name,
            },
          },
        },
      });
    } else if (employeeData.division !== division.name) {
      // Employee is just changing divisions within the same group
      employeeUpdates.push({
        updateOne: {
          filter: { _id: employeeId },
          update: {
            $set: { division: division.name },
          },
        },
      });
    }
  }

  // Execute all updates in parallel
  await Promise.all([
    employeeGroup.save(),
    ...Array.from(employeeGroupUpdates.values()).map((group) => group.save()),
    employeeUpdates.length > 0
      ? Employee.bulkWrite(employeeUpdates)
      : Promise.resolve(),
  ]);

  // Generate embeddings for all updated employees
  const updatedEmployees = await Employee.find({
    _id: { $in: division.employees },
  });
  for (const employee of updatedEmployees) {
    try {
      await employee.generateEmbedding();
    } catch (error) {
      console.error('Error generating embedding for employee:', error);
    }
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'employeeDivision',
  //   actionId: `${division.name} - ${division.code}`,
  //   organization: employeeGroup.organization,
  //   company: employeeGroup.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Employee Group updated successfully',
    data: employeeGroup,
  });
});

const getdivisionbyid = asyncHandler(async (req, res) => {
  const { id, divisionid } = req.params;

  const employeeGroup = await EmployeeGroup.findById(id).populate({
    path: 'division.employees',
    populate: {
      path: 'department',
      select: 'name',
    },
  });

  if (!employeeGroup) {
    throw new NotFoundError('Employee group not found');
  }

  const division = employeeGroup.division.find(
    (div) => div._id.toString() === divisionid
  );

  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: division,
  });
});

const getemployeesgroupbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeGroup = await EmployeeGroup.findById(id);
  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: employeeGroup,
  });
});

const allemployeeswithgroup = asyncHandler(async (req, res) => {
  const { groupid } = req.params;
  // const employees = await Employee.find({
  //   employeeGroup: groupid,
  // })
  //   .populate("department", ["name"])
  //   .select("firstName lastName employeeId division department email role");
  const employees = await Employee.aggregate([
    {
      $match: {
        employeeGroup: new mongoose.Types.ObjectId(groupid),
        isActivated: true,
      },
    },
    {
      $project: {
        division: 1,
        firstName: 1,
        lastName: 1,
        employeeId: 1,
        department: 1,
        email: 1,
        role: 1,
      },
    },
    {
      $lookup: {
        from: 'employeedepartments',
        localField: 'department',
        foreignField: '_id',
        as: 'department',
        pipeline: [
          {
            $project: {
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$department',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$department.name',
        employees: { $push: '$$ROOT' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: employees,
  });
});

const totalgroupsndivisions = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const totalGroups = await EmployeeGroup.countDocuments({
    organization: orgid,
  });

  const totalDivisions = await EmployeeGroup.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
      },
    },
    {
      $unwind: {
        path: '$division',
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]);

  const totalDivisionsCount =
    totalDivisions.length > 0 ? totalDivisions[0].count : 0;

  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: { totalGroups, totalDivisions: totalDivisionsCount },
  });
});

const allemployeesgroupbyId = asyncHandler(async (req, res) => {
  const { groupid } = req.params;

  const employees = await Employee.aggregate([
    {
      $match: {
        employeeGroup: new mongoose.Types.ObjectId(groupid),
        isActivated: true,
      },
    },
    {
      $project: {
        division: 1,
        firstName: 1,
        lastName: 1,
        employeeId: 1,
        department: 1,
        email: 1,
        role: 1,
        dailyPay: 1,
        hourlyPay: 1,
        // employeeId: 1,
      },
    },
    {
      $lookup: {
        from: 'employeedepartments',
        localField: 'department',
        foreignField: '_id',
        as: 'department',
        pipeline: [
          {
            $project: {
              name: 1,
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: '$division',
        employees: { $push: '$$ROOT' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: employees,
  });
});

const allemployeeswithgroupanddivision = asyncHandler(async (req, res) => {
  const { groupid, division } = req.params;

  const employees = await Employee.find({
    employeeGroup: groupid,
    division,
    isActivated: true,
  }).populate('department', ['name']);

  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: employees,
  });
});

module.exports = {
  createEmployeeGroup,
  updateEmployeeGroup,
  getEmployeeGroups,
  getemployeegroupbyid,
  allemployeeswithgroup,
  allemployeeswithgroupanddivision,
  totalgroupsndivisions,
  adddivision,
  removedivision,
  updatedivisionnamecode,
  updatedivision,
  getdivisionbyid,
  getemployeesgroupbyid,
  allemployeesgroupbyId,
};
