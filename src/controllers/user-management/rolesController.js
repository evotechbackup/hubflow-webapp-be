const { default: mongoose } = require('mongoose');
const Department = require('../../models/auth/Department');
const Roles = require('../../models/auth/Roles');
const Company = require('../../models/auth/Company');
const User = require('../../models/auth/User');

const { asyncHandler } = require('../../middleware');
const { ValidationError, NotFoundError } = require('../../utils/errors');

// Get all roles of a department
const getAllRolesOfDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const roles = await Department.findById(departmentId)
    .populate('roles')
    .select('roles');

  res.status(200).json({
    success: true,
    message: 'Roles fetched successfully',
    data: roles,
  });
});

// Create a role
const createRole = asyncHandler(async (req, res) => {
  const { name, permissions, approval, hierarchy, company } = req.body;
  const { departmentId } = req.params;
  if (!name) {
    throw new ValidationError('name is required');
  }

  const companyData = await Company.findById(company).select(
    'allowedUsers subscriptionPlan'
  );

  if (!companyData) {
    throw new NotFoundError('Company not found');
  }

  const existingRoles = await Roles.countDocuments({
    company,
  });
  if (
    companyData.subscriptionPlan !== 'free' &&
    existingRoles >= companyData.allowedUsers
  ) {
    throw new ValidationError('you have reached the limit of roles');
  }

  const cleanPermissions = permissions.map((permission) => {
    return {
      ...permission,
      features: permission.features.toLowerCase(),
    };
  });
  const newRoles = new Roles({
    name: name.trim(),
    permissions: cleanPermissions,
    approval,
    hierarchy,
    company,
  });
  const savedRoles = await newRoles.save();

  // Add the roles to the department
  await Department.findByIdAndUpdate(
    departmentId,
    {
      $push: { roles: savedRoles._id },
    },
    { new: true }
  );
  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: savedRoles,
  });
});

// Edit Role
const editRole = asyncHandler(async (req, res) => {
  const { name, permissions, approval, hierarchy, company } = req.body;
  const { id } = req.params;
  if (!name) {
    throw new ValidationError('name is required');
  }
  const roles = await Roles.findByIdAndUpdate(id, {
    name: name.trim(),
    permissions,
    approval,
    hierarchy,
    company,
  });

  if (hierarchy !== roles.hierarchy) {
    await User.updateMany(
      {
        role: roles.name,
        company: roles.company,
      },
      {
        $set: {
          hierarchy,
        },
      }
    );
  }

  if (name !== roles.name) {
    await User.updateMany(
      { role: roles.name, company: roles.company },
      { $set: { role: name } }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Role updated successfully',
    data: roles,
  });
});

const getMainModule = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const department = await Department.findById(departmentId).populate(
    'mainModule',
    ['name']
  );
  res.status(201).json({
    success: true,
    message: 'Main module fetched successfully',
    data: department.mainModule?.name?.toLowerCase(),
  });
});

const getPermissionsOfHierarchy1 = asyncHandler(async (req, res) => {
  const { companyid, roleName } = req.params;
  const role = await Roles.findOne({
    company: companyid,
    name: roleName,
  }).select('permissions approval');
  const permissions = {};
  role?.permissions?.forEach((permission) => {
    permissions[permission.features] = permission;
  });
  const approval = role?.approval;
  const structuredApproval = {};
  approval?.forEach((approval) => {
    structuredApproval[approval.feature] = approval.allowed;
  });
  res.status(200).json({
    success: true,
    message: 'Permissions fetched successfully',
    data: {
      permissions,
      approvals: structuredApproval,
    },
  });
});

// Get all permissions of a role in a department
const getAllPermissionsOfRoleInDepartment = asyncHandler(async (req, res) => {
  const { departmentId, roleName } = req.params;

  if (
    (!departmentId && departmentId === 'undefined') ||
    (!roleName && roleName === 'undefined') ||
    !mongoose.Types.ObjectId.isValid(departmentId)
  ) {
    throw new ValidationError('departmentId and roleName are required');
  }

  const role = await Department.findById(departmentId)
    .populate({
      path: 'roles',
      model: 'Roles',
      match: { name: roleName },
      select: 'permissions approval',
    })
    .select('roles');

  const data = role?.roles?.[0]?.permissions;
  const permissions = {};
  data.forEach((permission) => {
    permissions[permission.features] = permission;
  });
  if (!role) {
    throw new NotFoundError('role not found');
  }

  const approval = role.roles[0]?.approval;

  // structure the approval that {feature: allowed}
  const structuredApproval = {};
  approval.forEach((approval) => {
    structuredApproval[approval.feature] = approval.allowed;
  });

  res.status(200).json({
    success: true,
    message: 'Permissions fetched successfully',
    data: {
      permissions,
      approvals: structuredApproval,
    },
  });
});

const getRolesWithHierarchy = asyncHandler(async (req, res) => {
  const { departmentId, roleName } = req.params;
  const department = await Department.findById(departmentId).populate({
    path: 'roles',
    model: 'Roles',
    match: { name: roleName },
    select: 'hierarchy',
  });
  if (!department) {
    throw new NotFoundError('department not found');
  }

  const roles = await Department.findById(departmentId).populate('roles');

  const filteredRoles = roles.roles.filter(
    (role) => role.hierarchy >= department.roles[0].hierarchy
  );

  res.status(200).json({
    success: true,
    message: 'Roles fetched successfully',
    data: filteredRoles,
  });
});

module.exports = {
  getAllRolesOfDepartment,
  createRole,
  editRole,
  getMainModule,
  getPermissionsOfHierarchy1,
  getAllPermissionsOfRoleInDepartment,
  getRolesWithHierarchy,
};
