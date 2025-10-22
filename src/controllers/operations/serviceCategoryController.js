const ServiceCategory = require('../../models/operations/ServiceCategory');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
// const { createActivityLog } = require("../../utilities/logUtils");

const createServiceCategory = asyncHandler(async (req, res) => {
  const { name, description, organization, company } = req.body;
  const serviceCategory = new ServiceCategory({
    name,
    description,
    organization,
    company,
  });
  await serviceCategory.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: "create",
  //   type: "serviceCategory",
  //   actionId: serviceCategory.id,
  //   organization: serviceCategory.organization,
  //   company: serviceCategory.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Service Category created successfully',
    data: serviceCategory,
  });
});

const getServiceCategories = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const serviceCategories = await ServiceCategory.find({
    organization: orgId,
    isDeleted: false,
  });
  res.status(200).json({
    success: true,
    message: 'Service Categories fetched successfully',
    data: serviceCategories,
  });
});

const updateServiceCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, organization, company } = req.body;
  const serviceCategory = await ServiceCategory.findByIdAndUpdate(
    id,
    {
      name,
      description,
      organization,
      company,
    },
    { new: true }
  );

  if (!serviceCategory) {
    throw new NotFoundError('Service Category not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'serviceCategory',
  //   actionId: serviceCategory.id,
  //   organization: serviceCategory.organization,
  //   company: serviceCategory.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Service Category updated successfully',
    data: serviceCategory,
  });
});

const deleteServiceCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const serviceCategory = await ServiceCategory.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
    { new: true }
  );

  if (!serviceCategory) {
    throw new NotFoundError('Service Category not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'delete',
  //   type: 'serviceCategory',
  //   actionId: serviceCategory.id,
  //   organization: serviceCategory.organization,
  //   company: serviceCategory.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Service Category deleted successfully',
    data: serviceCategory,
  });
});

module.exports = {
  createServiceCategory,
  getServiceCategories,
  updateServiceCategory,
  deleteServiceCategory,
};
