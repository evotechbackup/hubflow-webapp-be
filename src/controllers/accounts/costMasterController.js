const CostMaster = require('../../models/accounts/CostMaster');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');

const createCostMaster = asyncHandler(async (req, res) => {
  const { name, organization, company } = req.body;
  const costMaster = new CostMaster({
    name,
    organization,
    company,
  });
  await costMaster.save();

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'costMaster',
    actionId: costMaster.name,
    organization,
    company,
  });
  return res.status(201).json({
    success: true,
    message: 'Cost Master Created Successfully',
    data: costMaster,
  });
});

const getCostMasters = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const costMasters = await CostMaster.find({
    organization: orgid,
    isDeleted: false,
  })
    .select('name _id')
    .sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    message: 'Cost Masters Fetched Successfully',
    data: costMasters,
  });
});

const deleteCostMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const costMaster = await CostMaster.findByIdAndUpdate(id, {
    isDeleted: true,
  });

  await createActivityLog({
    userId: req._id,
    action: 'delete',
    type: 'costMaster',
    actionId: costMaster.name,
    organization: costMaster.organization,
    company: costMaster.company,
  });

  return res.status(200).json({
    success: true,
    message: 'Cost Master Deleted Successfully',
  });
});

const updateCostMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const costMaster = await CostMaster.findByIdAndUpdate(id, { name });

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'costMaster',
    actionId: costMaster.name,
    organization: costMaster.organization,
    company: costMaster.company,
  });

  return res.status(200).json({
    success: true,
    message: 'Cost Master Updated Successfully',
  });
});

module.exports = {
  createCostMaster,
  getCostMasters,
  deleteCostMaster,
  updateCostMaster,
};
