const mongoose = require('mongoose');
const CRMAgents = require('../../models/crm/CRMAgents');
const Employee = require('../../models/hrm/Employee');
const { asyncHandler } = require('../../middleware/errorHandler');

const createAgent = asyncHandler(async (req, res) => {
  const { department, company, organization } = req.body;
  const newCRMAgents = await CRMAgents.findOneAndUpdate(
    { company, organization },
    { $set: { department, company, organization } },
    { upsert: true, new: true }
  );
  res.status(200).json({
    success: true,
    message: 'agent created successfully',
    data: newCRMAgents,
  });
});

const getAgents = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orgid)) {
    throw new Error('Invalid organization ID');
  }

  const departments = await CRMAgents.findOne({ organization: orgid });

  const employees = await Employee.find({
    department: { $in: departments?.department || [] },
    isActivated: true,
  }).populate('department', ['name']);

  res.status(200).json({
    success: true,
    message: 'retried successfully',
    data: {
      employees,
      departments: departments?.department || [],
    },
  });
});

module.exports = {
  createAgent,
  getAgents,
};
