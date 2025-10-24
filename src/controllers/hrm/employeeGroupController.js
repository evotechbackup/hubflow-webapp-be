const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const EmployeeGroup = require('../../models/hrm/EmployeeGroup');
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
  const employeeGroup = await EmployeeGroup.findById(id).populate({
    path: 'employees',
    populate: {
      path: 'department',
      select: 'name',
    },
  });

  res.status(200).json({
    success: true,
    message: 'Employee Group retrieved successfully',
    data: employeeGroup,
  });
});

module.exports = {
  createEmployeeGroup,
  updateEmployeeGroup,
  getEmployeeGroups,
  getemployeegroupbyid,
};
