const mongoose = require('mongoose');
const FleetCategory = require('../../models/fleets/FleetCategory');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createCategory = asyncHandler(async (req, res) => {
  const newFleetCategory = await FleetCategory.create(req.body);
  res.status(201).json({
    success: true,
    message: 'Fleet Category created successfully',
    data: newFleetCategory,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const updatedFleetCategory = await FleetCategory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!updatedFleetCategory) {
    throw new NotFoundError('Fleet Category not found');
  }

  res.status(200).json({
    success: true,
    message: 'Fleet Category updated successfully',
    data: updatedFleetCategory,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const deletedFleetCategory = await FleetCategory.findByIdAndDelete(
    req.params.id
  );
  if (!deletedFleetCategory) {
    throw new NotFoundError('Fleet Category not found');
  }

  res.status(200).json({
    success: true,
    message: 'Fleet Category deleted successfully',
  });
});

const getFleetCategoryById = asyncHandler(async (req, res) => {
  const fleetCategory = await FleetCategory.findById(req.params.id);
  if (!fleetCategory) {
    throw new NotFoundError('Fleet Category not found');
  }
  res.status(200).json({
    success: true,
    message: 'Fleet Category retrieved successfully',
    data: fleetCategory,
  });
});

const getFleetCategoriesByOrgId = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const fleetCategories = await FleetCategory.find({
    organization: orgId,
  });
  res.status(200).json({
    success: true,
    message: 'Fleet Categories retrieved successfully',
    data: fleetCategories,
  });
});

const getFleetCategoriesFilterByOrgId = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { filter_type } = req.query || '';
  const { search_query } = req.query || '';

  const matchCondition = {
    organization: new mongoose.Types.ObjectId(orgId),
  };

  if (filter_type && filter_type.trim() !== '') {
    matchCondition.type = filter_type.trim();
  }
  if (search_query?.trim()) {
    matchCondition.name = { $regex: search_query.trim(), $options: 'i' };
  }

  const pipeline = [
    {
      $match: matchCondition,
    },
  ];

  pipeline.push(
    {
      $lookup: {
        from: 'inventoryfleets',
        localField: '_id',
        foreignField: 'category',
        as: 'fleets',
      },
    },
    {
      $addFields: {
        count: { $size: '$fleets' }, // Count the number of fleets in the array
        sortOrder: {
          $switch: {
            branches: [
              { case: { $eq: ['$type', 'equipment'] }, then: 1 },
              { case: { $eq: ['$type', 'vehicle'] }, then: 2 },
            ],
            default: 2,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        count: 1, // fleet count
        sortOrder: 1,
      },
    },
    {
      $sort: {
        sortOrder: 1,
      },
    },
    {
      $project: {
        sortOrder: 0,
      },
    }
  );

  const categories = await FleetCategory.aggregate(pipeline);
  res.status(200).json({
    success: true,
    message: 'category retrived successfully',
    data: categories,
  });
});

const getFleetCategoriesForSelect = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { type } = req.params;
  const categories = await FleetCategory.find({
    organization: orgId,
    type,
  });

  const categoriesData = categories.map((category) => ({
    value: category._id,
    label: category.name,
  }));
  res.status(200).json({
    success: true,
    message: 'category retrived successfully',
    data: categoriesData,
  });
});

const getFleetCategoriesSelect = asyncHandler(async (req, res) => {
  const { orgId, type } = req.params;

  const pipeline = [
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgId),
        type,
      },
    },
    {
      $lookup: {
        from: 'inventoryfleets',
        localField: '_id',
        foreignField: 'category',
        as: 'fleets',
      },
    },
    {
      $addFields: {
        count: { $size: '$fleets' },
        sortOrder: {
          $switch: {
            branches: [{ case: { $eq: ['$type', type] }, then: 1 }],
            default: 1,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        count: 1,
        sortOrder: 1,
      },
    },
    {
      $sort: {
        sortOrder: 1,
      },
    },
    {
      $project: {
        sortOrder: 0,
      },
    },
  ];

  const categories = await FleetCategory.aggregate(pipeline);
  res.status(200).json({
    success: true,
    message: 'category retrived successfully',
    data: categories,
  });
});

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getFleetCategoryById,
  getFleetCategoriesByOrgId,
  getFleetCategoriesFilterByOrgId,
  getFleetCategoriesForSelect,
  getFleetCategoriesSelect,
};
