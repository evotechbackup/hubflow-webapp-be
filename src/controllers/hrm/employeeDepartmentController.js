const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Employee = require('../../models/hrm/Employee');
const EmployeeDepartment = require('../../models/hrm/EmployeeDepartment');
const mongoose = require('mongoose');
// const { createActivityLog } = require("../../utilities/logUtils");

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, roles, roleCodes, company, organization } = req.body;
  if (!name) {
    throw new Error('name is required');
  }
  const newDepartment = new EmployeeDepartment({
    name,
    code,
    roles,
    roleCodes,
    company,
    organization,
  });
  const savedDepartment = await newDepartment.save();

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
    message: 'Department created successfully',
    data: savedDepartment,
  });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, roles, roleCodes } = req.body;

  if (!name) {
    throw new Error('Name is required');
  }
  const updatedDepartment = await EmployeeDepartment.findByIdAndUpdate(
    id,
    { name, code, roles, roleCodes },
    { new: true }
  );
  if (!updatedDepartment) {
    throw new NotFoundError('Employee Department not found');
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
    message: 'Department updated successfully',
    data: updatedDepartment,
  });
});

const addrole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, code } = req.body;
  const updatedDepartment = await EmployeeDepartment.findByIdAndUpdate(
    id,
    { $push: { roles: role, roleCodes: code } },
    { new: true }
  );

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
    message: 'Role added successfully',
    data: updatedDepartment,
  });
});

const getEmployeeDepartments = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const departments = await EmployeeDepartment.find({
    isDeleted: false,
    organization: orgid,
  }).lean();
  await Promise.all(
    departments.map(async (department) => {
      const employeeCount = await Employee.countDocuments({
        isActivated: true,
        department: department._id,
      });
      department.employeeCount = employeeCount;
    })
  );

  res.status(200).json({
    success: true,
    message: 'Department retrieved successfully',
    data: departments,
  });
});

const getEmployeeDepartmentsWithRole = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const department = await EmployeeDepartment.find({
    organization: orgid,
    isDeleted: false,
  }).select('roles name');

  res.status(200).json({
    success: true,
    message: 'Department retrieved successfully',
    data: department,
  });
});

const getEmployeeByDepartmentId = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;

  const employees = await Employee.find({
    department: departmentId,
  });
  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: employees,
  });
});

const getEmployeeByDepartmentandRoleId = asyncHandler(async (req, res) => {
  const { departmentId, role } = req.params;

  const employees = await Employee.find({
    department: departmentId,
    role,
  });

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: employees,
  });
});

const getByDepartmentId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employees = await EmployeeDepartment.findById(id);

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: employees,
  });
});

const getEmployeedeptbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const department = await EmployeeDepartment.findById(id);

  if (!department) {
    throw new NotFoundError('Department not found');
  }

  const employeeCounts = await Promise.all(
    department.roles.map(async (role) => {
      return await Employee.countDocuments({
        role: { $in: role },
        department: id,
      });
    })
  );

  const departmentData = department.toObject();
  departmentData.employeeCount = employeeCounts;

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: departmentData,
  });
});

const totaldeptnroles = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const totalRoles = await EmployeeDepartment.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        isDeleted: false,
      },
    },
    { $unwind: '$roles' },
    {
      $match: {
        roles: { $ne: '' },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]);
  const rolesCount = totalRoles.length > 0 ? totalRoles[0].count : 0;

  res.status(200).json({
    success: true,
    message: 'Total department and roles retrieved successfully',
    data: rolesCount,
  });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const department = await EmployeeDepartment.findByIdAndDelete(id);
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  res.status(200).json({
    success: true,
    message: 'Department deleted successfully',
    data: department,
  });
});

module.exports = {
  createDepartment,
  updateDepartment,
  addrole,
  getEmployeeDepartments,
  getEmployeeDepartmentsWithRole,
  getEmployeeByDepartmentId,
  getEmployeeByDepartmentandRoleId,
  getByDepartmentId,
  getEmployeedeptbyid,
  totaldeptnroles,
  deleteDepartment,
};
