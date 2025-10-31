const { asyncHandler } = require('../../middleware');
const Customization = require('../../models/master/Customization');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getCustomization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { query } = req.query;

  if (!query) {
    throw new ValidationError('Query parameter is required');
  }

  const customization = await Customization.findOne({
    organization: orgid,
  }).select(query);

  if (!customization) {
    throw new NotFoundError('Customization not found');
  }

  res.status(200).json({
    success: true,
    message: 'Customization retrieved successfully',
    data: customization[query] || {},
  });
});

const createCustomization = asyncHandler(async (req, res) => {
  const { name, type, organization, code } = req.body;

  if (!name || !type || !organization) {
    throw new ValidationError('Name, type, and organization are required');
  }

  const result = await Customization.findOneAndUpdate(
    {
      organization,
    },
    {
      $push: {
        [type]: { name, code },
      },
    },
    { new: true, upsert: true }
  );

  if (!result) {
    throw new NotFoundError('Failed to create customization');
  }

  res.status(200).json({
    success: true,
    message: 'Customization created successfully',
  });
});

const updateCustomization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, organization, code } = req.body;

  if (!name || !type || !organization) {
    throw new ValidationError('Name, type, and organization are required');
  }

  const customization = await Customization.findOne({
    organization,
  });

  if (!customization) {
    throw new NotFoundError('Customization not found');
  }

  const objId = String(id);
  let found = false;

  customization[type] = customization[type].map((item) => {
    if (item._id?.toString() === objId) {
      found = true;
      return { _id: item._id, name, code };
    }
    return item;
  });

  if (!found) {
    throw new NotFoundError('Item not found in customization');
  }

  await customization.save();

  res.status(200).json({
    success: true,
    message: 'Customization updated successfully',
  });
});

const deleteCustomization = asyncHandler(async (req, res) => {
  const { id, type, organization } = req.params;

  if (!type || !organization) {
    throw new ValidationError('Type and organization are required');
  }

  const result = await Customization.findOneAndUpdate(
    {
      organization,
    },
    {
      $pull: {
        [type]: { _id: id },
      },
    },
    { new: true }
  );

  if (!result) {
    throw new NotFoundError('Customization not found');
  }

  res.status(200).json({
    success: true,
    message: 'Customization deleted successfully',
  });
});

module.exports = {
  getCustomization,
  createCustomization,
  updateCustomization,
  deleteCustomization,
};
