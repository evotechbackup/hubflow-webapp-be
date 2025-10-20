const Department = require('../../models/auth/Department');
const Company = require('../../models/auth/Company');
const Organization = require('../../models/auth/Organization');
const User = require('../../models/auth/User');

const { asyncHandler } = require('../../middleware');
const { ValidationError } = require('../../utils/errors');

// Create a department
const createDepartment = asyncHandler(async (req, res) => {
  const { name, modules, mainModule, companyId, dashboard } = req.body;
  if (!name) {
    throw new ValidationError('name is required');
  }
  const newDepartment = new Department({
    name,
    modules,
    mainModule,
    company: companyId,
    dashboard,
  });
  const savedDepartment = await newDepartment.save();

  // Add the department to the company
  await Company.findByIdAndUpdate(
    companyId,
    {
      $push: { departments: savedDepartment._id },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Department created successfully',
    data: savedDepartment,
  });
});

// Get all departments
const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find()
    .populate('modules')
    .populate('mainModule');
  res.status(200).json({
    success: true,
    message: 'Departments fetched successfully',
    data: departments,
  });
});

// Get all department by filter
const getAllDepartmentsByFilter = asyncHandler(async (req, res) => {
  const { filter_status } = req.query;
  const filter = {};
  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }

  const departments = await Department.find(filter);

  res.status(200).json({
    success: true,
    message: 'Departments fetched successfully',
    data: departments,
  });
});

// Get all department of a company
const getAllDepartmentsOfCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const company = await Company.findById(id)
    .populate({
      path: 'departments',
      model: 'Department',
      populate: {
        path: 'modules',
        model: 'Modules',
        select: 'name',
      },
    })
    .select('departments');
  res.status(200).json({
    success: true,
    message: 'Departments fetched successfully',
    data: company.departments,
  });
});

// Get a department by id
const getDepartmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const department = await Department.findById(id).populate('modules');
  res.status(200).json({
    success: true,
    message: 'Department fetched successfully',
    data: department,
  });
});

// Get department name
const getDepartmentName = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const department = await Department.findById(id).select('name');
  res.status(200).json({
    success: true,
    message: 'Department name fetched successfully',
    data: department,
  });
});

// Get number of users in a department
const getNumberOfUsersInDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const users = await User.find({ department: id }).countDocuments();
  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

// Get number of users for every department
const getNumberOfUsersForEveryDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const departments = await Organization.findById(id)
    .populate('department')
    .select('department');
  const users = await Promise.all(
    departments?.department?.map(async (department) => {
      const user = await User.find({
        department: department._id,
        organization: id,
      }).countDocuments();
      return { department: department.name, users: user };
    })
  );
  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

// Edit a department
const editDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, modules, mainModule, companyId, dashboard } = req.body;
  if (!name) {
    throw new ValidationError('name is required');
  }
  const updatedDepartment = await Department.findByIdAndUpdate(
    id,
    {
      name,
      modules,
      mainModule,
      company: companyId,
      dashboard,
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Department updated successfully',
    data: updatedDepartment,
  });
});

// delete a department
const deleteDepartment = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  await Department.findByIdAndDelete(id);
  await Company.findByIdAndUpdate(
    companyId,
    {
      $pull: { departments: id },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Department deleted',
  });
});

const deleteDepartmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Department.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Department deleted',
  });
});

module.exports = {
  createDepartment,
  getAllDepartments,
  getAllDepartmentsByFilter,
  getAllDepartmentsOfCompany,
  getDepartmentById,
  getDepartmentName,
  getNumberOfUsersInDepartment,
  getNumberOfUsersForEveryDepartment,
  editDepartment,
  deleteDepartment,
  deleteDepartmentById,
};
