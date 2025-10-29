const {
  getAllRecruitmentForms,
} = require('../../controllers/recruit/recruitDashboardController');

const router = require('express').Router();

router.get('/:orgid', getAllRecruitmentForms);

module.exports = router;
