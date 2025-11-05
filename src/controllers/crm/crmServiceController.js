const { default: mongoose } = require('mongoose');
const CRMServices = require('../../models/crm/CRMServices');
const { asyncHandler } = require('../../middleware/errorHandler');

const createService = asyncHandler(async (req, res) => {
  const { service, company, organization } = req.body;

  const newCRMServices = await CRMServices.findOneAndUpdate(
    { company, organization },
    { $set: { service, company, organization } },
    { upsert: true, new: true }
  );
  res.status(201).json({
    success: true,
    message: 'service created successfully',
    data: newCRMServices,
  });
});

const getAllServices = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const crmServices = await CRMServices.aggregate([
    { $match: { organization: new mongoose.Types.ObjectId(orgid) } },
    {
      $lookup: {
        from: 'services',
        localField: 'service',
        foreignField: '_id',
        as: 'service',
      },
    },
  ]);
  res.status(200).json({
    success: true,
    message: 'service fetched successfully',
    data: crmServices?.length > 0 ? crmServices[0]?.service : [],
  });
});

const addService = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { service } = req.body;

  const crmServices = await CRMServices.findOne({ organization: orgid });

  if (crmServices?.service?.includes(service)) {
    throw new Error('Service already exists');
  }

  crmServices.service.push(service);
  await crmServices.save();

  res.status(200).json({
    success: true,
    message: 'service added successfully',
    data: crmServices,
  });
});

module.exports = {
  createService,
  getAllServices,
  addService,
};
