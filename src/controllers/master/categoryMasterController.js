const { asyncHandler } = require('../../middleware');
const CategoryMaster = require('../../models/master/CategoryMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllCategoryMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const categoryMasters = await CategoryMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Categories retrieved successfully',
    data: categoryMasters,
  });
});

const getCategoryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const categoryMaster = await CategoryMaster.findById(id);

  if (!categoryMaster) {
    throw new NotFoundError('Category not found');
  }

  res.status(200).json({
    success: true,
    message: 'Category retrieved successfully',
    data: categoryMaster,
  });
});

const createCategoryMaster = asyncHandler(async (req, res) => {
  const { code, name, tableName, status, remarks, organization, company } =
    req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const categoryMaster = await CategoryMaster.create({
    code,
    name,
    tableName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: categoryMaster,
  });
});

const updateCategoryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const categoryMaster = await CategoryMaster.findById(id);

  if (!categoryMaster) {
    throw new NotFoundError('Category not found');
  }

  const updatedCategory = await CategoryMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: updatedCategory,
  });
});

const deleteCategoryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const categoryMaster = await CategoryMaster.findById(id);

  if (!categoryMaster) {
    throw new NotFoundError('Category not found');
  }

  await CategoryMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

module.exports = {
  getAllCategoryMaster,
  getCategoryMaster,
  createCategoryMaster,
  updateCategoryMaster,
  deleteCategoryMaster,
};
