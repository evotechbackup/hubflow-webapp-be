const RecruitOffer = require('../../models/recruit/RecruitOffer');
// const {
//   findNextApprovalLevelAndNotify,
// } = require('../../utilities/approvalUtils');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createOffer = asyncHandler(async (req, res) => {
  const {
    applicant,
    form,
    jobRole,
    applicantEmail,
    applicantName,
    offerDate,
    letterDescription,
    createdBy,
    organization,
    company,
  } = req.body;
  const offer = await RecruitOffer.findOne({ applicant, form });
  if (offer) {
    throw new Error('Offer already exists');
  }
  const newOffer = new RecruitOffer({
    applicant,
    form,
    jobRole,
    applicantEmail,
    applicantName,
    offerDate,
    letterDescription,
    createdBy,
    organization,
    company,
  });
  await newOffer.save();
  res.status(200).json({
    success: true,
    message: 'Recruit offer created successfully',
    data: newOffer,
  });
});

const getOffers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const offers = await RecruitOffer.find({
    organization: orgid,
    isValid: true,
  }).select('applicantEmail applicantName offerDate jobRole');
  res.status(200).json({
    success: true,
    message: 'Recruit offers retrieved successfully',
    data: offers,
  });
});

const getOfferById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const offer = await RecruitOffer.findById(id);
  res.status(200).json({
    success: true,
    message: 'Recruit offer retrieved successfully',
    data: offer,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id, agent } = req.params;
  const { approval } = req.body;

  const offer = await RecruitOffer.findById(id);
  if (!offer) {
    throw new NotFoundError('Offer not found');
  }

  const resetFields = () => {
    offer.verifiedBy = null;
    offer.approvedBy1 = null;
    offer.approvedBy2 = null;
    offer.verifiedAt = null;
    offer.approvedAt1 = null;
    offer.approvedAt2 = null;
    offer.reviewedBy = null;
    offer.reviewedAt = null;
    offer.acknowledgedBy = null;
    offer.acknowledgedAt = null;
  };

  offer.approval = approval;

  switch (approval) {
    case 'reviewed':
      offer.reviewedBy = agent || null;
      offer.reviewedAt = new Date();
      offer.verifiedBy = null;
      offer.verifiedAt = null;
      offer.acknowledgedBy = null;
      offer.acknowledgedAt = null;
      break;
    case 'verified':
      offer.verifiedBy = agent || null;
      offer.verifiedAt = new Date();
      offer.acknowledgedBy = null;
      offer.acknowledgedAt = null;
      break;
    case 'acknowledged':
      offer.acknowledgedBy = agent || null;
      offer.acknowledgedAt = new Date();
      break;
    case 'approved1':
      offer.approvedBy1 = agent || null;
      offer.approvedAt1 = new Date();
      break;
    case 'approved2':
      offer.approvedBy2 = agent || null;
      offer.approvedAt2 = new Date();
      break;
    case 'correction':
    case 'rejected':
      resetFields();
      break;
    default:
      break;
  }

  const updatedOffer = await offer.save();

  // await findNextApprovalLevelAndNotify(
  //   'offer',
  //   approval,
  //   updatedOffer.organization,
  //   updatedOffer.company,
  //   updatedOffer.applicantName + ' - ' + updatedOffer.jobRole,
  //   'Offer',
  //   'offer',
  //   updatedOffer._id
  // );

  res.status(200).json({
    success: true,
    message: 'Recruit offer updated successfully',
    data: updatedOffer,
  });
});

module.exports = {
  createOffer,
  getOffers,
  getOfferById,
  updateApproval,
};
