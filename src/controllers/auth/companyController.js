/**
 * Company Controller
 * Handles company registration, updates, and unit management
 */

const User = require('../../models/auth/User');
const Company = require('../../models/auth/Company');
const { defaultUnits } = require('../../utils/units');
const { asyncHandler } = require('../../middleware');
const { ValidationError, NotFoundError } = require('../../utils/errors');

/**
 * Register a new company with superadmin
 * POST /api/companies/signup-company
 */
const signupCompany = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    companySize,
    companyName,
    modules,
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !password || !companyName) {
    const details = {};
    if (!fullName) details.fullName = 'Full name is required';
    if (!email) details.email = 'Email is required';
    if (!password) details.password = 'Password is required';
    if (!companyName) details.companyName = 'Company name is required';

    throw new ValidationError('Required fields are missing', details);
  }

  // Create company
  const company = new Company({
    name: companyName,
    teamSize: companySize,
    modules,
    units: defaultUnits.map((unit) => ({
      name: unit,
      activated: true,
    })),
  });

  const savedCompany = await company.save();

  // Create superadmin user
  const superadmin = new User({
    fullName,
    email,
    userName: fullName,
    password,
    phone,
    profileType: 'superadmin',
    company: savedCompany._id,
  });

  const savedSuperadmin = await superadmin.save();

  res.status(201).json({
    success: true,
    message: 'Company and superadmin created successfully',
    data: {
      company: savedCompany,
      superadmin: savedSuperadmin,
    },
  });
});

/**
 * Update company details
 * PUT /api/companies/:id
 */
const updateCompany = asyncHandler(async (req, res) => {
  const {
    name,
    arabicName,
    teamSize,
    companyAddress,
    companyCity,
    companyState,
    companyZip,
    companyCountry,
    webURL,
    vat,
    cr,
    landlineNumber,
    mobileNumber,
    faxNumber,
    pOBox,
    companyEmail,
    industry,
    organizationLocation,
    baseCurrency,
    fiscalYear,
    language,
    timeZone,
    companyLogo,
    companySeal,
    companySignature,
    salesColor,
    procurementColor,
  } = req.body;

  const company = await Company.findById(req.params.id);

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const updatedCompany = await Company.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name,
        arabicName,
        teamSize,
        companyAddress,
        companyCity,
        companyState,
        companyZip,
        companyCountry,
        webURL,
        vat,
        cr,
        landlineNumber,
        mobileNumber,
        faxNumber,
        pOBox,
        companyEmail,
        industry,
        organizationLocation,
        baseCurrency,
        fiscalYear,
        language,
        timeZone,
        companyLogo,
        companySeal,
        companySignature,
        salesColor,
        procurementColor,
      },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Company updated successfully',
    data: updatedCompany,
  });
});

/**
 * Get company by ID
 * GET /api/companies/:id
 */
const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  res.status(200).json({
    success: true,
    message: 'Company retrieved successfully',
    data: company,
  });
});

/**
 * Get all companies
 * GET /api/companies/master/all
 */
const getAllCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find();

  res.status(200).json({
    success: true,
    message: 'Companies retrieved successfully',
    data: {
      companies,
      count: companies.length,
    },
  });
});

/**
 * Add unit to company
 * PUT /api/companies/unit/add/:companyid
 */
const addUnit = asyncHandler(async (req, res) => {
  const { unit } = req.body;

  if (!unit || !unit.name) {
    throw new ValidationError('Unit information is required', {
      unit: 'Unit name is required',
    });
  }

  const company = await Company.findByIdAndUpdate(
    req.params.companyid,
    {
      $push: { units: unit },
    },
    { new: true }
  );

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  res.status(200).json({
    success: true,
    message: 'Unit added successfully',
    data: company,
  });
});

/**
 * Update unit in company
 * PUT /api/companies/unit/update/:companyid
 */
const updateUnit = asyncHandler(async (req, res) => {
  const { index, name } = req.body;

  if (index === undefined || !name) {
    throw new ValidationError('Index and name are required', {
      index: index === undefined ? 'Index is required' : undefined,
      name: !name ? 'Name is required' : undefined,
    });
  }

  const company = await Company.findByIdAndUpdate(
    req.params.companyid,
    { $set: { [`units.${index}.name`]: name } },
    { new: true }
  );

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  res.status(200).json({
    success: true,
    message: 'Unit updated successfully',
    data: company,
  });
});

/**
 * Get company units
 * GET /api/companies/units/:companyid
 */
const getUnits = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.companyid);

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  // Initialize units if empty
  if (company.units.length === 0) {
    const fixedUnits = defaultUnits.map((unit) => ({
      name: unit,
      activated: true,
    }));
    company.units = fixedUnits;
    await company.save();
  }

  res.status(200).json({
    success: true,
    message: 'Units retrieved successfully',
    data: company.units,
  });
});

/**
 * Remove unit from company
 * PUT /api/companies/unit/remove/:companyid
 */
const removeUnit = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ValidationError('Unit name is required', {
      name: 'Unit name is required',
    });
  }

  const company = await Company.findById(req.params.companyid);

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  company.units = company.units.filter((unit) => unit.name !== name);
  const updatedCompany = await company.save();

  res.status(200).json({
    success: true,
    message: 'Unit removed successfully',
    data: updatedCompany,
  });
});

module.exports = {
  signupCompany,
  updateCompany,
  getCompany,
  getAllCompanies,
  addUnit,
  updateUnit,
  getUnits,
  removeUnit,
};
