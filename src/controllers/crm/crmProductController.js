const { default: mongoose } = require('mongoose');
const CRMProducts = require('../../models/crm/CRMProducts');
const { asyncHandler } = require('../../middleware/errorHandler');

const createCRMProduct = asyncHandler(async (req, res) => {
  const { product, company, organization } = req.body;

  const newCRMProducts = await CRMProducts.findOneAndUpdate(
    { company, organization },
    { $set: { product, company, organization } },
    { upsert: true, new: true }
  );
  res.status(201).json({
    success: true,
    message: 'create crm product successfully',
    data: newCRMProducts,
  });
});

const getAllCRMProducts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const crmProducts = await CRMProducts.aggregate([
    { $match: { organization: new mongoose.Types.ObjectId(orgid) } },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    },
  ]);
  res.status(200).json({
    success: true,
    message: 'fetch crm product successfully',
    data: crmProducts?.length > 0 ? crmProducts[0]?.product : [],
  });
});

const addProductToCRMProducts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { product } = req.body;

  const crmProducts = await CRMProducts.findOne({ organization: orgid });

  if (crmProducts?.product?.includes(product)) {
    res.status(200).json({
      success: true,
      message: 'Product already exists',
    });
  }

  crmProducts.product.push(product);
  await crmProducts.save();

  res.status(200).json({
    success: true,
    message: 'Product added to CRM Products successfully',
    data: crmProducts,
  });
});

module.exports = {
  createCRMProduct,
  getAllCRMProducts,
  addProductToCRMProducts,
};
