const mongoose = require('mongoose');
const CRMInterests = require('../../models/crm/CRMInterests');
const { asyncHandler } = require('../../middleware/errorHandler');

const createInterest = asyncHandler(async (req, res) => {
  const { interest, lead, contact, company, organization } = req.body;

  const crmInterest = await CRMInterests.findOne({
    company,
    organization,
  });

  if (!crmInterest) {
    const newCRMInterests = await CRMInterests.create({
      interest,
      lead,
      contact,
      company,
      organization,
    });
    res.status(201).json({
      success: true,
      message: 'create interest successfully',
      data: newCRMInterests,
    });
  }

  if (Array.isArray(interest)) {
    crmInterest.interest.push(...interest);
  } else {
    crmInterest.interest.push(interest);
  }
  await crmInterest.save();
  res.status(200).json({
    success: true,
    message: 'create interest successfully',
    data: crmInterest,
  });
});

const getInterestByLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const crmInterests = await CRMInterests.aggregate([
    { $match: { lead: new mongoose.Types.ObjectId(id) } },
  ]);
  res.status(200).json({
    success: true,
    message: 'fetch interest successfully',
    data: crmInterests?.length > 0 ? crmInterests[0]?.interest : [],
  });
});

const getInterestByContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const crmInterests = await CRMInterests.aggregate([
    { $match: { contact: new mongoose.Types.ObjectId(id) } },
  ]);
  res.status(200).json({
    success: true,
    message: 'fetch interest successfully',
    data: crmInterests?.length > 0 ? crmInterests[0]?.interest : [],
  });
});

const deleteInterestByLead = asyncHandler(async (req, res) => {
  const { documentId, interestId } = req.params;

  const interestDoc = await CRMInterests.findOneAndUpdate(
    {
      lead: documentId,
    },
    {
      $pull: {
        interest: { _id: interestId },
      },
    },
    { new: true }
  );

  if (!interestDoc) {
    throw new Error('Interest document not found');
  }

  res.status(200).json({
    success: true,
    message: 'delete interest successfully',
    data: interestDoc,
  });
});

const deleteInterestByContact = asyncHandler(async (req, res) => {
  const { documentId, interestId } = req.params;

  const interestDoc = await CRMInterests.findOneAndUpdate(
    {
      contact: documentId,
    },
    {
      $pull: {
        interest: { _id: interestId },
      },
    },
    { new: true }
  );

  if (!interestDoc) {
    throw new Error('Interest document not found');
  }

  res.status(200).json({
    success: true,
    message: 'delete interest successfully',
    data: interestDoc,
  });
});

module.exports = {
  createInterest,
  getInterestByLead,
  getInterestByContact,
  deleteInterestByLead,
  deleteInterestByContact,
};
