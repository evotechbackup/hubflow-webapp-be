const Modules = require('../../models/auth/Modules');
const Company = require('../../models/auth/Company');
const Department = require('../../models/auth/Department');
const ApprovalManagement = require('../../models/approvals/ApprovalManagement');
const { asyncHandler } = require('../../middleware');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const createModule = asyncHandler(async (req, res) => {
  const { name, features } = req.body;
  if (!name || !features) {
    throw new ValidationError('Module name and features are required');
  }
  const newModule = new Modules({
    name,
    features,
  });
  const savedModule = await newModule.save();

  res.status(201).json({
    success: true,
    message: 'Module created successfully',
    data: savedModule,
  });
});

const getAllModules = asyncHandler(async (req, res) => {
  const modules = await Modules.find();
  res.status(200).json({
    success: true,
    message: 'Modules fetched successfully',
    data: modules,
  });
});

const assignModulesToCompany = asyncHandler(async (req, res) => {
  const { companyId, modules } = req.body;
  if (!companyId || !modules) {
    throw new ValidationError('Company ID and modules are required');
  }
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { modules },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Modules assigned to company successfully',
    data: updatedCompany,
  });
});

const editModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, features } = req.body;
  if (!name || !features) {
    throw new ValidationError('Module name and features are required');
  }
  const updatedModule = await Modules.findByIdAndUpdate(
    id,
    {
      name,
      features,
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Module updated successfully',
    data: updatedModule,
  });
});

const assignModuleToCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyId, moduleName } = req.body;
  const moduleLowerCase = moduleName.toLowerCase();
  if (!companyId) {
    throw new ValidationError('Company ID is required');
  }

  const company = await Company.findById(companyId);

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const isModuleAlreadyAssigned = company.activeModules.includes(id);

  if (isModuleAlreadyAssigned) {
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      {
        $pull: { activeModules: id },
        $set: { [`app.${moduleLowerCase}`]: false },
      },
      { new: true }
    );

    await Department.updateMany(
      { _id: { $in: company.departments } },
      {
        $pull: {
          modules: id,
        },
      },
      { new: true }
    );

    await Department.updateMany(
      {
        _id: { $in: company.departments },
        mainModule: id,
      },
      {
        $unset: {
          mainModule: 1,
        },
      },
      { new: true }
    );

    if (moduleLowerCase === 'approvals') {
      await ApprovalManagement.updateMany(
        { organization: { $in: company.organization } },
        {
          $set: {
            'approval.$[].reviewed': false,
            'approval.$[].verified': false,
            'approval.$[].acknowledged': false,
            'approval.$[].approved1': false,
            'approval.$[].approved2': false,
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Module unassigned successfully',
      data: updatedCompany,
    });
  } else {
    if (
      company.subscriptionPlan === 'standard' &&
      company.activeModules.length >= 7
    ) {
      throw new ValidationError(
        'You have reached the maximum number of modules, please upgrade to a pro plan'
      );
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      {
        $push: { activeModules: id },
        $set: { [`app.${moduleLowerCase}`]: true },
      },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: 'Module assigned successfully',
      data: updatedCompany,
    });
  }
});

// get modules from company
const getModulesFromCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId).populate('modules');
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  res.status(200).json({
    success: true,
    message: 'Modules fetched successfully',
    data: company.modules,
  });
});

// get active modules from company
const getActiveModulesFromCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId).populate('activeModules');
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  res.status(200).json({
    success: true,
    message: 'Active modules fetched successfully',
    data: company.activeModules,
  });
});

//get active module id from company
const getActiveModuleIdsFromCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId).select('activeModules');

  if (!company) {
    throw new NotFoundError('Company not found');
  }
  res.status(200).json({
    success: true,
    message: 'Active module IDs fetched successfully',
    data: company.activeModules,
  });
});

// modules for master admin
const getAllModulesForMasterAdmin = asyncHandler(async (req, res) => {
  const modules = await Modules.find();
  res.status(200).json({
    success: true,
    message: 'Modules fetched successfully',
    data: modules,
  });
});

// modules for master admin
const createModuleForMasterAdmin = asyncHandler(async (req, res) => {
  const { name, features } = req.body;
  const modules = await Modules.create({ name, features });
  if (!name || !features) {
    throw new ValidationError('Module name and features are required');
  }
  res.status(200).json({
    success: true,
    message: 'Module created successfully',
    data: modules,
  });
});

module.exports = {
  createModule,
  getAllModules,
  assignModulesToCompany,
  editModule,
  assignModuleToCompany,
  getModulesFromCompany,
  getActiveModulesFromCompany,
  getActiveModuleIdsFromCompany,
  getAllModulesForMasterAdmin,
  createModuleForMasterAdmin,
};
