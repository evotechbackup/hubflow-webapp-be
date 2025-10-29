const mongoose = require('mongoose');
const RecruitmentForm = require('../../models/recruit/RecruitmentForm');
const RecruitmentResponse = require('../../models/recruit/RecruitmentResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
// const { NotFoundError } = require('../../utils/errors');

const getAllRecruitmentForms = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const recruitForms = await RecruitmentForm.find({
    organization: orgid,
    isActive: true,
  });
  const recruitFormCounts = await RecruitmentForm.countDocuments({
    organization: orgid,
    isActive: true,
  });

  //submission
  const submission = await RecruitmentResponse.find({
    organization: orgid,
  }).populate([
    {
      path: 'form',
      select: 'roleName',
    },
  ]);

  const submissionCount = await RecruitmentResponse.countDocuments({
    organization: orgid,
  });

  const statuses = ['applied', 'screening', 'interview', 'offered', 'rejected'];

  let pipeline = await RecruitmentResponse.aggregate([
    { $match: { organization: new mongoose.Types.ObjectId(orgid) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
      },
    },
  ]);

  pipeline = statuses.map((st) => {
    const found = pipeline.find((r) => r.status === st);
    return { status: st, count: found ? found.count : 0 };
  });

  //avg rate hire

  const avgRateHire = await RecruitmentResponse.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        status: 'offered',
      },
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        daysToHire: {
          $divide: [
            { $subtract: ['$updatedAt', '$createdAt'] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    { $group: { _id: null, avarageHireDays: { $avg: '$daysToHire' } } },
  ]);

  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: {
      recruitForms: recruitForms || [],
      recruitFormCounts: recruitFormCounts || 0,
      submissions: submission || [],
      submissionCount: submissionCount || 0,
      pipelines: pipeline || [],
      avgRateHire:
        avgRateHire.length > 0 ? avgRateHire[0].avarageHireDays.toFixed(1) : 0,
    },
  });
});

module.exports = {
  getAllRecruitmentForms,
};
