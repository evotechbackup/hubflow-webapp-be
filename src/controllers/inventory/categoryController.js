const mongoose = require('mongoose');
const Category = require('../../models/inventory/Category');
const Product = require('../../models/inventory/Product');
// const { createActivityLog } = require('../utilities/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');

const createCategory = asyncHandler(async (req, res) => {
  const newCategory = await Category.create(req.body);

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   actionId: `${newCategory.categoryName} - ${newCategory.type}`,
  //   type: 'category',
  //   organization: newCategory.organization,
  //   company: newCategory.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Category Created Successfully',
    data: newCategory,
  });
});

const getAllCategories = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const categories = await Category.find({
    organization: orgId,
  });
  res.status(200).json({
    success: true,
    message: 'Category Created Successfully',
    data: categories,
  });
});

const getcategorybyid = asyncHandler(async (req, res) => {
  const categories = await Category.findById(req.params.id);
  if (!categories) {
    throw new Error('categories not found');
  }
  res.status(200).json({
    success: true,
    message: 'Category retrived  Successfully',
    data: categories,
  });
});

const getproductsByType = asyncHandler(async (req, res) => {
  const { orgId, type } = req.params;
  const categories = await Category.find({
    organization: orgId,
    type,
  });
  res.status(200).json({
    success: true,
    message: 'Category retrived  Successfully',
    data: categories,
  });
});

const getAllProducts = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const categories = await Category.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgId),
        type: {
          $in: ['goods'],
        },
      },
    },
    {
      $project: {
        categoryName: 1,
        type: 1,
      },
    },
    {
      $group: {
        _id: '$type',
        categories: { $push: '$$ROOT' },
      },
    },
  ]);
  res.status(200).json({
    success: true,
    message: 'Category retrived  Successfully',
    data: categories,
  });
});

const filterCategories = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { filter_type } = req.query;

  const pipeline = [
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgId),
      },
    },
  ];

  if (filter_type) {
    pipeline.push({
      $match: {
        type: filter_type,
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'category',
        as: 'product',
        pipeline: [
          {
            $count: 'category',
          },
          {
            $project: {
              count: '$category',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        sortOrder: {
          $switch: {
            branches: [{ case: { $eq: ['$type', 'goods'] }, then: 1 }],
            default: 6,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        categoryName: 1,
        type: 1,
        count: '$product.count',
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

  const categories = await Category.aggregate(pipeline);
  res.status(200).json({
    success: true,
    message: 'Category retrived  Successfully',
    data: categories,
  });
});

const categoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new Error('Category not found');
  }
  res.status(200).json({
    success: true,
    message: 'Category retrived  Successfully',
    data: category,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!updatedCategory) {
    throw new Error('Category not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   actionId: `${updatedCategory.categoryName} - ${updatedCategory.type}`,
  //   type: 'category',
  //   organization: updatedCategory.organization,
  //   company: updatedCategory.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: updatedCategory,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const deletedCategory = await Category.findByIdAndDelete(req.params.id);
  if (!deletedCategory) {
    throw new Error('Category not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'delete',
  //   actionId: `${deletedCategory.categoryName} - ${deletedCategory.type}`,
  //   type: 'category',
  //   organization: deletedCategory.organization,
  //   company: deletedCategory.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
  });
});

const productscategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const products = await Product.find({ category: categoryId });
  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: products,
  });
});

//filter
const filterCategory = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { filter_type } = req.query;

  const pipeline = [
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgId),
      },
    },
  ];

  if (filter_type) {
    pipeline.push({
      $match: {
        type: filter_type,
      },
    });
    // query.type = filter_type;
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'category',
        as: 'product',
        pipeline: [
          {
            $count: 'category',
          },
          {
            $project: {
              count: '$category',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        categoryName: 1,
        type: 1,
        count: '$product.count',
      },
    },
    {
      $sort: {
        type: 1,
      },
    }
  );

  const categories = await Category.aggregate(pipeline);

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: categories,
  });
});

module.exports = {
  createCategory,
  getAllCategories,
  getcategorybyid,
  updateCategory,
  deleteCategory,
  productscategory,
  filterCategory,
  getproductsByType,
  getAllProducts,
  filterCategories,
  categoryById,
};
