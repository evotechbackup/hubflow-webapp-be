const User = require('../../models/auth/User');
const Organization = require('../../models/auth/Organization');
const Company = require('../../models/auth/Company');
const Account = require('../../models/accounts/Account');
// const Category = require("../../models/Category");
const ParentAccount = require('../../models/accounts/ParentAccount');
const { fixedParentAccounts, fixedAccounts } = require('../../utils/accounts');
const mongoose = require('mongoose');
const { asyncHandler } = require('../../middleware');
const {
  ValidationError,
  NotFoundError,
  AppError,
} = require('../../utils/errors');

const createOrganization = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, departments, companyId, isAccrualAccounting } = req.body;
    if (!name) {
      throw new ValidationError('name is required');
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (
      company.subscriptionPlan === 'standard' &&
      company.organization.length > 1
    ) {
      throw new ValidationError(
        'You have reached the maximum number of organizations, please upgrade to a pro plan'
      );
    }

    const newOrg = new Organization({
      name,
      department: departments,
      isAccrualAccounting,
    });
    const savedOrg = await newOrg.save({ session });

    // Add the organization to the company
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { organization: savedOrg._id } },
      { new: true, session }
    );

    // Create parent accounts
    const parentAccountsWithOrgId = fixedParentAccounts.map((account) => ({
      ...account,
      organization: savedOrg._id,
      company: companyId,
    }));

    const savedParentAccounts = await ParentAccount.insertMany(
      parentAccountsWithOrgId,
      { session }
    );

    // Create child accounts and link them to parent accounts
    const childAccountPromises = fixedAccounts.map(async (account) => {
      const parentAccount = savedParentAccounts.find(
        (parent) => parent.accountName === account.parentAccount
      );

      if (!parentAccount) {
        throw new NotFoundError(
          `No parent account found for ${account.accountName}`
        );
      }

      const newAccount = new Account({
        ...account,
        parentAccount: null,
        organization: savedOrg._id,
        company: companyId,
      });

      const savedAccount = await newAccount.save({ session });

      // Add child account to parent's childAccounts array
      await ParentAccount.findByIdAndUpdate(
        parentAccount._id,
        { $push: { childAccounts: savedAccount._id } },
        { new: true, session }
      );

      return savedAccount;
    });

    await Promise.all(childAccountPromises);

    // Create categories
    // await Category.insertMany(
    //   [
    //     {
    //       categoryName: 'Uncategorized',
    //       company: companyId,
    //       organization: savedOrg._id,
    //       type: 'goods',
    //     },
    //     {
    //       categoryName: 'Uncategorized',
    //       company: companyId,
    //       organization: savedOrg._id,
    //       type: 'consumables',
    //     },
    //     {
    //       categoryName: 'Uncategorized',
    //       company: companyId,
    //       organization: savedOrg._id,
    //       type: 'rentals',
    //     },
    //     {
    //       categoryName: 'Uncategorized',
    //       company: companyId,
    //       organization: savedOrg._id,
    //       type: 'vehicles',
    //     },
    //     {
    //       categoryName: 'Project Materials',
    //       company: companyId,
    //       organization: savedOrg._id,
    //       type: 'materials',
    //     },
    //   ],
    //   { session }
    // );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: savedOrg,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(err.message, err.statusCode);
  }
});

// Get all organizations
const getAllOrganizations = asyncHandler(async (req, res) => {
  const organization = await Organization.find().populate('department');
  res.status(200).json({
    success: true,
    message: 'Organizations fetched successfully',
    data: organization,
  });
});

const getFeatureFlags = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orgid)) {
    throw new NotFoundError('Organization not found');
  }

  const organization = await Organization.findById(orgid).select(
    'attendance projectFeatures inventoryFeatures rentalTypes crmFeatures  dashboardModules costCenter invoiceFeatures fiscalYear baseCurrency salesFeatures salesTemplate procurementTemplate accountTemplate hrmTemplate vendorId quotationFeatures isAccrualAccounting fleetsFeatures'
  );

  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  res.status(200).json({
    success: true,
    message: 'Feature flags fetched successfully',
    data: {
      attendanceMethod: organization?.attendance,
      projectFeatures: organization?.projectFeatures,
      inventoryFeatures: organization?.inventoryFeatures,
      rentalTypes: organization?.rentalTypes,
      fleetsFeatures: organization?.fleetsFeatures,
      crmFeatures: organization?.crmFeatures,
      costCenter: organization?.costCenter,
      invoiceFeatures: organization?.invoiceFeatures,
      fiscalYear: organization?.fiscalYear || 'January-December',
      baseCurrency: organization?.baseCurrency || 'AED',
      salesFeatures: organization?.salesFeatures,
      salesTemplate: organization?.salesTemplate,
      procurementTemplate: organization?.procurementTemplate,
      vendorId: organization?.vendorId,
      quotationFeatures: organization?.quotationFeatures,
      accountTemplate: organization?.accountTemplate,
      hrmTemplate: organization?.hrmTemplate,
      isAccrualAccounting: organization?.isAccrualAccounting,
      dashboardModules: organization?.dashboardModules,
    },
  });
});

