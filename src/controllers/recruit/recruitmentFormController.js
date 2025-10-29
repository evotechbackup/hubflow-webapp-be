const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const RecruitmentForm = require('../../models/recruit/RecruitmentForm');
// const { createActivityLog } = require('../../utilities/logUtils');

const getAllRecruitmentForms = asyncHandler(async (req, res) => {
  const recruitmentForms = await RecruitmentForm.find({
    organization: req.params.orgid,
    isDeleted: false,
  });
  res.status(201).json({
    success: true,
    message: 'Recruitment forms retrieved successfully',
    data: recruitmentForms,
  });
});

const createRecruitmentForm = asyncHandler(async (req, res) => {
  const newRecruitmentForm = new RecruitmentForm(req.body);
  const savedRecruitmentForm = await newRecruitmentForm.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'recruitmentForm',
  //   actionId: savedRecruitmentForm.roleName,
  //   organization: savedRecruitmentForm.organization,
  //   company: savedRecruitmentForm.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Recruitment form created successfully',
    data: savedRecruitmentForm,
  });
});

const duplicateRecruitmentForm = asyncHandler(async (req, res) => {
  const recruitmentForm = await RecruitmentForm.findById(req.params.id);
  if (!recruitmentForm) {
    throw new NotFoundError('Recruitment form not found');
  }
  const recruitmentFormData = recruitmentForm.toObject();
  delete recruitmentFormData._id;
  delete recruitmentFormData.createdAt;
  delete recruitmentFormData.updatedAt;
  const newRecruitmentForm = new RecruitmentForm(recruitmentFormData);
  const savedRecruitmentForm = await newRecruitmentForm.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'recruitmentForm',
  //   actionId: savedRecruitmentForm.roleName,
  //   organization: savedRecruitmentForm.organization,
  //   company: savedRecruitmentForm.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Recruitment form duplicated successfully',
    data: savedRecruitmentForm,
  });
});

const updateRecruitMentForm = asyncHandler(async (req, res) => {
  const recruitmentForm = await RecruitmentForm.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'recruitmentForm',
  //   actionId: recruitmentForm.roleName,
  //   organization: recruitmentForm.organization,
  //   company: recruitmentForm.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Recruitment form updated successfully',
    data: recruitmentForm,
  });
});

const getRecruitmentFormById = asyncHandler(async (req, res) => {
  const recruitmentForm = await RecruitmentForm.findById(req.params.id);
  if (!recruitmentForm) {
    throw new NotFoundError('Recruitment form not found');
  }
  res.status(200).json({
    success: true,
    message: 'Recruitment form retrived successfully',
    data: recruitmentForm,
  });
});

const getRecruitmentFormBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const recruitmentForm = await RecruitmentForm.findOne({
    slug: slug.trim(),
  });
  if (!recruitmentForm) {
    throw new NotFoundError('Recruitment form not found');
  }
  res.status(200).json({
    success: true,
    message: 'Recruitment form retrived successfully',
    data: recruitmentForm,
  });
});

const deleteRecruitmentForm = asyncHandler(async (req, res) => {
  const recruitmentForm = await RecruitmentForm.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isDeleted: true,
      },
    }
  );

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'delete',
  //   type: 'recruitmentForm',
  //   actionId: recruitmentForm.roleName,
  //   organization: recruitmentForm.organization,
  //   company: recruitmentForm.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Recruitment form deleted successfully',
    data: recruitmentForm,
  });
});

const changeActivation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const recruitmentForm = await RecruitmentForm.findByIdAndUpdate(id, {
    $set: {
      isActive,
    },
  });
  res.status(200).json({
    success: true,
    message: 'Recruitment form deleted successfully',
    data: recruitmentForm,
  });
});

module.exports = {
  getAllRecruitmentForms,
  createRecruitmentForm,
  duplicateRecruitmentForm,
  updateRecruitMentForm,
  getRecruitmentFormById,
  getRecruitmentFormBySlug,
  deleteRecruitmentForm,
  changeActivation,
};
