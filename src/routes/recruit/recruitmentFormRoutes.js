const { authenticate } = require('../../middleware');
const {
  getAllRecruitmentForms,
  createRecruitmentForm,
  duplicateRecruitmentForm,
  updateRecruitMentForm,
  getRecruitmentFormById,
  getRecruitmentFormBySlug,
  deleteRecruitmentForm,
  changeActivation,
} = require('../../controllers/recruit/recruitmentFormController');

const router = require('express').Router();

router.get('/all/:orgid', authenticate, getAllRecruitmentForms);
router.post('/create', authenticate, createRecruitmentForm);
router.post('/duplicate/:id', authenticate, duplicateRecruitmentForm);
router.put('/update/:id', authenticate, updateRecruitMentForm);
router.get('/recruitmentFormById/:id', getRecruitmentFormById);
router.get('/recruitmentFormBySlug/:slug', getRecruitmentFormBySlug);
router.delete('/delete/:id', authenticate, deleteRecruitmentForm);
router.put('/changeactivation/:id', authenticate, changeActivation);

module.exports = router;