// Get all organization of a company
const getAllOrganizationOfCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const company = await Company.findById(id)
    .populate('organization')
    .select('organization');

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  // Get number of users for each organization
  const orgsWithUsers = await Promise.all(
    company.organization.map(async (org) => {
      const users = await User.find({
        organization: org._id,
        deactivated: false,
      }).countDocuments();

      return {
        ...org.toObject(),
        users,
      };
    })
  );

  res.status(200).json({
    success: true,
    message: 'Organizations fetched successfully',
    data: orgsWithUsers,
  });
});

// Get a organization by id
const getOrganizationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id).populate({
    path: 'department',
    model: 'Department',
    populate: {
      path: 'modules',
      model: 'Modules',
      select: 'name',
    },
  });
  res.status(200).json({
    success: true,
    message: 'Organization fetched successfully',
    data: organization,
  });
});

const getOrgById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id);
  res.status(200).json({
    success: true,
    message: 'Organization fetched successfully',
    data: organization,
  });
});

const getDepartmentAndRoles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id)
    .populate({
      path: 'department',
      model: 'Department',
      populate: {
        path: 'roles',
        model: 'Roles',
        select: 'name',
      },
    })
    .select('department');
  res.status(200).json({
    success: true,
    message: 'Department and roles fetched successfully',
    data: organization,
  });
});

// Get department name
const getOrgName = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id).select('name');
  res.status(200).json({
    success: true,
    message: 'Organization name fetched successfully',
    data: organization,
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

// Edit a department
const editOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    departments,
    // isAccrualAccounting,
    // companyId
  } = req.body;
  if (!name) {
    throw new ValidationError('name is required');
  }
  const updatedOrganizaion = await Organization.findById(id);
  updatedOrganizaion.name = name;
  updatedOrganizaion.department = departments;

  // if (isAccrualAccounting !== updatedOrganizaion.isAccrualAccounting) {
  //   const invoices = await Invoice.countDocuments({ organization: id });

  //   const bills = await Bills.countDocuments({ organization: id });

  //   const payrolls = await Payroll.countDocuments({ organization: id });

  //   if (invoices === 0 && bills === 0 && payrolls === 0) {
  //     updatedOrganizaion.isAccrualAccounting = isAccrualAccounting;
  //   }
  // }

  await updatedOrganizaion.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganizaion,
  });
});

const editOrganizationOther = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    arabicName,
    letterheadName,
    letterheadArabicName,
    organizationLogo,
    organizationSeal,
    organizationSignature,
    salesColor,
    salesFontColor,
    procurementColor,
    procurementFontColor,
    cr,
    vat,
    organizationAddress,
    organizationCity,
    organizationState,
    organizationZip,
    organizationCountry,
    webURL,
    landlineNumber,
    mobileNumber,
    faxNumber,
    pOBox,
    organizationEmail,
    organizationLocation,
    baseCurrency,
    fiscalYear,
    language,
    timeZone,
    buildingNumber,
    additionalNumber,
    organizationDistrict,
    vendorId,
    qrCode,
  } = req.body;
  const organization = await Organization.findById(id);
  const updatedOrganization = await organization.updateOne(
    {
      $set: {
        name,
        arabicName,
        letterheadName,
        letterheadArabicName,
        organizationAddress,
        organizationCity,
        organizationState,
        organizationZip,
        organizationCountry,
        webURL,
        vat,
        cr,
        landlineNumber,
        mobileNumber,
        faxNumber,
        pOBox,
        organizationEmail,
        organizationLocation,
        baseCurrency,
        fiscalYear,
        language,
        timeZone,
        buildingNumber,
        additionalNumber,
        organizationDistrict,
        salesColor,
        procurementColor,
        salesFontColor,
        procurementFontColor,
        organizationLogo,
        organizationSeal,
        organizationSignature,
        vendorId,
        qrCode,
      },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
});

const editOrganizationBilling = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bank } = req.body;
  const organization = await Organization.findByIdAndUpdate(
    id,
    {
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      iBANNumber: bank.iBANNumber,
      accountName: bank.accountName,
      branchName: bank.branchName,
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization,
  });
});

const editOrganizationAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findOneAndUpdate(
    { _id: id },
    { $set: { attendance: req.body.attendance } },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization,
  });
});

const editOrganizationInventoryFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findOne({
    _id: id,
  });
  organization.inventoryFeatures[req.body.feature] = req.body.value;
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
});

const editOrganizationFleetsFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findOne({
    _id: id,
  });
  organization.fleetsFeatures[req.body.feature] = req.body.value;
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
});

const editOrganizationRentalTypes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findOne({
    _id: id,
  });
  organization.rentalTypes[req.body.feature] = req.body.value;
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
});

const editOrganizationCrmFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findOne({
    _id: id,
  });
  organization.crmFeatures[req.body.feature] = req.body.value;
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
});

const editOrganizationInvoiceFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findOne({
    _id: id,
  });
  organization.invoiceFeatures[req.body.feature] = req.body.value;
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
});

const editOrganizationCostCenter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findByIdAndUpdate(
    id,
    { $set: { costCenter: req.body.costCenter } },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization,
  });
});

const editOrganizationSalesFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id);
  // make everything false except the feature that is being updated
  organization.salesFeatures = Object.fromEntries(
    Object.entries(organization.salesFeatures).map(([key, _]) => [
      key,
      key === req.body.feature ? true : false,
    ])
  );
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization.salesFeatures,
  });
});

const editOrganizationQuotationFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id);
  organization.quotationFeatures[req.body.feature] = req.body.value;
  const updatedOrganization = await organization.save();
  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization.quotationFeatures,
  });
});

const editOrganizationSalesTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, template } = req.body;
  const organization = await Organization.findById(id);

  if (!organization.salesTemplate[type]) {
    organization.salesTemplate[type] = template;
    await organization.save();
  } else {
    await Organization.findByIdAndUpdate(
      req.params.organizationid,
      { $set: { [`salesTemplate.${type}`]: template } },
      { new: true }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.salesTemplate,
  });
});

const editOrganizationAccountTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, template } = req.body;
  const organization = await Organization.findById(id);

  if (!organization.accountTemplate[type]) {
    organization.accountTemplate[type] = template;
    await organization.save();
  } else {
    await Organization.findByIdAndUpdate(
      req.params.organizationid,
      { $set: { [`accountTemplate.${type}`]: template } },
      { new: true }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.accountTemplate,
  });
});

const editOrganizationProcurementTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, template } = req.body;
  const organization = await Organization.findById(id);

  if (!organization.procurementTemplate[type]) {
    organization.procurementTemplate[type] = template;
    await organization.save();
  } else {
    await Organization.findByIdAndUpdate(
      req.params.organizationid,
      { $set: { [`procurementTemplate.${type}`]: template } },
      { new: true }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.procurementTemplate,
  });
});

const editOrganizationHrmTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, template } = req.body;
  const organization = await Organization.findById(id);

  if (!organization.hrmTemplate[type]) {
    organization.hrmTemplate[type] = template;
    await organization.save();
  } else {
    await Organization.findByIdAndUpdate(
      req.params.organizationid,
      { $set: { [`hrmTemplate.${type}`]: template } },
      { new: true }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.hrmTemplate,
  });
});

const editOrganizationHomeModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { moduleName, enabled } = req.body;
  const organization = await Organization.findByIdAndUpdate(
    id,
    { $set: { [`dashboardModules.${moduleName}.enabled`]: enabled } },
    { new: true }
  );

  if (!organization) {
    throw new ValidationError('Organization not found');
  }

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.dashboardModules,
  });
});

const editOrganizationHomeModuleReorder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dashboardModules } = req.body;
  const organization = await Organization.findByIdAndUpdate(
    id,
    { $set: { dashboardModules } },
    { new: true }
  );

  if (!organization) {
    throw new ValidationError('Organization not found');
  }

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.dashboardModules,
  });
});

const editOrganizationEmailConfiguration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { emailServerConfig } = req.body;
  const organization = await Organization.findByIdAndUpdate(
    id,
    { $set: { emailServerConfig } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization.emailServerConfig,
  });
});

const deleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Organization.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Organization deleted',
  });
});

module.exports = {
  createOrganization,
  getAllOrganizations,
  getFeatureFlags,
  getAllOrganizationOfCompany,
  getOrganizationById,
  getOrgById,
  getDepartmentAndRoles,
  getOrgName,
  getNumberOfUsersInDepartment,
  editOrganization,
  editOrganizationOther,
  editOrganizationBilling,
  editOrganizationAttendance,
  editOrganizationInventoryFeature,
  editOrganizationFleetsFeature,
  editOrganizationRentalTypes,
  editOrganizationSalesFeature,
  editOrganizationCrmFeature,
  editOrganizationInvoiceFeature,
  editOrganizationCostCenter,
  editOrganizationQuotationFeature,
  editOrganizationSalesTemplate,
  editOrganizationAccountTemplate,
  editOrganizationProcurementTemplate,
  editOrganizationHrmTemplate,
  editOrganizationHomeModule,
  editOrganizationHomeModuleReorder,
  editOrganizationEmailConfiguration,
  deleteOrganization,
};
